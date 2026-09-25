import { useCallback, useEffect, useState } from 'react'
import FormField from '../FormField'
import { SecretInput } from '../SecretField'
import { inputClass } from '../../constants/forms'
import {
  fetchAdminWhatsAppInfrastructure,
  updateAdminWhatsAppInfrastructure,
  type AdminWhatsAppInfrastructure,
} from '../../lib/admin'
import type { Profile } from '../../types/database'

type InfrastructureForm = {
  gateway_url: string
  gateway_api_key: string
  gateway_debug: string
  gateway_auth_backend: string
  gateway_auth_bucket: string
  gateway_auth_storage_prefix: string
  gateway_auth_dir: string
  gateway_langgraph_url: string
}

const DEFAULT_FORM: InfrastructureForm = {
  gateway_url: '',
  gateway_api_key: '',
  gateway_debug: '1',
  gateway_auth_backend: 'supabase',
  gateway_auth_bucket: 'whatsapp-web-auth',
  gateway_auth_storage_prefix: 'default',
  gateway_auth_dir: '/tmp/whatsapp-web-auth',
  gateway_langgraph_url: '',
}

function settingsToForm(settings: AdminWhatsAppInfrastructure | null): InfrastructureForm {
  if (!settings) return DEFAULT_FORM

  return {
    gateway_url: settings.gateway_url ?? settings.resolved.gatewayUrl ?? '',
    gateway_api_key: '',
    gateway_debug: settings.gateway_debug ?? settings.resolved.debug,
    gateway_auth_backend: settings.gateway_auth_backend ?? settings.resolved.authBackend,
    gateway_auth_bucket: settings.gateway_auth_bucket ?? settings.resolved.authBucket,
    gateway_auth_storage_prefix:
      settings.gateway_auth_storage_prefix ?? settings.resolved.authStoragePrefix,
    gateway_auth_dir: settings.gateway_auth_dir ?? settings.resolved.authDir,
    gateway_langgraph_url:
      settings.gateway_langgraph_url ?? settings.resolved.langgraphUrl ?? '',
  }
}

type AdminWhatsAppInfrastructurePanelProps = {
  users: Profile[]
  onSaved?: () => void
}

