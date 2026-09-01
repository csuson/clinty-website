/** Meta Marketing API scopes for ad publishing */
export const META_ADS_SCOPES = [
  'ads_management',
  'business_management',
  'pages_show_list',
  'pages_read_engagement',
] as const

export const META_ADS_OAUTH_STATE_KEY = 'meta_ads_oauth_state'
export const META_ADS_PICKER_KEY = 'meta_ads_oauth_picker'

export const META_GRAPH_VERSION = 'v21.0'

export const META_AUTH_URL = `https://www.facebook.com/${META_GRAPH_VERSION}/dialog/oauth`

export function getMetaAdsRedirectUri(): string {
  const override = import.meta.env.VITE_META_REDIRECT_URI
  if (override) return override
  return `${window.location.origin}/account/integrations/meta/callback`
}

export function isMetaAdsOAuthConfigured(): boolean {
  return Boolean(import.meta.env.VITE_META_APP_ID)
}
