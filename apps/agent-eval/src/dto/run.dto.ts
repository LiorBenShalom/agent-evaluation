export interface RunRequest {
  assistant_url: string;
  situation_ids: string[];
  repetitions?: number;
  advanced?: {
    simulator_model?: string;
    result_model?: string;
    headless?: boolean;
  };
  genie_mode?: 'chat' | 'avatar';
  use_media?: boolean;
  use_documents?: boolean;
}

export interface RunStarted {
  run_id: string;
}

export interface RunStatus {
  run_id: string;
  state: 'queued' | 'running' | 'done' | 'stopped' | 'error';
  total: number;
  completed: number;
  passed: number;
  needs_work: number;
  current_title: string | null;
  message: string | null;
}
