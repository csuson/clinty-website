import type { ReviewIssue } from '../../constants/adCampaigns'

const BIDDING_LABELS: Record<string, string> = {
  maximize_clicks: 'Get clicks while the account learns (good starting point)',
  maximize_conversions: 'Focus on leads or sales once tracking is working',
  target_cpa: 'Target a cost per lead or sale',
  target_roas: 'Target return on ad spend (online sales)',
  maximize_conversion_value: 'Maximize sales value',
  target_impression_share: 'Show up more often in search results',
  manual_cpc: 'Set bids manually',
  LOWEST_COST_WITHOUT_CAP: 'Let Meta find the lowest cost per result',
  COST_CAP: 'Cap the average cost per result',
  CPC: 'Pay when someone clicks',
  CPM: 'Pay per 1,000 views (awareness)',
}

const MATCH_TYPE_LABELS: Record<string, string> = {
  exact: 'Exact search',
  phrase: 'Phrase search',
  broad: 'Broad search',
}

export function plainBiddingLabel(strategy: string): string {
  const key = strategy.trim()
  return BIDDING_LABELS[key] ?? BIDDING_LABELS[key.toUpperCase()] ?? key.replaceAll('_', ' ')
}

export function plainMatchType(matchType: string): string {
  return MATCH_TYPE_LABELS[matchType] ?? matchType
}

export function plainReviewIssue(issue: ReviewIssue, advancedMode: boolean): string {
  if (advancedMode) {
    return `[${issue.severity}] ${issue.field}: ${issue.message}`
  }
  const message = issue.message
    .replace(/target_cpa_usd/gi, 'target cost per lead')
    .replace(/target_roas/gi, 'target return on ad spend')
    .replace(/max is \d+/gi, (match) => match.replace('max is', 'limit is'))
  if (issue.severity === 'error') {
    return `Needs a fix: ${message}`
  }
  return `Heads up: ${message}`
}

export function plainCpcRange(range: string): string {
  return `Typical cost per click: ${range} (estimate — actual costs vary)`
}
