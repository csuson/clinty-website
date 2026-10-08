import { useCallback, useEffect, useState } from 'react'
import IntegrationPanel from '../../components/IntegrationPanel'
import { GoogleCalendarIcon } from '../../components/IntegrationIcons'
import {
  disableBookingRecovery,
  enableBookingRecovery,
  fetchBookingRecoverySettings,
  rotateBookingRecoveryToken,
  type BookingRecoverySettingsResponse,
} from '../../lib/bookingRecovery'

type BookingRecoveryIntegrationProps = {
  expanded: boolean
  onToggle: () => void
}

async function copyText(value: string) {
  await navigator.clipboard.writeText(value)
}

export default function BookingRecoveryIntegration({
  expanded,
  onToggle,
}: BookingRecoveryIntegrationProps) {
  const [data, setData] = useState<BookingRecoverySettingsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setData(await fetchBookingRecoverySettings())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load booking recovery settings')
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const connection = data?.connection ?? null
  const enabled = connection?.enabled === true
  const hasGateway = Boolean(data?.gateway_base_url)
  const hasAssistant = Boolean(connection?.langgraph_url?.trim())

  let status: 'loading' | 'connected' | 'partial' | 'disconnected' | 'unavailable' = 'loading'
  let statusLabel = 'Checking…'
  if (!loading) {
    if (!hasGateway) {
      status = 'unavailable'
      statusLabel = 'Gateway not configured'
    } else if (enabled && hasAssistant) {
      status = 'connected'
      statusLabel = 'Enabled'
    } else if (connection) {
      status = 'partial'
      statusLabel = enabled ? 'Needs assistant URL' : 'Disabled'
    } else {
      status = 'disconnected'
      statusLabel = 'Not set up'
    }
  }

  async function runAction(action: () => Promise<BookingRecoverySettingsResponse>, okMessage: string) {
    setWorking(true)
    setError(null)
    setSuccess(null)
    try {
      setData(await action())
      setSuccess(okMessage)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed')
    } finally {
      setWorking(false)
    }
  }

  return (
    <IntegrationPanel
      title="Cancel recovery (Square / Google)"
      icon={<GoogleCalendarIcon />}
      iconWrapperClassName="bg-neutral-100"
      status={status}
      statusLabel={statusLabel}
      expanded={expanded}
      onToggle={onToggle}
    >
      <p className="text-sm text-navy-600 mb-4">
        When you cancel a lesson in Square or Google Calendar, Clinty can text and email the customer
        with rebooking options. Point Square and Apps Script at the shared recovery gateway URLs below
        (not your assistant URL directly).
      </p>

      {error ? (
        <div className="rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 mb-4">
          {error}
        </div>
      ) : null}
      {success ? (
        <div className="rounded-xl bg-teal-400/10 border border-teal-400/20 text-teal-600 text-sm px-4 py-3 mb-4">
          {success}
        </div>
      ) : null}

      {loading ? (
        <p className="text-sm text-navy-600">Loading recovery settings…</p>
      ) : (
        <div className="space-y-4">
          <div className="bg-cream rounded-xl p-5 space-y-3 text-sm">
            <div className="flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full ${enabled ? 'bg-teal-400' : 'bg-navy-300'}`}
              />
              <span className="font-semibold text-navy-900">
                {enabled ? 'Recovery enabled' : 'Recovery disabled'}
              </span>
            </div>
            <dl className="grid sm:grid-cols-2 gap-4">
              <div>
                <dt className="text-navy-600 mb-1">Square merchant ID</dt>
                <dd className="font-mono text-xs text-navy-900 break-all">
                  {connection?.square_merchant_id ?? '— (connect Square to auto-fill)'}
                </dd>
              </div>
              <div>
                <dt className="text-navy-600 mb-1">Assistant URL</dt>
                <dd className="font-mono text-xs text-navy-900 break-all">
                  {connection?.langgraph_url?.trim() || '— (set by admin / Agent Settings)'}
                </dd>
              </div>
            </dl>
          </div>

          {data?.square_webhook_url ? (
            <div className="space-y-2">
              <p className="text-sm font-medium text-navy-900">Square Developer webhook URL</p>
              <div className="flex flex-wrap items-start gap-2">
                <code className="text-xs break-all text-navy-800 bg-navy-900/5 px-2 py-1 rounded">
                  {data.square_webhook_url}
                </code>
                <button
                  type="button"
                  className="text-sm font-medium text-teal-700 hover:text-teal-800"
                  onClick={() => void copyText(data.square_webhook_url!).then(() => setSuccess('Square URL copied.'))}
                >
                  Copy
                </button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-amber-800">
              An admin must set the booking recovery gateway URL before webhook links appear.
            </p>
          )}

          {data?.google_webhook_url ? (
            <div className="space-y-2">
              <p className="text-sm font-medium text-navy-900">
                Google Apps Script <code className="text-xs">RECOVERY_WEBHOOK_URL</code>
              </p>
              <div className="flex flex-wrap items-start gap-2">
                <code className="text-xs break-all text-navy-800 bg-navy-900/5 px-2 py-1 rounded">
                  {data.google_webhook_url}
                </code>
                <button
                  type="button"
                  className="text-sm font-medium text-teal-700 hover:text-teal-800"
                  onClick={() =>
                    void copyText(data.google_webhook_url!).then(() => setSuccess('Google URL copied.'))
                  }
                >
                  Copy
                </button>
              </div>
              <p className="text-xs text-navy-600">
                Put the customer phone in the event description (e.g. Phone: +1 …). Keep email on attendees.
              </p>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-3">
            {enabled ? (
              <button
                type="button"
                disabled={working}
                onClick={() => void runAction(disableBookingRecovery, 'Cancel recovery disabled.')}
                className="text-sm font-medium text-red-600 hover:text-red-700 disabled:opacity-60"
              >
                {working ? 'Working…' : 'Disable recovery'}
              </button>
            ) : (
              <button
                type="button"
                disabled={working || !hasGateway}
                onClick={() => void runAction(enableBookingRecovery, 'Cancel recovery enabled.')}
                className="inline-flex items-center bg-navy-900 text-cream font-medium px-5 py-2.5 rounded-xl hover:bg-navy-800 disabled:opacity-60"
              >
                {working ? 'Working…' : 'Enable recovery'}
              </button>
            )}
            <button
              type="button"
              disabled={working || !connection}
              onClick={() => {
                if (
                  !window.confirm(
                    'Rotate the Google webhook token? Update Apps Script RECOVERY_WEBHOOK_URL afterward.',
                  )
                ) {
                  return
                }
                void runAction(rotateBookingRecoveryToken, 'Webhook token rotated.')
              }}
              className="text-sm font-medium text-navy-700 hover:text-navy-900 disabled:opacity-60"
            >
              Rotate Google token
            </button>
          </div>
        </div>
      )}
    </IntegrationPanel>
  )
}
