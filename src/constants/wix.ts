export const WIX_OAUTH_STATE_KEY = 'wix_app_install_state'
export const WIX_PENDING_INSTANCE_KEY = 'wix_pending_instance_id'

export function getWixRedirectUri(): string {
  if (typeof window === 'undefined') return ''
  return `${window.location.origin}/account/integrations/wix/callback`
}

/** Build the Wix installer URL with Clinty redirect + CSRF state. */
export function buildWixInstallerUrl(installBaseUrl: string, userId: string): string {
  const base = installBaseUrl.trim()
  if (!base) return ''
  const state = `${userId}:${crypto.randomUUID()}`
  sessionStorage.setItem(WIX_OAUTH_STATE_KEY, state)
  const url = new URL(base)
  if (!url.searchParams.get('appId') && !url.searchParams.get('appid')) {
    // Custom overrides should already include appId; leave as-is if present.
  }
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
