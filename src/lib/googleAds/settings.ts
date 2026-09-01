import { supabase } from '../supabase'
import { getFunctionErrorMessage } from '../supabaseFunctions'
import {
  budgetSplitForPlatforms,
  parseAdPlatforms,
  parsePlatformBudgetSplit,
  type AdPlatform,
  type PlatformBudgetSplit,
} from './budgetSplit'
import {
  emptyPlatformCredentialsStatus,
  type PlatformCredentialsStatus,
} from './credentials'

export type GoogleAdsCampaignBrief = {
  businessName: string
  industry: string
  websiteUrl: string
  locations: string
  monthlyBudget: string
  goal: string
  offerings: string
  audience: string
  notes: string
  platforms: AdPlatform[]
  platformBudgetSplit: PlatformBudgetSplit
}

export type GoogleAdsSettings = {
  adCampaignApiUrl: string | null
  status: 'connected' | 'disconnected' | 'error'
  usesDefaultApiUrl: boolean
  hasApiUrl: boolean
  campaignBrief: GoogleAdsCampaignBrief | null
  platformCredentials: PlatformCredentialsStatus
}

const SETTINGS_TIMEOUT_MS = 30_000

export function isGoogleAdsCampaignBriefSaved(
  brief: GoogleAdsCampaignBrief | null | undefined,
): boolean {
  if (!brief) return false

  return Boolean(
    brief.businessName.trim()
    || brief.industry.trim()
    || brief.websiteUrl.trim()
    || brief.locations.trim()
    || brief.monthlyBudget.trim()
    || brief.offerings.trim()
    || brief.audience.trim()
    || brief.notes.trim(),
  )
}

export async function fetchGoogleAdsSettings(): Promise<GoogleAdsSettings> {
  if (!supabase) {
    return {
      adCampaignApiUrl: null,
      status: 'disconnected',
      usesDefaultApiUrl: false,
      hasApiUrl: false,
      campaignBrief: null,
      platformCredentials: emptyPlatformCredentialsStatus(),
    }
  }

  const result = await supabase.functions.invoke('google-ads-settings', {
    body: { action: 'get_settings' },
    timeout: SETTINGS_TIMEOUT_MS,
  })

  if (result.error || hasFunctionFailure(result.data)) {
    throw new Error(await getFunctionErrorMessage(result.error, result.data))
  }

  const row = (result.data && typeof result.data === 'object' ? result.data : {}) as Record<
    string,
    unknown
  >

  return {
    adCampaignApiUrl: typeof row.adCampaignApiUrl === 'string' ? row.adCampaignApiUrl : null,
    status:
      row.status === 'connected' || row.status === 'error' || row.status === 'disconnected'
        ? row.status
        : 'disconnected',
    usesDefaultApiUrl: row.usesDefaultApiUrl === true,
    hasApiUrl: row.hasApiUrl === true,
    campaignBrief: parseCampaignBrief(row.campaignBrief),
    platformCredentials: parsePlatformCredentialsStatus(row.platformCredentials),
  }
}

export async function saveGoogleAdsSettings(adCampaignApiUrl: string): Promise<GoogleAdsSettings> {
  if (!supabase) {
    throw new Error('Supabase is not configured.')
  }

  const result = await supabase.functions.invoke('google-ads-settings', {
    body: { action: 'save_settings', adCampaignApiUrl },
    timeout: SETTINGS_TIMEOUT_MS,
  })

  if (result.error || hasFunctionFailure(result.data)) {
    throw new Error(await getFunctionErrorMessage(result.error, result.data))
  }

  const current = await fetchGoogleAdsSettings()

  return {
    ...current,
    adCampaignApiUrl:
      typeof result.data?.adCampaignApiUrl === 'string'
        ? result.data.adCampaignApiUrl
        : adCampaignApiUrl,
    status: 'connected',
    usesDefaultApiUrl: false,
    hasApiUrl: true,
  }
}

