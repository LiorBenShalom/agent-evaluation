import axios from 'axios';

/**
 * KB Extractor — mirrors Python app/scenarios/kb_extractor.py
 *
 * Extracts knowledge base, media library, and documents from an agent's
 * published config (eSelf mode) or Kaltura intellect (Kaltura mode).
 */

// --- Cache (60s TTL) ---
const publishedCache = new Map<string, { data: any; expiresAt: number }>();

// --- Auth0 token cache ---
const tokenCache = new Map<string, { token: string; expiresAt: number }>();

// --- Config ---
function getAuth0Config(env: string) {
  const prefix = env.toUpperCase();
  return {
    domain: process.env[`AUTH0_DOMAIN_${prefix}`] || process.env.AUTH0_DOMAIN || '',
    clientId: process.env[`AUTH0_CLIENT_ID_${prefix}`] || process.env.AUTH0_CLIENT_ID || '',
    clientSecret: process.env[`AUTH0_CLIENT_SECRET_${prefix}`] || process.env.AUTH0_CLIENT_SECRET || '',
    audience: process.env[`AUTH0_AUDIENCE_${prefix}`] || process.env.AUTH0_AUDIENCE || '',
  };
}

function getApiBase(env: string): string {
  return process.env[`STUDIO_BASE_${env.toUpperCase()}`]
    || process.env.STUDIO_BASE
    || `https://api.avatar.${env}.kaltura.ai`;
}

// --- Auth0 token ---
async function getAuth0Token(env: string): Promise<string> {
  const cached = tokenCache.get(env);
  if (cached && cached.expiresAt > Date.now()) return cached.token;

  const config = getAuth0Config(env);
  if (!config.domain || !config.clientId || !config.clientSecret) {
    throw new Error(`Auth0 not configured for env "${env}"`);
  }

  const resp = await axios.post(`https://${config.domain}/oauth/token`, {
    grant_type: 'client_credentials',
    client_id: config.clientId,
    client_secret: config.clientSecret,
    audience: config.audience,
  }, { timeout: 10000 });

  const token = resp.data.access_token;
  const expiresIn = (resp.data.expires_in || 3600) - 60;
  tokenCache.set(env, { token, expiresAt: Date.now() + expiresIn * 1000 });
  return token;
}

// --- Fetch published config (eSelf) ---

export async function fetchPublished(
  env: string,
  client: string,
  flowId: string,
  forceRefresh = false,
): Promise<any> {
  const cacheKey = `${env}/${client}/${flowId}`;

  if (!forceRefresh) {
    const cached = publishedCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) return cached.data;
  }

  const apiBase = getApiBase(env);
  const token = await getAuth0Token(env);
  const url = `${apiBase}/clients/${client}/flow/${flowId}?level=published&studio=true`;

  const headers: any = { Authorization: `Bearer ${token}` };
  if (forceRefresh) {
    headers['Cache-Control'] = 'no-cache';
    headers['Pragma'] = 'no-cache';
  }

  const resp = await axios.get(url, { headers, timeout: 15000 });
  const data = resp.data;

  publishedCache.set(cacheKey, { data, expiresAt: Date.now() + 60_000 });
  return data;
}

// --- Extract structured context ---

export function extractAgentContext(published: any): Record<string, any> {
  const conversation = published?.conversation || [];
  const advanced = published?.advanced || {};

  const context: Record<string, any> = {
    knowledge_base: '',
    conversation_goal: '',
    obey_rules: '',
    reply_format: '',
    response_format: '',
    external_resources: '',
    enriched_summaries: '',
    excluded_global_rules: [],
    global_rules: {},
  };

  // Parse conversation[] array
  for (const entry of conversation) {
    const name = entry?.name || '';
    const text = entry?.text || entry?.content || '';
    if (name === 'general_background' || name === 'knowledge_base') {
      context.knowledge_base = text;
    } else if (name === 'extended_background' || name === 'conversation_goal') {
      context.conversation_goal = text;
    } else if (name === 'obey_rules') {
      context.obey_rules = text;
    } else if (name === 'reply_format') {
      context.reply_format = text;
    }
  }

  // Response format (JSON schema)
  context.response_format = published?.response_format || '';

  // External resources (tools/functions)
  const externalFunctions = advanced?.external_functions || published?.external_functions || [];
  if (externalFunctions.length) {
    context.external_resources = externalFunctions
      .map((f: any) => `[TOOL: ${f.name || f.type || 'unknown'}] ${f.description || ''}`)
      .join('\n');
  }

  // Enriched sources (URL summaries)
  const enriched = conversation.filter((e: any) => e?.type === 'enriched');
  if (enriched.length) {
    context.enriched_summaries = enriched
      .map((e: any) => `[${e.url || 'source'}]\n${e.text || e.content || ''}`)
      .join('\n\n');
  }

  // Excluded global rules
  context.excluded_global_rules = advanced?.excluded_global_rules || [];

  return context;
}

// --- Assemble KB text ---

