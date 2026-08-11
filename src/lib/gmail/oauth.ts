import { GMAIL_OAUTH_STATE_KEY, GMAIL_SCOPES, getGmailRedirectUri } from '../../constants/gmail'
import { supabase } from '../supabase'
import { getFunctionErrorMessage } from '../supabaseFunctions'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? ''
const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'

export type GmailConnection = {
  user_id: string
  google_email: string | null
  scopes: string[]
  connected_at: string
  token_expiry: string | null
  status: 'connected' | 'disconnected' | 'error'
}

export type GmailTokenPayload = {
  token: string
  refresh_token: string | null
  token_uri: string
  client_id: string
  client_secret: string
  scopes: string[]
  universe_domain: string
  account: string
  expiry: string
}

function createOAuthState(userId: string): string {
  const nonce = crypto.randomUUID()
  sessionStorage.setItem(
    GMAIL_OAUTH_STATE_KEY,
    JSON.stringify({ nonce, userId, ts: Date.now() }),
  )
  return btoa(JSON.stringify({ nonce, userId }))
}

export function validateOAuthState(state: string, userId: string): boolean {
  try {
    const parsed = JSON.parse(atob(state)) as { nonce?: string; userId?: string }
    const stored = JSON.parse(
      sessionStorage.getItem(GMAIL_OAUTH_STATE_KEY) ?? '{}',
    ) as { nonce?: string; userId?: string; ts?: number }

    sessionStorage.removeItem(GMAIL_OAUTH_STATE_KEY)

    if (!parsed.nonce || !stored.nonce || parsed.nonce !== stored.nonce) return false
    if (parsed.userId !== userId || stored.userId !== userId) return false
    if (!stored.ts || Date.now() - stored.ts > 10 * 60 * 1000) return false
    return true
  } catch {
    return false
  }
}

/** Start the Google OAuth flow (web port of setup_gmail.py InstalledAppFlow). */
export function startGmailOAuth(userId: string, clientId: string): void {
  const redirectUri = getGmailRedirectUri()
  const state = createOAuthState(userId)

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: GMAIL_SCOPES.join(' '),
    access_type: 'offline',
    prompt: 'consent',
    state,
  })

  window.location.href = `${GOOGLE_AUTH_URL}?${params.toString()}`
}

/** Exchange authorization code via Supabase Edge Function (stores token server-side). */
export async function exchangeGmailCode(code: string, redirectUri: string): Promise<GmailTokenPayload> {
  if (!supabase) {
    throw new Error('Supabase is not configured.')
  }

  const result = await supabase.functions.invoke('gmail-oauth-exchange', {
    body: { code, redirectUri, clientId: GOOGLE_CLIENT_ID },
  })

  if (result.error || (result.data && typeof result.data === 'object' && 'error' in result.data)) {
    throw new Error(await getFunctionErrorMessage(result.error, result.data))
  }

  return result.data.token as GmailTokenPayload
}

export async function fetchGmailConnection(userId: string): Promise<GmailConnection | null> {
  if (!supabase) return null

  const { data, error } = await supabase
    .from('gmail_connections')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'connected')
    .maybeSingle()

  if (error || !data) return null
  return data as GmailConnection
}

export async function disconnectGmail(): Promise<void> {
  if (!supabase) {
    throw new Error('Supabase is not configured.')
  }

  const result = await supabase.functions.invoke('gmail-oauth-disconnect')

  if (result.error || (result.data && typeof result.data === 'object' && 'error' in result.data)) {
    throw new Error(await getFunctionErrorMessage(result.error, result.data))
  }
}

/** Convert a stored gmail_tokens row to setup_gmail.py token.json shape. */
export function gmailTokenToPayload(row: {
  access_token: string
  refresh_token: string | null
  token_uri: string
  client_id: string
  client_secret: string
  scopes: string[]
  universe_domain: string
  google_account: string | null
  expiry: string | null
}): GmailTokenPayload {
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
    universe_domain: row.universe_domain ?? 'googleapis.com',
    account: row.google_account ?? '',
    expiry,
  }
}

/** Trigger browser download of token.json compatible with the Python email assistant. */
export function downloadTokenJson(token: GmailTokenPayload, filename = 'token.json'): void {
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

/** Fetch token in setup_gmail.py token.json format (requires Edge Function). */
export async function fetchGmailToken(): Promise<GmailTokenPayload> {
  if (!supabase) {
    throw new Error('Supabase is not configured.')
  }

  const result = await supabase.functions.invoke('gmail-oauth-download')

  if (result.error || (result.data && typeof result.data === 'object' && 'error' in result.data)) {
    throw new Error(await getFunctionErrorMessage(result.error, result.data))
  }

  return result.data.token as GmailTokenPayload
}

/** Trigger browser download of token.json compatible with the Python email assistant. */
export async function downloadGmailTokenJson(): Promise<void> {
  const token = await fetchGmailToken()
  downloadTokenJson(token)
}
