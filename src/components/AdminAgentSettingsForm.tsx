import { useMemo, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import FormField from './FormField'
import { SecretInput, SecretValue } from './SecretField'
import { inputClass } from '../constants/forms'
import type { AdminApiKey, CreateAgentSettingsInput } from '../lib/admin'
import { maskApiKey } from '../lib/apiKeys'

export const emptyAgentSettingsForm: CreateAgentSettingsInput = {
  user_id: '',
  name: '',
  clinty_api_key_id: '',
  langgraph_api_key: '',
  url: '',
  graph_id: '',
  openapi_key: '',
  database_uri: '',
  redis_uri: '',
  secrets_dir: '',
  calendar_provider: '',
  square_access_token: '',
  square_location_id: '',
  square_service_variation_id: '',
  square_service_variation_version: null,
  square_team_member_id: '',
  square_timezone: '',
  auto_book_scheduling: null,
  auto_respond_instruction: null,
  auto_respond_scheduling: null,
  environment: '',
  log_level: '',
  pgoptions: '',
  postgres_schema: '',
}

export function toAgentSettingsPayload(form: CreateAgentSettingsInput): CreateAgentSettingsInput {
  return {
    ...form,
    clinty_api_key_id: form.clinty_api_key_id || null,
    langgraph_api_key: form.langgraph_api_key || null,
    url: form.url || null,
    graph_id: form.graph_id || null,
    openapi_key: form.openapi_key || null,
    database_uri: form.database_uri || null,
    redis_uri: form.redis_uri || null,
    secrets_dir: form.secrets_dir || null,
    calendar_provider: form.calendar_provider || null,
    square_access_token: form.square_access_token || null,
    square_location_id: form.square_location_id || null,
    square_service_variation_id: form.square_service_variation_id || null,
    square_service_variation_version: form.square_service_variation_version ?? null,
    square_team_member_id: form.square_team_member_id || null,
    square_timezone: form.square_timezone || null,
    auto_book_scheduling: form.auto_book_scheduling ?? null,
    auto_respond_instruction: form.auto_respond_instruction ?? null,
    auto_respond_scheduling: form.auto_respond_scheduling ?? null,
    environment: form.environment || null,
    log_level: form.log_level || null,
    pgoptions: form.pgoptions || null,
    postgres_schema: form.postgres_schema || null,
  }
}

function booleanSelectValue(value: boolean | null | undefined): string {
  if (value === null || value === undefined) return ''
  return value ? 'true' : 'false'
}

function parseBooleanSelect(value: string): boolean | null {
  if (value === '') return null
  return value === 'true'
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-white rounded-2xl border border-navy-900/5 p-6 shadow-sm space-y-5">
      <h2 className="text-lg font-semibold text-navy-900">{title}</h2>
      {children}
    </section>
  )
}

function formatApiKeyLabel(key: AdminApiKey): string {
  return key.name
}

function ClintyApiKeyDisplay({ apiKey }: { apiKey: AdminApiKey }) {
  const value = apiKey.key_secret ?? maskApiKey(apiKey.key_prefix)

  if (apiKey.key_secret) {
    return (
      <div className="bg-cream border border-navy-900/10 rounded-lg px-4 py-3">
        <SecretValue value={value} truncateLength={24} />
      </div>
    )
  }

  return (
    <code className="block text-xs font-mono bg-cream border border-navy-900/10 rounded-lg px-4 py-3 break-all text-navy-800">
      {value}
    </code>
  )
}

export function getUserApiKeys(apiKeys: AdminApiKey[], userId: string): AdminApiKey[] {
  return apiKeys
    .filter((key) => key.user_id === userId)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
}

type AdminAgentSettingsFormProps = {
  form: CreateAgentSettingsInput
  setForm: React.Dispatch<React.SetStateAction<CreateAgentSettingsInput>>
  users: { id: string; email: string }[]
  apiKeys: AdminApiKey[]
  saving: boolean
  submitLabel: string
  savingLabel: string
  onSubmit: (payload: CreateAgentSettingsInput) => Promise<void>
}

