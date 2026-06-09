/**
 * Application configuration — mirrors Python app/config.py
 */

export interface LLMConfig {
  model: string;
  temperature: number;
  judge_model: string;
  judge_temperature: number;
  second_judge_model: string;
  second_judge_temperature: number;
  second_judge_enabled: boolean;
  debate_enabled: boolean;
  debate_max_rounds: number;
  debate_max_calls_per_run: number;
  api_key: string;
  base_url: string;
}

export interface BrowserConfig {
  headless: boolean;
  slow_mo: number;
  timeout_ms: number;
  trace_on_failure: boolean;
  viewport_width: number;
  viewport_height: number;
}

export interface RunConfig {
  output_dir: string;
  max_retries: number;
  wait_after_send_ms: number;
  agent_response_timeout_ms: number;
  multi_bubble_grace_ms: number;
  tool_call_grace_ms: number;
  blocking_tool_names: string[];
  stuck_detection_threshold: number;
  cm_url: string;
}

export interface AppConfig {
  llm: LLMConfig;
  browser: BrowserConfig;
  run: RunConfig;
}

export const DEFAULT_CONFIG: AppConfig = {
  llm: {
    model: 'claude-sonnet-4-6',
    temperature: 0.7,
    judge_model: 'claude-opus-4-6',
    judge_temperature: 0.1,
    second_judge_model: 'claude-sonnet-4-6',
    second_judge_temperature: 0.0,
    second_judge_enabled: true,
    debate_enabled: true,
    debate_max_rounds: 3,
    debate_max_calls_per_run: 12,
    api_key: '',
    base_url: '',
  },
  browser: {
    headless: true,
    slow_mo: 0,
    timeout_ms: 30_000,
    trace_on_failure: true,
    viewport_width: 1280,
    viewport_height: 900,
  },
  run: {
    output_dir: 'runs',
    max_retries: 2,
    wait_after_send_ms: 2000,
    agent_response_timeout_ms: 30_000,
    multi_bubble_grace_ms: 700,
    tool_call_grace_ms: 15000,
    blocking_tool_names: ['search_api', 'search_web', 'csv', 'pdf'],
    stuck_detection_threshold: 3,
    cm_url: '',
  },
};

export function loadConfig(): AppConfig {
  // TODO: merge env vars / config file over defaults
  return {
    ...DEFAULT_CONFIG,
    llm: {
      ...DEFAULT_CONFIG.llm,
      api_key: process.env.LLM_API_KEY || process.env.OPENAI_API_KEY || '',
      base_url: process.env.LLM_BASE_URL || process.env.OPENAI_BASE_URL || '',
      model: process.env.LLM_MODEL || DEFAULT_CONFIG.llm.model,
      judge_model: process.env.JUDGE_MODEL || DEFAULT_CONFIG.llm.judge_model,
    },
  };
}
