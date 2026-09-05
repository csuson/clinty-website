export type GoogleAdsCredentialForm = {
  clientId: string
  clientSecret: string
  refreshToken: string
  customerId: string
  loginCustomerId: string
  useProtoPlus: boolean
}

export type FacebookCredentialForm = {
  accessToken: string
  adAccountId: string
  pageId: string
  pixelId: string
}

export type YelpCredentialForm = {
  username: string
  password: string
  businessId: string
  apiBase: string
}

export type RedditCredentialForm = {
  accessToken: string
  adAccountId: string
  pixelId: string
}

export const emptyGoogleAdsCredentialForm = (): GoogleAdsCredentialForm => ({
  clientId: '',
  clientSecret: '',
  refreshToken: '',
  customerId: '',
  loginCustomerId: '',
  useProtoPlus: true,
})

export const emptyFacebookCredentialForm = (): FacebookCredentialForm => ({
  accessToken: '',
  adAccountId: '',
  pageId: '',
  pixelId: '',
})

export const emptyYelpCredentialForm = (): YelpCredentialForm => ({
  username: '',
  password: '',
  businessId: '',
  apiBase: '',
})

export const emptyRedditCredentialForm = (): RedditCredentialForm => ({
  accessToken: '',
  adAccountId: '',
  pixelId: '',
})
