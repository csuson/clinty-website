import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const SCOPES = ['openid', 'mail-r', 'mail-w', 'ycal-r', 'ycal-w']
const YAHOO_TOKEN_URL = 'https://api.login.yahoo.com/oauth2/get_token'
const YAHOO_USERINFO_URL = 'https://api.login.yahoo.com/openid/v1/userinfo'

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

    const { code, redirectUri, clientId } = await req.json()
    if (!code || !redirectUri) {
      return json({ error: 'Missing code or redirectUri' }, 400)
    }

    const clientSecret = Deno.env.get('YAHOO_CLIENT_SECRET')
    const envClientId = Deno.env.get('YAHOO_CLIENT_ID')
    const effectiveClientId = clientId || envClientId

    if (!effectiveClientId || !clientSecret) {
      return json({
        error: 'Yahoo OAuth not configured on server. Set YAHOO_CLIENT_SECRET (and optionally YAHOO_CLIENT_ID) in Supabase Edge Function secrets.',
      }, 500)
    }

    if (envClientId && clientId && envClientId !== clientId) {
      return json({
        error: 'YAHOO_CLIENT_ID in Supabase secrets must match VITE_YAHOO_CLIENT_ID in your website .env',
      }, 400)
    }

    const tokenRes = await fetch(YAHOO_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: effectiveClientId,
        client_secret: clientSecret,
      }),
    })

    const tokenData = await tokenRes.json()
    if (!tokenRes.ok) {
      return json({
        error: tokenData.error_description ?? tokenData.error ?? 'Token exchange failed',
      }, 400)
    }

    const accessToken = tokenData.access_token as string
    const expiresIn = Number(tokenData.expires_in ?? 0)
    const expiry = expiresIn > 0
      ? new Date(Date.now() + expiresIn * 1000).toISOString()
      : null

    const userInfoRes = await fetch(YAHOO_USERINFO_URL, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    const userInfo = userInfoRes.ok ? await userInfoRes.json() : {}
    const yahooEmail = userInfo.email ?? userInfo.preferred_username ?? null

    const { error: tokenError } = await admin.from('yahoo_tokens').upsert({
      user_id: user.id,
      access_token: accessToken,
      refresh_token: tokenData.refresh_token ?? null,
      token_uri: YAHOO_TOKEN_URL,
      client_id: effectiveClientId,
      client_secret: clientSecret,
      scopes: SCOPES,
      yahoo_account: yahooEmail,
      expiry,
      updated_at: new Date().toISOString(),
    })

    if (tokenError) {
      return json({ error: tokenError.message }, 500)
    }

    const { error: connError } = await admin.from('yahoo_connections').upsert({
      user_id: user.id,
      yahoo_email: yahooEmail,
      scopes: SCOPES,
      token_expiry: expiry,
      status: 'connected',
      connected_at: new Date().toISOString(),
    })

    if (connError) {
      return json({ error: connError.message }, 500)
    }

    return json({ success: true, email: yahooEmail })
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
