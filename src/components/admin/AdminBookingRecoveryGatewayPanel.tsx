import { useEffect, useState } from 'react'
import FormField from '../FormField'
import { SecretInput } from '../SecretField'
import { inputClass, textareaClass } from '../../constants/forms'
import { getWixRedirectUri } from '../../constants/wix'
import { updateWebsiteInfrastructure, type AdminWebsiteSettings } from '../../lib/admin'

type GatewayForm = {
  booking_recovery_gateway_url: string
  booking_recovery_google_gateway_url: string
  booking_recovery_apps_script_web_app_url: string
  booking_recovery_apps_script_connect_secret: string
  wix_app_id: string
  wix_app_secret: string
  wix_webhook_public_key: string
  wix_app_install_url: string
}

function settingsToForm(settings?: AdminWebsiteSettings | null): GatewayForm {
  return {
    booking_recovery_gateway_url: settings?.booking_recovery_gateway_url?.trim() ?? '',
    booking_recovery_google_gateway_url: settings?.booking_recovery_google_gateway_url?.trim() ?? '',
    booking_recovery_apps_script_web_app_url:
      settings?.booking_recovery_apps_script_web_app_url?.trim() ?? '',
    booking_recovery_apps_script_connect_secret: '',
    wix_app_id: settings?.wix_app_id?.trim() ?? '',
    wix_app_secret: '',
    wix_webhook_public_key: '',
    wix_app_install_url: settings?.wix_app_install_url?.trim() ?? '',
  }
}

type AdminBookingRecoveryGatewayPanelProps = {
  settings?: AdminWebsiteSettings | null
  onSaved?: (websiteSettings: AdminWebsiteSettings) => void
}

