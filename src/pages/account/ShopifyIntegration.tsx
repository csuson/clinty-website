import { useCallback, useEffect, useState } from 'react'
import FormField from '../../components/FormField'
import { ShopifyIcon } from '../../components/IntegrationIcons'
import { inputClass } from '../../constants/forms'
import { SHOPIFY_SCOPES, isShopifyOAuthConfigured } from '../../constants/shopify'
import { useAuth } from '../../context/AuthContext'
import {
  disconnectShopify,
  fetchShopifyConnection,
  normalizeShopDomain,
  startShopifyOAuth,
  type ShopifyConnection,
} from '../../lib/shopify/oauth'

const clientId = import.meta.env.VITE_SHOPIFY_CLIENT_ID ?? ''

export default function ShopifyIntegration() {
  const { user } = useAuth()
  const [connection, setConnection] = useState<ShopifyConnection | null>(null)
  const [shopInput, setShopInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const loadConnection = useCallback(async () => {
    if (!user) {
      setLoading(false)
      return
    }
    const data = await fetchShopifyConnection(user.id)
    setConnection(data)
    if (data?.shop_domain) {
      setShopInput(data.shop_domain.replace(/\.myshopify\.com$/, ''))
    }
    setLoading(false)
  }, [user])

  useEffect(() => {
    loadConnection()

    const params = new URLSearchParams(window.location.search)
    if (params.get('shopify_connected') === '1') {
      setSuccess('Shopify connected. Your AI agent can now check products, inventory, and orders.')
      window.history.replaceState({}, '', '/account/integrations')
    }
    if (params.get('error')) {
      setError(decodeURIComponent(params.get('error') ?? 'Connection failed'))
      window.history.replaceState({}, '', '/account/integrations')
    }
  }, [loadConnection])

  function handleConnect() {
    if (!user || !clientId) return

    setError(null)
    setSuccess(null)

    try {
      startShopifyOAuth(user.id, shopInput, clientId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start Shopify authorization')
    }
  }

  async function handleDisconnect() {
    setWorking(true)
    setError(null)
    setSuccess(null)
    try {
      await disconnectShopify()
      setConnection(null)
      setSuccess('Shopify disconnected.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disconnect Shopify')
    } finally {
      setWorking(false)
    }
  }

  const configured = isShopifyOAuthConfigured()
  const normalizedShop = normalizeShopDomain(shopInput)

  return (
    <div className="space-y-6">
      <section className="bg-white rounded-2xl border border-navy-900/5 p-8 shadow-sm">
        <div className="flex items-start gap-4 mb-6">
          <div className="w-12 h-12 rounded-xl bg-lime-50 flex items-center justify-center shrink-0">
            <ShopifyIcon />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-navy-900 mb-1">Shopify</h2>
            <p className="text-sm text-navy-600">
              Connect your Shopify store so Clinty can answer product, inventory, and order questions
              from live store data.
            </p>
          </div>
        </div>

        {!configured && (
          <div className="rounded-xl bg-amber-400/10 border border-amber-400/20 text-sm px-4 py-3 mb-6 space-y-2">
            <p className="font-medium text-navy-900">Shopify OAuth not configured</p>
            <p className="text-navy-600">
              Add{' '}
              <code className="text-xs bg-cream px-1 py-0.5 rounded">VITE_SHOPIFY_CLIENT_ID</code>{' '}
              to your <code className="text-xs bg-cream px-1 py-0.5 rounded">.env</code> and set{' '}
              <code className="text-xs bg-cream px-1 py-0.5 rounded">SHOPIFY_CLIENT_SECRET</code>{' '}
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
                  <dt className="text-navy-600 mb-1">Store</dt>
                  <dd className="font-medium text-navy-900">{connection.shop_name ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-navy-600 mb-1">Shop domain</dt>
                  <dd className="font-medium text-navy-900">{connection.shop_domain ?? '—'}</dd>
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
              {working ? 'Working...' : 'Disconnect Shopify'}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <FormField label="Shopify store" id="shopify-shop-domain">
              <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                <input
                  id="shopify-shop-domain"
                  type="text"
                  placeholder="your-store"
                  value={shopInput}
                  onChange={(e) => setShopInput(e.target.value)}
                  className={inputClass}
                  disabled={working}
                />
                <span className="text-sm text-navy-600 shrink-0">.myshopify.com</span>
              </div>
            </FormField>
            {shopInput.trim() && !normalizedShop && (
              <p className="text-sm text-red-600">
                Enter a valid store name (letters, numbers, and hyphens only).
              </p>
            )}
            <p className="text-sm text-navy-600">
              Enter your store domain, then authorize Clinty in Shopify Admin.
            </p>
            <button
              onClick={handleConnect}
              disabled={!configured || working || !normalizedShop}
              className="inline-flex items-center gap-2 bg-navy-900 text-cream font-medium px-6 py-3 rounded-xl hover:bg-navy-800 transition-colors disabled:opacity-60"
            >
              <ShopifyIcon className="w-5 h-5" />
              Connect Shopify
            </button>
          </div>
        )}
      </section>

      <section className="bg-white rounded-2xl border border-navy-900/5 p-8 shadow-sm">
        <h3 className="text-sm font-semibold text-navy-900 mb-3">Requested permissions</h3>
        <ul className="space-y-2">
          {SHOPIFY_SCOPES.map((scope) => (
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
    read_products: 'Read products and variants',
    read_inventory: 'Read inventory levels',
    read_orders: 'Read customer orders',
    read_locations: 'Read store locations',
  }
  return labels[scope] ?? scope
}
