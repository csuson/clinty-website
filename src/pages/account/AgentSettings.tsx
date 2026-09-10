import { useEffect, useState, type FormEvent } from 'react'
import AgentBehaviorFields, {
  defaultAgentBehaviorSettings,
  type AgentBehaviorSettings,
} from '../../components/AgentBehaviorFields'
import { useAuth } from '../../context/AuthContext'
import {
  fetchUserAgentBehavior,
  saveUserAgentBehavior,
} from '../../lib/userAgentSettings'

function Alert({ type, message }: { type: 'error' | 'success'; message: string }) {
  const styles =
    type === 'error'
      ? 'border-red-200 bg-red-50 text-red-700'
      : 'border-teal-200 bg-teal-50 text-teal-800'

  return <div className={`rounded-xl border px-4 py-3 text-sm ${styles}`}>{message}</div>
}

export default function AgentSettings() {
  const { user } = useAuth()
  const [recordId, setRecordId] = useState<string | null>(null)
  const [settings, setSettings] = useState<AgentBehaviorSettings>(defaultAgentBehaviorSettings())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) {
      setLoading(false)
      return
    }

    fetchUserAgentBehavior(user.id)
      .then((record) => {
        setRecordId(record.id)
        setSettings(record.settings)
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to load agent settings')
      })
      .finally(() => setLoading(false))
  }, [user])

  function updateField<K extends keyof AgentBehaviorSettings>(
    field: K,
    value: AgentBehaviorSettings[K],
  ) {
    setSettings((current) => ({ ...current, [field]: value }))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!user) return

    setSaving(true)
    setMessage(null)
    setError(null)

    try {
      const saved = await saveUserAgentBehavior(user.id, recordId, settings)
      setRecordId(saved.id)
      setMessage(
        saved.assistantReloaded
          ? 'Agent settings saved. Your assistant reloaded the new behavior.'
          : saved.assistantReloadError
            ? `Agent settings saved. Assistant reload: ${saved.assistantReloadError}`
            : 'Agent settings saved.',
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save agent settings')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <section className="bg-white rounded-2xl border border-navy-900/5 p-8 shadow-sm">
        <p className="text-sm text-navy-600">Loading agent settings…</p>
      </section>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <section className="bg-white rounded-2xl border border-navy-900/5 p-8 shadow-sm">
        <h2 className="text-lg font-semibold text-navy-900 mb-1">Agent Settings</h2>
        <p className="text-sm text-navy-600 mb-6">
          Control how your AI agent handles email and WhatsApp — auto-replies, scheduling, and personal
          messages. Thread caps and daily message limits are set by Clinty admin.
        </p>

        {error ? <Alert type="error" message={error} /> : null}
        {message ? <div className="mb-6"><Alert type="success" message={message} /></div> : null}

        <AgentBehaviorFields
          settings={settings}
          onChange={updateField}
          disabled={saving}
          limitsEditable={false}
          idPrefix="account-agent"
        />

        <div className="flex flex-col sm:flex-row gap-3 mt-8">
          <button
            type="submit"
            disabled={saving}
            className="bg-navy-900 text-cream font-medium px-6 py-3 rounded-xl hover:bg-navy-800 transition-colors disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save Agent Settings'}
          </button>
        </div>
      </section>
    </form>
  )
}
