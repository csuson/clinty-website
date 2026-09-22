/** Stripe Connect OAuth scopes for merchant payment access */
export const STRIPE_SCOPES = ['read_write'] as const

export const STRIPE_OAUTH_STATE_KEY = 'stripe_oauth_state'

export function getStripeConnectAuthorizeUrl(): string {
  return 'https://connect.stripe.com/oauth/authorize'
}

export function getStripeRedirectUri(): string {
  const override = import.meta.env.VITE_STRIPE_REDIRECT_URI
  if (override) return override
  return `${window.location.origin}/account/integrations/stripe/callback`
}

export function isStripeOAuthConfigured(): boolean {
  return Boolean(import.meta.env.VITE_STRIPE_CONNECT_CLIENT_ID)
}
