import axios from 'axios';
import { loadConfig } from '../models/config';
import { ScenarioModel } from '../models/scenario';
import { Transcript, formatForLlm } from '../models/transcript';
import { JudgeOutput, Finding, DimensionScores, ConversationAnalysis } from '../models/judge';

/**
 * Judge/Evaluator — mirrors Python app/judge/evaluator.py
 *
 * LLM-as-Judge that evaluates a complete conversation transcript
 * against scenario criteria and KB content.
 * Uses tool-calling to investigate the KB before rendering verdict.
 */

// --- Tool definitions for judge ---

const JUDGE_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'search_kb',
      description: 'Semantic search across the agent knowledge base, media library, and documents. Use this to verify claims the agent made.',
      parameters: {
        type: 'object',
        properties: {
          intent: { type: 'string', description: 'What you are looking for (a claim to verify, a topic to check)' },
        },
        required: ['intent'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'read_full_section',
      description: 'Read the full text of a specific KB section.',
      parameters: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            enum: ['knowledge_base', 'conversation_goal', 'obey_rules', 'reply_format', 'response_format'],
            description: 'Which section to read',
          },
        },
        required: ['name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'read_full_media',
      description: 'Read all media library items (photos, videos, links).',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'read_full_documents',
      description: 'Read all document summaries (PDFs, files).',
      parameters: { type: 'object', properties: {} },
    },
  },
];

// --- Judge system prompt (condensed) ---

const JUDGE_SYSTEM_PROMPT = `You are an expert evaluator of AI conversational agents.
You will judge a conversation between a simulated user and an AI agent.

YOUR TASK:
1. Read the transcript carefully from the USER's perspective
2. Use the provided tools to verify agent claims against the knowledge base
3. Identify any problems (hallucinations, instruction violations, role breaks, etc.)
4. Score the conversation across multiple dimensions
5. Render a pass/fail verdict

IMPORTANT RULES:
- Only flag issues a REAL USER would notice and be unhappy about
- The agent's opening greeting (turn 0) is operator-fixed — do NOT evaluate it
- "I had difficulties hearing you" is an infrastructure error, not agent behavior
- Claims supported by tool results or the KB are NOT hallucinations
- Length/verbosity guidance is soft — only flag if egregiously wrong
- An agent refusing an off-topic or dangerous request is CORRECT behavior

OUTPUT FORMAT (JSON):
{
  "analysis": {
    "user_intent": "what the user was trying to accomplish",
    "agent_behavior_summary": "how the agent behaved overall",
    "what_worked": ["things the agent did well"],
    "key_moments": [{"turn_index": N, "what_happened": "...", "why_it_mattered": "..."}],
    "outcome": "what happened in the end",
    "gap_vs_expected": "how reality differed from ideal"
  },
  "task_success": true/false,
  "overall_score": 0.0-1.0,
  "dimension_scores": {
    "goal_completion": 0.0-1.0,
    "instruction_following": 0.0-1.0,
    "conversational_quality": 0.0-1.0,
    "accuracy": 0.0-1.0,
    "relevance": 0.0-1.0
  },
  "findings": [...],
  "pass_fail": "pass" or "fail",
  "pass_fail_reason": "one plain sentence explaining the verdict"
}`;

// --- Judge class ---

export class Judge {
  private config = loadConfig();
  private investigation: any[] = [];

  constructor(
    private kbText: string,
    private mediaText: string = '',
    private documentsText: string = '',
    private agentContext: Record<string, any> = {},
  ) {}

