import { useCallback, useEffect, useState } from 'react'
import FormField from '../../components/FormField'
import IntegrationPanel from '../../components/IntegrationPanel'
import { WeTravelIcon } from '../../components/IntegrationIcons'
import { inputClass } from '../../constants/forms'
import { useAuth } from '../../context/AuthContext'
import {
  connectWeTravel,
  disconnectWeTravel,
  fetchWeTravelConnection,
  type WeTravelConnection,
} from '../../lib/wetravel/connect'

type WeTravelIntegrationProps = {
  expanded: boolean
  onToggle: () => void
}

export default function WeTravelIntegration({ expanded, onToggle }: WeTravelIntegrationProps) {
  const { user } = useAuth()
  const [connection, setConnection] = useState<WeTravelConnection | null>(null)
  const [apiKey, setApiKey] = useState('')
  const [sandbox, setSandbox] = useState(false)
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const loadConnection = useCallback(async () => {
    if (!user) {
      setLoading(false)
      return
    }
    try {
      const data = await fetchWeTravelConnection(user.id)
      setConnection(data)
      if (data) {
        setSandbox(Boolean(data.sandbox))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load WeTravel connection')
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    void loadConnection()
  }, [loadConnection])

  const connected = Boolean(connection && connection.status === 'connected')
  const status = loading
    ? { status: 'loading' as const, statusLabel: 'Checking…' }
    : connected
      ? { status: 'connected' as const, statusLabel: connection?.sandbox ? 'Connected (sandbox)' : 'Connected' }
      : { status: 'disconnected' as const, statusLabel: 'Not connected' }

  async function handleSave() {
    if (!apiKey.trim() && !connected) return
    setWorking(true)
    setError(null)
    setSuccess(null)
    try {
      const saved = await connectWeTravel({
        apiKey: apiKey.trim(),
        sandbox,
      })
      setApiKey('')
      await loadConnection()
      setSuccess(
        saved.assistantReloaded
          ? 'WeTravel connected. CALENDAR_PROVIDER set to WeTravel; other booking integrations (Square, FluentBooking, LatePoint) were disconnected. Gmail is unchanged.'
          : `WeTravel saved. Assistant reload failed: ${saved.assistantReloadError ?? 'unknown error'}`,
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not connect WeTravel.')
    } finally {
      setWorking(false)
    }
  }

  async function handleDisconnect() {
    setWorking(true)
    setError(null)
    setSuccess(null)
    try {
      const disconnected = await disconnectWeTravel()
      setConnection(null)
      setApiKey('')
      setSuccess(
        disconnected.assistantReloaded
          ? 'WeTravel disconnected.'
          : 'WeTravel disconnected. Restart the email assistant if it still uses the old key.',
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disconnect WeTravel')
    } finally {
      setWorking(false)
    }
  }

  return (
    <IntegrationPanel
      title="WeTravel"
      icon={<WeTravelIcon />}
      iconWrapperClassName="bg-teal-50"
      status={status.status}
      statusLabel={status.statusLabel}
      expanded={expanded}
      onToggle={onToggle}
    >
      <p className="text-sm text-navy-600 mb-6">
        Connect your WeTravel Partner API key so Clinty can create payment links and trips, then
        send them in email and WhatsApp. Generate the key in WeTravel → Profile → Partner API
        Integration (Pro account, main owner only).
      </p>

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 mb-6">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-xl bg-teal-400/10 border border-teal-400/20 text-teal-600 text-sm px-4 py-3 mb-6">
          {success}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-navy-600">Checking connection status...</p>
      ) : (
        <div className="space-y-4">
          <FormField
            label="Partner API key"
            id="wetravel-api-key"
            hint={connected ? 'Leave blank to keep the saved key; paste a new key to replace it.' : undefined}
          >
            <input
              id="wetravel-api-key"
              type="password"
              autoComplete="off"
              value={apiKey}
              onChange={(event) => setApiKey(event.target.value)}
              placeholder={connected ? '••••••••••••••••' : 'Paste WeTravel refresh token'}
              className={inputClass}
              disabled={working}
            />
          </FormField>

          <label className="flex items-center gap-2 text-sm text-navy-700">
            <input
              type="checkbox"
              checked={sandbox}
              onChange={(event) => setSandbox(event.target.checked)}
              disabled={working}
              className="rounded border-navy-300"
            />
            Use WeTravel sandbox (<code className="text-xs">api.demo.wetravel.to</code>)
          </label>

          <div className="flex flex-wrap gap-3 pt-2">
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={working || (!apiKey.trim() && !connected)}
              className="inline-flex items-center text-sm font-medium bg-navy-900 text-cream px-4 py-2 rounded-lg hover:bg-navy-800 transition-colors disabled:opacity-60"
            >
              {working ? 'Saving…' : connected ? 'Update WeTravel' : 'Connect WeTravel'}
            </button>
            {connected ? (
              <button
                type="button"
                onClick={() => void handleDisconnect()}
                disabled={working}
                className="inline-flex items-center text-sm font-medium border border-navy-900/15 text-navy-800 px-4 py-2 rounded-lg hover:bg-navy-50 transition-colors disabled:opacity-60"
              >
                Disconnect
              </button>
            ) : null}
          </div>

          {connected && user ? (
            <div className="text-xs text-navy-500 pt-2 space-y-1">
              <p>
                Webhook URL (add in WeTravel → Manage Webhooks):{' '}
                <code className="break-all">
                  {`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/wetravel-webhook?user_id=${user.id}`}
                </code>
              </p>
              <p>
                Booking webhooks auto-create or update an all-day event on your connected Google or Outlook calendar
                (requires LangGraph URL + API key in Agent Settings).
              </p>
            </div>
          ) : null}
        </div>
      )}
    </IntegrationPanel>
  )
}
