import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsPreflightResponse, getCorsHeaders } from '../_shared/cors.ts'
import { notifyWeTravelBookingCalendar } from '../_shared/emailAssistant.ts'

let corsHeaders: Record<string, string> = {}

/**
 * WeTravel Svix webhooks (booking / payment events).
 * Configure the endpoint URL in WeTravel Profile → Webhooks → Manage Webhooks.
 *
 * Optional shared secret: WETRAVEL_WEBHOOK_SECRET (checked via query ?secret= or
 * X-WeTravel-Webhook-Secret header). Map user via ?user_id=<uuid>.
 *
 * After upserting the booking row, asks the tenant email assistant to create /
 * update / cancel a Google or Outlook calendar event and stores calendar_event_id.
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return corsPreflightResponse(req)
  }

  corsHeaders = getCorsHeaders(req)

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }

  try {
    const url = new URL(req.url)
    const userId = (url.searchParams.get('user_id') || '').trim()
    const querySecret = (url.searchParams.get('secret') || '').trim()
    const headerSecret = (req.headers.get('X-WeTravel-Webhook-Secret') || '').trim()
    const expectedSecret = (Deno.env.get('WETRAVEL_WEBHOOK_SECRET') || '').trim()

    if (expectedSecret) {
      const provided = querySecret || headerSecret
      if (provided !== expectedSecret) {
        return json({ error: 'Invalid webhook secret' }, 401)
      }
    }

    if (!userId) {
      return json({
        error: 'Missing user_id query param. Use .../wetravel-webhook?user_id=<clinty-user-uuid>',
      }, 400)
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const body = await req.json().catch(() => ({})) as Record<string, unknown>
    const eventType = extractEventType(body)
    const booking = extractBookingPayload(body)

    if (!booking) {
      return json({ ok: true, ignored: true, eventType })
    }

    const orderId = stringOrNull(booking.id) || stringOrNull(booking.uuid) || stringOrNull(booking.order_id)
    if (!orderId) {
      return json({ ok: true, ignored: true, reason: 'no_order_id', eventType })
    }

    const trip = (booking.trip && typeof booking.trip === 'object')
      ? booking.trip as Record<string, unknown>
      : {}
    const buyer = (booking.buyer && typeof booking.buyer === 'object')
      ? booking.buyer as Record<string, unknown>
      : (booking.participant && typeof booking.participant === 'object')
        ? booking.participant as Record<string, unknown>
        : {}

    const tripTitle = stringOrNull(trip.title) || stringOrNull(booking.trip_title)
    const buyerEmail = stringOrNull(buyer.email) || stringOrNull(booking.email)
    const buyerName =
      stringOrNull(buyer.full_name)
      || stringOrNull(buyer.name)
      || [stringOrNull(buyer.first_name), stringOrNull(buyer.last_name)].filter(Boolean).join(' ')
      || null
    const status = stringOrNull(booking.status) || eventType
    const startDate = dateOrNull(trip.start_date || booking.start_date)
    const endDate = dateOrNull(trip.end_date || booking.end_date)
    const amount = numberOrNull(booking.amount ?? booking.total ?? booking.price)
    const currency = stringOrNull(booking.currency) || stringOrNull(trip.currency)

    const { data: existing } = await admin
      .from('wetravel_bookings')
      .select('calendar_event_id')
      .eq('user_id', userId)
      .eq('wetravel_order_id', orderId)
      .maybeSingle()

    const existingEventId =
      typeof existing?.calendar_event_id === 'string' && existing.calendar_event_id.trim()
        ? existing.calendar_event_id.trim()
        : null

    const { error } = await admin.from('wetravel_bookings').upsert(
      {
        user_id: userId,
        wetravel_order_id: orderId,
        trip_uuid: stringOrNull(trip.uuid) || stringOrNull(booking.trip_uuid),
        trip_title: tripTitle,
        buyer_email: buyerEmail,
        buyer_name: buyerName,
        status,
        start_date: startDate,
        end_date: endDate,
        amount,
        currency,
        payload: body,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,wetravel_order_id' },
    )

    if (error) {
      return json({ error: error.message }, 500)
    }

    const calendar = await notifyWeTravelBookingCalendar(admin, userId, {
      order_id: orderId,
      trip_title: tripTitle,
      buyer_email: buyerEmail,
      buyer_name: buyerName,
      status,
      start_date: startDate,
      end_date: endDate,
      amount,
      currency,
      calendar_event_id: existingEventId,
    })

    let storedEventId = existingEventId
    if (calendar.ok && calendar.calendar_event_id !== undefined) {
      storedEventId = calendar.calendar_event_id
      const { error: calendarUpdateError } = await admin
        .from('wetravel_bookings')
        .update({
          calendar_event_id: calendar.calendar_event_id,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
        .eq('wetravel_order_id', orderId)

      if (calendarUpdateError) {
        return json({
          ok: true,
          eventType,
          orderId,
          calendar: {
            ...calendar,
            store_error: calendarUpdateError.message,
          },
        })
      }
    }

    return json({
      ok: true,
      eventType,
      orderId,
      calendar_event_id: storedEventId,
      calendar,
    })
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Unexpected error' }, 500)
  }
})

function extractEventType(body: Record<string, unknown>): string {
  if (typeof body.type === 'string') return body.type
  if (typeof body.event_type === 'string') return body.event_type
  if (typeof body.event === 'string') return body.event
  return 'unknown'
}

function extractBookingPayload(body: Record<string, unknown>): Record<string, unknown> | null {
  for (const key of ['booking', 'order', 'data']) {
    const value = body[key]
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const row = value as Record<string, unknown>
      if (row.booking && typeof row.booking === 'object') {
        return row.booking as Record<string, unknown>
      }
      return row
    }
  }
  if (body.id || body.uuid || body.order_id) {
    return body
  }
  return null
}

function stringOrNull(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed || null
}

function numberOrNull(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function dateOrNull(value: unknown): string | null {
  const raw = stringOrNull(value)
  if (!raw) return null
  const match = raw.match(/^(\d{4}-\d{2}-\d{2})/)
  return match?.[1] ?? null
}

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
