import { useEffect, useState } from 'react'
import FormField from '../FormField'
import { inputClass } from '../../constants/forms'
import { updateWebsiteInfrastructure, type AdminWebsiteSettings } from '../../lib/admin'

type GatewayForm = {
  booking_recovery_gateway_url: string
}

function settingsToForm(settings?: AdminWebsiteSettings | null): GatewayForm {
  return {
    booking_recovery_gateway_url: settings?.booking_recovery_gateway_url?.trim() ?? '',
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
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    setForm(settingsToForm(settings))
  }, [settings])

  async function handleSave(event: React.FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      const updated = await updateWebsiteInfrastructure({
        booking_recovery_gateway_url: form.booking_recovery_gateway_url.trim(),
      })
      setForm(settingsToForm(updated))
      setSuccess('Booking recovery gateway URL saved.')
      onSaved?.(updated)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save gateway URL')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="px-6 py-5 border-t border-navy-900/5">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-navy-900">Booking recovery gateway</h3>
        <p className="text-sm text-navy-600 mt-1">
          Shared Render URL for Square and Google cancel webhooks. Operators copy{' '}
          <code className="text-xs">/v1/square</code> and <code className="text-xs">/v1/google/&#123;token&#125;</code>{' '}
          from Integrations. Falls back to Edge secret{' '}
          <code className="text-xs">BOOKING_RECOVERY_GATEWAY_URL</code>.
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
          label="Gateway base URL"
          id="booking-recovery-gateway-url"
          hint="BOOKING_RECOVERY_GATEWAY_URL / website_infrastructure.booking_recovery_gateway_url"
        >
          <input
            id="booking-recovery-gateway-url"
            type="url"
            value={form.booking_recovery_gateway_url}
            onChange={(event) =>
              setForm({ booking_recovery_gateway_url: event.target.value })
            }
            placeholder="https://booking-recovery-gateway.onrender.com"
            className={inputClass}
            disabled={saving}
          />
        </FormField>
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center bg-navy-900 text-cream font-medium px-5 py-2.5 rounded-xl hover:bg-navy-800 disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Save gateway URL'}
        </button>
      </form>
    </div>
  )
}
