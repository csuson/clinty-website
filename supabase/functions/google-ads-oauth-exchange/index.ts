import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import {
  publicGoogleCredentialsStatus,
  withoutStoredDeveloperToken,
} from '../_shared/googleAdsCredentials.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SCOPES = ['https://www.googleapis.com/auth/adwords']

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

    const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET')
    const envClientId = Deno.env.get('GOOGLE_CLIENT_ID')
    const effectiveClientId = clientId || envClientId

    if (!effectiveClientId || !clientSecret) {
      return json({
        error: 'Google OAuth not configured on server. Set GOOGLE_CLIENT_SECRET (and optionally GOOGLE_CLIENT_ID) in Supabase Edge Function secrets.',
      }, 500)
    }

    if (envClientId && clientId && envClientId !== clientId) {
      return json({
        error: 'GOOGLE_CLIENT_ID in Supabase secrets must match VITE_GOOGLE_CLIENT_ID in your website .env',
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
      }),
    })

    const tokenData = await tokenRes.json()
    if (!tokenRes.ok) {
      return json({
        error: tokenData.error_description ?? tokenData.error ?? 'Token exchange failed',
      }, 400)
    }

    if (!tokenData.refresh_token) {
      return json({
        error: 'Google did not return a refresh token. Disconnect any prior Google Ads authorization for this app and try again with consent.',
      }, 400)
    }

    const { data: existing } = await admin
      .from('google_ads_connections')
      .select('platform_credentials')
      .eq('user_id', user.id)
      .maybeSingle()

    const current = parseStoredPlatformCredentials(existing?.platform_credentials)
    const google = current.google ?? {}

    const merged = {
      ...current,
      google: withoutStoredDeveloperToken({
        ...google,
        client_id: effectiveClientId,
        client_secret: clientSecret,
        refresh_token: tokenData.refresh_token,
        use_proto_plus: google.use_proto_plus !== false,
      }),
    }

    const now = new Date().toISOString()
    const { error: upsertError } = await admin.from('google_ads_connections').upsert({
      user_id: user.id,
      platform_credentials: merged,
      updated_at: now,
    })

    if (upsertError) {
      return json({ error: upsertError.message }, 500)
    }

    return json({
      success: true,
      platformCredentials: publicPlatformCredentialsStatus(merged),
      scopes: SCOPES,
    })
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Unexpected error' }, 500)
  }
})

type StoredGoogleCredentials = {
  developer_token?: string
  client_id?: string
  client_secret?: string
  refresh_token?: string
  customer_id?: string
  login_customer_id?: string
  use_proto_plus?: boolean
}

type StoredFacebookCredentials = {
  access_token?: string
  ad_account_id?: string
  page_id?: string
  pixel_id?: string
}

type StoredYelpCredentials = {
  username?: string
  password?: string
  business_id?: string
  api_base?: string
}

type StoredPlatformCredentials = {
  google?: StoredGoogleCredentials
  facebook?: StoredFacebookCredentials
  yelp?: StoredYelpCredentials
}

function parseStoredPlatformCredentials(value: unknown): StoredPlatformCredentials {
  if (!value || typeof value !== 'object') return {}
  return value as StoredPlatformCredentials
}

function googleConfigured(google?: StoredGoogleCredentials): boolean {
  return publicGoogleCredentialsStatus(google).configured
}

function facebookConfigured(facebook?: StoredFacebookCredentials): boolean {
  if (!facebook) return false
  return Boolean(facebook.access_token && facebook.ad_account_id && facebook.page_id)
}

function yelpConfigured(yelp?: StoredYelpCredentials): boolean {
  if (!yelp) return false
  return Boolean(yelp.username && yelp.password && yelp.business_id)
}

function publicPlatformCredentialsStatus(stored: StoredPlatformCredentials) {
  const google = stored.google
  const facebook = stored.facebook
  const yelp = stored.yelp

  return {
    google: publicGoogleCredentialsStatus(google),
    facebook: {
      configured: facebookConfigured(facebook),
      hasAccessToken: Boolean(facebook?.access_token),
      adAccountId: facebook?.ad_account_id ?? '',
      pageId: facebook?.page_id ?? '',
      pixelId: facebook?.pixel_id ?? '',
    },
    yelp: {
      configured: yelpConfigured(yelp),
      hasPassword: Boolean(yelp?.password),
      username: yelp?.username ?? '',
      businessId: yelp?.business_id ?? '',
      apiBase: yelp?.api_base ?? '',
    },
  }
}

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
