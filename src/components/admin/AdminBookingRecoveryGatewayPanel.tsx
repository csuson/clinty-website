import { useEffect, useState } from 'react'
import FormField from '../FormField'
import { SecretInput } from '../SecretField'
import { inputClass } from '../../constants/forms'
import { updateWebsiteInfrastructure, type AdminWebsiteSettings } from '../../lib/admin'

type GatewayForm = {
  booking_recovery_gateway_url: string
  booking_recovery_google_gateway_url: string
  booking_recovery_apps_script_web_app_url: string
  booking_recovery_apps_script_connect_secret: string
}

function settingsToForm(settings?: AdminWebsiteSettings | null): GatewayForm {
  return {
    booking_recovery_gateway_url: settings?.booking_recovery_gateway_url?.trim() ?? '',
    booking_recovery_google_gateway_url: settings?.booking_recovery_google_gateway_url?.trim() ?? '',
    booking_recovery_apps_script_web_app_url:
      settings?.booking_recovery_apps_script_web_app_url?.trim() ?? '',
    booking_recovery_apps_script_connect_secret: '',
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
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    setForm(settingsToForm(settings))
    setHasConnectSecret(settings?.has_booking_recovery_apps_script_connect_secret === true)
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
      })
      setForm(settingsToForm(updated))
      setHasConnectSecret(updated.has_booking_recovery_apps_script_connect_secret === true)
      setSuccess('Booking recovery gateway settings saved.')
      onSaved?.(updated)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save gateway settings')
    } finally {
      setSaving(false)
    }
  }

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
          hint="Deployed /exec URL from script.google.com (Execute as: Me, Anyone)"
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
