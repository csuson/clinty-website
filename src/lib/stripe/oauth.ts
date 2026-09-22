import {
  STRIPE_OAUTH_STATE_KEY,
  STRIPE_SCOPES,
  getStripeConnectAuthorizeUrl,
  getStripeRedirectUri,
} from '../../constants/stripe'
import { supabase } from '../supabase'
import { getFunctionErrorMessage } from '../supabaseFunctions'

const STRIPE_CONNECT_CLIENT_ID = import.meta.env.VITE_STRIPE_CONNECT_CLIENT_ID ?? ''

export type StripeConnection = {
  user_id: string
  stripe_account_id: string | null
  business_name: string | null
  email: string | null
  country: string | null
  default_currency: string | null
  livemode: boolean
  scopes: string[]
  connected_at: string
  status: 'connected' | 'disconnected' | 'error'
}

function createOAuthState(userId: string): string {
  const nonce = crypto.randomUUID()
  sessionStorage.setItem(
    STRIPE_OAUTH_STATE_KEY,
    JSON.stringify({ nonce, userId, ts: Date.now() }),
  )
  return btoa(JSON.stringify({ nonce, userId }))
}

export function validateOAuthState(state: string, userId: string): boolean {
  try {
    const parsed = JSON.parse(atob(state)) as { nonce?: string; userId?: string }
    const stored = JSON.parse(
      sessionStorage.getItem(STRIPE_OAUTH_STATE_KEY) ?? '{}',
    ) as { nonce?: string; userId?: string; ts?: number }

    sessionStorage.removeItem(STRIPE_OAUTH_STATE_KEY)

    if (!parsed.nonce || !stored.nonce || parsed.nonce !== stored.nonce) return false
    if (parsed.userId !== userId || stored.userId !== userId) return false
    if (!stored.ts || Date.now() - stored.ts > 10 * 60 * 1000) return false
    return true
  } catch {
    return false
  }
}

/** Start Stripe Connect OAuth for merchant payment access */
export function startStripeOAuth(userId: string, clientId: string): void {
  const redirectUri = getStripeRedirectUri()
  const state = createOAuthState(userId)

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    scope: STRIPE_SCOPES.join(' '),
    state,
    redirect_uri: redirectUri,
  })

  window.location.href = `${getStripeConnectAuthorizeUrl()}?${params.toString()}`
}

export async function exchangeStripeCode(code: string, redirectUri: string): Promise<void> {
  if (!supabase) {
    throw new Error('Supabase is not configured.')
  }

  const result = await supabase.functions.invoke('stripe-oauth-exchange', {
    body: {
      code,
      redirectUri,
      clientId: STRIPE_CONNECT_CLIENT_ID,
    },
  })

  if (result.error || (result.data && typeof result.data === 'object' && 'error' in result.data)) {
    throw new Error(await getFunctionErrorMessage(result.error, result.data))
  }
}

export async function fetchStripeConnection(userId: string): Promise<StripeConnection | null> {
  if (!supabase) return null

  const { data, error } = await supabase
    .from('stripe_connections')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'connected')
    .maybeSingle()

  if (error || !data) return null
  return data as StripeConnection
}

export async function disconnectStripe(): Promise<void> {
  if (!supabase) {
    throw new Error('Supabase is not configured.')
  }

  const result = await supabase.functions.invoke('stripe-oauth-disconnect')

  if (result.error || (result.data && typeof result.data === 'object' && 'error' in result.data)) {
    throw new Error(await getFunctionErrorMessage(result.error, result.data))
  }
}
