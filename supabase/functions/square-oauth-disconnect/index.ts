import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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

    await admin.from('square_tokens').delete().eq('user_id', user.id)
    await admin.from('square_connections').upsert({
      user_id: user.id,
      status: 'disconnected',
      merchant_id: null,
      business_name: null,
      location_id: null,
      location_name: null,
      team_member_id: null,
      timezone: null,
      service_variation_id: null,
      service_variation_version: null,
      service_variation_name: null,
      scopes: [],
      token_expiry: null,
    })

    await admin
      .from('agent_settings')
      .update({
        square_access_token: null,
        calendar_provider: null,
        square_location_id: null,
        square_team_member_id: null,
        square_timezone: null,
        square_service_variation_id: null,
        square_service_variation_version: null,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)

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
