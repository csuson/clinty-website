import type {
  AdminAgentSettings,
  AdminApiKey,
  AdminGmailToken,
  AdminOutlookToken,
  AdminShopifyToken,
  AdminSquareToken,
  AdminWebsiteSettings,
  AdminWhatsAppConnection,
  CreateAgentSettingsInput,
} from './admin'

export type AgentSettingsEnvContext = {
  gmailToken?: AdminGmailToken | null
  outlookToken?: AdminOutlookToken | null
  squareToken?: AdminSquareToken | null
  shopifyToken?: AdminShopifyToken | null
  whatsappConnection?: AdminWhatsAppConnection | null
  websiteSettings?: AdminWebsiteSettings | null
}

/** Website VITE values are preferred — they match the deployed site and email-assistant .env exports. */
export function resolveWebsiteSupabaseSettings(
  websiteSettings?: AdminWebsiteSettings | null,
): Pick<AdminWebsiteSettings, 'supabase_url' | 'supabase_anon_key' | 'supabase_service_role'> {
  const viteUrl = import.meta.env.VITE_SUPABASE_URL?.trim() || ''
  const viteAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() || ''
  const edgeUrl = websiteSettings?.supabase_url?.trim() || ''
  const edgeAnonKey = websiteSettings?.supabase_anon_key?.trim() || ''

  return {
    supabase_url: viteUrl || edgeUrl,
    supabase_anon_key: viteAnonKey || edgeAnonKey,
    supabase_service_role: websiteSettings?.supabase_service_role?.trim() || '',
  }
}

export function edgeWebsiteSupabaseSettings(
  websiteSettings?: AdminWebsiteSettings | null,
): Pick<AdminWebsiteSettings, 'supabase_url' | 'supabase_anon_key' | 'supabase_service_role'> {
  return {
    supabase_url: websiteSettings?.supabase_url?.trim() || '',
    supabase_anon_key: websiteSettings?.supabase_anon_key?.trim() || '',
    supabase_service_role: websiteSettings?.supabase_service_role?.trim() || '',
  }
}

export type WhatsAppEnvSettings = {
  gatewayUrl: string
  gatewayApiKey: string
  debug: string
  authBackend: string
  authBucket: string
  authStoragePrefix: string
  authDir: string
  langgraphUrl: string
}

export function resolveWhatsAppEnvSettings(
  whatsappConnection?: AdminWhatsAppConnection | null,
  websiteSettings?: AdminWebsiteSettings | null,
  agentSettings?: Pick<AdminAgentSettings, 'postgres_schema'> | null,
): WhatsAppEnvSettings {
  const gatewayUrl =
    whatsappConnection?.gateway_url?.trim() ||
    whatsappConnection?.effective_gateway_url?.trim() ||
    websiteSettings?.whatsapp_web_gateway_url?.trim() ||
    ''
  const gatewayApiKey =
    whatsappConnection?.effective_gateway_api_key?.trim() ||
    whatsappConnection?.gateway_api_key?.trim() ||
    websiteSettings?.whatsapp_web_login_api_key?.trim() ||
    ''
  const authStoragePrefix =
    whatsappConnection?.gateway_auth_storage_prefix?.trim() ||
    whatsappConnection?.effective_auth_storage_prefix?.trim() ||
    agentSettings?.postgres_schema?.trim() ||
    websiteSettings?.whatsapp_web_auth_storage_prefix?.trim() ||
    'default'

  return {
    gatewayUrl,
    gatewayApiKey,
    debug:
      whatsappConnection?.gateway_debug?.trim() || websiteSettings?.whatsapp_web_debug?.trim() || '1',
    authBackend:
      whatsappConnection?.gateway_auth_backend?.trim() ||
      websiteSettings?.whatsapp_web_auth_backend?.trim() ||
      'supabase',
    authBucket:
      whatsappConnection?.gateway_auth_bucket?.trim() ||
      websiteSettings?.whatsapp_web_auth_bucket?.trim() ||
      'whatsapp-web-auth',
    authStoragePrefix,
    authDir:
      whatsappConnection?.gateway_auth_dir?.trim() ||
      websiteSettings?.whatsapp_web_auth_dir?.trim() ||
      '/tmp/whatsapp-web-auth',
    langgraphUrl:
      whatsappConnection?.gateway_langgraph_url?.trim() ||
      whatsappConnection?.effective_langgraph_url?.trim() ||
      websiteSettings?.whatsapp_web_langgraph_url?.trim() ||
      '',
  }
}

