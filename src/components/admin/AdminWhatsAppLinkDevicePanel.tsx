import { useCallback, useEffect, useState } from 'react'
import FormField from '../FormField'
import { inputClass } from '../../constants/forms'
import { WHATSAPP_POLL_MS } from '../../constants/whatsapp'
import {
  adminWhatsAppLoginDisconnect,
  adminWhatsAppLoginStart,
  adminWhatsAppLoginStatus,
  type AdminWhatsAppLoginStatus,
} from '../../lib/admin'
import type { Profile } from '../../types/database'

type Phase = 'idle' | 'starting' | 'pairing' | 'connected' | 'error'

type AdminWhatsAppLinkDevicePanelProps = {
  users: Profile[]
  onChanged?: () => void
}

export default function AdminWhatsAppLinkDevicePanel({
  users,
  onChanged,
}: AdminWhatsAppLinkDevicePanelProps) {
  const [userId, setUserId] = useState('')
  const [phase, setPhase] = useState<Phase>('idle')
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [phone, setPhone] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [working, setWorking] = useState(false)

  const applyStatus = useCallback((status: AdminWhatsAppLoginStatus) => {
    if (status.error || status.status === 'error') {
      setError(status.error ?? 'Couldn’t link device')
      setPhase('error')
      setQrDataUrl(null)
      return
    }
    if (status.status === 'connected') {
      setPhase('connected')
      setQrDataUrl(null)
      setPhone(status.phone)
      onChanged?.()
      return
    }
    if (status.qrDataUrl) {
      setQrDataUrl(status.qrDataUrl)
    }
    if (status.phone) setPhone(status.phone)
    setPhase('pairing')
  }, [onChanged])

  useEffect(() => {
    if (phase !== 'pairing' || !userId) return

    const timer = window.setInterval(() => {
      void adminWhatsAppLoginStatus(userId)
        .then(applyStatus)
        .catch((err) => {
          setError(err instanceof Error ? err.message : 'Failed to check link status')
          setPhase('error')
        })
    }, WHATSAPP_POLL_MS)

    return () => window.clearInterval(timer)
  }, [phase, userId, applyStatus])

  async function handleStart() {
    if (!userId) return
    setWorking(true)
    setError(null)
    setQrDataUrl(null)
    setPhone(null)
    setPhase('starting')
    try {
      const status = await adminWhatsAppLoginStart(userId)
      applyStatus(status)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start WhatsApp link')
      setPhase('error')
    } finally {
      setWorking(false)
    }
  }

  async function handleDisconnect() {
    if (!userId) return
    setWorking(true)
    setError(null)
    try {
      await adminWhatsAppLoginDisconnect(userId)
      setPhase('idle')
      setQrDataUrl(null)
      setPhone(null)
      onChanged?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disconnect WhatsApp')
      setPhase('error')
    } finally {
      setWorking(false)
    }
  }

  return (
    <div className="px-6 py-5 border-b border-navy-900/5 space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-navy-900">Link a device</h3>
        <p className="text-sm text-navy-600 mt-1">
          Start a QR session for a user so they can link WhatsApp (Settings → Linked devices).
        </p>
      </div>

      <FormField label="User" id="admin-whatsapp-link-user">
        <select
          id="admin-whatsapp-link-user"
          className={inputClass}
          value={userId}
          onChange={(e) => {
            setUserId(e.target.value)
            setPhase('idle')
            setQrDataUrl(null)
            setPhone(null)
            setError(null)
          }}
          disabled={working || phase === 'pairing' || phase === 'starting'}
        >
          <option value="">Select a user…</option>
          {users.map((user) => (
            <option key={user.id} value={user.id}>
              {user.email || user.id}
            </option>
          ))}
        </select>
      </FormField>

      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      {phase === 'connected' ? (
        <p className="text-sm text-emerald-800">
          Device linked{phone ? ` (${phone})` : ''}.
        </p>
      ) : null}

      {qrDataUrl ? (
        <div className="flex flex-col sm:flex-row gap-4 items-start">
          <img
            src={qrDataUrl}
            alt="WhatsApp Web QR code"
            className="w-48 h-48 rounded-xl border border-navy-900/10 bg-white p-2"
          />
          <ol className="text-sm text-navy-600 space-y-1 list-decimal list-inside">
            <li>Open WhatsApp on the user’s phone</li>
            <li>Tap Settings → Linked devices → Link a device</li>
            <li>Scan this QR code</li>
          </ol>
        </div>
      ) : phase === 'pairing' || phase === 'starting' ? (
        <p className="text-sm text-navy-600">Waiting for QR code from gateway…</p>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => void handleStart()}
          disabled={!userId || working}
          className="inline-flex items-center text-sm font-medium bg-[#25D366] text-white px-4 py-2 rounded-lg hover:bg-[#20bd5a] transition-colors disabled:opacity-60"
        >
          {working && (phase === 'starting' || phase === 'pairing')
            ? 'Starting…'
            : phase === 'connected'
              ? 'Re-link device'
              : 'Start QR link'}
        </button>
        {userId ? (
          <button
            type="button"
            onClick={() => void handleDisconnect()}
            disabled={working}
            className="inline-flex items-center text-sm font-medium border border-navy-900/15 text-navy-800 px-4 py-2 rounded-lg hover:bg-navy-50 transition-colors disabled:opacity-60"
          >
            Disconnect device
          </button>
        ) : null}
      </div>
    </div>
  )
}
