import { useCallback, useEffect, useState } from 'react'
import { SQUARE_SCOPES, isSquareOAuthConfigured } from '../../constants/square'
import { useAuth } from '../../context/AuthContext'
import {
  disconnectSquare,
  fetchSquareConnection,
  startSquareOAuth,
  type SquareConnection,
} from '../../lib/square/oauth'

const applicationId = import.meta.env.VITE_SQUARE_APPLICATION_ID ?? ''

export default function SquareIntegration() {
  const { user } = useAuth()
  const [connection, setConnection] = useState<SquareConnection | null>(null)
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const loadConnection = useCallback(async () => {
    if (!user) {
      setLoading(false)
      return
    }
    const data = await fetchSquareConnection(user.id)
    setConnection(data)
    setLoading(false)
  }, [user])

  useEffect(() => {
    loadConnection()

    const params = new URLSearchParams(window.location.search)
    if (params.get('square_connected') === '1') {
      setSuccess('Square Appointments connected. Your AI agent can now manage your booking calendar.')
      window.history.replaceState({}, '', '/account/integrations')
    }
  }, [loadConnection])

  function handleConnect() {
    if (!user || !applicationId) return
    setError(null)
    startSquareOAuth(user.id, applicationId)
  }

  async function handleDisconnect() {
    setWorking(true)
    setError(null)
    setSuccess(null)
    try {
      await disconnectSquare()
      setConnection(null)
      setSuccess('Square Appointments disconnected.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disconnect Square')
    } finally {
      setWorking(false)
    }
  }

  const configured = isSquareOAuthConfigured()

  return (
    <section className="bg-white rounded-2xl border border-navy-900/5 p-8 shadow-sm">
      <div className="flex items-start gap-4 mb-6">
        <div className="w-12 h-12 rounded-xl bg-navy-900 flex items-center justify-center shrink-0">
          <svg className="w-7 h-7 text-cream" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
            <path d="M4.01 0A4.01 4.01 0 0 0 0 4.01v15.98A4.01 4.01 0 0 0 4.01 24h15.98A4.01 4.01 0 0 0 24 19.99V4.01A4.01 4.01 0 0 0 19.99 0H4.01zm9.66 4.39c1.01 0 1.83.82 1.83 1.83s-.82 1.83-1.83 1.83-1.83-.82-1.83-1.83.82-1.83 1.83-1.83zm-5.66 2.74h11.32v1.83H8.01V7.13zm0 3.66h11.32v1.83H8.01v-1.83zm0 3.66h7.55v1.83H8.01v-1.83z" />
          </svg>
        </div>
        <div>
          <h2 className="text-lg font-semibold text-navy-900 mb-1">Square Appointments</h2>
          <p className="text-sm text-navy-600">
            Connect your Square merchant account so Clinty can read availability, book appointments,
            and manage your Square Appointments calendar on your behalf.
          </p>
        </div>
      </div>

      {!configured && (
        <div className="rounded-xl bg-amber-400/10 border border-amber-400/20 text-sm px-4 py-3 mb-6 space-y-2">
          <p className="font-medium text-navy-900">Square OAuth not configured</p>
          <p className="text-navy-600">
            Add <code className="text-xs bg-cream px-1 py-0.5 rounded">VITE_SQUARE_APPLICATION_ID</code>{' '}
            to your <code className="text-xs bg-cream px-1 py-0.5 rounded">.env</code> and deploy
            the Supabase Edge Functions with your Square application secret.
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
                <dt className="text-navy-600 mb-1">Business</dt>
                <dd className="font-medium text-navy-900">{connection.business_name ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-navy-600 mb-1">Location</dt>
                <dd className="font-medium text-navy-900">{connection.location_name ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-navy-600 mb-1">Timezone</dt>
                <dd className="font-medium text-navy-900">{connection.timezone ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-navy-600 mb-1">Token expires</dt>
                <dd className="font-medium text-navy-900">
                  {connection.token_expiry
                    ? new Date(connection.token_expiry).toLocaleString()
                    : '—'}
                </dd>
              </div>
            </dl>
          </div>
          <button
            onClick={handleDisconnect}
            disabled={working}
            className="text-sm font-medium text-red-600 hover:text-red-700 disabled:opacity-60"
          >
            {working ? 'Working...' : 'Disconnect Square'}
          </button>
          <p className="text-xs text-navy-600">
            Seller-level booking writes require Square Appointments Plus or Premium on your Square account.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-navy-600">
            Authorize Clinty to access your Square Appointments calendar. You will be redirected to
            Square to sign in and grant permissions.
          </p>
          <button
            onClick={handleConnect}
            disabled={!configured || working}
            className="inline-flex items-center gap-2 bg-navy-900 text-cream font-medium px-6 py-3 rounded-xl hover:bg-navy-800 transition-colors disabled:opacity-60"
          >
            Connect Square Appointments
          </button>
        </div>
      )}

      <div className="mt-8 pt-6 border-t border-navy-900/5">
        <h3 className="text-sm font-semibold text-navy-900 mb-3">Requested permissions</h3>
        <ul className="space-y-2">
          {SQUARE_SCOPES.map((scope) => (
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
    MERCHANT_PROFILE_READ: 'View merchant profile and locations',
    APPOINTMENTS_READ: 'Read appointment details',
    APPOINTMENTS_WRITE: 'Create and update appointments',
    APPOINTMENTS_ALL_READ: 'Read full seller calendar and business settings',
    APPOINTMENTS_ALL_WRITE: 'Manage all seller appointments',
    APPOINTMENTS_BUSINESS_SETTINGS_READ: 'Read booking profiles and availability settings',
  }
  return labels[scope] ?? scope
}
