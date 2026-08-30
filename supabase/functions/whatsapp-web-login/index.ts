import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

type LoginAction =
  | 'start'
  | 'stop'
  | 'disconnect'
  | 'status'
  | 'save_gateway'
  | 'get_settings'

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
      return json({
        error: 'Your session expired or is invalid. Sign in again and retry.',
      }, 401)
    }

    if (req.method === 'GET') {
      return json({ error: 'Use POST with action' }, 405)
    }

    if (req.method !== 'POST') {
      return json({ error: 'Method not allowed' }, 405)
    }

    const body = await req.json().catch(() => ({}))
    const action = body.action as LoginAction | undefined

    if (action === 'get_settings') {
      const { data } = await admin
        .from('whatsapp_connections')
        .select('gateway_url, gateway_api_key')
        .eq('user_id', user.id)
        .maybeSingle()

      return json({
        gatewayUrl: data?.gateway_url ?? null,
        hasApiKey: Boolean(data?.gateway_api_key),
      })
    }

    if (action === 'save_gateway') {
      const gatewayUrlRaw = typeof body.gatewayUrl === 'string' ? body.gatewayUrl.trim() : ''
      const gatewayApiKey = typeof body.gatewayApiKey === 'string' ? body.gatewayApiKey.trim() : ''
      const gatewayUrl = normalizeGatewayUrl(gatewayUrlRaw)

      if (!gatewayUrl) {
        return json({
          error: 'Enter a valid gateway URL (e.g. https://your-host:8787).',
        }, 400)
      }

      const { data: existing } = await admin
        .from('whatsapp_connections')
        .select('gateway_api_key, status, phone, connected_at, last_error')
        .eq('user_id', user.id)
        .maybeSingle()

      if (!gatewayApiKey && !existing?.gateway_api_key) {
        return json({ error: 'Enter the API key for your WhatsApp gateway.' }, 400)
      }

      const { error: upsertError } = await admin.from('whatsapp_connections').upsert({
        user_id: user.id,
        gateway_url: gatewayUrl,
        gateway_api_key: gatewayApiKey || existing?.gateway_api_key || null,
        status: existing?.status ?? 'disconnected',
        phone: existing?.phone ?? null,
        last_error: existing?.last_error ?? null,
        ...(existing?.connected_at
          ? { connected_at: existing.connected_at }
          : { connected_at: new Date().toISOString() }),
      })

      if (upsertError) {
        throw new Error(`Failed to save WhatsApp gateway: ${upsertError.message}`)
      }

      return json({ success: true, gatewayUrl, hasApiKey: true })
    }

    const { gatewayUrl, gatewayKey } = await resolveUserGateway(admin, user.id)
    requireGateway(gatewayUrl, gatewayKey)

    if (action === 'status' || !action) {
      const status = await callGateway(gatewayUrl, gatewayKey, 'GET', `/v1/login/status?user_id=${user.id}`)
      if (status.status === 'connected' && status.phone) {
        await mergeWhatsAppConnection(admin, user.id, {
          phone: status.phone,
          status: 'connected',
          connected_at: new Date().toISOString(),
          last_error: null,
        })
      } else if (status.status === 'error' || status.error) {
        await mergeWhatsAppConnection(admin, user.id, {
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
      await callGateway(gatewayUrl, gatewayKey, 'POST', '/v1/login/stop', {
        user_id: user.id,
      }, 5_000).catch(() => {})

      const status = await callGateway(gatewayUrl, gatewayKey, 'POST', '/v1/login/start', {
        user_id: user.id,
      }, 60_000)
      const connectionStatus =
        status.status === 'connected' ? 'connected'
        : status.status === 'error' ? 'error'
        : 'pairing'

      await mergeWhatsAppConnection(admin, user.id, {
        status: connectionStatus,
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
      await mergeWhatsAppConnection(admin, user.id, {
        status: 'disconnected',
        phone: null,
        last_error: null,
      })

      try {
        await callGateway(gatewayUrl, gatewayKey, 'POST', '/v1/login/disconnect', {
          user_id: user.id,
        })
      } catch (gatewayErr) {
        console.warn('WhatsApp gateway disconnect failed:', gatewayErr)
      }

      return json({ success: true })
    }

    return json({
      error: 'Missing or invalid action (start, stop, disconnect, save_gateway, get_settings)',
    }, 400)
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Unexpected error' }, 500)
  }
})

async function resolveUserGateway(
  admin: ReturnType<typeof createClient>,
  userId: string,
) {
  const { data } = await admin
    .from('whatsapp_connections')
    .select('gateway_url, gateway_api_key')
    .eq('user_id', userId)
    .maybeSingle()

  const gatewayUrl = (data?.gateway_url || Deno.env.get('WHATSAPP_WEB_GATEWAY_URL') || '')
    .replace(/\/$/, '')
  const gatewayKey =
    data?.gateway_api_key ||
    Deno.env.get('WHATSAPP_WEB_LOGIN_API_KEY') ||
    Deno.env.get('CLINTY_API_KEY') ||
    ''

  return { gatewayUrl, gatewayKey }
}

function requireGateway(gatewayUrl: string, gatewayKey: string) {
  if (!gatewayUrl) {
    throw new Error(
      'WhatsApp gateway not configured. Add your gateway URL and API key in Integrations before linking.',
    )
  }
  if (!gatewayKey) {
    throw new Error(
      'WhatsApp gateway API key not configured. Add your gateway API key in Integrations before linking.',
    )
  }
}

function normalizeGatewayUrl(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) return ''

  try {
    const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
    const url = new URL(withProtocol)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return ''
    return `${url.protocol}//${url.host}${url.pathname.replace(/\/$/, '')}`
  } catch {
    return ''
  }
}

async function mergeWhatsAppConnection(
  admin: ReturnType<typeof createClient>,
  userId: string,
  patch: Record<string, unknown>,
) {
  const { data: existing } = await admin
    .from('whatsapp_connections')
    .select('gateway_url, gateway_api_key, phone, status, connected_at, last_error')
    .eq('user_id', userId)
    .maybeSingle()

  const { error } = await admin.from('whatsapp_connections').upsert({
    user_id: userId,
    gateway_url: existing?.gateway_url ?? null,
    gateway_api_key: existing?.gateway_api_key ?? null,
    phone: existing?.phone ?? null,
    status: existing?.status ?? 'disconnected',
    connected_at: existing?.connected_at ?? new Date().toISOString(),
    last_error: existing?.last_error ?? null,
    ...patch,
  })

  if (error) {
    throw new Error(`Failed to save WhatsApp connection: ${error.message}`)
  }
}

async function callGateway(
  baseUrl: string,
  apiKey: string,
  method: string,
  path: string,
  body?: Record<string, unknown>,
  timeoutMs = 20_000,
) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Connection: 'close',
  }
  if (apiKey) {
    headers['X-Api-Key'] = apiKey
  }

  let lastError: Error | null = null
  const attempts = 3

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const response = await fetch(`${baseUrl}${path}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(timeoutMs),
      })

      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error(
            'WhatsApp gateway rejected the API key. Check the API key saved in Integrations matches your gateway.',
          )
        }
        throw new Error(
          typeof data.error === 'string' ? data.error : `Gateway request failed (${response.status})`,
        )
      }
      return data
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err))
      const message = lastError.message
      const retryable =
        /connection closed|connection reset|broken pipe|unexpected eof|SendRequest/i.test(message)

      if (!retryable || attempt === attempts) {
        break
      }

      await new Promise((resolve) => setTimeout(resolve, attempt * 500))
    }
  }

  const message = lastError?.message ?? 'Unknown gateway error'
  if (lastError instanceof DOMException && lastError.name === 'TimeoutError') {
    throw new Error(
      `WhatsApp gateway timed out at ${baseUrl}. Ensure the gateway is running and reachable.`,
    )
  }
  if (/timed out|connection refused|dns|connect|connection closed|SendRequest/i.test(message)) {
    throw new Error(
      `WhatsApp gateway unreachable from Supabase at ${baseUrl}. ` +
      'Expose your gateway with HTTPS via a VPS or Cloudflare Tunnel so Supabase can reach it. ' +
      `Original error: ${message}`,
    )
  }
  throw lastError
}

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
