import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const SCOPES = [
  'MERCHANT_PROFILE_READ',
  'ITEMS_READ',
  'APPOINTMENTS_READ',
  'APPOINTMENTS_WRITE',
  'APPOINTMENTS_ALL_READ',
  'APPOINTMENTS_ALL_WRITE',
  'APPOINTMENTS_BUSINESS_SETTINGS_READ',
]

const SQUARE_VERSION = '2024-11-20'

function squareConnectHost(sandbox: boolean): string {
  return sandbox ? 'https://connect.squareupsandbox.com' : 'https://connect.squareup.com'
}

async function squareFetch(
  sandbox: boolean,
  accessToken: string,
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  return fetch(`${squareConnectHost(sandbox)}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Square-Version': SQUARE_VERSION,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  })
}

type BookableServiceVariation = {
  id: string
  version: number
  name: string
  itemName: string
}

function findBookableServiceVariation(items: unknown[]): BookableServiceVariation | null {
  for (const item of items) {
    if (!item || typeof item !== 'object') continue

    const catalogItem = item as {
      item_data?: {
        name?: string
        variations?: Array<{
          id?: string
          version?: number
          item_variation_data?: {
            name?: string
            available_for_booking?: boolean
          }
        }>
      }
    }

    const itemName = catalogItem.item_data?.name ?? 'Service'
    for (const variation of catalogItem.item_data?.variations ?? []) {
      if (!variation.id || variation.version == null) continue
      if (variation.item_variation_data?.available_for_booking !== true) continue

      const variationName = variation.item_variation_data?.name ?? 'Default'
      return {
        id: variation.id,
        version: variation.version,
        name: `${itemName} — ${variationName}`,
        itemName,
      }
    }
  }

  return null
}

async function fetchBookableServiceVariation(
  sandbox: boolean,
  accessToken: string,
): Promise<BookableServiceVariation | null> {
  const catalogRes = await squareFetch(sandbox, accessToken, '/v2/catalog/search-catalog-items', {
    method: 'POST',
    body: JSON.stringify({
      product_types: ['APPOINTMENTS_SERVICE'],
    }),
  })

  if (!catalogRes.ok) {
    return null
  }

  const catalogData = await catalogRes.json()
  return findBookableServiceVariation(catalogData.items ?? [])
}

async function fetchMerchantContext(
  sandbox: boolean,
  accessToken: string,
  merchantId: string,
): Promise<{
  businessName: string | null
  locationId: string | null
  locationName: string | null
  timezone: string | null
  teamMemberId: string | null
  serviceVariationId: string | null
  serviceVariationVersion: number | null
  serviceVariationName: string | null
}> {
  let businessName: string | null = null
  let locationId: string | null = null
  let locationName: string | null = null
  let timezone: string | null = null
  let teamMemberId: string | null = null
  let serviceVariationId: string | null = null
  let serviceVariationVersion: number | null = null
  let serviceVariationName: string | null = null

  const merchantRes = await squareFetch(sandbox, accessToken, `/v2/merchants/${merchantId}`)
  if (merchantRes.ok) {
    const merchantData = await merchantRes.json()
    businessName = merchantData.merchant?.business_name ?? null
  }

  const locationsRes = await squareFetch(sandbox, accessToken, '/v2/locations')
  if (locationsRes.ok) {
    const locationsData = await locationsRes.json()
    const activeLocation = (locationsData.locations ?? []).find(
      (location: { status?: string }) => location.status === 'ACTIVE',
    ) ?? locationsData.locations?.[0]

    if (activeLocation) {
      locationId = activeLocation.id ?? null
      locationName = activeLocation.name ?? null
      timezone = activeLocation.timezone ?? null
    }
  }

  const teamPath = locationId
    ? `/v2/bookings/team-member-booking-profiles?location_id=${encodeURIComponent(locationId)}`
    : '/v2/bookings/team-member-booking-profiles'
  const teamRes = await squareFetch(sandbox, accessToken, teamPath)
  if (teamRes.ok) {
    const teamData = await teamRes.json()
    const bookableMember = (teamData.team_member_booking_profiles ?? []).find(
      (profile: { is_bookable?: boolean }) => profile.is_bookable,
    ) ?? teamData.team_member_booking_profiles?.[0]

    teamMemberId = bookableMember?.team_member_id ?? null
  }

  const bookableService = await fetchBookableServiceVariation(sandbox, accessToken)
  if (bookableService) {
    serviceVariationId = bookableService.id
    serviceVariationVersion = bookableService.version
    serviceVariationName = bookableService.name
  }

  return {
    businessName,
    locationId,
    locationName,
    timezone,
    teamMemberId,
    serviceVariationId,
    serviceVariationVersion,
    serviceVariationName,
  }
}

async function syncAgentSettings(
  admin: ReturnType<typeof createClient>,
  userId: string,
  accessToken: string,
  locationId: string | null,
  timezone: string | null,
  teamMemberId: string | null,
  serviceVariationId: string | null,
  serviceVariationVersion: number | null,
) {
  const { data: settingsRows, error } = await admin
    .from('agent_settings')
    .select('id')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(1)

  if (error || !settingsRows?.length) return

  await admin
    .from('agent_settings')
    .update({
      calendar_provider: 'square',
      square_access_token: accessToken,
      square_location_id: locationId,
      square_timezone: timezone,
      square_team_member_id: teamMemberId,
      square_service_variation_id: serviceVariationId,
      square_service_variation_version: serviceVariationVersion,
      updated_at: new Date().toISOString(),
    })
    .eq('id', settingsRows[0].id)
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

    const { code, redirectUri, applicationId, sandbox = false } = await req.json()
    if (!code || !redirectUri) {
      return json({ error: 'Missing code or redirectUri' }, 400)
    }

    const clientSecret = Deno.env.get('SQUARE_APPLICATION_SECRET')
    const envApplicationId = Deno.env.get('SQUARE_APPLICATION_ID')
    const effectiveApplicationId = applicationId || envApplicationId
    const useSandbox = sandbox || Deno.env.get('SQUARE_ENV') === 'sandbox'

    if (!effectiveApplicationId || !clientSecret) {
      return json({
        error: 'Square OAuth not configured on server. Set SQUARE_APPLICATION_SECRET (and optionally SQUARE_APPLICATION_ID) in Supabase Edge Function secrets.',
      }, 500)
    }

    if (envApplicationId && applicationId && envApplicationId !== applicationId) {
      return json({
        error: 'SQUARE_APPLICATION_ID in Supabase secrets must match VITE_SQUARE_APPLICATION_ID in your website .env',
      }, 400)
    }

    const tokenRes = await fetch(`${squareConnectHost(useSandbox)}/oauth2/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: effectiveApplicationId,
        client_secret: clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      }),
    })

    const tokenData = await tokenRes.json()
    if (!tokenRes.ok) {
      const message = tokenData.message ?? tokenData.error ?? tokenData.error_description ?? 'Token exchange failed'
      return json({ error: message }, 400)
    }

    const accessToken = tokenData.access_token as string
    const merchantId = tokenData.merchant_id as string
    const expiresAt = tokenData.expires_at
      ? new Date(tokenData.expires_at).toISOString()
      : null

    const merchantContext = await fetchMerchantContext(useSandbox, accessToken, merchantId)

    const { error: tokenError } = await admin.from('square_tokens').upsert({
      user_id: user.id,
      access_token: accessToken,
      refresh_token: tokenData.refresh_token ?? null,
      merchant_id: merchantId,
      application_id: effectiveApplicationId,
      expires_at: expiresAt,
      scopes: SCOPES,
      updated_at: new Date().toISOString(),
    })

    if (tokenError) {
      return json({ error: tokenError.message }, 500)
    }

    const { error: connError } = await admin.from('square_connections').upsert({
      user_id: user.id,
      merchant_id: merchantId,
      business_name: merchantContext.businessName,
      location_id: merchantContext.locationId,
      location_name: merchantContext.locationName,
      team_member_id: merchantContext.teamMemberId,
      timezone: merchantContext.timezone,
      service_variation_id: merchantContext.serviceVariationId,
      service_variation_version: merchantContext.serviceVariationVersion,
      service_variation_name: merchantContext.serviceVariationName,
      scopes: SCOPES,
      token_expiry: expiresAt,
      status: 'connected',
      connected_at: new Date().toISOString(),
    })

    if (connError) {
      return json({ error: connError.message }, 500)
    }

    await syncAgentSettings(
      admin,
      user.id,
      accessToken,
      merchantContext.locationId,
      merchantContext.timezone,
      merchantContext.teamMemberId,
      merchantContext.serviceVariationId,
      merchantContext.serviceVariationVersion,
    )

    return json({
      success: true,
      merchantId,
      businessName: merchantContext.businessName,
      locationId: merchantContext.locationId,
      locationName: merchantContext.locationName,
      teamMemberId: merchantContext.teamMemberId,
      timezone: merchantContext.timezone,
      serviceVariationName: merchantContext.serviceVariationName,
      serviceVariationId: merchantContext.serviceVariationId,
      serviceVariationVersion: merchantContext.serviceVariationVersion,
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
