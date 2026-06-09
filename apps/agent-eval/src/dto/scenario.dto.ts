export interface LibrarySituation {
  id: string;
  title: string;
  description: string;
  business_goal?: string;
  tags?: string[];
  max_turns?: number;
  agent_key?: string;
  app_mode?: string;
}

export interface AssistantSummary {
  name: string;
  url: string;
  image_url: string | null;
  env: string;
  client: string;
  flow_id: string;
  last_tested: string | null;
  tests_run: number;
  pass_rate: number | null;
}
