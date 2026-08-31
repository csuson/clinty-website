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

export type FacebookAd = {
  name: string
  primary_text: string
  headline: string
  description: string
  call_to_action: string
  landing_page_url: string
  image_concept: string
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

export type MediaPlan = {
  platforms: string[]
  google: CampaignPlan | null
  facebook: FacebookCampaignPlan | null
  google_budget_share: number
  facebook_budget_share: number
  rationale: string
}

export type ReviewIssue = {
  severity: 'error' | 'warning'
  field: string
  message: string
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
