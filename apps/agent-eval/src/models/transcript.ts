/**
 * Transcript models — mirrors Python app/models/transcript.py
 */

export enum TurnRole {
  USER = 'user',
  AGENT = 'agent',
  SYSTEM = 'system',
}

export interface Turn {
  role: TurnRole;
  content: string;
  timestamp: string;  // ISO-8601
  turn_index: number;
  metadata: Record<string, any>;
}

export interface Transcript {
  turns: Turn[];
}

// --- Helpers ---

export function createTranscript(): Transcript {
  return { turns: [] };
}

export function addTurn(
  transcript: Transcript,
  role: TurnRole,
  content: string,
  metadata: Record<string, any> = {},
): Turn {
  const turn: Turn = {
    role,
    content,
    timestamp: new Date().toISOString(),
    turn_index: transcript.turns.length,
    metadata,
  };
  transcript.turns.push(turn);
  return turn;
}

export function getUserTurns(transcript: Transcript): Turn[] {
  return transcript.turns.filter(t => t.role === TurnRole.USER);
}

export function getAgentTurns(transcript: Transcript): Turn[] {
  return transcript.turns.filter(t => t.role === TurnRole.AGENT);
}

export function getNumExchanges(transcript: Transcript): number {
  return getUserTurns(transcript).length;
}

export function formatForLlm(transcript: Transcript): string {
  return transcript.turns
    .map(t => `[${t.role.toUpperCase()}] ${t.content}`)
    .join('\n\n');
}
