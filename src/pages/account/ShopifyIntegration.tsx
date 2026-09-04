import { useCallback, useEffect, useState, type ReactNode } from 'react'
import FormField from '../../components/FormField'
import IntegrationPanel, { oauthIntegrationStatus } from '../../components/IntegrationPanel'
import { ShopifyIcon } from '../../components/IntegrationIcons'
import { inputClass } from '../../constants/forms'
import {
  SHOPIFY_PRODUCTION_REDIRECT_URI,
  SHOPIFY_SCOPES,
  getShopifyRedirectUri,
  isShopifyOAuthConfigured,
} from '../../constants/shopify'
import { useAuth } from '../../context/AuthContext'
import {
  disconnectShopify,
  fetchShopifyConnection,
  normalizeShopDomain,
  startShopifyOAuth,
  type ShopifyConnection,
} from '../../lib/shopify/oauth'

const clientId = import.meta.env.VITE_SHOPIFY_CLIENT_ID ?? ''

type ShopifyIntegrationProps = {
  expanded: boolean
  onToggle: () => void
}

export default function ShopifyIntegration({ expanded, onToggle }: ShopifyIntegrationProps) {
  const { user } = useAuth()
  const [connection, setConnection] = useState<ShopifyConnection | null>(null)
  const [shopInput, setShopInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [copiedField, setCopiedField] = useState<'redirect' | 'client' | null>(null)

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
    if (params.get('shopify_error')) {
      setError(formatShopifyError(params.get('shopify_error') ?? 'Connection failed'))
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
  const redirectUri = getShopifyRedirectUri()
  const normalizedShop = normalizeShopDomain(shopInput)
  const { status, statusLabel } = oauthIntegrationStatus(loading, configured, Boolean(connection))

  async function copyValue(field: 'redirect' | 'client', value: string) {
    await navigator.clipboard.writeText(value)
    setCopiedField(field)
    window.setTimeout(() => setCopiedField(null), 2000)
  }

  return (
    <IntegrationPanel
      title="Shopify"
      icon={<ShopifyIcon />}
      iconWrapperClassName="bg-lime-50"
      status={status}
      statusLabel={statusLabel}
      expanded={expanded}
      onToggle={onToggle}
    >
      <p className="text-sm text-navy-600 mb-6">
        Connect your Shopify store so Clinty can answer product, inventory, and order questions
        from live store data.
      </p>

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

      {configured && (
        <section className="mt-6 pt-6 border-t border-navy-900/5">
          <h3 className="text-sm font-semibold text-navy-900 mb-3">Shopify Partners checklist</h3>
          <p className="text-sm text-navy-600 mb-4">
            Clinty sends this exact redirect URI during OAuth. It must be listed on the{' '}
            <strong>same app</strong> whose Client ID is configured below.
          </p>
          <dl className="space-y-4 text-sm mb-4">
            <SetupRow label="Client ID (verify in Partners)">
              <CopyValue
                value={clientId}
                copied={copiedField === 'client'}
                onCopy={() => copyValue('client', clientId)}
              />
            </SetupRow>
            <SetupRow label="Redirect URL (add in Partners)">
              <CopyValue
                value={redirectUri}
                copied={copiedField === 'redirect'}
                onCopy={() => copyValue('redirect', redirectUri)}
              />
            </SetupRow>
          </dl>
          <ol className="list-decimal list-inside space-y-2 text-sm text-navy-600">
            <li>
              Open{' '}
              <a
                href="https://partners.shopify.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-teal-600 hover:underline"
              >
                partners.shopify.com
              </a>{' '}
              → <strong>Apps</strong> → your Clinty app.
            </li>
            <li>
              Confirm the app&apos;s <strong>Client ID</strong> matches the value above
              {clientId ? (
                <>
                  {' '}
                  (
                  <code className="text-xs bg-cream px-1 py-0.5 rounded">
                    {clientId.slice(0, 8)}…
                  </code>
                  )
                </>
              ) : null}
              .
            </li>
            <li>
              Go to <strong>Versions</strong> → <strong>Create version</strong> (new Dev Dashboard) or{' '}
              <strong>Configuration</strong> (older UI).
            </li>
            <li>
              Set <strong>App URL</strong> to <code className="text-xs bg-cream px-1 py-0.5 rounded">https://clinty.net</code>
            </li>
            <li>
              Add the redirect URL above under <strong>Allowed redirection URL(s)</strong> — one URL
              per line, no trailing slash.
            </li>
            <li>
              <strong>Release</strong> the app version. Saving a draft is not enough.
            </li>
            <li>
              If the app was already installed on your test store, uninstall it there and try Connect
              again.
            </li>
          </ol>
          {import.meta.env.DEV && redirectUri !== SHOPIFY_PRODUCTION_REDIRECT_URI && (
            <p className="text-xs text-navy-600 mt-3">
              Local dev uses <code className="text-xs bg-cream px-1 py-0.5 rounded">{redirectUri}</code>.
              Add that URL in Shopify too if you test on localhost.
            </p>
          )}
          <p className="text-xs text-navy-600 mt-3">
            If you created the app under your store&apos;s{' '}
            <strong>Settings → Apps → Develop apps</strong>, that is a single-store custom app — use
            the redirect URL field in that app&apos;s Configuration instead, or create a{' '}
            <strong>Public app</strong> in Partners for Clinty.
          </p>
        </section>
      )}

      <section className="mt-6 pt-6 border-t border-navy-900/5">
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
    </IntegrationPanel>
  )
}

function formatShopifyError(raw: string): string {
  const decoded = decodeURIComponent(raw)
  if (/redirect_uri.*not whitelisted/i.test(decoded)) {
    return `Shopify rejected the redirect URI. In Partners → your app → Versions, release a version with this exact URL whitelisted: ${SHOPIFY_PRODUCTION_REDIRECT_URI}`
  }
  return decoded
}

function SetupRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-navy-600 mb-1">{label}</dt>
      <dd>{children}</dd>
    </div>
  )
}

function CopyValue({
  value,
  copied,
  onCopy,
}: {
  value: string
  copied: boolean
  onCopy: () => void
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
      <code className="flex-1 text-xs bg-cream px-3 py-2 rounded-lg break-all text-navy-900">
        {value}
      </code>
      <button
        type="button"
        onClick={onCopy}
        className="shrink-0 text-xs font-medium text-teal-600 hover:text-teal-700"
      >
        {copied ? 'Copied!' : 'Copy'}
      </button>
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
