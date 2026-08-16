import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-clinty-api-key, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
}

async function hashApiKey(key: string): Promise<string> {
  const data = new TextEncoder().encode(key)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, '0')).join('')
}

function extractClintyApiKey(req: Request): string | null {
  const explicitHeader =
    req.headers.get('X-Clinty-Api-Key') ??
    req.headers.get('x-clinty-api-key')

  if (explicitHeader?.trim()) {
    return explicitHeader.trim()
  }

  const authorization = req.headers.get('Authorization')
  if (authorization?.startsWith('Bearer ')) {
    const token = authorization.slice('Bearer '.length).trim()
    return token.length > 0 ? token : null
  }

  return null
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'GET') {
    return json({ error: 'Method not allowed' }, 405)
  }

  try {
    const clintyApiKey = extractClintyApiKey(req)
    if (!clintyApiKey) {
      return json({
        error: 'Missing Clinty API key. Send X-Clinty-Api-Key or Authorization: Bearer <clinty_api_key>.',
      }, 401)
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const keyHash = await hashApiKey(clintyApiKey)

    const { data: apiKeyRow, error: apiKeyError } = await admin
      .from('api_keys')
      .select('id, revoked_at')
      .eq('key_hash', keyHash)
      .maybeSingle()

    if (apiKeyError) {
      return json({ error: apiKeyError.message }, 500)
    }

    if (!apiKeyRow || apiKeyRow.revoked_at) {
      return json({ error: 'Invalid or revoked Clinty API key' }, 401)
    }

    const { data: agentSettings, error: settingsError } = await admin
      .from('agent_settings')
      .select('*')
      .eq('clinty_api_key_id', apiKeyRow.id)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (settingsError) {
      return json({ error: settingsError.message }, 500)
    }

    if (!agentSettings) {
      return json({ error: 'No agent settings found for this API key' }, 404)
    }

    return json(agentSettings)
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Unexpected error' }, 500)
  }
})

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  })
}
