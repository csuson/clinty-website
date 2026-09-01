export type StoredGoogleCredentials = {
  developer_token?: string
  client_id?: string
  client_secret?: string
  refresh_token?: string
  customer_id?: string
  login_customer_id?: string
  use_proto_plus?: boolean
}

/** App-level Google Ads API developer token (Supabase Edge Function secret). */
export function getGlobalGoogleAdsDeveloperToken(): string {
  return Deno.env.get('GOOGLE_ADS_DEVELOPER_TOKEN')?.trim() ?? ''
}

export function isGoogleAdsDeveloperTokenConfigured(): boolean {
  return Boolean(getGlobalGoogleAdsDeveloperToken())
}

export function isGoogleAdsPublishConfigured(google?: StoredGoogleCredentials | null): boolean {
  if (!google) return false
  return Boolean(
    isGoogleAdsDeveloperTokenConfigured()
      && google.client_id
      && google.client_secret
      && google.refresh_token
      && google.customer_id,
  )
}

export function publicGoogleCredentialsStatus(google?: StoredGoogleCredentials | null) {
  return {
    configured: isGoogleAdsPublishConfigured(google),
    hasDeveloperToken: isGoogleAdsDeveloperTokenConfigured(),
    hasClientSecret: Boolean(google?.client_secret),
    hasRefreshToken: Boolean(google?.refresh_token),
    clientId: google?.client_id ?? '',
    customerId: google?.customer_id ?? '',
    loginCustomerId: google?.login_customer_id ?? '',
    useProtoPlus: google?.use_proto_plus !== false,
  }
}

export function googlePublishPayload(google: StoredGoogleCredentials) {
  return {
    developer_token: getGlobalGoogleAdsDeveloperToken(),
    client_id: google.client_id,
    client_secret: google.client_secret,
    refresh_token: google.refresh_token,
    customer_id: google.customer_id,
    login_customer_id: google.login_customer_id || undefined,
    use_proto_plus: google.use_proto_plus !== false,
  }
}

export function withoutStoredDeveloperToken(
  google: StoredGoogleCredentials,
): StoredGoogleCredentials {
  const next = { ...google }
  delete next.developer_token
  return next
}
