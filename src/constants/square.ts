/** Square Bookings / Appointments OAuth scopes for merchant calendar access */
export const SQUARE_SCOPES = [
  'MERCHANT_PROFILE_READ',
  'APPOINTMENTS_READ',
  'APPOINTMENTS_WRITE',
  'APPOINTMENTS_ALL_READ',
  'APPOINTMENTS_ALL_WRITE',
  'APPOINTMENTS_BUSINESS_SETTINGS_READ',
] as const

export const SQUARE_OAUTH_STATE_KEY = 'square_oauth_state'

export function isSquareSandbox(): boolean {
  return import.meta.env.VITE_SQUARE_SANDBOX === 'true'
}

export function getSquareConnectHost(): string {
  return isSquareSandbox()
    ? 'https://connect.squareupsandbox.com'
    : 'https://connect.squareup.com'
}

export function getSquareRedirectUri(): string {
  const override = import.meta.env.VITE_SQUARE_REDIRECT_URI
  if (override) return override
  return `${window.location.origin}/account/integrations/square/callback`
}

export function isSquareOAuthConfigured(): boolean {
  return Boolean(import.meta.env.VITE_SQUARE_APPLICATION_ID)
}
