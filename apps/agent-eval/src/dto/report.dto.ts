export interface FinalReport {
  run_id: string;
  assistant_name: string;
  assistant_url: string;
  finished_at: string | null;
  pass_rate: number;
  passed_count: number;
  total_count: number;
  summary: string;
  failure_topics: any[];
  watch_topics: any[];
  narrative_summary: any | null;
  situations: SituationResult[];
  kb_version: number | null;
  kb_captured_at: string | null;
  app_mode: 'kaltura' | 'eself' | null;
  kaltura_agent_name: string | null;
  kaltura_avatar_id: string | null;
  genie_mode: 'chat' | 'avatar';
}

export interface SituationResult {
  id: string;
  title: string;
  pass_fail: 'pass' | 'fail' | null;
  pass_fail_reason: string | null;
  overall_score: number | null;
  findings: JudgeFinding[];
  transcript: any[];
  override_pass_fail?: string | null;
  override_reason?: string;
}

export interface JudgeFinding {
  type: string;
  severity: string;
  explanation: string;
  evidence: string;
  turn_index: number;
  problem_label: string;
  audience: string[];
}

export interface HistoryEntry {
  run_id: string;
  assistant_name: string;
  assistant_url: string;
  date: string;
  pass_rate: number;
  total: number;
  passed: number;
  delta: number | null;
  kb_version: number | null;
  app_mode: 'kaltura' | 'eself' | null;
  kaltura_agent_name: string | null;
}
