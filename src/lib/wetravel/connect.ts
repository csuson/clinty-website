import { supabase } from '../supabase'
import type { WeTravelConnection } from '../../types/database'

export type { WeTravelConnection }

function requireSupabase() {
  if (!supabase) {
    throw new Error('Supabase is not configured.')
  }
  return supabase
}

export async function fetchWeTravelConnection(userId: string): Promise<WeTravelConnection | null> {
  const client = requireSupabase()
  const { data, error } = await client
    .from('wetravel_connections')
    .select('user_id, display_name, sandbox, connected_at, status, last_error')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }
  if (!data || data.status === 'disconnected') {
    return null
  }
  return data as WeTravelConnection
}

export async function connectWeTravel(input: {
  apiKey: string
  sandbox?: boolean
  displayName?: string
}): Promise<{
  sandbox: boolean
  assistantReloaded: boolean
  assistantReloadError?: string
}> {
  const client = requireSupabase()
  const { data: sessionData } = await client.auth.getSession()
  const accessToken = sessionData.session?.access_token
  if (!accessToken) {
    throw new Error('Sign in again to connect WeTravel.')
  }

  const result = await client.functions.invoke('wetravel-connect', {
    body: {
      api_key: input.apiKey,
      sandbox: Boolean(input.sandbox),
      display_name: input.displayName ?? null,
    },
  })

  if (result.error) {
    throw new Error(result.error.message || 'Failed to connect WeTravel')
  }

  const payload = result.data as {
    error?: string
    sandbox?: boolean
    assistant_reloaded?: boolean
    assistant_reload_error?: string
  }

  if (payload?.error) {
    throw new Error(payload.error)
  }

  return {
    sandbox: Boolean(payload?.sandbox),
    assistantReloaded: Boolean(payload?.assistant_reloaded),
    assistantReloadError: payload?.assistant_reload_error,
  }
}

export async function disconnectWeTravel(): Promise<{
  assistantReloaded: boolean
  assistantReloadError?: string
}> {
  const client = requireSupabase()
  const result = await client.functions.invoke('wetravel-disconnect', { body: {} })
  if (result.error) {
    throw new Error(result.error.message || 'Failed to disconnect WeTravel')
  }
  const payload = result.data as {
    error?: string
    assistant_reloaded?: boolean
    assistant_reload_error?: string
  }
  if (payload?.error) {
    throw new Error(payload.error)
  }
  return {
    assistantReloaded: Boolean(payload?.assistant_reloaded),
    assistantReloadError: payload?.assistant_reload_error,
  }
}
