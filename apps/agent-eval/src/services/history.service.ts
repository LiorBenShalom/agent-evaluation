import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Run, RunDocument } from '../schemas/run.schema';

/**
 * History service — prompt versioning, run history, agent timeline.
 */
@Injectable()
export class HistoryService {
  constructor(
    @InjectModel(Run.name) private runModel: Model<RunDocument>,
  ) {}

  /** List historical runs as timeline entries. */
  async listHistory(appMode?: string, partnerId?: number) {
    const filter: any = { state: 'done' };
    if (appMode) filter.appMode = appMode;
    const runs = await this.runModel.find(filter).sort({ finishedAt: -1 }).limit(100).exec();
    return runs.map(r => ({
      run_id: r._id.toString(),
      assistant_name: r.agentName || '',
      assistant_url: r.agentId,
      date: r.finishedAt?.toISOString() || (r as any).createdAt?.toISOString() || '',
      pass_rate: r.total > 0 ? r.passed / r.total : 0,
      total: r.total,
      passed: r.passed,
      delta: null,
      kb_version: null,
      app_mode: r.appMode,
      kaltura_agent_name: null,
    }));
  }

  /** Get prompt version history for an agent. */
  async getAgentPromptHistory(url: string, ks?: string) {
    // TODO: query kb_versions collection
    return { versions: [] };
  }

  /** Get specific prompt version. */
  async getAgentPromptVersion(url: string, version: number) {
    // TODO: fetch from kb_versions
    return null;
  }

  /** List runs that used a specific agent version. */
  async listAgentRunsForVersion(url: string, version: number) {
    // TODO: filter runs by kb_version
    return [];
  }

  /** Revert agent to a previous version. */
  async revertToVersion(url: string, version: number, ks?: string) {
    // TODO: publish prior version's sections back to agent
    return { ok: true, version };
  }
}