export function assembleKbText(context: Record<string, any>): string {
  const sections: string[] = [];

  if (context.knowledge_base) {
    sections.push(`# KNOWLEDGE BASE\n${context.knowledge_base}`);
  }
  if (context.conversation_goal) {
    sections.push(`# CONVERSATION GOAL\n${context.conversation_goal}`);
  }
  if (context.obey_rules) {
    sections.push(`# OBEY RULES\n${context.obey_rules}`);
  }
  if (context.reply_format) {
    sections.push(`# REPLY FORMAT\n${context.reply_format}`);
  }
  if (context.response_format) {
    sections.push(`# ENFORCE LLM RESPONSE FORMAT\n${context.response_format}`);
  }
  if (context.external_resources) {
    sections.push(`# EXTERNAL RESOURCES\n${context.external_resources}`);
  }
  if (context.enriched_summaries) {
    sections.push(`# ENRICHED SOURCES\n${context.enriched_summaries}`);
  }

  return sections.join('\n\n');
}

// --- Extract media library ---

export function extractMediaFromPublished(published: any): string {
  const advanced = published?.advanced || {};
  const photos = advanced?.visualPhotos || [];
  const videos = advanced?.visualVideos || [];
  const links = advanced?.visualLinks || [];

  if (!photos.length && !videos.length && !links.length) return '';

  const sections: string[] = [];

  if (photos.length) {
    const items = photos.map((p: any, i: number) => {
      const title = p['custom-field-title-1'] || p.title || `Photo ${i + 1}`;
      const desc = p['custom-field-description-1'] || p.description || '';
      return `[photo id=${p.id || i}] | Title: "${title}" | Description: "${desc}"`;
    });
    sections.push(`## Photos (${photos.length})\n${items.join('\n')}`);
  }

  if (videos.length) {
    const items = videos.map((v: any, i: number) => {
      const title = v['custom-field-title-1'] || v.title || `Video ${i + 1}`;
      const desc = v['custom-field-description-1'] || v.description || '';
      return `[video id=${v.id || i}] | Title: "${title}" | Description: "${desc}"`;
    });
    sections.push(`## Videos (${videos.length})\n${items.join('\n')}`);
  }

  if (links.length) {
    const items = links.map((l: any, i: number) => {
      const title = l['custom-field-title-1'] || l.title || `Link ${i + 1}`;
      const url = l.url || l.href || '';
      const desc = l['custom-field-description-1'] || l.description || '';
      return `[link id=${l.id || i}] | Title: "${title}" | URL: ${url} | Description: "${desc}"`;
    });
    sections.push(`## Links (${links.length})\n${items.join('\n')}`);
  }

  return sections.join('\n\n');
}

// --- Extract documents ---

export function extractDocumentsFromPublished(published: any): string {
  const enrichConversation = published?.enrich_conversation || [];
  if (!enrichConversation.length) return '';

  const items = enrichConversation.map((doc: any) => {
    const name = doc.name || doc.fileName || 'Document';
    const kind = doc.type || 'document';
    const source = doc.url || '';
    const summary = doc.summary || doc.text || doc.content || '';
    return `[${kind}] ${name}${source ? `\nSource: ${source}` : ''}\n${summary}`;
  });

  return items.join('\n\n');
}

// --- High-level extract functions (eSelf mode) ---

export async function extractKb(env: string, client: string, flowId: string, forceRefresh = false): Promise<string> {
  const published = await fetchPublished(env, client, flowId, forceRefresh);
  const context = extractAgentContext(published);
  return assembleKbText(context);
}

export async function extractMediaLibrary(env: string, client: string, flowId: string, forceRefresh = false): Promise<string> {
  const published = await fetchPublished(env, client, flowId, forceRefresh);
  return extractMediaFromPublished(published);
}

export async function extractDocuments(env: string, client: string, flowId: string, forceRefresh = false): Promise<string> {
  const published = await fetchPublished(env, client, flowId, forceRefresh);
  return extractDocumentsFromPublished(published);
}

// --- Kaltura mode KB extraction (from intellect) ---

export function extractKbFromIntellect(intellect: any): string {
  const prompts = intellect?.prompts || intellect?.customPrompts || [];
  const sections: string[] = [];

  for (const prompt of prompts) {
    const name = prompt?.name || prompt?.key || '';
    const text = prompt?.value || prompt?.text || prompt?.content || '';
    if (!text) continue;

    if (name.includes('knowledge') || name.includes('kb')) {
      sections.push(`# KNOWLEDGE BASE\n${text}`);
    } else if (name.includes('goal') || name.includes('conversation_goal')) {
      sections.push(`# CONVERSATION GOAL\n${text}`);
    } else if (name.includes('obey') || name.includes('rules')) {
      sections.push(`# OBEY RULES\n${text}`);
    } else if (name.includes('reply') || name.includes('format')) {
      sections.push(`# REPLY FORMAT\n${text}`);
    } else {
      sections.push(`# ${name.toUpperCase()}\n${text}`);
    }
  }

  return sections.join('\n\n');
}
