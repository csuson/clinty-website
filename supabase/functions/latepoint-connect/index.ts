import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { activateBookingProvider } from '../_shared/bookingProviderSwitch.ts'
import { notifyEmailAssistantRuntimeReload } from '../_shared/emailAssistant.ts'
import { corsPreflightResponse, getCorsHeaders } from '../_shared/cors.ts'

let corsHeaders: Record<string, string> = {}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return corsPreflightResponse(req)
  corsHeaders = getCorsHeaders(req)

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Missing authorization header' }, 401)

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
    if (userError || !user) return json({ error: 'Unauthorized' }, 401)

    const body = await req.json().catch(() => ({}))
    const siteUrl = normalizeSiteUrl(typeof body.site_url === 'string' ? body.site_url : '')
    const apiKeyInput = typeof body.api_key === 'string' ? body.api_key.trim() : ''
    const serviceId = typeof body.service_id === 'string' ? body.service_id.trim() : ''
    const agentId = typeof body.agent_id === 'string' ? body.agent_id.trim() : ''
    const locationId = typeof body.location_id === 'string' ? body.location_id.trim() : ''
    const timezone =
      typeof body.timezone === 'string' && body.timezone.trim()
        ? body.timezone.trim()
        : 'America/Los_Angeles'
    const displayName =
      typeof body.display_name === 'string' && body.display_name.trim()
        ? body.display_name.trim()
        : null

    const { data: existing } = await admin
      .from('latepoint_tokens')
      .select('site_url, api_key, service_id, agent_id, location_id, timezone')
      .eq('user_id', user.id)
      .maybeSingle()

    const resolvedSite = siteUrl || normalizeSiteUrl(String(existing?.site_url ?? ''))
    const resolvedKey = apiKeyInput || String(existing?.api_key ?? '').trim()
    const resolvedService = serviceId || String(existing?.service_id ?? '').trim()
    const resolvedAgent = agentId || String(existing?.agent_id ?? '').trim()
    const resolvedLocation = locationId || String(existing?.location_id ?? '').trim()
    const resolvedTimezone = timezone || String(existing?.timezone ?? 'America/Los_Angeles')

    if (!resolvedSite || !resolvedKey || !resolvedService || !resolvedAgent) {
      return json({
        error: 'Provide WordPress site URL, LatePoint API key, service ID, and agent ID.',
      }, 400)
    }

    const validated = await validateLatePoint(resolvedSite, resolvedKey)
    if (!validated.ok) {
      await admin.from('latepoint_connections').upsert({
        user_id: user.id,
        site_url: resolvedSite,
        display_name: displayName,
        service_id: resolvedService,
        agent_id: resolvedAgent,
        status: 'error',
        last_error: validated.error,
        connected_at: new Date().toISOString(),
      })
      return json({ error: validated.error }, 400)
    }

    const { error: tokenError } = await admin.from('latepoint_tokens').upsert({
      user_id: user.id,
      site_url: resolvedSite,
      api_key: resolvedKey,
      service_id: resolvedService,
      agent_id: resolvedAgent,
      location_id: resolvedLocation || null,
      timezone: resolvedTimezone,
      updated_at: new Date().toISOString(),
    })
    if (tokenError) return json({ error: tokenError.message }, 500)

    const { error: connError } = await admin.from('latepoint_connections').upsert({
      user_id: user.id,
      site_url: resolvedSite,
      display_name: displayName,
      service_id: resolvedService,
      agent_id: resolvedAgent,
      status: 'connected',
      last_error: null,
      connected_at: new Date().toISOString(),
    })
    if (connError) return json({ error: connError.message }, 500)

    const exclusive = await activateBookingProvider(admin, user.id, 'latepoint')

    const assistantReload = await notifyEmailAssistantRuntimeReload(admin, user.id, {
      ...exclusive,
      calendar_provider: 'latepoint',
      latepoint_site_url: resolvedSite,
      latepoint_api_key: resolvedKey,
      latepoint_service_id: resolvedService,
      latepoint_agent_id: resolvedAgent,
      latepoint_location_id: resolvedLocation,
      latepoint_timezone: resolvedTimezone,
    })

    return json({
      success: true,
      site_url: resolvedSite,
      calendar_provider: 'latepoint',
      assistant_url: assistantReload.assistantUrl ?? null,
      assistant_reloaded: assistantReload.ok,
      assistant_reload_error: assistantReload.ok ? undefined : assistantReload.detail,
    })
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Unexpected error' }, 500)
  }
})

function normalizeSiteUrl(raw: string): string {
  const trimmed = raw.trim().replace(/\/$/, '')
  if (!trimmed) return ''
  try {
    const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
    const url = new URL(withProtocol)
    return `${url.protocol}//${url.host}`
  } catch {
    return ''
  }
}

async function validateLatePoint(
  siteUrl: string,
  apiKey: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const response = await fetch(`${siteUrl}/wp-json/latepoint-api/v1/status`, {
      headers: {
        'X-API-Key': apiKey,
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(20_000),
    })
    if (response.ok) return { ok: true }
    if (response.status === 401 || response.status === 403) {
      return { ok: false, error: 'LatePoint API key rejected.' }
    }
    if (response.status === 404) {
      return {
        ok: false,
        error: 'LatePoint API Extension not found. Install the WPLimit REST API plugin and activate it.',
      }
    }
    // Fallback: try services list
    const services = await fetch(`${siteUrl}/wp-json/latepoint-api/v1/services?per_page=1`, {
      headers: { 'X-API-Key': apiKey, Accept: 'application/json' },
      signal: AbortSignal.timeout(20_000),
    })
    if (services.ok) return { ok: true }
    return { ok: false, error: `LatePoint returned HTTP ${response.status}` }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Could not reach WordPress site',
    }
  }
}

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
