import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import {
  analyticsUnavailablePayload,
  fetchAssistantAnalytics,
  resolveAnalyticsTarget,
} from '../_shared/emailAssistant.ts'

// Force a fresh bundle so admin tenant lists are included.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
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
      return json({
        error: 'Your session expired or is invalid. Sign in again and retry.',
      }, 401)
    }

    if (req.method !== 'POST') {
      return json({ error: 'Method not allowed' }, 405)
    }

    const body = await req.json().catch(() => ({}))
    const days = parseDays(body.days)
    const target = await resolveAnalyticsTarget(admin, user, body.user_id)
    if (!target.ok) {
      return json({ error: target.error }, target.status)
    }

    const result = await fetchAssistantAnalytics(admin, target.userId, 'summary', days)
    if (!result.ok) {
      if (target.tenants) {
        return json(analyticsUnavailablePayload('summary', days, target, result.error))
      }
      return json({ error: result.error }, result.status)
    }

    return json({
      ...result.data,
      analytics_user_id: target.userId,
      analytics_tenants: target.tenants,
    })
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Unexpected error' }, 500)
  }
})

function parseDays(value: unknown): number {
  const daysRaw = Number(value ?? 30)
  return Number.isFinite(daysRaw)
    ? Math.min(365, Math.max(1, Math.floor(daysRaw)))
    : 30
}

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  })
}
