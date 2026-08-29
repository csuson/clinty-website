/** Microsoft Graph scopes for Outlook mail and calendar */
export const OUTLOOK_SCOPES = [
  'https://graph.microsoft.com/Mail.ReadWrite',
  'https://graph.microsoft.com/Calendars.ReadWrite',
  'https://graph.microsoft.com/User.Read',
  'offline_access',
] as const

export const OUTLOOK_OAUTH_STATE_KEY = 'outlook_oauth_state'

export const MICROSOFT_AUTH_URL =
  'https://login.microsoftonline.com/common/oauth2/v2.0/authorize'

export function getOutlookRedirectUri(): string {
  const override = import.meta.env.VITE_MICROSOFT_REDIRECT_URI
  if (override) return override
  return `${window.location.origin}/account/integrations/outlook/callback`
}

export function isMicrosoftOAuthConfigured(): boolean {
  return Boolean(import.meta.env.VITE_MICROSOFT_CLIENT_ID)
}
