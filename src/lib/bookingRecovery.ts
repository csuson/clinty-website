import { supabase } from './supabase'
import { getFunctionErrorMessage } from './supabaseFunctions'

export type BookingRecoveryConnectionView = {
  user_id: string
  langgraph_url: string
  has_langgraph_api_key: boolean
  square_merchant_id: string | null
  webhook_token: string | null
  has_webhook_secret: boolean
  enabled: boolean
  updated_at: string | null
}

export type BookingRecoverySettingsResponse = {
  connection: BookingRecoveryConnectionView | null
  gateway_base_url: string | null
  square_webhook_url: string | null
  google_webhook_url: string | null
}

async function invokeBookingRecovery(
  body: Record<string, unknown>,
): Promise<BookingRecoverySettingsResponse> {
  if (!supabase) {
    throw new Error('Supabase is not configured.')
  }

  const result = await supabase.functions.invoke('booking-recovery-settings', {
    body,
  })
  if (result.error || (result.data && typeof result.data === 'object' && 'error' in result.data)) {
    throw new Error(await getFunctionErrorMessage(result.error, result.data))
  }
  return result.data as BookingRecoverySettingsResponse
}

export async function fetchBookingRecoverySettings(): Promise<BookingRecoverySettingsResponse> {
  return invokeBookingRecovery({ action: 'get' })
}

export async function enableBookingRecovery(): Promise<BookingRecoverySettingsResponse> {
  return invokeBookingRecovery({ action: 'enable' })
}

export async function disableBookingRecovery(): Promise<BookingRecoverySettingsResponse> {
  return invokeBookingRecovery({ action: 'disable' })
}

export async function rotateBookingRecoveryToken(): Promise<BookingRecoverySettingsResponse> {
  return invokeBookingRecovery({ action: 'rotate_token' })
}

export async function ensureBookingRecovery(): Promise<BookingRecoverySettingsResponse> {
  return invokeBookingRecovery({ action: 'ensure' })
}
