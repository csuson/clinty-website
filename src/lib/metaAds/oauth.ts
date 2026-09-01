import {
  META_ADS_OAUTH_STATE_KEY,
  META_ADS_PICKER_KEY,
  META_ADS_SCOPES,
  META_AUTH_URL,
  getMetaAdsRedirectUri,
} from '../../constants/metaAds'
import { supabase } from '../supabase'
import { getFunctionErrorMessage } from '../supabaseFunctions'
import type { PlatformCredentialsStatus } from '../googleAds/credentials'

const META_APP_ID = import.meta.env.VITE_META_APP_ID ?? ''

export type MetaAdAccountOption = {
  id: string
  name: string
  accountId: string
}

export type MetaPageOption = {
  id: string
  name: string
}

export type MetaOAuthPickerData = {
  adAccounts: MetaAdAccountOption[]
  pages: MetaPageOption[]
}

function createOAuthState(userId: string): string {
  const nonce = crypto.randomUUID()
  sessionStorage.setItem(
    META_ADS_OAUTH_STATE_KEY,
    JSON.stringify({ nonce, userId, ts: Date.now() }),
  )
  return btoa(JSON.stringify({ nonce, userId }))
}

export function validateOAuthState(state: string, userId: string): boolean {
  try {
    const parsed = JSON.parse(atob(state)) as { nonce?: string; userId?: string }
    const stored = JSON.parse(
      sessionStorage.getItem(META_ADS_OAUTH_STATE_KEY) ?? '{}',
    ) as { nonce?: string; userId?: string; ts?: number }

    sessionStorage.removeItem(META_ADS_OAUTH_STATE_KEY)

    if (!parsed.nonce || !stored.nonce || parsed.nonce !== stored.nonce) return false
    if (parsed.userId !== userId || stored.userId !== userId) return false
    if (!stored.ts || Date.now() - stored.ts > 10 * 60 * 1000) return false
    return true
  } catch {
    return false
  }
}

/** Start Meta OAuth for Marketing API access. */
export function startMetaAdsOAuth(userId: string, appId: string): void {
  const redirectUri = getMetaAdsRedirectUri()
  const state = createOAuthState(userId)

  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: META_ADS_SCOPES.join(','),
    state,
  })

  window.location.href = `${META_AUTH_URL}?${params.toString()}`
}

export async function exchangeMetaAdsCode(
  code: string,
  redirectUri: string,
): Promise<{ platformCredentials: PlatformCredentialsStatus; picker: MetaOAuthPickerData }> {
  if (!supabase) {
    throw new Error('Supabase is not configured.')
  }

  const result = await supabase.functions.invoke('meta-oauth-exchange', {
    body: { code, redirectUri, appId: META_APP_ID },
  })

  if (result.error || (result.data && typeof result.data === 'object' && 'error' in result.data)) {
    throw new Error(await getFunctionErrorMessage(result.error, result.data))
  }

  return {
    platformCredentials: result.data.platformCredentials as PlatformCredentialsStatus,
    picker: {
      adAccounts: Array.isArray(result.data.adAccounts) ? result.data.adAccounts : [],
      pages: Array.isArray(result.data.pages) ? result.data.pages : [],
    },
  }
}

export function storeMetaOAuthPicker(picker: MetaOAuthPickerData): void {
  sessionStorage.setItem(META_ADS_PICKER_KEY, JSON.stringify(picker))
}

export function readMetaOAuthPicker(): MetaOAuthPickerData | null {
  try {
    const raw = sessionStorage.getItem(META_ADS_PICKER_KEY)
    if (!raw) return null
    sessionStorage.removeItem(META_ADS_PICKER_KEY)
    const parsed = JSON.parse(raw) as MetaOAuthPickerData
    if (!parsed || typeof parsed !== 'object') return null
    return {
      adAccounts: Array.isArray(parsed.adAccounts) ? parsed.adAccounts : [],
      pages: Array.isArray(parsed.pages) ? parsed.pages : [],
    }
  } catch {
    return null
  }
}
