export const WIX_OAUTH_STATE_KEY = 'wix_app_install_state'
export const WIX_PENDING_INSTANCE_KEY = 'wix_pending_instance_id'

/** Published Clinty Cancel Booking Recovery share install link (App Market). */
export const CLINTY_WIX_APP_SHARE_URL = 'https://wix.to/9PIMeWM'

/**
 * App ID for Clinty Cancel Booking Recovery (Wix Studio → View ID & keys).
 * Same GUID appears on https://wix.to/9PIMeWM → /app-market/install/{id}.
 */
export const CLINTY_WIX_APP_ID = '1f88c5af-e254-44fb-917f-49bed77b8632'

/**
 * shareUrlId for the unlisted share install link (Wix external install flow).
 * Per Wix docs: GUID at the end of the resolved app-market/install URL.
 * @see https://dev.wix.com/docs/build-apps/launch-your-app/app-distribution/install-your-app/set-up-the-external-install-flow
 */
export const CLINTY_WIX_SHARE_URL_ID = CLINTY_WIX_APP_ID

/** Known wix.to short-code → App ID. */
export const WIX_SHARE_CODE_APP_IDS: Record<string, string> = {
  '9PIMeWM': CLINTY_WIX_APP_ID,
}

export function getWixRedirectUri(): string {
  if (typeof window === 'undefined') return ''
  return `${window.location.origin}/account/integrations/wix/callback`
}

/**
 * Build the Wix external install URL (unlisted / share-link apps).
 * Do not use /installer/install?appId= alone — that path returns
 * "couldn't find an app with this app ID" for unlisted apps.
 */
export function buildWixInstallerUrl(
  _installBaseUrl: string,
  userId: string,
  _fallbackAppId?: string | null,
): string {
  const state = `${userId}:${crypto.randomUUID()}`
  sessionStorage.setItem(WIX_OAUTH_STATE_KEY, state)

  const callbackUrl = new URL(getWixRedirectUri())
  callbackUrl.searchParams.set('state', state)

  const url = new URL('https://www.wix.com/app-installer')
  url.searchParams.set('appId', CLINTY_WIX_APP_ID)
  // Required for unlisted apps installed via a share link.
  url.searchParams.set('shareUrlId', CLINTY_WIX_SHARE_URL_ID)
  // Wix expects the full callback URL as an encoded URI component.
  url.searchParams.set('postInstallationUrl', callbackUrl.toString())
  return url.toString()
}

export function validateWixInstallState(state: string | null, userId: string): boolean {
  if (!state) return false
  const saved = sessionStorage.getItem(WIX_OAUTH_STATE_KEY)
  sessionStorage.removeItem(WIX_OAUTH_STATE_KEY)
  if (!saved || saved !== state) return false
  return state.startsWith(`${userId}:`)
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
