import { supabase } from '../supabase'
import type { LatePointConnection } from '../../types/database'

export type { LatePointConnection }

function requireSupabase() {
  if (!supabase) throw new Error('Supabase is not configured.')
  return supabase
}

export async function fetchLatePointConnection(
  userId: string,
): Promise<LatePointConnection | null> {
  const client = requireSupabase()
  const { data, error } = await client
    .from('latepoint_connections')
    .select('user_id, site_url, display_name, service_id, agent_id, connected_at, status, last_error')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!data || data.status === 'disconnected') return null
  return data as LatePointConnection
}

export async function connectLatePoint(input: {
  siteUrl: string
  apiKey: string
  serviceId: string
  agentId: string
  locationId?: string
  timezone?: string
}): Promise<{ assistantReloaded: boolean; assistantReloadError?: string }> {
  const client = requireSupabase()
  const { data: sessionData } = await client.auth.getSession()
  if (!sessionData.session?.access_token) {
    throw new Error('Sign in again to connect LatePoint.')
  }

  const result = await client.functions.invoke('latepoint-connect', {
    body: {
      site_url: input.siteUrl,
      api_key: input.apiKey,
      service_id: input.serviceId,
      agent_id: input.agentId,
      location_id: input.locationId ?? '',
      timezone: input.timezone ?? 'America/Los_Angeles',
    },
  })
  if (result.error) throw new Error(result.error.message || 'Failed to connect LatePoint')
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

export async function disconnectLatePoint(): Promise<{
  assistantReloaded: boolean
  assistantReloadError?: string
}> {
  const client = requireSupabase()
  const result = await client.functions.invoke('latepoint-disconnect', { body: {} })
  if (result.error) throw new Error(result.error.message || 'Failed to disconnect LatePoint')
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
