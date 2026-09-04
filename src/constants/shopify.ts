/** Shopify Admin API scopes for inventory and order lookups */
export const SHOPIFY_SCOPES = [
  'read_products',
  'read_inventory',
  'read_orders',
  'read_locations',
] as const

export const SHOPIFY_OAUTH_STATE_KEY = 'shopify_oauth_state'

export const SHOPIFY_API_VERSION = '2024-10'

export const SHOPIFY_OAUTH_CALLBACK_PATH = '/account/integrations/shopify/callback'

/** Canonical production callback — must match Shopify Partners redirect URL list exactly. */
export const SHOPIFY_PRODUCTION_REDIRECT_URI = `https://clinty.net${SHOPIFY_OAUTH_CALLBACK_PATH}`

export function getShopifyRedirectUri(): string {
  const override = import.meta.env.VITE_SHOPIFY_REDIRECT_URI
  if (override) return override
  if (import.meta.env.DEV) {
    return `${window.location.origin}${SHOPIFY_OAUTH_CALLBACK_PATH}`
  }
  return SHOPIFY_PRODUCTION_REDIRECT_URI
}

export function isShopifyOAuthConfigured(): boolean {
  return Boolean(import.meta.env.VITE_SHOPIFY_CLIENT_ID)
}

/** Normalize user input to a *.myshopify.com hostname. */
export function normalizeShopDomain(raw: string): string | null {
  let value = raw.trim().toLowerCase()
  if (!value) return null

  value = value.replace(/^https?:\/\//, '').replace(/\/.*$/, '')
  if (!value.includes('.')) {
    value = `${value}.myshopify.com`
  }

  if (!/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(value)) {
    return null
  }

  return value
}

export function getShopifyAuthorizeUrl(shopDomain: string, clientId: string, state: string): string {
  const redirectUri = getShopifyRedirectUri()
  const params = new URLSearchParams({
    client_id: clientId,
    scope: SHOPIFY_SCOPES.join(','),
    redirect_uri: redirectUri,
    state,
  })

  return `https://${shopDomain}/admin/oauth/authorize?${params.toString()}`
}
