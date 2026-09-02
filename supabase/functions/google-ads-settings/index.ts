import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import {
  getGlobalGoogleAdsDeveloperToken,
  googlePublishPayload,
  isGoogleAdsPublishConfigured,
  publicGoogleCredentialsStatus,
  withoutStoredDeveloperToken,
  type StoredGoogleCredentials,
} from '../_shared/googleAdsCredentials.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

type SettingsAction =
  | 'get_settings'
  | 'save_settings'
  | 'save_brief'
  | 'save_draft'
  | 'clear_draft'
  | 'save_credentials'
  | 'get_publish_credentials'
  | 'clear_credentials'
  | 'list_google_customers'
  | 'disconnect'

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
  platforms: string[]
  platformBudgetSplit: {
    google: number
    facebook: number
    yelp: number
  }
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
        .select('ad_campaign_api_url, status, campaign_brief, campaign_draft, platform_credentials')
        .eq('user_id', user.id)
        .maybeSingle()

      const defaultUrl = Deno.env.get('AD_CAMPAIGN_API_URL')?.trim().replace(/\/$/, '') || null

      return json({
        adCampaignApiUrl: data?.ad_campaign_api_url ?? null,
        defaultAdCampaignApiUrl: defaultUrl,
        status: data?.status ?? 'disconnected',
        usesDefaultApiUrl: Boolean(!data?.ad_campaign_api_url && defaultUrl),
        hasApiUrl: Boolean(data?.ad_campaign_api_url || defaultUrl),
        campaignBrief: parseCampaignBrief(data?.campaign_brief),
        campaignDraft: parseCampaignDraft(data?.campaign_draft),
        platformCredentials: publicPlatformCredentialsStatus(data?.platform_credentials),
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

    if (action === 'save_draft') {
      const campaignDraft = parseCampaignDraftInput(body.campaignDraft)
      if (!campaignDraft) {
        return json({ error: 'campaignDraft is required.' }, 400)
      }
      const now = new Date().toISOString()
      const { error: upsertError } = await admin.from('google_ads_connections').upsert({
        user_id: user.id,
        campaign_draft: campaignDraft,
        updated_at: now,
      })
      if (upsertError) {
        throw new Error(`Failed to save campaign draft: ${upsertError.message}`)
      }
      return json({ success: true, campaignDraft })
    }

    if (action === 'clear_draft') {
      const now = new Date().toISOString()
      const { error: upsertError } = await admin.from('google_ads_connections').upsert({
        user_id: user.id,
        campaign_draft: null,
        updated_at: now,
      })
      if (upsertError) {
        throw new Error(`Failed to clear campaign draft: ${upsertError.message}`)
      }
      return json({ success: true, campaignDraft: null })
    }

    if (action === 'save_credentials') {
      const { data: existing } = await admin
        .from('google_ads_connections')
        .select('platform_credentials')
        .eq('user_id', user.id)
        .maybeSingle()

      const merged = mergePlatformCredentials(
        parseStoredPlatformCredentials(existing?.platform_credentials),
        body.platformCredentials,
      )
      const now = new Date().toISOString()

      const { error: upsertError } = await admin.from('google_ads_connections').upsert({
        user_id: user.id,
        platform_credentials: merged,
        updated_at: now,
      })

      if (upsertError) {
        throw new Error(`Failed to save platform credentials: ${upsertError.message}`)
      }

      return json({
        success: true,
        platformCredentials: publicPlatformCredentialsStatus(merged),
      })
    }

    if (action === 'get_publish_credentials') {
      const { data } = await admin
        .from('google_ads_connections')
        .select('platform_credentials')
        .eq('user_id', user.id)
        .maybeSingle()

      const stored = parseStoredPlatformCredentials(data?.platform_credentials)
      return json({
        platformCredentials: publishPlatformCredentials(stored),
      })
    }

    if (action === 'list_google_customers') {
      const { data: existing } = await admin
        .from('google_ads_connections')
        .select('platform_credentials')
        .eq('user_id', user.id)
        .maybeSingle()

      const stored = parseStoredPlatformCredentials(existing?.platform_credentials)
      const google = stored.google

      if (!google?.refresh_token || !google.client_id || !google.client_secret) {
        return json({
          error: 'Connect Google Ads with OAuth first.',
        }, 400)
      }

      const developerToken = getGlobalGoogleAdsDeveloperToken()
      if (!developerToken) {
        return json({
          error: 'Google Ads developer token is not configured on the server. Set GOOGLE_ADS_DEVELOPER_TOKEN in Supabase Edge Function secrets.',
        }, 500)
      }

      const accessToken = await refreshGoogleAccessToken(
        google.client_id,
        google.client_secret,
        google.refresh_token,
      )

      const customers = await listAccessibleGoogleCustomers(accessToken, developerToken)
      return json({ customers })
    }

    if (action === 'clear_credentials') {
      const platform = typeof body.platform === 'string' ? body.platform : 'all'
      const { data: existing } = await admin
        .from('google_ads_connections')
        .select('platform_credentials')
        .eq('user_id', user.id)
        .maybeSingle()

      const stored = parseStoredPlatformCredentials(existing?.platform_credentials)
      const cleared = clearStoredPlatformCredentials(stored, platform)
      const now = new Date().toISOString()

      const { error: upsertError } = await admin.from('google_ads_connections').upsert({
        user_id: user.id,
        platform_credentials: cleared,
        updated_at: now,
      })

      if (upsertError) {
        throw new Error(`Failed to clear platform credentials: ${upsertError.message}`)
      }

      return json({
        success: true,
        platformCredentials: publicPlatformCredentialsStatus(cleared),
      })
    }

    if (action === 'disconnect') {
      const { error: upsertError } = await admin.from('google_ads_connections').upsert({
        user_id: user.id,
        ad_campaign_api_url: null,
        platform_credentials: null,
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
      error: 'Missing or invalid action (get_settings, save_settings, save_brief, save_draft, clear_draft, save_credentials, get_publish_credentials, clear_credentials, list_google_customers, disconnect)',
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
    platforms: parsePlatforms(row.platforms),
    platformBudgetSplit: parsePlatformBudgetSplit(row.platformBudgetSplit, parsePlatforms(row.platforms)),
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
    platforms: ['google', 'facebook'],
    platformBudgetSplit: { google: 55, facebook: 45, yelp: 0 },
  }
}

type CampaignDraft = {
  step: string
  snapshot: Record<string, unknown> | null
  answers: Record<string, string>
  revisionNotes: string
  publish: boolean
  requestedPlatforms: string[]
  savedAt: string
}

function parseCampaignDraft(value: unknown): CampaignDraft | null {
  if (!value || typeof value !== 'object') return null

  const row = value as Record<string, unknown>
  const snapshot = row.snapshot && typeof row.snapshot === 'object' && !Array.isArray(row.snapshot)
    ? row.snapshot as Record<string, unknown>
    : null
  const stepRaw = typeof row.step === 'string' ? row.step : ''
  const step = ['brief', 'clarifying', 'review', 'complete'].includes(stepRaw) ? stepRaw : 'review'
  if (!snapshot) return null

  return {
    step,
    snapshot,
    answers: parseStringRecord(row.answers),
    revisionNotes: stringField(row.revisionNotes),
    publish: row.publish === true,
    requestedPlatforms: parsePlatforms(row.requestedPlatforms),
    savedAt: stringField(row.savedAt) || new Date().toISOString(),
  }
}

function parseCampaignDraftInput(value: unknown): CampaignDraft | null {
  return parseCampaignDraft(value)
}

function parseStringRecord(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  const out: Record<string, string> = {}
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    if (typeof item === 'string') out[key] = item
  }
  return out
}

function parsePlatforms(value: unknown): string[] {
  if (!Array.isArray(value)) return ['google', 'facebook']

  const platforms = value.filter((item): item is string => typeof item === 'string' && isPlatform(item))
  return platforms.length > 0 ? platforms : ['google', 'facebook']
}

function isPlatform(value: string): boolean {
  return value === 'google' || value === 'facebook' || value === 'yelp'
}

function parsePlatformBudgetSplit(
  value: unknown,
  platforms: string[],
): CampaignBrief['platformBudgetSplit'] {
  const defaults = defaultBudgetSplit(platforms)
  if (!value || typeof value !== 'object') return defaults

  const row = value as Record<string, unknown>
  const split = {
    google: parseShare(row.google, defaults.google),
    facebook: parseShare(row.facebook, defaults.facebook),
    yelp: parseShare(row.yelp, defaults.yelp),
  }

  if (platforms.length <= 1) return defaults
  return normalizeBudgetSplit(platforms, split)
}

function parseShare(value: unknown, fallback: number): number {
  const parsed = typeof value === 'number' ? value : Number.parseInt(String(value ?? ''), 10)
  return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : fallback
}

function defaultBudgetSplit(platforms: string[]): CampaignBrief['platformBudgetSplit'] {
  const key = [...platforms].sort().join(',')
  const defaults: Record<string, CampaignBrief['platformBudgetSplit']> = {
    'google,facebook': { google: 55, facebook: 45, yelp: 0 },
    'google,yelp': { google: 60, facebook: 0, yelp: 40 },
    'facebook,yelp': { google: 0, facebook: 55, yelp: 45 },
    'google,facebook,yelp': { google: 40, facebook: 35, yelp: 25 },
  }

  if (defaults[key]) return defaults[key]
  if (platforms.length === 1) {
    return {
      google: platforms[0] === 'google' ? 100 : 0,
      facebook: platforms[0] === 'facebook' ? 100 : 0,
      yelp: platforms[0] === 'yelp' ? 100 : 0,
    }
  }

  return { google: 34, facebook: 33, yelp: 33 }
}

function normalizeBudgetSplit(
  platforms: string[],
  split: CampaignBrief['platformBudgetSplit'],
): CampaignBrief['platformBudgetSplit'] {
  const active = { google: 0, facebook: 0, yelp: 0 }
  let total = 0

  for (const platform of platforms) {
    if (!isPlatform(platform)) continue
    active[platform as keyof CampaignBrief['platformBudgetSplit']] = Math.max(
      0,
      Math.round(split[platform as keyof CampaignBrief['platformBudgetSplit']] ?? 0),
    )
    total += active[platform as keyof CampaignBrief['platformBudgetSplit']]
  }

  if (total <= 0) return defaultBudgetSplit(platforms)

  for (const platform of platforms) {
    if (!isPlatform(platform)) continue
    active[platform as keyof CampaignBrief['platformBudgetSplit']] = Math.round(
      (active[platform as keyof CampaignBrief['platformBudgetSplit']] / total) * 100,
    )
  }

  const diff = 100 - platforms.reduce((sum, platform) => {
    if (!isPlatform(platform)) return sum
    return sum + active[platform as keyof CampaignBrief['platformBudgetSplit']]
  }, 0)

  const first = platforms.find(isPlatform)
  if (diff !== 0 && first) {
    active[first as keyof CampaignBrief['platformBudgetSplit']] += diff
  }

  return active
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

type StoredGoogleCredentials = import('../_shared/googleAdsCredentials.ts').StoredGoogleCredentials

type StoredFacebookCredentials = {
  access_token?: string
  ad_account_id?: string
  page_id?: string
  pixel_id?: string
}

type StoredYelpCredentials = {
  username?: string
  password?: string
  business_id?: string
  api_base?: string
}

type StoredPlatformCredentials = {
  google?: StoredGoogleCredentials
  facebook?: StoredFacebookCredentials
  yelp?: StoredYelpCredentials
}

function parseStoredPlatformCredentials(value: unknown): StoredPlatformCredentials {
  if (!value || typeof value !== 'object') return {}
  return value as StoredPlatformCredentials
}

function mergePlatformCredentials(
  current: StoredPlatformCredentials,
  input: unknown,
): StoredPlatformCredentials {
  if (!input || typeof input !== 'object') return current

  const row = input as Record<string, unknown>
  const next: StoredPlatformCredentials = { ...current }

  if (row.google && typeof row.google === 'object') {
    const google = row.google as Record<string, unknown>
    const existing = current.google ?? {}
    next.google = withoutStoredDeveloperToken({
      client_id: pickString(google.clientId, existing.client_id),
      client_secret: pickSecret(google.clientSecret, existing.client_secret),
      refresh_token: pickSecret(google.refreshToken, existing.refresh_token),
      customer_id: pickString(google.customerId, existing.customer_id),
      login_customer_id: pickString(google.loginCustomerId, existing.login_customer_id),
      use_proto_plus: typeof google.useProtoPlus === 'boolean'
        ? google.useProtoPlus
        : existing.use_proto_plus ?? true,
    })
  }

  if (row.facebook && typeof row.facebook === 'object') {
    const facebook = row.facebook as Record<string, unknown>
    const existing = current.facebook ?? {}
    next.facebook = {
      access_token: pickSecret(facebook.accessToken, existing.access_token),
      ad_account_id: pickString(facebook.adAccountId, existing.ad_account_id),
      page_id: pickString(facebook.pageId, existing.page_id),
      pixel_id: pickString(facebook.pixelId, existing.pixel_id),
    }
  }

  if (row.yelp && typeof row.yelp === 'object') {
    const yelp = row.yelp as Record<string, unknown>
    const existing = current.yelp ?? {}
    next.yelp = {
      username: pickString(yelp.username, existing.username),
      password: pickSecret(yelp.password, existing.password),
      business_id: pickString(yelp.businessId, existing.business_id),
      api_base: pickString(yelp.apiBase, existing.api_base),
    }
  }

  return next
}

function pickString(value: unknown, fallback = ''): string {
  if (typeof value !== 'string') return fallback
  const trimmed = value.trim()
  return trimmed || fallback
}

function pickSecret(value: unknown, fallback = ''): string {
  if (typeof value !== 'string') return fallback
  const trimmed = value.trim()
  return trimmed ? trimmed : fallback
}

function googleConfigured(google?: StoredGoogleCredentials): boolean {
  return isGoogleAdsPublishConfigured(google)
}

function facebookConfigured(facebook?: StoredFacebookCredentials): boolean {
  if (!facebook) return false
  return Boolean(facebook.access_token && facebook.ad_account_id && facebook.page_id)
}

function yelpConfigured(yelp?: StoredYelpCredentials): boolean {
  if (!yelp) return false
  return Boolean(yelp.username && yelp.password && yelp.business_id)
}

function publicPlatformCredentialsStatus(stored: unknown) {
  const credentials = parseStoredPlatformCredentials(stored)
  const google = credentials.google
  const facebook = credentials.facebook
  const yelp = credentials.yelp

  return {
    google: publicGoogleCredentialsStatus(google),
    facebook: {
      configured: facebookConfigured(facebook),
      hasAccessToken: Boolean(facebook?.access_token),
      adAccountId: facebook?.ad_account_id ?? '',
      pageId: facebook?.page_id ?? '',
      pixelId: facebook?.pixel_id ?? '',
    },
    yelp: {
      configured: yelpConfigured(yelp),
      hasPassword: Boolean(yelp?.password),
      username: yelp?.username ?? '',
      businessId: yelp?.business_id ?? '',
      apiBase: yelp?.api_base ?? '',
    },
  }
}

function publishPlatformCredentials(stored: StoredPlatformCredentials) {
  const payload: Record<string, unknown> = {}

  if (isGoogleAdsPublishConfigured(stored.google) && stored.google) {
    payload.google = googlePublishPayload(stored.google)
  }

  if (facebookConfigured(stored.facebook) && stored.facebook) {
    payload.facebook = {
      access_token: stored.facebook.access_token,
      ad_account_id: stored.facebook.ad_account_id,
      page_id: stored.facebook.page_id,
      pixel_id: stored.facebook.pixel_id || undefined,
    }
  }

  if (yelpConfigured(stored.yelp) && stored.yelp) {
    payload.yelp = {
      username: stored.yelp.username,
      password: stored.yelp.password,
      business_id: stored.yelp.business_id,
      api_base: stored.yelp.api_base || undefined,
    }
  }

  return Object.keys(payload).length > 0 ? payload : null
}

function clearStoredPlatformCredentials(
  stored: StoredPlatformCredentials,
  platform: string,
): StoredPlatformCredentials | null {
  if (platform === 'all') return null

  const next: StoredPlatformCredentials = { ...stored }
  if (platform === 'google') delete next.google
  if (platform === 'facebook') delete next.facebook
  if (platform === 'yelp') delete next.yelp

  if (!next.google && !next.facebook && !next.yelp) return null
  return next
}

async function refreshGoogleAccessToken(
  clientId: string,
  clientSecret: string,
  refreshToken: string,
): Promise<string> {
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })

  const tokenData = await tokenRes.json()
  if (!tokenRes.ok || !tokenData.access_token) {
    throw new Error(tokenData.error_description ?? tokenData.error ?? 'Failed to refresh Google access token')
  }

  return tokenData.access_token as string
}

async function listAccessibleGoogleCustomers(
  accessToken: string,
  developerToken: string,
): Promise<Array<{ id: string; formatted: string }>> {
  const res = await fetch('https://googleads.googleapis.com/v18/customers:listAccessibleCustomers', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'developer-token': developerToken,
    },
  })

  const data = await res.json()
  if (!res.ok) {
    const message = data.error?.message ?? data.error?.status ?? 'Failed to list Google Ads customers'
    throw new Error(message)
  }

  const resourceNames = Array.isArray(data.resourceNames) ? data.resourceNames as string[] : []
  return resourceNames
    .map((name) => name.replace(/^customers\//, ''))
    .filter((id) => /^\d+$/.test(id))
    .map((id) => ({
      id,
      formatted: formatGoogleCustomerId(id),
    }))
}

function formatGoogleCustomerId(id: string): string {
  if (id.length !== 10) return id
  return `${id.slice(0, 3)}-${id.slice(3, 6)}-${id.slice(6)}`
}
