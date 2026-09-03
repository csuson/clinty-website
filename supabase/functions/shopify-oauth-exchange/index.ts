import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SCOPES = ['read_products', 'read_inventory', 'read_orders', 'read_locations']
const API_VERSION = '2024-10'

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

    const body = await req.json()
    const { code, shop, clientId, hmac, timestamp, host } = body

    if (!code || !shop || !hmac || !timestamp) {
      return json({ error: 'Missing code, shop, hmac, or timestamp' }, 400)
    }

    const shopDomain = normalizeShopDomain(String(shop))
    if (!shopDomain) {
      return json({ error: 'Invalid Shopify shop domain' }, 400)
    }

    const clientSecret = Deno.env.get('SHOPIFY_CLIENT_SECRET')
    const envClientId = Deno.env.get('SHOPIFY_CLIENT_ID')
    const effectiveClientId = clientId || envClientId

    if (!effectiveClientId || !clientSecret) {
      return json({
        error: 'Shopify OAuth not configured on server. Set SHOPIFY_CLIENT_SECRET (and optionally SHOPIFY_CLIENT_ID) in Supabase Edge Function secrets.',
      }, 500)
    }

    if (envClientId && clientId && envClientId !== clientId) {
      return json({
        error: 'SHOPIFY_CLIENT_ID in Supabase secrets must match VITE_SHOPIFY_CLIENT_ID in your website .env',
      }, 400)
    }

    const callbackQuery: Record<string, string> = {
      code: String(code),
      shop: shopDomain,
      timestamp: String(timestamp),
      hmac: String(hmac),
    }
    if (host) callbackQuery.host = String(host)

    const hmacValid = await verifyShopifyHmac(callbackQuery, clientSecret)
    if (!hmacValid) {
      return json({ error: 'Invalid Shopify callback signature' }, 400)
    }

    const tokenRes = await fetch(`https://${shopDomain}/admin/oauth/access_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: effectiveClientId,
        client_secret: clientSecret,
        code,
      }),
    })

    const tokenData = await tokenRes.json()
    if (!tokenRes.ok) {
      return json({
        error: tokenData.error_description ?? tokenData.error ?? 'Token exchange failed',
      }, 400)
    }

    const accessToken = tokenData.access_token
    if (typeof accessToken !== 'string' || !accessToken) {
      return json({ error: 'Shopify returned no access token' }, 400)
    }

    const grantedScopes = typeof tokenData.scope === 'string'
      ? tokenData.scope.split(',').map((scope: string) => scope.trim()).filter(Boolean)
      : SCOPES

    let shopName: string | null = null
    let shopId: number | null = null
    const shopRes = await fetch(`https://${shopDomain}/admin/api/${API_VERSION}/shop.json`, {
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json',
      },
    })

    if (shopRes.ok) {
      const shopData = await shopRes.json()
      shopName = shopData?.shop?.name ?? null
      if (typeof shopData?.shop?.id === 'number') {
        shopId = shopData.shop.id
      }
    }

    const { error: tokenError } = await admin.from('shopify_tokens').upsert({
      user_id: user.id,
      shop_domain: shopDomain,
      shop_id: shopId,
      access_token: accessToken,
      client_id: effectiveClientId,
      scopes: grantedScopes,
      updated_at: new Date().toISOString(),
    })

    if (tokenError) {
      return json({ error: tokenError.message }, 500)
    }

    const { error: connError } = await admin.from('shopify_connections').upsert({
      user_id: user.id,
      shop_domain: shopDomain,
      shop_id: shopId,
      shop_name: shopName,
      scopes: grantedScopes,
      status: 'connected',
      connected_at: new Date().toISOString(),
    })

    if (connError) {
      return json({ error: connError.message }, 500)
    }

    return json({ success: true, shop_domain: shopDomain, shop_name: shopName })
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Unexpected error' }, 500)
  }
})

function normalizeShopDomain(raw: string): string | null {
  let value = raw.trim().toLowerCase()
  if (!value) return null

  value = value.replace(/^https?:\/\//, '').replace(/\/.*$/, '')
  if (!value.includes('.')) {
    value = `${value}.myshopify.com`
  }

  if (!/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(value)) {
    return null
  }

  return value
}

async function verifyShopifyHmac(
  query: Record<string, string>,
  secret: string,
): Promise<boolean> {
  const received = query.hmac
  if (!received) return false

  const message = Object.keys(query)
    .filter((key) => key !== 'hmac' && key !== 'signature')
    .sort()
    .map((key) => `${key}=${query[key]}`)
    .join('&')

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )

  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message))
  const generated = [...new Uint8Array(signature)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')

  return timingSafeEqual(generated, received.toLowerCase())
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return result === 0
}

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
