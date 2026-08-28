import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type LoginAction = 'start' | 'stop' | 'disconnect' | 'status'

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
      return json({ error: 'Unauthorized' }, 401)
    }

    const gatewayUrl = (Deno.env.get('WHATSAPP_WEB_GATEWAY_URL') || '').replace(/\/$/, '')
    const gatewayKey =
      Deno.env.get('WHATSAPP_WEB_LOGIN_API_KEY') ||
      Deno.env.get('CLINTY_API_KEY') ||
      ''

    if (!gatewayUrl) {
      return json({
        error: 'WhatsApp Web gateway not configured. Set WHATSAPP_WEB_GATEWAY_URL in Supabase Edge Function secrets.',
      }, 500)
    }

    if (req.method === 'GET') {
      return json({ error: 'Use POST with action' }, 405)
    }

    if (req.method !== 'POST') {
      return json({ error: 'Method not allowed' }, 405)
    }

    const body = await req.json().catch(() => ({}))
    const action = body.action as LoginAction | 'status' | undefined

    if (action === 'status' || !action) {
      const status = await callGateway(gatewayUrl, gatewayKey, 'GET', `/v1/login/status?user_id=${user.id}`)
      if (status.status === 'connected' && status.phone) {
        await upsertConnection(admin, user.id, status.phone, 'connected')
      }
      return json({
        status: status.status,
        qrDataUrl: status.qr_data_url ?? null,
        phone: status.phone ?? null,
        error: status.error ?? null,
      })
    }

    if (action === 'start') {
      const status = await callGateway(gatewayUrl, gatewayKey, 'POST', '/v1/login/start', {
        user_id: user.id,
      })
      await admin.from('whatsapp_connections').upsert({
        user_id: user.id,
        status: status.status === 'connected' ? 'connected' : 'pairing',
        phone: status.phone ?? null,
        ...(status.status === 'connected'
          ? { connected_at: new Date().toISOString() }
          : {}),
        last_error: status.error ?? null,
      })
      return json({
        status: status.status,
        qrDataUrl: status.qr_data_url ?? null,
        phone: status.phone ?? null,
        error: status.error ?? null,
      })
    }

    if (action === 'stop') {
      await callGateway(gatewayUrl, gatewayKey, 'POST', '/v1/login/stop', { user_id: user.id })
      return json({ success: true })
    }

    if (action === 'disconnect') {
      await callGateway(gatewayUrl, gatewayKey, 'POST', '/v1/login/disconnect', {
        user_id: user.id,
      })
      await admin.from('whatsapp_connections').upsert({
        user_id: user.id,
        status: 'disconnected',
        phone: null,
        last_error: null,
      })
      return json({ success: true })
    }

    return json({ error: 'Missing or invalid action (start, stop, disconnect)' }, 400)
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Unexpected error' }, 500)
  }
})

async function callGateway(
  baseUrl: string,
  apiKey: string,
  method: string,
  path: string,
  body?: Record<string, unknown>,
) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (apiKey) {
    headers['X-Api-Key'] = apiKey
  }

  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(
      typeof data.error === 'string' ? data.error : `Gateway request failed (${response.status})`,
    )
  }
  return data
}

async function upsertConnection(
  admin: ReturnType<typeof createClient>,
  userId: string,
  phone: string,
  status: string,
) {
  await admin.from('whatsapp_connections').upsert({
    user_id: userId,
    phone,
    status,
    connected_at: new Date().toISOString(),
    last_error: null,
  })
}

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
