import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsPreflightResponse, getCorsHeaders } from '../_shared/cors.ts'
import {
  BOOKING_RECOVERY_SELECT,
  BookingRecoveryRoutingConflictError,
  buildAppsScriptConnectUrls,
  buildRecoveryUrls,
  ensureBookingRecoveryRow,
  generateWebhookToken,
  publicBookingRecoveryView,
  resolveAppsScriptConnectSecret,
  resolveAppsScriptWebAppUrl,
  resolveBookingRecoveryGatewayUrl,
  resolveBookingRecoveryGoogleGatewayUrl,
  syncBookingRecoveryApiKeyFromAgentIfNull,
  syncBookingRecoveryLanggraphUrlFromAgent,
} from '../_shared/bookingRecoveryInfrastructure.ts'
import { loadWebsiteSettings, publicWixAppView } from '../_shared/websiteInfrastructure.ts'

let corsHeaders: Record<string, string> = {}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return corsPreflightResponse(req)
  }

  corsHeaders = getCorsHeaders(req)

  if (req.method !== 'GET' && req.method !== 'POST') {
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

    const websiteSettings = await loadWebsiteSettings(admin)
    const fullGatewayBase = resolveBookingRecoveryGatewayUrl(websiteSettings)
    const googleGatewayBase = resolveBookingRecoveryGoogleGatewayUrl(websiteSettings)
    const appsScriptWebAppUrl = resolveAppsScriptWebAppUrl(websiteSettings)
    const appsScriptConnectSecret = resolveAppsScriptConnectSecret(websiteSettings)

    async function loadRow() {
      const { data } = await admin
        .from('booking_recovery_connections')
        .select(BOOKING_RECOVERY_SELECT)
        .eq('user_id', user.id)
        .maybeSingle()
      return data
    }

    async function loadPayload(row: Awaited<ReturnType<typeof ensureBookingRecoveryRow>>) {
      const urls = buildRecoveryUrls(
        { fullGatewayBase, googleGatewayBase },
        row?.webhook_token,
      )
      const appsScript = buildAppsScriptConnectUrls(
        appsScriptWebAppUrl,
        appsScriptConnectSecret,
        row?.webhook_token,
      )
      const wixApp = publicWixAppView(websiteSettings)
      return {
        connection: publicBookingRecoveryView(row),
        gateway_base_url: fullGatewayBase || null,
        google_gateway_base_url: googleGatewayBase || null,
        square_webhook_url: urls.squareWebhookUrl || null,
        google_webhook_url: urls.googleWebhookUrl || null,
        wix_webhook_url: urls.wixWebhookUrl || null,
        google_calendar_connect_url: appsScript.connectUrl || null,
        google_calendar_status_url: appsScript.statusUrl || null,
        google_calendar_disconnect_url: appsScript.disconnectUrl || null,
        apps_script_configured: Boolean(appsScriptWebAppUrl && appsScriptConnectSecret),
        wix_app_configured: wixApp.wix_app_configured,
        wix_app_id: wixApp.wix_app_id,
        wix_app_install_url: wixApp.wix_app_install_url,
        has_wix_webhook_public_key: wixApp.has_wix_webhook_public_key,
      }
    }

    /** Ensure row exists; refresh langgraph_url; fill langgraph_api_key if null. */
    async function ensureAndSync() {
      const row = await ensureBookingRecoveryRow(admin, user.id)
      if (!row) return null
      const { data: agent } = await admin
        .from('agent_settings')
        .select('url')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (agent?.url) {
        await syncBookingRecoveryLanggraphUrlFromAgent(admin, user.id, agent.url)
      }
      // Gateway forward auth: copy Clinty API key when recovery row has none.
      await syncBookingRecoveryApiKeyFromAgentIfNull(admin, user.id)
      return await loadRow()
    }

    if (req.method === 'GET') {
      return json(await loadPayload(await loadRow()))
    }

    const body = await req.json().catch(() => ({}))
    const action = typeof body.action === 'string' ? body.action : 'get'

    if (action === 'get') {
      return json(await loadPayload(await loadRow()))
    }

    if (action === 'enable' || action === 'disable') {
      const row = await ensureAndSync()
      if (!row) {
        return json(
          { error: 'Could not create booking recovery connection (set Agent Settings URL first)' },
          400,
        )
      }
      const { data, error } = await admin
        .from('booking_recovery_connections')
        .update({ enabled: action === 'enable' })
        .eq('user_id', user.id)
        .select(BOOKING_RECOVERY_SELECT)
        .single()
      if (error) {
        return json({ error: error.message }, 500)
      }
      return json(await loadPayload(data))
    }

    if (action === 'rotate_token') {
      const row = await ensureAndSync()
      if (!row) {
        return json({ error: 'Could not create booking recovery connection' }, 400)
      }
      const { data, error } = await admin
        .from('booking_recovery_connections')
        .update({ webhook_token: generateWebhookToken() })
        .eq('user_id', user.id)
        .select(BOOKING_RECOVERY_SELECT)
        .single()
      if (error) {
        return json({ error: error.message }, 500)
      }
      return json(await loadPayload(data))
    }

    if (action === 'ensure') {
      const row = await ensureAndSync()
      if (!row) {
        return json(
          {
            error:
              'Could not create booking recovery connection. Ask an admin to set your Agent Settings URL first.',
          },
          400,
        )
      }
      return json(await loadPayload(row))
    }

    if (action === 'sync_wix_install') {
      const instanceId =
        typeof body.wix_instance_id === 'string' ? body.wix_instance_id.trim() : ''
      if (!instanceId) {
        return json({ error: 'wix_instance_id is required' }, 400)
      }
      try {
        const row = await ensureAndSync()
        if (!row) {
          return json(
            {
              error:
                'Could not create booking recovery connection. Ask an admin to set your Agent Settings URL first.',
            },
            400,
          )
        }
        const synced = await ensureBookingRecoveryRow(admin, user.id, {
          wixInstanceId: instanceId,
        })
        if (!synced) {
          return json({ error: 'Could not sync Wix instance ID' }, 500)
        }
        return json(await loadPayload(synced))
      } catch (err) {
        if (err instanceof BookingRecoveryRoutingConflictError) {
          return json({ error: err.message, code: err.code }, 409)
        }
        throw err
      }
    }

    return json({ error: 'Unknown action' }, 400)
  } catch (err) {
    if (err instanceof BookingRecoveryRoutingConflictError) {
      return json({ error: err.message, code: err.code }, 409)
    }
    return json({ error: err instanceof Error ? err.message : 'Unexpected error' }, 500)
  }
})

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
