import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import {
  resolveWhatsAppInfrastructure,
  WHATSAPP_INFRA_SELECT,
} from '../_shared/whatsappInfrastructure.ts'
import { loadWebsiteSettings } from '../_shared/websiteInfrastructure.ts'

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
  | 'get_settings'

function parseRequestBody(raw: unknown): Record<string, unknown> {
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as Record<string, unknown>
    } catch {
      return {}
    }
  }
  if (raw && typeof raw === 'object') {
    const row = raw as Record<string, unknown>
    if (row.body && typeof row.body === 'object') {
      return row.body as Record<string, unknown>
    }
    return row
  }
  return {}
}

function normalizeAction(value: unknown): LoginAction | undefined {
  const action = String(value ?? '').trim().toLowerCase()
  if (action === 'link' || action === 'connect') {
    return 'start'
  }
  if (
    action === 'start'
    || action === 'stop'
    || action === 'disconnect'
    || action === 'status'
    || action === 'get_settings'
  ) {
    return action
  }
  return undefined
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

    const body = parseRequestBody(await req.json().catch(() => ({})))
    const action = normalizeAction(body.action)

    if (action === 'get_settings') {
      const websiteSettings = await loadWebsiteSettings(admin)
      const defaultApiKey = await fetchUserDefaultApiKey(admin, user.id)
      const { data: connection } = await admin
        .from('whatsapp_connections')
        .select(WHATSAPP_INFRA_SELECT)
        .eq('user_id', user.id)
        .maybeSingle()

      const resolved = resolveWhatsAppInfrastructure(connection, websiteSettings, {
        defaultApiKey,
      })
      const storedGatewayKey =
        typeof connection?.gateway_api_key === 'string' ? connection.gateway_api_key.trim() : ''
      const hasApiKey = Boolean(storedGatewayKey || defaultApiKey || resolved.gatewayApiKey)

      return json({
        gatewayUrl: resolved.gatewayUrl || null,
        hasApiKey,
        usesDefaultApiKey: !storedGatewayKey && Boolean(defaultApiKey),
      })
    }

    const { gatewayUrl, gatewayKey } = await resolveUserGateway(admin, user.id)
    requireGateway(gatewayUrl, gatewayKey)

    if (action === 'status' || !action) {
      const status = await callGateway(gatewayUrl, gatewayKey, 'GET', `/v1/login/status?user_id=${user.id}`)
      const patch: Record<string, unknown> = {}
      if (status.status === 'connected') {
        patch.status = 'connected'
        patch.connected_at = new Date().toISOString()
        patch.last_error = null
        if (typeof status.phone === 'string' && status.phone.trim()) {
          patch.phone = status.phone.trim()
        }
      } else if (status.status === 'pairing') {
        patch.status = 'pairing'
      } else if (typeof status.phone === 'string' && status.phone.trim()) {
        patch.phone = status.phone.trim()
      }
      if (status.status === 'error' || status.error) {
        patch.status = 'error'
        patch.last_error = typeof status.error === 'string' ? status.error : 'Link failed'
      }
      if (Object.keys(patch).length > 0) {
        await mergeWhatsAppConnection(admin, user.id, patch, gatewayUrl)
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
      }, { timeoutMs: 4_000, attempts: 1 }).catch(() => {})

      let status: Record<string, unknown>
      try {
        status = await callGateway(gatewayUrl, gatewayKey, 'POST', '/v1/login/start', {
          user_id: user.id,
          force: true,
        }, { timeoutMs: 45_000, attempts: 1 })
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        const timedOut = /timed out|TimeoutError|operation was aborted/i.test(message)
        if (timedOut) {
          await mergeWhatsAppConnection(
            admin,
            user.id,
            {
              status: 'pairing',
              last_error: null,
            },
            gatewayUrl,
          )
          return json({
            status: 'pairing',
            qrDataUrl: null,
            phone: null,
            error: null,
          })
        }
        throw err
      }

      const connectionStatus =
        status.status === 'connected' ? 'connected'
        : status.status === 'error' ? 'error'
        : 'pairing'

      await mergeWhatsAppConnection(
        admin,
        user.id,
        {
          status: connectionStatus,
          ...(typeof status.phone === 'string' && status.phone.trim()
            ? { phone: status.phone.trim() }
            : {}),
          ...(status.status === 'connected'
            ? { connected_at: new Date().toISOString() }
            : {}),
          last_error: status.error ?? null,
        },
        gatewayUrl,
      )

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
      error: `Missing or invalid action (received: ${JSON.stringify(body.action ?? null)}). Use start, stop, disconnect, status, or get_settings.`,
    }, 400)
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Unexpected error' }, 500)
  }
})

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

async function resolveUserGateway(
  admin: ReturnType<typeof createClient>,
  userId: string,
) {
  const websiteSettings = await loadWebsiteSettings(admin)
  const defaultApiKey = await fetchUserDefaultApiKey(admin, userId)
  const { data } = await admin
    .from('whatsapp_connections')
    .select(WHATSAPP_INFRA_SELECT)
    .eq('user_id', userId)
    .maybeSingle()

  const resolved = resolveWhatsAppInfrastructure(data, websiteSettings, { defaultApiKey })

  return {
    gatewayUrl: resolved.gatewayUrl,
    gatewayKey: resolved.gatewayApiKey,
  }
}