export default function AdminAgentSettingsForm({
  form,
  setForm,
  users,
  apiKeys,
  saving,
  submitLabel,
  savingLabel,
  onSubmit,
}: AdminAgentSettingsFormProps) {
  const userApiKeys = useMemo(
    () => getUserApiKeys(apiKeys, form.user_id),
    [apiKeys, form.user_id],
  )

  const selectedApiKey = useMemo(
    () => userApiKeys.find((key) => key.id === form.clinty_api_key_id) ?? null,
    [userApiKeys, form.clinty_api_key_id],
  )

  function updateField<K extends keyof CreateAgentSettingsInput>(
    field: K,
    value: CreateAgentSettingsInput[K],
  ) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  function handleUserChange(userId: string) {
    const keysForUser = getUserApiKeys(apiKeys, userId)
    setForm((current) => {
      const keepCurrentKey = keysForUser.some((key) => key.id === current.clinty_api_key_id)
      return {
        ...current,
        user_id: userId,
        clinty_api_key_id: keepCurrentKey ? current.clinty_api_key_id : (keysForUser[0]?.id ?? ''),
      }
    })
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    await onSubmit(toAgentSettingsPayload(form))
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <SectionCard title="Basic">
        <div className="grid gap-5">
          <FormField label="User" id="agent-user" required>
            <select
              id="agent-user"
              required
              value={form.user_id}
              onChange={(e) => handleUserChange(e.target.value)}
              className={inputClass}
              disabled={saving}
            >
              <option value="">Select a user</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.email}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Name" id="agent-name" required>
            <input
              id="agent-name"
              type="text"
              required
              value={form.name}
              onChange={(e) => updateField('name', e.target.value)}
              placeholder="e.g. Production agent"
              className={inputClass}
              disabled={saving}
            />
          </FormField>

          <FormField label="Clinty API Key" id="agent-clinty-api-key">
            {!form.user_id ? (
              <p className="text-sm text-navy-500">Select a user to load their API keys.</p>
            ) : userApiKeys.length === 0 ? (
              <p className="text-sm text-navy-500">No active API keys for this user.</p>
            ) : (
              <div className="space-y-3">
                <select
                  id="agent-clinty-api-key"
                  value={form.clinty_api_key_id ?? ''}
                  onChange={(e) => updateField('clinty_api_key_id', e.target.value)}
                  className={inputClass}
                  disabled={saving}
                >
                  {userApiKeys.map((key) => (
                    <option key={key.id} value={key.id}>
                      {formatApiKeyLabel(key)}
                    </option>
                  ))}
                </select>
                {selectedApiKey && (
                  <ClintyApiKeyDisplay apiKey={selectedApiKey} />
                )}
              </div>
            )}
          </FormField>
        </div>
      </SectionCard>

      <SectionCard title="LangGraph">
        <div className="grid gap-5 sm:grid-cols-2">
          <FormField label="URL" id="agent-url">
            <input
              id="agent-url"
              type="url"
              value={form.url ?? ''}
              onChange={(e) => updateField('url', e.target.value)}
              className={inputClass}
              disabled={saving}
            />
          </FormField>
          <FormField label="Graph ID" id="agent-graph-id">
            <input
              id="agent-graph-id"
              type="text"
              value={form.graph_id ?? ''}
              onChange={(e) => updateField('graph_id', e.target.value)}
              className={inputClass}
              disabled={saving}
            />
          </FormField>
          <div className="sm:col-span-2">
            <FormField label="LangGraph API Key" id="agent-langgraph-key">
              <SecretInput
                id="agent-langgraph-key"
                value={form.langgraph_api_key ?? ''}
                onChange={(value) => updateField('langgraph_api_key', value)}
                className={inputClass}
                disabled={saving}
              />
            </FormField>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="OpenAI">
        <FormField label="OpenAPI Key" id="agent-openapi-key">
          <SecretInput
            id="agent-openapi-key"
            value={form.openapi_key ?? ''}
            onChange={(value) => updateField('openapi_key', value)}
            className={inputClass}
            disabled={saving}
          />
        </FormField>
      </SectionCard>

      <SectionCard title="Infrastructure">
        <div className="grid gap-5">
          <FormField label="Database URI" id="agent-database-uri">
            <input
              id="agent-database-uri"
              type="text"
              value={form.database_uri ?? ''}
              onChange={(e) => updateField('database_uri', e.target.value)}
              className={inputClass}
              disabled={saving}
            />
          </FormField>
          <FormField label="Redis URI" id="agent-redis-uri">
            <input
              id="agent-redis-uri"
              type="text"
              value={form.redis_uri ?? ''}
              onChange={(e) => updateField('redis_uri', e.target.value)}
              className={inputClass}
              disabled={saving}
            />
          </FormField>
          <FormField label="Secrets Dir" id="agent-secrets-dir">
            <input
              id="agent-secrets-dir"
              type="text"
              value={form.secrets_dir ?? ''}
              onChange={(e) => updateField('secrets_dir', e.target.value)}
              className={inputClass}
              disabled={saving}
            />
          </FormField>
          <FormField label="Calendar Provider" id="agent-calendar-provider">
            <input
              id="agent-calendar-provider"
              type="text"
              value={form.calendar_provider ?? ''}
              onChange={(e) => updateField('calendar_provider', e.target.value)}
              className={inputClass}
              disabled={saving}
            />
          </FormField>
        </div>
      </SectionCard>

      <SectionCard title="Square">
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <FormField label="Square Access Token" id="agent-square-token">
              <SecretInput
                id="agent-square-token"
                value={form.square_access_token ?? ''}
                onChange={(value) => updateField('square_access_token', value)}
                className={inputClass}
                disabled={saving}
              />
            </FormField>
          </div>
          <FormField label="Square Location ID" id="agent-square-location">
            <input
              id="agent-square-location"
              type="text"
              value={form.square_location_id ?? ''}
              onChange={(e) => updateField('square_location_id', e.target.value)}
              className={inputClass}
              disabled={saving}
            />
          </FormField>
          <FormField label="Square Service Variation ID" id="agent-square-variation">
            <input
              id="agent-square-variation"
              type="text"
              value={form.square_service_variation_id ?? ''}
              onChange={(e) => updateField('square_service_variation_id', e.target.value)}
              className={inputClass}
              disabled={saving}
            />
          </FormField>
          <FormField label="Square Service Variation Version" id="agent-square-version">
            <input
              id="agent-square-version"
              type="number"
              value={form.square_service_variation_version ?? ''}
              onChange={(e) =>
                updateField(
                  'square_service_variation_version',
                  e.target.value === '' ? null : Number(e.target.value),
                )
              }
              className={inputClass}
              disabled={saving}
            />
          </FormField>
          <FormField label="Square Team Member ID" id="agent-square-team">
            <input
              id="agent-square-team"
              type="text"
              value={form.square_team_member_id ?? ''}
              onChange={(e) => updateField('square_team_member_id', e.target.value)}
              className={inputClass}
              disabled={saving}
            />
          </FormField>
          <FormField label="Square Timezone" id="agent-square-timezone">
            <input
              id="agent-square-timezone"
              type="text"
              value={form.square_timezone ?? ''}
              onChange={(e) => updateField('square_timezone', e.target.value)}
              placeholder="America/Los_Angeles"
              className={inputClass}
              disabled={saving}
            />
          </FormField>
        </div>
      </SectionCard>

      <SectionCard title="Agent Behavior">
        <div className="grid gap-5 sm:grid-cols-2">
          <FormField label="Auto Book Scheduling" id="agent-auto-book-scheduling">
            <select
              id="agent-auto-book-scheduling"
              value={booleanSelectValue(form.auto_book_scheduling)}
              onChange={(e) => updateField('auto_book_scheduling', parseBooleanSelect(e.target.value))}
              className={inputClass}
              disabled={saving}
            >
              <option value="">Not set</option>
              <option value="true">True</option>
              <option value="false">False</option>
            </select>
          </FormField>
          <FormField label="Auto Respond Instruction" id="agent-auto-respond-instruction">
            <select
              id="agent-auto-respond-instruction"
              value={booleanSelectValue(form.auto_respond_instruction)}
              onChange={(e) => updateField('auto_respond_instruction', parseBooleanSelect(e.target.value))}
              className={inputClass}
              disabled={saving}
            >
              <option value="">Not set</option>
              <option value="true">True</option>
              <option value="false">False</option>
            </select>
          </FormField>
          <FormField label="Auto Respond Scheduling" id="agent-auto-respond-scheduling">
            <select
              id="agent-auto-respond-scheduling"
              value={booleanSelectValue(form.auto_respond_scheduling)}
              onChange={(e) => updateField('auto_respond_scheduling', parseBooleanSelect(e.target.value))}
              className={inputClass}
              disabled={saving}
            >
              <option value="">Not set</option>
              <option value="true">True</option>
              <option value="false">False</option>
            </select>
          </FormField>
          <FormField label="Environment" id="agent-environment">
            <input
              id="agent-environment"
              type="text"
              value={form.environment ?? ''}
              onChange={(e) => updateField('environment', e.target.value)}
              placeholder="production"
              className={inputClass}
              disabled={saving}
            />
          </FormField>
          <FormField label="Log Level" id="agent-log-level">
            <input
              id="agent-log-level"
              type="text"
              value={form.log_level ?? ''}
              onChange={(e) => updateField('log_level', e.target.value)}
              placeholder="INFO"
              className={inputClass}
              disabled={saving}
            />
          </FormField>
          <FormField label="Postgres Schema" id="agent-postgres-schema">
            <input
              id="agent-postgres-schema"
              type="text"
              value={form.postgres_schema ?? ''}
              onChange={(e) => updateField('postgres_schema', e.target.value)}
              className={inputClass}
              disabled={saving}
            />
          </FormField>
          <div className="sm:col-span-2">
            <FormField label="PGOPTIONS" id="agent-pgoptions">
              <input
                id="agent-pgoptions"
                type="text"
                value={form.pgoptions ?? ''}
                onChange={(e) => updateField('pgoptions', e.target.value)}
                placeholder='c search_path=kiteschool_assistant'
                className={inputClass}
                disabled={saving}
              />
            </FormField>
          </div>
        </div>
      </SectionCard>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saving || !form.user_id || !form.name.trim()}
          className="bg-navy-900 text-cream font-medium px-6 py-3 rounded-xl hover:bg-navy-800 transition-colors disabled:opacity-60"
        >
          {saving ? savingLabel : submitLabel}
        </button>
        <Link to="/admin" className="text-sm font-medium text-navy-600 hover:text-navy-900">
          Cancel
        </Link>
      </div>
    </form>
  )
}
