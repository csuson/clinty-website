/**
 * Fetch agent settings JSON using a Clinty API key in the request header.
 * Calls the Supabase Edge Function (not a browser page — API keys cannot be sent via URL bar).
 */
export function getAgentSettingsEndpoint(): string | null {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  if (!supabaseUrl) return null
  return `${supabaseUrl}/functions/v1/agent-settings`
}

export async function fetchAgentSettingsByApiKey(clintyApiKey: string): Promise<Record<string, unknown>> {
  const endpoint = getAgentSettingsEndpoint()
  if (!endpoint) {
    throw new Error('Supabase is not configured.')
  }

  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
  const response = await fetch(endpoint, {
    method: 'GET',
    headers: {
      'X-Clinty-Api-Key': clintyApiKey,
      ...(anonKey ? { apikey: anonKey } : {}),
    },
  })

  const body = await response.json()
  if (!response.ok) {
    const message = typeof body?.error === 'string' ? body.error : `Request failed (${response.status})`
    throw new Error(message)
  }

  return body as Record<string, unknown>
}
