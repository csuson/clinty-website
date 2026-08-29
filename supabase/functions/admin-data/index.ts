import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { resolveUserPrompts } from '../_shared/promptDefaults.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
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

    if (!isAdminEmail(user.email, adminEmails)) {
      return json({ error: 'Forbidden' }, 403)
    }

    const [profilesRes, apiKeysRes, gmailTokensRes, squareTokensRes, squareConnectionsRes, shopifyTokensRes, shopifyConnectionsRes, agentSettingsRes, userPromptsRes] =
      await Promise.all([
      admin.from('profiles').select('*').order('created_at', { ascending: false }),
      admin.from('api_keys').select('*').order('created_at', { ascending: false }),
      admin.from('gmail_tokens').select('*').order('updated_at', { ascending: false }),
      admin.from('square_tokens').select('*').order('updated_at', { ascending: false }),
      admin.from('square_connections').select('*').order('connected_at', { ascending: false }),
      admin.from('shopify_tokens').select('*').order('updated_at', { ascending: false }),
      admin.from('shopify_connections').select('*').order('connected_at', { ascending: false }),
      admin.from('agent_settings').select('*').order('created_at', { ascending: false }),
      admin.from('user_prompts').select('*'),
    ])

    if (profilesRes.error) {
      return json({ error: profilesRes.error.message }, 500)
    }
    if (apiKeysRes.error) {
      return json({ error: apiKeysRes.error.message }, 500)
    }
    if (gmailTokensRes.error) {
      return json({ error: gmailTokensRes.error.message }, 500)
    }
    if (squareTokensRes.error) {
      return json({ error: squareTokensRes.error.message }, 500)
    }
    if (squareConnectionsRes.error) {
      return json({ error: squareConnectionsRes.error.message }, 500)
    }
    if (shopifyTokensRes.error) {
      return json({ error: shopifyTokensRes.error.message }, 500)
    }
    if (shopifyConnectionsRes.error) {
      return json({ error: shopifyConnectionsRes.error.message }, 500)
    }
    if (agentSettingsRes.error) {
      return json({ error: agentSettingsRes.error.message }, 500)
    }
    if (userPromptsRes.error) {
      return json({ error: userPromptsRes.error.message }, 500)
    }

    const emailByUserId = new Map(
      (profilesRes.data ?? []).map((profile) => [profile.id, profile.email]),
    )
    const apiKeyById = new Map(
      (apiKeysRes.data ?? []).map((key) => [key.id, key]),
    )
    const squareConnectionByUserId = new Map(
      (squareConnectionsRes.data ?? []).map((connection) => [connection.user_id, connection]),
    )
    const shopifyConnectionByUserId = new Map(
      (shopifyConnectionsRes.data ?? []).map((connection) => [connection.user_id, connection]),
    )
    const promptsByUserId = new Map(
      (userPromptsRes.data ?? []).map((prompts) => [prompts.user_id, prompts]),
    )

    const users = profilesRes.data ?? []
    const apiKeys = (apiKeysRes.data ?? []).map((key) => ({
      ...key,
      user_email: emailByUserId.get(key.user_id) ?? null,
    }))
    const gmailTokens = (gmailTokensRes.data ?? []).map((token) => ({
      ...token,
      user_email: emailByUserId.get(token.user_id) ?? null,
    }))
    const squareTokens = (squareTokensRes.data ?? []).map((token) => {
      const connection = squareConnectionByUserId.get(token.user_id) ?? null
      return {
        ...token,
        user_email: emailByUserId.get(token.user_id) ?? null,
        business_name: connection?.business_name ?? null,
        location_id: connection?.location_id ?? null,
        location_name: connection?.location_name ?? null,
        team_member_id: connection?.team_member_id ?? null,
        timezone: connection?.timezone ?? null,
        connection_status: connection?.status ?? null,
      }
    })
    const shopifyTokens = (shopifyTokensRes.data ?? []).map((token) => {
      const connection = shopifyConnectionByUserId.get(token.user_id) ?? null
      return {
        ...token,
        user_email: emailByUserId.get(token.user_id) ?? null,
        shop_name: connection?.shop_name ?? null,
        connected_at: connection?.connected_at ?? null,
        connection_status: connection?.status ?? null,
      }
    })
    const agentSettings = (agentSettingsRes.data ?? []).map((settings) => {
      const linkedApiKey = settings.clinty_api_key_id
        ? apiKeyById.get(settings.clinty_api_key_id) ?? null
        : null
      const prompts = resolveUserPrompts(promptsByUserId.get(settings.user_id) ?? null)

      return {
        ...settings,
        user_email: emailByUserId.get(settings.user_id) ?? null,
        clinty_api_key_name: linkedApiKey?.name ?? null,
        clinty_api_key_secret: linkedApiKey?.key_secret ?? null,
        prompt_background: prompts.background,
        prompt_calendar_preference: prompts.calendar_preference,
        prompt_default_footer: prompts.default_footer,
      }
    })

    return json({ users, apiKeys, gmailTokens, squareTokens, shopifyTokens, agentSettings })
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
