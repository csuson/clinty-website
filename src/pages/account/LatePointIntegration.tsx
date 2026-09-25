import { useCallback, useEffect, useState } from 'react'
import FormField from '../../components/FormField'
import IntegrationPanel from '../../components/IntegrationPanel'
import { LatePointIcon } from '../../components/IntegrationIcons'
import { inputClass } from '../../constants/forms'
import { useAuth } from '../../context/AuthContext'
import {
  connectLatePoint,
  disconnectLatePoint,
  fetchLatePointConnection,
  type LatePointConnection,
} from '../../lib/latepoint/connect'

type Props = {
  expanded: boolean
  onToggle: () => void
}

export default function LatePointIntegration({ expanded, onToggle }: Props) {
  const { user } = useAuth()
  const [connection, setConnection] = useState<LatePointConnection | null>(null)
  const [siteUrl, setSiteUrl] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [serviceId, setServiceId] = useState('')
  const [agentId, setAgentId] = useState('')
  const [locationId, setLocationId] = useState('')
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
      const data = await fetchLatePointConnection(user.id)
      setConnection(data)
      if (data?.site_url) setSiteUrl(data.site_url)
      if (data?.service_id) setServiceId(data.service_id)
      if (data?.agent_id) setAgentId(data.agent_id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load LatePoint connection')
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
    if (!connected && (!siteUrl.trim() || !apiKey.trim() || !serviceId.trim() || !agentId.trim())) {
      return
    }
    setWorking(true)
    setError(null)
    setSuccess(null)
    try {
      const saved = await connectLatePoint({
        siteUrl: siteUrl.trim(),
        apiKey: apiKey.trim(),
        serviceId: serviceId.trim(),
        agentId: agentId.trim(),
        locationId: locationId.trim(),
        timezone: timezone.trim() || 'America/Los_Angeles',
      })
      setApiKey('')
      await loadConnection()
      setSuccess(
        saved.assistantReloaded
          ? 'LatePoint connected as your booking calendar. Other booking integrations (Square, WeTravel, FluentBooking) were disconnected. Gmail is unchanged.'
          : `LatePoint saved. Assistant reload failed: ${saved.assistantReloadError ?? 'unknown error'}`,
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not connect LatePoint.')
    } finally {
      setWorking(false)
    }
  }

  async function handleDisconnect() {
    setWorking(true)
    setError(null)
    setSuccess(null)
    try {
      const disconnected = await disconnectLatePoint()
      setConnection(null)
      setApiKey('')
      setSuccess(
        disconnected.assistantReloaded
          ? 'LatePoint disconnected.'
          : 'LatePoint disconnected. Restart the email assistant if needed.',
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disconnect LatePoint')
    } finally {
      setWorking(false)
    }
  }

  return (
    <IntegrationPanel
      title="LatePoint"
      icon={<LatePointIcon />}
      iconWrapperClassName="bg-sky-50"
      status={status.status}
      statusLabel={status.statusLabel}
      expanded={expanded}
      onToggle={onToggle}
    >
      <p className="text-sm text-navy-600 mb-6">
        Book lessons and appointments from email/WhatsApp via LatePoint. Requires the LatePoint REST
        API Extension (WPLimit). Connecting sets your agent calendar provider to LatePoint.
      </p>

      {error ? <p className="text-sm text-red-700 mb-4">{error}</p> : null}
      {success ? <p className="text-sm text-emerald-800 mb-4">{success}</p> : null}

      <div className="space-y-3">
        <FormField label="WordPress site URL" id="latepoint-site-url">
          <input
            id="latepoint-site-url"
            className={inputClass}
            value={siteUrl}
            onChange={(e) => setSiteUrl(e.target.value)}
            placeholder="https://yoursite.com"
            disabled={working}
          />
        </FormField>
        <FormField
          label="API key"
          id="latepoint-api-key"
          hint="LatePoint → API Settings (WPLimit REST API Extension)"
        >
          <input
            id="latepoint-api-key"
            type="password"
            className={inputClass}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={connected ? '•••••••• (leave blank to keep)' : ''}
            disabled={working}
          />
        </FormField>
        <FormField label="Service ID" id="latepoint-service-id">
          <input
            id="latepoint-service-id"
            className={inputClass}
            value={serviceId}
            onChange={(e) => setServiceId(e.target.value)}
            disabled={working}
          />
        </FormField>
        <FormField label="Agent ID" id="latepoint-agent-id">
          <input
            id="latepoint-agent-id"
            className={inputClass}
            value={agentId}
            onChange={(e) => setAgentId(e.target.value)}
            disabled={working}
          />
        </FormField>
        <FormField label="Location ID (optional)" id="latepoint-location-id">
          <input
            id="latepoint-location-id"
            className={inputClass}
            value={locationId}
            onChange={(e) => setLocationId(e.target.value)}
            disabled={working}
          />
        </FormField>
        <FormField label="Timezone" id="latepoint-timezone">
          <input
            id="latepoint-timezone"
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
            {working ? 'Saving…' : connected ? 'Update LatePoint' : 'Connect LatePoint'}
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
              {`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/latepoint-webhook?user_id=${user.id}`}
            </code>
          </p>
        ) : null}
      </div>
    </IntegrationPanel>
  )
}
