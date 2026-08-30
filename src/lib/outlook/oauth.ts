import {
  MICROSOFT_AUTH_URL,
  OUTLOOK_OAUTH_STATE_KEY,
  OUTLOOK_SCOPES,
  getOutlookRedirectUri,
} from '../../constants/outlook'
import { supabase } from '../supabase'
import { getFunctionErrorMessage } from '../supabaseFunctions'

const MICROSOFT_CLIENT_ID = import.meta.env.VITE_MICROSOFT_CLIENT_ID ?? ''

export type OutlookConnection = {
  user_id: string
  outlook_email: string | null
  scopes: string[]
  connected_at: string
  token_expiry: string | null
  status: 'connected' | 'disconnected' | 'error'
}

function createOAuthState(userId: string): string {
  const nonce = crypto.randomUUID()
  sessionStorage.setItem(
    OUTLOOK_OAUTH_STATE_KEY,
    JSON.stringify({ nonce, userId, ts: Date.now() }),
  )
  return nonce
}

export function validateOAuthState(state: string, userId: string): boolean {
  try {
    const stored = JSON.parse(
      sessionStorage.getItem(OUTLOOK_OAUTH_STATE_KEY) ?? '{}',
    ) as { nonce?: string; userId?: string; ts?: number }

    sessionStorage.removeItem(OUTLOOK_OAUTH_STATE_KEY)

    if (!state || !stored.nonce || state !== stored.nonce) return false
    if (stored.userId !== userId) return false
    if (!stored.ts || Date.now() - stored.ts > 10 * 60 * 1000) return false
    return true
  } catch {
    return false
  }
}

export function startOutlookOAuth(userId: string, clientId: string): void {
  const redirectUri = getOutlookRedirectUri()
  const state = createOAuthState(userId)

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    response_mode: 'query',
    scope: OUTLOOK_SCOPES.join(' '),
    state,
    prompt: 'select_account',
  })

  window.location.href = `${MICROSOFT_AUTH_URL}?${params.toString()}`
}

export async function exchangeOutlookCode(code: string, redirectUri: string): Promise<void> {
  if (!supabase) {
    throw new Error('Supabase is not configured.')
  }

  const result = await supabase.functions.invoke('outlook-oauth-exchange', {
    body: { code, redirectUri, clientId: MICROSOFT_CLIENT_ID },
  })

  if (result.error || (result.data && typeof result.data === 'object' && 'error' in result.data)) {
    throw new Error(await getFunctionErrorMessage(result.error, result.data))
  }
}

export async function fetchOutlookConnection(userId: string): Promise<OutlookConnection | null> {
  if (!supabase) return null

  const { data, error } = await supabase
    .from('outlook_connections')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'connected')
    .maybeSingle()

  if (error || !data) return null
  return data as OutlookConnection
}

export async function disconnectOutlook(): Promise<void> {
  if (!supabase) {
    throw new Error('Supabase is not configured.')
  }

  const result = await supabase.functions.invoke('outlook-oauth-disconnect')

  if (result.error || (result.data && typeof result.data === 'object' && 'error' in result.data)) {
    throw new Error(await getFunctionErrorMessage(result.error, result.data))
  }
}

export type OutlookTokenPayload = {
  token: string
  refresh_token: string | null
  token_uri: string
  client_id: string
  client_secret: string
  scopes: string[]
  account: string
  expiry: string
}

/** Convert a stored outlook_tokens row to token.json shape for agent runtimes. */
export function outlookTokenToPayload(row: {
  access_token: string
  refresh_token: string | null
  token_uri: string
  client_id: string
  client_secret: string
  scopes: string[]
  outlook_account: string | null
  expiry: string | null
}): OutlookTokenPayload {
  const expiry = row.expiry
    ? new Date(row.expiry).toISOString().replace(/\.\d{3}Z$/, 'Z')
    : ''

  return {
    token: row.access_token,
    refresh_token: row.refresh_token,
    token_uri: row.token_uri,
    client_id: row.client_id,
    client_secret: row.client_secret,
    scopes: row.scopes,
    account: row.outlook_account ?? '',
    expiry,
  }
}

/** Trigger browser download of token.json for Outlook / Microsoft Graph. */
export function downloadOutlookTokenJson(token: OutlookTokenPayload, filename = 'outlook-token.json'): void {
  const blob = new Blob([JSON.stringify(token, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
