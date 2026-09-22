import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { buildUsageSummary } from '../_shared/aiUsage.ts'
import { corsPreflightResponse, getCorsHeaders } from '../_shared/cors.ts'

let corsHeaders: Record<string, string> = {}

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

    const body = await req.json().catch(() => ({}))
    const requestedUserId = typeof body.user_id === 'string' ? body.user_id : user.id

    const adminEmails = new Set(
      (Deno.env.get('ADMIN_EMAILS') ?? '')
        .split(',')
        .map((email) => email.trim().toLowerCase())
        .filter(Boolean),
    )
    const isAdmin = user.email ? adminEmails.has(user.email.toLowerCase()) : false

    if (requestedUserId !== user.id && !isAdmin) {
      return json({ error: 'Forbidden' }, 403)
    }

    const summary = await buildUsageSummary(admin, requestedUserId)
    return json({ ...summary, analytics_user_id: requestedUserId })
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
