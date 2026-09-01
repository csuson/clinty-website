import { supabase } from '../supabase'
import { getFunctionErrorMessage } from '../supabaseFunctions'
import type {
  FacebookCredentialForm,
  GoogleAdsCredentialForm,
  YelpCredentialForm,
} from '../../constants/adPlatformCredentials'

export type PlatformCredentialStatus = {
  configured: boolean
  hasDeveloperToken: boolean
  hasClientSecret: boolean
  hasRefreshToken: boolean
  clientId: string
  customerId: string
  loginCustomerId: string
  useProtoPlus: boolean
}

export type FacebookCredentialStatus = {
  configured: boolean
  hasAccessToken: boolean
  adAccountId: string
  pageId: string
  pixelId: string
}

export type YelpCredentialStatus = {
  configured: boolean
  hasPassword: boolean
  username: string
  businessId: string
  apiBase: string
}

export type PlatformCredentialsStatus = {
  google: PlatformCredentialStatus
  facebook: FacebookCredentialStatus
  yelp: YelpCredentialStatus
}

/** Snake-case payload sent to the campaign agent on publish. */
export type PlatformCredentialsPayload = {
  google?: {
    developer_token: string
    client_id: string
    client_secret: string
    refresh_token: string
    customer_id: string
    login_customer_id?: string
    use_proto_plus?: boolean
  }
  facebook?: {
    access_token: string
    ad_account_id: string
    page_id: string
    pixel_id?: string
  }
  yelp?: {
    username: string
    password: string
    business_id: string
    api_base?: string
  }
}

export type SavePlatformCredentialsInput = {
  google?: Partial<GoogleAdsCredentialForm>
  facebook?: Partial<FacebookCredentialForm>
  yelp?: Partial<YelpCredentialForm>
}

const SETTINGS_TIMEOUT_MS = 30_000

const emptyGoogleStatus = (): PlatformCredentialStatus => ({
  configured: false,
  hasDeveloperToken: false,
  hasClientSecret: false,
  hasRefreshToken: false,
  clientId: '',
  customerId: '',
  loginCustomerId: '',
  useProtoPlus: true,
})

const emptyFacebookStatus = (): FacebookCredentialStatus => ({
  configured: false,
  hasAccessToken: false,
  adAccountId: '',
  pageId: '',
  pixelId: '',
})

const emptyYelpStatus = (): YelpCredentialStatus => ({
  configured: false,
  hasPassword: false,
  username: '',
  businessId: '',
  apiBase: '',
})

export function emptyPlatformCredentialsStatus(): PlatformCredentialsStatus {
  return {
    google: emptyGoogleStatus(),
    facebook: emptyFacebookStatus(),
    yelp: emptyYelpStatus(),
  }
}

export async function fetchPlatformCredentialsStatus(): Promise<PlatformCredentialsStatus> {
  if (!supabase) return emptyPlatformCredentialsStatus()

  const result = await supabase.functions.invoke('google-ads-settings', {
    body: { action: 'get_settings' },
    timeout: SETTINGS_TIMEOUT_MS,
  })

  if (result.error || hasFunctionFailure(result.data)) {
    throw new Error(await getFunctionErrorMessage(result.error, result.data))
  }

  return parsePlatformCredentialsStatus(result.data?.platformCredentials)
}

export async function savePlatformCredentials(
  input: SavePlatformCredentialsInput,
): Promise<PlatformCredentialsStatus> {
  if (!supabase) {
    throw new Error('Supabase is not configured.')
  }

  const result = await supabase.functions.invoke('google-ads-settings', {
    body: { action: 'save_credentials', platformCredentials: input },
    timeout: SETTINGS_TIMEOUT_MS,
  })

  if (result.error || hasFunctionFailure(result.data)) {
    throw new Error(await getFunctionErrorMessage(result.error, result.data))
  }

  return parsePlatformCredentialsStatus(result.data?.platformCredentials)
}

export async function fetchPlatformCredentialsForPublish(): Promise<PlatformCredentialsPayload | null> {
  if (!supabase) return null

  const result = await supabase.functions.invoke('google-ads-settings', {
    body: { action: 'get_publish_credentials' },
    timeout: SETTINGS_TIMEOUT_MS,
  })

  if (result.error || hasFunctionFailure(result.data)) {
    throw new Error(await getFunctionErrorMessage(result.error, result.data))
  }

  const payload = result.data?.platformCredentials
  if (!payload || typeof payload !== 'object') return null
  return payload as PlatformCredentialsPayload
}

export async function clearPlatformCredentials(
  platform: 'google' | 'facebook' | 'yelp' | 'all',
): Promise<PlatformCredentialsStatus> {
  if (!supabase) {
    throw new Error('Supabase is not configured.')
  }

  const result = await supabase.functions.invoke('google-ads-settings', {
    body: { action: 'clear_credentials', platform },
    timeout: SETTINGS_TIMEOUT_MS,
  })

  if (result.error || hasFunctionFailure(result.data)) {
    throw new Error(await getFunctionErrorMessage(result.error, result.data))
  }

  return parsePlatformCredentialsStatus(result.data?.platformCredentials)
}

function parsePlatformCredentialsStatus(value: unknown): PlatformCredentialsStatus {
  if (!value || typeof value !== 'object') return emptyPlatformCredentialsStatus()

  const row = value as Record<string, unknown>
  const google = row.google && typeof row.google === 'object'
    ? (row.google as Record<string, unknown>)
    : {}
  const facebook = row.facebook && typeof row.facebook === 'object'
    ? (row.facebook as Record<string, unknown>)
    : {}
  const yelp = row.yelp && typeof row.yelp === 'object'
    ? (row.yelp as Record<string, unknown>)
    : {}

  return {
    google: {
      configured: google.configured === true,
      hasDeveloperToken: google.hasDeveloperToken === true,
      hasClientSecret: google.hasClientSecret === true,
      hasRefreshToken: google.hasRefreshToken === true,
      clientId: stringField(google.clientId),
      customerId: stringField(google.customerId),
      loginCustomerId: stringField(google.loginCustomerId),
      useProtoPlus: google.useProtoPlus !== false,
    },
    facebook: {
      configured: facebook.configured === true,
      hasAccessToken: facebook.hasAccessToken === true,
      adAccountId: stringField(facebook.adAccountId),
      pageId: stringField(facebook.pageId),
      pixelId: stringField(facebook.pixelId),
    },
    yelp: {
      configured: yelp.configured === true,
      hasPassword: yelp.hasPassword === true,
      username: stringField(yelp.username),
      businessId: stringField(yelp.businessId),
      apiBase: stringField(yelp.apiBase),
    },
  }
}

function stringField(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function hasFunctionFailure(data: unknown): boolean {
  if (data === null || typeof data !== 'object') return false

  const row = data as Record<string, unknown>
  if (
    'success' in row
    || 'adCampaignApiUrl' in row
    || 'hasApiUrl' in row
    || 'campaignBrief' in row
    || 'platformCredentials' in row
  ) {
    return false
  }

  return typeof row.error === 'string' && row.error.length > 0
}
