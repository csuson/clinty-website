import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import {
  stashPendingWixInstanceId,
  takePendingWixShareInstall,
  validateWixInstallState,
} from '../../constants/wix'
import {
  syncWixInstallInstance,
  syncWixSignedInstance,
} from '../../lib/bookingRecovery'

export default function WixCallback() {
  const { user, loading: authLoading } = useAuth()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [message, setMessage] = useState('Finishing Wix app link…')

  useEffect(() => {
    if (authLoading) return

    if (!user) {
      // ProtectedRoute normally handles this; keep query string if we land here raw.
      navigate('/sign-in', {
        replace: true,
        state: {
          from: `/account/integrations/wix/callback?${searchParams.toString()}`,
        },
      })
      return
    }

    const errorParam = searchParams.get('error') || searchParams.get('errorDescription')
    if (errorParam) {
      navigate(
        `/account/integrations?wix_error=${encodeURIComponent(
          errorParam === 'access_denied' ? 'You declined the Clinty Wix app.' : errorParam,
        )}`,
        { replace: true },
      )
      return
    }

    const signedInstance = searchParams.get('instance')?.trim() || ''
    const instanceId =
      searchParams.get('instanceId') ||
      searchParams.get('instance_id') ||
      ''
    const tenantId =
      searchParams.get('tenantId') ||
      searchParams.get('tenant_id') ||
      searchParams.get('siteId') ||
      ''
    const state = searchParams.get('state')
    const hadPendingShare = takePendingWixShareInstall()

    void (async () => {
      // Preferred path: Open App / external dashboard sends signed instance=.
      if (signedInstance) {
        setMessage('Verifying Wix install and saving Instance ID…')
        try {
          const result = await syncWixSignedInstance(signedInstance)
          const saved =
            result.wix_instance_id?.trim() ||
            result.connection?.wix_instance_id?.trim() ||
            ''
          if (!saved) {
            throw new Error('Wix did not return an instance ID.')
          }
          stashPendingWixInstanceId(saved)
          navigate(
            `/account/integrations?wix_installed=1&wix_instance_id=${encodeURIComponent(saved)}`,
            { replace: true },
          )
        } catch (err) {
          const msg =
            err instanceof Error
              ? err.message
              : 'Could not verify Wix Open App link.'
          navigate(
            `/account/integrations?wix_error=${encodeURIComponent(msg)}`,
            { replace: true },
          )
        }
        return
      }

      if (!instanceId.trim()) {
        navigate(
          `/account/integrations?wix_error=${encodeURIComponent(
            'No Instance ID from Wix. After install: Manage Apps → Clinty Cancel Booking Recovery → Open App (opens Clinty with the ID). Or ask an admin to copy it from Wix Studio → App Installations.',
          )}`,
          { replace: true },
        )
        return
      }

      if (state) {
        if (!validateWixInstallState(state, user.id)) {
          navigate(
            `/account/integrations?wix_error=${encodeURIComponent(
              'Invalid install state. Open Integrations and install the Clinty Wix app again.',
            )}`,
            { replace: true },
          )
          return
        }
      } else if (!hadPendingShare) {
        navigate(
          `/account/integrations?wix_error=${encodeURIComponent(
            'Install state missing. Prefer Manage Apps → Open App on the Clinty Wix app.',
          )}`,
          { replace: true },
        )
        return
      }

      const trimmed = instanceId.trim()
      const siteId = tenantId.trim()
      setMessage('Saving Wix instance for cancel recovery…')
      stashPendingWixInstanceId(trimmed)

      try {
        await syncWixInstallInstance(trimmed, siteId || undefined)
        const qs = new URLSearchParams({
          wix_installed: '1',
          wix_instance_id: trimmed,
        })
        if (siteId) qs.set('wix_site_id', siteId)
        navigate(`/account/integrations?${qs.toString()}`, { replace: true })
      } catch (err) {
        const msg =
          err instanceof Error
            ? err.message
            : 'Could not sync Wix instance for cancel recovery.'
        const qs = new URLSearchParams({
          wix_installed: '1',
          wix_instance_id: trimmed,
          wix_error: msg,
        })
        if (siteId) qs.set('wix_site_id', siteId)
        navigate(`/account/integrations?${qs.toString()}`, { replace: true })
      }
    })()
  }, [authLoading, user, searchParams, navigate])

  return (
    <div className="pt-32 pb-24 px-6 flex justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-teal-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-navy-600 text-sm">{message}</p>
      </div>
    </div>
  )
}
