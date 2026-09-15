/** Map Clinty Supabase rows to email-assistant runtime environment variables. */

import { resolveWhatsAppInfrastructure } from './whatsappInfrastructure.ts'
import {
  loadWebsiteSettingsFromEdgeEnv,
  type WebsiteSettings,
} from './websiteInfrastructure.ts'

export { loadWebsiteSettingsFromEdgeEnv, type WebsiteSettings }

export const RUNTIME_ENV_KEYS = [
  'AUTO_BOOK_SCHEDULING',
  'MULTIPLE_BOOKING_ENABLED',
  'OVERBOOK_ENABLED',
  'MAX_BOOKINGS_PER_SLOT',
  'AUTO_RESPOND_CATALOG',
  'AUTO_RESPOND_INSTRUCTION',
  'AUTO_RESPOND_PERSONAL',
  'AUTO_RESPOND_SCHEDULING',
  'AUTO_RESPOND_WHATSAPP',
  'EMAIL_AD_ENABLED',
  'EMAIL_DRAFT_INSTEAD_OF_HITL',
  'EMAIL_IGNORE_PERSONAL',
  'CALENDAR_PROVIDER',
  'DAILY_INCOMING_EMAIL_LIMIT',
  'DAILY_INCOMING_EMAIL_TIMEZONE',
  'DAILY_INCOMING_WHATSAPP_LIMIT',
  'DATABASE_URI',
  'ENVIRONMENT',
  'GMAIL_SECRET',
  'GMAIL_TOKEN',
  'LANGSMITH_API_KEY',
  'LOG_LEVEL',
  'OPENAI_API_KEY',
  'OUTLOOK_SECRET',
  'OUTLOOK_TOKEN',
  'PGOPTIONS',
  'POSTGRES_SCHEMA',
  'REDIS_URI',
  'SECRETS_DIR',
  'SHOPIFY_SHOP_DOMAIN',
  'SHOPIFY_STORE_DOMAIN',
  'SHOPIFY_STOREFRONT_TOKEN',
  'SHOPIFY_TOKEN_TYPE',
  'SQUARE_ACCESS_TOKEN',
  'SQUARE_LOCATION_ID',
  'SQUARE_SERVICE_VARIATION_ID',
  'SQUARE_SERVICE_VARIATION_VERSION',
  'SQUARE_TEAM_MEMBER_ID',
  'SQUARE_TIMEZONE',
  'SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE',
  'SUPABASE_URL',
  'THREAD_MESSAGE_CAP',
  'WHATSAPP_BUSINESS_PHONE',
  'WHATSAPP_IGNORE_PERSONAL',
  'WHATSAPP_PROVIDER',
  'WHATSAPP_THREAD_MESSAGE_CAP',
  'WHATSAPP_WEB_AUTH_BACKEND',
  'WHATSAPP_WEB_AUTH_BUCKET',
  'WHATSAPP_WEB_AUTH_DIR',
  'WHATSAPP_WEB_AUTH_STORAGE_PREFIX',
  'WHATSAPP_WEB_DEBUG',
  'WHATSAPP_WEB_GATEWAY_URL',
  'WHATSAPP_WEB_LANGGRAPH_URL',
  'WHATSAPP_WEB_LOGIN_API_KEY',
] as const

export type RuntimeEnvKey = (typeof RUNTIME_ENV_KEYS)[number]

export type RuntimeEnv = Partial<Record<RuntimeEnvKey, string>>

type AgentSettingsRow = Record<string, unknown>
type GmailTokenRow = Record<string, unknown>
type OutlookTokenRow = Record<string, unknown>
type SquareTokenRow = Record<string, unknown>
type SquareConnectionRow = Record<string, unknown>
type ShopifyTokenRow = Record<string, unknown>
type WhatsAppConnectionRow = Record<string, unknown>

