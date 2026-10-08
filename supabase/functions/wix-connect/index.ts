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
    const siteId = typeof body.site_id === 'string' ? body.site_id.trim() : ''
    const apiKeyInput = typeof body.api_key === 'string' ? body.api_key.trim() : ''
    const serviceId = typeof body.service_id === 'string' ? body.service_id.trim() : ''
    const appId = typeof body.app_id === 'string' ? body.app_id.trim() : ''
    const appSecretInput = typeof body.app_secret === 'string' ? body.app_secret.trim() : ''
    const instanceId = typeof body.instance_id === 'string' ? body.instance_id.trim() : ''
    const resourceId = typeof body.resource_id === 'string' ? body.resource_id.trim() : ''
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
      .from('wix_tokens')
      .select(
        'api_key, site_id, service_id, app_id, app_secret, instance_id, timezone, resource_id, location_id',
      )
      .eq('user_id', user.id)
      .maybeSingle()

    const resolvedSite = siteId || String(existing?.site_id ?? '').trim()
    const resolvedKey = apiKeyInput || String(existing?.api_key ?? '').trim()
    const resolvedService = serviceId || String(existing?.service_id ?? '').trim()
    const resolvedAppId = appId || String(existing?.app_id ?? '').trim()
    const resolvedAppSecret = appSecretInput || String(existing?.app_secret ?? '').trim()
    const resolvedInstance = instanceId || String(existing?.instance_id ?? '').trim()
    const resolvedResource = resourceId || String(existing?.resource_id ?? '').trim()
    const resolvedLocation = locationId || String(existing?.location_id ?? '').trim()
    const resolvedTimezone = timezone || String(existing?.timezone ?? 'America/Los_Angeles')

    if (!resolvedService) {
      return json({ error: 'Provide a Wix Bookings service ID.' }, 400)
    }

    const usesApiKey = Boolean(resolvedKey && resolvedSite)
    const usesOauth = Boolean(resolvedAppId && resolvedAppSecret && resolvedInstance)
    if (!usesApiKey && !usesOauth) {
      return json({
        error:
          'Provide either (API key + site ID) or (App ID + App Secret + Instance ID), plus a service ID.',
      }, 400)
    }
    if (resolvedKey && !resolvedSite) {
      return json({ error: 'Site ID is required when using a Wix API key.' }, 400)
    }

    const validated = await validateWix({
      siteId: resolvedSite,
      apiKey: resolvedKey,
      appId: resolvedAppId,
      appSecret: resolvedAppSecret,
      instanceId: resolvedInstance,
    })
    if (!validated.ok) {
      await admin.from('wix_connections').upsert({
        user_id: user.id,
        site_id: resolvedSite || null,
        display_name: displayName,
        service_id: resolvedService,
        status: 'error',
        last_error: validated.error,
        connected_at: new Date().toISOString(),
      })
      return json({ error: validated.error }, 400)
    }

    const { error: tokenError } = await admin.from('wix_tokens').upsert({
      user_id: user.id,
      api_key: resolvedKey || null,
      // Never store instance_id as site_id — agent sends site_id as wix-site-id header.
      site_id: resolvedSite || null,
      service_id: resolvedService,
      app_id: resolvedAppId || null,
      app_secret: resolvedAppSecret || null,
      instance_id: resolvedInstance || null,
      timezone: resolvedTimezone,
      resource_id: resolvedResource || null,
      location_id: resolvedLocation || null,
      updated_at: new Date().toISOString(),
    })
    if (tokenError) return json({ error: tokenError.message }, 500)

    const { error: connError } = await admin.from('wix_connections').upsert({
      user_id: user.id,
      site_id: resolvedSite || null,
      display_name: displayName,
      service_id: resolvedService,
      status: 'connected',
      last_error: null,
      connected_at: new Date().toISOString(),
    })
    if (connError) return json({ error: connError.message }, 500)

    const exclusive = await activateBookingProvider(admin, user.id, 'wix')

    const assistantReload = await notifyEmailAssistantRuntimeReload(admin, user.id, {
      ...exclusive,
      calendar_provider: 'wix',
      wix_api_key: resolvedKey,
      wix_site_id: resolvedSite,
      wix_service_id: resolvedService,
      wix_app_id: resolvedAppId,
      wix_app_secret: resolvedAppSecret,
      wix_instance_id: resolvedInstance,
      wix_timezone: resolvedTimezone,
      wix_resource_id: resolvedResource,
      wix_location_id: resolvedLocation,
    })

    return json({
      success: true,
      site_id: resolvedSite || null,
      calendar_provider: 'wix',
      assistant_url: assistantReload.assistantUrl ?? null,
      assistant_reloaded: assistantReload.ok,
      assistant_reload_error: assistantReload.ok ? undefined : assistantReload.detail,
    })
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Unexpected error' }, 500)
  }
})

async function validateWix(input: {
  siteId: string
  apiKey: string
  appId: string
  appSecret: string
  instanceId: string
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    let authHeader = input.apiKey
    const siteId = input.siteId

    if (!authHeader && input.appId && input.appSecret && input.instanceId) {
      const tokenResponse = await fetch('https://www.wixapis.com/oauth2/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          grant_type: 'client_credentials',
          client_id: input.appId,
          client_secret: input.appSecret,
          instance_id: input.instanceId,
        }),
        signal: AbortSignal.timeout(20_000),
      })
      if (!tokenResponse.ok) {
        return {
          ok: false,
          error: `Wix OAuth rejected credentials (HTTP ${tokenResponse.status}).`,
        }
      }
      const tokenPayload = await tokenResponse.json().catch(() => ({})) as {
        access_token?: string
      }
      authHeader = String(tokenPayload.access_token ?? '').trim()
      if (!authHeader) {
        return { ok: false, error: 'Wix OAuth response missing access_token.' }
      }
    }

    if (!authHeader) {
      return { ok: false, error: 'Missing Wix API credentials.' }
    }

    const headers: Record<string, string> = {
      Authorization: authHeader,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    }
    if (siteId) headers['wix-site-id'] = siteId

    const props = await fetch('https://www.wixapis.com/site-properties/v4/properties', {
      headers,
      signal: AbortSignal.timeout(20_000),
    })
    if (props.ok) return { ok: true }
    if (props.status === 401 || props.status === 403) {
      return { ok: false, error: 'Wix API credentials rejected.' }
    }

    const services = await fetch('https://www.wixapis.com/bookings/v2/services/query', {
      method: 'POST',
      headers,
      body: JSON.stringify({ query: { paging: { limit: 1 } } }),
      signal: AbortSignal.timeout(20_000),
    })
    if (services.ok) return { ok: true }
    if (services.status === 401 || services.status === 403) {
      return { ok: false, error: 'Wix Bookings API credentials rejected.' }
    }
    return {
      ok: false,
      error: `Wix returned HTTP ${services.status || props.status}. Check site ID, API key permissions, and Bookings app access.`,
    }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Could not reach Wix APIs',
    }
  }
}

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