export async function saveGoogleAdsCampaignBrief(
  campaignBrief: GoogleAdsCampaignBrief,
): Promise<GoogleAdsCampaignBrief> {
  if (!supabase) {
    throw new Error('Supabase is not configured.')
  }

  const result = await supabase.functions.invoke('google-ads-settings', {
    body: { action: 'save_brief', campaignBrief },
    timeout: SETTINGS_TIMEOUT_MS,
  })

  if (result.error || hasFunctionFailure(result.data)) {
    throw new Error(await getFunctionErrorMessage(result.error, result.data))
  }

  return parseCampaignBrief(result.data?.campaignBrief) ?? campaignBrief
}

export async function disconnectGoogleAds(): Promise<void> {
  if (!supabase) {
    throw new Error('Supabase is not configured.')
  }

  const result = await supabase.functions.invoke('google-ads-settings', {
    body: { action: 'disconnect' },
    timeout: SETTINGS_TIMEOUT_MS,
  })

  if (result.error || hasFunctionFailure(result.data)) {
    throw new Error(await getFunctionErrorMessage(result.error, result.data))
  }
}

export function isGoogleAdsIntegrationConfigured(settings: GoogleAdsSettings): boolean {
  return Boolean(settings.adCampaignApiUrl || settings.usesDefaultApiUrl)
}

function parseCampaignBrief(value: unknown): GoogleAdsCampaignBrief | null {
  if (!value || typeof value !== 'object') return null

  const row = value as Record<string, unknown>
  const brief: GoogleAdsCampaignBrief = {
    businessName: stringField(row.businessName),
    industry: stringField(row.industry),
    websiteUrl: stringField(row.websiteUrl),
    locations: stringField(row.locations),
    monthlyBudget: stringField(row.monthlyBudget),
    goal: stringField(row.goal) || 'leads',
    offerings: stringField(row.offerings),
    audience: stringField(row.audience),
    notes: stringField(row.notes),
    platforms: parseAdPlatforms(row.platforms),
    platformBudgetSplit: budgetSplitForPlatforms(
      parseAdPlatforms(row.platforms),
      parsePlatformBudgetSplit(row.platformBudgetSplit),
    ),
  }

  return isGoogleAdsCampaignBriefSaved(brief) ? brief : null
}

function stringField(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function hasFunctionFailure(data: unknown): boolean {
  if (data === null || typeof data !== 'object') return false

  const row = data as Record<string, unknown>
  if (
    'success' in row
    || 'adCampaignApiUrl' in row
    || 'hasApiUrl' in row
    || 'campaignBrief' in row
    || 'platformCredentials' in row
  ) {
    return false
  }

  return typeof row.error === 'string' && row.error.length > 0
}

function parsePlatformCredentialsStatus(value: unknown): PlatformCredentialsStatus {
  if (!value || typeof value !== 'object') return emptyPlatformCredentialsStatus()

  const row = value as Record<string, unknown>
  const base = emptyPlatformCredentialsStatus()
  const google = row.google && typeof row.google === 'object'
    ? (row.google as Record<string, unknown>)
    : null
  const facebook = row.facebook && typeof row.facebook === 'object'
    ? (row.facebook as Record<string, unknown>)
    : null
  const yelp = row.yelp && typeof row.yelp === 'object'
    ? (row.yelp as Record<string, unknown>)
    : null

  return {
    google: google
      ? {
          configured: google.configured === true,
          hasDeveloperToken: google.hasDeveloperToken === true,
          hasClientSecret: google.hasClientSecret === true,
          hasRefreshToken: google.hasRefreshToken === true,
          clientId: stringField(google.clientId),
          customerId: stringField(google.customerId),
          loginCustomerId: stringField(google.loginCustomerId),
          useProtoPlus: google.useProtoPlus !== false,
        }
      : base.google,
    facebook: facebook
      ? {
          configured: facebook.configured === true,
          hasAccessToken: facebook.hasAccessToken === true,
          adAccountId: stringField(facebook.adAccountId),
          pageId: stringField(facebook.pageId),
          pixelId: stringField(facebook.pixelId),
        }
      : base.facebook,
    yelp: yelp
      ? {
          configured: yelp.configured === true,
          hasPassword: yelp.hasPassword === true,
          username: stringField(yelp.username),
          businessId: stringField(yelp.businessId),
          apiBase: stringField(yelp.apiBase),
        }
      : base.yelp,
  }
}
