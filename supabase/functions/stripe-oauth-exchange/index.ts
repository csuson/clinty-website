import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsPreflightResponse, getCorsHeaders } from '../_shared/cors.ts'

let corsHeaders: Record<string, string> = {}

const SCOPES = ['read_write']

async function fetchAccountContext(
  accessToken: string,
  stripeAccountId: string,
): Promise<{
  businessName: string | null
  email: string | null
  country: string | null
  defaultCurrency: string | null
}> {
  const res = await fetch(`https://api.stripe.com/v1/accounts/${stripeAccountId}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!res.ok) {
    return {
      businessName: null,
      email: null,
      country: null,
      defaultCurrency: null,
    }
  }

  const account = await res.json() as {
    business_profile?: { name?: string | null }
    settings?: { dashboard?: { display_name?: string | null } }
    email?: string | null
    country?: string | null
    default_currency?: string | null
  }

  const businessName =
    account.business_profile?.name
    ?? account.settings?.dashboard?.display_name
    ?? null

  return {
    businessName,
    email: account.email ?? null,
    country: account.country ?? null,
    defaultCurrency: account.default_currency ?? null,
  }
}

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

    const { code, redirectUri, clientId } = await req.json()
    if (!code || !redirectUri) {
      return json({ error: 'Missing code or redirectUri' }, 400)
    }

    const clientSecret = Deno.env.get('STRIPE_SECRET_KEY')
    const envClientId = Deno.env.get('STRIPE_CONNECT_CLIENT_ID')?.trim() || null
    const requestClientId = typeof clientId === 'string' ? clientId.trim() : ''
    const effectiveClientId = requestClientId || envClientId

    if (!effectiveClientId || !clientSecret) {
      return json({
        error: 'Stripe Connect OAuth not configured on server. Set STRIPE_SECRET_KEY (and optionally STRIPE_CONNECT_CLIENT_ID) in Supabase Edge Function secrets.',
      }, 500)
    }

    if (envClientId && requestClientId && envClientId !== requestClientId) {
      console.warn(
        'STRIPE_CONNECT_CLIENT_ID secret does not match VITE_STRIPE_CONNECT_CLIENT_ID; using request client_id for token exchange.',
      )
    }

    const tokenBody = new URLSearchParams({
      client_secret: clientSecret,
      code: String(code),
      grant_type: 'authorization_code',
    })

    const tokenRes = await fetch('https://connect.stripe.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: tokenBody.toString(),
    })

    const tokenData = await tokenRes.json() as {
      error?: string
      error_description?: string
      access_token?: string
      refresh_token?: string
      stripe_user_id?: string
      stripe_publishable_key?: string
      livemode?: boolean
      scope?: string
    }

    if (!tokenRes.ok) {
      const message = tokenData.error_description ?? tokenData.error ?? 'Token exchange failed'
      return json({ error: message }, 400)
    }

    const accessToken = tokenData.access_token
    const stripeAccountId = tokenData.stripe_user_id
    if (!accessToken || !stripeAccountId) {
      return json({ error: 'Stripe returned no access token or account id' }, 400)
    }

    const grantedScopes = typeof tokenData.scope === 'string'
      ? tokenData.scope.split(/[,\s]+/).map((scope) => scope.trim()).filter(Boolean)
      : [...SCOPES]

    const accountContext = await fetchAccountContext(accessToken, stripeAccountId)
    const livemode = Boolean(tokenData.livemode)

    const { error: tokenError } = await admin.from('stripe_tokens').upsert({
      user_id: user.id,
      access_token: accessToken,
      refresh_token: tokenData.refresh_token ?? null,
      stripe_account_id: stripeAccountId,
      client_id: effectiveClientId,
      publishable_key: tokenData.stripe_publishable_key ?? null,
      livemode,
      scopes: grantedScopes,
      updated_at: new Date().toISOString(),
    })

    if (tokenError) {
      return json({ error: tokenError.message }, 500)
    }

    const { error: connError } = await admin.from('stripe_connections').upsert({
      user_id: user.id,
      stripe_account_id: stripeAccountId,
      business_name: accountContext.businessName,
      email: accountContext.email,
      country: accountContext.country,
      default_currency: accountContext.defaultCurrency,
      livemode,
      scopes: grantedScopes,
      status: 'connected',
      connected_at: new Date().toISOString(),
    })

    if (connError) {
      return json({ error: connError.message }, 500)
    }

    return json({
      success: true,
      stripeAccountId,
      businessName: accountContext.businessName,
      email: accountContext.email,
      country: accountContext.country,
      defaultCurrency: accountContext.defaultCurrency,
      livemode,
    })
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
