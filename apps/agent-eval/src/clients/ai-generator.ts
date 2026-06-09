import axios from 'axios';
import { loadConfig } from '../models/config';

/**
 * AI Scenario Generator — mirrors Python app/scenarios/ai_generator.py
 *
 * Generates test scenarios using LLM based on the agent's KB content.
 */

interface GeneratorConfig {
  model: string;
  temperature: number;
  baseUrl: string;
  apiKey: string;
  maxAttempts: number;
}

function getGeneratorConfig(): GeneratorConfig {
  const appConfig = loadConfig();
  return {
    model: appConfig.llm.judge_model || appConfig.llm.model,
    temperature: appConfig.llm.temperature,
    baseUrl: appConfig.llm.base_url,
    apiKey: appConfig.llm.api_key,
    maxAttempts: 3,
  };
}

// --- LLM call with retry ---

async function callLlm(
  messages: Array<{ role: string; content: string }>,
  config: GeneratorConfig,
  temperature?: number,
  jsonMode = true,
): Promise<string> {
  const url = `${config.baseUrl}/chat/completions`;
  const body: any = {
    model: config.model,
    messages,
    temperature: temperature ?? config.temperature,
    max_tokens: 4096,
  };
  if (jsonMode) {
    body.response_format = { type: 'json_object' };
  }

  let lastError: Error | null = null;
  const delays = [500, 1000, 2000];

  for (let attempt = 0; attempt < config.maxAttempts; attempt++) {
    try {
      const resp = await axios.post(url, body, {
        headers: {
          'Authorization': `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 60000,
      });
      return resp.data?.choices?.[0]?.message?.content || '';
    } catch (e: any) {
      lastError = e;
      const status = e?.response?.status;
      // Non-transient: don't retry
      if (status === 400) throw e;
      // Transient: retry
      if (attempt < config.maxAttempts - 1) {
        await new Promise(r => setTimeout(r, delays[attempt] || 2000));
      }
    }
  }
  throw lastError || new Error('LLM call failed after retries');
}

// --- Scenario generation prompt ---

const SYSTEM_PROMPT = `You are a test scenario generator for AI conversational agents.
Given the agent's knowledge base, generate realistic test scenarios that evaluate
whether the agent handles various user intents correctly.

Output valid JSON matching the requested schema. Each scenario should test a distinct aspect
of the agent's capabilities based on its knowledge base content.`;

function buildUserPrompt(params: {
  kbText: string;
  mediaText: string;
  documentsText: string;
  count: number;
  topic?: string;
  sentiment?: string;
  existingTitles: string[];
}): string {
  let prompt = `Generate ${params.count} test scenario(s) for an AI agent with this knowledge:\n\n`;
  prompt += `--- KNOWLEDGE BASE ---\n${params.kbText.slice(0, 8000)}\n\n`;

  if (params.mediaText) {
    prompt += `--- MEDIA LIBRARY ---\n${params.mediaText.slice(0, 2000)}\n\n`;
  }
  if (params.documentsText) {
    prompt += `--- DOCUMENTS ---\n${params.documentsText.slice(0, 2000)}\n\n`;
  }
  if (params.topic) {
    prompt += `REQUIRED TOPIC: The scenario MUST be about "${params.topic}".\n\n`;
  }
  if (params.sentiment) {
    prompt += `REQUIRED SENTIMENT: The user should have a "${params.sentiment}" tone.\n\n`;
  }
  if (params.existingTitles.length) {
    const avoidList = params.existingTitles.slice(-15).map(t => `- ${t}`).join('\n');
    prompt += `AVOID duplicating these existing scenarios:\n${avoidList}\n\n`;
  }

  prompt += `Return a JSON object with key "scenarios" containing an array of scenario objects.
Each scenario must have:
- "title": string (max 5 words, no colons)
- "description": string (one sentence, action-verb-first, max 90 chars)
- "business_goal": string (max 15 words)
- "max_turns": number (2-15, how many back-and-forth exchanges)
- "tags": string[] (subject tags from the KB)
- "user_persona": { "name": string, "background": string, "communication_style": string, "emotional_state": string, "knowledge_level": string }
- "hidden_criteria": { "must_achieve": string[], "must_avoid": string[], "bonus": string[] }
- "seed_messages": string[] (1-2 opening lines the simulated user might say)
- "kb_citations": string[] (2-3 short refs to KB topics this scenario tests)
- "knowledge_source": "kb" | "media_library" | "documents" | "mixed"
`;

  return prompt;
}

// --- Public API ---

export interface GeneratedScenario {
  title: string;
  description: string;
  business_goal: string;
  max_turns: number;
  tags: string[];
  user_persona: {
    name: string;
    background: string;
    communication_style: string;
    emotional_state: string;
    knowledge_level: string;
  };
  hidden_criteria: {
    must_achieve: string[];
    must_avoid: string[];
    bonus: string[];
  };
  seed_messages: string[];
  kb_citations: string[];
  knowledge_source: string;
}

/** Generate scenarios synchronously. */
export async function generateScenarios(params: {
  kbText: string;
  mediaText?: string;
  documentsText?: string;
  count?: number;
  topic?: string;
  sentiment?: string;
  existingScenarios?: Array<{ title: string }>;
}): Promise<GeneratedScenario[]> {
  const config = getGeneratorConfig();
  if (!config.baseUrl || !config.apiKey) {
    throw new Error('LLM not configured (missing API key or base URL)');
  }

  const count = params.count || 5;
  const existingTitles = (params.existingScenarios || []).map(s => s.title);

  const userPrompt = buildUserPrompt({
    kbText: params.kbText,
    mediaText: params.mediaText || '',
    documentsText: params.documentsText || '',
    count,
    topic: params.topic,
    sentiment: params.sentiment,
    existingTitles,
  });

  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: userPrompt },
  ];

  const rawResponse = await callLlm(messages, config);

  try {
    const parsed = JSON.parse(rawResponse);
    const scenarios = parsed.scenarios || parsed.items || (Array.isArray(parsed) ? parsed : [parsed]);
    return scenarios.slice(0, count);
  } catch {
    // Attempt recovery on truncated JSON
    try {
      const fixed = rawResponse.replace(/,\s*$/, '') + ']}';
      const parsed = JSON.parse(fixed);
      return (parsed.scenarios || []).slice(0, count);
    } catch {
      throw new Error('Failed to parse LLM response as JSON');
    }
  }
}

/** Generate scenarios as an iterator (for SSE streaming). */
export async function* iterScenarios(params: {
  kbText: string;
  mediaText?: string;
  documentsText?: string;
  count?: number;
  topic?: string;
  sentiment?: string;
  existingScenarios?: Array<{ title: string }>;
}): AsyncGenerator<{ event: string; data?: any }> {
  const count = params.count || 5;
  yield { event: 'start', data: { count } };

  try {
    const scenarios = await generateScenarios(params);
    for (const scenario of scenarios) {
      yield { event: 'situation', data: scenario };
    }
    yield { event: 'done', data: { total: scenarios.length } };
  } catch (e: any) {
    yield { event: 'error', data: { message: e.message } };
  }
}
