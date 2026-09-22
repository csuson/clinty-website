import { useCallback, useEffect, useState } from 'react'
import FormField from './FormField'
import { inputClass } from '../constants/forms'
import {
  challengeAndVerifyTotp,
  enrollTotp,
  fetchMfaStatus,
  unenrollTotp,
  verifyTotpEnrollment,
  type MfaStatus,
} from '../lib/mfa'

type MfaSecurityPanelProps = {
  requiredForAdmin?: boolean
  onStatusChange?: () => void
}

export default function MfaSecurityPanel({
  requiredForAdmin = false,
  onStatusChange,
}: MfaSecurityPanelProps) {
  const [status, setStatus] = useState<MfaStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [enrollFactorId, setEnrollFactorId] = useState<string | null>(null)
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [secret, setSecret] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [challengeCode, setChallengeCode] = useState('')

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setStatus(await fetchMfaStatus())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load MFA status')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  async function handleStartEnroll() {
    setWorking(true)
    setError(null)
    setMessage(null)
    try {
      const enrolled = await enrollTotp()
      setEnrollFactorId(enrolled.factorId)
      setQrCode(enrolled.qrCode)
      setSecret(enrolled.secret)
      setCode('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start MFA enrollment')
    } finally {
      setWorking(false)
    }
  }

  async function handleConfirmEnroll(e: React.FormEvent) {
    e.preventDefault()
    if (!enrollFactorId) return
    setWorking(true)
    setError(null)
    setMessage(null)
    try {
      await verifyTotpEnrollment(enrollFactorId, code)
      setEnrollFactorId(null)
      setQrCode(null)
      setSecret(null)
      setCode('')
      setMessage('Authenticator app enrolled. Use it when signing in to Admin.')
      await refresh()
      onStatusChange?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid verification code')
    } finally {
      setWorking(false)
    }
  }

  async function handleChallenge(e: React.FormEvent) {
    e.preventDefault()
    if (!status?.factorId) return
    setWorking(true)
    setError(null)
    setMessage(null)
    try {
      await challengeAndVerifyTotp(status.factorId, challengeCode)
      setChallengeCode('')
      setMessage('Multi-factor authentication verified for this session.')
      await refresh()
      onStatusChange?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid MFA code')
    } finally {
      setWorking(false)
    }
  }

  async function handleUnenroll() {
    if (!status?.factorId) return
    if (!window.confirm('Remove authenticator MFA from this account?')) return
    setWorking(true)
    setError(null)
    setMessage(null)
    try {
      await unenrollTotp(status.factorId)
      setMessage('MFA removed.')
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove MFA')
    } finally {
      setWorking(false)
    }
  }

  if (loading) {
    return <p className="text-sm text-navy-600">Loading MFA status…</p>
  }

  const verified = Boolean(status?.hasVerifiedTotp)
  const aal2 = status?.currentLevel === 'aal2'
  const needsChallenge = verified && !aal2

  return (
    <div className="space-y-4">
      {requiredForAdmin && (
        <p className="text-sm text-navy-600">
          Admin access requires multi-factor authentication (TOTP). Enroll an authenticator app, then
          verify a code so this session is elevated to MFA.
        </p>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}
      {message && (
        <div className="rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-800">
          {message}
        </div>
      )}

      <div className="rounded-xl border border-navy-900/10 bg-cream/50 px-4 py-3 text-sm text-navy-800 space-y-1">
        <p>
          <span className="font-medium">Authenticator enrolled:</span> {verified ? 'Yes' : 'No'}
        </p>
        <p>
          <span className="font-medium">Session MFA level:</span> {aal2 ? 'Verified (aal2)' : 'Password only (aal1)'}
        </p>
      </div>

      {!verified && !enrollFactorId && (
        <button
          type="button"
          disabled={working}
          onClick={() => void handleStartEnroll()}
          className="text-sm font-medium bg-navy-900 text-cream px-4 py-2 rounded-lg hover:bg-navy-800 disabled:opacity-60"
        >
          {working ? 'Starting…' : 'Set up authenticator app'}
        </button>
      )}

      {enrollFactorId && qrCode && (
        <form onSubmit={handleConfirmEnroll} className="space-y-4 max-w-md">
          <p className="text-sm text-navy-600">
            Scan this QR code with Google Authenticator, 1Password, or Authy, then enter the 6-digit
            code.
          </p>
          <img src={qrCode} alt="MFA enrollment QR code" className="w-48 h-48 bg-white rounded-lg border border-navy-900/10" />
          {secret && (
            <p className="text-xs font-mono text-navy-600 break-all">Manual secret: {secret}</p>
          )}
          <FormField label="Verification code" id="mfa-enroll-code" required>
            <input
              id="mfa-enroll-code"
              className={inputClass}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="123456"
              required
            />
          </FormField>
          <button
            type="submit"
            disabled={working || code.trim().length < 6}
            className="text-sm font-medium bg-navy-900 text-cream px-4 py-2 rounded-lg hover:bg-navy-800 disabled:opacity-60"
          >
            {working ? 'Verifying…' : 'Confirm enrollment'}
          </button>
        </form>
      )}

      {needsChallenge && (
        <form onSubmit={handleChallenge} className="space-y-4 max-w-md">
          <p className="text-sm text-navy-600">
            Enter a code from your authenticator app to unlock Admin for this session.
          </p>
          <FormField label="Authenticator code" id="mfa-challenge-code" required>
            <input
              id="mfa-challenge-code"
              className={inputClass}
              value={challengeCode}
              onChange={(e) => setChallengeCode(e.target.value)}
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="123456"
              required
            />
          </FormField>
          <button
            type="submit"
            disabled={working || challengeCode.trim().length < 6}
            className="text-sm font-medium bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 disabled:opacity-60"
          >
            {working ? 'Verifying…' : 'Verify MFA'}
          </button>
        </form>
      )}

      {verified && aal2 && !requiredForAdmin && (
        <button
          type="button"
          disabled={working}
          onClick={() => void handleUnenroll()}
          className="text-sm font-medium text-red-600 hover:text-red-700 disabled:opacity-60"
        >
          Remove authenticator
        </button>
      )}
    </div>
  )
}
