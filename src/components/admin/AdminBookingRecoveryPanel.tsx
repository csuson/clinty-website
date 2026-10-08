import { useCallback, useEffect, useState } from 'react'
import FormField from '../FormField'
import { SecretInput } from '../SecretField'
import { inputClass } from '../../constants/forms'
import {
  fetchAdminBookingRecoverySettings,
  updateAdminBookingRecoverySettings,
  type AdminBookingRecoverySettings,
} from '../../lib/admin'
import type { Profile } from '../../types/database'
import { CopyButton } from './adminTableUtils'

type RecoveryForm = {
  langgraph_url: string
  langgraph_api_key: string
  square_merchant_id: string
  webhook_secret: string
  enabled: boolean
}

const DEFAULT_FORM: RecoveryForm = {
  langgraph_url: '',
  langgraph_api_key: '',
  square_merchant_id: '',
  webhook_secret: '',
  enabled: true,
}

function settingsToForm(settings: AdminBookingRecoverySettings | null): RecoveryForm {
  if (!settings) return DEFAULT_FORM
  return {
    langgraph_url: settings.langgraph_url || settings.agent_langgraph_url || '',
    langgraph_api_key: '',
    square_merchant_id: settings.square_merchant_id ?? '',
    webhook_secret: '',
    enabled: settings.enabled !== false,
  }
}

type AdminBookingRecoveryPanelProps = {
  users: Profile[]
  onSaved?: () => void
}

