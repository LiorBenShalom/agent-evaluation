/**
 * Scenario models — mirrors Python app/models/scenario.py
 */

export interface UserPersona {
  name: string;
  background: string;
  communication_style: string;
  emotional_state: string;
  knowledge_level: string;
}

export interface JudgeCriteria {
  must_achieve: string[];
  must_avoid: string[];
  bonus: string[];
}

export interface FailureExample {
  description: string;
  agent_utterance: string;
  why_bad: string;
}

export interface ScenarioTaxonomy {
  sentiment?: string;
  complexity?: string;
  domain?: string;
  interaction_type?: string;
}

export type KnowledgeSource = 'kb' | 'media_library' | 'mixed' | 'general' | 'documents';

export interface ScenarioModel {
  id: string;
  title: string;
  description: string;
  business_goal: string;
  user_persona: UserPersona;
  opening_message: string | null;
  hidden_criteria: JudgeCriteria;
  constraints: string[];
  disallowed_behaviors: string[];
  max_turns: number;
  completion_definition: string;
  failure_examples: FailureExample[];
  seed_messages: string[];
  tags: string[];
  taxonomy: ScenarioTaxonomy;
  kb_citations: string[];
  knowledge_source: KnowledgeSource;
  scripted_turns: string[];
  agent_key: string | null;
  agent_name: string | null;
  app_mode: string | null;
}

export const DEFAULT_USER_PERSONA: UserPersona = {
  name: 'Default User',
  background: '',
  communication_style: 'casual and direct',
  emotional_state: 'neutral',
  knowledge_level: 'average',
};

export const DEFAULT_JUDGE_CRITERIA: JudgeCriteria = {
  must_achieve: [],
  must_avoid: [],
  bonus: [],
};
