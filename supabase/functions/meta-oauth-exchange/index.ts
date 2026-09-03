import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { publicGoogleCredentialsStatus } from '../_shared/googleAdsCredentials.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const GRAPH_VERSION = 'v21.0'

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

    const { code, redirectUri, appId } = await req.json()
    if (!code || !redirectUri) {
      return json({ error: 'Missing code or redirectUri' }, 400)
    }

    const clientSecret = Deno.env.get('META_APP_SECRET')
    const envAppId = Deno.env.get('META_APP_ID')
    const effectiveAppId = appId || envAppId

    if (!effectiveAppId || !clientSecret) {
      return json({
        error: 'Meta OAuth not configured on server. Set META_APP_SECRET (and optionally META_APP_ID) in Supabase Edge Function secrets.',
      }, 500)
    }

    if (envAppId && appId && envAppId !== appId) {
      return json({
        error: 'META_APP_ID in Supabase secrets must match VITE_META_APP_ID in your website .env',
      }, 400)
    }

    const shortTokenParams = new URLSearchParams({
      client_id: effectiveAppId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      code,
    })

    const shortTokenRes = await fetch(
      `https://graph.facebook.com/${GRAPH_VERSION}/oauth/access_token?${shortTokenParams.toString()}`,
    )
    const shortTokenData = await shortTokenRes.json()

    if (!shortTokenRes.ok || !shortTokenData.access_token) {
      return json({
        error: shortTokenData.error?.message ?? shortTokenData.error ?? 'Meta token exchange failed',
      }, 400)
    }

    const longTokenParams = new URLSearchParams({
      grant_type: 'fb_exchange_token',
      client_id: effectiveAppId,
      client_secret: clientSecret,
      fb_exchange_token: shortTokenData.access_token,
    })

    const longTokenRes = await fetch(
      `https://graph.facebook.com/${GRAPH_VERSION}/oauth/access_token?${longTokenParams.toString()}`,
    )
    const longTokenData = await longTokenRes.json()

    if (!longTokenRes.ok || !longTokenData.access_token) {
      return json({
        error: longTokenData.error?.message ?? longTokenData.error ?? 'Meta long-lived token exchange failed',
      }, 400)
    }

    const accessToken = longTokenData.access_token as string

    const metaUserId = await fetchMetaUserId(accessToken)

    const [adAccounts, pages] = await Promise.all([
      fetchMetaAdAccounts(accessToken),
      fetchMetaPages(accessToken),
    ])

    const { data: existing } = await admin
      .from('google_ads_connections')
      .select('platform_credentials')
      .eq('user_id', user.id)
      .maybeSingle()

    const current = parseStoredPlatformCredentials(existing?.platform_credentials)
    const facebook = current.facebook ?? {}

    const autoAdAccount = adAccounts.length === 1 ? adAccounts[0].accountId : facebook.ad_account_id ?? ''
    const autoPage = pages.length === 1 ? pages[0].id : facebook.page_id ?? ''

    const merged = {
      ...current,
      facebook: {
        ...facebook,
        access_token: accessToken,
        meta_user_id: metaUserId ?? facebook.meta_user_id ?? '',
        ad_account_id: autoAdAccount || facebook.ad_account_id || '',
        page_id: autoPage || facebook.page_id || '',
      },
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
      adAccounts,
      pages,
    })
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Unexpected error' }, 500)
  }
})

async function fetchMetaUserId(accessToken: string): Promise<string | null> {
  const params = new URLSearchParams({
    fields: 'id',
    access_token: accessToken,
  })

  const res = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/me?${params.toString()}`)
  const data = await res.json() as { id?: string }

  if (!res.ok || typeof data.id !== 'string' || !data.id.trim()) return null
  return data.id.trim()
}

async function fetchMetaAdAccounts(accessToken: string): Promise<Array<{ id: string; name: string; accountId: string }>> {
  const params = new URLSearchParams({
    fields: 'id,name,account_id',
    access_token: accessToken,
    limit: '100',
  })

  const res = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/me/adaccounts?${params.toString()}`)
  const data = await res.json()

  if (!res.ok || !Array.isArray(data.data)) return []

  return data.data
    .filter((row: { account_id?: string; id?: string }) => row.account_id || row.id)
    .map((row: { id?: string; name?: string; account_id?: string }) => {
      const accountId = row.account_id
        ? (row.account_id.startsWith('act_') ? row.account_id : `act_${row.account_id}`)
        : (row.id ?? '')
      return {
        id: row.id ?? accountId,
        name: row.name ?? accountId,
        accountId,
      }
    })
}

async function fetchMetaPages(accessToken: string): Promise<Array<{ id: string; name: string }>> {
  const params = new URLSearchParams({
    fields: 'id,name',
    access_token: accessToken,
    limit: '100',
  })

  const res = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/me/accounts?${params.toString()}`)
  const data = await res.json()

  if (!res.ok || !Array.isArray(data.data)) return []

  return data.data
    .filter((row: { id?: string }) => row.id)
    .map((row: { id: string; name?: string }) => ({
      id: row.id,
      name: row.name ?? row.id,
    }))
}

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
  meta_user_id?: string
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
