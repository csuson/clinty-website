import { useCallback, useEffect, useState } from 'react'
import FormField from '../../components/FormField'
import IntegrationPanel from '../../components/IntegrationPanel'
import { FluentBookingIcon } from '../../components/IntegrationIcons'
import { inputClass } from '../../constants/forms'
import { useAuth } from '../../context/AuthContext'
import {
  connectFluentBooking,
  disconnectFluentBooking,
  fetchFluentBookingConnection,
  type FluentBookingConnection,
} from '../../lib/fluentbooking/connect'

type Props = {
  expanded: boolean
  onToggle: () => void
}

export default function FluentBookingIntegration({ expanded, onToggle }: Props) {
  const { user } = useAuth()
  const [connection, setConnection] = useState<FluentBookingConnection | null>(null)
  const [siteUrl, setSiteUrl] = useState('')
  const [username, setUsername] = useState('')
  const [appPassword, setAppPassword] = useState('')
  const [calendarId, setCalendarId] = useState('')
  const [eventId, setEventId] = useState('')
  const [timezone, setTimezone] = useState('America/Los_Angeles')
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
      const data = await fetchFluentBookingConnection(user.id)
      setConnection(data)
      if (data?.site_url) setSiteUrl(data.site_url)
      if (data?.calendar_id) setCalendarId(data.calendar_id)
      if (data?.event_id) setEventId(data.event_id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load FluentBooking connection')
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
      ? { status: 'connected' as const, statusLabel: 'Connected' }
      : { status: 'disconnected' as const, statusLabel: 'Not connected' }

  async function handleSave() {
    if (!calendarId.trim()) return
    if (!connected && (!siteUrl.trim() || !username.trim() || !appPassword.trim())) {
      return
    }
    setWorking(true)
    setError(null)
    setSuccess(null)
    try {
      const saved = await connectFluentBooking({
        siteUrl: siteUrl.trim(),
        username: username.trim(),
        appPassword: appPassword.trim(),
        calendarId: calendarId.trim(),
        eventId: eventId.trim(),
        timezone: timezone.trim() || 'America/Los_Angeles',
      })
      setAppPassword('')
      await loadConnection()
      setSuccess(
        saved.assistantReloaded
          ? 'FluentBooking connected as your booking calendar. Other booking integrations (Square, WeTravel, LatePoint) were disconnected. Gmail is unchanged.'
          : `FluentBooking saved. Assistant reload failed: ${saved.assistantReloadError ?? 'unknown error'}`,
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not connect FluentBooking.')
    } finally {
      setWorking(false)
    }
  }

  async function handleDisconnect() {
    setWorking(true)
    setError(null)
    setSuccess(null)
    try {
      const disconnected = await disconnectFluentBooking()
      setConnection(null)
      setAppPassword('')
      setSuccess(
        disconnected.assistantReloaded
          ? 'FluentBooking disconnected.'
          : 'FluentBooking disconnected. Restart the email assistant if needed.',
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disconnect FluentBooking')
    } finally {
      setWorking(false)
    }
  }

  return (
    <IntegrationPanel
      title="FluentBooking"
      icon={<FluentBookingIcon />}
      iconWrapperClassName="bg-violet-50"
      status={status.status}
      statusLabel={status.statusLabel}
      expanded={expanded}
      onToggle={onToggle}
    >
      <p className="text-sm text-navy-600 mb-6">
        Book lessons and appointments from email/WhatsApp via your WordPress FluentBooking calendar
        (REST API — Application Password). Connecting sets your agent calendar provider to FluentBooking.
      </p>

      {error ? <p className="text-sm text-red-700 mb-4">{error}</p> : null}
      {success ? <p className="text-sm text-emerald-800 mb-4">{success}</p> : null}

      <div className="space-y-3">
        <FormField label="WordPress site URL" id="fluentbooking-site-url">
          <input
            id="fluentbooking-site-url"
            className={inputClass}
            value={siteUrl}
            onChange={(e) => setSiteUrl(e.target.value)}
            placeholder="https://yoursite.com"
            disabled={working}
          />
        </FormField>
        <FormField label="WordPress username" id="fluentbooking-username">
          <input
            id="fluentbooking-username"
            className={inputClass}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={working}
          />
        </FormField>
        <FormField
          label="Application password"
          id="fluentbooking-app-password"
          hint="Users → Profile → Application Passwords"
        >
          <input
            id="fluentbooking-app-password"
            type="password"
            className={inputClass}
            value={appPassword}
            onChange={(e) => setAppPassword(e.target.value)}
            placeholder={connected ? '•••••••• (leave blank to keep)' : ''}
            disabled={working}
          />
        </FormField>
        <FormField label="Calendar ID" id="fluentbooking-calendar-id" hint="FluentBooking calendar ID">
          <input
            id="fluentbooking-calendar-id"
            className={inputClass}
            value={calendarId}
            onChange={(e) => setCalendarId(e.target.value)}
            disabled={working}
          />
        </FormField>
        <FormField label="Event ID (optional)" id="fluentbooking-event-id" hint="FluentBooking event type ID">
          <input
            id="fluentbooking-event-id"
            className={inputClass}
            value={eventId}
            onChange={(e) => setEventId(e.target.value)}
            disabled={working}
          />
        </FormField>
        <FormField label="Timezone" id="fluentbooking-timezone">
          <input
            id="fluentbooking-timezone"
            className={inputClass}
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            disabled={working}
          />
        </FormField>

        <div className="flex flex-wrap gap-3 pt-2">
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={working}
            className="inline-flex items-center text-sm font-medium bg-navy-900 text-cream px-4 py-2 rounded-lg hover:bg-navy-800 transition-colors disabled:opacity-60"
          >
            {working ? 'Saving…' : connected ? 'Update FluentBooking' : 'Connect FluentBooking'}
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
          <p className="text-xs text-navy-500 pt-2">
            Optional webhook URL:{' '}
            <code className="break-all">
              {`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fluentbooking-webhook?user_id=${user.id}`}
            </code>
          </p>
        ) : null}
      </div>
    </IntegrationPanel>
  )
}
