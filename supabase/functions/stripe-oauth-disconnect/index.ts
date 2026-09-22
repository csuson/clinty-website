import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsPreflightResponse, getCorsHeaders } from '../_shared/cors.ts'

let corsHeaders: Record<string, string> = {}

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

    const { data: tokenRow } = await admin
      .from('stripe_tokens')
      .select('stripe_account_id, client_id')
      .eq('user_id', user.id)
      .maybeSingle()

    const clientSecret = Deno.env.get('STRIPE_SECRET_KEY')
    const clientId =
      (typeof tokenRow?.client_id === 'string' && tokenRow.client_id.trim())
      || Deno.env.get('STRIPE_CONNECT_CLIENT_ID')?.trim()
      || null
    const stripeAccountId =
      typeof tokenRow?.stripe_account_id === 'string' ? tokenRow.stripe_account_id.trim() : ''

    if (clientSecret && clientId && stripeAccountId) {
      const body = new URLSearchParams({
        client_id: clientId,
        stripe_user_id: stripeAccountId,
      })

      try {
        await fetch('https://connect.stripe.com/oauth/deauthorize', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${clientSecret}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: body.toString(),
        })
      } catch {
        // Best-effort deauthorize; always clear local tokens below.
      }
    }

    await admin.from('stripe_tokens').delete().eq('user_id', user.id)
    await admin.from('stripe_connections').upsert({
      user_id: user.id,
      status: 'disconnected',
      stripe_account_id: null,
      business_name: null,
      email: null,
      country: null,
      default_currency: null,
      livemode: false,
      scopes: [],
    })

    return json({ success: true })
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
