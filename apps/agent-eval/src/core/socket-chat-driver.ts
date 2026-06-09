import { io, Socket } from 'socket.io-client';

/**
 * Socket Chat Driver — mirrors Python app/studio/socket_chat_driver.py
 *
 * Connects to the conversation-manager via Socket.IO,
 * sends user messages, and waits for agent responses.
 */

export interface SocketDriverConfig {
  cmUrl: string;
  client: string;
  flowId: string;
  level?: string;
  agentResponseTimeoutMs?: number;
  multiBubbleGraceMs?: number;
  toolCallGraceMs?: number;
  blockingToolNames?: string[];
}

export class SocketChatDriver {
  private socket: Socket | null = null;
  private agentParts: string[] = [];
  private socketId: string = '';
  private capturedGreeting: string = '';
  private connected = false;
  private config: Required<SocketDriverConfig>;

  constructor(config: SocketDriverConfig) {
    this.config = {
      level: 'published',
      agentResponseTimeoutMs: 30000,
      multiBubbleGraceMs: 700,
      toolCallGraceMs: 15000,
      blockingToolNames: ['search_api', 'search_web', 'csv', 'pdf'],
      ...config,
    };
  }

  /** Connect to conversation-manager and capture greeting. */
  async connect(): Promise<string | null> {
    const { cmUrl, client, flowId, level } = this.config;
    const url = `${cmUrl}?client=${client}&flowId=${flowId}&level=${level}&studio=true`;

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Connection timeout (25s)'));
      }, 25000);

      this.socket = io(url, {
        path: '/conversation-manager/message-agents',
        transports: ['websocket', 'polling'],
        reconnectionAttempts: 3,
        reconnectionDelay: 2000,
      });

      this.socket.on('connect', () => {
        this.connected = true;
      });

      this.socket.on('set_socket_id', (id: string) => {
        this.socketId = id;
      });

      this.socket.on('disconnect', () => {
        this.connected = false;
      });

      // Capture greeting parts during loading phase
      const greetingParts: string[] = [];
      const greetingHandler = (data: any) => {
        const content = typeof data === 'string' ? data : data?.content || '';
        if (content) greetingParts.push(content);
      };
      this.socket.on('agent_turn', greetingHandler);

      this.socket.on('agent_finished_loading', () => {
        clearTimeout(timeout);
        this.socket!.off('agent_turn', greetingHandler);
        this.capturedGreeting = greetingParts.join(' ').trim();
        resolve(this.capturedGreeting || null);
      });

      // Fallback: if no loading event, resolve after short delay
      this.socket.on('connect', () => {
        setTimeout(() => {
          if (!this.capturedGreeting && greetingParts.length) {
            clearTimeout(timeout);
            this.socket!.off('agent_turn', greetingHandler);
            this.capturedGreeting = greetingParts.join(' ').trim();
            resolve(this.capturedGreeting || null);
          }
        }, 5000);
      });

      this.socket.on('connect_error', (err) => {
        clearTimeout(timeout);
        reject(new Error(`Connection failed: ${err.message}`));
      });
    });
  }

  /** Send a user message and wait for the agent's full response. */
  async sendAndWait(message: string): Promise<string> {
    if (!this.socket || !this.connected) {
      throw new Error('Not connected to conversation-manager');
    }

    this.agentParts = [];
    this.socket.emit('user_turn', message);

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        resolve(this.combineResponse());
      }, this.config.agentResponseTimeoutMs);

      let graceTimeout: NodeJS.Timeout | null = null;
      let hasBlockingTool = false;

      const handler = (data: any) => {
        const content = typeof data === 'string' ? data : data?.content || '';
        if (content) {
          // Filter greeting replays
          if (this.isGreetingReplay(content)) return;
          this.agentParts.push(content);
        }

        // Check for blocking tool calls
        if (data?.tool_call || data?.type === 'tool_call') {
          const toolName = data?.tool_call?.name || data?.name || '';
          if (this.config.blockingToolNames.includes(toolName)) {
            hasBlockingTool = true;
          }
        }
      };

      const finishedHandler = () => {
        // Start grace window for additional bubbles
        const graceMs = hasBlockingTool
          ? this.config.toolCallGraceMs
          : this.config.multiBubbleGraceMs;

        if (graceTimeout) clearTimeout(graceTimeout);
        graceTimeout = setTimeout(() => {
          clearTimeout(timeout);
          this.socket!.off('agent_turn', handler);
          this.socket!.off('agent_finished_typing', finishedHandler);
          resolve(this.combineResponse());
        }, graceMs);
      };

      this.socket!.on('agent_turn', handler);
      this.socket!.on('agent_finished_typing', finishedHandler);

      // Backend error handler
      this.socket!.once('backend_error', (err) => {
        clearTimeout(timeout);
        if (graceTimeout) clearTimeout(graceTimeout);
        this.socket!.off('agent_turn', handler);
        this.socket!.off('agent_finished_typing', finishedHandler);
        reject(new Error(`Backend error: ${JSON.stringify(err)}`));
      });
    });
  }

  /** Disconnect from the conversation-manager. */
  async disconnect(): Promise<void> {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connected = false;
    }
  }

  /** Get the captured greeting. */
  async getGreeting(): Promise<string | null> {
    return this.capturedGreeting || null;
  }

  private combineResponse(): string {
    if (!this.agentParts.length) return '';
    // Prefer the last part if it looks like a JSON consolidation
    const last = this.agentParts[this.agentParts.length - 1];
    try {
      const parsed = JSON.parse(last);
      if (parsed.content) return parsed.content;
    } catch { /* not JSON */ }
    return this.agentParts.join(' ').trim();
  }

  private isGreetingReplay(content: string): boolean {
    if (!this.capturedGreeting) return false;
    const similarity = this.textSimilarity(content.toLowerCase(), this.capturedGreeting.toLowerCase());
    return similarity > 0.85;
  }

  private textSimilarity(a: string, b: string): number {
    if (a === b) return 1;
    if (!a || !b) return 0;
    const longer = a.length > b.length ? a : b;
    const shorter = a.length > b.length ? b : a;
    if (longer.includes(shorter)) return shorter.length / longer.length;
    // Simple character overlap ratio
    const aSet = new Set(a.split(' '));
    const bSet = new Set(b.split(' '));
    const intersection = [...aSet].filter(x => bSet.has(x)).length;
    const union = new Set([...aSet, ...bSet]).size;
    return union > 0 ? intersection / union : 0;
  }
}
