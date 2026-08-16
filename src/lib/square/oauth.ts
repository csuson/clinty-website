import {
  SQUARE_OAUTH_STATE_KEY,
  SQUARE_SCOPES,
  getSquareConnectHost,
  getSquareRedirectUri,
  isSquareSandbox,
} from '../../constants/square'
import { supabase } from '../supabase'
import { getFunctionErrorMessage } from '../supabaseFunctions'

const SQUARE_APPLICATION_ID = import.meta.env.VITE_SQUARE_APPLICATION_ID ?? ''

export type SquareConnection = {
  user_id: string
  merchant_id: string | null
  business_name: string | null
  location_id: string | null
  location_name: string | null
  timezone: string | null
  scopes: string[]
  connected_at: string
  token_expiry: string | null
  status: 'connected' | 'disconnected' | 'error'
}

function createOAuthState(userId: string): string {
  const nonce = crypto.randomUUID()
  sessionStorage.setItem(
    SQUARE_OAUTH_STATE_KEY,
    JSON.stringify({ nonce, userId, ts: Date.now() }),
  )
  return btoa(JSON.stringify({ nonce, userId }))
}

export function validateOAuthState(state: string, userId: string): boolean {
  try {
    const parsed = JSON.parse(atob(state)) as { nonce?: string; userId?: string }
    const stored = JSON.parse(
      sessionStorage.getItem(SQUARE_OAUTH_STATE_KEY) ?? '{}',
    ) as { nonce?: string; userId?: string; ts?: number }

    sessionStorage.removeItem(SQUARE_OAUTH_STATE_KEY)

    if (!parsed.nonce || !stored.nonce || parsed.nonce !== stored.nonce) return false
    if (parsed.userId !== userId || stored.userId !== userId) return false
    if (!stored.ts || Date.now() - stored.ts > 10 * 60 * 1000) return false
    return true
  } catch {
    return false
  }
}

/** Start Square OAuth for merchant Appointments calendar access */
export function startSquareOAuth(userId: string, applicationId: string): void {
  const redirectUri = getSquareRedirectUri()
  const state = createOAuthState(userId)

  const params = new URLSearchParams({
    client_id: applicationId,
    scope: SQUARE_SCOPES.join(' '),
    session: 'false',
    state,
    redirect_uri: redirectUri,
  })

  window.location.href = `${getSquareConnectHost()}/oauth2/authorize?${params.toString()}`
}

export async function exchangeSquareCode(code: string, redirectUri: string): Promise<void> {
  if (!supabase) {
    throw new Error('Supabase is not configured.')
  }

  const result = await supabase.functions.invoke('square-oauth-exchange', {
    body: {
      code,
      redirectUri,
      applicationId: SQUARE_APPLICATION_ID,
      sandbox: isSquareSandbox(),
    },
  })

  if (result.error || (result.data && typeof result.data === 'object' && 'error' in result.data)) {
    throw new Error(await getFunctionErrorMessage(result.error, result.data))
  }
}

export async function fetchSquareConnection(userId: string): Promise<SquareConnection | null> {
  if (!supabase) return null

  const { data, error } = await supabase
    .from('square_connections')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'connected')
    .maybeSingle()

  if (error || !data) return null
  return data as SquareConnection
}

export async function disconnectSquare(): Promise<void> {
  if (!supabase) {
    throw new Error('Supabase is not configured.')
  }

  const result = await supabase.functions.invoke('square-oauth-disconnect')

  if (result.error || (result.data && typeof result.data === 'object' && 'error' in result.data)) {
    throw new Error(await getFunctionErrorMessage(result.error, result.data))
  }
}
