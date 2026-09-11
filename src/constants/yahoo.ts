/** Yahoo Mail & Calendar OAuth scopes (IMAP/CalDAV via OAuth2) */
export const YAHOO_SCOPES = [
  'openid',
  'mail-r',
  'mail-w',
  'ycal-r',
  'ycal-w',
] as const

export const YAHOO_OAUTH_STATE_KEY = 'yahoo_oauth_state'
export const YAHOO_AUTH_URL = 'https://api.login.yahoo.com/oauth2/request_auth'
export const YAHOO_TOKEN_URL = 'https://api.login.yahoo.com/oauth2/get_token'
export const YAHOO_USERINFO_URL = 'https://api.login.yahoo.com/openid/v1/userinfo'

export function getYahooRedirectUri(): string {
  const override = import.meta.env.VITE_YAHOO_REDIRECT_URI
  if (override) return override
  return `${window.location.origin}/account/integrations/yahoo/callback`
}

export function isYahooOAuthConfigured(): boolean {
  return Boolean(import.meta.env.VITE_YAHOO_CLIENT_ID)
}
