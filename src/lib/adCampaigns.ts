import type { CampaignSnapshot } from '../constants/adCampaigns'

const DEFAULT_DEV_API = '/api/ad-campaigns'

function apiBase(): string {
  const configured = import.meta.env.VITE_AD_CAMPAIGN_API_URL?.replace(/\/$/, '')
  if (configured) return configured
  if (import.meta.env.DEV) return DEFAULT_DEV_API
  return ''
}

export function isAdCampaignApiConfigured(): boolean {
  return apiBase().length > 0
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const base = apiBase()
  if (!base) {
    throw new Error('Google Ads campaign API is not configured. Set VITE_AD_CAMPAIGN_API_URL.')
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

export async function createAdCampaign(brief: string): Promise<CampaignSnapshot> {
  return request<CampaignSnapshot>('/v1/campaigns', {
    method: 'POST',
    body: JSON.stringify({ brief }),
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
