import { supabase } from '../supabase'
import { getFunctionErrorMessage } from '../supabaseFunctions'

export type WhatsAppConnection = {
  user_id: string
  phone: string | null
  connected_at: string
  status: 'connected' | 'disconnected' | 'pairing' | 'error'
  last_error: string | null
}

export type WhatsAppLoginStatus = {
  status: 'idle' | 'pairing' | 'connected' | 'error' | 'disconnected'
  qrDataUrl: string | null
  phone: string | null
  error: string | null
}

export async function fetchWhatsAppConnection(userId: string): Promise<WhatsAppConnection | null> {
  if (!supabase) return null

  const { data, error } = await supabase
    .from('whatsapp_connections')
    .select('*')
    .eq('user_id', userId)
    .in('status', ['connected', 'pairing'])
    .maybeSingle()

  if (error || !data) return null
  return data as WhatsAppConnection
}

export async function startWhatsAppLogin(): Promise<WhatsAppLoginStatus> {
  if (!supabase) {
    throw new Error('Supabase is not configured.')
  }

  const result = await supabase.functions.invoke('whatsapp-web-login', {
    body: { action: 'start' },
    timeout: 90_000,
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
    timeout: 45_000,
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
  })

  if (result.error || hasFunctionFailure(result.data)) {
    throw new Error(await getFunctionErrorMessage(result.error, result.data))
  }
}

export async function disconnectWhatsApp(): Promise<void> {
  if (!supabase) {
    throw new Error('Supabase is not configured.')
  }

  const result = await supabase.functions.invoke('whatsapp-web-login', {
    body: { action: 'disconnect' },
  })

  if (result.error || hasFunctionFailure(result.data)) {
    throw new Error(await getFunctionErrorMessage(result.error, result.data))
  }
}

/** True when the Edge Function failed (not a WhatsApp status payload with `error: null`). */
function hasFunctionFailure(data: unknown): boolean {
  if (data === null || typeof data !== 'object') return false

  const row = data as Record<string, unknown>
  if ('status' in row || 'qrDataUrl' in row || 'success' in row) return false

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
