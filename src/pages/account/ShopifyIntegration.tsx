import { useCallback, useEffect, useState } from 'react'
import FormField from '../../components/FormField'
import IntegrationPanel from '../../components/IntegrationPanel'
import { ShopifyIcon } from '../../components/IntegrationIcons'
import { inputClass } from '../../constants/forms'
import { normalizeShopDomain } from '../../constants/shopify'
import { useAuth } from '../../context/AuthContext'
import { disconnectShopify, fetchShopifyConnection, type ShopifyConnection } from '../../lib/shopify/oauth'
import { saveShopifyStorefront } from '../../lib/shopify/storefrontSettings'

type ShopifyIntegrationProps = {
  expanded: boolean
  onToggle: () => void
}

export default function ShopifyIntegration({ expanded, onToggle }: ShopifyIntegrationProps) {
  const { user } = useAuth()
  const [connection, setConnection] = useState<ShopifyConnection | null>(null)
  const [shopInput, setShopInput] = useState('')
  const [storefrontToken, setStorefrontToken] = useState('')
  const [tokenType, setTokenType] = useState<'public' | 'private'>('public')
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
  }, [loadConnection])

  const normalizedShop = normalizeShopDomain(shopInput)
  const connected = Boolean(connection?.storefront_ready && connection.shop_domain)
  const status = loading
    ? { status: 'loading' as const, statusLabel: 'Checking…' }
    : connected
      ? { status: 'connected' as const, statusLabel: 'Connected' }
      : { status: 'disconnected' as const, statusLabel: 'Not connected' }

  async function handleSave() {
    if (!normalizedShop) return
    setWorking(true)
    setError(null)
    setSuccess(null)
    try {
      await saveShopifyStorefront({
        shopDomain: normalizedShop,
        storefrontToken: storefrontToken.trim(),
        tokenType,
      })
      setStorefrontToken('')
      await loadConnection()
      setSuccess('Storefront saved. WhatsApp and email can now look up products and services.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save Shopify Storefront settings.')
    } finally {
      setWorking(false)
    }
  }

  async function handleDisconnect() {
    setWorking(true)
    setError(null)
    setSuccess(null)
    try {
      await disconnectShopify()
      setConnection(null)
      setShopInput('')
      setStorefrontToken('')
      setSuccess('Shopify disconnected.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disconnect Shopify')
    } finally {
      setWorking(false)
    }
  }

  return (
    <IntegrationPanel
      title="Shopify"
      icon={<ShopifyIcon />}
      iconWrapperClassName="bg-lime-50"
      status={status.status}
      statusLabel={status.statusLabel}
      expanded={expanded}
      onToggle={onToggle}
    >
      <p className="text-sm text-navy-600 mb-6">
        Add your Storefront domain and access token. Clinty uses them when a customer asks about
        products or services on WhatsApp or email — not from this website.
      </p>

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
      ) : (
        <div className="space-y-4">
          {connected && (
            <div className="bg-cream rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-2 h-2 rounded-full bg-teal-400" />
                <span className="text-sm font-semibold text-navy-900">Storefront connected</span>
              </div>
              <p className="text-sm text-navy-900 font-medium">{connection?.shop_domain}</p>
            </div>
          )}

          <FormField label="Shopify store" id="shopify-shop-domain">
            <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
              <input
                id="shopify-shop-domain"
                type="text"
                placeholder="your-store"
                value={shopInput}
                onChange={(event) => setShopInput(event.target.value)}
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

          <FormField label="Storefront access token" id="shopify-storefront-token">
            <input
              id="shopify-storefront-token"
              type="password"
              autoComplete="off"
              placeholder={connected ? 'Enter a new token to replace the saved one' : 'Public or private Storefront token'}
              value={storefrontToken}
              onChange={(event) => setStorefrontToken(event.target.value)}
              className={inputClass}
              disabled={working}
            />
          </FormField>

          <FormField label="Token type" id="shopify-token-type">
            <select
              id="shopify-token-type"
              value={tokenType}
              onChange={(event) => setTokenType(event.target.value === 'private' ? 'private' : 'public')}
              className={inputClass}
              disabled={working}
            >
              <option value="public">Public (32-character Headless token)</option>
              <option value="private">Private (server token, often starts with shpat_)</option>
            </select>
          </FormField>

          <p className="text-sm text-navy-600">
            Create a token in Shopify admin → Headless channel → your storefront. Use the public
            token unless you generated a private one for server use.
          </p>

          <div className="flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={handleSave}
              disabled={working || !normalizedShop || (!storefrontToken.trim() && !connected)}
              className="inline-flex items-center gap-2 bg-navy-900 text-cream font-medium px-6 py-3 rounded-xl hover:bg-navy-800 transition-colors disabled:opacity-60"
            >
              <ShopifyIcon className="w-5 h-5" />
              {connected ? 'Update Storefront' : 'Save Storefront'}
            </button>
            {connected && (
              <button
                type="button"
                onClick={handleDisconnect}
                disabled={working}
                className="text-sm font-medium text-red-600 hover:text-red-700 disabled:opacity-60"
              >
                {working ? 'Working...' : 'Disconnect Shopify'}
              </button>
            )}
          </div>
        </div>
      )}
    </IntegrationPanel>
  )
}
