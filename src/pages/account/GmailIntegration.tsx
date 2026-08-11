import { useCallback, useEffect, useState } from 'react'
import { GMAIL_SCOPES, isGoogleOAuthConfigured } from '../../constants/gmail'
import { useAuth } from '../../context/AuthContext'
import {
  disconnectGmail,
  downloadGmailTokenJson,
  fetchGmailConnection,
  startGmailOAuth,
  type GmailConnection,
} from '../../lib/gmail/oauth'

const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? ''

export default function GmailIntegration() {
  const { user } = useAuth()
  const [connection, setConnection] = useState<GmailConnection | null>(null)
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const loadConnection = useCallback(async () => {
    if (!user) {
      setLoading(false)
      return
    }
    const data = await fetchGmailConnection(user.id)
    setConnection(data)
    setLoading(false)
  }, [user])

  useEffect(() => {
    loadConnection()

    const params = new URLSearchParams(window.location.search)
    if (params.get('connected') === '1') {
      setSuccess('Gmail connected successfully. Your AI agent can now access email and calendar.')
      window.history.replaceState({}, '', '/account/integrations')
    }
    if (params.get('error')) {
      const raw = params.get('error') ?? 'Connection failed'
      const message =
        raw === 'redirect_uri_mismatch'
          ? 'Redirect URI mismatch. Contact support if this continues.'
          : decodeURIComponent(raw)
      setError(message)
      window.history.replaceState({}, '', '/account/integrations')
    }
  }, [loadConnection])

  function handleConnect() {
    if (!user || !clientId) return
    setError(null)
    startGmailOAuth(user.id, clientId)
  }

  async function handleDownloadToken() {
    setWorking(true)
    setError(null)
    setSuccess(null)
    try {
      await downloadGmailTokenJson()
      setSuccess('token.json downloaded. Store it securely — it contains your OAuth credentials.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download token.json')
    } finally {
      setWorking(false)
    }
  }

  async function handleDisconnect() {
    setWorking(true)
    setError(null)
    setSuccess(null)
    try {
      await disconnectGmail()
      setConnection(null)
      setSuccess('Gmail disconnected.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disconnect Gmail')
    } finally {
      setWorking(false)
    }
  }

  const configured = isGoogleOAuthConfigured()

  return (
    <div className="space-y-6">
      <section className="bg-white rounded-2xl border border-navy-900/5 p-8 shadow-sm">
        <div className="flex items-start gap-4 mb-6">
          <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
            <svg className="w-7 h-7" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="#EA4335"
                d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z"
              />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-navy-900 mb-1">Gmail & Google Calendar</h2>
            <p className="text-sm text-navy-600">
              Connect your Google account so Clinty can read and respond to emails, manage your
              calendar, and schedule appointments — the same permissions as the desktop setup
              script.
            </p>
          </div>
        </div>

        {!configured && (
          <div className="rounded-xl bg-amber-400/10 border border-amber-400/20 text-sm px-4 py-3 mb-6 space-y-2">
            <p className="font-medium text-navy-900">Google OAuth not configured</p>
            <p className="text-navy-600">
              Add <code className="text-xs bg-cream px-1 py-0.5 rounded">VITE_GOOGLE_CLIENT_ID</code>{' '}
              to your <code className="text-xs bg-cream px-1 py-0.5 rounded">.env</code> and deploy
              the Supabase Edge Functions with your Google client secret.
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
                  <dt className="text-navy-600 mb-1">Google account</dt>
                  <dd className="font-medium text-navy-900">{connection.google_email ?? '—'}</dd>
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
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleDownloadToken}
                disabled={working}
                className="inline-flex items-center justify-center gap-2 border border-navy-900/15 text-navy-900 font-medium px-5 py-2.5 rounded-xl hover:bg-navy-900/5 transition-colors text-sm disabled:opacity-60"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                {working ? 'Preparing...' : 'Download token.json'}
              </button>
              <button
                onClick={handleDisconnect}
                disabled={working}
                className="text-sm font-medium text-red-600 hover:text-red-700 disabled:opacity-60 self-center sm:self-auto"
              >
                {working ? 'Working...' : 'Disconnect Gmail'}
              </button>
            </div>
            <p className="text-xs text-navy-600">
              Download a <code className="bg-cream px-1 py-0.5 rounded">token.json</code> file
              compatible with the Python email assistant setup script. Keep this file private.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-navy-600">
              Click below to authorize Clinty. A Google sign-in window will open to grant access to
              your inbox and calendar.
            </p>
            <button
              onClick={handleConnect}
              disabled={!configured || working}
              className="inline-flex items-center gap-2 bg-navy-900 text-cream font-medium px-6 py-3 rounded-xl hover:bg-navy-800 transition-colors disabled:opacity-60"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="currentColor"
                  d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 11.73l-6.545 4.91V11.73H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z"
                />
              </svg>
              Connect Gmail
            </button>
          </div>
        )}
      </section>

      <section className="bg-white rounded-2xl border border-navy-900/5 p-8 shadow-sm">
        <h3 className="text-sm font-semibold text-navy-900 mb-3">Requested permissions</h3>
        <ul className="space-y-2">
          {GMAIL_SCOPES.map((scope) => (
            <li key={scope} className="flex items-start gap-2 text-sm text-navy-600">
              <svg className="w-4 h-4 text-teal-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              {formatScope(scope)}
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

function formatScope(scope: string): string {
  const labels: Record<string, string> = {
    'https://www.googleapis.com/auth/gmail.modify': 'Read, compose, and manage Gmail messages',
    'https://www.googleapis.com/auth/calendar': 'View and manage Google Calendar events',
  }
  return labels[scope] ?? scope
}
