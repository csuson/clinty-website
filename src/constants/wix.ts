export const WIX_OAUTH_STATE_KEY = 'wix_app_install_state'
export const WIX_PENDING_INSTANCE_KEY = 'wix_pending_instance_id'
export const WIX_PENDING_SHARE_INSTALL_KEY = 'wix_pending_share_install'

/** Published Clinty Cancel Booking Recovery share install link. */
export const CLINTY_WIX_APP_SHARE_URL = 'https://wix.to/9PIMeWM'

/**
 * App ID for Clinty Cancel Booking Recovery.
 * Verified: https://wix.to/9PIMeWM → /app-market/install/1f88c5af-e254-44fb-917f-49bed77b8632
 */
export const CLINTY_WIX_APP_ID = '1f88c5af-e254-44fb-917f-49bed77b8632'

/** Stable App Market install page (same destination as the share link). */
export const CLINTY_WIX_APP_MARKET_INSTALL_URL =
  `https://www.wix.com/app-market/install/${CLINTY_WIX_APP_ID}`

export function getWixRedirectUri(): string {
  if (typeof window === 'undefined') return ''
  return `${window.location.origin}/account/integrations/wix/callback`
}

/**
 * URL for the Install button.
 *
 * Use the published App Market install page — not /app-installer or
 * /installer/install. Those return "couldn't load installation data" /
 * "couldn't find an app" for this unlisted share-link app.
 *
 * After Add to Site, the tenant pastes Instance ID into Clinty (share / market
 * pages do not call postInstallationUrl).
 */
export function buildWixInstallerUrl(
  _installBaseUrl: string,
  userId: string,
  _fallbackAppId?: string | null,
): string {
  sessionStorage.setItem(WIX_OAUTH_STATE_KEY, `${userId}:${crypto.randomUUID()}`)
  sessionStorage.setItem(WIX_PENDING_SHARE_INSTALL_KEY, '1')
  return CLINTY_WIX_APP_MARKET_INSTALL_URL
}

export function takePendingWixShareInstall(): boolean {
  const pending = sessionStorage.getItem(WIX_PENDING_SHARE_INSTALL_KEY) === '1'
  sessionStorage.removeItem(WIX_PENDING_SHARE_INSTALL_KEY)
  return pending
}

/**
 * Validate install state from a Wix OAuth redirect (if Redirect URL is configured).
 * Exact sessionStorage match when same-tab; otherwise accept userId-prefixed state.
 */
export function validateWixInstallState(state: string | null, userId: string): boolean {
  if (!state) return false
  if (!state.startsWith(`${userId}:`)) return false
  const saved = sessionStorage.getItem(WIX_OAUTH_STATE_KEY)
  sessionStorage.removeItem(WIX_OAUTH_STATE_KEY)
  if (saved && saved !== state) return false
  return true
}

export function stashPendingWixInstanceId(instanceId: string): void {
  sessionStorage.setItem(WIX_PENDING_INSTANCE_KEY, instanceId.trim())
}

export function takePendingWixInstanceId(): string | null {
  const value = sessionStorage.getItem(WIX_PENDING_INSTANCE_KEY)
  if (!value) return null
  sessionStorage.removeItem(WIX_PENDING_INSTANCE_KEY)
  return value.trim() || null
}
