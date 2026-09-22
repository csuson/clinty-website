import { useCallback, useEffect, useState } from 'react'
import IntegrationPanel, { oauthIntegrationStatus } from '../../components/IntegrationPanel'
import { STRIPE_SCOPES, isStripeOAuthConfigured } from '../../constants/stripe'
import { useAuth } from '../../context/AuthContext'
import {
  disconnectStripe,
  fetchStripeConnection,
  startStripeOAuth,
  type StripeConnection,
} from '../../lib/stripe/oauth'

const clientId = import.meta.env.VITE_STRIPE_CONNECT_CLIENT_ID ?? ''

type StripeIntegrationProps = {
  expanded: boolean
  onToggle: () => void
}

export default function StripeIntegration({ expanded, onToggle }: StripeIntegrationProps) {
  const { user } = useAuth()
  const [connection, setConnection] = useState<StripeConnection | null>(null)
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const loadConnection = useCallback(async () => {
    if (!user) {
      setLoading(false)
      return
    }
    const data = await fetchStripeConnection(user.id)
    setConnection(data)
    setLoading(false)
  }, [user])

  useEffect(() => {
    loadConnection()

    const params = new URLSearchParams(window.location.search)
    if (params.get('stripe_connected') === '1') {
      setSuccess('Stripe connected. Your AI agent can create payment links on your Stripe account.')
      window.history.replaceState({}, '', '/account/integrations')
    }
    if (params.get('stripe_error')) {
      setError(decodeURIComponent(params.get('stripe_error') ?? 'Connection failed'))
      window.history.replaceState({}, '', '/account/integrations')
    }
  }, [loadConnection])

  function handleConnect() {
    if (!user || !clientId) return
    setError(null)
    startStripeOAuth(user.id, clientId)
  }

  async function handleDisconnect() {
    setWorking(true)
    setError(null)
    setSuccess(null)
    try {
      await disconnectStripe()
      setConnection(null)
      setSuccess('Stripe disconnected.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disconnect Stripe')
    } finally {
      setWorking(false)
    }
  }

  const configured = isStripeOAuthConfigured()
  const { status, statusLabel } = oauthIntegrationStatus(loading, configured, Boolean(connection))

  return (
    <IntegrationPanel
      title="Stripe"
      icon={(
        <svg className="w-7 h-7 text-cream" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
          <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.434 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.591-7.305z" />
        </svg>
      )}
      iconWrapperClassName="bg-navy-900"
      status={status}
      statusLabel={statusLabel}
      expanded={expanded}
      onToggle={onToggle}
    >
      <p className="text-sm text-navy-600 mb-6">
        Connect your Stripe account so Clinty can create Payment Links and Checkout sessions
        on your behalf for customers.
      </p>

      {!configured && (
        <div className="rounded-xl bg-amber-400/10 border border-amber-400/20 text-sm px-4 py-3 mb-6 space-y-2">
          <p className="font-medium text-navy-900">Stripe Connect not configured</p>
          <p className="text-navy-600">
            Add <code className="text-xs bg-cream px-1 py-0.5 rounded">VITE_STRIPE_CONNECT_CLIENT_ID</code>{' '}
            to your <code className="text-xs bg-cream px-1 py-0.5 rounded">.env</code>. Enable OAuth in
            Stripe at Settings → Connect → Onboarding options → OAuth, then set{' '}
            <code className="text-xs bg-cream px-1 py-0.5 rounded">STRIPE_SECRET_KEY</code> in
            Supabase Edge Function secrets.
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
                <dt className="text-navy-600 mb-1">Email</dt>
                <dd className="font-medium text-navy-900">{connection.email ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-navy-600 mb-1">Stripe account ID</dt>
                <dd className="font-medium text-navy-900 font-mono text-xs break-all">
                  {connection.stripe_account_id ?? '—'}
                </dd>
              </div>
              <div>
                <dt className="text-navy-600 mb-1">Country</dt>
                <dd className="font-medium text-navy-900">{connection.country ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-navy-600 mb-1">Default currency</dt>
                <dd className="font-medium text-navy-900">
                  {connection.default_currency
                    ? connection.default_currency.toUpperCase()
                    : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-navy-600 mb-1">Mode</dt>
                <dd className="font-medium text-navy-900">
                  {connection.livemode ? 'Live' : 'Test'}
                </dd>
              </div>
            </dl>
          </div>
          <button
            onClick={handleDisconnect}
            disabled={working}
            className="text-sm font-medium text-red-600 hover:text-red-700 disabled:opacity-60"
          >
            {working ? 'Working...' : 'Disconnect Stripe'}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-navy-600">
            Authorize Clinty to access your Stripe account. You will be redirected to Stripe
            to sign in and grant permissions.
          </p>
          <button
            onClick={handleConnect}
            disabled={!configured || working}
            className="inline-flex items-center gap-2 bg-navy-900 text-cream font-medium px-6 py-3 rounded-xl hover:bg-navy-800 transition-colors disabled:opacity-60"
          >
            Connect Stripe
          </button>
        </div>
      )}

      <div className="mt-8 pt-6 border-t border-navy-900/5">
        <h3 className="text-sm font-semibold text-navy-900 mb-3">Requested permissions</h3>
        <ul className="space-y-2">
          {STRIPE_SCOPES.map((scope) => (
            <li key={scope} className="flex items-start gap-2 text-sm text-navy-600">
              <svg className="w-4 h-4 text-teal-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              {formatScope(scope)}
            </li>
          ))}
        </ul>
      </div>
    </IntegrationPanel>
  )
}

function formatScope(scope: string): string {
  const labels: Record<string, string> = {
    read_write: 'Create and manage Payment Links, Checkout sessions, and related payment data',
    read_only: 'View Stripe account and payment data',
  }
  return labels[scope] ?? scope
}
