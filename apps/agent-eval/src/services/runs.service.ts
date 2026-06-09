import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Run, RunDocument } from '../schemas/run.schema';
import { ConversationRunner, RunnerParams } from '../core/runner';

/**
 * Run execution service — start, stop, monitor, delete test runs.
 * Wires controllers to the ConversationRunner core.
 */
@Injectable()
export class RunsService {
  constructor(
    @InjectModel(Run.name) private runModel: Model<RunDocument>,
  ) {}

  /** Start a new evaluation run. */
  async startRun(params: {
    assistantUrl: string;
    situationIds: string[];
    repetitions?: number;
    simulatorModel?: string;
    resultModel?: string;
    appMode?: string;
    ks?: string;
    genieMode?: string;
    useMedia?: boolean;
    useDocuments?: boolean;
    owner?: string;
  }): Promise<string> {
    const run = await this.runModel.create({
      agentId: params.assistantUrl,
      agentName: '',
      state: 'queued',
      total: params.situationIds.length * (params.repetitions || 1),
      completed: 0,
      passed: 0,
      needsWork: 0,
      scenarioIds: params.situationIds,
      appMode: params.appMode || 'kaltura',
      owner: params.owner || '',
      startedAt: new Date(),
    });
    // TODO: launch actual evaluation in background worker
    return run._id.toString();
  }

  /** List runs, optionally filtered by state and scoped to owner. */
  async listRuns(state?: string, owner?: string, appMode?: string, partnerId?: number) {
    const filter: any = {};
    if (state && state !== 'all') {
      if (state === 'active') {
        filter.state = { $in: ['queued', 'running'] };
      } else {
        filter.state = state;
      }
    }
    if (owner) filter.owner = owner;
    if (appMode) filter.appMode = appMode;
    const runs = await this.runModel.find(filter).sort({ createdAt: -1 }).limit(100).exec();
    return { runs, cursor: null };
  }

  /** Get run status by ID. */
  async getStatus(runId: string) {
    const run = await this.runModel.findById(runId).exec();
    if (!run) return null;
    return {
      run_id: run._id.toString(),
      state: run.state,
      total: run.total,
      completed: run.completed,
      passed: run.passed,
      needs_work: run.needsWork,
      current_title: null,
      message: null,
    };
  }

  /** Request stop of a running test. */
  async requestStop(runId: string): Promise<boolean> {
    const result = await this.runModel.findByIdAndUpdate(runId, { state: 'stopped' }).exec();
    return !!result;
  }

  /** Request proceed (resume paused run). */
  async requestProceed(runId: string): Promise<boolean> {
    const result = await this.runModel.findByIdAndUpdate(runId, { state: 'running' }).exec();
    return !!result;
  }

  /** Delete a run. */
  async deleteRun(runId: string) {
    const result = await this.runModel.findByIdAndDelete(runId).exec();
    return { ok: !!result };
  }

  /** Bulk delete runs. */
  async bulkDelete(ids: string[]) {
    const deleted: string[] = [];
    const skipped: string[] = [];
    for (const id of ids) {
      const result = await this.runModel.findByIdAndDelete(id).exec();
      (result ? deleted : skipped).push(id);
    }
    return { deleted, skipped, ok: true };
  }

  /** Rerun same scenarios as an existing run. */
  async rerunSameScenarios(runId: string, ks?: string): Promise<string> {
    const original = await this.runModel.findById(runId).exec();
    if (!original) throw new Error(`Run ${runId} not found`);
    return this.startRun({
      assistantUrl: original.agentId,
      situationIds: original.scenarioIds,
      appMode: original.appMode,
      ks,
    });
  }

  /** Compute run statistics. */
  async computeStats(limit?: number) {
    const total = await this.runModel.countDocuments().exec();
    const done = await this.runModel.countDocuments({ state: 'done' }).exec();
    return { total, done, pass_rate: 0 };
  }
}
