import { supabase } from '../supabase'
import type { WixConnection } from '../../types/database'

export type { WixConnection }

function requireSupabase() {
  if (!supabase) throw new Error('Supabase is not configured.')
  return supabase
}

export async function fetchWixConnection(userId: string): Promise<WixConnection | null> {
  const client = requireSupabase()
  const { data, error } = await client
    .from('wix_connections')
    .select('user_id, site_id, display_name, service_id, connected_at, status, last_error')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!data || data.status === 'disconnected') return null
  return data as WixConnection
}

export async function connectWix(input: {
  siteId: string
  apiKey: string
  serviceId: string
  appId?: string
  appSecret?: string
  instanceId?: string
  resourceId?: string
  locationId?: string
  timezone?: string
}): Promise<{ assistantReloaded: boolean; assistantReloadError?: string }> {
  const client = requireSupabase()
  const { data: sessionData } = await client.auth.getSession()
  if (!sessionData.session?.access_token) {
    throw new Error('Sign in again to connect Wix Bookings.')
  }

  const result = await client.functions.invoke('wix-connect', {
    body: {
      site_id: input.siteId,
      api_key: input.apiKey,
      service_id: input.serviceId,
      app_id: input.appId ?? '',
      app_secret: input.appSecret ?? '',
      instance_id: input.instanceId ?? '',
      resource_id: input.resourceId ?? '',
      location_id: input.locationId ?? '',
      timezone: input.timezone ?? 'America/Los_Angeles',
    },
  })
  if (result.error) throw new Error(result.error.message || 'Failed to connect Wix Bookings')
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

export async function disconnectWix(): Promise<{
  assistantReloaded: boolean
  assistantReloadError?: string
}> {
  const client = requireSupabase()
  const result = await client.functions.invoke('wix-disconnect', { body: {} })
  if (result.error) throw new Error(result.error.message || 'Failed to disconnect Wix Bookings')
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