function trim(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function setIfPresent(env: RuntimeEnv, key: RuntimeEnvKey, value: unknown): void {
  const normalized = trim(value)
  if (normalized) {
    env[key] = normalized
  }
}

function setBooleanIfPresent(env: RuntimeEnv, key: RuntimeEnvKey, value: unknown): void {
  if (value === true) {
    env[key] = 'true'
  } else if (value === false) {
    env[key] = 'false'
  }
}

function setBooleanWithDefault(
  env: RuntimeEnv,
  key: RuntimeEnvKey,
  value: unknown,
  defaultValue: boolean,
): void {
  if (value === true || value === false) {
    env[key] = value ? 'true' : 'false'
    return
  }
  env[key] = defaultValue ? 'true' : 'false'
}

function setPositiveIntWithDefault(
  env: RuntimeEnv,
  key: RuntimeEnvKey,
  value: unknown,
  defaultValue: number,
): void {
  const parsed = typeof value === 'number' ? value : Number(String(value ?? '').trim())
  if (Number.isFinite(parsed) && parsed >= 1) {
    env[key] = String(Math.floor(parsed))
    return
  }
  env[key] = String(defaultValue)
}

function setNonNegativeIntWithDefault(
  env: RuntimeEnv,
  key: RuntimeEnvKey,
  value: unknown,
  defaultValue: number,
): void {
  if (value === null || value === undefined || (typeof value === 'string' && !value.trim())) {
    env[key] = String(defaultValue)
    return
  }
  const parsed = typeof value === 'number' ? value : Number(String(value).trim())
  if (Number.isFinite(parsed) && parsed >= 0) {
    env[key] = String(Math.floor(parsed))
    return
  }
  env[key] = String(defaultValue)
}

function formatGmailExpiry(expiry: unknown): string {
  if (!expiry) return ''
  const date = new Date(String(expiry))
  if (Number.isNaN(date.getTime())) return ''
  return date.toISOString().replace(/\.\d{3}Z$/, 'Z')
}

export function gmailTokenToRuntimeEnv(row: GmailTokenRow | null | undefined): RuntimeEnv {
  if (!row) return {}

  const accessToken = trim(row.access_token)
  const clientId = trim(row.client_id)
  if (!accessToken || !clientId) return {}

  const payload = {
    token: accessToken,
    refresh_token: trim(row.refresh_token) || null,
    token_uri: trim(row.token_uri) || 'https://oauth2.googleapis.com/token',
    client_id: clientId,
    client_secret: trim(row.client_secret),
    scopes: Array.isArray(row.scopes) ? row.scopes : [],
    universe_domain: trim(row.universe_domain) || 'googleapis.com',
    account: trim(row.google_account),
    expiry: formatGmailExpiry(row.expiry),
  }

  const secretPayload = {
    installed: {
      client_id: clientId,
      client_secret: trim(row.client_secret),
      project_id: '',
      auth_uri: 'https://accounts.google.com/o/oauth2/auth',
      token_uri: trim(row.token_uri) || 'https://oauth2.googleapis.com/token',
      auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
      redirect_uris: ['http://localhost'],
    },
  }

  return {
    GMAIL_TOKEN: JSON.stringify(payload),
    GMAIL_SECRET: JSON.stringify(secretPayload),
  }
}

export function outlookTokenToRuntimeEnv(row: OutlookTokenRow | null | undefined): RuntimeEnv {
  if (!row) return {}

  const accessToken = trim(row.access_token)
  const clientId = trim(row.client_id)
  if (!accessToken || !clientId) return {}

  const tenantId = trim(row.tenant_id) || 'common'
  const authority = trim(row.authority) || `https://login.microsoftonline.com/${tenantId}`

  const secretPayload = {
    client_id: clientId,
    tenant_id: tenantId,
    authority,
  }

  const tokenPayload = {
    token: accessToken,
    refresh_token: trim(row.refresh_token) || null,
    token_uri: trim(row.token_uri) || 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
    client_id: clientId,
    client_secret: trim(row.client_secret),
    scopes: Array.isArray(row.scopes) ? row.scopes : [],
    account: trim(row.outlook_account),
    expiry: formatGmailExpiry(row.expiry),
  }

  return {
    OUTLOOK_SECRET: JSON.stringify(secretPayload),
    OUTLOOK_TOKEN: JSON.stringify(tokenPayload),
  }
}

export function shopifyTokenToRuntimeEnv(row: ShopifyTokenRow | null | undefined): RuntimeEnv {
  if (!row) return {}

  const domain = trim(row.shop_domain)
  const token = trim(row.storefront_access_token)
  if (!domain || !token) return {}

  const tokenType = trim(row.storefront_token_type) === 'private' ? 'private' : 'public'

  return {
    SHOPIFY_STORE_DOMAIN: domain,
    SHOPIFY_SHOP_DOMAIN: domain,
    SHOPIFY_STOREFRONT_TOKEN: token,
    SHOPIFY_TOKEN_TYPE: tokenType,
  }
}

export function squareIntegrationToRuntimeEnv(
  token: SquareTokenRow | null | undefined,
  connection: SquareConnectionRow | null | undefined,
  agentSettings: AgentSettingsRow | null | undefined,
): RuntimeEnv {
  const env: RuntimeEnv = {}

  setIfPresent(
    env,
    'SQUARE_ACCESS_TOKEN',
    trim(token?.access_token) || trim(agentSettings?.square_access_token),
  )
  setIfPresent(
    env,
    'SQUARE_LOCATION_ID',
    trim(connection?.location_id) || trim(agentSettings?.square_location_id),
  )
  setIfPresent(
    env,
    'SQUARE_TEAM_MEMBER_ID',
    trim(connection?.team_member_id) || trim(agentSettings?.square_team_member_id),
  )
  setIfPresent(
    env,
    'SQUARE_SERVICE_VARIATION_ID',
    trim(connection?.service_variation_id) || trim(agentSettings?.square_service_variation_id),
  )

  const version =
    connection?.service_variation_version ?? agentSettings?.square_service_variation_version
  if (version !== null && version !== undefined) {
    setIfPresent(env, 'SQUARE_SERVICE_VARIATION_VERSION', String(version))
  }

  setIfPresent(
    env,
    'SQUARE_TIMEZONE',
    trim(connection?.timezone) || trim(agentSettings?.square_timezone),
  )

  return env
}

export function websiteSettingsToRuntimeEnv(settings: WebsiteSettings): RuntimeEnv {
  const env: RuntimeEnv = {}
  setIfPresent(env, 'SUPABASE_URL', settings.supabase_url)
  setIfPresent(env, 'SUPABASE_ANON_KEY', settings.supabase_anon_key)
  setIfPresent(env, 'SUPABASE_SERVICE_ROLE', settings.supabase_service_role)
  setIfPresent(env, 'WHATSAPP_WEB_GATEWAY_URL', settings.whatsapp_web_gateway_url)
  setIfPresent(env, 'WHATSAPP_WEB_LOGIN_API_KEY', settings.whatsapp_web_login_api_key)
  setIfPresent(env, 'WHATSAPP_WEB_DEBUG', settings.whatsapp_web_debug)
  setIfPresent(env, 'WHATSAPP_WEB_AUTH_BACKEND', settings.whatsapp_web_auth_backend)
  setIfPresent(env, 'WHATSAPP_WEB_AUTH_BUCKET', settings.whatsapp_web_auth_bucket)
  setIfPresent(env, 'WHATSAPP_WEB_AUTH_STORAGE_PREFIX', settings.whatsapp_web_auth_storage_prefix)
  setIfPresent(env, 'WHATSAPP_WEB_AUTH_DIR', settings.whatsapp_web_auth_dir)
  setIfPresent(env, 'WHATSAPP_WEB_LANGGRAPH_URL', settings.whatsapp_web_langgraph_url)
  return env
}

export function whatsappConnectionToRuntimeEnv(
  row: WhatsAppConnectionRow | null | undefined,
  agentSettings: AgentSettingsRow | null | undefined,
  websiteSettings: WebsiteSettings,
  options?: { defaultApiKey?: string | null },
): RuntimeEnv {
  const resolved = resolveWhatsAppInfrastructure(row, websiteSettings, {
    postgresSchema: agentSettings?.postgres_schema ?? null,
    defaultApiKey: options?.defaultApiKey ?? null,
  })

  const env = websiteSettingsToRuntimeEnv(websiteSettings)
  setIfPresent(env, 'WHATSAPP_WEB_GATEWAY_URL', resolved.gatewayUrl)
  setIfPresent(env, 'WHATSAPP_WEB_LOGIN_API_KEY', resolved.gatewayApiKey)
  setIfPresent(env, 'WHATSAPP_WEB_DEBUG', resolved.debug)
  setIfPresent(env, 'WHATSAPP_WEB_AUTH_BACKEND', resolved.authBackend)
  setIfPresent(env, 'WHATSAPP_WEB_AUTH_BUCKET', resolved.authBucket)
  setIfPresent(env, 'WHATSAPP_WEB_AUTH_STORAGE_PREFIX', resolved.authStoragePrefix)
  setIfPresent(env, 'WHATSAPP_WEB_AUTH_DIR', resolved.authDir)
  setIfPresent(env, 'WHATSAPP_WEB_LANGGRAPH_URL', resolved.langgraphUrl)
  setIfPresent(env, 'WHATSAPP_BUSINESS_PHONE', row?.phone)

  const hasWebGateway = Boolean(resolved.gatewayUrl)
  const connected = trim(row?.status) === 'connected'
  if (hasWebGateway || connected) {
    env.WHATSAPP_PROVIDER = 'web'
  }

  return env
}

export function agentSettingsToRuntimeEnv(row: AgentSettingsRow | null | undefined): RuntimeEnv {
  if (!row) return {}

  const env: RuntimeEnv = {}
  setBooleanIfPresent(env, 'AUTO_BOOK_SCHEDULING', row.auto_book_scheduling)
  setBooleanWithDefault(env, 'MULTIPLE_BOOKING_ENABLED', row.multiple_booking_enabled, false)
  setBooleanWithDefault(env, 'OVERBOOK_ENABLED', row.overbook_enabled, false)
  setPositiveIntWithDefault(env, 'MAX_BOOKINGS_PER_SLOT', row.max_bookings_per_slot, 2)
  setBooleanIfPresent(env, 'AUTO_RESPOND_INSTRUCTION', row.auto_respond_instruction)
  setBooleanIfPresent(env, 'AUTO_RESPOND_SCHEDULING', row.auto_respond_scheduling)
  setBooleanWithDefault(env, 'AUTO_RESPOND_WHATSAPP', row.auto_respond_whatsapp, true)
  setBooleanWithDefault(env, 'AUTO_RESPOND_CATALOG', row.auto_respond_catalog, false)
  setBooleanWithDefault(env, 'AUTO_RESPOND_PERSONAL', row.auto_respond_personal, true)
  setBooleanWithDefault(env, 'EMAIL_AD_ENABLED', row.email_ad_enabled, true)
  setBooleanWithDefault(
    env,
    'EMAIL_DRAFT_INSTEAD_OF_HITL',
    row.email_draft_instead_of_hitl,
    false,
  )
  setBooleanWithDefault(env, 'EMAIL_IGNORE_PERSONAL', row.email_ignore_personal, false)
  setBooleanWithDefault(env, 'WHATSAPP_IGNORE_PERSONAL', row.whatsapp_ignore_personal, true)
  setPositiveIntWithDefault(env, 'THREAD_MESSAGE_CAP', row.thread_message_cap, 10)
  setPositiveIntWithDefault(env, 'WHATSAPP_THREAD_MESSAGE_CAP', row.whatsapp_thread_message_cap, 10)
  setNonNegativeIntWithDefault(env, 'DAILY_INCOMING_EMAIL_LIMIT', row.daily_incoming_email_limit, 50)
  setIfPresent(env, 'DAILY_INCOMING_EMAIL_TIMEZONE', row.daily_incoming_email_timezone)
  setNonNegativeIntWithDefault(
    env,
    'DAILY_INCOMING_WHATSAPP_LIMIT',
    row.daily_incoming_whatsapp_limit,
    50,
  )
  setIfPresent(env, 'CALENDAR_PROVIDER', row.calendar_provider)
  setIfPresent(env, 'DATABASE_URI', row.database_uri)
  setIfPresent(env, 'ENVIRONMENT', row.environment ?? 'production')
  setIfPresent(env, 'LANGSMITH_API_KEY', row.langgraph_api_key)
  setIfPresent(env, 'LOG_LEVEL', row.log_level ?? 'INFO')
  setIfPresent(env, 'OPENAI_API_KEY', row.openapi_key)
  setIfPresent(env, 'PGOPTIONS', row.pgoptions)
  setIfPresent(env, 'POSTGRES_SCHEMA', row.postgres_schema)
  setIfPresent(env, 'REDIS_URI', row.redis_uri)
  setIfPresent(env, 'SECRETS_DIR', row.secrets_dir)
  return env
}

export type BuildRuntimeEnvInput = {
  agentSettings?: AgentSettingsRow | null
  clintyApiKey?: string | null
  gmailToken?: GmailTokenRow | null
  outlookToken?: OutlookTokenRow | null
  squareToken?: SquareTokenRow | null
  squareConnection?: SquareConnectionRow | null
  shopifyToken?: ShopifyTokenRow | null
  whatsappConnection?: WhatsAppConnectionRow | null
  websiteSettings?: WebsiteSettings
}

export function buildRuntimeEnv(input: BuildRuntimeEnvInput): RuntimeEnv {
  const websiteSettings = input.websiteSettings ?? loadWebsiteSettingsFromEdgeEnv()
  return {
    ...agentSettingsToRuntimeEnv(input.agentSettings),
    ...gmailTokenToRuntimeEnv(input.gmailToken),
    ...outlookTokenToRuntimeEnv(input.outlookToken),
    ...shopifyTokenToRuntimeEnv(input.shopifyToken),
    ...squareIntegrationToRuntimeEnv(
      input.squareToken,
      input.squareConnection,
      input.agentSettings,
    ),
    ...whatsappConnectionToRuntimeEnv(
      input.whatsappConnection,
      input.agentSettings,
      websiteSettings,
      { defaultApiKey: input.clintyApiKey ?? null },
    ),
  }
}

export function listMissingRuntimeEnvKeys(env: RuntimeEnv): RuntimeEnvKey[] {
  return RUNTIME_ENV_KEYS.filter((key) => !trim(env[key]))
}
