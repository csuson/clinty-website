import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { DEFAULT_RESPONSE_TONE } from '../_shared/promptDefaults.ts'

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

function buildPromptPayload(body: Record<string, unknown>) {
  const userId = emptyToNull(body.user_id)
  if (!userId) {
    return { error: json({ error: 'User is required' }, 400) }
  }

  return {
    payload: {
      user_id: userId,
      background: emptyToNull(body.background),
      calendar_preference: emptyToNull(body.calendar_preference),
      default_footer: emptyToNull(body.default_footer),
      promotions: emptyToNull(body.promotions),
      payment_links: emptyToNull(body.payment_links),
      response_tone: emptyToNull(body.response_tone) ?? DEFAULT_RESPONSE_TONE,
      whatsapp_response_tone: emptyToNull(body.whatsapp_response_tone),
    },
  }
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
    const body = await req.json().catch(() => ({}))
    const built = buildPromptPayload(body)
    if ('error' in built && built.error) {
      return built.error
    }

    const { data: profile, error: profileError } = await admin
      .from('profiles')
      .select('id')
      .eq('id', built.payload.user_id)
      .maybeSingle()

    if (profileError) {
      return json({ error: profileError.message }, 500)
    }
    if (!profile) {
      return json({ error: 'User not found' }, 404)
    }

    const { data: existing } = await admin
      .from('user_prompts')
      .select('user_id')
      .eq('user_id', built.payload.user_id)
      .maybeSingle()

    const write = existing
      ? admin
        .from('user_prompts')
        .update({
          background: built.payload.background,
          calendar_preference: built.payload.calendar_preference,
          default_footer: built.payload.default_footer,
          promotions: built.payload.promotions,
          payment_links: built.payload.payment_links,
          response_tone: built.payload.response_tone,
          whatsapp_response_tone: built.payload.whatsapp_response_tone,
        })
        .eq('user_id', built.payload.user_id)
        .select('*')
        .single()
      : admin
        .from('user_prompts')
        .insert(built.payload)
        .select('*')
        .single()

    const { data, error } = await write
    if (error) {
      return json({ error: error.message }, 500)
    }

    return json({ userPrompts: data })
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
