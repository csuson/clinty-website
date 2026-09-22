import { supabase } from './supabase'

export type AuthenticatorAssuranceLevel = 'aal1' | 'aal2'

export type MfaStatus = {
  currentLevel: AuthenticatorAssuranceLevel
  nextLevel: AuthenticatorAssuranceLevel | null
  hasVerifiedTotp: boolean
  factorId: string | null
}

export async function fetchMfaStatus(): Promise<MfaStatus> {
  if (!supabase) {
    return { currentLevel: 'aal1', nextLevel: null, hasVerifiedTotp: false, factorId: null }
  }

  const [{ data: aal }, { data: factors }] = await Promise.all([
    supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
    supabase.auth.mfa.listFactors(),
  ])

  const totp = factors?.totp?.find((factor) => factor.status === 'verified') ?? null

  return {
    currentLevel: aal?.currentLevel === 'aal2' ? 'aal2' : 'aal1',
    nextLevel: aal?.nextLevel === 'aal2' ? 'aal2' : aal?.nextLevel === 'aal1' ? 'aal1' : null,
    hasVerifiedTotp: Boolean(totp),
    factorId: totp?.id ?? null,
  }
}

export async function enrollTotp(): Promise<{
  factorId: string
  qrCode: string
  secret: string
}> {
  if (!supabase) throw new Error('Supabase is not configured.')

  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: 'totp',
    friendlyName: 'Clinty authenticator',
  })
  if (error) throw new Error(error.message)
  if (!data?.id || !data.totp?.qr_code || !data.totp?.secret) {
    throw new Error('MFA enrollment did not return a TOTP factor.')
  }

  return {
    factorId: data.id,
    qrCode: data.totp.qr_code,
    secret: data.totp.secret,
  }
}

export async function verifyTotpEnrollment(factorId: string, code: string): Promise<void> {
  if (!supabase) throw new Error('Supabase is not configured.')

  const challenge = await supabase.auth.mfa.challenge({ factorId })
  if (challenge.error) throw new Error(challenge.error.message)
  if (!challenge.data?.id) throw new Error('MFA challenge failed.')

  const verify = await supabase.auth.mfa.verify({
    factorId,
    challengeId: challenge.data.id,
    code: code.trim(),
  })
  if (verify.error) throw new Error(verify.error.message)
}

export async function challengeAndVerifyTotp(factorId: string, code: string): Promise<void> {
  if (!supabase) throw new Error('Supabase is not configured.')

  const challenge = await supabase.auth.mfa.challenge({ factorId })
  if (challenge.error) throw new Error(challenge.error.message)
  if (!challenge.data?.id) throw new Error('MFA challenge failed.')

  const verify = await supabase.auth.mfa.verify({
    factorId,
    challengeId: challenge.data.id,
    code: code.trim(),
  })
  if (verify.error) throw new Error(verify.error.message)
}

export async function unenrollTotp(factorId: string): Promise<void> {
  if (!supabase) throw new Error('Supabase is not configured.')
  const { error } = await supabase.auth.mfa.unenroll({ factorId })
  if (error) throw new Error(error.message)
}

/** Re-authenticate with password before sensitive account actions (CASA 2.4.1). */
export async function reauthenticateWithPassword(email: string, password: string): Promise<void> {
  if (!supabase) throw new Error('Supabase is not configured.')
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw new Error(error.message || 'Current password is incorrect.')
}
