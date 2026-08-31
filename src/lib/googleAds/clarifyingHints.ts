const EXACT_FIELD_HINTS: Record<string, string> = {
  business_name:
    'The public-facing name customers recognize — match what appears on your website and Google Business Profile.',
  industry:
    'A short category label (e.g. “kiteboarding school”, “family dentistry”, “HVAC contractor”) so we pick the right keywords.',
  website_url:
    'Your main site or the page you want most ads to point to, including https://.',
  landing_page_url:
    'The specific page people should land on after clicking an ad — often a service page, booking page, or contact page.',
  locations:
    'Cities, counties, states, or regions you serve. Example: “Foster City, CA and Peninsula” or “Austin metro”.',
  geo_targets:
    'Where ads should show geographically — cities, ZIP codes, states, or a radius around your business.',
  monthly_budget:
    'Target monthly ad spend in USD (e.g. 500). Google paces spend across the month; you can adjust later.',
  budget:
    'How much you want to spend per month on paid media in USD.',
  daily_budget:
    'Optional daily cap in USD. Leave blank if you only know a monthly number.',
  goal:
    'What success looks like: leads, calls, bookings, online sales, or foot traffic.',
  primary_goal:
    'The main outcome you want from this campaign — leads, sales, calls, or site visits.',
  offerings:
    'Products or services to promote in ads. List your top 1–3 offers customers search for.',
  products_services:
    'The specific services or products this campaign should advertise.',
  audience:
    'Who should see these ads — demographics, intent, or customer type (e.g. “beginners”, “homeowners”).',
  target_audience:
    'Describe ideal customers: location, age range, interests, or problems they need solved.',
  phone:
    'A call tracking or business phone number if you want call extensions or call-focused ads.',
  phone_number:
    'Business phone for call extensions. Use a number you answer during business hours.',
  competitors:
    'Names of competing businesses or brands — helps us differentiate ad copy and avoid wasted clicks.',
  differentiator:
    'What makes you different — certifications, guarantees, speed, price, or local expertise.',
  unique_selling_proposition:
    'Your main reason customers choose you over alternatives.',
  conversion_action:
    'What you want someone to do after clicking: book online, call, fill a form, buy, etc.',
  booking_url:
    'Direct link to your scheduling or booking flow, if different from your homepage.',
  promotion:
    'Any limited-time offer, discount, or seasonal message to highlight in ads.',
  seasonality:
    'Busy seasons, holidays, or times when demand is higher or lower.',
  brand_voice:
    'Tone for ad copy: professional, friendly, luxury, technical, etc.',
  claims_to_avoid:
    'Phrases, superlatives, or promises Google or your industry restricts.',
  notes:
    'Anything else the campaign agent should know before drafting keywords and ads.',
}

export function clarifyingFieldHint(field: string, question: string): string {
  const key = field
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')

  if (key && EXACT_FIELD_HINTS[key]) {
    return EXACT_FIELD_HINTS[key]
  }

  const combined = `${field} ${question}`.toLowerCase()

  if (/budget|spend|cost|\$|usd|monthly|daily/.test(combined)) {
    return 'Enter a number in USD. If unsure, start conservative — you can raise budget after reviewing performance.'
  }
  if (/url|website|landing|domain|http/.test(combined)) {
    return 'Paste the full URL including https://. Use the page that best matches what the ad promises.'
  }
  if (/location|geo|city|region|area|zip|state|where/.test(combined)) {
    return 'List places you want ads to show. Narrow targeting usually improves lead quality.'
  }
  if (/phone|call/.test(combined)) {
    return 'Use a number you can answer. Include area code; extensions are fine if needed.'
  }
  if (/audience|customer|who|demographic|target/.test(combined)) {
    return 'Describe who you want to reach — job, life stage, pain point, or buying intent.'
  }
  if (/offer|service|product|what do you/.test(combined)) {
    return 'Name the specific services or products this campaign should focus on, not your full catalog.'
  }
  if (/competitor|alternative|versus|vs/.test(combined)) {
    return 'Optional but helpful — local or national names we should contrast with in messaging.'
  }
  if (/goal|objective|outcome|convert/.test(combined)) {
    return 'Pick the single most important result: leads, calls, bookings, sales, or traffic.'
  }
  if (/brand|tone|voice|style/.test(combined)) {
    return 'How should ads sound? Examples: warm and approachable, expert and clinical, premium boutique.'
  }
  if (/policy|claim|avoid|legal|compliance/.test(combined)) {
    return 'Note restricted claims (e.g. “#1”, medical guarantees) so drafts stay policy-safe.'
  }

  return 'Answer as specifically as you can. Short, concrete details produce better keywords and ad copy.'
}
