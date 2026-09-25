import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { activateBookingProvider } from '../_shared/bookingProviderSwitch.ts'
import { notifyEmailAssistantRuntimeReload } from '../_shared/emailAssistant.ts'
import { corsPreflightResponse, getCorsHeaders } from '../_shared/cors.ts'

let corsHeaders: Record<string, string> = {}

const PROD_AUTH = 'https://api.wetravel.com/v2/auth'
const SANDBOX_AUTH = 'https://api.demo.wetravel.to/v2/auth'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return corsPreflightResponse(req)
  }

  corsHeaders = getCorsHeaders(req)

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

    const body = await req.json().catch(() => ({}))
    const apiKeyInput = typeof body.api_key === 'string' ? body.api_key.trim() : ''
    const sandbox = Boolean(body.sandbox)
    const displayName =
      typeof body.display_name === 'string' && body.display_name.trim()
        ? body.display_name.trim()
        : null

    const { data: existing } = await admin
      .from('wetravel_tokens')
      .select('api_key')
      .eq('user_id', user.id)
      .maybeSingle()

    const apiKey = apiKeyInput || (typeof existing?.api_key === 'string' ? existing.api_key.trim() : '')
    if (!apiKey) {
      return json({
        error: 'Paste your WeTravel Partner API key (refresh token from Profile → Partner API).',
      }, 400)
    }

    const validated = await validateWeTravelApiKey(apiKey, sandbox)
    if (!validated.ok) {
      await admin.from('wetravel_connections').upsert({
        user_id: user.id,
        display_name: displayName,
        sandbox,
        status: 'error',
        last_error: validated.error,
        connected_at: new Date().toISOString(),
      })
      return json({ error: validated.error }, 400)
    }

    const { error: tokenError } = await admin.from('wetravel_tokens').upsert({
      user_id: user.id,
      api_key: apiKey,
      sandbox,
      display_name: displayName,
      updated_at: new Date().toISOString(),
    })

    if (tokenError) {
      return json({ error: tokenError.message }, 500)
    }

    const { error: connError } = await admin.from('wetravel_connections').upsert({
      user_id: user.id,
      display_name: displayName,
      sandbox,
      status: 'connected',
      last_error: null,
      connected_at: new Date().toISOString(),
    })

    if (connError) {
      return json({ error: connError.message }, 500)
    }

    const exclusive = await activateBookingProvider(admin, user.id, 'wetravel')

    const assistantReload = await notifyEmailAssistantRuntimeReload(admin, user.id, {
      ...exclusive,
      calendar_provider: 'wetravel',
      wetravel_api_key: apiKey,
      wetravel_sandbox: sandbox ? '1' : '0',
    })

    return json({
      success: true,
      sandbox,
      calendar_provider: 'wetravel',
      assistant_url: assistantReload.assistantUrl ?? null,
      assistant_reloaded: assistantReload.ok,
      assistant_reload_error: assistantReload.ok ? undefined : assistantReload.detail,
    })
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Unexpected error' }, 500)
  }
})

async function validateWeTravelApiKey(
  apiKey: string,
  sandbox: boolean,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const base = sandbox ? SANDBOX_AUTH : PROD_AUTH
  try {
    const response = await fetch(`${base}/tokens/access`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(20_000),
    })
    const raw = await response.text()
    let data: Record<string, unknown> = {}
    if (raw) {
      try {
        data = JSON.parse(raw) as Record<string, unknown>
      } catch {
        data = { error: raw.slice(0, 200) }
      }
    }
    if (!response.ok) {
      const message =
        typeof data.error === 'string'
          ? data.error
          : `WeTravel rejected the API key (${response.status}).`
      return { ok: false, error: message }
    }
    const token =
      typeof data.access_token === 'string'
        ? data.access_token
        : typeof (data.data as Record<string, unknown> | undefined)?.access_token === 'string'
          ? String((data.data as Record<string, unknown>).access_token)
          : ''
    if (!token) {
      return { ok: false, error: 'WeTravel did not return an access token for this API key.' }
    }
    return { ok: true }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Could not reach WeTravel to validate the API key.',
    }
  }
}

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
