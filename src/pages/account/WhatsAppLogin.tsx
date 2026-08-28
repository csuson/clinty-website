import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { WHATSAPP_POLL_MS } from '../../constants/whatsapp'
import { useAuth } from '../../context/AuthContext'
import {
  fetchWhatsAppLoginStatus,
  formatPhone,
  startWhatsAppLogin,
  stopWhatsAppLogin,
} from '../../lib/whatsapp/web'

type Phase = 'starting' | 'pairing' | 'connected' | 'error'

export default function WhatsAppLogin() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [phase, setPhase] = useState<Phase>('starting')
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [phone, setPhone] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const startedRef = useRef(false)

  const pollStatus = useCallback(async () => {
    try {
      const status = await fetchWhatsAppLoginStatus()
      if (status.error) {
        setError(status.error)
        setPhase('error')
        return
      }
      if (status.status === 'connected' && status.phone) {
        setPhone(status.phone)
        setPhase('connected')
        setQrDataUrl(null)
        return
      }
      if (status.qrDataUrl) {
        setQrDataUrl(status.qrDataUrl)
        setPhase('pairing')
      } else if (status.status === 'pairing') {
        setPhase('pairing')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to check login status')
      setPhase('error')
    }
  }, [])

  useEffect(() => {
    if (!user || startedRef.current) return
    startedRef.current = true

    async function begin() {
      try {
        const status = await startWhatsAppLogin()
        if (status.status === 'connected' && status.phone) {
          setPhone(status.phone)
          setPhase('connected')
          return
        }
        if (status.qrDataUrl) {
          setQrDataUrl(status.qrDataUrl)
        }
        setPhase('pairing')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to start WhatsApp login')
        setPhase('error')
      }
    }

    begin()
  }, [user])

  useEffect(() => {
    if (phase !== 'pairing') return

    const timer = window.setInterval(() => {
      pollStatus()
    }, WHATSAPP_POLL_MS)

    return () => window.clearInterval(timer)
  }, [phase, pollStatus])

  useEffect(() => {
    if (phase !== 'connected') return

    const timer = window.setTimeout(() => {
      navigate('/account/integrations?whatsapp_connected=1')
    }, 1500)

    return () => window.clearTimeout(timer)
  }, [phase, navigate])

  async function handleCancel() {
    try {
      await stopWhatsAppLogin()
    } catch {
      // ignore cancel errors
    }
    navigate('/account/integrations')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 text-sm">
        <Link
          to="/account/integrations"
          className="text-navy-600 hover:text-navy-900 transition-colors"
        >
          ← Integrations
        </Link>
      </div>

      <section className="bg-white rounded-2xl border border-navy-900/5 p-8 shadow-sm">
        <div className="flex items-start gap-4 mb-8">
          <div className="w-12 h-12 rounded-xl bg-[#25D366]/10 flex items-center justify-center shrink-0">
            <svg className="w-7 h-7 text-[#25D366]" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-navy-900 mb-1">Link WhatsApp</h2>
            <p className="text-sm text-navy-600">
              Scan the QR code with your phone: WhatsApp → Settings → Linked devices → Link a device.
            </p>
          </div>
        </div>

        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 mb-6">
            {error}
          </div>
        )}

        {phase === 'starting' && (
          <div className="flex flex-col items-center py-12 gap-4">
            <div className="w-10 h-10 border-2 border-navy-900/20 border-t-navy-900 rounded-full animate-spin" />
            <p className="text-sm text-navy-600">Preparing QR code...</p>
          </div>
        )}

        {phase === 'pairing' && (
          <div className="flex flex-col items-center gap-6">
            {qrDataUrl ? (
              <div className="p-4 bg-white border border-navy-900/10 rounded-2xl shadow-sm">
                <img
                  src={qrDataUrl}
                  alt="WhatsApp Web QR code"
                  className="w-64 h-64"
                  width={256}
                  height={256}
                />
              </div>
            ) : (
              <div className="flex flex-col items-center py-8 gap-4">
                <div className="w-10 h-10 border-2 border-navy-900/20 border-t-navy-900 rounded-full animate-spin" />
                <p className="text-sm text-navy-600">Waiting for QR code from gateway...</p>
              </div>
            )}
            <ol className="text-sm text-navy-600 space-y-2 max-w-md">
              <li>1. Open WhatsApp on your phone</li>
              <li>2. Tap Settings → Linked devices → Link a device</li>
              <li>3. Point your camera at the QR code above</li>
            </ol>
            <button
              type="button"
              onClick={handleCancel}
              className="text-sm font-medium text-navy-600 hover:text-navy-900"
            >
              Cancel
            </button>
          </div>
        )}

        {phase === 'connected' && phone && (
          <div className="flex flex-col items-center py-10 gap-4">
            <div className="w-14 h-14 rounded-full bg-teal-400/15 flex items-center justify-center">
              <svg className="w-7 h-7 text-teal-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-lg font-semibold text-navy-900">WhatsApp linked</p>
            <p className="text-sm text-navy-600">{formatPhone(phone)}</p>
            <p className="text-xs text-navy-500">Redirecting to integrations...</p>
          </div>
        )}

        {phase === 'error' && (
          <div className="flex flex-col items-center gap-4 py-6">
            <Link
              to="/account/integrations"
              className="inline-flex items-center gap-2 bg-navy-900 text-cream font-medium px-6 py-3 rounded-xl hover:bg-navy-800 transition-colors text-sm"
            >
              Back to integrations
            </Link>
          </div>
        )}
      </section>

      <section className="bg-white rounded-2xl border border-navy-900/5 p-8 shadow-sm">
        <h3 className="text-sm font-semibold text-navy-900 mb-3">Before you scan</h3>
        <ul className="space-y-2 text-sm text-navy-600">
          <li className="flex items-start gap-2">
            <span className="text-teal-500 mt-0.5">•</span>
            Use a phone number you want Clinty to answer on behalf of.
          </li>
          <li className="flex items-start gap-2">
            <span className="text-teal-500 mt-0.5">•</span>
            Send test messages from another phone — not from the device that scanned the QR.
          </li>
          <li className="flex items-start gap-2">
            <span className="text-teal-500 mt-0.5">•</span>
            WhatsApp Web is unofficial; linking may stop working if WhatsApp changes their protocol.
          </li>
        </ul>
      </section>
    </div>
  )
}
