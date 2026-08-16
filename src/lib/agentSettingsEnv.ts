import type { AdminAgentSettings } from './admin'

function envLine(key: string, value: string | number | null | undefined): string | null {
  if (value === null || value === undefined || value === '') return null
  return `${key}=${value}`
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

  add('CALENDAR_PROVIDER', settings.calendar_provider)
  add('CLINTY_API_KEY', settings.clinty_api_key_secret)
  add('DATABASE_URI', settings.database_uri)
  lines.push('ENVIRONMENT=production')
  add('LANGSMITH_API_KEY', settings.langgraph_api_key)
  lines.push('LOG_LEVEL=INFO')
  add('OPENAI_API_KEY', settings.openapi_key)
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
