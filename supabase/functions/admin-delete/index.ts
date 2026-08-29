import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const allowedResources = new Set(['user', 'api_key', 'gmail_token', 'square_token', 'shopify_token', 'agent_settings'])

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

  return { admin, user }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }

  try {
    const auth = await authorizeAdmin(req)
    if ('error' in auth && auth.error) {
      return auth.error
    }

    const { admin, user } = auth
    const body = await req.json()
    const resource = emptyToNull(body.resource)
    const id = emptyToNull(body.id)

    if (!resource || !allowedResources.has(resource)) {
      return json({ error: 'Invalid resource' }, 400)
    }
    if (!id) {
      return json({ error: 'Record id is required' }, 400)
    }

    if (resource === 'user') {
      if (id === user.id) {
        return json({ error: 'You cannot delete your own account from the admin dashboard' }, 400)
      }

      const { error: deleteError } = await admin.auth.admin.deleteUser(id)
      if (deleteError) {
        return json({ error: deleteError.message }, 500)
      }

      return json({ ok: true })
    }

    if (resource === 'api_key') {
      const { error: deleteError } = await admin.from('api_keys').delete().eq('id', id)
      if (deleteError) {
        return json({ error: deleteError.message }, 500)
      }

      return json({ ok: true })
    }

    if (resource === 'gmail_token') {
      const [tokensRes, connectionsRes] = await Promise.all([
        admin.from('gmail_tokens').delete().eq('user_id', id),
        admin.from('gmail_connections').delete().eq('user_id', id),
      ])

      if (tokensRes.error) {
        return json({ error: tokensRes.error.message }, 500)
      }
      if (connectionsRes.error) {
        return json({ error: connectionsRes.error.message }, 500)
      }

      return json({ ok: true })
    }

    if (resource === 'square_token') {
      const [tokensRes, connectionsRes] = await Promise.all([
        admin.from('square_tokens').delete().eq('user_id', id),
        admin.from('square_connections').delete().eq('user_id', id),
      ])

      if (tokensRes.error) {
        return json({ error: tokensRes.error.message }, 500)
      }
      if (connectionsRes.error) {
        return json({ error: connectionsRes.error.message }, 500)
      }

      return json({ ok: true })
    }

    if (resource === 'shopify_token') {
      const [tokensRes, connectionsRes] = await Promise.all([
        admin.from('shopify_tokens').delete().eq('user_id', id),
        admin.from('shopify_connections').delete().eq('user_id', id),
      ])

      if (tokensRes.error) {
        return json({ error: tokensRes.error.message }, 500)
      }
      if (connectionsRes.error) {
        return json({ error: connectionsRes.error.message }, 500)
      }

      return json({ ok: true })
    }

    const { error: deleteError } = await admin.from('agent_settings').delete().eq('id', id)
    if (deleteError) {
      return json({ error: deleteError.message }, 500)
    }

    return json({ ok: true })
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
