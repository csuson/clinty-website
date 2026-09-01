export const AD_CAMPAIGN_BUDGET_MIN = 50
export const AD_CAMPAIGN_BUDGET_MAX = 20_000
export const AD_CAMPAIGN_BUDGET_STEP = 50
export const AD_CAMPAIGN_BUDGET_DEFAULT = 500

export function parseMonthlyBudget(value: string): number {
  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed)) return AD_CAMPAIGN_BUDGET_DEFAULT
  return Math.min(AD_CAMPAIGN_BUDGET_MAX, Math.max(AD_CAMPAIGN_BUDGET_MIN, parsed))
}

export function getDefaultAdCampaignApiUrl(): string | null {
  const configured = import.meta.env.VITE_AD_CAMPAIGN_API_URL?.trim().replace(/\/$/, '')
  return configured || null
}

export function isGoogleAdsApiConfigured(userUrl?: string | null): boolean {
  const trimmed = userUrl?.trim().replace(/\/$/, '')
  if (trimmed) return true
  if (getDefaultAdCampaignApiUrl()) return true
  return import.meta.env.DEV
}
