import { supabase } from '../supabase'
import type { FluentBookingConnection } from '../../types/database'

export type { FluentBookingConnection }

function requireSupabase() {
  if (!supabase) throw new Error('Supabase is not configured.')
  return supabase
}

export async function fetchFluentBookingConnection(
  userId: string,
): Promise<FluentBookingConnection | null> {
  const client = requireSupabase()
  const { data, error } = await client
    .from('fluentbooking_connections')
    .select('user_id, site_url, display_name, calendar_id, event_id, connected_at, status, last_error')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!data || data.status === 'disconnected') return null
  return data as FluentBookingConnection
}

export async function connectFluentBooking(input: {
  siteUrl: string
  username: string
  appPassword: string
  calendarId: string
  eventId?: string
  timezone?: string
}): Promise<{ assistantReloaded: boolean; assistantReloadError?: string }> {
  const client = requireSupabase()
  const { data: sessionData } = await client.auth.getSession()
  if (!sessionData.session?.access_token) {
    throw new Error('Sign in again to connect FluentBooking.')
  }

  const result = await client.functions.invoke('fluentbooking-connect', {
    body: {
      site_url: input.siteUrl,
      username: input.username,
      app_password: input.appPassword,
      calendar_id: input.calendarId,
      event_id: input.eventId ?? '',
      timezone: input.timezone ?? 'America/Los_Angeles',
    },
  })
  if (result.error) throw new Error(result.error.message || 'Failed to connect FluentBooking')
  const payload = result.data as {
    error?: string
    assistant_reloaded?: boolean
    assistant_reload_error?: string
  }
  if (payload?.error) throw new Error(payload.error)
  return {
    assistantReloaded: Boolean(payload?.assistant_reloaded),
    assistantReloadError: payload?.assistant_reload_error,
  }
}

export async function disconnectFluentBooking(): Promise<{
  assistantReloaded: boolean
  assistantReloadError?: string
}> {
  const client = requireSupabase()
  const result = await client.functions.invoke('fluentbooking-disconnect', { body: {} })
  if (result.error) throw new Error(result.error.message || 'Failed to disconnect FluentBooking')
  const payload = result.data as {
    error?: string
    assistant_reloaded?: boolean
    assistant_reload_error?: string
  }
  if (payload?.error) throw new Error(payload.error)
  return {
    assistantReloaded: Boolean(payload?.assistant_reloaded),
    assistantReloadError: payload?.assistant_reload_error,
  }
}
