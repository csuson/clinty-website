import type { AdCampaignAnalyticsReport, CampaignSnapshot } from '../constants/adCampaigns'
import { getDefaultAdCampaignApiUrl } from '../constants/googleAds'
import {
  budgetSplitForPlatforms,
  budgetSplitPayload,
  parseAdPlatforms,
  type AdPlatform,
  type PlatformBudgetSplit,
} from './googleAds/budgetSplit'
import type { PlatformCredentialsPayload } from './googleAds/credentials'

const DEFAULT_DEV_API = '/api/ad-campaigns'

let userApiBase: string | null = null

export function configureAdCampaignApi(userUrl?: string | null) {
  const trimmed = userUrl?.trim().replace(/\/$/, '')
  userApiBase = trimmed || null
}

export function resolveAdCampaignApiUrl(): string {
  if (userApiBase) return userApiBase

  const configured = getDefaultAdCampaignApiUrl()
  if (configured) return configured

  if (import.meta.env.DEV) return DEFAULT_DEV_API
  return ''
}

export function isAdCampaignApiConfigured(): boolean {
  return resolveAdCampaignApiUrl().length > 0
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const base = resolveAdCampaignApiUrl()
  if (!base) {
    throw new Error(
      'Ad campaign API is not configured. Save your campaign AI URL in Integrations, or set VITE_AD_CAMPAIGN_API_URL.',
    )
  }

  const response = await fetch(`${base}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    signal: init?.signal ?? AbortSignal.timeout(180_000),
  })

  if (!response.ok) {
    let detail = `Request failed (${response.status})`
    const payload = (await response.json().catch(() => null)) as { detail?: unknown } | null
    if (typeof payload?.detail === 'string') detail = payload.detail
    else if (payload?.detail) detail = JSON.stringify(payload.detail)
    throw new Error(detail)
  }

  return (await response.json()) as T
}

export type CreateAdCampaignInput = {
  brief: string
  platforms: AdPlatform[]
  platformBudgetSplit?: PlatformBudgetSplit
}

export function buildCreateCampaignRequest({
  brief,
  platforms,
  platformBudgetSplit,
}: CreateAdCampaignInput): Record<string, unknown> {
  const normalizedPlatforms = parseAdPlatforms(platforms)
  if (normalizedPlatforms.length === 0) {
    throw new Error('Select at least one platform: Google Ads, Facebook / Instagram, or Yelp.')
  }

  const split = budgetSplitForPlatforms(normalizedPlatforms, platformBudgetSplit)
  const budgetSplit = budgetSplitPayload(normalizedPlatforms, split)

  return {
    brief,
    platforms: normalizedPlatforms,
    ...(budgetSplit ? { budget_split: budgetSplit } : {}),
  }
}

export async function createAdCampaign(
  brief: string,
  platforms: AdPlatform[] = ['google', 'facebook'],
  platformBudgetSplit?: PlatformBudgetSplit,
): Promise<CampaignSnapshot> {
  const body = buildCreateCampaignRequest({ brief, platforms, platformBudgetSplit })

  return request<CampaignSnapshot>('/v1/campaigns', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function fetchAdCampaignAnalytics(
  days = 30,
  platforms: AdPlatform[] = ['google', 'facebook', 'yelp'],
  platformCredentials?: PlatformCredentialsPayload | null,
): Promise<AdCampaignAnalyticsReport> {
  return request<AdCampaignAnalyticsReport>('/v1/analytics', {
    method: 'POST',
    body: JSON.stringify({
      days,
      platforms,
      ...(platformCredentials ? { platform_credentials: platformCredentials } : {}),
    }),
    signal: AbortSignal.timeout(60_000),
  })
}

export async function resumeAdCampaign(
  threadId: string,
  body: {
    answers?: Record<string, string>
    approved?: boolean
    publish?: boolean
    notes?: string
    platform_credentials?: PlatformCredentialsPayload
  },
): Promise<CampaignSnapshot> {
  return request<CampaignSnapshot>(`/v1/campaigns/${threadId}/resume`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}
