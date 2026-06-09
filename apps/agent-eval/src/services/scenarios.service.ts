import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Scenario, ScenarioDocument } from '../schemas/scenario.schema';

/**
 * Scenario management service — CRUD, generation, import, bulk ops.
 */
@Injectable()
export class ScenariosService {
  constructor(
    @InjectModel(Scenario.name) private scenarioModel: Model<ScenarioDocument>,
  ) {}

  /** List all library scenarios. */
  async listLibrary() {
    return this.scenarioModel.find().sort({ createdAt: -1 }).exec();
  }

  /** List all scenarios known to the system. */
  async listAll(appMode?: string, partnerId?: number) {
    const filter: any = {};
    if (appMode) filter.appMode = appMode;
    return this.scenarioModel.find(filter).sort({ createdAt: -1 }).exec();
  }

  /** Get full scenario by ID. */
  async getById(sid: string) {
    return this.scenarioModel.findById(sid).exec();
  }

  /** Create a new scenario. */
  async create(payload: any) {
    return this.scenarioModel.create(payload);
  }

  /** Create a scripted-replay scenario. */
  async createScripted(payload: any) {
    return this.scenarioModel.create({ ...payload, scripted: true });
  }

  /** Update a scenario by ID. */
  async update(sid: string, patch: any) {
    return this.scenarioModel.findByIdAndUpdate(sid, patch, { new: true }).exec();
  }

  /** Delete a scenario by ID. */
  async delete(sid: string) {
    const result = await this.scenarioModel.findByIdAndDelete(sid).exec();
    return { ok: !!result };
  }

  /** Bulk delete scenarios. */
  async bulkDelete(ids: string[]) {
    await this.scenarioModel.deleteMany({ _id: { $in: ids } }).exec();
    return { deleted: ids, ok: true };
  }

  /** Bulk update scenarios. */
  async bulkUpdate(ids: string[], op: string, value: any) {
    // TODO: implement different ops (add_tag, remove_tag, set_max_turns, etc.)
    return { updated: ids.length, op };
  }

  /** List scenarios from other agents. */
  async listFromOtherAgents(currentUrl: string, appMode?: string, partnerId?: number) {
    // TODO: find scenarios not belonging to current agent
    return [];
  }

  /** Import scenarios from another agent. */
  async importFromOther(ids: string[]) {
    // TODO: clone scenarios into current context
    return [];
  }

  /** Generate a scenario for a given topic. */
  async generateFromTopic(assistantUrl: string, topic: string, sentiment?: string) {
    // TODO: call LLM to generate scenario
    return { stub: true, topic, sentiment };
  }

  /** Compute scenario statistics. */
  async computeStats(source: string, ids?: string[]) {
    const total = await this.scenarioModel.countDocuments().exec();
    return { total, source };
  }

  /** Get taxonomy schema (enum values). */
  getTaxonomy() {
    // TODO: return from models/scenario enums
    return {
      sentiment: { values: ['positive', 'negative', 'neutral', 'mixed'], default: 'neutral' },
      complexity: { values: ['simple', 'moderate', 'complex'], default: 'moderate' },
      domain: { values: ['sales', 'support', 'onboarding', 'general'], default: 'general' },
    };
  }
}
