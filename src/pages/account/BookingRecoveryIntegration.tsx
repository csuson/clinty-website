import { useCallback, useEffect, useState } from 'react'
import IntegrationPanel from '../../components/IntegrationPanel'
import { GoogleCalendarIcon } from '../../components/IntegrationIcons'
import {
  buildWixInstallerUrl,
  CLINTY_WIX_APP_ID,
  CLINTY_WIX_APP_SHARE_URL,
} from '../../constants/wix'
import { useAuth } from '../../context/AuthContext'
import {
  disableBookingRecovery,
  enableBookingRecovery,
  ensureBookingRecovery,
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
  const { user } = useAuth()
  const [data, setData] = useState<BookingRecoverySettingsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      // Ensure row exists and sync langgraph_url from agent_settings on every open.
      setData(await ensureBookingRecovery())
    } catch (err) {
      // Fall back to get so the panel still renders when agent URL is missing.
      try {
        setData(await fetchBookingRecoverySettings())
        setError(err instanceof Error ? err.message : 'Could not ensure recovery connection')
      } catch (getErr) {
        setError(getErr instanceof Error ? getErr.message : 'Failed to load booking recovery settings')
        setData(null)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const connection = data?.connection ?? null
  const enabled = connection?.enabled === true
  const hasGateway = Boolean(data?.gateway_base_url || data?.google_gateway_base_url)
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
      title="Cancel recovery (Square / Google / Wix)"
      icon={<GoogleCalendarIcon />}
      iconWrapperClassName="bg-neutral-100"
      status={status}
      statusLabel={statusLabel}
      expanded={expanded}
      onToggle={onToggle}
    >
      <p className="text-sm text-navy-600 mb-4">
        When you cancel a lesson in Square, Google Calendar, or Wix Bookings, Clinty can email and
        optionally text the customer with rebooking options. Square and Wix use the shared gateway
        URLs below. For Google Calendar, connect via the Apps Script link (no project to create). For
        Wix, install Clinty&apos;s shared Studio app — you do not create your own webhook app.
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
              <div>
                <dt className="text-navy-600 mb-1">Wix instance ID</dt>
                <dd className="font-mono text-xs text-navy-900 break-all">
                  {connection?.wix_instance_id ??
                    '— (install Clinty Wix app / connect Wix to auto-fill)'}
                </dd>
              </div>
              <div>
                <dt className="text-navy-600 mb-1">Wix site ID</dt>
                <dd className="font-mono text-xs text-navy-900 break-all">
                  {connection?.wix_site_id ?? '— (connect Wix to auto-fill)'}
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

          {data?.wix_webhook_url ? (
            <div className="space-y-2">
              <p className="text-sm font-medium text-navy-900">Wix Bookings cancel webhook</p>
              <div className="flex flex-wrap items-start gap-2">
                <code className="text-xs break-all text-navy-800 bg-navy-900/5 px-2 py-1 rounded">
                  {data.wix_webhook_url}
                </code>
                <button
                  type="button"
                  className="text-sm font-medium text-teal-700 hover:text-teal-800"
                  onClick={() =>
                    void copyText(data.wix_webhook_url!).then(() => setSuccess('Wix URL copied.'))
                  }
                >
                  Copy
                </button>
              </div>
              <div className="space-y-2">
                <p className="text-xs text-navy-600">
                  Clinty&apos;s shared Wix Studio app posts <code className="text-xs">booking/canceled</code>{' '}
                  here once subscribed. Install via{' '}
                  <code className="text-xs">wix.to/9PIMeWM</code>,                   then paste the Instance ID in{' '}
                  <strong>Wix Bookings</strong> and Connect (Service ID optional — blank uses all
                  appointments, classes, and courses) so cancels route to your assistant. Guest email
                  required.
                </p>
                {user ? (
                  <button
                    type="button"
                    disabled={working}
                    onClick={() => {
                      const url = buildWixInstallerUrl(
                        CLINTY_WIX_APP_SHARE_URL,
                        user.id,
                        CLINTY_WIX_APP_ID,
                      )
                      if (!url) {
                        setError('Could not build the Wix install URL.')
                        return
                      }
                      window.open(url, '_blank', 'noopener,noreferrer')
                    }}
                    className="inline-flex items-center text-sm font-medium border border-navy-900/15 text-navy-800 px-4 py-2 rounded-lg hover:bg-navy-50 disabled:opacity-60"
                  >
                    Install Clinty Wix app
                  </button>
                ) : null}
                {!connection?.wix_instance_id && !connection?.wix_site_id ? (
                  <p className="text-xs text-amber-800">
                    No Wix routing ID yet — open <strong>Wix Bookings</strong> above to finish connect
                    after install.
                  </p>
                ) : null}
                {!data.has_wix_webhook_public_key ? (
                  <p className="text-xs text-amber-800">
                    Admin note: paste the Wix webhook public key in Admin → Booking recovery gateways
                    (and on the gateway as WIX_WEBHOOK_PUBLIC_KEY) so JWT verification is enabled.
                  </p>
                ) : null}
                {!data.wix_app_configured ? (
                  <p className="text-xs text-navy-600">
                    Shared App Secret is not configured yet — you can still connect Wix with an API key;
                    routing uses site ID until OAuth credentials are set in Admin.
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}

          <div className="space-y-2 border-t border-navy-900/5 pt-4">
            <p className="text-sm font-medium text-navy-900">Google Calendar</p>
            <p className="text-xs text-navy-600">
              Connect your Google Calendar once (Clinty&apos;s shared Apps Script). Cancels are posted
              to the Google recovery gateway automatically — you do not create an Apps Script project.
              Put customer email (required) and optional WhatsApp phone in the event description.
            </p>
            {data?.google_calendar_connect_url ? (
              <div className="space-y-2">
                <div className="flex flex-wrap gap-3 items-center">
                  <button
                    type="button"
                    disabled={working}
                    onClick={() => {
                      // Open synchronously so the popup is not blocked after ensure().
                      const popup = window.open('about:blank', '_blank')
                      void (async () => {
                        setWorking(true)
                        setError(null)
                        setSuccess(null)
                        try {
                          // Fill langgraph_api_key from Clinty API key if null, then open OAuth.
                          const next = await ensureBookingRecovery()
                          setData(next)
                          const url = next.google_calendar_connect_url
                          if (!url) {
                            popup?.close()
                            setError('Connect URL unavailable after sync. Try again.')
                            return
                          }
                          if (popup) {
                            popup.location.href = url
                          } else {
                            window.location.assign(url)
                          }
                          setSuccess(
                            'Opened Google Calendar connect. After authorizing, cancels will use your assistant API key.',
                          )
                        } catch (err) {
                          popup?.close()
                          setError(err instanceof Error ? err.message : 'Could not prepare Google Calendar connect')
                        } finally {
                          setWorking(false)
                        }
                      })()
                    }}
                    className="inline-flex items-center bg-navy-900 text-cream font-medium px-5 py-2.5 rounded-xl hover:bg-navy-800 disabled:opacity-60"
                  >
                    {working ? 'Preparing…' : 'Connect Google Calendar'}
                  </button>
                  {data.google_calendar_status_url ? (
                    <a
                      href={data.google_calendar_status_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-teal-700 hover:text-teal-800"
                    >
                      Check status
                    </a>
                  ) : null}
                  {data.google_calendar_disconnect_url ? (
                    <a
                      href={data.google_calendar_disconnect_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-navy-700 hover:text-navy-900"
                    >
                      Disconnect
                    </a>
                  ) : null}
                </div>
                <p className="text-xs text-navy-500">
                  If Google says it can&apos;t open the file, open the link in an incognito window
                  signed into a single Google account (multiple signed-in accounts break Apps Script
                  web apps).
                </p>
              </div>
            ) : (
              <p className="text-sm text-amber-800">
                {data?.apps_script_configured === false
                  ? 'An admin must configure the Apps Script Web App URL and connect secret.'
                  : 'Enable recovery (or ask an admin for an assistant URL) to get a connect link.'}
              </p>
            )}
            {data?.google_webhook_url ? (
              <p className="text-xs text-navy-500 break-all">
                Gateway target (reference): <code className="text-xs">{data.google_webhook_url}</code>
              </p>
            ) : null}
          </div>

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
                    'Rotate the Google webhook token? You will need to Connect Google Calendar again (or reconnect) so the new token is registered.',
                  )
                ) {
                  return
                }
                void runAction(rotateBookingRecoveryToken, 'Webhook token rotated — reconnect Google Calendar.')
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
