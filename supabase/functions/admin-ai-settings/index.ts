import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getPlatformMonthlyLimit } from '../_shared/aiUsage.ts'
import { corsPreflightResponse, getCorsHeaders } from '../_shared/cors.ts'
import { requireAdminMfa } from '../_shared/adminAuth.ts'

let corsHeaders: Record<string, string> = {}

function parseAdminEmails(raw: string | undefined): Set<string> {
  return new Set(
    (raw ?? '')
      .split(',')
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  )
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return corsPreflightResponse(req)
  }

  corsHeaders = getCorsHeaders(req)

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return json({ error: 'Missing authorization header' }, 401)
    }

    const adminEmails = parseAdminEmails(Deno.env.get('ADMIN_EMAILS'))
    if (adminEmails.size === 0) {
      return json({ error: 'Admin access is not configured. Set ADMIN_EMAILS in Supabase secrets.' }, 503)
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
      return json({ error: 'Unauthorized' }, 401)
    }

    if (!user.email || !adminEmails.has(user.email.toLowerCase())) {
      return json({ error: 'Forbidden' }, 403)
    }

    const mfaGate = requireAdminMfa(user.email, authHeader, true)
    if (!mfaGate.ok) {
      return json({ error: mfaGate.error }, mfaGate.status)
    }

    const body = await req.json().catch(() => ({}))
    const action = typeof body.action === 'string' ? body.action : 'get'

    if (action === 'get') {
      const monthly_token_limit = await getPlatformMonthlyLimit(admin)
      return json({ monthly_token_limit })
    }

    if (action === 'update') {
      const limit = Number(body.monthly_token_limit)
      if (!Number.isFinite(limit) || (limit <= 0 && limit !== -1)) {
        return json({ error: 'monthly_token_limit must be a positive number or -1 for unlimited' }, 400)
      }

      const userId = typeof body.user_id === 'string' ? body.user_id : null
      if (userId) {
        const { error } = await admin
          .from('profiles')
          .update({ ai_monthly_token_limit: limit })
          .eq('id', userId)

        if (error) {
          return json({ error: error.message }, 500)
        }

        return json({ user_id: userId, ai_monthly_token_limit: limit })
      }

      const { error } = await admin
        .from('platform_ai_settings')
        .upsert({ id: 1, monthly_token_limit: limit, updated_at: new Date().toISOString() })

      if (error) {
        return json({ error: error.message }, 500)
      }

      return json({ monthly_token_limit: limit })
    }

    if (action === 'clear_user_override') {
      const userId = typeof body.user_id === 'string' ? body.user_id : null
      if (!userId) {
        return json({ error: 'Missing user_id' }, 400)
      }

      const { error } = await admin
        .from('profiles')
        .update({ ai_monthly_token_limit: null })
        .eq('id', userId)

      if (error) {
        return json({ error: error.message }, 500)
      }

      return json({ user_id: userId, ai_monthly_token_limit: null })
    }

    return json({ error: 'Unknown action' }, 400)
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
