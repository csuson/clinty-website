import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { resolveGoogleOAuthClient } from '../_shared/googleOAuthCredentials.ts'
import { corsPreflightResponse, getCorsHeaders } from '../_shared/cors.ts'

let corsHeaders: Record<string, string> = {}

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/userinfo.email',
]

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

    const { code, redirectUri, clientId, codeVerifier } = await req.json()
    if (!code || !redirectUri) {
      return json({ error: 'Missing code or redirectUri' }, 400)
    }
    if (typeof codeVerifier !== 'string' || !codeVerifier.trim()) {
      return json({ error: 'Missing PKCE code_verifier' }, 400)
    }

    const requestClientId = typeof clientId === 'string' ? clientId.trim() : ''
    const oauth = await resolveGoogleOAuthClient(admin, requestClientId || undefined)
    const effectiveClientId = oauth.clientId
    const clientSecret = oauth.clientSecret

    if (!effectiveClientId || !clientSecret) {
      return json({
        error: requestClientId
          ? `No client secret found for OAuth client ${requestClientId}. In Admin → Infrastructure, save the Web application client ID and secret that match VITE_GOOGLE_CLIENT_ID (not a Desktop/installed client), or set matching GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET Edge secrets.`
          : 'Google OAuth not configured. Set Gmail OAuth client ID and secret in Admin → Infrastructure, or GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET in Supabase Edge Function secrets.',
      }, 500)
    }

    if (requestClientId && effectiveClientId !== requestClientId) {
      return json({
        error:
          'OAuth client ID mismatch: the website VITE_GOOGLE_CLIENT_ID must match the client ID stored for token exchange.',
      }, 400)
    }

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: effectiveClientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
        code_verifier: codeVerifier.trim(),
      }),
    })

    const tokenData = await tokenRes.json()
    if (!tokenRes.ok) {
      const googleError = tokenData.error_description ?? tokenData.error ?? 'Token exchange failed'
      const hint =
        typeof tokenData.error === 'string' &&
        (tokenData.error === 'redirect_uri_mismatch' ||
          tokenData.error === 'invalid_client' ||
          String(googleError).toLowerCase().includes('redirect_uri'))
          ? ` Use the Web application OAuth client (same as VITE_GOOGLE_CLIENT_ID) with authorized redirect URI ${redirectUri}.`
          : ''
      return json({ error: `${googleError}.${hint}`.trim() }, 400)
    }

    const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    })
    const userInfo = userInfoRes.ok ? await userInfoRes.json() : { email: '' }

    const expiry = new Date(Date.now() + tokenData.expires_in * 1000).toISOString()

    const tokenPayload = {
      token: tokenData.access_token,
      refresh_token: tokenData.refresh_token ?? null,
      token_uri: 'https://oauth2.googleapis.com/token',
      client_id: effectiveClientId,
      client_secret: clientSecret,
      scopes: SCOPES,
      universe_domain: 'googleapis.com',
      account: userInfo.email ?? '',
      expiry: expiry.replace(/\.\d{3}Z$/, 'Z'),
    }

    const { error: tokenError } = await admin.from('gmail_tokens').upsert({
      user_id: user.id,
      access_token: tokenPayload.token,
      refresh_token: tokenPayload.refresh_token,
      token_uri: tokenPayload.token_uri,
      client_id: effectiveClientId,
      client_secret: clientSecret,
      scopes: SCOPES,
      universe_domain: 'googleapis.com',
      google_account: userInfo.email ?? null,
      expiry,
      updated_at: new Date().toISOString(),
    })

    if (tokenError) {
      return json({ error: tokenError.message }, 500)
    }

    const { error: connError } = await admin.from('gmail_connections').upsert({
      user_id: user.id,
      google_email: userInfo.email ?? null,
      scopes: SCOPES,
      token_expiry: expiry,
      status: 'connected',
      connected_at: new Date().toISOString(),
    })

    if (connError) {
      return json({ error: connError.message }, 500)
    }

    return json({ token: tokenPayload })
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
