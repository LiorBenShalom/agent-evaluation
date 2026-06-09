import { Injectable } from '@nestjs/common';

/**
 * Plan service — scenario generation and plan management.
 */
@Injectable()
export class PlanService {
  /** Plan scenarios for a test run. */
  async planSituations(assistantUrl: string, mode: string, count?: number) {
    // TODO: if mode === 'auto' → call AI generator; if 'library' → pull from DB; if 'repeat' → reuse last
    return [];
  }

  /** Stream-generate scenarios (SSE). Yields events. */
  *iterPlanSituationsAuto(assistantUrl: string, count: number): Generator<any> {
    // TODO: yield { event: 'start' }, then { event: 'situation', ... } per generated scenario
    yield { event: 'start', count: 0 };
    yield { event: 'done', total: 0 };
  }

  /** Stream-generate scenarios for Kaltura mode. */
  *iterPlanSituationsAutoKaltura(params: {
    agentId: string;
    ks: string;
    count: number;
    agentName?: string;
    kbText?: string;
    useMedia?: boolean;
    useDocuments?: boolean;
  }): Generator<any> {
    yield { event: 'start', count: 0 };
    yield { event: 'done', total: 0 };
  }

  /** Generate single scenario from topic. */
  async generateFromTopic(assistantUrl: string, topic: string, sentiment?: string) {
    // TODO: call LLM with KB context + topic
    return null;
  }
}
