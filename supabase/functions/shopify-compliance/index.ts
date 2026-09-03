import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import {
  normalizeShopifyDomain,
  SHOPIFY_COMPLIANCE_TOPICS,
  verifyShopifyWebhookHmac,
} from '../_shared/shopifyWebhook.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-shopify-hmac-sha256, x-shopify-topic, x-shopify-shop-domain',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

type CompliancePayload = {
  shop_id?: number
  shop_domain?: string
  customer?: {
    id?: number
    email?: string
    phone?: string
  }
  orders_requested?: number[]
  orders_to_redact?: number[]
  data_request?: { id?: number }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method === 'GET') {
    return handleStatus(req)
  }

  if (req.method === 'POST') {
    return handleComplianceWebhook(req)
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
    .from('shopify_compliance_requests')
    .select('confirmation_code, topic, status, shop_domain, created_at, completed_at')
    .eq('confirmation_code', code)
    .maybeSingle()

  if (error) {
    return json({ error: error.message }, 500)
  }
  if (!data) {
    return json({ error: 'Compliance request not found' }, 404)
  }

  return json({
    confirmation_code: data.confirmation_code,
    topic: data.topic,
    status: data.status,
    shop_domain: data.shop_domain,
    created_at: data.created_at,
    completed_at: data.completed_at,
    message: statusMessage(data.topic, data.status),
  })
}

async function handleComplianceWebhook(req: Request): Promise<Response> {
  const secret = Deno.env.get('SHOPIFY_CLIENT_SECRET')?.trim()
  if (!secret) {
    return json({ error: 'SHOPIFY_CLIENT_SECRET is not configured' }, 503)
  }

  const rawBody = await req.text()
  const hmacHeader = req.headers.get('X-Shopify-Hmac-Sha256')
  const topic = req.headers.get('X-Shopify-Topic')?.trim() ?? ''

  const hmacValid = await verifyShopifyWebhookHmac(rawBody, hmacHeader, secret)
  if (!hmacValid) {
    return json({ error: 'Invalid HMAC' }, 401)
  }

  if (!SHOPIFY_COMPLIANCE_TOPICS.has(topic)) {
    return json({ error: 'Unsupported webhook topic' }, 404)
  }

  let payload: CompliancePayload
  try {
    payload = JSON.parse(rawBody) as CompliancePayload
  } catch {
    return json({ error: 'Invalid JSON body' }, 400)
  }

  const shopDomain = normalizeShopifyDomain(payload.shop_domain)
  if (!shopDomain) {
    return json({ error: 'Missing or invalid shop_domain' }, 400)
  }

  const shopId = typeof payload.shop_id === 'number' ? payload.shop_id : null
  const confirmationCode = createConfirmationCode()
  const admin = serviceClient()
  const now = new Date().toISOString()

  let clintyUserId: string | null = null
  let status: 'completed' | 'no_data' | 'acknowledged' = 'acknowledged'

  if (topic === 'shop/redact') {
    const result = await redactShopData(admin, shopDomain, shopId)
    clintyUserId = result.clintyUserId
    status = result.deleted ? 'completed' : 'no_data'
  }

  const { error: insertError } = await admin.from('shopify_compliance_requests').insert({
    confirmation_code: confirmationCode,
    topic,
    shop_id: shopId,
    shop_domain: shopDomain,
    clinty_user_id: clintyUserId,
    status,
    payload,
    completed_at: now,
  })

  if (insertError) {
    return json({ error: insertError.message }, 500)
  }

  // Shopify requires HTTP 200 with empty/minimal body on success.
  return new Response('', { status: 200, headers: corsHeaders })
}

async function redactShopData(
  admin: ReturnType<typeof serviceClient>,
  shopDomain: string,
  shopId: number | null,
): Promise<{ clintyUserId: string | null; deleted: boolean }> {
  const { data: tokenByDomain } = await admin
    .from('shopify_tokens')
    .select('user_id')
    .eq('shop_domain', shopDomain)
    .maybeSingle()

  let userId = (tokenByDomain?.user_id as string | undefined) ?? null

  if (!userId && shopId != null) {
    const { data: tokenByShopId } = await admin
      .from('shopify_tokens')
      .select('user_id')
      .eq('shop_id', shopId)
      .maybeSingle()
    userId = (tokenByShopId?.user_id as string | undefined) ?? null
  }

  if (!userId) {
    return { clintyUserId: null, deleted: false }
  }

  const [tokensRes, connectionsRes] = await Promise.all([
    admin.from('shopify_tokens').delete().eq('user_id', userId),
    admin.from('shopify_connections').upsert({
      user_id: userId,
      shop_domain: shopDomain,
      shop_name: null,
      shop_id: null,
      scopes: [],
      status: 'disconnected',
      connected_at: new Date().toISOString(),
    }),
  ])

  if (tokensRes.error) throw new Error(tokensRes.error.message)
  if (connectionsRes.error) throw new Error(connectionsRes.error.message)

  return { clintyUserId: userId, deleted: true }
}

function statusMessage(topic: string, status: string): string {
  if (topic === 'customers/data_request') {
    return status === 'acknowledged'
      ? 'Clinty received your customer data request. Clinty does not store Shopify customer or order data — only OAuth connection metadata for your store.'
      : 'Your request is being processed.'
  }

  if (topic === 'customers/redact') {
    return status === 'acknowledged'
      ? 'Clinty received your customer redaction request. Clinty does not store Shopify customer or order data.'
      : 'Your request is being processed.'
  }

  if (topic === 'shop/redact') {
    if (status === 'completed') {
      return 'Shopify connection data for this store has been removed from Clinty.'
    }
    if (status === 'no_data') {
      return 'No Clinty account was linked to this Shopify store, or data was already removed.'
    }
  }

  return 'Your compliance request is being processed.'
}

function createConfirmationCode(): string {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 12).toUpperCase()
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