function envLine(key: string, value: string | number | null | undefined): string | null {
  if (value === null || value === undefined || value === '') return null
  return `${key}=${value}`
}

function envLineQuoted(key: string, value: string | null | undefined): string | null {
  if (value === null || value === undefined || value === '') return null
  if (/[\s#"]/.test(value)) {
    return `${key}="${value.replace(/"/g, '\\"')}"`
  }
  return `${key}=${value}`
}

function formatEnvBoolean(value: boolean | null | undefined): string | null {
  if (value === null || value === undefined) return null
  return value ? 'true' : 'false'
}

function parseEnvBoolean(value: string | undefined): boolean | null {
  if (!value || value.trim() === '') return null
  const normalized = value.trim().toLowerCase()
  if (normalized === 'true') return true
  if (normalized === 'false') return false
  return null
}

function parseEnvPositiveInt(value: string | undefined, defaultValue: number): number {
  if (!value || value.trim() === '') return defaultValue
  const parsed = Number(value.trim())
  if (!Number.isFinite(parsed) || parsed < 1) return defaultValue
  return Math.floor(parsed)
}

function parseEnvNonNegativeInt(value: string | undefined, defaultValue: number): number {
  if (!value || value.trim() === '') return defaultValue
  const parsed = Number(value.trim())
  if (!Number.isFinite(parsed) || parsed < 0) return defaultValue
  return Math.floor(parsed)
}

export type ParsedEnvFile = Record<string, string>

/** Parse KEY=VALUE lines from a .env file (supports quoted values). */
export function parseEnvFile(content: string): ParsedEnvFile {
  const result: ParsedEnvFile = {}

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue

    const separator = trimmed.indexOf('=')
    if (separator === -1) continue

    const key = trimmed.slice(0, separator).trim()
    let value = trimmed.slice(separator + 1).trim()

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }

    result[key] = value
  }

  return result
}

/** e.g. tony-kiteschool-square-cal.env -> tony-kiteschool-square-cal */
export function envFilenameToSettingsName(filename: string): string {
  const base = filename.replace(/\.env$/i, '').replace(/^.*[/\\]/, '').trim()
  return base || 'Imported agent settings'
}

export function findApiKeyBySecret(apiKeys: AdminApiKey[], secret: string | undefined): AdminApiKey | null {
  if (!secret) return null
  return apiKeys.find((key) => key.key_secret === secret && !key.revoked_at) ?? null
}

/** Map parsed env vars to agent settings form fields. */
export function parsedEnvToAgentSettingsInput(
  parsed: ParsedEnvFile,
  options: {
    name: string
    user_id?: string
    clinty_api_key_id?: string | null
  },
): CreateAgentSettingsInput {
  const versionRaw = parsed.SQUARE_SERVICE_VARIATION_VERSION
  const squareVersion =
    versionRaw && versionRaw.trim() !== '' && !Number.isNaN(Number(versionRaw))
      ? Number(versionRaw)
      : null

  return {
    user_id: options.user_id ?? '',
    name: options.name,
    clinty_api_key_id: options.clinty_api_key_id ?? null,
    langgraph_api_key: parsed.LANGSMITH_API_KEY ?? '',
    url: parsed.LANGGRAPH_URL ?? parsed.URL ?? '',
    graph_id: parsed.GRAPH_ID ?? '',
    openapi_key: parsed.OPENAI_API_KEY ?? '',
    database_uri: parsed.DATABASE_URI ?? '',
    redis_uri: parsed.REDIS_URI ?? '',
    secrets_dir: parsed.SECRETS_DIR ?? '',
    calendar_provider: parsed.CALENDAR_PROVIDER ?? '',
    square_access_token: parsed.SQUARE_ACCESS_TOKEN ?? '',
    square_location_id: parsed.SQUARE_LOCATION_ID ?? '',
    square_service_variation_id: parsed.SQUARE_SERVICE_VARIATION_ID ?? '',
    square_service_variation_version: squareVersion,
    square_team_member_id: parsed.SQUARE_TEAM_MEMBER_ID ?? '',
    square_timezone: parsed.SQUARE_TIMEZONE ?? '',
    auto_book_scheduling: parseEnvBoolean(parsed.AUTO_BOOK_SCHEDULING),
    auto_respond_instruction: parseEnvBoolean(parsed.AUTO_RESPOND_INSTRUCTION),
    auto_respond_scheduling: parseEnvBoolean(parsed.AUTO_RESPOND_SCHEDULING),
    auto_respond_whatsapp: parseEnvBoolean(parsed.AUTO_RESPOND_WHATSAPP) ?? true,
    auto_respond_catalog: parseEnvBoolean(parsed.AUTO_RESPOND_CATALOG) ?? false,
    auto_respond_personal: parseEnvBoolean(parsed.AUTO_RESPOND_PERSONAL) ?? true,
    email_ignore_personal: parseEnvBoolean(parsed.EMAIL_IGNORE_PERSONAL) ?? false,
    email_ad_enabled: parseEnvBoolean(parsed.EMAIL_AD_ENABLED) ?? true,
    email_draft_instead_of_hitl: parseEnvBoolean(parsed.EMAIL_DRAFT_INSTEAD_OF_HITL) ?? false,
    whatsapp_ignore_personal: parseEnvBoolean(parsed.WHATSAPP_IGNORE_PERSONAL) ?? true,
    thread_message_cap: parseEnvPositiveInt(parsed.THREAD_MESSAGE_CAP, 10),
    whatsapp_thread_message_cap: parseEnvPositiveInt(parsed.WHATSAPP_THREAD_MESSAGE_CAP, 10),
    daily_incoming_email_limit: parseEnvNonNegativeInt(parsed.DAILY_INCOMING_EMAIL_LIMIT, 50),
    daily_incoming_email_timezone: parsed.DAILY_INCOMING_EMAIL_TIMEZONE ?? '',
    daily_incoming_whatsapp_limit: parseEnvNonNegativeInt(parsed.DAILY_INCOMING_WHATSAPP_LIMIT, 50),
    environment: parsed.ENVIRONMENT ?? '',
    log_level: parsed.LOG_LEVEL ?? '',
    pgoptions: parsed.PGOPTIONS ?? '',
    postgres_schema: parsed.POSTGRES_SCHEMA ?? '',
  }
}

