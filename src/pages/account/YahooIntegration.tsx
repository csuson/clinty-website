import { useCallback, useEffect, useState } from 'react'
import { YAHOO_SCOPES, isYahooOAuthConfigured } from '../../constants/yahoo'
import { useAuth } from '../../context/AuthContext'
import {
  disconnectYahoo,
  fetchYahooConnection,
  startYahooOAuth,
  type YahooConnection,
} from '../../lib/yahoo/oauth'

const clientId = import.meta.env.VITE_YAHOO_CLIENT_ID ?? ''

export default function YahooIntegration() {
  const { user } = useAuth()
  const [connection, setConnection] = useState<YahooConnection | null>(null)
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const loadConnection = useCallback(async () => {
    if (!user) {
      setLoading(false)
      return
    }
    const data = await fetchYahooConnection(user.id)
    setConnection(data)
    setLoading(false)
  }, [user])

  useEffect(() => {
    loadConnection()

    const params = new URLSearchParams(window.location.search)
    if (params.get('yahoo_connected') === '1') {
      setSuccess('Yahoo Mail and Calendar connected successfully.')
      window.history.replaceState({}, '', '/account/integrations')
    }
  }, [loadConnection])

  function handleConnect() {
    if (!user || !clientId) return
    setError(null)
    startYahooOAuth(user.id, clientId)
  }

  async function handleDisconnect() {
    setWorking(true)
    setError(null)
    setSuccess(null)
    try {
      await disconnectYahoo()
      setConnection(null)
      setSuccess('Yahoo disconnected.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disconnect Yahoo')
    } finally {
      setWorking(false)
    }
  }

  const configured = isYahooOAuthConfigured()

  return (
    <section className="bg-white rounded-2xl border border-navy-900/5 p-8 shadow-sm">
      <div className="flex items-start gap-4 mb-6">
        <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center shrink-0">
          <svg className="w-7 h-7" viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="#6001D2"
              d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm0 3.2c1.99 0 3.64 1.43 3.98 3.31H8.02C8.36 6.63 10.01 5.2 12 5.2zM7.2 12c0-1.1.35-2.12.94-2.96h7.72A3.78 3.78 0 0 1 16.8 12c0 1.1-.35 2.12-.94 2.96H8.14A3.78 3.78 0 0 1 7.2 12zm4.8 6.8c-1.99 0-3.64-1.43-3.98-3.31h7.96c-.34 1.88-1.99 3.31-3.98 3.31z"
            />
          </svg>
        </div>
        <div>
          <h2 className="text-lg font-semibold text-navy-900 mb-1">Yahoo Mail & Calendar</h2>
          <p className="text-sm text-navy-600">
            Connect your Yahoo account so Clinty can read and respond to email and manage your
            Yahoo Calendar appointments via IMAP and CalDAV.
          </p>
        </div>
      </div>

      {!configured && (
        <div className="rounded-xl bg-amber-400/10 border border-amber-400/20 text-sm px-4 py-3 mb-6 space-y-2">
          <p className="font-medium text-navy-900">Yahoo OAuth not configured</p>
          <p className="text-navy-600">
            Add <code className="text-xs bg-cream px-1 py-0.5 rounded">VITE_YAHOO_CLIENT_ID</code>{' '}
            to your <code className="text-xs bg-cream px-1 py-0.5 rounded">.env</code> and deploy
            the Supabase Edge Functions with your Yahoo client secret.
          </p>
        </div>
      )}

      <div className="rounded-xl bg-cream border border-navy-900/10 text-sm px-4 py-3 mb-6 text-navy-600">
        Yahoo requires approval for mail and calendar scopes. Request developer access at{' '}
        <a
          href="https://senders.yahooinc.com/developer/developer-access/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-teal-600 hover:underline"
        >
          Yahoo Sender Hub
        </a>{' '}
        before connecting production accounts.
      </div>

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
                <dt className="text-navy-600 mb-1">Yahoo account</dt>
                <dd className="font-medium text-navy-900">{connection.yahoo_email ?? '—'}</dd>
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
            {working ? 'Working...' : 'Disconnect Yahoo'}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-navy-600">
            Click below to authorize Clinty. You will be redirected to Yahoo to sign in and grant
            access to your mail and calendar.
          </p>
          <button
            onClick={handleConnect}
            disabled={!configured || working}
            className="inline-flex items-center gap-2 bg-navy-900 text-cream font-medium px-6 py-3 rounded-xl hover:bg-navy-800 transition-colors disabled:opacity-60"
          >
            Connect Yahoo
          </button>
        </div>
      )}

      <div className="mt-8 pt-6 border-t border-navy-900/5">
        <h3 className="text-sm font-semibold text-navy-900 mb-3">Requested permissions</h3>
        <ul className="space-y-2">
          {YAHOO_SCOPES.map((scope) => (
            <li key={scope} className="flex items-start gap-2 text-sm text-navy-600">
              <svg className="w-4 h-4 text-teal-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              {formatScope(scope)}
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

function formatScope(scope: string): string {
  const labels: Record<string, string> = {
    openid: 'Sign in with Yahoo (OpenID Connect)',
    'mail-r': 'Read email via IMAP',
    'mail-w': 'Send and manage email via IMAP/SMTP',
    'ycal-r': 'Read calendar via CalDAV',
    'ycal-w': 'Create and update calendar events via CalDAV',
  }
  return labels[scope] ?? scope
}
