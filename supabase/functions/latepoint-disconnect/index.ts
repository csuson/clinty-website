import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { notifyEmailAssistantRuntimeReload } from '../_shared/emailAssistant.ts'
import { corsPreflightResponse, getCorsHeaders } from '../_shared/cors.ts'

let corsHeaders: Record<string, string> = {}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return corsPreflightResponse(req)
  corsHeaders = getCorsHeaders(req)

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Missing authorization header' }, 401)

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
    if (userError || !user) return json({ error: 'Unauthorized' }, 401)

    await admin.from('latepoint_tokens').delete().eq('user_id', user.id)
    await admin.from('latepoint_connections').upsert({
      user_id: user.id,
      status: 'disconnected',
      last_error: null,
      connected_at: new Date().toISOString(),
    })

    const { data: settings } = await admin
      .from('agent_settings')
      .select('calendar_provider')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (String(settings?.calendar_provider ?? '').toLowerCase() === 'latepoint') {
      await admin.from('agent_settings').update({
        calendar_provider: null,
        updated_at: new Date().toISOString(),
      }).eq('user_id', user.id)
    }

    const assistantReload = await notifyEmailAssistantRuntimeReload(admin, user.id, {
      calendar_provider: '',
      latepoint_site_url: '',
      latepoint_api_key: '',
      latepoint_service_id: '',
      latepoint_agent_id: '',
      latepoint_location_id: '',
      latepoint_timezone: '',
    })

    return json({
      success: true,
      assistant_reloaded: assistantReload.ok,
      assistant_reload_error: assistantReload.ok ? undefined : assistantReload.detail,
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
