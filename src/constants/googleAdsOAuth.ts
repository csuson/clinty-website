/** Google Ads API OAuth scope */
export const GOOGLE_ADS_SCOPES = ['https://www.googleapis.com/auth/adwords'] as const

export const GOOGLE_ADS_OAUTH_STATE_KEY = 'google_ads_oauth_state'

export function getGoogleAdsRedirectUri(): string {
  const override = import.meta.env.VITE_GOOGLE_ADS_REDIRECT_URI
  if (override) return override
  return `${window.location.origin}/account/integrations/google-ads/callback`
}

export function isGoogleAdsOAuthConfigured(): boolean {
  return Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID)
}
