import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { parseMetaSignedRequest } from '../_shared/metaSignedRequest.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

type StoredFacebookCredentials = {
  access_token?: string
  ad_account_id?: string
  page_id?: string
  pixel_id?: string
  meta_user_id?: string
}

type StoredPlatformCredentials = {
  google?: Record<string, unknown>
  facebook?: StoredFacebookCredentials
  yelp?: Record<string, unknown>
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method === 'GET') {
    return handleStatus(req)
  }

  if (req.method === 'POST') {
    return handleDeletionCallback(req)
  }

  return json({ error: 'Method not allowed' }, 405)
})

async function handleStatus(req: Request): Promise<Response> {
  const url = new URL(req.url)
  const code = url.searchParams.get('code')?.trim()
  if (!code) {
    return json({ error: 'Missing confirmation code' }, 400)
  }

  const admin = serviceClient()
  const { data, error } = await admin
    .from('meta_data_deletion_requests')
    .select('confirmation_code, status, created_at, completed_at')
    .eq('confirmation_code', code)
    .maybeSingle()

  if (error) {
    return json({ error: error.message }, 500)
  }
  if (!data) {
    return json({ error: 'Deletion request not found' }, 404)
  }

  return json({
    confirmation_code: data.confirmation_code,
    status: data.status,
    created_at: data.created_at,
    completed_at: data.completed_at,
    message: statusMessage(data.status),
  })
}

async function handleDeletionCallback(req: Request): Promise<Response> {
  const appSecret = Deno.env.get('META_APP_SECRET')?.trim()
  if (!appSecret) {
    return json({ error: 'META_APP_SECRET is not configured' }, 503)
  }

  const signedRequest = await readSignedRequest(req)
  if (!signedRequest) {
    return json({ error: 'Missing signed_request' }, 400)
  }

  const payload = await parseMetaSignedRequest(signedRequest, appSecret)
  if (!payload) {
    return json({ error: 'Invalid signed_request' }, 403)
  }

  const metaUserId = typeof payload.user_id === 'string' ? payload.user_id.trim() : ''
  if (!metaUserId) {
    return json({ error: 'Missing user_id in signed_request' }, 400)
  }

  const confirmationCode = createConfirmationCode()
  const statusBase = (Deno.env.get('META_DATA_DELETION_STATUS_BASE_URL') ?? 'https://clinty.net')
    .replace(/\/$/, '')
  const statusUrl = `${statusBase}/meta/data-deletion?code=${encodeURIComponent(confirmationCode)}`

  const admin = serviceClient()
  const { clintyUserId, deleted } = await deleteMetaDataForUser(admin, metaUserId)

  const status = deleted ? 'completed' : 'no_data'
  const now = new Date().toISOString()

  const { error: insertError } = await admin.from('meta_data_deletion_requests').insert({
    confirmation_code: confirmationCode,
    meta_user_id: metaUserId,
    clinty_user_id: clintyUserId,
    status,
    completed_at: now,
  })

  if (insertError) {
    return json({ error: insertError.message }, 500)
  }

  return json({
    url: statusUrl,
    confirmation_code: confirmationCode,
  })
}

async function readSignedRequest(req: Request): Promise<string | null> {
  const contentType = req.headers.get('content-type') ?? ''

  if (contentType.includes('application/x-www-form-urlencoded')) {
    const form = await req.formData()
    const value = form.get('signed_request')
    return typeof value === 'string' && value.trim() ? value.trim() : null
  }

  if (contentType.includes('application/json')) {
    try {
      const body = await req.json() as { signed_request?: unknown }
      return typeof body.signed_request === 'string' && body.signed_request.trim()
        ? body.signed_request.trim()
        : null
    } catch {
      return null
    }
  }

  return null
}

async function deleteMetaDataForUser(
  admin: ReturnType<typeof serviceClient>,
  metaUserId: string,
): Promise<{ clintyUserId: string | null; deleted: boolean }> {
  const { data: rows, error } = await admin
    .from('google_ads_connections')
    .select('user_id, platform_credentials')

  if (error || !rows?.length) {
    return { clintyUserId: null, deleted: false }
  }

  for (const row of rows) {
    const credentials = parsePlatformCredentials(row.platform_credentials)
    const facebook = credentials.facebook
    if (!facebook?.meta_user_id || facebook.meta_user_id !== metaUserId) {
      if (!facebook?.access_token) continue
      // Legacy rows without meta_user_id: cannot match safely; skip.
      continue
    }

    const merged: StoredPlatformCredentials = {
      ...credentials,
      facebook: {
        ad_account_id: facebook.ad_account_id ?? '',
        page_id: facebook.page_id ?? '',
        pixel_id: facebook.pixel_id ?? '',
      },
    }

    const { error: updateError } = await admin
      .from('google_ads_connections')
      .update({
        platform_credentials: merged,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', row.user_id)

    if (updateError) {
      throw new Error(updateError.message)
    }

    return { clintyUserId: row.user_id as string, deleted: true }
  }

  return { clintyUserId: null, deleted: false }
}

function parsePlatformCredentials(value: unknown): StoredPlatformCredentials {
  if (!value || typeof value !== 'object') return {}
  return value as StoredPlatformCredentials
}

function createConfirmationCode(): string {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 12).toUpperCase()
}

function statusMessage(status: string): string {
  if (status === 'completed') {
    return 'Your Meta ad connection data has been removed from Clinty.'
  }
  if (status === 'no_data') {
    return 'No Clinty account was linked to this Meta user, or data was already removed.'
  }
  return 'Your deletion request is being processed.'
}

function serviceClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  )
}

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
