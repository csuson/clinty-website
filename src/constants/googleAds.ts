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
