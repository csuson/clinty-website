/** Admin allowlist + MFA (aal2) checks for Edge Functions (CASA 3.3.1). */

export function isAdminEmail(email: string | undefined | null): boolean {
  if (!email) return false
  const allowed = new Set(
    (Deno.env.get('ADMIN_EMAILS') ?? '')
      .split(',')
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean),
  )
  return allowed.has(email.toLowerCase())
}

export type AuthenticatorAssuranceLevel = 'aal1' | 'aal2'

export function decodeJwtPayload(accessToken: string): Record<string, unknown> | null {
  try {
    const parts = accessToken.replace(/^Bearer\s+/i, '').split('.')
    if (parts.length < 2) return null
    const json = atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'))
    return JSON.parse(json) as Record<string, unknown>
  } catch {
    return null
  }
}

export function getAalFromAccessToken(accessToken: string | null | undefined): AuthenticatorAssuranceLevel {
  if (!accessToken) return 'aal1'
  const payload = decodeJwtPayload(accessToken)
  const aal = typeof payload?.aal === 'string' ? payload.aal : 'aal1'
  return aal === 'aal2' ? 'aal2' : 'aal1'
}

export function getAalFromAuthHeader(authHeader: string | null | undefined): AuthenticatorAssuranceLevel {
  if (!authHeader) return 'aal1'
  return getAalFromAccessToken(authHeader)
}

/** Admin Edge Functions require MFA (aal2) when the caller is an admin email. */
export function requireAdminMfa(
  email: string | undefined | null,
  authHeader: string | null | undefined,
  isAdmin: boolean,
): { ok: true } | { ok: false; error: string; status: number } {
  if (!isAdmin) {
    return { ok: false, error: 'Forbidden', status: 403 }
  }
  if (getAalFromAuthHeader(authHeader) !== 'aal2') {
    return {
      ok: false,
      error:
        'Admin multi-factor authentication required. Enroll and verify MFA in Account → Security, then sign in again.',
      status: 403,
    }
  }
  return { ok: true }
}
