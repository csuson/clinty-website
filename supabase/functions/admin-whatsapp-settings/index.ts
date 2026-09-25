import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsPreflightResponse, getCorsHeaders } from '../_shared/cors.ts'
import { requireAdminMfa } from '../_shared/adminAuth.ts'
import {  buildWhatsAppInfrastructureUpsert,
  resolveWhatsAppInfrastructure,
  WHATSAPP_INFRA_SELECT,
  type WhatsAppInfrastructureInput,
} from '../_shared/whatsappInfrastructure.ts'
import { loadWebsiteSettings } from '../_shared/websiteInfrastructure.ts'

let corsHeaders: Record<string, string> = {}

function parseAdminEmails(raw: string | undefined): Set<string> {
  return new Set(
    (raw ?? '')
      .split(',')
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  )
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

function parseInput(body: Record<string, unknown>): WhatsAppInfrastructureInput {
  return {
    gateway_url: body.gateway_url,
    gateway_api_key: body.gateway_api_key,
    gateway_debug: body.gateway_debug,
    gateway_auth_backend: body.gateway_auth_backend,
    gateway_auth_bucket: body.gateway_auth_bucket,
    gateway_auth_storage_prefix: body.gateway_auth_storage_prefix,
    gateway_auth_dir: body.gateway_auth_dir,
    gateway_langgraph_url: body.gateway_langgraph_url,
  }
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
    const userId = typeof body.user_id === 'string' ? body.user_id.trim() : ''

    if (!userId) {
      return json({ error: 'user_id is required' }, 400)
    }

    const websiteSettings = await loadWebsiteSettings(admin)

    if (action === 'get') {
      const [{ data: connection }, defaultApiKey, agentSettingsRes] = await Promise.all([
        admin.from('whatsapp_connections').select(WHATSAPP_INFRA_SELECT).eq('user_id', userId).maybeSingle(),
        fetchUserDefaultApiKey(admin, userId),
        admin.from('agent_settings').select('postgres_schema, url').eq('user_id', userId).maybeSingle(),
      ])

      const resolved = resolveWhatsAppInfrastructure(connection, websiteSettings, {
        defaultApiKey,
        postgresSchema: agentSettingsRes.data?.postgres_schema ?? null,
        agentLanggraphUrl: agentSettingsRes.data?.url ?? null,
      })

      const storedGatewayKey =
        typeof connection?.gateway_api_key === 'string' ? connection.gateway_api_key.trim() : ''

      return json({
        user_id: userId,
        gateway_url: connection?.gateway_url ?? null,
        gateway_api_key: storedGatewayKey ? '••••••••' : null,
        has_gateway_api_key: Boolean(storedGatewayKey),
        gateway_debug: connection?.gateway_debug ?? null,
        gateway_auth_backend: connection?.gateway_auth_backend ?? null,
        gateway_auth_bucket: connection?.gateway_auth_bucket ?? null,
        gateway_auth_storage_prefix: connection?.gateway_auth_storage_prefix ?? null,
        gateway_auth_dir: connection?.gateway_auth_dir ?? null,
        gateway_langgraph_url: connection?.gateway_langgraph_url ?? null,
        uses_clinty_api_key: !storedGatewayKey && Boolean(defaultApiKey),
        resolved,
      })
    }

    if (action === 'update') {
      const { data: existing } = await admin
        .from('whatsapp_connections')
        .select(WHATSAPP_INFRA_SELECT)
        .eq('user_id', userId)
        .maybeSingle()

      const apiKeyInput = typeof body.gateway_api_key === 'string' ? body.gateway_api_key.trim() : undefined
      const keepExistingApiKey = apiKeyInput === '' || apiKeyInput === undefined

      const upsertInput = parseInput(body)
      // Default LangGraph URL from agent_settings.url when the admin leaves it blank.
      if (!upsertInput.gateway_langgraph_url) {
        const { data: agentForLanggraph } = await admin
          .from('agent_settings')
          .select('url')
          .eq('user_id', userId)
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        if (typeof agentForLanggraph?.url === 'string' && agentForLanggraph.url.trim()) {
          upsertInput.gateway_langgraph_url = agentForLanggraph.url.trim()
        }
      }

      const upsertRow = buildWhatsAppInfrastructureUpsert(
        userId,
        upsertInput,
        existing,
        { keepExistingApiKey },
      )

      const { error } = await admin.from('whatsapp_connections').upsert(upsertRow)
      if (error) {
        return json({ error: error.message }, 500)
      }

      const defaultApiKey = await fetchUserDefaultApiKey(admin, userId)
      const { data: connection } = await admin
        .from('whatsapp_connections')
        .select(WHATSAPP_INFRA_SELECT)
        .eq('user_id', userId)
        .maybeSingle()

      const { data: agentSettings } = await admin
        .from('agent_settings')
        .select('postgres_schema, url')
        .eq('user_id', userId)
        .maybeSingle()

      const resolved = resolveWhatsAppInfrastructure(connection, websiteSettings, {
        defaultApiKey,
        postgresSchema: agentSettings?.postgres_schema ?? null,
        agentLanggraphUrl: agentSettings?.url ?? null,
      })

      const storedGatewayKey =
        typeof connection?.gateway_api_key === 'string' ? connection.gateway_api_key.trim() : ''

      return json({
        user_id: userId,
        gateway_url: connection?.gateway_url ?? null,
        gateway_api_key: storedGatewayKey ? '••••••••' : null,
        has_gateway_api_key: Boolean(storedGatewayKey),
        gateway_debug: connection?.gateway_debug ?? null,
        gateway_auth_backend: connection?.gateway_auth_backend ?? null,
        gateway_auth_bucket: connection?.gateway_auth_bucket ?? null,
        gateway_auth_storage_prefix: connection?.gateway_auth_storage_prefix ?? null,
        gateway_auth_dir: connection?.gateway_auth_dir ?? null,
        gateway_langgraph_url: connection?.gateway_langgraph_url ?? null,
        uses_clinty_api_key: !storedGatewayKey && Boolean(defaultApiKey),
        resolved,
      })
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
