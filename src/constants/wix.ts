export const WIX_OAUTH_STATE_KEY = 'wix_app_install_state'
export const WIX_PENDING_INSTANCE_KEY = 'wix_pending_instance_id'

export function getWixRedirectUri(): string {
  if (typeof window === 'undefined') return ''
  return `${window.location.origin}/account/integrations/wix/callback`
}

/**
 * Normalize share / market install links into the standard installer URL so we can
 * attach Clinty's redirectUrl + state (wix.to short links drop query params on redirect).
 */
export function normalizeWixInstallBaseUrl(
  installBaseUrl: string,
  fallbackAppId?: string | null,
): string {
  const raw = installBaseUrl.trim()
  if (!raw) {
    const id = (fallbackAppId || '').trim()
    return id ? `https://www.wix.com/installer/install?appId=${encodeURIComponent(id)}` : ''
  }

  try {
    const url = new URL(raw)
    const host = url.hostname.replace(/^www\./, '').toLowerCase()

    // https://wix.com/app-market/install/{appId}
    const market = url.pathname.match(/\/app-market\/install\/([0-9a-f-]{36})/i)
    if (market) {
      return `https://www.wix.com/installer/install?appId=${encodeURIComponent(market[1])}`
    }

    // Already an installer URL — keep appId, strip prior redirect/state.
    if (host === 'wix.com' && url.pathname.includes('/installer/install')) {
      const appId = url.searchParams.get('appId') || url.searchParams.get('appid') || fallbackAppId
      if (appId?.trim()) {
        return `https://www.wix.com/installer/install?appId=${encodeURIComponent(appId.trim())}`
      }
    }

    // https://wix.to/… short share link — expand via known app id when available.
    if (host === 'wix.to') {
      const id = (fallbackAppId || '').trim()
      if (id) {
        return `https://www.wix.com/installer/install?appId=${encodeURIComponent(id)}`
      }
      // Last resort: open short link as-is (may not return to Clinty callback).
      return raw
    }
  } catch {
    // fall through
  }

  return raw
}

/** Build the Wix installer URL with Clinty redirect + CSRF state. */
export function buildWixInstallerUrl(
  installBaseUrl: string,
  userId: string,
  fallbackAppId?: string | null,
): string {
  const base = normalizeWixInstallBaseUrl(installBaseUrl, fallbackAppId)
  if (!base) return ''
  const state = `${userId}:${crypto.randomUUID()}`
  sessionStorage.setItem(WIX_OAUTH_STATE_KEY, state)
  const url = new URL(base)
  url.searchParams.set('redirectUrl', getWixRedirectUri())
  url.searchParams.set('state', state)
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
