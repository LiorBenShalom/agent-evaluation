import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Run, RunDocument } from '../schemas/run.schema';

/**
 * Reports service — build reports, handle verdicts, disputes, KB fixes.
 */
@Injectable()
export class ReportsService {
  constructor(
    @InjectModel(Run.name) private runModel: Model<RunDocument>,
  ) {}

  /** Build the full report for a completed run. */
  async buildReport(runId: string) {
    const run = await this.runModel.findById(runId).exec();
    if (!run) return null;
    // TODO: aggregate scenario results, cluster findings, generate narrative
    return {
      run_id: runId,
      assistant_name: run.agentName || '',
      assistant_url: run.agentId,
      finished_at: run.finishedAt?.toISOString() || null,
      pass_rate: run.total > 0 ? run.passed / run.total : 0,
      passed_count: run.passed,
      total_count: run.total,
      summary: '',
      failure_topics: [],
      watch_topics: [],
      narrative_summary: null,
      situations: [],
      kb_version: null,
      kb_captured_at: null,
      app_mode: run.appMode,
      kaltura_agent_name: null,
      kaltura_avatar_id: null,
      genie_mode: 'chat',
    };
  }

  /** Override judge verdict for one scenario in a run. */
  async setVerdictOverride(runId: string, situationId: string, passFail: string | null, reason: string) {
    // TODO: persist override alongside original verdict
    return { run_id: runId, situation_id: situationId, pass_fail: passFail, reason };
  }

  /** Dispute a specific finding. */
  async disputeFinding(runId: string, situationId: string, findingIndex: number, creatorMessage: string) {
    // TODO: re-invoke judge with dispute context, persist result
    return { run_id: runId, situation_id: situationId, finding_index: findingIndex, status: 'stub' };
  }

  /** Start agentic KB suggestion session. */
  async startAgenticSession(runId: string, ks: string) {
    // TODO: kick off background LLM tool-calling loop
    const sessionId = `session_${Date.now()}`;
    return { session_id: sessionId };
  }

  /** Get agentic session status for polling. */
  async getAgenticSession(sessionId: string) {
    // TODO: look up session from in-memory registry
    return { phase: 'done', current_action: null, investigation: [], result: null, elapsed_seconds: 0 };
  }

  /** Apply KB fixes to the agent (eSelf mode). */
  async applyKbFixes(runId: string, updatedSections: Record<string, string>, appliedSuggestions?: any[]) {
    // TODO: publish to Studio
    return { ok: true, run_id: runId };
  }

  /** Apply KB fixes to the agent (Kaltura mode). */
  async applyKbFixesKaltura(runId: string, updatedSections: Record<string, string>, ks: string, appliedSuggestions?: any[], updatedHeaderTemplates?: Record<string, string>) {
    // TODO: call studio-intellect/update
    return { ok: true, run_id: runId };
  }

  /** Get KB status for a run (drift detection). */
  async getRunKbStatus(runId: string) {
    // TODO: compare run's KB snapshot to current live version
    return { run_id: runId, status: 'unknown' };
  }
}
