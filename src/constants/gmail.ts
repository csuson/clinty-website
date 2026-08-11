/** Gmail & Google API scopes — matches setup_gmail.py */
export const GMAIL_SCOPES = [
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/calendar',
] as const

export const GMAIL_OAUTH_STATE_KEY = 'gmail_oauth_state'

export function getGmailRedirectUri(): string {
  const override = import.meta.env.VITE_GOOGLE_REDIRECT_URI
  if (override) return override
  return `${window.location.origin}/account/integrations/gmail/callback`
}

export function isGoogleOAuthConfigured(): boolean {
  return Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID)
}
