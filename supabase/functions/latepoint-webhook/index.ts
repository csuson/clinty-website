import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsPreflightResponse, getCorsHeaders } from '../_shared/cors.ts'

let corsHeaders: Record<string, string> = {}

/** LatePoint webhook → store booking row. Query: ?user_id= */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return corsPreflightResponse(req)
  corsHeaders = getCorsHeaders(req)
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  try {
    const url = new URL(req.url)
    const userId = (url.searchParams.get('user_id') || '').trim()
    if (!userId) return json({ error: 'Missing user_id' }, 400)

    const admin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const body = await req.json().catch(() => ({})) as Record<string, unknown>
    const booking = (body.booking && typeof body.booking === 'object')
      ? body.booking as Record<string, unknown>
      : (body.data && typeof body.data === 'object')
        ? body.data as Record<string, unknown>
        : body
    const externalId = stringOrNull(booking.id)
      || stringOrNull(booking.booking_code)
      || stringOrNull(body.id)
    if (!externalId) return json({ ok: true, ignored: true, reason: 'no_booking_id' })

    const customer = (booking.customer && typeof booking.customer === 'object')
      ? booking.customer as Record<string, unknown>
      : {}

    const { error } = await admin.from('latepoint_bookings').upsert(
      {
        user_id: userId,
        external_booking_id: String(externalId),
        service_id: stringOrNull(booking.service_id),
        guest_email: stringOrNull(customer.email) || stringOrNull(booking.email),
        guest_name: [stringOrNull(customer.first_name), stringOrNull(customer.last_name)]
          .filter(Boolean)
          .join(' ') || stringOrNull(booking.customer_name),
        status: stringOrNull(booking.status) || stringOrNull(body.event) || 'unknown',
        start_time: combineDateTime(booking.start_date, booking.start_time)
          || stringOrNull(booking.start_datetime),
        end_time: combineDateTime(booking.end_date, booking.end_time)
          || stringOrNull(booking.end_datetime),
        payload: body,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,external_booking_id' },
    )
    if (error) return json({ error: error.message }, 500)
    return json({ ok: true, externalId })
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Unexpected error' }, 500)
  }
})

function stringOrNull(value: unknown): string | null {
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed || null
}

function combineDateTime(dateValue: unknown, timeValue: unknown): string | null {
  const date = stringOrNull(dateValue)
  const time = stringOrNull(timeValue)
  if (!date) return null
  if (!time) return date
  return `${date}T${time}`
}

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
