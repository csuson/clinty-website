import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { getGmailRedirectUri } from '../../constants/gmail'
import { useAuth } from '../../context/AuthContext'
import { exchangeGmailCode, validateOAuthState } from '../../lib/gmail/oauth'

export default function GmailCallback() {
  const { user, loading: authLoading } = useAuth()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [message, setMessage] = useState('Completing Gmail authorization...')

  useEffect(() => {
    if (authLoading) return

    if (!user) {
      navigate('/sign-in', { replace: true })
      return
    }

    const errorParam = searchParams.get('error')
    if (errorParam) {
      navigate(
        `/account/integrations?gmail_error=${encodeURIComponent(errorParam === 'access_denied' ? 'You declined Gmail access.' : errorParam)}`,
        { replace: true },
      )
      return
    }

    const code = searchParams.get('code')
    const state = searchParams.get('state')

    if (!code || !state) {
      navigate(
        `/account/integrations?gmail_error=${encodeURIComponent('Missing authorization code from Google.')}`,
        { replace: true },
      )
      return
    }

    if (!validateOAuthState(state, user.id)) {
      navigate(
        `/account/integrations?gmail_error=${encodeURIComponent('Invalid OAuth state. Please try again.')}`,
        { replace: true },
      )
      return
    }

    async function complete() {
      try {
        setMessage('Exchanging authorization code and storing credentials...')
        await exchangeGmailCode(code!, getGmailRedirectUri())
        navigate('/account/integrations?connected=1', { replace: true })
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Gmail authorization failed'
        navigate(`/account/integrations?gmail_error=${encodeURIComponent(msg)}`, { replace: true })
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
