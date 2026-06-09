/**
 * Parsed agent URL — mirrors Python app/models/url.py
 */

export interface ParsedAgentURL {
  env: string;       // 'qa', 'dev', 'us', 'staging'
  client: string;    // e.g. 'lior_org'
  flow_id: string;   // e.g. 'agent-1'
  original_url: string;
}

export interface KalturaAgentRef {
  agent_id: string;
  config_id: number;
  ks: string;
  agent_name: string;
  genie_mode: 'chat' | 'avatar';
}

/**
 * Parse a meet/studio URL into components.
 * Supports patterns:
 *   https://meet.avatar.<env>.kaltura.ai/<client>/talk-to-agent?flow_id=<flow_id>
 *   https://studio.avatar.<env>.kaltura.ai/talk-to-agent (client from query)
 */
export function parseAgentUrl(url: string): ParsedAgentURL {
  const u = new URL(url);
  const hostParts = u.hostname.split('.');
  // e.g. meet.avatar.qa.kaltura.ai → ['meet', 'avatar', 'qa', 'kaltura', 'ai']
  // or   studio.avatar.qa.kaltura.ai
  let env = 'qa';
  if (hostParts.length >= 5) {
    env = hostParts[2]; // the third segment
  }

  const pathParts = u.pathname.split('/').filter(Boolean);
  let client = '';
  let flow_id = '';

  if (pathParts.length >= 1 && pathParts[0] !== 'talk-to-agent') {
    client = pathParts[0];
  }

  flow_id = u.searchParams.get('flow_id') || '';

  return { env, client, flow_id, original_url: url };
}

export function getApiUrl(parsed: ParsedAgentURL): string {
  return `https://api.avatar.${parsed.env}.kaltura.ai`;
}

export function getStudioUrl(parsed: ParsedAgentURL): string {
  return `https://studio.avatar.${parsed.env}.kaltura.ai/talk-to-agent`;
}