export default function AdminBookingRecoveryGatewayPanel({
  settings,
  onSaved,
}: AdminBookingRecoveryGatewayPanelProps) {
  const [form, setForm] = useState<GatewayForm>(() => settingsToForm(settings))
  const [hasConnectSecret, setHasConnectSecret] = useState(
    () => settings?.has_booking_recovery_apps_script_connect_secret === true,
  )
  const [hasWixAppSecret, setHasWixAppSecret] = useState(
    () => settings?.has_wix_app_secret === true,
  )
  const [hasWixWebhookKey, setHasWixWebhookKey] = useState(
    () => settings?.has_wix_webhook_public_key === true,
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [copiedRedirect, setCopiedRedirect] = useState(false)

  useEffect(() => {
    setForm(settingsToForm(settings))
    setHasConnectSecret(settings?.has_booking_recovery_apps_script_connect_secret === true)
    setHasWixAppSecret(settings?.has_wix_app_secret === true)
    setHasWixWebhookKey(settings?.has_wix_webhook_public_key === true)
  }, [settings])

  function updateField<K extends keyof GatewayForm>(key: K, value: GatewayForm[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  async function handleSave(event: React.FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      const updated = await updateWebsiteInfrastructure({
        booking_recovery_gateway_url: form.booking_recovery_gateway_url.trim(),
        booking_recovery_google_gateway_url: form.booking_recovery_google_gateway_url.trim(),
        booking_recovery_apps_script_web_app_url: form.booking_recovery_apps_script_web_app_url.trim(),
        booking_recovery_apps_script_connect_secret:
          form.booking_recovery_apps_script_connect_secret,
        wix_app_id: form.wix_app_id.trim(),
        wix_app_secret: form.wix_app_secret,
        wix_webhook_public_key: form.wix_webhook_public_key,
        wix_app_install_url: form.wix_app_install_url.trim(),
      })
      setForm(settingsToForm(updated))
      setHasConnectSecret(updated.has_booking_recovery_apps_script_connect_secret === true)
      setHasWixAppSecret(updated.has_wix_app_secret === true)
      setHasWixWebhookKey(updated.has_wix_webhook_public_key === true)
      setSuccess('Booking recovery gateway and Wix app settings saved.')
      onSaved?.(updated)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save gateway settings')
    } finally {
      setSaving(false)
    }
  }

  const redirectUri =
    typeof window !== 'undefined' ? getWixRedirectUri() : '/account/integrations/wix/callback'
  const gatewayBase = form.booking_recovery_gateway_url.replace(/\/$/, '')
  const wixWebhookPreview = gatewayBase ? `${gatewayBase}/v1/wix` : ''

  return (
    <div className="px-6 py-5 border-t border-navy-900/5">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-navy-900">Booking recovery gateways</h3>
        <p className="text-sm text-navy-600 mt-1">
          Square and Wix use the <strong>full</strong> gateway. Apps Script cancel POSTs use the{' '}
          <strong>Google-only</strong> gateway (falls back to the full URL if empty). Operators connect
          Google Calendar via the shared Apps Script Web App — no per-tenant script projects.
        </p>
      </div>

      {error ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}
      {success ? (
        <div className="mb-4 rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-sm text-teal-700">
          {success}
        </div>
      ) : null}

      <form onSubmit={handleSave} className="space-y-4 max-w-2xl">
        <FormField
          label="Full gateway base URL (Square / Wix)"
          id="booking-recovery-gateway-url"
          hint="BOOKING_RECOVERY_GATEWAY_URL — paths /v1/square and /v1/wix"
        >
          <input
            id="booking-recovery-gateway-url"
            type="url"
            value={form.booking_recovery_gateway_url}
            onChange={(event) => updateField('booking_recovery_gateway_url', event.target.value)}
            placeholder="https://booking-recovery-gateway.onrender.com"
            className={inputClass}
            disabled={saving}
          />
        </FormField>

        <FormField
          label="Google-only gateway base URL (Apps Script POSTs)"
          id="booking-recovery-google-gateway-url"
          hint="BOOKING_RECOVERY_GOOGLE_GATEWAY_URL — path /v1/google/{token}. Leave empty to reuse the full gateway."
        >
          <input
            id="booking-recovery-google-gateway-url"
            type="url"
            value={form.booking_recovery_google_gateway_url}
            onChange={(event) =>
              updateField('booking_recovery_google_gateway_url', event.target.value)
            }
            placeholder="https://booking-recovery-google-gateway.onrender.com"
            className={inputClass}
            disabled={saving}
          />
        </FormField>

        <FormField
          label="Apps Script Web App URL"
          id="booking-recovery-apps-script-web-app-url"
          hint="Deploy → Manage deployments → Web app URL ending in /exec. Use …/macros/s/…/exec (not /macros/u/1/s/…, not the script editor /d/…/edit link)."
        >
          <input
            id="booking-recovery-apps-script-web-app-url"
            type="url"
            value={form.booking_recovery_apps_script_web_app_url}
            onChange={(event) =>
              updateField('booking_recovery_apps_script_web_app_url', event.target.value)
            }
            placeholder="https://script.google.com/macros/s/…/exec"
            className={inputClass}
            disabled={saving}
          />
        </FormField>

        <FormField
          label="Apps Script connect secret"
          id="booking-recovery-apps-script-connect-secret"
          hint="Must match Script property BRIDGE_CONNECT_SECRET. Leave blank to keep the saved secret."
        >
          {hasConnectSecret ? (
            <p className="text-xs text-navy-500 mb-2">A connect secret is already saved.</p>
          ) : null}
          <SecretInput
            id="booking-recovery-apps-script-connect-secret"
            value={form.booking_recovery_apps_script_connect_secret}
            onChange={(value) =>
              updateField('booking_recovery_apps_script_connect_secret', value)
            }
            placeholder={hasConnectSecret ? '••••••••••••••••' : 'long random secret'}
            className={inputClass}
            disabled={saving}
          />
        </FormField>

        <div className="border-t border-navy-900/10 pt-4 mt-2 space-y-4">
          <div>
            <h4 className="text-sm font-semibold text-navy-900">Clinty Wix Studio app</h4>
            <p className="text-sm text-navy-600 mt-1">
              One shared Custom App (Develop → OAuth / Webhooks). Subscribe{' '}
              <code className="text-xs">booking/canceled</code> to the full gateway{' '}
              <code className="text-xs">/v1/wix</code>, release a version, then paste App ID / Secret /
              webhook public key here. Tenants install the app; they do not create their own.
            </p>
          </div>

          {wixWebhookPreview ? (
            <p className="text-xs text-navy-600">
              Wix webhook callback URL:{' '}
              <code className="text-xs break-all bg-navy-900/5 px-1.5 py-0.5 rounded">
                {wixWebhookPreview}
              </code>
            </p>
          ) : null}

          <FormField
            label="Wix App ID"
            id="wix-app-id"
            hint="Wix Studio → Custom Apps → Develop → OAuth → App ID. Published listing uses 1f88c5af-e254-44fb-917f-49bed77b8632 (https://wix.to/9PIMeWM)."
          >
            <input
              id="wix-app-id"
              value={form.wix_app_id}
              onChange={(event) => updateField('wix_app_id', event.target.value)}
              placeholder="1f88c5af-e254-44fb-917f-49bed77b8632"
              className={inputClass}
              disabled={saving}
            />
          </FormField>

          <FormField
            label="Wix App Secret"
            id="wix-app-secret"
            hint="App Secret Key from the same OAuth page. Leave blank to keep the saved secret."
          >
            {hasWixAppSecret ? (
              <p className="text-xs text-navy-500 mb-2">An app secret is already saved.</p>
            ) : null}
            <SecretInput
              id="wix-app-secret"
              value={form.wix_app_secret}
              onChange={(value) => updateField('wix_app_secret', value)}
              placeholder={hasWixAppSecret ? '••••••••••••••••' : 'app secret'}
              className={inputClass}
              disabled={saving}
            />
          </FormField>

          <FormField
            label="Wix webhook public key"
            id="wix-webhook-public-key"
            hint="Webhooks → Subscriptions → Get Public Key (PEM). The full gateway loads this from Supabase (optional Render WIX_WEBHOOK_PUBLIC_KEY overrides). Leave blank to keep."
          >
            {hasWixWebhookKey ? (
              <p className="text-xs text-navy-500 mb-2">A webhook public key is already saved.</p>
            ) : null}
            <textarea
              id="wix-webhook-public-key"
              value={form.wix_webhook_public_key}
              onChange={(event) => updateField('wix_webhook_public_key', event.target.value)}
              placeholder={
                hasWixWebhookKey
                  ? 'Leave blank to keep the saved key'
                  : '-----BEGIN PUBLIC KEY-----\n…\n-----END PUBLIC KEY-----'
              }
              className={`${textareaClass} min-h-[8rem] font-mono text-xs`}
              disabled={saving}
              spellCheck={false}
              autoComplete="off"
            />
          </FormField>

          <FormField
            label="Wix install URL override (optional)"
            id="wix-app-install-url"
            hint="Published share link: https://wix.to/9PIMeWM. Leave empty to use the App Market install page. Do not use /installer/install or /app-installer for this unlisted app."
          >
            <input
              id="wix-app-install-url"
              type="url"
              value={form.wix_app_install_url}
              onChange={(event) => updateField('wix_app_install_url', event.target.value)}
              placeholder="https://wix.to/9PIMeWM"
              className={inputClass}
              disabled={saving}
            />
          </FormField>

          <FormField
            label="OAuth redirect URL (add in Wix Studio)"
            id="wix-redirect-uri"
            hint="Develop → OAuth → Redirect URL (optional). Tenants install via the App Market share page and paste Instance ID into Clinty."
          >
            <div className="flex flex-wrap items-center gap-2">
              <code className="text-xs break-all text-navy-800 bg-navy-900/5 px-2 py-1 rounded flex-1">
                {redirectUri}
              </code>
              <button
                type="button"
                className="text-sm font-medium text-teal-700 hover:text-teal-800"
                onClick={() => {
                  void navigator.clipboard.writeText(redirectUri).then(() => {
                    setCopiedRedirect(true)
                    window.setTimeout(() => setCopiedRedirect(false), 2000)
                  })
                }}
              >
                {copiedRedirect ? 'Copied' : 'Copy'}
              </button>
            </div>
          </FormField>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center bg-navy-900 text-cream font-medium px-5 py-2.5 rounded-xl hover:bg-navy-800 disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Save gateway settings'}
        </button>
      </form>
    </div>
  )
}
