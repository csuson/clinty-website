import { supabase } from '../supabase'
import { getFunctionErrorMessage } from '../supabaseFunctions'

export type WhatsAppConnection = {
  user_id: string
  phone: string | null
  connected_at: string
  status: 'connected' | 'disconnected' | 'pairing' | 'error'
  last_error: string | null
  gateway_url: string | null
}

export type WhatsAppGatewaySettings = {
  gatewayUrl: string | null
  hasApiKey: boolean
  usesDefaultApiKey: boolean
}

export type WhatsAppLoginStatus = {
  status: 'idle' | 'pairing' | 'connected' | 'error' | 'disconnected'
  qrDataUrl: string | null
  phone: string | null
  error: string | null
}

const connectionColumns =
  'user_id, phone, connected_at, status, last_error, gateway_url'

const WHATSAPP_FUNCTION_TIMEOUT_MS = 120_000
const WHATSAPP_STATUS_TIMEOUT_MS = 30_000

export async function fetchWhatsAppGatewaySettings(): Promise<WhatsAppGatewaySettings> {
  if (!supabase) {
    return { gatewayUrl: null, hasApiKey: false, usesDefaultApiKey: false }
  }

  const result = await supabase.functions.invoke('whatsapp-web-login', {
    body: { action: 'get_settings' },
    timeout: WHATSAPP_STATUS_TIMEOUT_MS,
  })

  if (result.error || hasFunctionFailure(result.data)) {
    throw new Error(await getFunctionErrorMessage(result.error, result.data))
  }

  const row = (result.data && typeof result.data === 'object' ? result.data : {}) as Record<
    string,
    unknown
  >
  return {
    gatewayUrl: typeof row.gatewayUrl === 'string' ? row.gatewayUrl : null,
    hasApiKey: row.hasApiKey === true,
    usesDefaultApiKey: row.usesDefaultApiKey === true,
  }
}

export async function saveWhatsAppGateway(
  gatewayUrl: string,
  gatewayApiKey?: string,
): Promise<WhatsAppGatewaySettings> {
  if (!supabase) {
    throw new Error('Supabase is not configured.')
  }

  const result = await supabase.functions.invoke('whatsapp-web-login', {
    body: {
      action: 'save_gateway',
      gatewayUrl,
      ...(gatewayApiKey ? { gatewayApiKey } : {}),
    },
    timeout: WHATSAPP_STATUS_TIMEOUT_MS,
  })

  if (result.error || hasFunctionFailure(result.data)) {
    throw new Error(await getFunctionErrorMessage(result.error, result.data))
  }

  return {
    gatewayUrl: typeof result.data?.gatewayUrl === 'string' ? result.data.gatewayUrl : gatewayUrl,
    hasApiKey: true,
    usesDefaultApiKey: result.data?.usesDefaultApiKey === true,
  }
}

export async function fetchWhatsAppConnection(userId: string): Promise<WhatsAppConnection | null> {
  if (!supabase) return null

  const { data, error } = await supabase
    .from('whatsapp_connections')
    .select(connectionColumns)
    .eq('user_id', userId)
    .in('status', ['connected', 'pairing'])
    .maybeSingle()

  if (error || !data) return null
  return data as WhatsAppConnection
}

export function isWhatsAppGatewayConfigured(settings: WhatsAppGatewaySettings): boolean {
  return Boolean(settings.gatewayUrl && settings.hasApiKey)
}

export async function startWhatsAppLogin(): Promise<WhatsAppLoginStatus> {
  if (!supabase) {
    throw new Error('Supabase is not configured.')
  }

  const result = await supabase.functions.invoke('whatsapp-web-login', {
    body: { action: 'start' },
    timeout: WHATSAPP_FUNCTION_TIMEOUT_MS,
  })

  if (result.error || hasFunctionFailure(result.data)) {
    throw new Error(await getFunctionErrorMessage(result.error, result.data))
  }

  return normalizeLoginStatus(result.data)
}

export async function fetchWhatsAppLoginStatus(): Promise<WhatsAppLoginStatus> {
  if (!supabase) {
    throw new Error('Supabase is not configured.')
  }

  const result = await supabase.functions.invoke('whatsapp-web-login', {
    body: { action: 'status' },
    timeout: WHATSAPP_STATUS_TIMEOUT_MS,
  })

  if (result.error || hasFunctionFailure(result.data)) {
    throw new Error(await getFunctionErrorMessage(result.error, result.data))
  }

  return normalizeLoginStatus(result.data)
}

export async function stopWhatsAppLogin(): Promise<void> {
  if (!supabase) {
    throw new Error('Supabase is not configured.')
  }

  const result = await supabase.functions.invoke('whatsapp-web-login', {
    body: { action: 'stop' },
    timeout: WHATSAPP_STATUS_TIMEOUT_MS,
  })

  if (result.error || hasFunctionFailure(result.data)) {
    throw new Error(await getFunctionErrorMessage(result.error, result.data))
  }
}

export async function disconnectWhatsApp(): Promise<void> {
  if (!supabase) {
    throw new Error('Supabase is not configured.')
  }

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    throw new Error('Your session expired. Sign in again and retry.')
  }

  const result = await supabase.functions.invoke('whatsapp-web-login', {
    body: { action: 'disconnect' },
    timeout: WHATSAPP_STATUS_TIMEOUT_MS,
  })

  if (result.error || hasFunctionFailure(result.data)) {
    throw new Error(await getFunctionErrorMessage(result.error, result.data))
  }
}

/** True when the Edge Function failed (not a WhatsApp status payload with `error: null`). */
function hasFunctionFailure(data: unknown): boolean {
  if (data === null || typeof data !== 'object') return false

  const row = data as Record<string, unknown>
  if ('status' in row || 'qrDataUrl' in row || 'success' in row || 'gatewayUrl' in row || 'usesDefaultApiKey' in row) {
    return false
  }

  return typeof row.error === 'string' && row.error.length > 0
}

function normalizeLoginStatus(data: unknown): WhatsAppLoginStatus {
  const row = (data && typeof data === 'object' ? data : {}) as Record<string, unknown>
  return {
    status: (row.status as WhatsAppLoginStatus['status']) ?? 'idle',
    qrDataUrl: typeof row.qrDataUrl === 'string' ? row.qrDataUrl : null,
    phone: typeof row.phone === 'string' ? row.phone : null,
    error: typeof row.error === 'string' ? row.error : null,
  }
}

function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`
  }
  if (digits.length >= 10) {
    return `+${digits}`
  }
  return phone
}

export function formatWhatsAppLinkError(message: string): string {
  if (!/couldn'?t link device|unable to link|linking device failed/i.test(message)) {
    return message
  }

  return `${message}. This usually means the WhatsApp gateway lost the pairing handshake after the QR scan. Try again with a fresh QR code. If it keeps failing, restart the gateway service and ensure it reconnects after pairing (Baileys disconnect code 515 / restartRequired).`
}

export async function restartWhatsAppLogin(): Promise<WhatsAppLoginStatus> {
  if (!supabase) {
    throw new Error('Supabase is not configured.')
  }

  try {
    await stopWhatsAppLogin()
  } catch {
    // Best-effort cleanup before a new QR session.
  }

  return startWhatsAppLogin()
}

export { formatPhone }
