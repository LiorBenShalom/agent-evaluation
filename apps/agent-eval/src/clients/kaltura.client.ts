import axios, { AxiosInstance } from 'axios';

/**
 * Kaltura Agentic API client — mirrors Python app/scenarios/kaltura_client.py
 *
 * All calls use KS (Kaltura Session) token for auth.
 * Header: "Authorization: KS {ks_token}"
 */

// --- Config from env ---

function baseUrl(): string {
  return (process.env.KALTURA_AGENT_API_URL || 'https://api.avatar.qa.kaltura.ai').replace(/\/$/, '');
}

function ovpEndpoint(): string {
  return (process.env.KALTURA_API_ENDPOINT || 'https://www.kaltura.com/api_v3/').replace(/\/$/, '');
}

function genieUrl(): string {
  return (process.env.KALTURA_GENIE_URL || 'https://genie.nvq2.ovp.kaltura.com').replace(/\/$/, '');
}

// --- Caches ---

const adminKsCache = new Map<number, { ks: string; expiresAt: number }>();
const ksPartnerCache = new Map<string, number>();
const agentIdsCache = new Map<string, { ids: Set<string>; expiresAt: number }>();

// --- HTTP helpers ---

function createClient(ks: string, timeout: number = 10000): AxiosInstance {
  return axios.create({
    baseURL: baseUrl(),
    timeout,
    headers: {
      'Authorization': `KS ${ks}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
  });
}

function sanitizeKs(ks: string): string {
  if (ks.length > 43) return ks.slice(0, 40) + '...';
  return ks;
}

// --- Agentic REST API ---

/** List agents for the authenticated partner. */
export async function listAgents(ks: string, offset = 0, limit = 100, filter: any = {}): Promise<any> {
  const client = createClient(ks, 15000);
  const resp = await client.post('/v1/agent/list', {
    pager: { offset, limit },
    filter,
  });
  return resp.data;
}

/** Get a single agent by UUID. */
export async function getAgent(ks: string, agentId: string): Promise<any> {
  const client = createClient(ks, 10000);
  const resp = await client.post('/v1/agent/get', { agentId });
  return resp.data;
}

/** Get avatar by ID. */
export async function getAvatar(ks: string, avatarId: string): Promise<any> {
  const client = createClient(ks, 10000);
  const resp = await client.post('/v1/avatar/get', { id: avatarId });
  return resp.data;
}

/** Get intellect config by ID. */
export async function getIntellect(ks: string, intellectId: number): Promise<any> {
  const client = createClient(ks, 10000);
  const resp = await client.post('/v1/intellect/get', { id: intellectId });
  return resp.data;
}

/** Get studio-intellect (includes knowledgeBase.categoryId). */
export async function getStudioIntellect(ks: string, intellectId: number): Promise<any> {
  const client = createClient(ks, 10000);
  const resp = await client.post('/v1/studio-intellect/get', { id: intellectId });
  return resp.data;
}

/** Update intellect prompts. */
export async function updateIntellect(
  ks: string,
  intellectId: number,
  customPrompts: any[],
  intellectType = 'internal',
): Promise<any> {
  const client = createClient(ks, 15000);
  const resp = await client.post('/v1/intellect/update', {
    id: intellectId,
    type: intellectType,
    prompts: customPrompts,
  });
  return resp.data;
}

/** Add a new intellect config. */
export async function addIntellect(ks: string, intellectData: any): Promise<any> {
  const client = createClient(ks, 15000);
  const resp = await client.post('/v1/intellect/add', intellectData);
  return resp.data;
}

/** Create a new agent. */
export async function addAgent(ks: string, agentData: any): Promise<any> {
  const client = createClient(ks, 15000);
  const resp = await client.post('/v1/agent/create', agentData);
  return resp.data;
}

/** Update agent's intellect config ID. */
export async function updateAgentConfigId(ks: string, agentId: string, configId: number): Promise<any> {
  const client = createClient(ks, 15000);
  const resp = await client.post('/v1/agent/update', {
    agentId,
    intellect: { configId },
  });
  return resp.data;
}

/** Delete an agent. */
export async function deleteAgent(ks: string, agentId: string): Promise<any> {
  const client = createClient(ks, 15000);
  const resp = await client.post('/v1/agent/delete', { agentId });
  return resp.data;
}

/** Delete an intellect config. */
export async function deleteIntellect(ks: string, intellectId: number): Promise<any> {
  const client = createClient(ks, 15000);
  const resp = await client.post('/v1/intellect/delete', { id: intellectId });
  return resp.data;
}

// --- Partner & Session ---

/** Get partner_id from a KS token (cached). */
export async function getPartnerIdForKs(ks: string): Promise<number | null> {
  if (ksPartnerCache.has(ks)) return ksPartnerCache.get(ks)!;

  try {
    const resp = await axios.get(`${ovpEndpoint()}/service/session/action/get`, {
      params: { ks, format: 1 },
      timeout: 10000,
    });
    const partnerId = resp.data?.partnerId;
    if (partnerId) {
      ksPartnerCache.set(ks, partnerId);
      return partnerId;
    }
    return null;
  } catch {
    return null;
  }
}

/** Get set of agent IDs visible to this KS (60s TTL cache). */
export async function getAgentIdsForKs(ks: string, ttl = 60): Promise<Set<string>> {
  const cached = agentIdsCache.get(ks);
  if (cached && cached.expiresAt > Date.now()) return cached.ids;

  try {
    const data = await listAgents(ks, 0, 500);
    const objects = data?.objects || [];
    const ids = new Set<string>(objects.map((a: any) => a.agentId || a.id));
    agentIdsCache.set(ks, { ids, expiresAt: Date.now() + ttl * 1000 });
    return ids;
  } catch {
    return new Set();
  }
}

/** Get partner config from Genie endpoint. */
export async function getPartnerConfig(ks: string, configId: number): Promise<any> {
  const resp = await axios.post(
    `${genieUrl()}/partner-config/list`,
    {
      pager: { pageIndex: 1, pageSize: 1 },
      withPartnerInfo: true,
      filter: { idEqual: configId, objectType: 'GenieListPartnerConfigFilter' },
    },
    {
      headers: {
        'Authorization': `KS ${ks}`,
        'Content-Type': 'application/json',
        'Accept': '*/*',
      },
      timeout: 15000,
    },
  );
  const objects = resp.data?.objects || [];
  return objects[0] || null;
}

// --- Service Admin KS ---

/** Generate service admin KS for a partner. */
export async function getServiceAdminKs(partnerId: number): Promise<string | null> {
  const servicePartnerId = parseInt(process.env.KALTURA_SERVICE_PARTNER_ID || '0', 10);
  const serviceSecret = process.env.KALTURA_SERVICE_PARTNER_SECRET || '';
  if (!servicePartnerId || !serviceSecret) return null;

  // Check cache
  const cached = adminKsCache.get(partnerId);
  if (cached && cached.expiresAt > Date.now()) return cached.ks;

  try {
    const resp = await axios.get(`${ovpEndpoint()}/service/session/action/start`, {
      params: {
        secret: serviceSecret,
        userId: '',
        type: 2, // ADMIN
        partnerId: servicePartnerId,
        expiry: 3600,
        format: 1,
      },
      timeout: 10000,
    });
    const ks = resp.data;
    if (typeof ks === 'string' && ks.length > 10) {
      // Cache with 60s early eviction
      adminKsCache.set(partnerId, { ks, expiresAt: Date.now() + (3600 - 60) * 1000 });
      return ks;
    }
    return null;
  } catch {
    return null;
  }
}

/** Generate a Genie-privileged KS for an agent (for chat/avatar sessions). */
export async function generateGenieKs(ks: string, agentId: string, configId: number): Promise<string | null> {
  const partnerId = await getPartnerIdForKs(ks);
  if (!partnerId) return null;

  const servicePartnerId = parseInt(process.env.KALTURA_SERVICE_PARTNER_ID || '0', 10);
  const serviceSecret = process.env.KALTURA_SERVICE_PARTNER_SECRET || '';
  if (!servicePartnerId || !serviceSecret) return null;

  try {
    // Get session info to extract userId
    const sessionResp = await axios.get(`${ovpEndpoint()}/service/session/action/get`, {
      params: { ks, format: 1 },
      timeout: 10000,
    });
    const userId = sessionResp.data?.userId || '';

    // Generate impersonated session with agent privileges
    const resp = await axios.get(`${ovpEndpoint()}/service/session/action/impersonate`, {
      params: {
        secret: serviceSecret,
        impersonatedPartnerId: partnerId,
        userId,
        type: 0, // USER
        partnerId: servicePartnerId,
        expiry: 86400,
        privileges: `agentid:${agentId},geniegpcid:${configId}`,
        format: 1,
      },
      timeout: 10000,
    });
    const newKs = resp.data;
    return typeof newKs === 'string' && newKs.length > 10 ? newKs : null;
  } catch {
    return null;
  }
}