/** e.g. kiteboard-env-square.env */
export function agentSettingsEnvFilename(settings: AdminAgentSettings): string {
  const provider = settings.calendar_provider?.trim().toLowerCase()
  if (provider) return `kiteboard-env-${provider}.env`

  const slug = settings.name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

  return slug ? `kiteboard-env-${slug}.env` : 'kiteboard-env.env'
}

/** Build .env content matching the kiteboard agent format. */
export function agentSettingsToEnvContent(
  settings: AdminAgentSettings,
  context: AgentSettingsEnvContext = {},
): string {
  const lines: string[] = []
  const seenKeys = new Set<string>()

  function add(key: string, value: string | number | null | undefined) {
    if (seenKeys.has(key)) return
    const line = envLine(key, value)
    if (!line) return
    seenKeys.add(key)
    lines.push(line)
  }

  function addBoolean(key: string, value: boolean | null | undefined) {
    if (seenKeys.has(key)) return
    const formatted = formatEnvBoolean(value)
    if (formatted === null) return
    seenKeys.add(key)
    lines.push(`${key}=${formatted}`)
  }

  function addQuoted(key: string, value: string | null | undefined) {
    if (seenKeys.has(key)) return
    const line = envLineQuoted(key, value)
    if (!line) return
    seenKeys.add(key)
    lines.push(line)
  }

  const squareAccessToken =
    settings.square_access_token?.trim() || context.squareToken?.access_token?.trim() || null
  const websiteSupabase = resolveWebsiteSupabaseSettings(context.websiteSettings)
  const whatsappEnv = resolveWhatsAppEnvSettings(
    context.whatsappConnection,
    context.websiteSettings,
    settings,
  )

  addBoolean('AUTO_BOOK_SCHEDULING', settings.auto_book_scheduling)
  addBoolean('AUTO_RESPOND_INSTRUCTION', settings.auto_respond_instruction)
  addBoolean('AUTO_RESPOND_SCHEDULING', settings.auto_respond_scheduling)
  addBoolean('AUTO_RESPOND_WHATSAPP', settings.auto_respond_whatsapp ?? true)
  addBoolean('AUTO_RESPOND_CATALOG', settings.auto_respond_catalog ?? false)
  addBoolean('AUTO_RESPOND_PERSONAL', settings.auto_respond_personal ?? true)
  addBoolean('EMAIL_IGNORE_PERSONAL', settings.email_ignore_personal ?? false)
  addBoolean('EMAIL_AD_ENABLED', settings.email_ad_enabled ?? true)
  addBoolean('EMAIL_DRAFT_INSTEAD_OF_HITL', settings.email_draft_instead_of_hitl ?? false)
  addBoolean('WHATSAPP_IGNORE_PERSONAL', settings.whatsapp_ignore_personal ?? true)
  add('THREAD_MESSAGE_CAP', settings.thread_message_cap ?? 10)
  add('WHATSAPP_THREAD_MESSAGE_CAP', settings.whatsapp_thread_message_cap ?? 10)
  add('DAILY_INCOMING_EMAIL_LIMIT', settings.daily_incoming_email_limit ?? 50)
  add('DAILY_INCOMING_EMAIL_TIMEZONE', settings.daily_incoming_email_timezone)
  add('DAILY_INCOMING_WHATSAPP_LIMIT', settings.daily_incoming_whatsapp_limit ?? 50)
  add('CALENDAR_PROVIDER', settings.calendar_provider)
  add('CLINTY_API_KEY', settings.clinty_api_key_secret)
  add('DATABASE_URI', settings.database_uri)
  add('ENVIRONMENT', settings.environment ?? 'production')
  add('GMAIL_ACCESS_TOKEN', context.gmailToken?.access_token)
  add('LANGSMITH_API_KEY', settings.langgraph_api_key)
  add('LOG_LEVEL', settings.log_level ?? 'INFO')
  add('OPENAI_API_KEY', settings.openapi_key)
  add('OUTLOOK_ACCESS_TOKEN', context.outlookToken?.access_token)
  addQuoted('PGOPTIONS', settings.pgoptions)
  add('POSTGRES_SCHEMA', settings.postgres_schema)
  add('REDIS_URI', settings.redis_uri)
  add('SECRETS_DIR', settings.secrets_dir)
  add('SHOPIFY_ACCESS_TOKEN', context.shopifyToken?.access_token)
  add('SQUARE_ACCESS_TOKEN', squareAccessToken)
  add('SQUARE_LOCATION_ID', settings.square_location_id)
  add('SQUARE_SERVICE_VARIATION_ID', settings.square_service_variation_id)
  add('SQUARE_SERVICE_VARIATION_VERSION', settings.square_service_variation_version)
  add('SQUARE_TEAM_MEMBER_ID', settings.square_team_member_id)
  add('SQUARE_TIMEZONE', settings.square_timezone)
  add('SUPABASE_URL', websiteSupabase.supabase_url)
  add('SUPABASE_ANON_KEY', websiteSupabase.supabase_anon_key)
  add('SUPABASE_SERVICE_ROLE', websiteSupabase.supabase_service_role)
  add('WHATSAPP_WEB_GATEWAY_URL', whatsappEnv.gatewayUrl)
  add('WHATSAPP_WEB_LOGIN_API_KEY', whatsappEnv.gatewayApiKey)
  add('WHATSAPP_WEB_DEBUG', whatsappEnv.debug)
  add('WHATSAPP_WEB_AUTH_BACKEND', whatsappEnv.authBackend)
  add('WHATSAPP_WEB_AUTH_BUCKET', whatsappEnv.authBucket)
  add('WHATSAPP_WEB_AUTH_STORAGE_PREFIX', whatsappEnv.authStoragePrefix)
  add('WHATSAPP_WEB_AUTH_DIR', whatsappEnv.authDir)
  add('WHATSAPP_WEB_LANGGRAPH_URL', whatsappEnv.langgraphUrl)

  return `${lines.join('\n')}\n`
}

