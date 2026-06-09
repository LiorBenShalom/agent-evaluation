import { ScenarioModel } from '../models/scenario';
import { Transcript, TurnRole, createTranscript, addTurn, formatForLlm } from '../models/transcript';
import { RunResult, RunMetadata } from '../models/run';
import { JudgeOutput } from '../models/judge';
import { AppConfig, loadConfig } from '../models/config';
import { UserSimulator } from './user-simulator';
import { Judge } from './judge';
import { SocketChatDriver } from './socket-chat-driver';
import { GenieChatDriver } from './genie-chat-driver';
import { reviewJudgeOutput } from './second-judge';

/**
 * Conversation Runner — mirrors Python app/orchestration/runner.py
 *
 * Orchestrates the full evaluation flow:
 * 1. Connect to agent (socket or genie)
 * 2. Simulate multi-turn conversation
 * 3. Judge the conversation
 * 4. Second-judge review
 * 5. Return results
 */

export interface RunnerParams {
  agentId: string;
  scenario: ScenarioModel;
  kbText: string;
  mediaText?: string;
  documentsText?: string;
  agentContext?: Record<string, any>;
  ks?: string;
  genieKs?: string;
  genieMode?: 'chat' | 'avatar';
  cmUrl?: string;
  client?: string;
  flowId?: string;
  env?: string;
  configId?: number;
  mutedLabels?: string[];
  onProgress?: (phase: string, step: string, detail: string, fraction: number) => void;
}

// Sentinel for LLM fallback
const LLM_FALLBACK_SENTINEL = 'I had difficulties hearing you';

interface ChatDriver {
  getGreeting(): Promise<string | null>;
  sendAndWait(message: string): Promise<string>;
  disconnect(): Promise<void>;
}

export class ConversationRunner {
  private config: AppConfig;
  private transcript: Transcript;
  private simulator: UserSimulator;

  constructor(private params: RunnerParams) {
    this.config = loadConfig();
    this.transcript = createTranscript();
    this.simulator = new UserSimulator(params.scenario);
  }

