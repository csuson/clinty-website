import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AdminAgentSettingsForm, { emptyAgentSettingsForm } from '../components/AdminAgentSettingsForm'
import { createAgentSettings, fetchAdminData, type AdminApiKey, type CreateAgentSettingsInput } from '../lib/admin'

export default function AdminAgentSettingsNew() {
  const navigate = useNavigate()
  const [form, setForm] = useState<CreateAgentSettingsInput>(emptyAgentSettingsForm)
  const [apiKeys, setApiKeys] = useState<AdminApiKey[]>([])
  const [users, setUsers] = useState<{ id: string; email: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadOptions = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const data = await fetchAdminData()
      setUsers(data.users.map((user) => ({ id: user.id, email: user.email })))
      setApiKeys(data.apiKeys.filter((key) => !key.revoked_at))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load admin data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadOptions()
  }, [loadOptions])

  async function handleSubmit(payload: CreateAgentSettingsInput) {
    setSaving(true)
    setError(null)

    try {
      await createAgentSettings(payload)
      navigate('/admin')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create agent settings')
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
            <h1 className="font-serif text-3xl md:text-4xl text-navy-900 mb-1">New Agent Settings</h1>
            <p className="text-navy-600 text-sm">Create a runtime configuration entry for a user.</p>
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
          <div className="text-navy-600 text-sm">Loading form options…</div>
        ) : (
          <AdminAgentSettingsForm
            form={form}
            setForm={setForm}
            users={users}
            apiKeys={apiKeys}
            saving={saving}
            submitLabel="Create Agent Settings"
            savingLabel="Creating…"
            onSubmit={handleSubmit}
          />
        )}
      </div>
    </div>
  )
}