  /** Evaluate a full conversation transcript. */
  async evaluate(
    transcript: Transcript,
    scenario: ScenarioModel,
    runId: string,
    mutedLabels: string[] = [],
  ): Promise<JudgeOutput> {
    this.investigation = [];

    const userPrompt = this.buildUserPrompt(transcript, scenario);
    const messages: any[] = [
      { role: 'system', content: JUDGE_SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ];

    // Tool-calling loop (max 5 rounds)
    const { response, investigation } = await this.callJudgeWithTools(messages);
    this.investigation = investigation;

    // Parse judge output
    const judgeOutput = this.parseJudgeResponse(response, runId, scenario.id);

    // Post-process: drop muted findings
    if (mutedLabels.length && judgeOutput.findings.length) {
      judgeOutput.findings = judgeOutput.findings.filter(
        f => !f.problem_label || !mutedLabels.includes(f.problem_label),
      );
    }

    // Recompute pass/fail after filtering
    judgeOutput.judge_investigation = investigation;
    return judgeOutput;
  }

  private buildUserPrompt(transcript: Transcript, scenario: ScenarioModel): string {
    const formattedTranscript = formatForLlm(transcript);

    let prompt = `SCENARIO: "${scenario.title}"
BUSINESS GOAL: ${scenario.business_goal}
USER PERSONA: ${scenario.user_persona.name} (${scenario.user_persona.communication_style}, ${scenario.user_persona.emotional_state})

JUDGE CRITERIA:
- Must achieve: ${(scenario.hidden_criteria.must_achieve || []).join('; ') || 'none specified'}
- Must avoid: ${(scenario.hidden_criteria.must_avoid || []).join('; ') || 'none specified'}

<<<TRANSCRIPT_START>>>
${formattedTranscript}
<<<TRANSCRIPT_END>>>

KNOWLEDGE BASE SUMMARY (first 3000 chars):
${this.kbText.slice(0, 3000)}
`;

    if (scenario.constraints?.length) {
      prompt += `\nAGENT CONSTRAINTS: ${scenario.constraints.join('; ')}`;
    }
    if (scenario.disallowed_behaviors?.length) {
      prompt += `\nDISALLOWED BEHAVIORS: ${scenario.disallowed_behaviors.join('; ')}`;
    }

    prompt += '\n\nNow evaluate this conversation. Use tools to verify any agent claims you are uncertain about, then produce your JSON verdict.';
    return prompt;
  }

  private async callJudgeWithTools(messages: any[]): Promise<{ response: string; investigation: any[] }> {
    const investigation: any[] = [];
    const maxRounds = 5;

    for (let round = 0; round < maxRounds; round++) {
      const isLastRound = round === maxRounds - 1;
      const requestBody: any = {
        model: this.config.llm.judge_model,
        messages,
        temperature: this.config.llm.judge_temperature,
        max_tokens: 4096,
      };

      if (!isLastRound) {
        requestBody.tools = JUDGE_TOOLS;
      } else {
        // Force final answer
        requestBody.response_format = { type: 'json_object' };
        messages.push({ role: 'user', content: 'You have used enough tools. Now return your final JSON verdict immediately.' });
      }

      const resp = await axios.post(
        `${this.config.llm.base_url}/chat/completions`,
        requestBody,
        {
          headers: {
            'Authorization': `Bearer ${this.config.llm.api_key}`,
            'Content-Type': 'application/json',
          },
          timeout: 90000,
        },
      );

      const choice = resp.data?.choices?.[0];
      const msg = choice?.message;

      // If no tool calls, we have the final answer
      if (!msg?.tool_calls?.length) {
        return { response: msg?.content || '', investigation };
      }

      // Process tool calls
      messages.push(msg);
      for (const toolCall of msg.tool_calls) {
        const toolResult = this.executeTool(toolCall.function.name, toolCall.function.arguments);
        investigation.push({
          tool: toolCall.function.name,
          intent: toolCall.function.arguments,
          summary: toolResult.slice(0, 200),
        });
        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: toolResult,
        });
      }
    }

    return { response: '', investigation };
  }

  private executeTool(name: string, argsJson: string): string {
    try {
      const args = JSON.parse(argsJson);
      switch (name) {
        case 'search_kb': {
          const intent = args.intent || '';
          // Simple keyword search across KB
          const combined = `${this.kbText}\n${this.mediaText}\n${this.documentsText}`;
          const words = intent.toLowerCase().split(/\s+/);
          const lines = combined.split('\n');
          const matches = lines.filter((l: string) => words.some((w: string) => l.toLowerCase().includes(w)));
          return matches.slice(0, 20).join('\n') || 'No relevant matches found.';
        }
        case 'read_full_section': {
          const section = args.name || '';
          const ctx = this.agentContext[section] || '';
          return ctx || `Section "${section}" is empty or not available.`;
        }
        case 'read_full_media':
          return this.mediaText || 'No media library content.';
        case 'read_full_documents':
          return this.documentsText || 'No documents available.';
        default:
          return `Unknown tool: ${name}`;
      }
    } catch {
      return 'Error executing tool.';
    }
  }

  private parseJudgeResponse(raw: string, runId: string, scenarioId: string): JudgeOutput {
    const defaults: JudgeOutput = {
      run_id: runId,
      scenario_id: scenarioId,
      task_success: false,
      overall_score: 0,
      dimension_scores: { goal_completion: 0, instruction_following: 0, conversational_quality: 0, accuracy: 0, relevance: 0 },
      analysis: null,
      findings: [],
      pass_fail: '',
      pass_fail_reason: '',
      judge_reasoning: '',
      raw_judge_response: raw,
      judge_investigation: [],
      override_pass_fail: null,
      override_reason: null,
      override_at: null,
    };

    try {
      const parsed = JSON.parse(raw);
      return {
        ...defaults,
        task_success: !!parsed.task_success,
        overall_score: parsed.overall_score ?? 0,
        dimension_scores: parsed.dimension_scores ?? defaults.dimension_scores,
        analysis: parsed.analysis ?? null,
        findings: (parsed.findings || []).map((f: any) => this.normalizeFinding(f)),
        pass_fail: parsed.pass_fail || (parsed.task_success ? 'pass' : 'fail'),
        pass_fail_reason: parsed.pass_fail_reason || '',
      };
    } catch {
      // Unparseable response — fallback
      return { ...defaults, pass_fail: 'fail', pass_fail_reason: 'Judge output was unparseable' };
    }
  }

  private normalizeFinding(raw: any): Finding {
    return {
      severity: raw.severity || 'medium',
      type: raw.type || 'other',
      turn_index: raw.turn_index ?? null,
      evidence: raw.evidence || '',
      explanation: raw.explanation || '',
      confidence: raw.confidence || 'medium',
      problem_label: raw.problem_label || null,
      problem_category: raw.problem_category || null,
      kind: raw.kind || null,
      rule_source: raw.rule_source || null,
      where_to_fix: raw.where_to_fix || null,
      existing_text_to_modify: raw.existing_text_to_modify || null,
      audience: raw.audience || ['user'],
      second_judge_check: null,
      debate_log: [],
      consensus_outcome: null,
      disputes: [],
      disputed_status: null,
    };
  }
}
