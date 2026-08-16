import type { AgentSettings, ApiKey, GmailToken, Profile } from '../types/database'
import { supabase } from './supabase'
import { getFunctionErrorMessage } from './supabaseFunctions'

export type AdminApiKey = ApiKey & { user_email: string | null }
export type AdminGmailToken = GmailToken & { user_email: string | null }
export type AdminAgentSettings = AgentSettings & {
  user_email: string | null
  clinty_api_key_name: string | null
  clinty_api_key_secret: string | null
}

export type AdminData = {
  users: Profile[]
  apiKeys: AdminApiKey[]
  gmailTokens: AdminGmailToken[]
  agentSettings: AdminAgentSettings[]
}

export async function fetchAdminData(): Promise<AdminData> {
  if (!supabase) {
    throw new Error('Supabase is not configured.')
  }

  const result = await supabase.functions.invoke('admin-data')

  if (result.error || (result.data && typeof result.data === 'object' && 'error' in result.data)) {
    throw new Error(await getFunctionErrorMessage(result.error, result.data))
  }

  return result.data as AdminData
}

export type CreateAgentSettingsInput = {
  user_id: string
  name: string
  clinty_api_key_id?: string | null
  langgraph_api_key?: string | null
  url?: string | null
  graph_id?: string | null
  openapi_key?: string | null
  database_uri?: string | null
  redis_uri?: string | null
  secrets_dir?: string | null
  calendar_provider?: string | null
  square_access_token?: string | null
  square_location_id?: string | null
  square_service_variation_id?: string | null
  square_service_variation_version?: number | null
  square_team_member_id?: string | null
  square_timezone?: string | null
}

export type AdminDeleteResource = 'user' | 'api_key' | 'gmail_token' | 'square_token' | 'agent_settings'

export async function deleteAdminRecord(resource: AdminDeleteResource, id: string): Promise<void> {
  if (!supabase) {
    throw new Error('Supabase is not configured.')
  }

  const result = await supabase.functions.invoke('admin-delete', {
    body: { resource, id },
  })

  if (result.error || (result.data && typeof result.data === 'object' && 'error' in result.data)) {
    throw new Error(await getFunctionErrorMessage(result.error, result.data))
  }
}

export async function createAgentSettings(input: CreateAgentSettingsInput): Promise<AgentSettings> {
  if (!supabase) {
    throw new Error('Supabase is not configured.')
  }

  const result = await supabase.functions.invoke('admin-agent-settings', {
    body: input,
  })

  if (result.error || (result.data && typeof result.data === 'object' && 'error' in result.data)) {
    throw new Error(await getFunctionErrorMessage(result.error, result.data))
  }

  return (result.data as { agentSettings: AgentSettings }).agentSettings
}

export async function updateAgentSettings(
  id: string,
  input: CreateAgentSettingsInput,
): Promise<AgentSettings> {
  if (!supabase) {
    throw new Error('Supabase is not configured.')
  }

  const result = await supabase.functions.invoke('admin-agent-settings', {
    body: { id, ...input },
  })

  if (result.error || (result.data && typeof result.data === 'object' && 'error' in result.data)) {
    throw new Error(await getFunctionErrorMessage(result.error, result.data))
  }

  return (result.data as { agentSettings: AgentSettings }).agentSettings
}
