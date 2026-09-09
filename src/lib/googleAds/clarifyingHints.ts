const FIELD_LABELS: Record<string, string> = {
  business_name: 'What is your business name?',
  industry: 'What type of business is this?',
  description: 'What does your business do?',
  products_or_services: 'What should this campaign promote?',
  locations: 'Which cities or areas should ads target?',
  monthly_budget_usd: 'How much do you want to spend on ads each month?',
  primary_goal: 'What result do you want most?',
  website_url: 'What website should people visit?',
  target_audience: 'Who is your ideal customer?',
  unique_selling_points: 'What makes you different?',
  yelp_business_id: 'Do you have a Yelp listing ID? (optional)',
  claims_to_avoid: 'Are there words or promises we should avoid?',
  restricted_claims: 'Are there words or promises we should avoid?',
  restricted_claim: 'Are there words or promises we should avoid?',
  policy_claims: 'Are there words or promises we should avoid?',
  conversion_action: 'After someone clicks, what should they do?',
}

export function normalizeClarifyingFieldKey(field: string): string {
  return field
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
}

function humanizeField(field: string): string {
  const words = normalizeClarifyingFieldKey(field).replace(/_/g, ' ').trim()
  if (!words) return field
  return words.charAt(0).toUpperCase() + words.slice(1)
}

export function questionMatchesField(field: string, question: string): boolean {
  const key = normalizeClarifyingFieldKey(field)
  const q = question.trim().toLowerCase()
  if (!key || !q) return false

  if (/(restricted\s+claim|claims?\s+to\s+avoid|policy[- ]safe|superlative|#1)/.test(q)) {
    return /claim|restrict|policy|avoid/.test(key)
  }
  if (/yelp/.test(q) && /business/.test(q)) {
    return key.includes('yelp')
  }

  const tokens = key.split('_').filter((token) => token.length > 2)
  if (tokens.length === 0) return true
  const hits = tokens.filter((token) => q.includes(token)).length
  return tokens.length === 1 ? hits === 1 : hits >= 2
}

export function isYelpBusinessIdClarifying(field: string, question = ''): boolean {
  const key = normalizeClarifyingFieldKey(field)
  const q = question.trim().toLowerCase()
  if (
    key === 'yelp_business_id'
    || (key.includes('yelp') && (key.includes('business') || key.includes('listing')))
  ) {
    return true
  }
  return /yelp/.test(q) && (/business\s*id/.test(q) || /business listing/.test(q) || /listing id/.test(q))
}

export function clarifyingFieldLabel(field: string, question?: string): string {
  const key = normalizeClarifyingFieldKey(field)
  const known = FIELD_LABELS[key]
  const trimmed = question?.trim() ?? ''
  if (trimmed && questionMatchesField(field, trimmed)) return trimmed
  if (known) return known
  if (trimmed) return trimmed
  return humanizeField(field)
}

const EXACT_FIELD_HINTS: Record<string, string> = {
  business_name: 'Use the name on your website or storefront.',
  industry: 'Examples: family dentist, kite shop, HVAC repair.',
  website_url: 'Paste the full link starting with https://',
  yelp_business_id: 'Optional. Only needed if you already have this from Yelp.',
  landing_page_url: 'The page people should land on — booking page, service page, or homepage.',
  locations: 'List cities or regions you serve.',
  geo_targets: 'Where ads should show — cities, counties, or nearby areas.',
  monthly_budget_usd: 'Monthly total in US dollars. Example: 500',
  monthly_budget: 'Monthly total in US dollars. Example: 500',
  budget: 'How much you want to spend per month on ads.',
  daily_budget: 'Optional daily cap. Leave blank if you only know a monthly amount.',
  goal: 'Pick one main outcome: calls, leads, sales, or website visits.',
  primary_goal: 'Pick one main outcome: calls, leads, sales, or website visits.',
  offerings: 'Your top product or service for this campaign.',
  products_or_services: 'Your top product or service for this campaign.',
  audience: 'Example: “parents in Austin” or “homeowners needing a new roof”.',
  target_audience: 'Example: “parents in Austin” or “homeowners needing a new roof”.',
  phone: 'A phone number you answer during business hours.',
  phone_number: 'A phone number you answer during business hours.',
  competitors: 'Optional. Names of businesses you compete with locally.',
  differentiator: 'What makes customers choose you?',
  unique_selling_proposition: 'What makes customers choose you?',
  conversion_action: 'Example: book online, call, fill out a form, or buy.',
  booking_url: 'Link to your online booking page, if you have one.',
  promotion: 'Any special offer to mention (optional).',
  seasonality: 'Busy or slow seasons we should know about (optional).',
  brand_voice: 'How should ads sound? Friendly, professional, fun, etc.',
  claims_to_avoid: 'Words to skip — like “#1” or guarantees your industry restricts.',
  restricted_claims: 'Words to skip — like “#1” or guarantees your industry restricts.',
  restricted_claim: 'Words to skip — like “#1” or guarantees your industry restricts.',
  notes: 'Anything else that would help us write better ads.',
}

export function clarifyingFieldHint(field: string, question: string): string {
  const key = normalizeClarifyingFieldKey(field)

  if (key && EXACT_FIELD_HINTS[key]) {
    return EXACT_FIELD_HINTS[key]
  }

  const combined = `${field} ${question}`.toLowerCase()

  if (/budget|spend|cost|\$|usd|monthly|daily/.test(combined)) {
    return 'Enter a number in US dollars. Start conservative if you are unsure.'
  }
  if (/url|website|landing|domain|http/.test(combined)) {
    return 'Paste the full link starting with https://'
  }
  if (/location|geo|city|region|area|zip|state|where/.test(combined)) {
    return 'List the places you serve or want customers from.'
  }
  if (/phone|call/.test(combined)) {
    return 'Use a number you can answer during business hours.'
  }
  if (/audience|customer|who|demographic|target/.test(combined)) {
    return 'Describe who you want to reach — age, location, or what they need.'
  }
  if (/offer|service|product|what do you/.test(combined)) {
    return 'Name the main thing this campaign should promote.'
  }
  if (/goal|objective|outcome|convert/.test(combined)) {
    return 'Pick the single most important result you want.'
  }
  if (/policy|claim|avoid|legal|compliance/.test(combined)) {
    return 'Note any words or promises ads should avoid.'
  }

  return 'A short, specific answer is enough.'
}
