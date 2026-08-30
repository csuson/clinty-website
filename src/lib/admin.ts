import type { AgentSettings, ApiKey, GmailToken, OutlookConnection, OutlookToken, Profile, ShopifyConnection, ShopifyToken, SquareConnection, SquareToken } from '../types/database'
import { supabase } from './supabase'
import { getFunctionErrorMessage } from './supabaseFunctions'

export type AdminApiKey = ApiKey & { user_email: string | null }
export type AdminGmailToken = GmailToken & { user_email: string | null }
export type AdminSquareToken = SquareToken & {
  user_email: string | null
  business_name: string | null
  location_id: string | null
  location_name: string | null
  team_member_id: string | null
  timezone: string | null
  connection_status: SquareConnection['status'] | null
}
export type AdminShopifyToken = ShopifyToken & {
  user_email: string | null
  shop_name: string | null
  connected_at: string | null
  connection_status: ShopifyConnection['status'] | null
}
export type AdminOutlookToken = OutlookToken & {
  user_email: string | null
  outlook_email: string | null
  connected_at: string | null
  connection_status: OutlookConnection['status'] | null
}
export type AdminAgentSettings = AgentSettings & {
  user_email: string | null
  clinty_api_key_name: string | null
  clinty_api_key_secret: string | null
  prompt_background?: string | null
  prompt_calendar_preference?: string | null
  prompt_default_footer?: string | null
}

export type AdminData = {
  users: Profile[]
  apiKeys: AdminApiKey[]
  gmailTokens: AdminGmailToken[]
  squareTokens: AdminSquareToken[]
  shopifyTokens: AdminShopifyToken[]
  outlookTokens: AdminOutlookToken[]
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
  auto_book_scheduling?: boolean | null
  auto_respond_instruction?: boolean | null
  auto_respond_scheduling?: boolean | null
  environment?: string | null
  log_level?: string | null
  pgoptions?: string | null
  postgres_schema?: string | null
}

export type AdminDeleteResource = 'user' | 'api_key' | 'gmail_token' | 'square_token' | 'shopify_token' | 'outlook_token' | 'agent_settings'

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
