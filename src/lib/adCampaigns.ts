import type { CampaignSnapshot } from '../constants/adCampaigns'
import { getDefaultAdCampaignApiUrl } from '../constants/googleAds'

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

export async function createAdCampaign(
  brief: string,
  platforms: string[] = ['google', 'facebook'],
): Promise<CampaignSnapshot> {
  return request<CampaignSnapshot>('/v1/campaigns', {
    method: 'POST',
    body: JSON.stringify({ brief, platforms }),
  })
}

export async function resumeAdCampaign(
  threadId: string,
  body: {
    answers?: Record<string, string>
    approved?: boolean
    publish?: boolean
    notes?: string
  },
): Promise<CampaignSnapshot> {
  return request<CampaignSnapshot>(`/v1/campaigns/${threadId}/resume`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}
