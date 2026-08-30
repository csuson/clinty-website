import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { exchangeShopifyCode, validateOAuthState } from '../../lib/shopify/oauth'

export default function ShopifyCallback() {
  const { user, loading: authLoading } = useAuth()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [message, setMessage] = useState('Completing Shopify authorization...')

  useEffect(() => {
    if (authLoading) return

    if (!user) {
      navigate('/sign-in', { replace: true })
      return
    }

    const code = searchParams.get('code')
    const shop = searchParams.get('shop')
    const state = searchParams.get('state')
    const hmac = searchParams.get('hmac')
    const timestamp = searchParams.get('timestamp')
    const host = searchParams.get('host')

    if (!code || !shop || !state || !hmac || !timestamp) {
      navigate(
        `/account/integrations?shopify_error=${encodeURIComponent('Missing authorization data from Shopify.')}`,
        { replace: true },
      )
      return
    }

    const authCode = code
    const shopDomain = shop
    const authHmac = hmac
    const authTimestamp = timestamp
    const authHost = host

    if (!validateOAuthState(state, user.id, shopDomain)) {
      navigate(
        `/account/integrations?shopify_error=${encodeURIComponent('Invalid OAuth state. Please try again.')}`,
        { replace: true },
      )
      return
    }

    async function complete() {
      try {
        setMessage('Exchanging authorization code and storing credentials...')
        await exchangeShopifyCode(authCode, {
          code: authCode,
          shop: shopDomain,
          hmac: authHmac,
          timestamp: authTimestamp,
          host: authHost ?? undefined,
        })
        navigate('/account/integrations?shopify_connected=1', { replace: true })
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Shopify authorization failed'
        navigate(`/account/integrations?shopify_error=${encodeURIComponent(msg)}`, { replace: true })
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
