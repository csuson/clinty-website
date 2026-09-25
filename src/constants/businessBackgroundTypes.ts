/** Booking-model hint for AI business-background generation. */

export const BUSINESS_BACKGROUND_TYPES = [
  'auto',
  'lessons_appointments',
  'fixed_windows_packages',
  'general',
] as const

export type BusinessBackgroundType = (typeof BUSINESS_BACKGROUND_TYPES)[number]

/** Resolved types the generator actually writes for (never `auto`). */
export type ResolvedBusinessBackgroundType = Exclude<BusinessBackgroundType, 'auto'>

export const BUSINESS_BACKGROUND_TYPE_OPTIONS: Array<{
  value: BusinessBackgroundType
  label: string
  description: string
}> = [
  {
    value: 'auto',
    label: 'Auto-detect',
    description: 'Infer from the website (recommended)',
  },
  {
    value: 'lessons_appointments',
    label: 'Lessons & appointments',
    description: 'Open calendar, packages, hourly or session lessons',
  },
  {
    value: 'fixed_windows_packages',
    label: 'Fixed dates / camps',
    description: 'Set weeks or packages, lodging, capacity limits',
  },
  {
    value: 'general',
    label: 'General business',
    description: 'Retail, services, or mixed — no strong booking model',
  },
]

export function parseBusinessBackgroundType(raw: unknown): BusinessBackgroundType {
  if (typeof raw !== 'string') return 'auto'
  const normalized = raw.trim().toLowerCase()
  return (BUSINESS_BACKGROUND_TYPES as readonly string[]).includes(normalized)
    ? (normalized as BusinessBackgroundType)
    : 'auto'
}

export function labelForBusinessBackgroundType(type: ResolvedBusinessBackgroundType): string {
  switch (type) {
    case 'lessons_appointments':
      return 'lessons & appointments'
    case 'fixed_windows_packages':
      return 'fixed dates / camps'
    case 'general':
      return 'general business'
  }
}
