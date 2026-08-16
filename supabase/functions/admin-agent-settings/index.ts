import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, PUT, OPTIONS',
}

function parseAdminEmails(raw: string | undefined): Set<string> {
  return new Set(
    (raw ?? '')
      .split(',')
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  )
}

function isAdminEmail(email: string | undefined, adminEmails: Set<string>): boolean {
  if (!email) return false
  return adminEmails.has(email.toLowerCase())
}

function emptyToNull(value: unknown): string | null {
  if (value === undefined || value === null) return null
  const trimmed = String(value).trim()
  return trimmed.length > 0 ? trimmed : null
}

async function authorizeAdmin(req: Request) {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return { error: json({ error: 'Missing authorization header' }, 401) }
  }

  const adminEmails = parseAdminEmails(Deno.env.get('ADMIN_EMAILS'))
  if (adminEmails.size === 0) {
    return { error: json({ error: 'Admin access is not configured. Set ADMIN_EMAILS in Supabase secrets.' }, 503) }
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: authHeader } } },
  )

  const admin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  )

  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) {
    return { error: json({ error: 'Unauthorized' }, 401) }
  }

  if (!isAdminEmail(user.email, adminEmails)) {
    return { error: json({ error: 'Forbidden' }, 403) }
  }

  return { admin }
}

async function buildPayload(body: Record<string, unknown>) {
  const userId = emptyToNull(body.user_id)
  const name = emptyToNull(body.name)

  if (!userId) {
    return { error: json({ error: 'User is required' }, 400) }
  }
  if (!name) {
    return { error: json({ error: 'Name is required' }, 400) }
  }

  const squareVersionRaw = body.square_service_variation_version
  const squareServiceVariationVersion =
    squareVersionRaw === undefined || squareVersionRaw === null || String(squareVersionRaw).trim() === ''
      ? null
      : Number(squareVersionRaw)

  if (squareServiceVariationVersion !== null && Number.isNaN(squareServiceVariationVersion)) {
    return { error: json({ error: 'Square service variation version must be a number' }, 400) }
  }

  return {
    payload: {
      user_id: userId,
      name,
      clinty_api_key_id: emptyToNull(body.clinty_api_key_id),
      langgraph_api_key: emptyToNull(body.langgraph_api_key),
      url: emptyToNull(body.url),
      graph_id: emptyToNull(body.graph_id),
      openapi_key: emptyToNull(body.openapi_key),
      database_uri: emptyToNull(body.database_uri),
      redis_uri: emptyToNull(body.redis_uri),
      secrets_dir: emptyToNull(body.secrets_dir),
      calendar_provider: emptyToNull(body.calendar_provider),
      square_access_token: emptyToNull(body.square_access_token),
      square_location_id: emptyToNull(body.square_location_id),
      square_service_variation_id: emptyToNull(body.square_service_variation_id),
      square_service_variation_version: squareServiceVariationVersion,
      square_team_member_id: emptyToNull(body.square_team_member_id),
      square_timezone: emptyToNull(body.square_timezone),
    },
  }
}

async function validateApiKeyOwnership(
  admin: ReturnType<typeof createClient>,
  userId: string,
  clintyApiKeyId: string | null,
) {
  if (!clintyApiKeyId) return null

  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('id')
    .eq('id', userId)
    .maybeSingle()

  if (profileError) {
    return json({ error: profileError.message }, 500)
  }
  if (!profile) {
    return json({ error: 'User not found' }, 400)
  }

  const { data: apiKey, error: apiKeyError } = await admin
    .from('api_keys')
    .select('id, user_id, revoked_at')
    .eq('id', clintyApiKeyId)
    .maybeSingle()

  if (apiKeyError) {
    return json({ error: apiKeyError.message }, 500)
  }
  if (!apiKey || apiKey.user_id !== userId) {
    return json({ error: 'Clinty API key must belong to the selected user' }, 400)
  }
  if (apiKey.revoked_at) {
    return json({ error: 'Clinty API key is revoked' }, 400)
  }

  return null
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST' && req.method !== 'PUT') {
    return json({ error: 'Method not allowed' }, 405)
  }

  try {
    const auth = await authorizeAdmin(req)
    if ('error' in auth && auth.error) {
      return auth.error
    }

    const { admin } = auth
    const body = await req.json()

    const built = await buildPayload(body)
    if ('error' in built && built.error) {
      return built.error
    }

    const { payload } = built
    const apiKeyError = await validateApiKeyOwnership(admin, payload.user_id, payload.clinty_api_key_id)
    if (apiKeyError) {
      return apiKeyError
    }

    if (req.method === 'POST') {
      const settingsId = emptyToNull(body.id)
      if (settingsId) {
        const { data: existing, error: existingError } = await admin
          .from('agent_settings')
          .select('id')
          .eq('id', settingsId)
          .maybeSingle()

        if (existingError) {
          return json({ error: existingError.message }, 500)
        }
        if (!existing) {
          return json({ error: 'Agent settings not found' }, 404)
        }

        const { data, error: updateError } = await admin
          .from('agent_settings')
          .update(payload)
          .eq('id', settingsId)
          .select('*')
          .single()

        if (updateError) {
          return json({ error: updateError.message }, 500)
        }

        return json({ agentSettings: data })
      }

      const { data, error: insertError } = await admin
        .from('agent_settings')
        .insert(payload)
        .select('*')
        .single()

      if (insertError) {
        return json({ error: insertError.message }, 500)
      }

      return json({ agentSettings: data })
    }

    const settingsId = emptyToNull(body.id)
    if (!settingsId) {
      return json({ error: 'Agent settings id is required' }, 400)
    }

    const { data: existing, error: existingError } = await admin
      .from('agent_settings')
      .select('id')
      .eq('id', settingsId)
      .maybeSingle()

    if (existingError) {
      return json({ error: existingError.message }, 500)
    }
    if (!existing) {
      return json({ error: 'Agent settings not found' }, 404)
    }

    const { data, error: updateError } = await admin
      .from('agent_settings')
      .update(payload)
      .eq('id', settingsId)
      .select('*')
      .single()

    if (updateError) {
      return json({ error: updateError.message }, 500)
    }

    return json({ agentSettings: data })
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Unexpected error' }, 500)
  }
})

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
