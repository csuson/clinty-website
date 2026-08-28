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
  })

  if (result.error || (result.data && typeof result.data === 'object' && 'error' in result.data)) {
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
  })

  if (result.error || (result.data && typeof result.data === 'object' && 'error' in result.data)) {
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

  if (result.error || (result.data && typeof result.data === 'object' && 'error' in result.data)) {
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

  if (result.error || (result.data && typeof result.data === 'object' && 'error' in result.data)) {
    throw new Error(await getFunctionErrorMessage(result.error, result.data))
  }
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

export { formatPhone }
