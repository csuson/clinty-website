import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import {
  assertWithinTokenLimit,
  buildUsageSummary,
  recordAiUsageWithAlerts,
  type AiFeature,
} from '../_shared/aiUsage.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-clinty-api-key, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const ASSISTANT_FEATURES = new Set<AiFeature>([
  'assistant_triage',
  'assistant_agent',
  'assistant_memory',
  'assistant_storefront',
])

async function hashApiKey(key: string): Promise<string> {
  const data = new TextEncoder().encode(key)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, '0')).join('')
}

function extractClintyApiKey(req: Request): string | null {
  const explicitHeader =
    req.headers.get('X-Clinty-Api-Key') ??
    req.headers.get('x-clinty-api-key')

  if (explicitHeader?.trim()) {
    return explicitHeader.trim()
  }

  const authorization = req.headers.get('Authorization')
  if (authorization?.startsWith('Bearer ')) {
    const token = authorization.slice('Bearer '.length).trim()
    return token.length > 0 ? token : null
  }

  return null
}

function parseUsageField(value: unknown): number {
  const parsed = typeof value === 'number' ? value : Number(String(value ?? '').trim())
  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0
  }
  return Math.floor(parsed)
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }

  try {
    const clintyApiKey = extractClintyApiKey(req)
    if (!clintyApiKey) {
      return json({
        error: 'Missing Clinty API key. Send X-Clinty-Api-Key or Authorization: Bearer <clinty_api_key>.',
      }, 401)
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const keyHash = await hashApiKey(clintyApiKey)
    const { data: apiKeyRows, error: apiKeyError } = await admin
      .from('api_keys')
      .select('id, user_id, revoked_at')
      .eq('key_hash', keyHash)
      .is('revoked_at', null)
      .order('created_at', { ascending: true })
      .limit(1)

    if (apiKeyError) {
      return json({ error: apiKeyError.message }, 500)
    }

    const apiKeyRow = apiKeyRows?.[0] ?? null
    if (!apiKeyRow) {
      return json({ error: 'Invalid or revoked Clinty API key' }, 401)
    }

    const body = await req.json().catch(() => ({}))
    const checkOnly = body.check_only === true
    const userId = String(apiKeyRow.user_id)

    try {
      await assertWithinTokenLimit(admin, userId)
    } catch (err) {
      const summary = await buildUsageSummary(admin, userId)
      return json(
        {
          allowed: false,
          error: err instanceof Error ? err.message : 'Monthly AI token limit reached',
          ...summary,
        },
        429,
      )
    }

    if (checkOnly) {
      const summary = await buildUsageSummary(admin, userId)
      return json({
        allowed: true,
        ...summary,
      })
    }

    const feature = typeof body.feature === 'string' ? body.feature.trim() : ''
    const model = typeof body.model === 'string' ? body.model.trim() : ''
    if (!feature || !ASSISTANT_FEATURES.has(feature as AiFeature)) {
      return json({ error: 'Invalid or missing feature' }, 400)
    }
    if (!model) {
      return json({ error: 'Missing model' }, 400)
    }

    const promptTokens = parseUsageField(body.prompt_tokens)
    const completionTokens = parseUsageField(body.completion_tokens)
    const totalTokens = parseUsageField(body.total_tokens) || promptTokens + completionTokens
    if (totalTokens <= 0) {
      return json({ error: 'Missing token usage' }, 400)
    }

    const summary = await recordAiUsageWithAlerts(admin, {
      user_id: userId,
      feature: feature as AiFeature,
      model,
      usage: {
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
        total_tokens: totalTokens,
      },
    })

    return json({
      allowed: !summary.limit_reached,
      recorded: true,
      ...summary,
    })
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Unexpected error' }, 500)
  }
})
