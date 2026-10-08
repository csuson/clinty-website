import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsPreflightResponse, getCorsHeaders } from '../_shared/cors.ts'
import {
  BOOKING_RECOVERY_SELECT,
  buildRecoveryUrls,
  ensureBookingRecoveryRow,
  generateWebhookToken,
  publicBookingRecoveryView,
  resolveBookingRecoveryGatewayUrl,
} from '../_shared/bookingRecoveryInfrastructure.ts'
import { loadWebsiteSettings } from '../_shared/websiteInfrastructure.ts'

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
    const gatewayBase = resolveBookingRecoveryGatewayUrl(websiteSettings)

    async function loadPayload(row: Awaited<ReturnType<typeof ensureBookingRecoveryRow>>) {
      const urls = buildRecoveryUrls(gatewayBase, row?.webhook_token)
      return {
        connection: publicBookingRecoveryView(row),
        gateway_base_url: gatewayBase || null,
        square_webhook_url: urls.squareWebhookUrl || null,
        google_webhook_url: urls.googleWebhookUrl || null,
      }
    }

    if (req.method === 'GET') {
      const { data: connection } = await admin
        .from('booking_recovery_connections')
        .select(BOOKING_RECOVERY_SELECT)
        .eq('user_id', user.id)
        .maybeSingle()

      return json(await loadPayload(connection))
    }

    const body = await req.json().catch(() => ({}))
    const action = typeof body.action === 'string' ? body.action : 'get'

    if (action === 'get') {
      const { data: connection } = await admin
        .from('booking_recovery_connections')
        .select(BOOKING_RECOVERY_SELECT)
        .eq('user_id', user.id)
        .maybeSingle()

      return json(await loadPayload(connection))
    }

    if (action === 'enable' || action === 'disable') {
      const row = await ensureBookingRecoveryRow(admin, user.id)
      if (!row) {
        return json({ error: 'Could not create booking recovery connection (set Agent Settings URL first)' }, 400)
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
      const row = await ensureBookingRecoveryRow(admin, user.id)
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
      const row = await ensureBookingRecoveryRow(admin, user.id)
      if (!row) {
        return json({ error: 'Could not create booking recovery connection' }, 400)
      }
      return json(await loadPayload(row))
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