  /** Run the full evaluation. */
  async run(): Promise<RunResult> {
    const startedAt = new Date().toISOString();
    const metadata: RunMetadata = {
      run_id: `run_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      started_at: startedAt,
      finished_at: null,
      agent_url: {
        env: this.params.env || '',
        client: this.params.client || '',
        flow_id: this.params.flowId || '',
        original_url: this.params.agentId,
      },
      scenario_id: this.params.scenario.id,
      headless: true,
      llm_model: this.config.llm.model,
      judge_model: this.config.llm.judge_model,
      agent_model: null,
      kb_version: null,
      kb_hash: null,
      web_run_id: null,
      llm_fallback_retries: 0,
      app_mode: this.params.genieKs ? 'kaltura' : 'eself',
      kaltura_partner_id: null,
    };

    let chat: ChatDriver | null = null;

    try {
      // Phase 1: Connect to agent
      this.progress('connect', 'connecting', 'Connecting to agent...', 0);
      chat = await this.connectToAgent();

      // Phase 2: Multi-turn conversation
      this.progress('conversation', 'starting', 'Starting conversation...', 0.1);
      await this.runConversation(chat);

      // Phase 3: Judge
      this.progress('judge', 'evaluating', 'Evaluating conversation...', 0.8);
      let judgeOutput = await this.runJudge(metadata.run_id);

      // Phase 4: Second judge review
      if (judgeOutput && judgeOutput.pass_fail === 'fail') {
        this.progress('judge', 'second_review', 'Second judge reviewing...', 0.9);
        judgeOutput = await reviewJudgeOutput(
          judgeOutput,
          this.transcript,
          this.params.scenario.business_goal,
          this.params.scenario.title,
        );
      }

      metadata.finished_at = new Date().toISOString();

      return {
        metadata,
        transcript: this.transcript,
        judge_output: judgeOutput,
        error: null,
        artifacts_dir: null,
      };
    } catch (e: any) {
      metadata.finished_at = new Date().toISOString();
      return {
        metadata,
        transcript: this.transcript,
        judge_output: null,
        error: e.message || 'Unknown error',
        artifacts_dir: null,
      };
    } finally {
      if (chat) await chat.disconnect();
    }
  }

  private async connectToAgent(): Promise<ChatDriver> {
    // Kaltura Genie mode — REST API
    if (this.params.genieKs && this.params.configId) {
      const genieUrl = process.env.KALTURA_GENIE_URL || 'https://genie.nvq2.ovp.kaltura.com';
      return new GenieChatDriver({
        genieUrl,
        ks: this.params.genieKs,
        agentId: this.params.agentId,
        configId: this.params.configId,
        genieMode: this.params.genieMode || 'chat',
      });
    }

    // eSelf mode — Socket.IO
    if (this.params.cmUrl && this.params.client && this.params.flowId) {
      const driver = new SocketChatDriver({
        cmUrl: this.params.cmUrl,
        client: this.params.client,
        flowId: this.params.flowId,
      });
      await driver.connect();
      return driver;
    }

    throw new Error(
      'No connection method available. Provide either genieKs+configId (Kaltura) or cmUrl+client+flowId (eSelf).',
    );
  }

  private async runConversation(chat: ChatDriver): Promise<void> {
    const maxTurns = this.params.scenario.max_turns || 10;
    let llmFallbackRetries = 0;
    const maxRetries = 3;
    let restartCount = 0;
    const maxRestarts = 2;

    // Capture initial greeting
    const greeting = await chat.getGreeting();
    if (greeting) {
      addTurn(this.transcript, TurnRole.AGENT, greeting);
    }

    for (let turn = 0; turn < maxTurns; turn++) {
      const fraction = 0.1 + (0.7 * turn / maxTurns);
      this.progress('conversation', `turn_${turn + 1}`, `Turn ${turn + 1}/${maxTurns}`, fraction);

      // Simulator generates user message
      const userMsg = await this.simulator.nextMessage(this.transcript);
      if (!userMsg) break;

      addTurn(this.transcript, TurnRole.USER, userMsg);

      let agentResponse: string;
      try {
        agentResponse = await chat.sendAndWait(userMsg);
      } catch (e: any) {
        // Broken conversation — retry whole thing if socket mode
        if (restartCount < maxRestarts && this.params.cmUrl) {
          restartCount++;
          this.transcript = createTranscript();
          this.simulator = new UserSimulator(this.params.scenario);
          await chat.disconnect();
          chat = await this.connectToAgent();
          const newGreeting = await chat.getGreeting();
          if (newGreeting) addTurn(this.transcript, TurnRole.AGENT, newGreeting);
          turn = -1;
          continue;
        }
        throw e;
      }

      // Handle LLM fallback sentinel
      if (agentResponse.includes(LLM_FALLBACK_SENTINEL)) {
        if (llmFallbackRetries < maxRetries) {
          llmFallbackRetries++;
          this.transcript.turns.pop(); // remove user turn
          turn--;
          continue;
        }
      }

      // Handle empty response
      if (!agentResponse.trim()) {
        if (llmFallbackRetries < maxRetries) {
          llmFallbackRetries++;
          this.transcript.turns.pop();
          turn--;
          continue;
        }
        agentResponse = '[empty response]';
      }

      addTurn(this.transcript, TurnRole.AGENT, agentResponse);

      // Stuck loop detection
      if (this.isStuckLoop()) break;
    }
  }

  private async runJudge(runId: string): Promise<JudgeOutput> {
    const judge = new Judge(
      this.params.kbText,
      this.params.mediaText || '',
      this.params.documentsText || '',
      this.params.agentContext || {},
    );

    return judge.evaluate(
      this.transcript,
      this.params.scenario,
      runId,
      this.params.mutedLabels || [],
    );
  }

  private isStuckLoop(): boolean {
    const agentTurns = this.transcript.turns.filter(t => t.role === TurnRole.AGENT);
    const threshold = this.config.run.stuck_detection_threshold || 3;
    if (agentTurns.length < threshold) return false;
    const recent = agentTurns.slice(-threshold).map(t => t.content.trim().toLowerCase());
    return recent.every(t => t === recent[0]);
  }

  private progress(phase: string, step: string, detail: string, fraction: number) {
    this.params.onProgress?.(phase, step, detail, fraction);
  }
}