export function buildAgentSettingsEnvContext(
  settings: AdminAgentSettings,
  data: {
    gmailTokens?: AdminGmailToken[]
    outlookTokens?: AdminOutlookToken[]
    squareTokens?: AdminSquareToken[]
    shopifyTokens?: AdminShopifyToken[]
    whatsappConnections?: AdminWhatsAppConnection[]
    websiteSettings?: AdminWebsiteSettings | null
  },
): AgentSettingsEnvContext {
  const matchByUser = <T extends { user_id: string }>(rows: T[] | undefined): T | null =>
    rows?.find((row) => row.user_id === settings.user_id) ?? null

  return {
    gmailToken: matchByUser(data.gmailTokens),
    outlookToken: matchByUser(data.outlookTokens),
    squareToken: matchByUser(data.squareTokens),
    shopifyToken: matchByUser(data.shopifyTokens),
    whatsappConnection: matchByUser(data.whatsappConnections),
    websiteSettings: data.websiteSettings ?? null,
  }
}

export function downloadAgentSettingsEnv(
  settings: AdminAgentSettings,
  context: AgentSettingsEnvContext = {},
): void {
  const content = agentSettingsToEnvContent(settings, context)
  const filename = agentSettingsEnvFilename(settings)
  const blob = new Blob([content], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
