import { Link } from 'react-router-dom'
import { useCallback, useEffect, useState } from 'react'
import FormField from '../../components/FormField'
import { GoogleAdsIcon } from '../../components/IntegrationIcons'
import { getDefaultAdCampaignApiUrl } from '../../constants/googleAds'
import { inputClass } from '../../constants/forms'
import {
  disconnectGoogleAds,
  fetchGoogleAdsSettings,
  isGoogleAdsIntegrationConfigured,
  saveGoogleAdsSettings,
  type GoogleAdsSettings,
} from '../../lib/googleAds/settings'

export default function GoogleAdsIntegration() {
  const [settings, setSettings] = useState<GoogleAdsSettings>({
    adCampaignApiUrl: null,
    status: 'disconnected',
    usesDefaultApiUrl: false,
    hasApiUrl: false,
    campaignBrief: null,
  })
  const [apiUrlInput, setApiUrlInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    try {
      const nextSettings = await fetchGoogleAdsSettings()
      setSettings(nextSettings)
      if (nextSettings.adCampaignApiUrl) {
        setApiUrlInput(nextSettings.adCampaignApiUrl)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load Google Ads settings')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()

    const params = new URLSearchParams(window.location.search)
    if (params.get('google_ads_connected') === '1') {
      setSuccess('Google Ads campaign AI URL saved.')
      window.history.replaceState({}, '', '/account/integrations')
      loadData()
    }
  }, [loadData])

  async function handleSave() {
    setWorking(true)
    setError(null)
    setSuccess(null)
    try {
      const nextSettings = await saveGoogleAdsSettings(apiUrlInput)
      setSettings(nextSettings)
      setSuccess('Campaign AI URL saved. You can now draft Google and Meta campaigns.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save Google Ads settings')
    } finally {
      setWorking(false)
    }
  }

  async function handleDisconnect() {
    setWorking(true)
    setError(null)
    setSuccess(null)
    try {
      await disconnectGoogleAds()
      setSettings({
        adCampaignApiUrl: null,
        status: 'disconnected',
        usesDefaultApiUrl: false,
        hasApiUrl: Boolean(getDefaultAdCampaignApiUrl()),
        campaignBrief: null,
      })
      setApiUrlInput('')
      setSuccess('Google Ads settings cleared.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear Google Ads settings')
    } finally {
      setWorking(false)
    }
  }

  const integrationReady = isGoogleAdsIntegrationConfigured(settings)
  const defaultApiUrl = getDefaultAdCampaignApiUrl()

  return (
    <section className="bg-white rounded-2xl border border-navy-900/5 p-8 shadow-sm">
      <div className="flex items-start gap-4 mb-6">
        <div className="w-12 h-12 rounded-xl bg-[#4285F4]/10 flex items-center justify-center shrink-0">
          <GoogleAdsIcon className="w-7 h-7" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-navy-900 mb-1">Ad campaigns</h2>
          <p className="text-sm text-navy-600">
            Connect your ad campaign AI service so Clinty can draft Google Search and Meta campaigns
            for review before publishing paused ads.
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 mb-6">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-xl bg-teal-400/10 border border-teal-400/20 text-teal-700 text-sm px-4 py-3 mb-6">
          {success}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-navy-600">Loading Google Ads settings...</p>
      ) : (
        <div className="space-y-6">
          <div className="rounded-xl bg-cream border border-navy-900/5 p-5 space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-navy-900 mb-1">Ad campaign AI URL</h3>
              <p className="text-sm text-navy-600">
                The base URL of your campaign agent API (the service that drafts Google Search and
                Meta campaigns). Clinty calls{' '}
                <code className="text-xs bg-white px-1 py-0.5 rounded">POST /v1/campaigns</code> on
                this host.
              </p>
            </div>

            {settings.usesDefaultApiUrl && !settings.adCampaignApiUrl && defaultApiUrl && (
              <div className="rounded-lg bg-teal-400/10 border border-teal-400/20 text-teal-700 text-sm px-4 py-3">
                Using the site default campaign AI URL. Save your own URL below to override it for
                this account.
              </div>
            )}

            <FormField label="Campaign AI URL" id="google-ads-api-url">
              <input
                id="google-ads-api-url"
                type="url"
                placeholder="https://your-campaign-agent.example.com:8100"
                value={apiUrlInput}
                onChange={(e) => setApiUrlInput(e.target.value)}
                className={inputClass}
                disabled={working}
              />
            </FormField>

            {!settings.adCampaignApiUrl && !defaultApiUrl && (
              <p className="text-xs text-navy-500">
                For local development, run your campaign agent and use the Vite proxy at{' '}
                <code className="bg-white px-1 py-0.5 rounded">/api/ad-campaigns</code>, or set{' '}
                <code className="bg-white px-1 py-0.5 rounded">VITE_AD_CAMPAIGN_API_URL</code> in
                the site environment.
              </p>
            )}

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleSave}
                disabled={working || !apiUrlInput.trim()}
                className="inline-flex items-center gap-2 bg-[#4285F4] text-white font-medium px-5 py-2.5 rounded-xl hover:bg-[#3367d6] transition-colors text-sm disabled:opacity-60"
              >
                {working ? 'Saving...' : 'Save URL'}
              </button>
              {settings.adCampaignApiUrl && (
                <button
                  type="button"
                  onClick={handleDisconnect}
                  disabled={working}
                  className="inline-flex items-center gap-2 border border-navy-900/15 text-navy-900 font-medium px-5 py-2.5 rounded-xl hover:bg-navy-900/5 transition-colors text-sm disabled:opacity-60"
                >
                  Clear saved URL
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            {integrationReady ? (
              <Link
                to="/account/google-ads"
                className="inline-flex items-center justify-center gap-2 bg-navy-900 text-cream font-medium px-5 py-2.5 rounded-xl hover:bg-navy-800 transition-colors text-sm"
              >
                Open campaign builder
              </Link>
            ) : (
              <p className="text-sm text-navy-600">
                Save a campaign AI URL above before opening the campaign builder.
              </p>
            )}
          </div>
        </div>
      )}
    </section>
  )
}
