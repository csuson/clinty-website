import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { getMetaAdsRedirectUri } from '../../constants/metaAds'
import { useAuth } from '../../context/AuthContext'
import {
  exchangeMetaAdsCode,
  storeMetaOAuthPicker,
  validateOAuthState,
} from '../../lib/metaAds/oauth'

export default function MetaAdsCallback() {
  const { user, loading: authLoading } = useAuth()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [message, setMessage] = useState('Completing Meta authorization...')

  useEffect(() => {
    if (authLoading) return

    if (!user) {
      navigate('/sign-in', { replace: true })
      return
    }

    const errorParam = searchParams.get('error')
    if (errorParam) {
      navigate(
        `/account/integrations?meta_ads_error=${encodeURIComponent(errorParam === 'access_denied' ? 'You declined Meta access.' : errorParam)}`,
        { replace: true },
      )
      return
    }

    const code = searchParams.get('code')
    const state = searchParams.get('state')

    if (!code || !state) {
      navigate(
        `/account/integrations?meta_ads_error=${encodeURIComponent('Missing authorization code from Meta.')}`,
        { replace: true },
      )
      return
    }

    if (!validateOAuthState(state, user.id)) {
      navigate(
        `/account/integrations?meta_ads_error=${encodeURIComponent('Invalid OAuth state. Please try again.')}`,
        { replace: true },
      )
      return
    }

    async function complete() {
      try {
        setMessage('Exchanging authorization code and loading your ad accounts...')
        const { picker } = await exchangeMetaAdsCode(code!, getMetaAdsRedirectUri())
        if (picker.adAccounts.length > 1 || picker.pages.length > 1) {
          storeMetaOAuthPicker(picker)
        }
        navigate('/account/integrations?meta_ads_connected=1', { replace: true })
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Meta authorization failed'
        navigate(`/account/integrations?meta_ads_error=${encodeURIComponent(msg)}`, { replace: true })
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
