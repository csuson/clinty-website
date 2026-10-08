import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsPreflightResponse, getCorsHeaders } from '../_shared/cors.ts'
import { requireAdminMfa } from '../_shared/adminAuth.ts'
import {
  BOOKING_RECOVERY_SELECT,
  buildRecoveryUrls,
  emptyToNull,
  generateWebhookToken,
  normalizeLanggraphUrl,
  publicBookingRecoveryView,
  resolveBookingRecoveryGatewayUrl,
} from '../_shared/bookingRecoveryInfrastructure.ts'
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
    const gatewayBase = resolveBookingRecoveryGatewayUrl(websiteSettings)

    if (action === 'get') {
      const [{ data: connection }, agentRes] = await Promise.all([
        admin.from('booking_recovery_connections').select(BOOKING_RECOVERY_SELECT).eq('user_id', userId).maybeSingle(),
        admin.from('agent_settings').select('url').eq('user_id', userId).maybeSingle(),
      ])

      const urls = buildRecoveryUrls(gatewayBase, connection?.webhook_token)
      return json({
        ...publicBookingRecoveryView(connection),
        user_id: userId,
        agent_langgraph_url: agentRes.data?.url ?? null,
        gateway_base_url: gatewayBase || null,
        square_webhook_url: urls.squareWebhookUrl || null,
        google_webhook_url: urls.googleWebhookUrl || null,
        has_langgraph_api_key: Boolean(connection?.langgraph_api_key?.trim()),
        has_webhook_secret: Boolean(connection?.webhook_secret?.trim()),
      })
    }

    if (action === 'update') {
      const { data: existing } = await admin
        .from('booking_recovery_connections')
        .select(BOOKING_RECOVERY_SELECT)
        .eq('user_id', userId)
        .maybeSingle()

      const langgraphUrl =
        body.langgraph_url !== undefined
          ? normalizeLanggraphUrl(body.langgraph_url) || ''
          : (existing?.langgraph_url ?? '')

      if (!langgraphUrl) {
        const { data: agent } = await admin
          .from('agent_settings')
          .select('url')
          .eq('user_id', userId)
          .maybeSingle()
        const fromAgent = normalizeLanggraphUrl(agent?.url)
        if (!fromAgent && !existing) {
          return json({ error: 'langgraph_url is required (set Agent Settings URL first)' }, 400)
        }
      }

      const apiKeyInput = emptyToNull(body.langgraph_api_key)
      const keepApiKey =
        body.langgraph_api_key === undefined ||
        (apiKeyInput === null && String(body.langgraph_api_key ?? '').trim() === '')

      const secretInput = emptyToNull(body.webhook_secret)
      const keepSecret =
        body.webhook_secret === undefined ||
        (secretInput === null && String(body.webhook_secret ?? '').trim() === '')

      let webhookToken = existing?.webhook_token ?? null
      if (body.rotate_token === true || body.action === 'rotate_token') {
        webhookToken = generateWebhookToken()
      } else if (body.webhook_token !== undefined) {
        webhookToken = emptyToNull(body.webhook_token)
      } else if (!webhookToken) {
        webhookToken = generateWebhookToken()
      }

      const row = {
        user_id: userId,
        langgraph_url:
          normalizeLanggraphUrl(langgraphUrl) ||
          existing?.langgraph_url ||
          '',
        langgraph_api_key: keepApiKey ? (existing?.langgraph_api_key ?? null) : apiKeyInput,
        square_merchant_id:
          body.square_merchant_id !== undefined
            ? emptyToNull(body.square_merchant_id)
            : (existing?.square_merchant_id ?? null),
        webhook_token: webhookToken,
        webhook_secret: keepSecret ? (existing?.webhook_secret ?? null) : secretInput,
        enabled:
          body.enabled !== undefined
            ? Boolean(body.enabled)
            : (existing?.enabled ?? true),
        updated_at: new Date().toISOString(),
      }

      if (!row.langgraph_url) {
        const { data: agent } = await admin
          .from('agent_settings')
          .select('url')
          .eq('user_id', userId)
          .maybeSingle()
        row.langgraph_url = normalizeLanggraphUrl(agent?.url) || ''
      }

      const { data, error } = await admin
        .from('booking_recovery_connections')
        .upsert(row)
        .select(BOOKING_RECOVERY_SELECT)
        .single()

      if (error) {
        return json({ error: error.message }, 500)
      }

      const urls = buildRecoveryUrls(gatewayBase, data.webhook_token)
      return json({
        ...publicBookingRecoveryView(data),
        gateway_base_url: gatewayBase || null,
        square_webhook_url: urls.squareWebhookUrl || null,
        google_webhook_url: urls.googleWebhookUrl || null,
      })
    }

    if (action === 'rotate_token') {
      const token = generateWebhookToken()
      const { data: existing } = await admin
        .from('booking_recovery_connections')
        .select('user_id')
        .eq('user_id', userId)
        .maybeSingle()

      if (!existing) {
        return json({ error: 'Booking recovery connection not found' }, 404)
      }

      const { data, error } = await admin
        .from('booking_recovery_connections')
        .update({ webhook_token: token })
        .eq('user_id', userId)
        .select(BOOKING_RECOVERY_SELECT)
        .single()

      if (error) {
        return json({ error: error.message }, 500)
      }

      const urls = buildRecoveryUrls(gatewayBase, data.webhook_token)
      return json({
        ...publicBookingRecoveryView(data),
        gateway_base_url: gatewayBase || null,
        square_webhook_url: urls.squareWebhookUrl || null,
        google_webhook_url: urls.googleWebhookUrl || null,
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
