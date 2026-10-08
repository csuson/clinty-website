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
      resolvedCalendar,
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
  calendarId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const auth = basicAuthHeader(username, appPassword)
  const headers = {
    Authorization: auth,
    Accept: 'application/json',
  }

  try {
    const calendarRes = await fetch(
      `${siteUrl}/wp-json/fluent-booking/v2/calendars/${encodeURIComponent(calendarId)}`,
      { headers, signal: AbortSignal.timeout(20_000) },
    )
    if (calendarRes.ok) return { ok: true }
    if (calendarRes.status === 401 || calendarRes.status === 403) {
      return {
        ok: false,
        error: 'FluentBooking auth failed. Check username and application password.',
      }
    }

    const listRes = await fetch(
      `${siteUrl}/wp-json/fluent-booking/v2/calendars?per_page=100`,
      { headers, signal: AbortSignal.timeout(20_000) },
    )
    if (listRes.status === 401 || listRes.status === 403) {
      return {
        ok: false,
        error: 'FluentBooking auth failed. Check username and application password.',
      }
    }
    if (listRes.ok) {
      const listBody = await listRes.json().catch(() => null)
      if (calendarListIncludesId(listBody, calendarId)) return { ok: true }
      return {
        ok: false,
        error: `FluentBooking calendar ID "${calendarId}" was not found. Check the Calendar ID in FluentBooking.`,
      }
    }

    // Older sites / restricted calendar routes: fall back to bookings auth probe.
    const bookingsRes = await fetch(
      `${siteUrl}/wp-json/fluent-booking/v2/bookings?per_page=1`,
      { headers, signal: AbortSignal.timeout(20_000) },
    )
    if (bookingsRes.ok) {
      // API reachable; accept calendar ID as provided (show route may differ by version).
      return { ok: true }
    }
    if (bookingsRes.status === 401 || bookingsRes.status === 403) {
      return {
        ok: false,
        error: 'FluentBooking auth failed. Check username and application password.',
      }
    }
    if (bookingsRes.status === 404 && listRes.status === 404) {
      return {
        ok: false,
        error: 'FluentBooking REST API not found. Confirm the plugin is active and permalinks are set.',
      }
    }
    return {
      ok: false,
      error: `FluentBooking returned HTTP ${calendarRes.status || listRes.status || bookingsRes.status}`,
    }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Could not reach WordPress site',
    }
  }
}

function calendarListIncludesId(body: unknown, calendarId: string): boolean {
  if (!body || typeof body !== 'object') return false
  const record = body as Record<string, unknown>
  const candidates = [record.calendars, record.data, body]
  for (const candidate of candidates) {
    if (!Array.isArray(candidate)) continue
    for (const item of candidate) {
      if (!item || typeof item !== 'object') continue
      const row = item as Record<string, unknown>
      if (String(row.id ?? '') === calendarId) return true
      if (typeof row.hash === 'string' && row.hash === calendarId) return true
      if (typeof row.slug === 'string' && row.slug === calendarId) return true
    }
  }
  return false
}

function basicAuthHeader(username: string, password: string): string {
  const bytes = new TextEncoder().encode(`${username}:${password}`)
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return `Basic ${btoa(binary)}`
}

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
