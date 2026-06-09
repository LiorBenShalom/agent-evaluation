/**
 * Judge output models — mirrors Python app/models/judge.py
 */

// --- Enums ---

export enum FindingSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum FindingType {
  HALLUCINATION = 'hallucination',
  INVENTED_CAPABILITY = 'invented_capability',
  INSTRUCTION_VIOLATION = 'instruction_violation',
  ROLE_BREAK = 'role_break',
  OVERCOMPLIANCE = 'overcompliance',
  UNSAFE_RESPONSE = 'unsafe_response',
  MISSING_INFORMATION_REQUEST = 'missing_information_request',
  EXCESSIVE_VERBOSITY = 'excessive_verbosity',
  IRRELEVANT_RESPONSE = 'irrelevant_response',
  PROMPT_LEAK = 'prompt_leak',
  DEMO_BREAKING = 'demo_breaking',
  STUCK_LOOP = 'stuck_loop',
  EMPTY_RESPONSE = 'empty_response',
  OTHER = 'other',
}

export enum Confidence {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
}

export enum FindingKind {
  FORMAT = 'format',
  BEHAVIOR = 'behavior',
}

export enum RuleSource {
  GLOBAL_RULE = 'global_rule',
  OBEY_RULE = 'obey_rule',
  REPLY_FORMAT = 'reply_format',
  SCENARIO = 'scenario',
  GENERAL_QUALITY = 'general_quality',
}

export enum FindingAudience {
  USER = 'user',
  INTERNAL = 'internal',
}

export enum ConsensusOutcome {
  AGREE = 'agree',
  SOFTENED = 'softened',
  WITHDRAW = 'withdraw',
  UNRESOLVED = 'unresolved',
}

// --- Interfaces ---

export interface SecondJudgeCheck {
  verdict: 'agree' | 'disagree' | 'uncertain';
  reason: string;
  model: string;
  checked_at: string;
}

export interface DebateRound {
  round_number: number;
  speaker: 'primary' | 'secondary';
  action: string;
  message: string;
  new_severity: string | null;
  new_audience: string[] | null;
  model: string;
  created_at: string;
}

export interface FindingDispute {
  creator_message: string;
  judge_response: string;
  verdict_change: 'confirmed' | 'softened' | 'withdrawn';
  new_severity: string | null;
  new_audience: string[] | null;
  created_at: string;
}

export interface Finding {
  severity: FindingSeverity;
  type: FindingType;
  turn_index: number | null;
  evidence: string;
  explanation: string;
  confidence: Confidence;
  problem_label: string | null;
  problem_category: string | null;
  kind: FindingKind | null;
  rule_source: RuleSource | null;
  where_to_fix: string | null;
  existing_text_to_modify: string | null;
  audience: FindingAudience[];
  second_judge_check: SecondJudgeCheck | null;
  debate_log: DebateRound[];
  consensus_outcome: ConsensusOutcome | null;
  disputes: FindingDispute[];
  disputed_status: string | null;
}

export interface KeyMoment {
  turn_index: number;
  what_happened: string;
  why_it_mattered: string;
}

export interface ConversationAnalysis {
  user_intent: string;
  agent_behavior_summary: string;
  what_worked: string[];
  key_moments: KeyMoment[];
  outcome: string;
  gap_vs_expected: string;
}

export interface DimensionScores {
  goal_completion: number;
  instruction_following: number;
  conversational_quality: number;
  accuracy: number;
  relevance: number;
}

export interface JudgeOutput {
  run_id: string;
  scenario_id: string;
  task_success: boolean;
  overall_score: number;
  dimension_scores: DimensionScores;
  analysis: ConversationAnalysis | null;
  findings: Finding[];
  pass_fail: 'pass' | 'fail' | '';
  pass_fail_reason: string;
  judge_reasoning: string;
  raw_judge_response: string;
  judge_investigation: Record<string, any>[];
  override_pass_fail: string | null;
  override_reason: string | null;
  override_at: string | null;
}
