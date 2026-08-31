import { supabase } from '../supabase'
import { getFunctionErrorMessage } from '../supabaseFunctions'

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
}

export type GoogleAdsSettings = {
  adCampaignApiUrl: string | null
  status: 'connected' | 'disconnected' | 'error'
  usesDefaultApiUrl: boolean
  hasApiUrl: boolean
  campaignBrief: GoogleAdsCampaignBrief | null
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
  }

  return isGoogleAdsCampaignBriefSaved(brief) ? brief : null
}

function stringField(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function hasFunctionFailure(data: unknown): boolean {
  if (data === null || typeof data !== 'object') return false

  const row = data as Record<string, unknown>
  if ('success' in row || 'adCampaignApiUrl' in row || 'hasApiUrl' in row || 'campaignBrief' in row) {
    return false
  }

  return typeof row.error === 'string' && row.error.length > 0
}
