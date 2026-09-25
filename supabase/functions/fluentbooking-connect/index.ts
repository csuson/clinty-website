import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { activateBookingProvider } from '../_shared/bookingProviderSwitch.ts'
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

    const body = await req.json().catch(() => ({}))
    const siteUrl = normalizeSiteUrl(typeof body.site_url === 'string' ? body.site_url : '')
    const username = typeof body.username === 'string' ? body.username.trim() : ''
    const appPasswordInput = typeof body.app_password === 'string' ? body.app_password.trim() : ''
    const calendarId = typeof body.calendar_id === 'string' ? body.calendar_id.trim() : ''
    const eventId = typeof body.event_id === 'string' ? body.event_id.trim() : ''
    const timezone =
      typeof body.timezone === 'string' && body.timezone.trim()
        ? body.timezone.trim()
        : 'America/Los_Angeles'
    const displayName =
      typeof body.display_name === 'string' && body.display_name.trim()
        ? body.display_name.trim()
        : null

    const { data: existing } = await admin
      .from('fluentbooking_tokens')
      .select('site_url, username, app_password, calendar_id, event_id, timezone')
      .eq('user_id', user.id)
      .maybeSingle()

    const resolvedSite = siteUrl || normalizeSiteUrl(String(existing?.site_url ?? ''))
    const resolvedUser = username || String(existing?.username ?? '').trim()
    const resolvedPassword = appPasswordInput.replace(/\s+/g, '')
      || String(existing?.app_password ?? '').trim()
    const resolvedCalendar = calendarId || String(existing?.calendar_id ?? '').trim()
    const resolvedEvent = eventId || String(existing?.event_id ?? '').trim()
    const resolvedTimezone = timezone || String(existing?.timezone ?? 'America/Los_Angeles')

    if (!resolvedSite || !resolvedUser || !resolvedPassword || !resolvedCalendar) {
      return json({
        error: 'Provide WordPress site URL, username, application password, and FluentBooking calendar ID.',
      }, 400)
    }

    const validated = await validateFluentBooking(
      resolvedSite,
      resolvedUser,
      resolvedPassword,
    )
    if (!validated.ok) {
      await admin.from('fluentbooking_connections').upsert({
        user_id: user.id,
        site_url: resolvedSite,
        display_name: displayName,
        calendar_id: resolvedCalendar,
        event_id: resolvedEvent || null,
        status: 'error',
        last_error: validated.error,
        connected_at: new Date().toISOString(),
      })
      return json({ error: validated.error }, 400)
    }

    const { error: tokenError } = await admin.from('fluentbooking_tokens').upsert({
      user_id: user.id,
      site_url: resolvedSite,
      username: resolvedUser,
      app_password: resolvedPassword,
      calendar_id: resolvedCalendar,
      event_id: resolvedEvent || null,
      timezone: resolvedTimezone,
      updated_at: new Date().toISOString(),
    })
    if (tokenError) return json({ error: tokenError.message }, 500)

    const { error: connError } = await admin.from('fluentbooking_connections').upsert({
      user_id: user.id,
      site_url: resolvedSite,
      display_name: displayName,
      calendar_id: resolvedCalendar,
      event_id: resolvedEvent || null,
      status: 'connected',
      last_error: null,
      connected_at: new Date().toISOString(),
    })
    if (connError) return json({ error: connError.message }, 500)

    const exclusive = await activateBookingProvider(admin, user.id, 'fluentbooking')

    const assistantReload = await notifyEmailAssistantRuntimeReload(admin, user.id, {
      ...exclusive,
      calendar_provider: 'fluentbooking',
      fluentbooking_site_url: resolvedSite,
      fluentbooking_username: resolvedUser,
      fluentbooking_app_password: resolvedPassword,
      fluentbooking_calendar_id: resolvedCalendar,
      fluentbooking_event_id: resolvedEvent,
      fluentbooking_timezone: resolvedTimezone,
    })

    return json({
      success: true,
      site_url: resolvedSite,
      calendar_provider: 'fluentbooking',
      assistant_url: assistantReload.assistantUrl ?? null,
      assistant_reloaded: assistantReload.ok,
      assistant_reload_error: assistantReload.ok ? undefined : assistantReload.detail,
    })
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Unexpected error' }, 500)
  }
})

function normalizeSiteUrl(raw: string): string {
  const trimmed = raw.trim().replace(/\/$/, '')
  if (!trimmed) return ''
  try {
    const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
    const url = new URL(withProtocol)
    return `${url.protocol}//${url.host}`
  } catch {
    return ''
  }
}

async function validateFluentBooking(
  siteUrl: string,
  username: string,
  appPassword: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const token = btoa(`${username}:${appPassword}`)
  try {
    const response = await fetch(
      `${siteUrl}/wp-json/fluent-booking/v2/bookings?per_page=1`,
      {
        headers: {
          Authorization: `Basic ${token}`,
          Accept: 'application/json',
        },
        signal: AbortSignal.timeout(20_000),
      },
    )
    if (response.ok) return { ok: true }
    if (response.status === 401 || response.status === 403) {
      return { ok: false, error: 'FluentBooking auth failed. Check username and application password.' }
    }
    // Some sites restrict /bookings but still have FluentBooking installed.
    if (response.status === 404) {
      return {
        ok: false,
        error: 'FluentBooking REST API not found. Confirm the plugin is active and permalinks are set.',
      }
    }
    return { ok: false, error: `FluentBooking returned HTTP ${response.status}` }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Could not reach WordPress site',
    }
  }
}

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
