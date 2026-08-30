import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const TOKEN_URI = 'https://login.microsoftonline.com/common/oauth2/v2.0/token'

const SCOPES = [
  'openid',
  'profile',
  'offline_access',
  'https://graph.microsoft.com/Mail.ReadWrite',
  'https://graph.microsoft.com/Calendars.ReadWrite',
  'https://graph.microsoft.com/User.Read',
]

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

    const clientSecret = Deno.env.get('MICROSOFT_CLIENT_SECRET')
    const envClientId = Deno.env.get('MICROSOFT_CLIENT_ID')
    const effectiveClientId = clientId || envClientId

    if (!effectiveClientId || !clientSecret) {
      return json({
        error: 'Microsoft OAuth not configured on server. Set MICROSOFT_CLIENT_SECRET (and optionally MICROSOFT_CLIENT_ID) in Supabase Edge Function secrets.',
      }, 500)
    }

    if (envClientId && clientId && envClientId !== clientId) {
      return json({
        error: 'MICROSOFT_CLIENT_ID in Supabase secrets must match VITE_MICROSOFT_CLIENT_ID in your website .env',
      }, 400)
    }

    const tokenRes = await fetch(TOKEN_URI, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: effectiveClientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    })

    const tokenData = await tokenRes.json()
    if (!tokenRes.ok) {
      return json({
        error: tokenData.error_description ?? tokenData.error ?? 'Token exchange failed',
      }, 400)
    }

    const profileRes = await fetch(
      'https://graph.microsoft.com/v1.0/me?$select=mail,userPrincipalName,otherMails',
      { headers: { Authorization: `Bearer ${tokenData.access_token}` } },
    )
    const profile = profileRes.ok ? await profileRes.json() : {}
    const email = resolveOutlookEmail(profile)

    if (!email) {
      return json({ error: 'Could not determine your Microsoft account email.' }, 400)
    }

    const expiry = new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
    const grantedScopes = typeof tokenData.scope === 'string'
      ? tokenData.scope.split(' ').filter(Boolean)
      : SCOPES

    const { error: tokenError } = await admin.from('outlook_tokens').upsert({
      user_id: user.id,
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token ?? null,
      token_uri: TOKEN_URI,
      client_id: effectiveClientId,
      client_secret: clientSecret,
      scopes: grantedScopes,
      outlook_account: email,
      expiry,
      updated_at: new Date().toISOString(),
    })

    if (tokenError) {
      return json({ error: tokenError.message }, 500)
    }

    const { error: connError } = await admin.from('outlook_connections').upsert({
      user_id: user.id,
      outlook_email: email,
      scopes: grantedScopes,
      token_expiry: expiry,
      status: 'connected',
      connected_at: new Date().toISOString(),
    })

    if (connError) {
      return json({ error: connError.message }, 500)
    }

    return json({ success: true, email })
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

function resolveOutlookEmail(profile: {
  mail?: string | null
  userPrincipalName?: string | null
  otherMails?: string[] | null
}): string | null {
  const candidates = [
    profile.mail,
    ...(profile.otherMails ?? []),
    profile.userPrincipalName,
  ]

  for (const candidate of candidates) {
    const normalized = candidate?.trim().toLowerCase()
    if (normalized && normalized.includes('@')) {
      return normalized
    }
  }

  return null
}
