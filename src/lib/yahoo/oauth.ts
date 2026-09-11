import {
  YAHOO_AUTH_URL,
  YAHOO_OAUTH_STATE_KEY,
  YAHOO_SCOPES,
  getYahooRedirectUri,
} from '../../constants/yahoo'
import { supabase } from '../supabase'
import { getFunctionErrorMessage } from '../supabaseFunctions'

const YAHOO_CLIENT_ID = import.meta.env.VITE_YAHOO_CLIENT_ID ?? ''

export type YahooConnection = {
  user_id: string
  yahoo_email: string | null
  scopes: string[]
  connected_at: string
  token_expiry: string | null
  status: 'connected' | 'disconnected' | 'error'
}

function createOAuthState(userId: string): { state: string; nonce: string } {
  const nonce = crypto.randomUUID()
  sessionStorage.setItem(
    YAHOO_OAUTH_STATE_KEY,
    JSON.stringify({ nonce, userId, ts: Date.now() }),
  )
  const state = btoa(JSON.stringify({ nonce, userId }))
  return { state, nonce }
}

export function validateOAuthState(state: string, userId: string): boolean {
  try {
    const parsed = JSON.parse(atob(state)) as { nonce?: string; userId?: string }
    const stored = JSON.parse(
      sessionStorage.getItem(YAHOO_OAUTH_STATE_KEY) ?? '{}',
    ) as { nonce?: string; userId?: string; ts?: number }

    sessionStorage.removeItem(YAHOO_OAUTH_STATE_KEY)

    if (!parsed.nonce || !stored.nonce || parsed.nonce !== stored.nonce) return false
    if (parsed.userId !== userId || stored.userId !== userId) return false
    if (!stored.ts || Date.now() - stored.ts > 10 * 60 * 1000) return false
    return true
  } catch {
    return false
  }
}

export function startYahooOAuth(userId: string, clientId: string): void {
  const redirectUri = getYahooRedirectUri()
  const { state, nonce } = createOAuthState(userId)

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: YAHOO_SCOPES.join(' '),
    state,
    nonce,
  })

  window.location.href = `${YAHOO_AUTH_URL}?${params.toString()}`
}

export async function exchangeYahooCode(code: string, redirectUri: string): Promise<void> {
  if (!supabase) {
    throw new Error('Supabase is not configured.')
  }

  const result = await supabase.functions.invoke('yahoo-oauth-exchange', {
    body: { code, redirectUri, clientId: YAHOO_CLIENT_ID },
  })

  if (result.error || (result.data && typeof result.data === 'object' && 'error' in result.data)) {
    throw new Error(await getFunctionErrorMessage(result.error, result.data))
  }
}

export async function fetchYahooConnection(userId: string): Promise<YahooConnection | null> {
  if (!supabase) return null

  const { data, error } = await supabase
    .from('yahoo_connections')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'connected')
    .maybeSingle()

  if (error || !data) return null
  return data as YahooConnection
}

export async function disconnectYahoo(): Promise<void> {
  if (!supabase) {
    throw new Error('Supabase is not configured.')
  }

  const result = await supabase.functions.invoke('yahoo-oauth-disconnect')

  if (result.error || (result.data && typeof result.data === 'object' && 'error' in result.data)) {
    throw new Error(await getFunctionErrorMessage(result.error, result.data))
  }
}
