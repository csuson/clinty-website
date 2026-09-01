import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { getGoogleAdsRedirectUri } from '../../constants/googleAdsOAuth'
import { useAuth } from '../../context/AuthContext'
import { exchangeGoogleAdsCode, validateOAuthState } from '../../lib/googleAds/oauth'

export default function GoogleAdsOAuthCallback() {
  const { user, loading: authLoading } = useAuth()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [message, setMessage] = useState('Completing Google Ads authorization...')

  useEffect(() => {
    if (authLoading) return

    if (!user) {
      navigate('/sign-in', { replace: true })
      return
    }

    const errorParam = searchParams.get('error')
    if (errorParam) {
      navigate(
        `/account/integrations?google_ads_oauth_error=${encodeURIComponent(errorParam === 'access_denied' ? 'You declined Google Ads access.' : errorParam)}`,
        { replace: true },
      )
      return
    }

    const code = searchParams.get('code')
    const state = searchParams.get('state')

    if (!code || !state) {
      navigate(
        `/account/integrations?google_ads_oauth_error=${encodeURIComponent('Missing authorization code from Google.')}`,
        { replace: true },
      )
      return
    }

    if (!validateOAuthState(state, user.id)) {
      navigate(
        `/account/integrations?google_ads_oauth_error=${encodeURIComponent('Invalid OAuth state. Please try again.')}`,
        { replace: true },
      )
      return
    }

    async function complete() {
      try {
        setMessage('Exchanging authorization code and storing Google Ads credentials...')
        await exchangeGoogleAdsCode(code!, getGoogleAdsRedirectUri())
        navigate('/account/integrations?google_ads_oauth_connected=1', { replace: true })
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Google Ads authorization failed'
        navigate(`/account/integrations?google_ads_oauth_error=${encodeURIComponent(msg)}`, { replace: true })
      }
    }

    complete()
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