export default function AdminBookingRecoveryPanel({ users, onSaved }: AdminBookingRecoveryPanelProps) {
  const [selectedUserId, setSelectedUserId] = useState('')
  const [form, setForm] = useState<RecoveryForm>(DEFAULT_FORM)
  const [settings, setSettings] = useState<AdminBookingRecoverySettings | null>(null)
  const [hasApiKey, setHasApiKey] = useState(false)
  const [hasSecret, setHasSecret] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const loadSettings = useCallback(async (userId: string) => {
    if (!userId) {
      setForm(DEFAULT_FORM)
      setSettings(null)
      setHasApiKey(false)
      setHasSecret(false)
      return
    }

    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const next = await fetchAdminBookingRecoverySettings(userId)
      setSettings(next)
      setForm(settingsToForm(next))
      setHasApiKey(next.has_langgraph_api_key)
      setHasSecret(next.has_webhook_secret)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load booking recovery settings')
      setForm(DEFAULT_FORM)
      setSettings(null)
      setHasApiKey(false)
      setHasSecret(false)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadSettings(selectedUserId)
  }, [selectedUserId, loadSettings])

  function updateField<K extends keyof RecoveryForm>(key: K, value: RecoveryForm[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  async function handleSave(event: React.FormEvent) {
    event.preventDefault()
    if (!selectedUserId) return

    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      const updated = await updateAdminBookingRecoverySettings({
        user_id: selectedUserId,
        langgraph_url: form.langgraph_url.trim(),
        langgraph_api_key: form.langgraph_api_key,
        square_merchant_id: form.square_merchant_id.trim(),
        webhook_secret: form.webhook_secret,
        enabled: form.enabled,
      })
      setSettings(updated)
      setForm(settingsToForm(updated))
      setHasApiKey(updated.has_langgraph_api_key)
      setHasSecret(updated.has_webhook_secret)
      setSuccess('Booking recovery settings saved.')
      onSaved?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save booking recovery settings')
    } finally {
      setSaving(false)
    }
  }

  async function handleRotateToken() {
    if (!selectedUserId) return
    if (!window.confirm('Rotate the Google webhook token? Update Apps Script RECOVERY_WEBHOOK_URL after.')) {
      return
    }

    setSaving(true)
    setError(null)
    setSuccess(null)
    try {
      const updated = await updateAdminBookingRecoverySettings({
        user_id: selectedUserId,
        rotate_token: true,
        langgraph_url: form.langgraph_url.trim() || undefined,
        enabled: form.enabled,
        square_merchant_id: form.square_merchant_id.trim() || undefined,
      })
      setSettings(updated)
      setForm(settingsToForm(updated))
      setSuccess('Webhook token rotated.')
      onSaved?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to rotate token')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="px-6 py-5 border-t border-navy-900/5 space-y-5">
      <div>
        <h3 className="text-sm font-semibold text-navy-900">Per-user recovery routing</h3>
        <p className="text-sm text-navy-600 mt-1">
          Maps Square <code className="text-xs">merchant_id</code> and Google Apps Script path tokens to this
          user&apos;s email-assistant. LangGraph URL syncs from Agent Settings when you save agent URL.
        </p>
      </div>

      <FormField label="User" id="admin-booking-recovery-user">
        <select
          id="admin-booking-recovery-user"
          value={selectedUserId}
          onChange={(event) => setSelectedUserId(event.target.value)}
          className={inputClass}
          disabled={saving}
        >
          <option value="">Select a user…</option>
          {users.map((user) => (
            <option key={user.id} value={user.id}>
              {user.email || user.id}
            </option>
          ))}
        </select>
      </FormField>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      ) : null}
      {success ? (
        <div className="rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-sm text-teal-700">
          {success}
        </div>
      ) : null}

      {selectedUserId && loading ? (
        <p className="text-sm text-navy-600">Loading…</p>
      ) : selectedUserId ? (
        <form onSubmit={handleSave} className="space-y-5 rounded-xl border border-navy-900/5 p-4">
          <label className="flex items-center gap-2 text-sm text-navy-900">
            <input
              type="checkbox"
              checked={form.enabled}
              onChange={(event) => updateField('enabled', event.target.checked)}
              disabled={saving}
            />
            Enabled
          </label>

          <FormField
            label="LangGraph URL"
            id="admin-booking-recovery-langgraph-url"
            hint="email-assistant base URL (usually agent_settings.url)"
          >
            <input
              id="admin-booking-recovery-langgraph-url"
              type="url"
              value={form.langgraph_url}
              onChange={(event) => updateField('langgraph_url', event.target.value)}
              placeholder="https://email-assistant-….onrender.com"
              className={inputClass}
              disabled={saving}
            />
          </FormField>

          <FormField
            label="LangGraph API key"
            id="admin-booking-recovery-api-key"
            hint="Optional X-Api-Key forwarded by the gateway"
          >
            {hasApiKey ? (
              <p className="text-xs text-navy-500 mb-2">Leave blank to keep the saved key.</p>
            ) : null}
            <SecretInput
              id="admin-booking-recovery-api-key"
              value={form.langgraph_api_key}
              onChange={(value) => updateField('langgraph_api_key', value)}
              placeholder={hasApiKey ? '••••••••••••••••' : 'clinty_sk_…'}
              className={inputClass}
              disabled={saving}
            />
          </FormField>

          <FormField
            label="Square merchant ID"
            id="admin-booking-recovery-merchant"
            hint="Auto-filled on Square OAuth; override if needed"
          >
            <input
              id="admin-booking-recovery-merchant"
              type="text"
              value={form.square_merchant_id}
              onChange={(event) => updateField('square_merchant_id', event.target.value)}
              className={inputClass}
              disabled={saving}
            />
          </FormField>

          <FormField
            label="Webhook secret"
            id="admin-booking-recovery-secret"
            hint="Optional X-Webhook-Secret for this tenant"
          >
            {hasSecret ? (
              <p className="text-xs text-navy-500 mb-2">Leave blank to keep the saved secret.</p>
            ) : null}
            <SecretInput
              id="admin-booking-recovery-secret"
              value={form.webhook_secret}
              onChange={(value) => updateField('webhook_secret', value)}
              placeholder={hasSecret ? '••••••••••••••••' : ''}
              className={inputClass}
              disabled={saving}
            />
          </FormField>

          {settings?.webhook_token ? (
            <div className="space-y-2 text-sm">
              <p className="font-medium text-navy-900">Webhook token</p>
              <div className="flex items-start gap-2 flex-wrap">
                <code className="text-xs break-all text-navy-800">{settings.webhook_token}</code>
                <CopyButton value={settings.webhook_token} label="token" />
              </div>
            </div>
          ) : null}

          {settings?.square_webhook_url ? (
            <div className="space-y-2 text-sm">
              <p className="font-medium text-navy-900">Square webhook URL</p>
              <div className="flex items-start gap-2 flex-wrap">
                <code className="text-xs break-all text-navy-800">{settings.square_webhook_url}</code>
                <CopyButton value={settings.square_webhook_url} label="Square URL" />
              </div>
            </div>
          ) : (
            <p className="text-xs text-amber-800">
              Set website <code className="text-xs">booking_recovery_gateway_url</code> to show copyable URLs.
            </p>
          )}

          {settings?.google_webhook_url ? (
            <div className="space-y-2 text-sm">
              <p className="font-medium text-navy-900">Google Apps Script URL</p>
              <div className="flex items-start gap-2 flex-wrap">
                <code className="text-xs break-all text-navy-800">{settings.google_webhook_url}</code>
                <CopyButton value={settings.google_webhook_url} label="Google URL" />
              </div>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center bg-navy-900 text-cream font-medium px-5 py-2.5 rounded-xl hover:bg-navy-800 disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button
              type="button"
              onClick={() => void handleRotateToken()}
              disabled={saving}
              className="inline-flex items-center border border-navy-900/15 text-navy-900 font-medium px-5 py-2.5 rounded-xl hover:bg-navy-900/5 disabled:opacity-60"
            >
              Rotate token
            </button>
          </div>
        </form>
      ) : null}
    </div>
  )
}
