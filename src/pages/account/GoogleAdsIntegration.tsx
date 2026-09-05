import { Link } from 'react-router-dom'
import { useCallback, useEffect, useState } from 'react'
import FormField from '../../components/FormField'
import IntegrationPanel, { type IntegrationStatusKind } from '../../components/IntegrationPanel'
import { SecretInput } from '../../components/SecretField'
import { GoogleAdsIcon } from '../../components/IntegrationIcons'
import {
  emptyFacebookCredentialForm,
  emptyGoogleAdsCredentialForm,
  emptyRedditCredentialForm,
  emptyYelpCredentialForm,
  type FacebookCredentialForm,
  type GoogleAdsCredentialForm,
  type RedditCredentialForm,
  type YelpCredentialForm,
} from '../../constants/adPlatformCredentials'
import { isGoogleAdsOAuthConfigured } from '../../constants/googleAdsOAuth'
import { isMetaAdsOAuthConfigured } from '../../constants/metaAds'
import { getDefaultAdCampaignApiUrl } from '../../constants/googleAds'
import { inputClass } from '../../constants/forms'
import { useAuth } from '../../context/AuthContext'
import {
  clearPlatformCredentials,
  savePlatformCredentials,
  type PlatformCredentialsStatus,
} from '../../lib/googleAds/credentials'
import {
  listGoogleAdsCustomers,
  startGoogleAdsOAuth,
  type GoogleAdsCustomerOption,
} from '../../lib/googleAds/oauth'
import {
  disconnectGoogleAds,
  emptyGoogleAdsSettings,
  fetchGoogleAdsSettings,
  isGoogleAdsIntegrationConfigured,
  saveGoogleAdsSettings,
  type GoogleAdsSettings,
} from '../../lib/googleAds/settings'
import {
  readMetaOAuthPicker,
  startMetaAdsOAuth,
  type MetaAdAccountOption,
  type MetaOAuthPickerData,
  type MetaPageOption,
} from '../../lib/metaAds/oauth'

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? ''
const metaAppId = import.meta.env.VITE_META_APP_ID ?? ''

type GoogleAdsIntegrationProps = {
  expanded: boolean
  onToggle: () => void
}

