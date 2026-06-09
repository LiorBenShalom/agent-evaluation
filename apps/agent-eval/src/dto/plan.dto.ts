export interface PlanRequest {
  assistant_url: string;
  mode: 'auto' | 'library' | 'repeat';
  count?: number;
  agent_name?: string;
  kb_text?: string;
  use_media?: boolean;
  use_documents?: boolean;
}

export interface PlanSituation {
  id: string;
  title: string;
  description: string;
  user_persona?: any;
  opening_message?: string;
  max_turns?: number;
  tags?: string[];
}

export interface PlanResponse {
  situations: PlanSituation[];
}
