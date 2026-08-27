import type { AdminAgentSettings, AdminApiKey, CreateAgentSettingsInput } from './admin'

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
export function agentSettingsToEnvContent(settings: AdminAgentSettings): string {
  const lines: string[] = []

  function add(key: string, value: string | number | null | undefined) {
    const line = envLine(key, value)
    if (line) lines.push(line)
  }

  function addBoolean(key: string, value: boolean | null | undefined) {
    const formatted = formatEnvBoolean(value)
    if (formatted !== null) lines.push(`${key}=${formatted}`)
  }

  function addQuoted(key: string, value: string | null | undefined) {
    const line = envLineQuoted(key, value)
    if (line) lines.push(line)
  }

  addBoolean('AUTO_BOOK_SCHEDULING', settings.auto_book_scheduling)
  addBoolean('AUTO_RESPOND_INSTRUCTION', settings.auto_respond_instruction)
  addBoolean('AUTO_RESPOND_SCHEDULING', settings.auto_respond_scheduling)
  add('CALENDAR_PROVIDER', settings.calendar_provider)
  add('CLINTY_API_KEY', settings.clinty_api_key_secret)
  add('DATABASE_URI', settings.database_uri)
  add('ENVIRONMENT', settings.environment ?? 'production')
  add('LANGSMITH_API_KEY', settings.langgraph_api_key)
  add('LOG_LEVEL', settings.log_level ?? 'INFO')
  add('OPENAI_API_KEY', settings.openapi_key)
  addQuoted('PGOPTIONS', settings.pgoptions)
  add('POSTGRES_SCHEMA', settings.postgres_schema)
  add('REDIS_URI', settings.redis_uri)
  add('SECRETS_DIR', settings.secrets_dir)
  add('SQUARE_ACCESS_TOKEN', settings.square_access_token)
  add('SQUARE_LOCATION_ID', settings.square_location_id)
  add('SQUARE_SERVICE_VARIATION_ID', settings.square_service_variation_id)
  add('SQUARE_SERVICE_VARIATION_VERSION', settings.square_service_variation_version)
  add('SQUARE_TEAM_MEMBER_ID', settings.square_team_member_id)
  add('SQUARE_TIMEZONE', settings.square_timezone)

  return `${lines.join('\n')}\n`
}

export function downloadAgentSettingsEnv(settings: AdminAgentSettings): void {
  const content = agentSettingsToEnvContent(settings)
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
