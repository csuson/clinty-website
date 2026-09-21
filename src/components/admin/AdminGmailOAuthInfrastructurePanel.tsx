import { useEffect, useState } from 'react'
import FormField from '../FormField'
import { SecretInput } from '../SecretField'
import { inputClass, textareaClass } from '../../constants/forms'
import {
  buildGmailSecretInstalledJson,
  parseGoogleOAuthSecretsJson,
} from '../../lib/gmail/parseOAuthSecrets'
import { updateWebsiteInfrastructure, type AdminWebsiteSettings } from '../../lib/admin'

type GmailOAuthForm = {
  google_client_id: string
  google_client_secret: string
  secretsJsonPaste: string
}

function settingsToForm(settings?: AdminWebsiteSettings | null): GmailOAuthForm {
  return {
    google_client_id: settings?.google_client_id?.trim() ?? '',
    google_client_secret: '',
    secretsJsonPaste: '',
  }
}

type AdminGmailOAuthInfrastructurePanelProps = {
  settings?: AdminWebsiteSettings | null
  onSaved?: () => void
}

export default function AdminGmailOAuthInfrastructurePanel({
  settings,
  onSaved,
}: AdminGmailOAuthInfrastructurePanelProps) {
  const [form, setForm] = useState<GmailOAuthForm>(() => settingsToForm(settings))
  const [projectId, setProjectId] = useState('')
  const [hasStoredSecret, setHasStoredSecret] = useState(
    () => Boolean(settings?.google_client_secret?.trim()),
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    setForm(settingsToForm(settings))
    setHasStoredSecret(Boolean(settings?.google_client_secret?.trim()))
  }, [settings])

  async function handleSave(event: React.FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(null)

    let clientId = form.google_client_id.trim()
    let clientSecret = form.google_client_secret.trim()

    if (form.secretsJsonPaste.trim()) {
      const parsed = parseGoogleOAuthSecretsJson(form.secretsJsonPaste)
      if (!parsed) {
        setError('Fix the pasted secrets.json before saving.')
        setSaving(false)
        return
      }
      clientId = parsed.clientId
      clientSecret = parsed.clientSecret
    }

    if (!clientId) {
      setError('Google client ID is required.')
      setSaving(false)
      return
    }
    if (!clientSecret && !hasStoredSecret) {
      setError('Google client secret is required (paste secrets.json or enter the secret).')
      setSaving(false)
      return
    }

    try {
      const updated = await updateWebsiteInfrastructure({
        google_client_id: clientId,
        google_client_secret: clientSecret,
      })
      setForm(settingsToForm(updated))
      setHasStoredSecret(Boolean(updated.google_client_secret?.trim()))
      const gmailSecretPreview = buildGmailSecretInstalledJson(
        updated.google_client_id,
        updated.google_client_secret,
        projectId,
      )
      setSuccess(
        `Gmail OAuth client saved. agent-settings GMAIL_SECRET uses this installed JSON shape (${gmailSecretPreview.length} chars).`,
      )
      onSaved?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save Gmail OAuth settings')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="px-6 py-5 border-t border-navy-900/5">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-navy-900">Gmail OAuth client</h3>
        <p className="text-sm text-navy-600 mt-1">
          Stored in <code className="text-xs">website_infrastructure</code> (admin-only). Values are
          exported to the email assistant as <code className="text-xs">GMAIL_SECRET</code> (installed
          JSON, same as <code className="text-xs">.secrets/secrets.json</code>).
        </p>
      </div>

      {error ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}
      {success ? (
        <div className="mb-4 rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-sm text-teal-800">
          {success}
        </div>
      ) : null}

      <form onSubmit={handleSave} className="space-y-4 max-w-2xl">
        <FormField
          label="Paste secrets.json"
          id="google-secrets-json"
          hint="Paste the full JSON from Google Cloud (Desktop OAuth client). Client ID and secret fields below will fill automatically."
        >
          <textarea
            id="google-secrets-json"
            className={textareaClass}
            rows={6}
            value={form.secretsJsonPaste}
            onChange={(e) => {
              const value = e.target.value
              const parsed = parseGoogleOAuthSecretsJson(value)
              if (parsed) {
                setError(null)
                setProjectId(parsed.projectId)
                setForm({
                  secretsJsonPaste: value,
                  google_client_id: parsed.clientId,
                  google_client_secret: parsed.clientSecret,
                })
              } else {
                setForm((c) => ({ ...c, secretsJsonPaste: value }))
              }
            }}
            spellCheck={false}
            autoComplete="off"
            placeholder='{"installed":{"client_id":"...","client_secret":"...",...}}'
          />
        </FormField>

        <FormField label="Google client ID" id="google-client-id">
          <input
            id="google-client-id"
            type="text"
            className={inputClass}
            value={form.google_client_id}
            onChange={(e) => setForm((c) => ({ ...c, google_client_id: e.target.value }))}
            autoComplete="off"
            placeholder="Same as VITE_GOOGLE_CLIENT_ID"
          />
        </FormField>

        <FormField
          label="Google client secret"
          id="google-client-secret"
          hint={
            hasStoredSecret
              ? 'Leave blank to keep the stored secret when not pasting secrets.json.'
              : 'Filled from secrets.json paste or enter manually'
          }
        >
          <SecretInput
            id="google-client-secret"
            value={form.google_client_secret}
            onChange={(value) => setForm((c) => ({ ...c, google_client_secret: value }))}
            placeholder={hasStoredSecret ? '••••••••' : ''}
          />
        </FormField>

        <button
          type="submit"
          disabled={saving}
          className="text-sm font-medium bg-navy-900 text-cream px-4 py-2 rounded-lg hover:bg-navy-800 transition-colors disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Save Gmail OAuth client'}
        </button>
      </form>
    </div>
  )
}
