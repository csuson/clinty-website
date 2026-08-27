import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import AdminAgentSettingsForm, { emptyAgentSettingsForm } from '../components/AdminAgentSettingsForm'
import {
  fetchAdminData,
  updateAgentSettings,
  type AdminAgentSettings,
  type AdminApiKey,
  type CreateAgentSettingsInput,
} from '../lib/admin'

function agentSettingsToForm(settings: AdminAgentSettings): CreateAgentSettingsInput {
  return {
    user_id: settings.user_id,
    name: settings.name,
    clinty_api_key_id: settings.clinty_api_key_id ?? '',
    langgraph_api_key: settings.langgraph_api_key ?? '',
    url: settings.url ?? '',
    graph_id: settings.graph_id ?? '',
    openapi_key: settings.openapi_key ?? '',
    database_uri: settings.database_uri ?? '',
    redis_uri: settings.redis_uri ?? '',
    secrets_dir: settings.secrets_dir ?? '',
    calendar_provider: settings.calendar_provider ?? '',
    square_access_token: settings.square_access_token ?? '',
    square_location_id: settings.square_location_id ?? '',
    square_service_variation_id: settings.square_service_variation_id ?? '',
    square_service_variation_version: settings.square_service_variation_version,
    square_team_member_id: settings.square_team_member_id ?? '',
    square_timezone: settings.square_timezone ?? '',
    auto_book_scheduling: settings.auto_book_scheduling,
    auto_respond_instruction: settings.auto_respond_instruction,
    auto_respond_scheduling: settings.auto_respond_scheduling,
    environment: settings.environment ?? '',
    log_level: settings.log_level ?? '',
    pgoptions: settings.pgoptions ?? '',
    postgres_schema: settings.postgres_schema ?? '',
  }
}

export default function AdminAgentSettingsEdit() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [form, setForm] = useState<CreateAgentSettingsInput>(emptyAgentSettingsForm)
  const [apiKeys, setApiKeys] = useState<AdminApiKey[]>([])
  const [users, setUsers] = useState<{ id: string; email: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)

  const loadData = useCallback(async () => {
    if (!id) {
      setNotFound(true)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    setNotFound(false)

    try {
      const data = await fetchAdminData()
      setUsers(data.users.map((user) => ({ id: user.id, email: user.email })))

      const settings = data.agentSettings.find((entry) => entry.id === id)
      if (!settings) {
        setNotFound(true)
        return
      }

      setForm(agentSettingsToForm(settings))
      setApiKeys(
        data.apiKeys.filter(
          (key) => !key.revoked_at || key.id === settings.clinty_api_key_id,
        ),
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load agent settings')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    loadData()
  }, [loadData])

  async function handleSubmit(payload: CreateAgentSettingsInput) {
    if (!id) return

    setSaving(true)
    setError(null)

    try {
      await updateAgentSettings(id, payload)
      navigate('/admin')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update agent settings')
      throw err
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="pt-28 pb-24 px-6">
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-teal-600 mb-1">Admin</p>
            <h1 className="font-serif text-3xl md:text-4xl text-navy-900 mb-1">Edit Agent Settings</h1>
            <p className="text-navy-600 text-sm">Update a runtime configuration entry.</p>
          </div>
          <Link
            to="/admin"
            className="text-sm font-medium border border-navy-900/15 text-navy-900 px-4 py-2 rounded-lg hover:bg-navy-900/5 transition-colors self-start"
          >
            Back to Dashboard
          </Link>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-navy-600 text-sm">Loading agent settings…</div>
        ) : notFound ? (
          <div className="rounded-xl border border-navy-900/10 bg-cream px-4 py-3 text-sm text-navy-700">
            Agent settings not found.{' '}
            <Link to="/admin" className="text-teal-600 hover:underline">
              Return to dashboard
            </Link>
          </div>
        ) : (
          <AdminAgentSettingsForm
            form={form}
            setForm={setForm}
            users={users}
            apiKeys={apiKeys}
            saving={saving}
            submitLabel="Save Changes"
            savingLabel="Saving…"
            onSubmit={handleSubmit}
          />
        )}
      </div>
    </div>
  )
}
