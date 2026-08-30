import { Link } from 'react-router-dom'
import { useCallback, useEffect, useState } from 'react'
import FormField from '../../components/FormField'
import { WHATSAPP_LOGIN_PATH } from '../../constants/whatsapp'
import { inputClass } from '../../constants/forms'
import { useAuth } from '../../context/AuthContext'
import {
  disconnectWhatsApp,
  fetchWhatsAppConnection,
  fetchWhatsAppGatewaySettings,
  formatPhone,
  isWhatsAppGatewayConfigured,
  saveWhatsAppGateway,
  type WhatsAppConnection,
  type WhatsAppGatewaySettings,
} from '../../lib/whatsapp/web'

export default function WhatsAppIntegration() {
  const { user } = useAuth()
  const [connection, setConnection] = useState<WhatsAppConnection | null>(null)
  const [gatewaySettings, setGatewaySettings] = useState<WhatsAppGatewaySettings>({
    gatewayUrl: null,
    hasApiKey: false,
  })
  const [gatewayUrlInput, setGatewayUrlInput] = useState('')
  const [gatewayApiKeyInput, setGatewayApiKeyInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState(false)
  const [savingGateway, setSavingGateway] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    if (!user) {
      setLoading(false)
      return
    }

    try {
      const [connectionData, settings] = await Promise.all([
        fetchWhatsAppConnection(user.id),
        fetchWhatsAppGatewaySettings(),
      ])
      setConnection(connectionData?.status === 'connected' ? connectionData : null)
      setGatewaySettings(settings)
      if (settings.gatewayUrl) {
        setGatewayUrlInput(settings.gatewayUrl)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load WhatsApp settings')
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    loadData()

    const params = new URLSearchParams(window.location.search)
    if (params.get('whatsapp_connected') === '1') {
      setSuccess('WhatsApp linked successfully. Your AI agent can now receive and reply to messages.')
      window.history.replaceState({}, '', '/account/integrations')
      loadData()
    }
  }, [loadData])

  async function handleSaveGateway() {
    setSavingGateway(true)
    setError(null)
    setSuccess(null)
    try {
      const settings = await saveWhatsAppGateway(
        gatewayUrlInput,
        gatewayApiKeyInput.trim() || undefined,
      )
      setGatewaySettings(settings)
      setGatewayApiKeyInput('')
      setSuccess('WhatsApp gateway saved. You can now link your device.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save WhatsApp gateway')
    } finally {
      setSavingGateway(false)
    }
  }

  async function handleDisconnect() {
    setWorking(true)
    setError(null)
    setSuccess(null)
    try {
      await disconnectWhatsApp()
      setConnection(null)
      setSuccess('WhatsApp disconnected.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disconnect WhatsApp')
    } finally {
      setWorking(false)
    }
  }

  const gatewayReady = isWhatsAppGatewayConfigured(gatewaySettings)

  return (
    <div className="space-y-6">
      <section className="bg-white rounded-2xl border border-navy-900/5 p-8 shadow-sm">
        <div className="flex items-start gap-4 mb-6">
          <div className="w-12 h-12 rounded-xl bg-[#25D366]/10 flex items-center justify-center shrink-0">
            <svg className="w-7 h-7 text-[#25D366]" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-navy-900 mb-1">WhatsApp</h2>
            <p className="text-sm text-navy-600">
              Connect your own WhatsApp Web gateway, then link your number via QR code so Clinty can
              read and reply to customer messages.
            </p>
          </div>
        </div>

        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 mb-6">
            {error}
          </div>
        )}

        {success && (
          <div className="rounded-xl bg-teal-400/10 border border-teal-400/20 text-teal-600 text-sm px-4 py-3 mb-6">
            {success}
          </div>
        )}

        {loading ? (
          <p className="text-sm text-navy-600">Loading WhatsApp settings...</p>
        ) : (
          <div className="space-y-6">
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-navy-900 mb-1">Your WhatsApp gateway</h3>
                <p className="text-sm text-navy-600 mb-4">
                  Each account uses its own Baileys gateway. The URL must be reachable from Supabase
                  (HTTPS via VPS or Cloudflare Tunnel recommended).
                </p>
              </div>

              <FormField label="Gateway URL" id="whatsapp-gateway-url">
                <input
                  id="whatsapp-gateway-url"
                  type="url"
                  placeholder="https://your-gateway.example.com:8787"
                  value={gatewayUrlInput}
                  onChange={(e) => setGatewayUrlInput(e.target.value)}
                  className={inputClass}
                  disabled={savingGateway}
                />
              </FormField>

              <FormField label="Gateway API key" id="whatsapp-gateway-api-key">
                {gatewaySettings.hasApiKey && (
                  <p className="text-xs text-navy-500 mb-2">
                    Leave blank to keep your saved API key.
                  </p>
                )}
                <input
                  id="whatsapp-gateway-api-key"
                  type="password"
                  placeholder={gatewaySettings.hasApiKey ? '••••••••••••••••' : 'clinty_sk_...'}
                  value={gatewayApiKeyInput}
                  onChange={(e) => setGatewayApiKeyInput(e.target.value)}
                  className={inputClass}
                  disabled={savingGateway}
                  autoComplete="off"
                />
              </FormField>
              {!gatewaySettings.hasApiKey && (
                <p className="text-xs text-navy-500 -mt-2">
                  Same key configured on your gateway (X-Api-Key header).
                </p>
              )}

              <button
                type="button"
                onClick={handleSaveGateway}
                disabled={
                  savingGateway ||
                  !gatewayUrlInput.trim() ||
                  (!gatewaySettings.hasApiKey && !gatewayApiKeyInput.trim())
                }
                className="inline-flex items-center gap-2 bg-navy-900 text-cream font-medium px-5 py-2.5 rounded-xl hover:bg-navy-800 transition-colors text-sm disabled:opacity-60"
              >
                {savingGateway ? 'Saving...' : 'Save gateway'}
              </button>
            </div>

            {connection ? (
              <div className="space-y-4 pt-2 border-t border-navy-900/5">
                <div className="bg-cream rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="w-2 h-2 rounded-full bg-teal-400" />
                    <span className="text-sm font-semibold text-navy-900">Connected</span>
                  </div>
                  <dl className="grid sm:grid-cols-2 gap-4 text-sm">
                    <div>
                      <dt className="text-navy-600 mb-1">Phone number</dt>
                      <dd className="font-medium text-navy-900">
                        {connection.phone ? formatPhone(connection.phone) : '—'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-navy-600 mb-1">Linked</dt>
                      <dd className="font-medium text-navy-900">
                        {new Date(connection.connected_at).toLocaleDateString('en-US', {
                          month: 'long',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </dd>
                    </div>
                    <div className="sm:col-span-2">
                      <dt className="text-navy-600 mb-1">Gateway</dt>
                      <dd className="font-medium text-navy-900 break-all">
                        {gatewaySettings.gatewayUrl ?? connection.gateway_url ?? '—'}
                      </dd>
                    </div>
                  </dl>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Link
                    to={WHATSAPP_LOGIN_PATH}
                    className="inline-flex items-center justify-center gap-2 border border-navy-900/15 text-navy-900 font-medium px-5 py-2.5 rounded-xl hover:bg-navy-900/5 transition-colors text-sm"
                  >
                    Re-link device
                  </Link>
                  <button
                    onClick={handleDisconnect}
                    disabled={working}
                    className="text-sm font-medium text-red-600 hover:text-red-700 disabled:opacity-60 self-center sm:self-auto"
                  >
                    {working ? 'Working...' : 'Disconnect WhatsApp'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4 pt-2 border-t border-navy-900/5">
                <p className="text-sm text-navy-600">
                  After saving your gateway, open the link page to scan a QR code with WhatsApp →
                  Linked devices on your phone.
                </p>
                {gatewayReady ? (
                  <Link
                    to={WHATSAPP_LOGIN_PATH}
                    className="inline-flex items-center gap-2 bg-[#25D366] text-white font-medium px-6 py-3 rounded-xl hover:bg-[#20bd5a] transition-colors"
                  >
                    Link WhatsApp
                  </Link>
                ) : (
                  <button
                    type="button"
                    disabled
                    className="inline-flex items-center gap-2 bg-[#25D366] text-white font-medium px-6 py-3 rounded-xl opacity-60 cursor-not-allowed"
                  >
                    Link WhatsApp
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </section>

      <section className="bg-white rounded-2xl border border-navy-900/5 p-8 shadow-sm">
        <h3 className="text-sm font-semibold text-navy-900 mb-3">Gateway requirements</h3>
        <ul className="space-y-2 text-sm text-navy-600">
          <li className="flex items-start gap-2">
            <span className="text-teal-500 mt-0.5">•</span>
            Run a Clinty-compatible Baileys gateway on your own server or machine.
          </li>
          <li className="flex items-start gap-2">
            <span className="text-teal-500 mt-0.5">•</span>
            Expose it on a public HTTPS URL — home IPs often block Supabase cloud requests.
          </li>
          <li className="flex items-start gap-2">
            <span className="text-teal-500 mt-0.5">•</span>
            Use the same API key on the gateway and in the field above.
          </li>
        </ul>
      </section>
    </div>
  )
}