export default function AdminWhatsAppInfrastructurePanel({
  users,
  onSaved,
}: AdminWhatsAppInfrastructurePanelProps) {
  const [selectedUserId, setSelectedUserId] = useState('')
  const [form, setForm] = useState<InfrastructureForm>(DEFAULT_FORM)
  const [hasStoredApiKey, setHasStoredApiKey] = useState(false)
  const [usesClintyApiKey, setUsesClintyApiKey] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const loadSettings = useCallback(async (userId: string) => {
    if (!userId) {
      setForm(DEFAULT_FORM)
      setHasStoredApiKey(false)
      setUsesClintyApiKey(false)
      return
    }

    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const settings = await fetchAdminWhatsAppInfrastructure(userId)
      setForm(settingsToForm(settings))
      setHasStoredApiKey(settings.has_gateway_api_key)
      setUsesClintyApiKey(settings.uses_clinty_api_key)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load WhatsApp infrastructure')
      setForm(DEFAULT_FORM)
      setHasStoredApiKey(false)
      setUsesClintyApiKey(false)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadSettings(selectedUserId)
  }, [selectedUserId, loadSettings])

  function updateField<K extends keyof InfrastructureForm>(key: K, value: InfrastructureForm[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  async function handleSave(event: React.FormEvent) {
    event.preventDefault()
    if (!selectedUserId) {
      setError('Select a user first.')
      return
    }

    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      const updated = await updateAdminWhatsAppInfrastructure({
        user_id: selectedUserId,
        gateway_url: form.gateway_url.trim(),
        gateway_api_key: form.gateway_api_key.trim(),
        gateway_debug: form.gateway_debug.trim(),
        gateway_auth_backend: form.gateway_auth_backend.trim(),
        gateway_auth_bucket: form.gateway_auth_bucket.trim(),
        gateway_auth_storage_prefix: form.gateway_auth_storage_prefix.trim(),
        gateway_auth_dir: form.gateway_auth_dir.trim(),
        gateway_langgraph_url: form.gateway_langgraph_url.trim(),
      })
      setForm(settingsToForm(updated))
      setHasStoredApiKey(updated.has_gateway_api_key)
      setUsesClintyApiKey(updated.uses_clinty_api_key)
      setSuccess('WhatsApp infrastructure saved for this user.')
      onSaved?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save WhatsApp infrastructure')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="px-6 py-5 border-b border-navy-900/5 space-y-5">
      <div>
        <h3 className="text-sm font-semibold text-navy-900 mb-1">Per-user gateway infrastructure</h3>
        <p className="text-sm text-navy-600">
          Configure the Baileys gateway URL, LangGraph URL (inbound target for the gateway), API key, and auth
          storage for each account. Users link their phone in Integrations after these values are saved. Empty fields
          fall back to Edge Function secrets.
        </p>
      </div>

      <FormField label="User" id="admin-whatsapp-user">
        <select
          id="admin-whatsapp-user"
          value={selectedUserId}
          onChange={(event) => setSelectedUserId(event.target.value)}
          className={inputClass}
          disabled={saving || loading}
        >
          <option value="">Select a user…</option>
          {users.map((user) => (
            <option key={user.id} value={user.id}>
              {user.email ?? user.id}
            </option>
          ))}
        </select>
      </FormField>

      {!selectedUserId ? (
        <p className="text-sm text-navy-500">Choose a user to view or edit their WhatsApp gateway settings.</p>
      ) : loading ? (
        <p className="text-sm text-navy-500">Loading…</p>
      ) : (
        <form onSubmit={handleSave} className="space-y-4">
          {error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
          ) : null}
          {success ? (
            <div className="rounded-xl border border-teal-400/20 bg-teal-400/10 px-4 py-3 text-sm text-teal-700">
              {success}
            </div>
          ) : null}

          <div className="rounded-xl border border-navy-900/5 p-4 space-y-5">
            <p className="text-sm text-navy-600">
              For multi-tenant WhatsApp, set Gateway URL to the shared service
              (e.g. <code className="text-xs">https://whatsapp-web-gateway-70je.onrender.com</code>).
              LangGraph URL should match this user&apos;s Agent Settings URL so inbound messages
              route to the right assistant.
            </p>
            <FormField
              label="Gateway URL"
              id="admin-whatsapp-gateway-url"
              hint="WHATSAPP_WEB_GATEWAY_URL — shared multitenant gateway for most users"
            >
              <input
                id="admin-whatsapp-gateway-url"
                type="url"
                value={form.gateway_url}
                onChange={(event) => updateField('gateway_url', event.target.value)}
                placeholder="https://whatsapp-web-gateway-70je.onrender.com"
                className={inputClass}
                disabled={saving}
              />
            </FormField>

            <FormField
            label="LangGraph URL"
            id="admin-whatsapp-langgraph-url"
            hint="WHATSAPP_WEB_LANGGRAPH_URL — usually this user’s agent_settings.url"
          >
            <input
              id="admin-whatsapp-langgraph-url"
              type="url"
              value={form.gateway_langgraph_url}
              onChange={(event) => updateField('gateway_langgraph_url', event.target.value)}
              placeholder="https://your-email-assistant.onrender.com"
              className={inputClass}
              disabled={saving}
            />
          </FormField>

          <FormField label="Login API key" id="admin-whatsapp-login-api-key" hint="WHATSAPP_WEB_LOGIN_API_KEY">
              {hasStoredApiKey ? (
                <p className="text-xs text-navy-500 mb-2">Leave blank to keep the saved gateway API key.</p>
              ) : usesClintyApiKey ? (
                <p className="text-xs text-navy-500 mb-2">
                  No dedicated gateway key saved — this user&apos;s Clinty API key will be used until you set one
                  here.
                </p>
              ) : null}
              <SecretInput
                id="admin-whatsapp-login-api-key"
                value={form.gateway_api_key}
                onChange={(value) => updateField('gateway_api_key', value)}
                placeholder={hasStoredApiKey ? '••••••••••••••••' : 'clinty_sk_… or gateway key'}
                className={inputClass}
                disabled={saving}
              />
            </FormField>

            <FormField label="Debug" id="admin-whatsapp-debug" hint="WHATSAPP_WEB_DEBUG">
              <input
                id="admin-whatsapp-debug"
                type="text"
                value={form.gateway_debug}
                onChange={(event) => updateField('gateway_debug', event.target.value)}
                className={inputClass}
                disabled={saving}
              />
            </FormField>

            <FormField label="Auth backend" id="admin-whatsapp-auth-backend" hint="WHATSAPP_WEB_AUTH_BACKEND">
              <input
                id="admin-whatsapp-auth-backend"
                type="text"
                value={form.gateway_auth_backend}
                onChange={(event) => updateField('gateway_auth_backend', event.target.value)}
                className={inputClass}
                disabled={saving}
              />
            </FormField>

            <FormField label="Auth bucket" id="admin-whatsapp-auth-bucket" hint="WHATSAPP_WEB_AUTH_BUCKET">
              <input
                id="admin-whatsapp-auth-bucket"
                type="text"
                value={form.gateway_auth_bucket}
                onChange={(event) => updateField('gateway_auth_bucket', event.target.value)}
                className={inputClass}
                disabled={saving}
              />
            </FormField>

            <FormField
              label="Auth storage prefix"
              id="admin-whatsapp-auth-storage-prefix"
              hint="WHATSAPP_WEB_AUTH_STORAGE_PREFIX"
            >
              <input
                id="admin-whatsapp-auth-storage-prefix"
                type="text"
                value={form.gateway_auth_storage_prefix}
                onChange={(event) => updateField('gateway_auth_storage_prefix', event.target.value)}
                className={inputClass}
                disabled={saving}
              />
            </FormField>

            <FormField label="Auth directory" id="admin-whatsapp-auth-dir" hint="WHATSAPP_WEB_AUTH_DIR">
              <input
                id="admin-whatsapp-auth-dir"
                type="text"
                value={form.gateway_auth_dir}
                onChange={(event) => updateField('gateway_auth_dir', event.target.value)}
                className={inputClass}
                disabled={saving}
              />
            </FormField>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center text-sm font-medium bg-navy-900 text-cream px-4 py-2 rounded-lg hover:bg-navy-800 transition-colors disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save WhatsApp infrastructure'}
          </button>
        </form>
      )}
    </div>
  )
}
