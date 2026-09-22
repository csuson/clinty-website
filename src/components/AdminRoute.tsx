import { Navigate, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { isAdminEmail } from '../constants/admin'
import { useAuth } from '../context/AuthContext'
import { fetchMfaStatus } from '../lib/mfa'
import MfaSecurityPanel from './MfaSecurityPanel'
import ProtectedRoute from './ProtectedRoute'

export default function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const location = useLocation()
  const [mfaReady, setMfaReady] = useState<boolean | null>(null)
  const [error, setError] = useState<string | null>(null)

  const isAdmin = isAdminEmail(user?.email)

  useEffect(() => {
    if (!isAdmin) {
      setMfaReady(false)
      return
    }

    let cancelled = false
    setMfaReady(null)
    setError(null)

    fetchMfaStatus()
      .then((status) => {
        if (cancelled) return
        setMfaReady(status.currentLevel === 'aal2')
      })
      .catch((err) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Failed to check MFA')
        setMfaReady(false)
      })

    return () => {
      cancelled = true
    }
  }, [isAdmin, user?.id])

  return (
    <ProtectedRoute>
      {!isAdmin ? (
        <Navigate to="/account" state={{ from: location.pathname }} replace />
      ) : mfaReady === null ? (
        <div className="pt-28 pb-24 px-6">
          <p className="text-sm text-navy-600">Checking multi-factor authentication…</p>
        </div>
      ) : mfaReady ? (
        children
      ) : (
        <div className="pt-28 pb-24 px-6">
          <div className="max-w-xl mx-auto bg-white rounded-2xl border border-navy-900/5 p-8 shadow-sm space-y-4">
            <h1 className="font-serif text-2xl text-navy-900">Admin MFA required</h1>
            <p className="text-sm text-navy-600">
              Clinty admin interfaces require multi-factor authentication. Complete MFA below, then this
              page will unlock.
            </p>
            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}
            <MfaSecurityPanel
              requiredForAdmin
              onStatusChange={() => {
                setMfaReady(null)
                fetchMfaStatus()
                  .then((status) => setMfaReady(status.currentLevel === 'aal2'))
                  .catch((err) => {
                    setError(err instanceof Error ? err.message : 'Failed to check MFA')
                    setMfaReady(false)
                  })
              }}
            />
            <button
              type="button"
              className="text-sm font-medium text-teal-700 hover:text-teal-800"
              onClick={() => {
                setMfaReady(null)
                fetchMfaStatus()
                  .then((status) => setMfaReady(status.currentLevel === 'aal2'))
                  .catch((err) => {
                    setError(err instanceof Error ? err.message : 'Failed to check MFA')
                    setMfaReady(false)
                  })
              }}
            >
              Refresh MFA status
            </button>
          </div>
        </div>
      )}
    </ProtectedRoute>
  )
}
