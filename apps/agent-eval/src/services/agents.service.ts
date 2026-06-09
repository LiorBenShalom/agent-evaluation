import { Injectable } from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/mongoose';
import { Model, Connection } from 'mongoose';
import { Agent, AgentDocument } from '../schemas/agent.schema';

/**
 * Agent management service — list, create, delete agents.
 * Handles both Kaltura and eSelf modes.
 */
@Injectable()
export class AgentsService {
  constructor(
    @InjectModel(Agent.name) private agentModel: Model<AgentDocument>,
    @InjectConnection() private connection: Connection,
  ) {}

  /** List recently-tested agents with pass/fail stats. */
  async listRecent(limit: number = 10, mode?: string, partnerId?: number) {
    const filter: any = {};
    if (mode) filter.appMode = mode;
    if (partnerId) filter.kalturaPartnerId = partnerId;
    return this.agentModel.find(filter).sort({ updatedAt: -1 }).limit(limit).exec();
  }

  /** List agents from Kaltura Agentic API. */
  async listKalturaAgents(ks: string, limit: number = 100) {
    // TODO: call Kaltura Agentic API /v1/agent/list
    return [];
  }

  /** Get agent by Kaltura agent_id. */
  async getKalturaAgent(ks: string, agentId: string) {
    // TODO: call Kaltura Agentic API /v1/agent/get
    return { stub: true, agent_id: agentId };
  }

  /** Get intellect config for a Kaltura agent. */
  async getKalturaIntellect(ks: string, agentId: string) {
    // TODO: call Kaltura /v1/studio-intellect/get
    return { stub: true, agent_id: agentId };
  }

  /** Get KB content for a Kaltura agent. */
  async getKalturaKnowledge(ks: string, agentId: string) {
    // TODO: extract KB sections from intellect config
    return { kb_text: '', media_text: '', documents_text: '' };
  }

  /** Get eSelf assistant knowledge by URL. */
  async getAssistantKnowledge(url: string) {
    // TODO: extract from published Studio flow
    return { kb_text: '', media_text: '', documents_text: '' };
  }

  /** Get agent profile (lightweight info). */
  async getProfile(url: string) {
    // TODO: fetch from Studio/cache
    return { name: '', image_url: null, client: null, flow_id: null, env: null };
  }

  /** Preview delete: count what would be removed. */
  async previewDelete(agentKey: string) {
    return { run_count: 0, scenario_count: 0, kb_version_dirs: 0 };
  }

  /** Permanently delete all artifacts for an agent. */
  async deleteAgent(agentKey: string) {
    // TODO: delete from DB + disk
    return { ok: true, deleted: 0 };
  }

  /** Remember an agent in the DB roster. */
  async rememberAgent(data: Partial<Agent>) {
    const existing = await this.agentModel.findOne({
      $or: [
        { kalturaAgentId: data.kalturaAgentId },
        { originalUrl: data.originalUrl },
      ],
    }).exec();
    if (existing) {
      Object.assign(existing, data);
      return existing.save();
    }
    return this.agentModel.create(data);
  }
}
