import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
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
      return json({
        error: 'Your session expired or is invalid. Sign in again and retry.',
      }, 401)
    }

    if (req.method !== 'POST') {
      return json({ error: 'Method not allowed' }, 405)
    }

    const body = await req.json().catch(() => ({}))
    const daysRaw = Number(body.days ?? 30)
    const days = Number.isFinite(daysRaw)
      ? Math.min(365, Math.max(1, Math.floor(daysRaw)))
      : 30

    const assistantUrl = await resolveAssistantUrl(admin, user.id)
    if (!assistantUrl) {
      return json({
        error: 'Assistant deployment URL is not configured. Ask your Clinty admin to set the LangGraph URL in Agent Settings.',
      }, 400)
    }

    const apiKey = await resolveAssistantApiKey(admin, user.id)
    if (!apiKey) {
      return json({
        error: 'No Clinty API key found. Generate one under Account → API Keys and link it in Agent Settings.',
      }, 400)
    }

    const keyFormatError = validateApiKeyFormat(apiKey)
    if (keyFormatError) {
      return json({ error: keyFormatError }, 400)
    }

    const summaryUrl = `${assistantUrl}/analytics/summary?days=${days}`
    const response = await fetch(summaryUrl, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'X-Clinty-Api-Key': apiKey,
        Accept: 'application/json',
      },
    })

    const payload = await response.json().catch(() => ({}))
    if (!response.ok) {
      const detail = typeof payload?.detail === 'string'
        ? payload.detail
        : typeof payload?.error === 'string'
          ? payload.error
          : `Assistant returned ${response.status}`
      const hint = /invalid or missing api key/i.test(detail)
        ? ' Confirm the Clinty API key linked in Agent Settings matches a live key from Account → API Keys. If you edited the key in Admin, paste the full clinty_sk_… value (not a masked preview).'
        : ''
      return json({ error: `${detail}${hint}` }, response.status === 401 ? 401 : 502)
    }

    return json(payload)
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Unexpected error' }, 500)
  }
})

async function resolveAssistantUrl(
  admin: ReturnType<typeof createClient>,
  userId: string,
): Promise<string | null> {
  const { data } = await admin
    .from('agent_settings')
    .select('url')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const fromSettings = normalizeBaseUrl(data?.url)
  if (fromSettings) return fromSettings

  const fallback = normalizeBaseUrl(Deno.env.get('EMAIL_ASSISTANT_API_URL') ?? '')
  return fallback || null
}

async function resolveAssistantApiKey(
  admin: ReturnType<typeof createClient>,
  userId: string,
): Promise<string | null> {
  const { data: settings } = await admin
    .from('agent_settings')
    .select('clinty_api_key_id')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (settings?.clinty_api_key_id) {
    const { data: keyRow } = await admin
      .from('api_keys')
      .select('key_secret')
      .eq('id', settings.clinty_api_key_id)
      .eq('user_id', userId)
      .is('revoked_at', null)
      .maybeSingle()

    const linked = typeof keyRow?.key_secret === 'string' ? keyRow.key_secret.trim() : ''
    if (linked) return linked
  }

  return fetchUserDefaultApiKey(admin, userId)
}

async function fetchUserDefaultApiKey(
  admin: ReturnType<typeof createClient>,
  userId: string,
): Promise<string | null> {
  const { data } = await admin
    .from('api_keys')
    .select('key_secret')
    .eq('user_id', userId)
    .is('revoked_at', null)
    .not('key_secret', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const key = typeof data?.key_secret === 'string' ? data.key_secret.trim() : ''
  return key || null
}

function validateApiKeyFormat(apiKey: string): string | null {
  if (apiKey.includes('•') || apiKey.includes('…')) {
    return 'The linked Clinty API key looks masked or incomplete. In Admin → Agent Settings, paste the full clinty_sk_… key from Account → API Keys.'
  }
  if (!apiKey.startsWith('clinty_sk_')) {
    return 'The linked Clinty API key has an invalid format. Generate a new key under Account → API Keys and link it in Agent Settings.'
  }
  return null
}

function normalizeBaseUrl(raw: unknown): string {
  const trimmed = String(raw ?? '').trim()
  if (!trimmed) return ''

  try {
    const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
    const url = new URL(withProtocol)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return ''
    return `${url.protocol}//${url.host}${url.pathname.replace(/\/$/, '')}`
  } catch {
    return ''
  }
}

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  })
}
