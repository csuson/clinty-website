import type { AdPlatform } from './budgetSplit'

export type CampaignWizardStep = 'brief' | 'clarifying' | 'review' | 'complete'

export const ADVANCED_MODE_STORAGE_KEY = 'clinty-ad-campaign-advanced'

export const WIZARD_STEPS: Array<{
  id: CampaignWizardStep
  title: string
  description: string
}> = [
  {
    id: 'brief',
    title: 'Tell us about your business',
    description: 'Share the basics so we know what to promote and who should see it.',
  },
  {
    id: 'clarifying',
    title: 'Fill in a few gaps',
    description: 'We only ask when something important is missing from your answers.',
  },
  {
    id: 'review',
    title: 'Review your ad plan',
    description: 'Check the draft before anything is created in your ad accounts.',
  },
  {
    id: 'complete',
    title: 'You are all set',
    description: 'Save the plan, download it, or create paused campaigns when you are ready.',
  },
]

export const PLATFORM_HELP: Record<
  AdPlatform,
  { label: string; simpleDescription: string }
> = {
  google: {
    label: 'Google Search',
    simpleDescription: 'Show up when people search for what you offer (best for leads and calls).',
  },
  facebook: {
    label: 'Facebook & Instagram',
    simpleDescription: 'Reach people browsing social feeds in your area (good for awareness and leads).',
  },
  yelp: {
    label: 'Yelp',
    simpleDescription: 'Appear when shoppers compare local businesses on Yelp.',
  },
  reddit: {
    label: 'Reddit',
    simpleDescription: 'Join conversations in communities related to your business.',
  },
}

export const BRIEF_INTRO = {
  title: 'Create your ad plan',
  description:
    'Answer a few simple questions. Clinty drafts where your ads will run, what they will say, and how much to spend — then you review everything before anything goes live.',
  submitLabel: 'Create my ad draft',
  workingLabel: 'Building your ad draft…',
}

export const CLARIFY_INTRO = {
  title: 'A few quick follow-ups',
  description:
    'We need these details to write accurate ads and pick the right places to show them. Short, specific answers work best.',
}

export const REVIEW_INTRO = {
  title: 'Your ad draft is ready',
  description:
    'Read through the plan below. Nothing runs until you approve it. Ads are created paused so you can double-check everything first.',
  simpleNote:
    'This is a starting plan — not a guarantee of results. You can send it back with changes anytime.',
}

export const FIELD_HINTS_SIMPLE: Record<string, string> = {
  businessName: 'Use the name customers know — the same one on your website or storefront.',
  industry: 'Examples: family dentist, kiteboarding school, HVAC repair.',
  websiteUrl: 'Your main website or the page you want people to visit after clicking an ad.',
  locations: 'Cities or areas you serve. Example: “San Mateo and nearby Peninsula towns”.',
  monthlyBudget: 'What you are comfortable spending on ads each month. You can change this later.',
  goal: 'Pick the main result you want: more calls, form fills, store visits, or online sales.',
  offerings: 'The product or service this campaign should focus on — your top offer is enough.',
  audience: 'Optional. Example: “homeowners with pets” or “parents looking for a new dentist”.',
  notes: 'Optional. Anything else we should know — special offers, words to avoid, busy seasons.',
}
