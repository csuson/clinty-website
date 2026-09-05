import { useCallback, useEffect, useState } from 'react'
import FormField from '../../components/FormField'
import IntegrationPanel from '../../components/IntegrationPanel'
import { ShopifyIcon } from '../../components/IntegrationIcons'
import { inputClass } from '../../constants/forms'
import { SHOPIFY_HEADLESS_APP_URL, normalizeShopDomain } from '../../constants/shopify'
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
      const saved = await saveShopifyStorefront({
        shopDomain: normalizedShop,
        storefrontToken: storefrontToken.trim(),
        tokenType,
      })
      setStorefrontToken('')
      await loadConnection()
      setSuccess(
        saved.assistantReloaded
          ? 'Storefront saved and the email assistant reloaded Shopify credentials.'
          : `Storefront saved. Assistant reload failed: ${saved.assistantReloadError ?? 'unknown error'}`,
      )
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
      const disconnected = await disconnectShopify()
      setConnection(null)
      setShopInput('')
      setStorefrontToken('')
      setSuccess(
        disconnected.assistantReloaded
          ? 'Shopify disconnected and the email assistant cleared Storefront credentials.'
          : 'Shopify disconnected. Restart the email assistant if it still uses the old store.',
      )
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
        Add your store domain and Storefront access token. Clinty uses them when a customer asks
        about products or services on WhatsApp or email — not from this website.
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

          <ShopifyHeadlessSetup />

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
              <option value="public">Public Storefront token (32 characters)</option>
              <option value="private">Private Storefront token (server)</option>
            </select>
          </FormField>

          <p className="text-sm text-navy-600">
            Use the public token from Headless unless you copied the private server token from the
            same storefront page.
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

function ShopifyHeadlessSetup() {
  return (
    <div className="rounded-xl bg-cream border border-navy-900/5 p-5 space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-navy-900 mb-1">Install Headless and copy your token</h3>
        <p className="text-sm text-navy-600">
          Clinty does not install itself from the Shopify App Store. Create a Storefront token with
          Shopify&apos;s free{' '}
          <a
            href={SHOPIFY_HEADLESS_APP_URL}
            target="_blank"
            rel="noreferrer"
            className="text-teal-600 hover:underline"
          >
            Headless
          </a>{' '}
          sales channel, then paste it below.
        </p>
      </div>
      <ol className="text-sm text-navy-600 space-y-3 list-decimal pl-5">
        <li>
          In Shopify admin, go to{' '}
          <strong className="font-medium text-navy-900">Settings → Apps and sales channels</strong>,
          then open the Shopify App Store.
        </li>
        <li>
          Search for <strong className="font-medium text-navy-900">Headless</strong> and click{' '}
          <strong className="font-medium text-navy-900">Install</strong> (or{' '}
          <strong className="font-medium text-navy-900">Add sales channel</strong>). You can also
          open the{' '}
          <a
            href={SHOPIFY_HEADLESS_APP_URL}
            target="_blank"
            rel="noreferrer"
            className="text-teal-600 hover:underline"
          >
            Headless listing
          </a>{' '}
          and install from there.
        </li>
        <li>
          After install, open{' '}
          <strong className="font-medium text-navy-900">Sales channels → Headless</strong>. If it
          is not pinned, search for Headless in the admin search bar.
        </li>
        <li>
          Click <strong className="font-medium text-navy-900">Create storefront</strong> or{' '}
          <strong className="font-medium text-navy-900">Add storefront</strong>. You can rename it
          to Clinty.
        </li>
        <li>
          Next to <strong className="font-medium text-navy-900">Storefront API</strong>, click{' '}
          <strong className="font-medium text-navy-900">Manage</strong>. Copy the{' '}
          <strong className="font-medium text-navy-900">Public access token</strong> (32 characters).
          If you need the server token instead, copy{' '}
          <strong className="font-medium text-navy-900">Private access token</strong> from the same
          page and choose Private below.
        </li>
        <li>
          Publish the products Clinty should look up to the Headless channel:{' '}
          <strong className="font-medium text-navy-900">
            Products → select products → More actions → Add to sales channels → Headless
          </strong>
          .
        </li>
        <li>
          Your store name is the{' '}
          <strong className="font-medium text-navy-900">your-store.myshopify.com</strong> hostname
          under <strong className="font-medium text-navy-900">Settings → Domains</strong>. Enter
          just <strong className="font-medium text-navy-900">your-store</strong> in the field
          below, paste the token, and save.
        </li>
      </ol>
    </div>
  )
}
