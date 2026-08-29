import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
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
      } else if (status.status === 'error' || status.error) {
        await admin.from('whatsapp_connections').upsert({
          user_id: user.id,
          status: 'error',
          last_error: typeof status.error === 'string' ? status.error : 'Link failed',
        })
      }
      return json({
        status: status.status,
        qrDataUrl: status.qr_data_url ?? null,
        phone: status.phone ?? null,
        error: status.error ?? null,
      })
    }

    if (action === 'start') {
      // Clear any stale pairing session before starting a fresh QR flow.
      await callGateway(gatewayUrl, gatewayKey, 'POST', '/v1/login/stop', {
        user_id: user.id,
      }, 5_000).catch(() => {})

      const status = await callGateway(gatewayUrl, gatewayKey, 'POST', '/v1/login/start', {
        user_id: user.id,
      })
      const connectionStatus =
        status.status === 'connected' ? 'connected'
        : status.status === 'error' ? 'error'
        : 'pairing'

      const { error: upsertError } = await admin.from('whatsapp_connections').upsert({
        user_id: user.id,
        status: connectionStatus,
        phone: status.phone ?? null,
        ...(status.status === 'connected'
          ? { connected_at: new Date().toISOString() }
          : {}),
        last_error: status.error ?? null,
      })
      if (upsertError) {
        throw new Error(`Failed to save WhatsApp connection: ${upsertError.message}`)
      }
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
  timeoutMs = 20_000,
) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (apiKey) {
    headers['X-Api-Key'] = apiKey
  }

  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(timeoutMs),
  }).catch((err) => {
    const message = err instanceof Error ? err.message : String(err)
    if (err instanceof DOMException && err.name === 'TimeoutError') {
      throw new Error(
        `WhatsApp gateway timed out at ${baseUrl}. Ensure the gateway is running and reachable.`,
      )
    }
    if (/timed out|connection refused|dns|connect/i.test(message)) {
      throw new Error(
        `WhatsApp gateway unreachable at ${baseUrl}. Use a public URL reachable from Supabase (not a private LAN IP like 192.168.x.x). Original error: ${message}`,
      )
    }
    throw err
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