function requireGateway(gatewayUrl: string, gatewayKey: string) {
  if (!gatewayUrl) {
    throw new Error(
      'WhatsApp gateway not configured. Ask an admin to set your gateway URL and API key in Admin → WhatsApp Settings.',
    )
  }
  if (!gatewayKey) {
    throw new Error(
      'WhatsApp gateway API key not configured. Ask an admin to set your gateway API key in Admin → WhatsApp Settings, or generate a Clinty API key in Account → API Keys.',
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

function trimGatewayUrl(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function resolveStoredGatewayUrl(
  existingUrl: unknown,
  claimGatewayUrl?: string,
): string | null {
  const stored = normalizeGatewayUrl(trimGatewayUrl(existingUrl))
  if (stored) return stored

  const claimed = claimGatewayUrl ? normalizeGatewayUrl(claimGatewayUrl) : ''
  return claimed || null
}

async function mergeWhatsAppConnection(
  admin: ReturnType<typeof createClient>,
  userId: string,
  patch: Record<string, unknown>,
  claimGatewayUrl?: string,
) {
  const { data: existing } = await admin
    .from('whatsapp_connections')
    .select(WHATSAPP_INFRA_SELECT)
    .eq('user_id', userId)
    .maybeSingle()

  const { error } = await admin.from('whatsapp_connections').upsert({
    user_id: userId,
    gateway_url: resolveStoredGatewayUrl(existing?.gateway_url, claimGatewayUrl),
    gateway_api_key: existing?.gateway_api_key ?? null,
    gateway_debug: existing?.gateway_debug ?? null,
    gateway_auth_backend: existing?.gateway_auth_backend ?? null,
    gateway_auth_bucket: existing?.gateway_auth_bucket ?? null,
    gateway_auth_storage_prefix: existing?.gateway_auth_storage_prefix ?? null,
    gateway_auth_dir: existing?.gateway_auth_dir ?? null,
    gateway_langgraph_url: existing?.gateway_langgraph_url ?? null,
    phone:
      typeof patch.phone === 'string' && patch.phone.trim()
        ? patch.phone.trim()
        : existing?.phone ?? null,
    status: typeof patch.status === 'string' ? patch.status : existing?.status ?? 'disconnected',
    connected_at:
      typeof patch.connected_at === 'string'
        ? patch.connected_at
        : existing?.connected_at ?? new Date().toISOString(),
    last_error:
      patch.last_error !== undefined
        ? (typeof patch.last_error === 'string' ? patch.last_error : null)
        : existing?.last_error ?? null,
  })

  if (error) {
    throw new Error(`Failed to save WhatsApp connection: ${error.message}`)
  }
}

type CallGatewayOptions = {
  timeoutMs?: number
  attempts?: number
}

async function callGateway(
  baseUrl: string,
  apiKey: string,
  method: string,
  path: string,
  body?: Record<string, unknown>,
  timeoutMsOrOptions: number | CallGatewayOptions = 20_000,
) {
  const options = typeof timeoutMsOrOptions === 'number'
    ? { timeoutMs: timeoutMsOrOptions, attempts: 3 }
    : {
      timeoutMs: timeoutMsOrOptions.timeoutMs ?? 20_000,
      attempts: timeoutMsOrOptions.attempts ?? 3,
    }
  const { timeoutMs, attempts } = options
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Connection: 'close',
  }
  if (apiKey) {
    headers['X-Api-Key'] = apiKey
    headers['X-Clinty-Api-Key'] = apiKey
  }

  let lastError: Error | null = null

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const response = await fetch(`${baseUrl}${path}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(timeoutMs),
      })

      const rawBody = await response.text()
      let data: Record<string, unknown> = {}
      if (rawBody) {
        try {
          data = JSON.parse(rawBody) as Record<string, unknown>
        } catch {
          data = { error: rawBody.slice(0, 300) }
        }
      }

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error(
            'WhatsApp gateway rejected the API key. Use the same Clinty API key on the gateway (Account → API Keys), or enter a matching gateway key in Integrations.',
          )
        }
        if (response.status === 502 || response.status === 503 || response.status === 504) {
          throw new Error(formatGatewayUpstreamError(baseUrl, response.status, data, path))
        }
        throw new Error(
          typeof data.error === 'string'
            ? data.error
            : `Gateway request failed (${response.status})`,
        )
      }
      return data
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err))
      const message = lastError.message
      const retryable =
        /connection closed|connection reset|broken pipe|unexpected eof|SendRequest|Gateway request failed \(502\)|Gateway request failed \(503\)|Gateway request failed \(504\)/i.test(message)

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

function formatGatewayUpstreamError(
  baseUrl: string,
  status: number,
  data: Record<string, unknown>,
  path: string,
): string {
  const detail = typeof data.error === 'string'
    ? data.error
    : typeof data.message === 'string'
    ? data.message
    : ''

  const action = path.includes('/login/start')
    ? 'starting the WhatsApp QR session'
    : 'talking to your WhatsApp gateway'

  return (
    `WhatsApp gateway error (${status}) while ${action} at ${baseUrl}. ` +
    'This usually means the gateway process crashed, is restarting, or your reverse proxy cannot reach it. ' +
    'Check that the gateway service is running, port 8787 is open, and the API key matches Account → API Keys. ' +
    (detail ? `Gateway said: ${detail}` : 'Check gateway logs for the underlying error.')
  )
}

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
