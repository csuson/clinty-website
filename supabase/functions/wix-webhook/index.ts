import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsPreflightResponse, getCorsHeaders } from '../_shared/cors.ts'

let corsHeaders: Record<string, string> = {}

/** Wix Bookings webhook → store booking row. Query: ?user_id= */
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
    const data = (body.data && typeof body.data === 'object')
      ? body.data as Record<string, unknown>
      : body
    const booking = (data.booking && typeof data.booking === 'object')
      ? data.booking as Record<string, unknown>
      : (data.createdBooking && typeof data.createdBooking === 'object')
        ? data.createdBooking as Record<string, unknown>
        : data

    const externalId = stringOrNull(booking.id)
      || stringOrNull(booking.bookingId)
      || stringOrNull(data.id)
      || stringOrNull(body.instanceId)
    if (!externalId) return json({ ok: true, ignored: true, reason: 'no_booking_id' })

    const contact = (booking.contactDetails && typeof booking.contactDetails === 'object')
      ? booking.contactDetails as Record<string, unknown>
      : (booking.formInfo && typeof booking.formInfo === 'object')
        ? booking.formInfo as Record<string, unknown>
        : {}

    const bookedEntity = (booking.bookedEntity && typeof booking.bookedEntity === 'object')
      ? booking.bookedEntity as Record<string, unknown>
      : {}
    const slot = (bookedEntity.slot && typeof bookedEntity.slot === 'object')
      ? bookedEntity.slot as Record<string, unknown>
      : (booking.slot && typeof booking.slot === 'object')
        ? booking.slot as Record<string, unknown>
        : {}

    const { error } = await admin.from('wix_bookings').upsert(
      {
        user_id: userId,
        external_booking_id: String(externalId),
        service_id: stringOrNull(slot.serviceId)
          || stringOrNull(bookedEntity.serviceId)
          || stringOrNull(booking.serviceId),
        guest_email: stringOrNull(contact.email)
          || stringOrNull(booking.email),
        guest_name: [
          stringOrNull(contact.firstName) || stringOrNull(contact.first_name),
          stringOrNull(contact.lastName) || stringOrNull(contact.last_name),
        ].filter(Boolean).join(' ')
          || stringOrNull(contact.name)
          || stringOrNull(booking.contactName),
        status: stringOrNull(booking.status)
          || stringOrNull(body.eventType)
          || stringOrNull(body.actionEvent)
          || 'unknown',
        start_time: stringOrNull(slot.startDate)
          || stringOrNull(booking.startDate)
          || stringOrNull(booking.startTime),
        end_time: stringOrNull(slot.endDate)
          || stringOrNull(booking.endDate)
          || stringOrNull(booking.endTime),
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

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
