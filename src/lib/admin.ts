import type {
  AgentSettings,
  ApiKey,
  GmailToken,
  OutlookConnection,
  OutlookToken,
  Profile,
  ShopifyConnection,
  ShopifyToken,
  SquareConnection,
  SquareToken,
  UserPrompts,
  WhatsAppConnection,
} from '../types/database'
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
export type AdminWhatsAppConnection = WhatsAppConnection & {
  gateway_api_key: string | null
  user_email: string | null
  effective_gateway_api_key: string | null
  uses_clinty_api_key: boolean
}
export type AdminAgentSettings = AgentSettings & {
  user_email: string | null
  clinty_api_key_name: string | null
  clinty_api_key_secret: string | null
  prompt_background?: string | null
  prompt_calendar_preference?: string | null
  prompt_default_footer?: string | null
  prompt_promotions?: string | null
}

export type AdminUserPrompts = UserPrompts & {
  user_email: string | null
}

export type AdminWebsiteSettings = {
  supabase_url: string
  supabase_anon_key: string
  supabase_service_role: string
  whatsapp_web_gateway_url: string
  whatsapp_web_login_api_key: string
  whatsapp_web_debug: string
  whatsapp_web_auth_backend: string
  whatsapp_web_auth_bucket: string
  whatsapp_web_auth_storage_prefix: string
  whatsapp_web_auth_dir: string
}

export type AdminData = {
  users: Profile[]
  apiKeys: AdminApiKey[]
  gmailTokens: AdminGmailToken[]
  squareTokens: AdminSquareToken[]
  shopifyTokens: AdminShopifyToken[]
  outlookTokens: AdminOutlookToken[]
  whatsappConnections: AdminWhatsAppConnection[]
  agentSettings: AdminAgentSettings[]
  userPrompts: AdminUserPrompts[]
  websiteSettings?: AdminWebsiteSettings
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
  clinty_api_key_secret?: string | null
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
  auto_respond_whatsapp?: boolean | null
  auto_respond_catalog?: boolean | null
  auto_respond_personal?: boolean | null
  email_ignore_personal?: boolean | null
  email_ad_enabled?: boolean | null
  whatsapp_ignore_personal?: boolean | null
  thread_message_cap?: number | null
  whatsapp_thread_message_cap?: number | null
  daily_incoming_email_limit?: number | null
  daily_incoming_email_timezone?: string | null
  daily_incoming_whatsapp_limit?: number | null
  environment?: string | null
  log_level?: string | null
  pgoptions?: string | null
  postgres_schema?: string | null
}

export type AdminDeleteResource =
  | 'user'
  | 'api_key'
  | 'gmail_token'
  | 'square_token'
  | 'shopify_token'
  | 'outlook_token'
  | 'whatsapp_token'
  | 'agent_settings'
  | 'user_prompts'

export type AdminPromptsInput = {
  user_id: string
  background: string
  calendar_preference: string
  default_footer: string
  promotions: string
  response_tone: string
  whatsapp_response_tone: string | null
}

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

export async function saveAdminUserPrompts(input: AdminPromptsInput): Promise<UserPrompts> {
  if (!supabase) {
    throw new Error('Supabase is not configured.')
  }

  const result = await supabase.functions.invoke('admin-prompts', {
    body: input,
  })

  if (result.error || (result.data && typeof result.data === 'object' && 'error' in result.data)) {
    throw new Error(await getFunctionErrorMessage(result.error, result.data))
  }

  return (result.data as { userPrompts: UserPrompts }).userPrompts
}
