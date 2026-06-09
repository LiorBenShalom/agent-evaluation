import axios from 'axios';
import { loadConfig } from '../models/config';
import { JudgeOutput, Finding, SecondJudgeCheck, DebateRound, ConsensusOutcome } from '../models/judge';
import { Transcript, formatForLlm } from '../models/transcript';

/**
 * Second Judge — mirrors Python app/judge/second_judge.py
 *
 * Adversarial review of primary judge findings.
 * Only runs on FAIL runs with high/critical findings.
 * Optionally triggers multi-round debate to resolve disagreements.
 */

const REVIEW_PROMPT = `You are a second-opinion judge reviewing a finding from a primary evaluator.
The primary judge flagged a problem in an AI agent's conversation.
Your job: decide if you AGREE the finding is valid, or DISAGREE.

Be skeptical. Only agree if the evidence clearly supports the finding.
If the agent's behavior was reasonable given context, disagree.

Respond with JSON:
{"verdict": "agree"|"disagree"|"uncertain", "reason": "one sentence explanation"}`;

const DEBATE_PROMPT_PRIMARY = `The secondary judge disagreed with your finding. Here is their objection:
"{objection}"

You may:
- "defend" — maintain your original finding with additional reasoning
- "soften" — reduce severity or narrow the audience
- "withdraw" — concede the finding was wrong

Respond with JSON:
{"action": "defend"|"soften"|"withdraw", "message": "your argument", "new_severity": null|"low"|"medium"|"high", "new_audience": null|["user"]|["internal"]}`;

export async function reviewJudgeOutput(
  output: JudgeOutput,
  transcript: Transcript,
  scenarioGoal: string,
  scenarioTitle: string,
): Promise<JudgeOutput> {
  const config = loadConfig();
  if (!config.llm.second_judge_enabled) return output;
  if (output.pass_fail !== 'fail') return output;

  // Only review high/critical user-audience findings
  const eligible = output.findings.filter(f =>
    (f.severity === 'high' || f.severity === 'critical') &&
    (f.audience.length === 0 || f.audience.some(a => a === 'user')),
  );

  if (!eligible.length) return output;

  let callBudget = config.llm.debate_max_calls_per_run;

  for (const finding of eligible) {
    if (callBudget <= 0) break;

    // Initial review
    const check = await reviewFinding(finding, transcript, scenarioGoal, config);
    callBudget--;
    finding.second_judge_check = check;

    // If disagree and debate enabled, run debate
    if (check.verdict === 'disagree' && config.llm.debate_enabled && callBudget >= 2) {
      const { rounds, outcome, callsUsed } = await debateFinding(
        finding, check.reason, transcript, scenarioGoal, config,
      );
      callBudget -= callsUsed;
      finding.debate_log = rounds;
      finding.consensus_outcome = outcome;
    } else if (check.verdict === 'agree') {
      finding.consensus_outcome = ConsensusOutcome.AGREE;
    }
  }

  return output;
}

async function reviewFinding(
  finding: Finding,
  transcript: Transcript,
  scenarioGoal: string,
  config: any,
): Promise<SecondJudgeCheck> {
  const userPrompt = `SCENARIO GOAL: ${scenarioGoal}
FINDING (severity: ${finding.severity}, type: ${finding.type}):
- Evidence: "${finding.evidence}"
- Explanation: "${finding.explanation}"
- Turn: ${finding.turn_index}

RELEVANT TRANSCRIPT CONTEXT:
${formatForLlm(transcript).slice(0, 3000)}

Is this finding valid?`;

  const resp = await callLlm(
    [{ role: 'system', content: REVIEW_PROMPT }, { role: 'user', content: userPrompt }],
    config.llm.second_judge_model,
    config.llm.second_judge_temperature,
    config.llm.base_url,
    config.llm.api_key,
  );

  try {
    const parsed = JSON.parse(resp);
    return {
      verdict: parsed.verdict || 'uncertain',
      reason: parsed.reason || '',
      model: config.llm.second_judge_model,
      checked_at: new Date().toISOString(),
    };
  } catch {
    return { verdict: 'uncertain', reason: 'Parse error', model: config.llm.second_judge_model, checked_at: new Date().toISOString() };
  }
}

async function debateFinding(
  finding: Finding,
  objection: string,
  transcript: Transcript,
  scenarioGoal: string,
  config: any,
): Promise<{ rounds: DebateRound[]; outcome: ConsensusOutcome; callsUsed: number }> {
  const rounds: DebateRound[] = [];
  let callsUsed = 0;
  const maxRounds = config.llm.debate_max_rounds || 3;

  let currentObjection = objection;

  for (let round = 0; round < maxRounds; round++) {
    // Primary responds to objection
    const primaryPrompt = DEBATE_PROMPT_PRIMARY.replace('{objection}', currentObjection);
    const primaryResp = await callLlm(
      [{ role: 'system', content: 'You are the primary judge defending or conceding your finding.' },
       { role: 'user', content: primaryPrompt }],
      config.llm.judge_model,
      config.llm.judge_temperature,
      config.llm.base_url,
      config.llm.api_key,
    );
    callsUsed++;

    try {
      const parsed = JSON.parse(primaryResp);
      const debateRound: DebateRound = {
        round_number: round + 1,
        speaker: 'primary',
        action: parsed.action || 'defend',
        message: parsed.message || '',
        new_severity: parsed.new_severity || null,
        new_audience: parsed.new_audience || null,
        model: config.llm.judge_model,
        created_at: new Date().toISOString(),
      };
      rounds.push(debateRound);

      if (parsed.action === 'withdraw') {
        return { rounds, outcome: ConsensusOutcome.WITHDRAW, callsUsed };
      }
      if (parsed.action === 'soften') {
        if (parsed.new_severity) finding.severity = parsed.new_severity as any;
        if (parsed.new_audience) finding.audience = parsed.new_audience as any;
        return { rounds, outcome: ConsensusOutcome.SOFTENED, callsUsed };
      }

      // Secondary re-votes
      if (round < maxRounds - 1) {
        const secondResp = await callLlm(
          [{ role: 'system', content: REVIEW_PROMPT },
           { role: 'user', content: `Primary judge defends: "${parsed.message}"\n\nDo you now agree or still disagree?` }],
          config.llm.second_judge_model,
          config.llm.second_judge_temperature,
          config.llm.base_url,
          config.llm.api_key,
        );
        callsUsed++;

        try {
          const secParsed = JSON.parse(secondResp);
          rounds.push({
            round_number: round + 1,
            speaker: 'secondary',
            action: secParsed.verdict || 'uncertain',
            message: secParsed.reason || '',
            new_severity: null,
            new_audience: null,
            model: config.llm.second_judge_model,
            created_at: new Date().toISOString(),
          });

          if (secParsed.verdict === 'agree') {
            return { rounds, outcome: ConsensusOutcome.AGREE, callsUsed };
          }
          currentObjection = secParsed.reason || currentObjection;
        } catch {
          break;
        }
      }
    } catch {
      break;
    }
  }

  return { rounds, outcome: ConsensusOutcome.UNRESOLVED, callsUsed };
}

async function callLlm(
  messages: Array<{ role: string; content: string }>,
  model: string,
  temperature: number,
  baseUrl: string,
  apiKey: string,
): Promise<string> {
  const resp = await axios.post(`${baseUrl}/chat/completions`, {
    model,
    messages,
    temperature,
    max_tokens: 512,
    response_format: { type: 'json_object' },
  }, {
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    timeout: 30000,
  });
  return resp.data?.choices?.[0]?.message?.content || '';
}
