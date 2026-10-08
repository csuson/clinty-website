import { useCallback, useEffect, useState } from 'react'
import FormField from '../../components/FormField'
import IntegrationPanel from '../../components/IntegrationPanel'
import { WixIcon } from '../../components/IntegrationIcons'
import { inputClass } from '../../constants/forms'
import { useAuth } from '../../context/AuthContext'
import {
  connectWix,
  disconnectWix,
  fetchWixConnection,
  type WixConnection,
} from '../../lib/wix/connect'

type Props = {
  expanded: boolean
  onToggle: () => void
}

export default function WixIntegration({ expanded, onToggle }: Props) {
  const { user } = useAuth()
  const [connection, setConnection] = useState<WixConnection | null>(null)
  const [siteId, setSiteId] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [serviceId, setServiceId] = useState('')
  const [appId, setAppId] = useState('')
  const [appSecret, setAppSecret] = useState('')
  const [instanceId, setInstanceId] = useState('')
  const [resourceId, setResourceId] = useState('')
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
      const data = await fetchWixConnection(user.id)
      setConnection(data)
      if (data?.site_id) setSiteId(data.site_id)
      if (data?.service_id) setServiceId(data.service_id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load Wix connection')
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
    const hasApiKeyPath = Boolean(siteId.trim() && (apiKey.trim() || connected))
    const hasOauthPath = Boolean(
      appId.trim() && (appSecret.trim() || connected) && instanceId.trim(),
    )
    if (!connected && (!serviceId.trim() || (!hasApiKeyPath && !hasOauthPath))) {
      setError(
        'Provide a service ID plus either (API key + site ID) or (App ID + App Secret + Instance ID).',
      )
      return
    }
    setWorking(true)
    setError(null)
    setSuccess(null)
    try {
      const saved = await connectWix({
        siteId: siteId.trim(),
        apiKey: apiKey.trim(),
        serviceId: serviceId.trim(),
        appId: appId.trim(),
        appSecret: appSecret.trim(),
        instanceId: instanceId.trim(),
        resourceId: resourceId.trim(),
        locationId: locationId.trim(),
        timezone: timezone.trim() || 'America/Los_Angeles',
      })
      setApiKey('')
      setAppSecret('')
      await loadConnection()
      setSuccess(
        saved.assistantReloaded
          ? 'Wix Bookings connected as your booking calendar. Other booking integrations (Square, WeTravel, FluentBooking, LatePoint) were disconnected. Gmail is unchanged.'
          : `Wix Bookings saved. Assistant reload failed: ${saved.assistantReloadError ?? 'unknown error'}`,
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not connect Wix Bookings.')
    } finally {
      setWorking(false)
    }
  }

  async function handleDisconnect() {
    setWorking(true)
    setError(null)
    setSuccess(null)
    try {
      const disconnected = await disconnectWix()
      setConnection(null)
      setApiKey('')
      setAppSecret('')
      setSuccess(
        disconnected.assistantReloaded
          ? 'Wix Bookings disconnected.'
          : 'Wix Bookings disconnected. Restart the email assistant if needed.',
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disconnect Wix Bookings')
    } finally {
      setWorking(false)
    }
  }

  return (
    <IntegrationPanel
      title="Wix Bookings"
      icon={<WixIcon />}
      iconWrapperClassName="bg-violet-50"
      status={status.status}
      statusLabel={status.statusLabel}
      expanded={expanded}
      onToggle={onToggle}
    >
      <p className="text-sm text-navy-600 mb-6">
        Book lessons and appointments from email/WhatsApp via Wix Bookings. Use a Wix API key
        (recommended) or an OAuth app. Connecting sets your agent calendar provider to Wix.
      </p>

      {error ? <p className="text-sm text-red-700 mb-4">{error}</p> : null}
      {success ? <p className="text-sm text-emerald-800 mb-4">{success}</p> : null}

      <div className="space-y-3">
        <FormField
          label="Site ID"
          id="wix-site-id"
          hint="Wix dashboard → Settings → Site ID (required with API key)"
        >
          <input
            id="wix-site-id"
            className={inputClass}
            value={siteId}
            onChange={(e) => setSiteId(e.target.value)}
            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            disabled={working}
          />
        </FormField>
        <FormField
          label="API key"
          id="wix-api-key"
          hint="Wix API Keys with Bookings permissions"
        >
          <input
            id="wix-api-key"
            type="password"
            className={inputClass}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={connected ? '•••••••• (leave blank to keep)' : ''}
            disabled={working}
          />
        </FormField>
        <FormField label="Service ID" id="wix-service-id">
          <input
            id="wix-service-id"
            className={inputClass}
            value={serviceId}
            onChange={(e) => setServiceId(e.target.value)}
            disabled={working}
          />
        </FormField>
        <FormField label="Timezone" id="wix-timezone">
          <input
            id="wix-timezone"
            className={inputClass}
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            disabled={working}
          />
        </FormField>
        <FormField label="Resource / staff ID (optional)" id="wix-resource-id">
          <input
            id="wix-resource-id"
            className={inputClass}
            value={resourceId}
            onChange={(e) => setResourceId(e.target.value)}
            disabled={working}
          />
        </FormField>
        <FormField label="Location ID (optional)" id="wix-location-id">
          <input
            id="wix-location-id"
            className={inputClass}
            value={locationId}
            onChange={(e) => setLocationId(e.target.value)}
            disabled={working}
          />
        </FormField>

        <details className="rounded-lg border border-navy-900/10 p-3">
          <summary className="cursor-pointer text-sm font-medium text-navy-800">
            OAuth app credentials (optional alternative to API key)
          </summary>
          <div className="mt-3 space-y-3">
            <FormField label="App ID / Client ID" id="wix-app-id">
              <input
                id="wix-app-id"
                className={inputClass}
                value={appId}
                onChange={(e) => setAppId(e.target.value)}
                disabled={working}
              />
            </FormField>
            <FormField label="App secret" id="wix-app-secret">
              <input
                id="wix-app-secret"
                type="password"
                className={inputClass}
                value={appSecret}
                onChange={(e) => setAppSecret(e.target.value)}
                placeholder={connected ? '•••••••• (leave blank to keep)' : ''}
                disabled={working}
              />
            </FormField>
            <FormField label="Instance ID" id="wix-instance-id">
              <input
                id="wix-instance-id"
                className={inputClass}
                value={instanceId}
                onChange={(e) => setInstanceId(e.target.value)}
                disabled={working}
              />
            </FormField>
          </div>
        </details>

        <div className="flex flex-wrap gap-3 pt-2">
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={working}
            className="inline-flex items-center text-sm font-medium bg-navy-900 text-cream px-4 py-2 rounded-lg hover:bg-navy-800 transition-colors disabled:opacity-60"
          >
            {working ? 'Saving…' : connected ? 'Update Wix Bookings' : 'Connect Wix Bookings'}
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
              {`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/wix-webhook?user_id=${user.id}`}
            </code>
          </p>
        ) : null}
      </div>
    </IntegrationPanel>
  )
}
