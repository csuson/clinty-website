import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

type SettingsAction = 'get_settings' | 'save_settings' | 'save_brief' | 'disconnect'

type CampaignBrief = {
  businessName: string
  industry: string
  websiteUrl: string
  locations: string
  monthlyBudget: string
  goal: string
  offerings: string
  audience: string
  notes: string
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
    const action = body.action as SettingsAction | undefined

    if (action === 'get_settings') {
      const { data } = await admin
        .from('google_ads_connections')
        .select('ad_campaign_api_url, status, campaign_brief')
        .eq('user_id', user.id)
        .maybeSingle()

      const defaultUrl = Deno.env.get('AD_CAMPAIGN_API_URL')?.trim() ?? null

      return json({
        adCampaignApiUrl: data?.ad_campaign_api_url ?? null,
        status: data?.status ?? 'disconnected',
        usesDefaultApiUrl: Boolean(!data?.ad_campaign_api_url && defaultUrl),
        hasApiUrl: Boolean(data?.ad_campaign_api_url || defaultUrl),
        campaignBrief: parseCampaignBrief(data?.campaign_brief),
      })
    }

    if (action === 'save_settings') {
      const rawUrl = typeof body.adCampaignApiUrl === 'string' ? body.adCampaignApiUrl.trim() : ''
      const adCampaignApiUrl = normalizeApiUrl(rawUrl)

      if (!adCampaignApiUrl) {
        return json({
          error: 'Enter a valid campaign AI URL (e.g. https://your-host:8100).',
        }, 400)
      }

      const now = new Date().toISOString()
      const { error: upsertError } = await admin.from('google_ads_connections').upsert({
        user_id: user.id,
        ad_campaign_api_url: adCampaignApiUrl,
        status: 'connected',
        connected_at: now,
        updated_at: now,
      })

      if (upsertError) {
        throw new Error(`Failed to save Google Ads settings: ${upsertError.message}`)
      }

      return json({
        success: true,
        adCampaignApiUrl,
        status: 'connected',
        usesDefaultApiUrl: false,
        hasApiUrl: true,
      })
    }

    if (action === 'save_brief') {
      const campaignBrief = parseCampaignBriefInput(body.campaignBrief)
      const now = new Date().toISOString()

      const { error: upsertError } = await admin.from('google_ads_connections').upsert({
        user_id: user.id,
        campaign_brief: campaignBrief,
        updated_at: now,
      })

      if (upsertError) {
        throw new Error(`Failed to save Google Ads campaign brief: ${upsertError.message}`)
      }

      return json({ success: true, campaignBrief })
    }

    if (action === 'disconnect') {
      const { error: upsertError } = await admin.from('google_ads_connections').upsert({
        user_id: user.id,
        ad_campaign_api_url: null,
        status: 'disconnected',
        connected_at: null,
        updated_at: new Date().toISOString(),
      })

      if (upsertError) {
        throw new Error(`Failed to disconnect Google Ads: ${upsertError.message}`)
      }

      return json({ success: true, status: 'disconnected' })
    }

    return json({
      error: 'Missing or invalid action (get_settings, save_settings, save_brief, disconnect)',
    }, 400)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return json({ error: message }, 500)
  }
})

function normalizeApiUrl(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) return ''

  try {
    const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
    const url = new URL(withProtocol)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return ''
    return `${url.protocol}//${url.host}${url.pathname.replace(/\/$/, '')}`
  } catch {
    return ''
  }
}

function parseCampaignBrief(value: unknown): CampaignBrief | null {
  if (!value || typeof value !== 'object') return null

  const row = value as Record<string, unknown>
  const brief: CampaignBrief = {
    businessName: stringField(row.businessName),
    industry: stringField(row.industry),
    websiteUrl: stringField(row.websiteUrl),
    locations: stringField(row.locations),
    monthlyBudget: stringField(row.monthlyBudget),
    goal: stringField(row.goal) || 'leads',
    offerings: stringField(row.offerings),
    audience: stringField(row.audience),
    notes: stringField(row.notes),
  }

  const hasContent = Object.entries(brief).some(([key, field]) => key !== 'goal' && field.trim())
  return hasContent ? brief : null
}

function parseCampaignBriefInput(value: unknown): CampaignBrief {
  const parsed = parseCampaignBrief(value)
  return parsed ?? {
    businessName: '',
    industry: '',
    websiteUrl: '',
    locations: '',
    monthlyBudget: '',
    goal: 'leads',
    offerings: '',
    audience: '',
    notes: '',
  }
}

function stringField(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
