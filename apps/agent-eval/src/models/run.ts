/**
 * Run models — mirrors Python app/models/run.py
 */

import { ParsedAgentURL } from './url';
import { Transcript } from './transcript';
import { JudgeOutput } from './judge';

export interface RunMetadata {
  run_id: string;
  started_at: string;  // ISO-8601
  finished_at: string | null;
  agent_url: ParsedAgentURL;
  scenario_id: string;
  headless: boolean;
  llm_model: string;
  judge_model: string;
  agent_model: Record<string, any> | null;
  kb_version: number | null;
  kb_hash: string | null;
  web_run_id: string | null;
  llm_fallback_retries: number;
  app_mode: string | null;
  kaltura_partner_id: number | null;
}

export interface RunResult {
  metadata: RunMetadata;
  transcript: Transcript;
  judge_output: JudgeOutput | null;
  error: string | null;
  artifacts_dir: string | null;
}

export function isPassed(result: RunResult): boolean {
  if (result.judge_output) {
    return result.judge_output.pass_fail === 'pass';
  }
  return !result.error;
}
