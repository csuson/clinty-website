/**
 * Booking integrations are mutually exclusive (except Gmail/Google Calendar).
 * Connecting one sets CALENDAR_PROVIDER and disconnects the others.
 */

import type { AssistantReloadPayload } from './emailAssistant.ts'

export type BookingProvider = 'square' | 'wetravel' | 'fluentbooking' | 'latepoint'

type AdminClient = {
  from: (table: string) => Record<string, any>
}

const BOOKING_PROVIDERS: BookingProvider[] = [
  'square',
  'wetravel',
  'fluentbooking',
  'latepoint',
]

/** Clear runtime keys for a provider that is no longer active. */
export function clearBookingProviderReloadPayload(
  provider: BookingProvider,
): AssistantReloadPayload {
  switch (provider) {
    case 'square':
      return {
        square_access_token: '',
        square_location_id: '',
        square_team_member_id: '',
        square_service_variation_id: '',
        square_service_variation_version: '',
        square_timezone: '',
      }
    case 'wetravel':
      return {
        wetravel_api_key: '',
        wetravel_sandbox: '0',
      }
    case 'fluentbooking':
      return {
        fluentbooking_site_url: '',
        fluentbooking_username: '',
        fluentbooking_app_password: '',
        fluentbooking_calendar_id: '',
        fluentbooking_event_id: '',
        fluentbooking_timezone: '',
      }
    case 'latepoint':
      return {
        latepoint_site_url: '',
        latepoint_api_key: '',
        latepoint_service_id: '',
        latepoint_agent_id: '',
        latepoint_location_id: '',
        latepoint_timezone: '',
      }
  }
}

/**
 * Disconnect every booking provider except `active`, and set calendar_provider.
 * Does not touch Gmail / Outlook / Yahoo mail tokens.
 */
export async function activateBookingProvider(
  admin: AdminClient,
  userId: string,
  active: BookingProvider,
): Promise<AssistantReloadPayload> {
  const now = new Date().toISOString()
  const clearPayload: AssistantReloadPayload = {
    calendar_provider: active,
  }

  for (const provider of BOOKING_PROVIDERS) {
    if (provider === active) continue
    Object.assign(clearPayload, clearBookingProviderReloadPayload(provider))
    await disconnectBookingProvider(admin, userId, provider, now)
  }

  await setCalendarProvider(admin, userId, active, now)

  if (active !== 'square') {
    await clearSquareAgentSettingsFields(admin, userId, now)
  }

  return clearPayload
}

async function setCalendarProvider(
  admin: AdminClient,
  userId: string,
  provider: BookingProvider,
  now: string,
): Promise<void> {
  const { data: rows } = await admin
    .from('agent_settings')
    .select('id')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(1)

  if (!rows?.length) return

  await admin
    .from('agent_settings')
    .update({
      calendar_provider: provider,
      updated_at: now,
    })
    .eq('id', rows[0].id)
}

async function clearSquareAgentSettingsFields(
  admin: AdminClient,
  userId: string,
  now: string,
): Promise<void> {
  const { data: rows } = await admin
    .from('agent_settings')
    .select('id')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(1)

  if (!rows?.length) return

  await admin
    .from('agent_settings')
    .update({
      square_access_token: null,
      square_location_id: null,
      square_timezone: null,
      square_team_member_id: null,
      square_service_variation_id: null,
      square_service_variation_version: null,
      updated_at: now,
    })
    .eq('id', rows[0].id)
}

async function disconnectBookingProvider(
  admin: AdminClient,
  userId: string,
  provider: BookingProvider,
  now: string,
): Promise<void> {
  switch (provider) {
    case 'square':
      await admin.from('square_tokens').delete().eq('user_id', userId)
      await admin.from('square_connections').upsert({
        user_id: userId,
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
      break
    case 'wetravel':
      await admin.from('wetravel_tokens').delete().eq('user_id', userId)
      await admin.from('wetravel_connections').upsert({
        user_id: userId,
        status: 'disconnected',
        last_error: null,
        connected_at: now,
      })
      break
    case 'fluentbooking':
      await admin.from('fluentbooking_tokens').delete().eq('user_id', userId)
      await admin.from('fluentbooking_connections').upsert({
        user_id: userId,
        status: 'disconnected',
        last_error: null,
        connected_at: now,
      })
      break
    case 'latepoint':
      await admin.from('latepoint_tokens').delete().eq('user_id', userId)
      await admin.from('latepoint_connections').upsert({
        user_id: userId,
        status: 'disconnected',
        last_error: null,
        connected_at: now,
      })
      break
  }
}
