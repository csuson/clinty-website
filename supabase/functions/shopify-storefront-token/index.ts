import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { notifyEmailAssistantRuntimeReload } from '../_shared/emailAssistant.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
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
      return json({ error: 'Unauthorized' }, 401)
    }

    const body = await req.json().catch(() => ({}))
    const shopDomain = normalizeShopDomain(typeof body.shop_domain === 'string' ? body.shop_domain : '')
    const token = typeof body.storefront_token === 'string' ? body.storefront_token.trim() : ''
    const tokenType = body.token_type === 'private' ? 'private' : 'public'

    if (!shopDomain) {
      return json({ error: 'Enter a valid Shopify store domain.' }, 400)
    }

    const { data: existing } = await admin
      .from('shopify_tokens')
      .select('storefront_access_token')
      .eq('user_id', user.id)
      .maybeSingle()

    const nextToken = token || existing?.storefront_access_token
    if (!nextToken) {
      return json({ error: 'Paste a Shopify Storefront access token.' }, 400)
    }

    const { error: tokenError } = await admin.from('shopify_tokens').upsert({
      user_id: user.id,
      shop_domain: shopDomain,
      storefront_access_token: nextToken,
      storefront_token_type: tokenType,
      access_token: null,
      client_id: null,
      scopes: [],
      updated_at: new Date().toISOString(),
    })

    if (tokenError) {
      return json({ error: tokenError.message }, 500)
    }

    const { error: connError } = await admin.from('shopify_connections').upsert({
      user_id: user.id,
      shop_domain: shopDomain,
      shop_name: shopDomain.replace(/\.myshopify\.com$/, ''),
      scopes: [],
      status: 'connected',
      storefront_ready: true,
      connected_at: new Date().toISOString(),
    })

    if (connError) {
      return json({ error: connError.message }, 500)
    }

    const assistantReload = await notifyEmailAssistantRuntimeReload(admin, user.id, {
      shopify_store_domain: shopDomain,
      shopify_storefront_token: nextToken,
      shopify_token_type: tokenType,
    })

    return json({
      success: true,
      shop_domain: shopDomain,
      assistant_url: assistantReload.assistantUrl ?? null,
      assistant_reloaded: assistantReload.ok,
      assistant_reload_error: assistantReload.ok ? undefined : assistantReload.detail,
    })
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

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
