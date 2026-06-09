import axios from 'axios';

/**
 * Genie Chat Driver — mirrors Python app/scenarios/genie_chat_driver.py
 *
 * Connects to the Genie REST API (not Socket.IO) for Kaltura agent conversations.
 * Uses KS auth and streams NDJSON responses.
 */

export interface GenieDriverConfig {
  genieUrl: string;
  ks: string;
  agentId: string;
  configId: number;
  genieMode: 'chat' | 'avatar';
  timeout?: number;
}

const CHAT_CAPABILITIES = [
  'knowledge_base',
  'content_search',
  'entry_content',
  'follow_ups',
  'sources',
  'related_files',
];

const AVATAR_CAPABILITIES = [
  'knowledge_base',
];

export class GenieChatDriver {
  private threadId: string | null = null;
  private config: GenieDriverConfig;

  constructor(config: GenieDriverConfig) {
    this.config = { timeout: 60000, ...config };
  }

  /** Send a message and get the agent's response. */
  async sendAndWait(message: string): Promise<string> {
    const capabilities = this.config.genieMode === 'avatar'
      ? AVATAR_CAPABILITIES
      : CHAT_CAPABILITIES;

    const body: any = {
      message,
      capabilities,
    };

    if (this.config.genieMode === 'avatar') {
      body.experience = 'avatar_only';
      body.avatar = true;
    }

    if (this.threadId) {
      body.threadId = this.threadId;
    }

    const url = `${this.config.genieUrl}/assistant/converse`;
    const resp = await axios.post(url, body, {
      headers: {
        'Authorization': `KS ${this.config.ks}`,
        'Content-Type': 'application/json',
        'Accept': 'application/x-ndjson',
      },
      timeout: this.config.timeout,
      responseType: 'text',
    });

    // Parse NDJSON response — collect text chunks
    const lines = (resp.data as string).split('\n').filter((l: string) => l.trim());
    const textParts: string[] = [];

    for (const line of lines) {
      try {
        const chunk = JSON.parse(line);
        // Capture thread ID for multi-turn
        if (chunk.threadId && !this.threadId) {
          this.threadId = chunk.threadId;
        }
        // Collect text content
        if (chunk.type === 'text' && chunk.content) {
          textParts.push(chunk.content);
        } else if (chunk.type === 'avatar' && chunk.content) {
          textParts.push(chunk.content);
        } else if (chunk.text) {
          textParts.push(chunk.text);
        }
      } catch {
        // Skip malformed lines
      }
    }

    return textParts.join('').trim();
  }

  /** Get greeting (Genie doesn't have a greeting — return null). */
  async getGreeting(): Promise<string | null> {
    return null;
  }

  /** Disconnect (no-op for REST driver). */
  async disconnect(): Promise<void> {
    this.threadId = null;
  }
}
