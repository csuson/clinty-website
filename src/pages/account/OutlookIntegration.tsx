import { useCallback, useEffect, useState } from 'react'
import IntegrationPanel, { oauthIntegrationStatus } from '../../components/IntegrationPanel'
import { OutlookIcon } from '../../components/IntegrationIcons'
import { OUTLOOK_SCOPES, isMicrosoftOAuthConfigured } from '../../constants/outlook'
import { useAuth } from '../../context/AuthContext'
import {
  disconnectOutlook,
  fetchOutlookConnection,
  startOutlookOAuth,
  type OutlookConnection,
} from '../../lib/outlook/oauth'

const clientId = import.meta.env.VITE_MICROSOFT_CLIENT_ID ?? ''

type OutlookIntegrationProps = {
  expanded: boolean
  onToggle: () => void
}

export default function OutlookIntegration({ expanded, onToggle }: OutlookIntegrationProps) {
  const { user } = useAuth()
  const [connection, setConnection] = useState<OutlookConnection | null>(null)
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const loadConnection = useCallback(async () => {
    if (!user) {
      setLoading(false)
      return
    }
    const data = await fetchOutlookConnection(user.id)
    setConnection(data)
    setLoading(false)
  }, [user])

  useEffect(() => {
    loadConnection()

    const params = new URLSearchParams(window.location.search)
    if (params.get('outlook_connected') === '1') {
      setSuccess('Microsoft Outlook connected. Your AI agent can now access email and calendar.')
      window.history.replaceState({}, '', '/account/integrations')
    }
    if (params.get('outlook_error')) {
      setError(decodeURIComponent(params.get('outlook_error') ?? 'Connection failed'))
      window.history.replaceState({}, '', '/account/integrations')
    }
  }, [loadConnection])

  function handleConnect() {
    if (!user || !clientId) return
    setError(null)
    startOutlookOAuth(user.id, clientId)
  }

  async function handleDisconnect() {
    setWorking(true)
    setError(null)
    setSuccess(null)
    try {
      await disconnectOutlook()
      setConnection(null)
      setSuccess('Microsoft Outlook disconnected.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disconnect Outlook')
    } finally {
      setWorking(false)
    }
  }

  const configured = isMicrosoftOAuthConfigured()
  const { status, statusLabel } = oauthIntegrationStatus(loading, configured, Boolean(connection))

  return (
    <IntegrationPanel
      title="Microsoft Outlook & Calendar"
      icon={<OutlookIcon />}
      iconWrapperClassName="bg-sky-50"
      status={status}
      statusLabel={statusLabel}
      expanded={expanded}
      onToggle={onToggle}
    >
      <p className="text-sm text-navy-600 mb-2">
        Connect your Microsoft account so Clinty can read and respond to Outlook emails,
        manage your calendar, and schedule appointments via Microsoft Graph.
      </p>
      <p className="text-xs text-navy-600 mb-6">
        Works with Microsoft 365 and Outlook.com mailboxes (Exchange Online). On-premises
        Exchange requires hybrid setup with Microsoft 365.
      </p>

      {!configured && (
          <div className="rounded-xl bg-amber-400/10 border border-amber-400/20 text-sm px-4 py-3 mb-6 space-y-2">
            <p className="font-medium text-navy-900">Microsoft OAuth not configured</p>
            <p className="text-navy-600">
              Add{' '}
              <code className="text-xs bg-cream px-1 py-0.5 rounded">VITE_MICROSOFT_CLIENT_ID</code>{' '}
              to your <code className="text-xs bg-cream px-1 py-0.5 rounded">.env</code> and set{' '}
              <code className="text-xs bg-cream px-1 py-0.5 rounded">MICROSOFT_CLIENT_SECRET</code>{' '}
              in Supabase Edge Function secrets.
            </p>
          </div>
        )}

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
        ) : connection ? (
          <div className="space-y-4">
            <div className="bg-cream rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-2 h-2 rounded-full bg-teal-400" />
                <span className="text-sm font-semibold text-navy-900">Connected</span>
              </div>
              <dl className="grid sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <dt className="text-navy-600 mb-1">Microsoft account</dt>
                  <dd className="font-medium text-navy-900">{connection.outlook_email ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-navy-600 mb-1">Connected</dt>
                  <dd className="font-medium text-navy-900">
                    {new Date(connection.connected_at).toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </dd>
                </div>
                <div>
                  <dt className="text-navy-600 mb-1">Token expires</dt>
                  <dd className="font-medium text-navy-900">
                    {connection.token_expiry
                      ? new Date(connection.token_expiry).toLocaleString()
                      : '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-navy-600 mb-1">Permissions</dt>
                  <dd className="font-medium text-navy-900">{connection.scopes.length} scopes</dd>
                </div>
              </dl>
            </div>
            <button
              onClick={handleDisconnect}
              disabled={working}
              className="text-sm font-medium text-red-600 hover:text-red-700 disabled:opacity-60"
            >
              {working ? 'Working...' : 'Disconnect Outlook'}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-navy-600">
              Click below to authorize Clinty. Choose the Microsoft account for the Outlook mailbox
              you want Clinty to use.
            </p>
            <button
              onClick={handleConnect}
              disabled={!configured || working}
              className="inline-flex items-center gap-2 bg-navy-900 text-cream font-medium px-6 py-3 rounded-xl hover:bg-navy-800 transition-colors disabled:opacity-60"
            >
              <OutlookIcon className="w-5 h-5" />
              Connect Outlook
            </button>
          </div>
        )}

      <section className="mt-6 pt-6 border-t border-navy-900/5">
        <h3 className="text-sm font-semibold text-navy-900 mb-3">Requested permissions</h3>
        <ul className="space-y-2">
          {OUTLOOK_SCOPES.map((scope) => (
            <li key={scope} className="flex items-start gap-2 text-sm text-navy-600">
              <svg className="w-4 h-4 text-teal-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              {formatScope(scope)}
            </li>
          ))}
        </ul>
      </section>
    </IntegrationPanel>
  )
}

function formatScope(scope: string): string {
  const labels: Record<string, string> = {
    openid: 'Sign you in with Microsoft',
    profile: 'Read your basic Microsoft profile',
    'https://graph.microsoft.com/Mail.ReadWrite': 'Read, compose, and manage Outlook mail',
    'https://graph.microsoft.com/Calendars.ReadWrite': 'View and manage Outlook Calendar events',
    'https://graph.microsoft.com/User.Read': 'Read your Microsoft account profile',
    offline_access: 'Maintain access when you are offline (refresh token)',
  }
  return labels[scope] ?? scope
}
