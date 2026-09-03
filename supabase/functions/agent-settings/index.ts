import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { resolveUserPrompts } from '../_shared/promptDefaults.ts'

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

    const { data: apiKeyRows, error: apiKeyError } = await admin
      .from('api_keys')
      .select('id, user_id, revoked_at')
      .eq('key_hash', keyHash)
      .is('revoked_at', null)
      .order('created_at', { ascending: true })
      .limit(1)

    if (apiKeyError) {
      return json({ error: apiKeyError.message }, 500)
    }

    const apiKeyRow = apiKeyRows?.[0] ?? null

    if (!apiKeyRow) {
      return json({ error: 'Invalid or revoked Clinty API key' }, 401)
    }

    let agentSettings = await loadAgentSettingsForApiKey(admin, apiKeyRow.id, apiKeyRow.user_id)

    if (!agentSettings) {
      const { data: userPrompts } = await admin
        .from('user_prompts')
        .select('background, calendar_preference, default_footer')
        .eq('user_id', apiKeyRow.user_id)
        .maybeSingle()

      if (!userPrompts) {
        return json({ error: 'No agent settings found for this API key' }, 404)
      }

      const prompts = resolveUserPrompts(userPrompts)
      return json({
        user_id: apiKeyRow.user_id,
        clinty_api_key_id: apiKeyRow.id,
        prompts,
        prompt_background: prompts.background,
        prompt_calendar_preference: prompts.calendar_preference,
        email_footer: prompts.default_footer,
      })
    }

    const { data: userPrompts } = await admin
      .from('user_prompts')
      .select('background, calendar_preference, default_footer')
      .eq('user_id', agentSettings.user_id)
      .maybeSingle()

    const prompts = resolveUserPrompts(userPrompts)

    return json({
      ...serializeRow(agentSettings),
      prompts,
      // Flat keys for env / agent runtimes that map directly to email_assistant variables.
      prompt_background: prompts.background,
      prompt_calendar_preference: prompts.calendar_preference,
      email_footer: prompts.default_footer,
    })
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Unexpected error' }, 500)
  }
})

async function loadAgentSettingsForApiKey(
  admin: ReturnType<typeof createClient>,
  apiKeyId: string,
  userId: string,
) {
  const { data: linkedRows, error: linkedError } = await admin
    .from('agent_settings')
    .select('*')
    .eq('clinty_api_key_id', apiKeyId)
    .order('updated_at', { ascending: false })
    .limit(1)

  if (linkedError) {
    throw new Error(linkedError.message)
  }

  if (linkedRows?.[0]) {
    return linkedRows[0]
  }

  const { data: userRows, error: userError } = await admin
    .from('agent_settings')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(1)

  if (userError) {
    throw new Error(userError.message)
  }

  return userRows?.[0] ?? null
}

function serializeRow(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(row)) {
    out[key] = typeof value === 'bigint' ? value.toString() : value
  }
  return out
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