function ConfigBadge({ configured }: { configured: boolean }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
        configured
          ? 'bg-teal-400/15 text-teal-700'
          : 'bg-navy-900/5 text-navy-600'
      }`}
    >
      {configured ? 'Ready to publish' : 'Not configured'}
    </span>
  )
}

export default function GoogleAdsIntegration({ expanded, onToggle }: GoogleAdsIntegrationProps) {
  const { user } = useAuth()
  const [settings, setSettings] = useState<GoogleAdsSettings>(emptyGoogleAdsSettings())
  const [apiUrlInput, setApiUrlInput] = useState('')
  const [googleForm, setGoogleForm] = useState<GoogleAdsCredentialForm>(emptyGoogleAdsCredentialForm())
  const [facebookForm, setFacebookForm] = useState<FacebookCredentialForm>(emptyFacebookCredentialForm())
  const [yelpForm, setYelpForm] = useState<YelpCredentialForm>(emptyYelpCredentialForm())
  const [redditForm, setRedditForm] = useState<RedditCredentialForm>(emptyRedditCredentialForm())
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState(false)
  const [savingPlatform, setSavingPlatform] = useState<'google' | 'facebook' | 'yelp' | 'reddit' | null>(null)
  const [lookingUpCustomers, setLookingUpCustomers] = useState(false)
  const [googleCustomers, setGoogleCustomers] = useState<GoogleAdsCustomerOption[]>([])
  const [metaPicker, setMetaPicker] = useState<MetaOAuthPickerData | null>(null)
  const [showGoogleAdvanced, setShowGoogleAdvanced] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  function applyCredentialStatus(status: PlatformCredentialsStatus) {
    setSettings((current) => ({ ...current, platformCredentials: status }))
    setGoogleForm((current) => ({
      ...current,
      clientId: status.google.clientId,
      customerId: status.google.customerId,
      loginCustomerId: status.google.loginCustomerId,
      useProtoPlus: status.google.useProtoPlus,
      clientSecret: '',
      refreshToken: '',
    }))
    setFacebookForm((current) => ({
      ...current,
      adAccountId: status.facebook.adAccountId,
      pageId: status.facebook.pageId,
      pixelId: status.facebook.pixelId,
      accessToken: '',
    }))
    setYelpForm((current) => ({
      ...current,
      username: status.yelp.username,
      businessId: status.yelp.businessId,
      apiBase: status.yelp.apiBase,
      password: '',
    }))
    setRedditForm((current) => ({
      ...current,
      adAccountId: status.reddit.adAccountId,
      pixelId: status.reddit.pixelId,
      accessToken: '',
    }))
  }

  const loadData = useCallback(async () => {
    try {
      const nextSettings = await fetchGoogleAdsSettings()
      setSettings(nextSettings)
      if (nextSettings.adCampaignApiUrl) {
        setApiUrlInput(nextSettings.adCampaignApiUrl)
      }
      applyCredentialStatus(nextSettings.platformCredentials)
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
    if (params.get('google_ads_oauth_connected') === '1') {
      setSuccess('Google Ads OAuth connected. Add your customer ID, then save.')
      window.history.replaceState({}, '', '/account/integrations')
      loadData()
    }
    if (params.get('meta_ads_connected') === '1') {
      const picker = readMetaOAuthPicker()
      if (picker) setMetaPicker(picker)
      setSuccess('Meta connected. Choose your ad account and page below, then save.')
      window.history.replaceState({}, '', '/account/integrations')
      loadData()
    }
    if (params.get('google_ads_oauth_error')) {
      setError(decodeURIComponent(params.get('google_ads_oauth_error') ?? 'Google Ads connection failed'))
      window.history.replaceState({}, '', '/account/integrations')
    }
    if (params.get('meta_ads_error')) {
      setError(decodeURIComponent(params.get('meta_ads_error') ?? 'Meta connection failed'))
      window.history.replaceState({}, '', '/account/integrations')
    }
  }, [loadData])

  async function handleLookupGoogleCustomers() {
    setLookingUpCustomers(true)
    setError(null)
    try {
      const customers = await listGoogleAdsCustomers()
      setGoogleCustomers(customers)
      if (customers.length === 0) {
        setError('No accessible Google Ads customer IDs found for this account.')
      } else if (customers.length === 1) {
        setGoogleForm((current) => ({ ...current, customerId: customers[0].formatted }))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to look up Google Ads customer IDs')
    } finally {
      setLookingUpCustomers(false)
    }
  }

  function handleConnectGoogleAds() {
    if (!user || !googleClientId) return
    setError(null)
    startGoogleAdsOAuth(user.id, googleClientId)
  }

  function handleConnectMeta() {
    if (!user || !metaAppId) return
    setError(null)
    startMetaAdsOAuth(user.id, metaAppId)
  }

  function handleSelectMetaAdAccount(account: MetaAdAccountOption) {
    setFacebookForm((current) => ({ ...current, adAccountId: account.accountId }))
  }

  function handleSelectMetaPage(page: MetaPageOption) {
    setFacebookForm((current) => ({ ...current, pageId: page.id }))
  }

  async function handleSaveUrl() {
    setWorking(true)
    setError(null)
    setSuccess(null)
    try {
      const nextSettings = await saveGoogleAdsSettings(apiUrlInput)
      setSettings((current) => ({ ...current, ...nextSettings }))
      setSuccess('Campaign AI URL saved.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save Google Ads settings')
    } finally {
      setWorking(false)
    }
  }

  async function handleSaveGoogleCredentials() {
    setSavingPlatform('google')
    setError(null)
    setSuccess(null)
    try {
      const status = await savePlatformCredentials({ google: googleForm })
      applyCredentialStatus(status)
      setSuccess('Google Ads publish credentials saved.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save Google Ads credentials')
    } finally {
      setSavingPlatform(null)
    }
  }

  async function handleSaveFacebookCredentials() {
    setSavingPlatform('facebook')
    setError(null)
    setSuccess(null)
    try {
      const status = await savePlatformCredentials({ facebook: facebookForm })
      applyCredentialStatus(status)
      setSuccess('Meta publish credentials saved.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save Meta credentials')
    } finally {
      setSavingPlatform(null)
    }
  }

  async function handleSaveYelpCredentials() {
    setSavingPlatform('yelp')
    setError(null)
    setSuccess(null)
    try {
      const status = await savePlatformCredentials({ yelp: yelpForm })
      applyCredentialStatus(status)
      setSuccess('Yelp publish credentials saved.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save Yelp credentials')
    } finally {
      setSavingPlatform(null)
    }
  }

  async function handleSaveRedditCredentials() {
    setSavingPlatform('reddit')
    setError(null)
    setSuccess(null)
    try {
      const status = await savePlatformCredentials({ reddit: redditForm })
      applyCredentialStatus(status)
      setSuccess('Reddit Ads publish credentials saved.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save Reddit credentials')
    } finally {
      setSavingPlatform(null)
    }
  }

  async function handleClearCredentials(platform: 'google' | 'facebook' | 'yelp' | 'reddit') {
    setSavingPlatform(platform)
    setError(null)
    setSuccess(null)
    try {
      const status = await clearPlatformCredentials(platform)
      applyCredentialStatus(status)
      const label = platform === 'facebook'
        ? 'Meta'
        : platform === 'google'
          ? 'Google Ads'
          : platform === 'reddit'
            ? 'Reddit'
            : 'Yelp'
      setSuccess(`${label} credentials cleared.`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear credentials')
    } finally {
      setSavingPlatform(null)
    }
  }

  async function handleDisconnect() {
    setWorking(true)
    setError(null)
    setSuccess(null)
    try {
      await disconnectGoogleAds()
      setSettings(await fetchGoogleAdsSettings())
      setApiUrlInput('')
      setGoogleForm(emptyGoogleAdsCredentialForm())
      setFacebookForm(emptyFacebookCredentialForm())
      setYelpForm(emptyYelpCredentialForm())
      setRedditForm(emptyRedditCredentialForm())
      setSuccess('Ad campaign settings cleared.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear Google Ads settings')
    } finally {
      setWorking(false)
    }
  }

  const integrationReady = isGoogleAdsIntegrationConfigured(settings)
  const defaultApiUrl = settings.defaultAdCampaignApiUrl || getDefaultAdCampaignApiUrl()
  const creds = settings.platformCredentials
  const googleOAuthConfigured = isGoogleAdsOAuthConfigured()
  const metaOAuthConfigured = isMetaAdsOAuthConfigured()
  const googleOAuthConnected = creds.google.hasRefreshToken && creds.google.hasClientSecret
  const metaOAuthConnected = creds.facebook.hasAccessToken
  const needsMetaPicker = Boolean(
    metaPicker
      && (metaPicker.adAccounts.length > 1 || metaPicker.pages.length > 1),
  )

  const publishReady = creds.google.configured || creds.facebook.configured || creds.yelp.configured || creds.reddit.configured

  let panelStatus: IntegrationStatusKind = 'disconnected'
  let panelStatusLabel = 'Not configured'
  if (loading) {
    panelStatus = 'loading'
    panelStatusLabel = 'Checking…'
  } else if (publishReady) {
    panelStatus = 'connected'
    panelStatusLabel = 'Ready to publish'
  } else if (integrationReady) {
    panelStatus = 'partial'
    panelStatusLabel = 'Setup in progress'
  }

  return (
    <IntegrationPanel
      title="Ad campaigns"
      icon={<GoogleAdsIcon className="w-7 h-7" />}
      iconWrapperClassName="bg-[#4285F4]/10"
      status={panelStatus}
      statusLabel={panelStatusLabel}
      expanded={expanded}
      onToggle={onToggle}
    >
      <p className="text-sm text-navy-600 mb-6">
        Connect your campaign AI service and ad platform credentials so Clinty can draft campaigns
        and publish paused ads to Google Ads, Meta, Yelp, and Reddit after you approve.
      </p>

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
        <p className="text-sm text-navy-600">Loading ad campaign settings...</p>
      ) : (
        <div className="space-y-6">
          <div className="rounded-xl bg-cream border border-navy-900/5 p-5 space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-navy-900 mb-1">Ad campaign AI URL</h3>
              <p className="text-sm text-navy-600">
                Optional override. Every Clinty account uses the shared campaign agent unless you
                paste a different URL. Clinty calls{' '}
                <code className="text-xs bg-white px-1 py-0.5 rounded">POST /v1/campaigns</code> here
                to draft ads.
              </p>
            </div>

            {settings.usesDefaultApiUrl && !settings.adCampaignApiUrl && defaultApiUrl && (
              <div className="rounded-lg bg-teal-400/10 border border-teal-400/20 text-teal-700 text-sm px-4 py-3">
                Using the shared Clinty campaign agent. You do not need to paste a URL.
              </div>
            )}

            <FormField label="Campaign AI URL" id="google-ads-api-url">
              <input
                id="google-ads-api-url"
                type="url"
                placeholder="Leave blank to use the shared Clinty agent"
                value={apiUrlInput}
                onChange={(e) => setApiUrlInput(e.target.value)}
                className={inputClass}
                disabled={working}
              />
            </FormField>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleSaveUrl}
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
                  Clear all settings
                </button>
              )}
            </div>
          </div>

          <div className="rounded-xl bg-cream border border-navy-900/5 p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold text-navy-900 mb-1">Google Ads publish credentials</h3>
                <p className="text-sm text-navy-600">
                  Connect with Google for OAuth, then add your customer ID. Campaigns are created paused.
                </p>
              </div>
              <ConfigBadge configured={creds.google.configured} />
            </div>

            {!creds.google.hasDeveloperToken && (
              <div className="rounded-lg bg-amber-400/10 border border-amber-400/20 text-sm px-4 py-3 space-y-1">
                <p className="font-medium text-navy-900">Google Ads developer token not configured</p>
                <p className="text-navy-600">
                  Clinty uses a shared developer token for Google Ads API access. Set{' '}
                  <code className="text-xs bg-white px-1 py-0.5 rounded">GOOGLE_ADS_DEVELOPER_TOKEN</code> in Supabase Edge Function secrets.
                </p>
              </div>
            )}

            {!googleOAuthConfigured && (
              <div className="rounded-lg bg-amber-400/10 border border-amber-400/20 text-sm px-4 py-3 space-y-1">
                <p className="font-medium text-navy-900">Google OAuth not configured</p>
                <p className="text-navy-600">
                  Add <code className="text-xs bg-white px-1 py-0.5 rounded">VITE_GOOGLE_CLIENT_ID</code> and register redirect URI{' '}
                  <code className="text-xs bg-white px-1 py-0.5 rounded">/account/integrations/google-ads/callback</code> in Google Cloud Console.
                </p>
              </div>
            )}

            {googleOAuthConnected && (
              <div className="rounded-lg bg-teal-400/10 border border-teal-400/20 text-teal-700 text-sm px-4 py-3">
                Google Ads OAuth connected{creds.google.clientId ? ` (${creds.google.clientId})` : ''}.
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleConnectGoogleAds}
                disabled={!googleOAuthConfigured || savingPlatform !== null}
                className="inline-flex items-center gap-2 bg-[#4285F4] text-white font-medium px-5 py-2.5 rounded-xl hover:bg-[#3367d6] transition-colors text-sm disabled:opacity-60"
              >
                {googleOAuthConnected ? 'Reconnect Google Ads' : 'Connect Google Ads'}
              </button>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <FormField label="Customer ID" id="google-customer-id">
                {googleCustomers.length > 1 ? (
                  <select
                    id="google-customer-id"
                    value={googleForm.customerId}
                    onChange={(e) => setGoogleForm((c) => ({ ...c, customerId: e.target.value }))}
                    className={inputClass}
                    disabled={savingPlatform === 'google'}
                  >
                    <option value="">Select a customer ID</option>
                    {googleCustomers.map((customer) => (
                      <option key={customer.id} value={customer.formatted}>
                        {customer.formatted}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    id="google-customer-id"
                    value={googleForm.customerId}
                    onChange={(e) => setGoogleForm((c) => ({ ...c, customerId: e.target.value }))}
                    className={inputClass}
                    placeholder="123-456-7890"
                    disabled={savingPlatform === 'google'}
                  />
                )}
              </FormField>
              <FormField label="Login customer ID (MCC, optional)" id="google-login-customer-id">
                <input
                  id="google-login-customer-id"
                  value={googleForm.loginCustomerId}
                  onChange={(e) => setGoogleForm((c) => ({ ...c, loginCustomerId: e.target.value }))}
                  className={inputClass}
                  disabled={savingPlatform === 'google'}
                />
              </FormField>
            </div>

            {googleOAuthConnected && (
              <button
                type="button"
                onClick={() => setShowGoogleAdvanced((current) => !current)}
                className="text-sm text-navy-600 hover:text-navy-900 underline"
              >
                {showGoogleAdvanced ? 'Hide advanced OAuth fields' : 'Show advanced OAuth fields'}
              </button>
            )}

            {(showGoogleAdvanced || !googleOAuthConnected) && (
              <div className="grid sm:grid-cols-2 gap-4">
                <FormField label="OAuth client ID" id="google-client-id">
                  <input
                    id="google-client-id"
                    value={googleForm.clientId}
                    onChange={(e) => setGoogleForm((c) => ({ ...c, clientId: e.target.value }))}
                    className={inputClass}
                    disabled={savingPlatform === 'google'}
                    placeholder={creds.google.clientId || undefined}
                  />
                </FormField>
                <FormField label="OAuth client secret" id="google-client-secret">
                  <SecretInput
                    id="google-client-secret"
                    value={googleForm.clientSecret}
                    onChange={(value) => setGoogleForm((c) => ({ ...c, clientSecret: value }))}
                    className={inputClass}
                    disabled={savingPlatform === 'google'}
                    placeholder={creds.google.hasClientSecret ? 'Saved — leave blank to keep' : ''}
                  />
                </FormField>
                <FormField label="OAuth refresh token" id="google-refresh-token">
                  <SecretInput
                    id="google-refresh-token"
                    value={googleForm.refreshToken}
                    onChange={(value) => setGoogleForm((c) => ({ ...c, refreshToken: value }))}
                    className={inputClass}
                    disabled={savingPlatform === 'google'}
                    placeholder={creds.google.hasRefreshToken ? 'Saved — leave blank to keep' : ''}
                  />
                </FormField>
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleSaveGoogleCredentials}
                disabled={savingPlatform !== null}
                className="bg-navy-900 text-cream font-medium px-5 py-2.5 rounded-xl hover:bg-navy-800 transition-colors text-sm disabled:opacity-60"
              >
                {savingPlatform === 'google' ? 'Saving…' : 'Save Google credentials'}
              </button>
              {googleOAuthConnected && creds.google.hasDeveloperToken && (
                <button
                  type="button"
                  onClick={handleLookupGoogleCustomers}
                  disabled={savingPlatform !== null || lookingUpCustomers}
                  className="border border-navy-900/15 text-navy-900 font-medium px-5 py-2.5 rounded-xl hover:bg-navy-900/5 transition-colors text-sm disabled:opacity-60"
                >
                  {lookingUpCustomers ? 'Looking up…' : 'Look up customer IDs'}
                </button>
              )}
              {creds.google.configured && (
                <button
                  type="button"
                  onClick={() => handleClearCredentials('google')}
                  disabled={savingPlatform !== null}
                  className="border border-navy-900/15 text-navy-900 font-medium px-5 py-2.5 rounded-xl hover:bg-navy-900/5 transition-colors text-sm disabled:opacity-60"
                >
                  Clear Google
                </button>
              )}
            </div>
          </div>

          <div className="rounded-xl bg-cream border border-navy-900/5 p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold text-navy-900 mb-1">Meta publish credentials</h3>
                <p className="text-sm text-navy-600">
                  Connect with Meta to authorize ad account access. Campaigns are created paused.
                </p>
              </div>
              <ConfigBadge configured={creds.facebook.configured} />
            </div>

            {!metaOAuthConfigured && (
              <div className="rounded-lg bg-amber-400/10 border border-amber-400/20 text-sm px-4 py-3 space-y-1">
                <p className="font-medium text-navy-900">Meta OAuth not configured</p>
                <p className="text-navy-600">
                  Add <code className="text-xs bg-white px-1 py-0.5 rounded">VITE_META_APP_ID</code>, set{' '}
                  <code className="text-xs bg-white px-1 py-0.5 rounded">META_APP_SECRET</code> in Supabase, and register redirect URI{' '}
                  <code className="text-xs bg-white px-1 py-0.5 rounded">/account/integrations/meta/callback</code>.
                </p>
              </div>
            )}

            {metaOAuthConnected && (
              <div className="rounded-lg bg-teal-400/10 border border-teal-400/20 text-teal-700 text-sm px-4 py-3">
                Meta OAuth connected. Select your ad account and page, then save.
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleConnectMeta}
                disabled={!metaOAuthConfigured || savingPlatform !== null}
                className="inline-flex items-center gap-2 bg-[#1877F2] text-white font-medium px-5 py-2.5 rounded-xl hover:bg-[#166fe0] transition-colors text-sm disabled:opacity-60"
              >
                {metaOAuthConnected ? 'Reconnect Meta' : 'Connect Meta'}
              </button>
            </div>

            {needsMetaPicker && metaPicker && (
              <div className="grid sm:grid-cols-2 gap-4">
                {metaPicker.adAccounts.length > 1 && (
                  <FormField label="Ad account" id="meta-ad-account-picker">
                    <select
                      id="meta-ad-account-picker"
                      value={facebookForm.adAccountId}
                      onChange={(e) => {
                        const account = metaPicker.adAccounts.find((row) => row.accountId === e.target.value)
                        if (account) handleSelectMetaAdAccount(account)
                      }}
                      className={inputClass}
                      disabled={savingPlatform === 'facebook'}
                    >
                      <option value="">Select an ad account</option>
                      {metaPicker.adAccounts.map((account) => (
                        <option key={account.id} value={account.accountId}>
                          {account.name} ({account.accountId})
                        </option>
                      ))}
                    </select>
                  </FormField>
                )}
                {metaPicker.pages.length > 1 && (
                  <FormField label="Facebook Page" id="meta-page-picker">
                    <select
                      id="meta-page-picker"
                      value={facebookForm.pageId}
                      onChange={(e) => {
                        const page = metaPicker.pages.find((row) => row.id === e.target.value)
                        if (page) handleSelectMetaPage(page)
                      }}
                      className={inputClass}
                      disabled={savingPlatform === 'facebook'}
                    >
                      <option value="">Select a page</option>
                      {metaPicker.pages.map((page) => (
                        <option key={page.id} value={page.id}>
                          {page.name}
                        </option>
                      ))}
                    </select>
                  </FormField>
                )}
              </div>
            )}

            <div className="grid sm:grid-cols-2 gap-4">
              {!metaOAuthConnected && (
                <FormField label="Access token" id="facebook-access-token">
                  <SecretInput
                    id="facebook-access-token"
                    value={facebookForm.accessToken}
                    onChange={(value) => setFacebookForm((c) => ({ ...c, accessToken: value }))}
                    className={inputClass}
                    disabled={savingPlatform === 'facebook'}
                    placeholder={creds.facebook.hasAccessToken ? 'Saved — leave blank to keep' : ''}
                  />
                </FormField>
              )}
              <FormField label="Ad account ID" id="facebook-ad-account-id">
                <input
                  id="facebook-ad-account-id"
                  value={facebookForm.adAccountId}
                  onChange={(e) => setFacebookForm((c) => ({ ...c, adAccountId: e.target.value }))}
                  className={inputClass}
                  placeholder="act_..."
                  disabled={savingPlatform === 'facebook'}
                />
              </FormField>
              <FormField label="Facebook Page ID" id="facebook-page-id">
                <input
                  id="facebook-page-id"
                  value={facebookForm.pageId}
                  onChange={(e) => setFacebookForm((c) => ({ ...c, pageId: e.target.value }))}
                  className={inputClass}
                  disabled={savingPlatform === 'facebook'}
                />
              </FormField>
              <FormField label="Pixel ID (optional)" id="facebook-pixel-id">
                <input
                  id="facebook-pixel-id"
                  value={facebookForm.pixelId}
                  onChange={(e) => setFacebookForm((c) => ({ ...c, pixelId: e.target.value }))}
                  className={inputClass}
                  disabled={savingPlatform === 'facebook'}
                />
              </FormField>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleSaveFacebookCredentials}
                disabled={savingPlatform !== null}
                className="bg-navy-900 text-cream font-medium px-5 py-2.5 rounded-xl hover:bg-navy-800 transition-colors text-sm disabled:opacity-60"
              >
                {savingPlatform === 'facebook' ? 'Saving…' : 'Save Meta credentials'}
              </button>
              {creds.facebook.configured && (
                <button
                  type="button"
                  onClick={() => handleClearCredentials('facebook')}
                  disabled={savingPlatform !== null}
                  className="border border-navy-900/15 text-navy-900 font-medium px-5 py-2.5 rounded-xl hover:bg-navy-900/5 transition-colors text-sm disabled:opacity-60"
                >
                  Clear Meta
                </button>
              )}
            </div>
          </div>

          <div className="rounded-xl bg-cream border border-navy-900/5 p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold text-navy-900 mb-1">Yelp publish credentials</h3>
                <p className="text-sm text-navy-600">
                  Partner Ads API credentials. Request access from your Yelp account team.
                </p>
              </div>
              <ConfigBadge configured={creds.yelp.configured} />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <FormField label="API username" id="yelp-username">
                <input
                  id="yelp-username"
                  value={yelpForm.username}
                  onChange={(e) => setYelpForm((c) => ({ ...c, username: e.target.value }))}
                  className={inputClass}
                  disabled={savingPlatform === 'yelp'}
                />
              </FormField>
              <FormField label="API password" id="yelp-password">
                <SecretInput
                  id="yelp-password"
                  value={yelpForm.password}
                  onChange={(value) => setYelpForm((c) => ({ ...c, password: value }))}
                  className={inputClass}
                  disabled={savingPlatform === 'yelp'}
                  placeholder={creds.yelp.hasPassword ? 'Saved — leave blank to keep' : ''}
                />
              </FormField>
              <FormField label="Business ID" id="yelp-business-id">
                <input
                  id="yelp-business-id"
                  value={yelpForm.businessId}
                  onChange={(e) => setYelpForm((c) => ({ ...c, businessId: e.target.value }))}
                  className={inputClass}
                  disabled={savingPlatform === 'yelp'}
                />
              </FormField>
              <FormField label="API base URL (optional)" id="yelp-api-base">
                <input
                  id="yelp-api-base"
                  value={yelpForm.apiBase}
                  onChange={(e) => setYelpForm((c) => ({ ...c, apiBase: e.target.value }))}
                  className={inputClass}
                  placeholder="https://partner-api.yelp.com"
                  disabled={savingPlatform === 'yelp'}
                />
              </FormField>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleSaveYelpCredentials}
                disabled={savingPlatform !== null}
                className="bg-navy-900 text-cream font-medium px-5 py-2.5 rounded-xl hover:bg-navy-800 transition-colors text-sm disabled:opacity-60"
              >
                {savingPlatform === 'yelp' ? 'Saving…' : 'Save Yelp credentials'}
              </button>
              {creds.yelp.configured && (
                <button
                  type="button"
                  onClick={() => handleClearCredentials('yelp')}
                  disabled={savingPlatform !== null}
                  className="border border-navy-900/15 text-navy-900 font-medium px-5 py-2.5 rounded-xl hover:bg-navy-900/5 transition-colors text-sm disabled:opacity-60"
                >
                  Clear Yelp
                </button>
              )}
            </div>
          </div>

          <div className="rounded-xl bg-cream border border-navy-900/5 p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold text-navy-900 mb-1">Reddit Ads publish credentials</h3>
                <p className="text-sm text-navy-600">
                  OAuth access token and ad account from Reddit Ads Manager. Campaigns are created paused.
                </p>
              </div>
              <ConfigBadge configured={creds.reddit.configured} />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <FormField label="Access token" id="reddit-access-token">
                <SecretInput
                  id="reddit-access-token"
                  value={redditForm.accessToken}
                  onChange={(value) => setRedditForm((c) => ({ ...c, accessToken: value }))}
                  className={inputClass}
                  disabled={savingPlatform === 'reddit'}
                  placeholder={creds.reddit.hasAccessToken ? 'Saved — leave blank to keep' : ''}
                />
              </FormField>
              <FormField label="Ad account ID" id="reddit-ad-account-id">
                <input
                  id="reddit-ad-account-id"
                  value={redditForm.adAccountId}
                  onChange={(e) => setRedditForm((c) => ({ ...c, adAccountId: e.target.value }))}
                  className={inputClass}
                  disabled={savingPlatform === 'reddit'}
                />
              </FormField>
              <FormField label="Pixel ID (optional)" id="reddit-pixel-id">
                <input
                  id="reddit-pixel-id"
                  value={redditForm.pixelId}
                  onChange={(e) => setRedditForm((c) => ({ ...c, pixelId: e.target.value }))}
                  className={inputClass}
                  disabled={savingPlatform === 'reddit'}
                />
              </FormField>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleSaveRedditCredentials}
                disabled={savingPlatform !== null}
                className="bg-navy-900 text-cream font-medium px-5 py-2.5 rounded-xl hover:bg-navy-800 transition-colors text-sm disabled:opacity-60"
              >
                {savingPlatform === 'reddit' ? 'Saving…' : 'Save Reddit credentials'}
              </button>
              {creds.reddit.configured && (
                <button
                  type="button"
                  onClick={() => handleClearCredentials('reddit')}
                  disabled={savingPlatform !== null}
                  className="border border-navy-900/15 text-navy-900 font-medium px-5 py-2.5 rounded-xl hover:bg-navy-900/5 transition-colors text-sm disabled:opacity-60"
                >
                  Clear Reddit
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
    </IntegrationPanel>
  )
}
