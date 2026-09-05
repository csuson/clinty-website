export const CAMPAIGN_GOALS = [
  { value: 'leads', label: 'Leads (form fills, bookings)' },
  { value: 'sales', label: 'Online sales' },
  { value: 'website_traffic', label: 'Website traffic' },
  { value: 'brand_awareness', label: 'Brand awareness' },
  { value: 'phone_calls', label: 'Phone calls' },
] as const

export type CampaignGoal = (typeof CAMPAIGN_GOALS)[number]['value']

export type AdCampaignStatus = 'clarification' | 'approval' | 'complete' | 'running'

export type CampaignKeyword = {
  text: string
  match_type: 'exact' | 'phrase' | 'broad'
  intent?: string
}

export type ResponsiveSearchAd = {
  headlines: string[]
  descriptions: string[]
  path1?: string
  path2?: string
  final_url: string
}

export type AdGroupPlan = {
  name: string
  theme: string
  landing_page_url: string
  keywords: CampaignKeyword[]
  negatives: string[]
  rsa: ResponsiveSearchAd
}

export type CampaignPlan = {
  strategy: {
    campaign_name: string
    campaign_type: string
    objective: string
    audience_summary: string
    positioning: string
    geo_targets: string[]
    rationale: string
  }
  budget: {
    monthly_budget_usd: number
    daily_budget_usd: number
    bidding_strategy: string
    expected_cpc_range_usd: string
    notes: string
  }
  ad_groups: AdGroupPlan[]
  campaign_negatives: string[]
  extensions?: {
    sitelinks?: { text: string; description1?: string; description2?: string; final_url: string }[]
    callouts?: string[]
  }
  launch_checklist: string[]
  rationale: string
}

export type CreativeFormat = 'image' | 'video' | 'carousel'
export type CreativeAssetKind = 'image' | 'video'

export type CampaignMediaAsset = {
  name: string
  kind: CreativeAssetKind
  url: string
  headline?: string
  description?: string
}

export const CREATIVE_FORMATS: { value: CreativeFormat; label: string }[] = [
  { value: 'image', label: 'Image' },
  { value: 'video', label: 'Video' },
  { value: 'carousel', label: 'Carousel' },
]

export type FacebookAd = {
  name: string
  primary_text: string
  headline: string
  description: string
  call_to_action: string
  landing_page_url: string
  image_concept: string
  creative_format?: CreativeFormat
  media?: CampaignMediaAsset[]
}

export type FacebookAdSet = {
  name: string
  theme: string
  daily_budget_usd: number
  age_min: number
  age_max: number
  locations: string[]
  interests: string[]
  exclusions: string[]
  placements: string[]
  ads: FacebookAd[]
}

export type FacebookCampaignPlan = {
  campaign_name: string
  objective: string
  monthly_budget_usd: number
  daily_budget_usd: number
  bid_strategy: string
  ad_sets: FacebookAdSet[]
  rationale: string
  launch_checklist: string[]
}

export type YelpProgram = {
  name: string
  theme: string
  monthly_budget_usd: number
  categories: string[]
  specialties_text: string
  custom_ad_text: string
  photo_concept: string
  photo_url?: string
  negatives: string[]
  ad_goal: string
}

export type YelpCampaignPlan = {
  campaign_name: string
  program_type: string
  ad_goal: string
  monthly_budget_usd: number
  daily_budget_usd: number
  is_autobid: boolean
  max_bid_usd: number | null
  pacing_method: string
  fee_period: string
  categories: string[]
  geo_targets: string[]
  radius_miles: number | null
  programs: YelpProgram[]
  rationale: string
  launch_checklist: string[]
}

export type RedditAd = {
  name: string
  headline: string
  body: string
  call_to_action: string
  landing_page_url: string
  image_concept: string
  creative_format?: CreativeFormat
  media?: CampaignMediaAsset[]
}

export type RedditAdGroup = {
  name: string
  theme: string
  daily_budget_usd: number
  communities: string[]
  interests: string[]
  keywords: string[]
  locations: string[]
  ads: RedditAd[]
}

export type RedditCampaignPlan = {
  campaign_name: string
  objective: string
  monthly_budget_usd: number
  daily_budget_usd: number
  bid_strategy: string
  ad_groups: RedditAdGroup[]
  rationale: string
  launch_checklist: string[]
}

export type MediaPlan = {
  platforms: string[]
  google: CampaignPlan | null
  facebook: FacebookCampaignPlan | null
  yelp?: YelpCampaignPlan | null
  reddit?: RedditCampaignPlan | null
  google_budget_share: number
  facebook_budget_share: number
  yelp_budget_share?: number
  reddit_budget_share?: number
  rationale: string
}

export type ReviewIssue = {
  severity: 'error' | 'warning'
  field: string
  message: string
}

export type AdCampaignMetricTotals = {
  impressions: number
  clicks: number
  spend_usd: number
  conversions: number
  ctr: number
  cpc_usd: number
  cpa_usd: number
  conversion_rate: number
}

export type AdCampaignPerformanceRow = AdCampaignMetricTotals & {
  id: string
  name: string
  status: string
}

export type AdCampaignKeywordRow = {
  text: string
  match_type: string
  impressions: number
  clicks: number
  spend_usd: number
  conversions: number
  ctr: number
  cpc_usd: number
}

export type AdCampaignDailyPoint = {
  date: string
  impressions: number
  clicks: number
  spend_usd: number
  conversions: number
}

export type AdPlatformAnalytics = AdCampaignMetricTotals & {
  platform: string
  label: string
  connected: boolean
  error: string | null
  campaigns: AdCampaignPerformanceRow[]
  keywords: AdCampaignKeywordRow[]
}

export type AdCampaignAnalyticsReport = {
  period_days: number
  start_date: string
  end_date: string
  totals: AdCampaignMetricTotals
  platforms: AdPlatformAnalytics[]
  daily: AdCampaignDailyPoint[]
  note: string | null
}

export type SavedCampaignDraft = {
  step: 'brief' | 'clarifying' | 'review' | 'complete'
  snapshot: CampaignSnapshot
  answers: Record<string, string>
  revisionNotes: string
  publish: boolean
  requestedPlatforms: Array<'google' | 'facebook' | 'yelp' | 'reddit'>
  savedAt: string
  briefForm?: import('../lib/googleAds/settings').GoogleAdsCampaignBrief | null
}

export type CampaignSnapshot = {
  thread_id: string
  status: AdCampaignStatus
  interrupt: {
    type?: string
    questions?: string[]
    missing_fields?: string[]
  } | null
  brief: Record<string, unknown> | null
  platforms?: string[]
  campaign_plan: CampaignPlan | null
  facebook_plan: FacebookCampaignPlan | null
  yelp_plan?: YelpCampaignPlan | null
  reddit_plan?: RedditCampaignPlan | null
  media_plan: MediaPlan | null
  review: {
    passed: boolean
    issues: ReviewIssue[]
    policy_notes: string[]
  } | null
  publish_result: {
    status: string
    detail: string
    resource_names: string[]
  } | null
  missing_fields: string[]
  clarifying_questions: string[]
}
