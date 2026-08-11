import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    const { data: row, error: fetchError } = await admin
      .from('gmail_tokens')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()

    if (fetchError) {
      return json({ error: fetchError.message }, 500)
    }

    if (!row) {
      return json({ error: 'No Gmail token found. Connect Gmail first.' }, 404)
    }

    const expiry = row.expiry
      ? new Date(row.expiry).toISOString().replace(/\.\d{3}Z$/, 'Z')
      : ''

    // Same shape as setup_gmail.py → .secrets/token.json
    const token = {
      token: row.access_token,
      refresh_token: row.refresh_token,
      token_uri: row.token_uri,
      client_id: row.client_id,
      client_secret: row.client_secret,
      scopes: row.scopes,
      universe_domain: row.universe_domain ?? 'googleapis.com',
      account: row.google_account ?? '',
      expiry,
    }

    return json({ token })
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
