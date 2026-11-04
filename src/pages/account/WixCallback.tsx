import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import {
  stashPendingWixInstanceId,
  validateWixInstallState,
} from '../../constants/wix'
import { syncWixInstallInstance } from '../../lib/bookingRecovery'

export default function WixCallback() {
  const { user, loading: authLoading } = useAuth()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [message, setMessage] = useState('Finishing Wix app install…')

  useEffect(() => {
    if (authLoading) return

    if (!user) {
      navigate('/sign-in', { replace: true })
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

    const instanceId =
      searchParams.get('instanceId') ||
      searchParams.get('instance_id') ||
      ''
    const state = searchParams.get('state')

    if (!instanceId.trim()) {
      navigate(
        `/account/integrations?wix_error=${encodeURIComponent(
          'Missing instance ID from Wix. Install the Clinty app again, or paste Instance ID manually.',
        )}`,
        { replace: true },
      )
      return
    }

    if (state && !validateWixInstallState(state, user.id)) {
      navigate(
        `/account/integrations?wix_error=${encodeURIComponent(
          'Invalid install state. Open Integrations and install the Clinty Wix app again.',
        )}`,
        { replace: true },
      )
      return
    }

    const trimmed = instanceId.trim()
    setMessage('Saving Wix instance for cancel recovery…')
    stashPendingWixInstanceId(trimmed)

    void (async () => {
      try {
        await syncWixInstallInstance(trimmed)
        navigate(
          `/account/integrations?wix_installed=1&wix_instance_id=${encodeURIComponent(trimmed)}`,
          { replace: true },
        )
      } catch (err) {
        const msg =
          err instanceof Error
            ? err.message
            : 'Could not sync Wix instance for cancel recovery.'
        // Still hand instance to Connect form; routing sync can retry on Connect.
        navigate(
          `/account/integrations?wix_installed=1&wix_instance_id=${encodeURIComponent(trimmed)}&wix_error=${encodeURIComponent(msg)}`,
          { replace: true },
        )
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
