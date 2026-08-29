import {
  SHOPIFY_OAUTH_STATE_KEY,
  getShopifyAuthorizeUrl,
  getShopifyRedirectUri,
  normalizeShopDomain,
} from '../../constants/shopify'
import { supabase } from '../supabase'
import { getFunctionErrorMessage } from '../supabaseFunctions'

const SHOPIFY_CLIENT_ID = import.meta.env.VITE_SHOPIFY_CLIENT_ID ?? ''

export type ShopifyConnection = {
  user_id: string
  shop_domain: string | null
  shop_name: string | null
  scopes: string[]
  connected_at: string
  status: 'connected' | 'disconnected' | 'error'
}

export type ShopifyOAuthCallbackQuery = {
  code: string
  shop: string
  hmac: string
  timestamp: string
  host?: string
}

function createOAuthState(userId: string, shopDomain: string): string {
  const nonce = crypto.randomUUID()
  sessionStorage.setItem(
    SHOPIFY_OAUTH_STATE_KEY,
    JSON.stringify({ nonce, userId, shop: shopDomain, ts: Date.now() }),
  )
  return btoa(JSON.stringify({ nonce, userId }))
}

export function validateOAuthState(state: string, userId: string, shop: string): boolean {
  try {
    const parsed = JSON.parse(atob(state)) as { nonce?: string; userId?: string }
    const stored = JSON.parse(
      sessionStorage.getItem(SHOPIFY_OAUTH_STATE_KEY) ?? '{}',
    ) as { nonce?: string; userId?: string; shop?: string; ts?: number }

    sessionStorage.removeItem(SHOPIFY_OAUTH_STATE_KEY)

    const normalizedShop = normalizeShopDomain(shop)
    const normalizedStoredShop = stored.shop ? normalizeShopDomain(stored.shop) : null

    if (!parsed.nonce || !stored.nonce || parsed.nonce !== stored.nonce) return false
    if (parsed.userId !== userId || stored.userId !== userId) return false
    if (!normalizedShop || !normalizedStoredShop || normalizedShop !== normalizedStoredShop) return false
    if (!stored.ts || Date.now() - stored.ts > 10 * 60 * 1000) return false
    return true
  } catch {
    return false
  }
}

export function startShopifyOAuth(userId: string, shopInput: string, clientId: string): void {
  const shopDomain = normalizeShopDomain(shopInput)
  if (!shopDomain) {
    throw new Error('Enter a valid Shopify store domain (e.g. your-store.myshopify.com).')
  }

  const state = createOAuthState(userId, shopDomain)
  window.location.href = getShopifyAuthorizeUrl(shopDomain, clientId, state)
}

export async function exchangeShopifyCode(
  code: string,
  callback: ShopifyOAuthCallbackQuery,
): Promise<void> {
  if (!supabase) {
    throw new Error('Supabase is not configured.')
  }

  const shopDomain = normalizeShopDomain(callback.shop)
  if (!shopDomain) {
    throw new Error('Invalid Shopify store domain in callback.')
  }

  const result = await supabase.functions.invoke('shopify-oauth-exchange', {
    body: {
      code,
      shop: shopDomain,
      clientId: SHOPIFY_CLIENT_ID,
      hmac: callback.hmac,
      timestamp: callback.timestamp,
      host: callback.host ?? null,
    },
  })

  if (result.error || (result.data && typeof result.data === 'object' && 'error' in result.data)) {
    throw new Error(await getFunctionErrorMessage(result.error, result.data))
  }
}

export async function fetchShopifyConnection(userId: string): Promise<ShopifyConnection | null> {
  if (!supabase) return null

  const { data, error } = await supabase
    .from('shopify_connections')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'connected')
    .maybeSingle()

  if (error || !data) return null
  return data as ShopifyConnection
}

export async function disconnectShopify(): Promise<void> {
  if (!supabase) {
    throw new Error('Supabase is not configured.')
  }

  const result = await supabase.functions.invoke('shopify-oauth-disconnect')

  if (result.error || (result.data && typeof result.data === 'object' && 'error' in result.data)) {
    throw new Error(await getFunctionErrorMessage(result.error, result.data))
  }
}

export { getShopifyRedirectUri, normalizeShopDomain }
