import {
  GOOGLE_ADS_OAUTH_STATE_KEY,
  GOOGLE_ADS_SCOPES,
  getGoogleAdsRedirectUri,
} from '../../constants/googleAdsOAuth'
import { supabase } from '../supabase'
import { getFunctionErrorMessage } from '../supabaseFunctions'
import type { PlatformCredentialsStatus } from './credentials'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? ''
const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'

function createOAuthState(userId: string): string {
  const nonce = crypto.randomUUID()
  sessionStorage.setItem(
    GOOGLE_ADS_OAUTH_STATE_KEY,
    JSON.stringify({ nonce, userId, ts: Date.now() }),
  )
  return btoa(JSON.stringify({ nonce, userId }))
}

export function validateOAuthState(state: string, userId: string): boolean {
  try {
    const parsed = JSON.parse(atob(state)) as { nonce?: string; userId?: string }
    const stored = JSON.parse(
      sessionStorage.getItem(GOOGLE_ADS_OAUTH_STATE_KEY) ?? '{}',
    ) as { nonce?: string; userId?: string; ts?: number }

    sessionStorage.removeItem(GOOGLE_ADS_OAUTH_STATE_KEY)

    if (!parsed.nonce || !stored.nonce || parsed.nonce !== stored.nonce) return false
    if (parsed.userId !== userId || stored.userId !== userId) return false
    if (!stored.ts || Date.now() - stored.ts > 10 * 60 * 1000) return false
    return true
  } catch {
    return false
  }
}

/** Start Google Ads OAuth (refresh token for adwords scope). */
export function startGoogleAdsOAuth(userId: string, clientId: string): void {
  const redirectUri = getGoogleAdsRedirectUri()
  const state = createOAuthState(userId)

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: GOOGLE_ADS_SCOPES.join(' '),
    access_type: 'offline',
    prompt: 'consent',
    state,
  })

  window.location.href = `${GOOGLE_AUTH_URL}?${params.toString()}`
}

export async function exchangeGoogleAdsCode(
  code: string,
  redirectUri: string,
): Promise<PlatformCredentialsStatus> {
  if (!supabase) {
    throw new Error('Supabase is not configured.')
  }

  const result = await supabase.functions.invoke('google-ads-oauth-exchange', {
    body: { code, redirectUri, clientId: GOOGLE_CLIENT_ID },
  })

  if (result.error || (result.data && typeof result.data === 'object' && 'error' in result.data)) {
    throw new Error(await getFunctionErrorMessage(result.error, result.data))
  }

  return result.data.platformCredentials as PlatformCredentialsStatus
}

export type GoogleAdsCustomerOption = {
  id: string
  formatted: string
}

export async function listGoogleAdsCustomers(): Promise<GoogleAdsCustomerOption[]> {
  if (!supabase) {
    throw new Error('Supabase is not configured.')
  }

  const result = await supabase.functions.invoke('google-ads-settings', {
    body: { action: 'list_google_customers' },
    timeout: 30_000,
  })

  if (result.error || (result.data && typeof result.data === 'object' && 'error' in result.data)) {
    throw new Error(await getFunctionErrorMessage(result.error, result.data))
  }

  const customers = result.data?.customers
  if (!Array.isArray(customers)) return []
  return customers as GoogleAdsCustomerOption[]
}
