export type AdBriefFormFields = {
  businessName: string
  industry: string
  websiteUrl: string
  locations: string
  monthlyBudget: string
  goal: string
  offerings: string
  audience: string
  notes: string
}

const BRIEF_FIELD_KEYS: (keyof AdBriefFormFields)[] = [
  'businessName',
  'industry',
  'websiteUrl',
  'locations',
  'monthlyBudget',
  'goal',
  'offerings',
  'audience',
  'notes',
]

function emptyBrief(): AdBriefFormFields {
  return {
    businessName: '',
    industry: '',
    websiteUrl: '',
    locations: '',
    monthlyBudget: '',
    goal: 'leads',
    offerings: '',
    audience: '',
    notes: '',
  }
}

function labeledValue(text: string, labels: string[]): string {
  for (const line of text.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed) continue

    for (const label of labels) {
      const prefix = `${label}:`
      if (trimmed.toLowerCase().startsWith(prefix.toLowerCase())) {
        const value = trimmed.slice(prefix.length).trim()
        if (value) return value
      }
    }
  }

  return ''
}

function isSectionHeader(line: string): boolean {
  const trimmed = line.trim()
  if (!trimmed.endsWith(':')) return false
  if (/^https?:\/\//i.test(trimmed)) return false
  const header = trimmed.slice(0, -1)
  if (!header || header.length > 64) return false
  return /^[A-Za-z0-9][A-Za-z0-9\s/&,'()-]+$/.test(header)
}

function openingParagraph(text: string): string {
  const lines = text.split('\n')
  const parts: string[] = []

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) {
      if (parts.length > 0) break
      continue
    }
    if (isSectionHeader(trimmed) || /^Business name:/i.test(trimmed)) break
    parts.push(trimmed)
  }

  return parts.join(' ').trim()
}

function sectionBody(text: string, headers: string[]): string {
  const lines = text.split('\n')
  const normalizedHeaders = new Set(headers.map((header) => header.toLowerCase()))

  for (let index = 0; index < lines.length; index += 1) {
    const trimmed = lines[index].trim()
    if (!trimmed) continue

    for (const header of headers) {
      const prefix = `${header}:`
      if (!trimmed.toLowerCase().startsWith(prefix.toLowerCase())) continue

      const sameLine = trimmed.slice(prefix.length).trim()
      const collected: string[] = sameLine ? [sameLine] : []

      for (let bodyIndex = index + 1; bodyIndex < lines.length; bodyIndex += 1) {
        const bodyLine = lines[bodyIndex].trim()
        if (!bodyLine) {
          if (collected.length > 0) collected.push('')
          continue
        }
        if (isSectionHeader(bodyLine)) {
          const headerText = bodyLine.slice(0, -1).toLowerCase()
          if (!normalizedHeaders.has(headerText)) break
        }
        collected.push(bodyLine)
      }

      return collected.join('\n').trim()
    }
  }

  return ''
}

function bulletLines(section: string): string[] {
  return section
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => /^[-•*]\s+/.test(line))
    .map((line) => line.replace(/^[-•*]\s+/, '').trim())
    .filter(Boolean)
}

function joinBullets(items: string[], maxLength = 280): string {
  if (items.length === 0) return ''

  let result = items[0]
  for (let index = 1; index < items.length; index += 1) {
    const next = `${result}; ${items[index]}`
    if (next.length > maxLength) break
    result = next
  }

  return result.length > maxLength ? `${result.slice(0, maxLength - 1).trim()}…` : result
}

function normalizeWebsite(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return ''
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  return `https://${trimmed}`
}

function firstWebsiteInText(text: string): string {
  const match = text.match(/https?:\/\/[^\s)>]+/i)
  return match ? normalizeWebsite(match[0]) : ''
}

function parseLocations(locationSection: string, opening: string): string {
  const lines = locationSection
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !/^https?:\/\//i.test(line))

  for (const line of lines) {
    const cityState = line.match(/,\s*([A-Za-z .'-]+,\s*[A-Z]{2})(?:\s+\d{5})?\b/)
    if (cityState?.[1]) return cityState[1].trim()
  }

  if (lines[0]) {
    return lines[0].replace(/\s+\d{5}(?:-\d{4})?$/, '').trim()
  }

  const regionMatch = opening.match(/\bin (?:the )?([^.\n]+)/i)
  return regionMatch?.[1]?.trim() ?? ''
}

function parseIndustry(opening: string): string {
  const patterns = [
    /[-—]\s*a[n]?\s+([^.\n]+?)(?:\s+in\b|\s+serving\b|$)/i,
    /\bis a[n]?\s+([^.\n]+?)(?:\s+in\b|\s+serving\b|$)/i,
    /\bruns?\s+a[n]?\s+([^.\n]+?)(?:\s+in\b|$)/i,
  ]

  for (const pattern of patterns) {
    const match = opening.match(pattern)
    if (match?.[1]?.trim()) {
      return match[1].trim().replace(/\s+and\s+.+$/i, '').trim()
    }
  }

  return ''
}

function supplementalNotes(text: string): string {
  const sections = [
    sectionBody(text, ['Lesson packages and pricing', 'Services and pricing']),
    sectionBody(text, ['Policies']),
    sectionBody(text, ['Response template']),
  ].filter(Boolean)

  return sections.join('\n\n').trim()
}

function countFilledFields(fields: Partial<AdBriefFormFields>): number {
  return BRIEF_FIELD_KEYS.filter((key) => key !== 'goal' && fields[key]?.trim()).length
}

export function briefFormFromBackground(
  background: string,
  options?: { companyName?: string | null },
): Partial<AdBriefFormFields> {
  const text = background.trim()
  if (!text) return {}

  const opening = openingParagraph(text)
  const businessName =
    labeledValue(text, ['Business name']) || options?.companyName?.trim() || ''
  const websiteUrl =
    normalizeWebsite(labeledValue(text, ['Website'])) || firstWebsiteInText(text)
  const locationSection = sectionBody(text, ['School location', 'Business location'])
  const locations = parseLocations(locationSection, opening)
  const industry = parseIndustry(opening)
  const offerings = joinBullets(
    bulletLines(sectionBody(text, ['What we offer', 'Products and services', 'Services'])),
  )
  const audience = joinBullets(
    bulletLines(sectionBody(text, ['Why students choose us', 'Why customers choose us'])),
    220,
  )

  let notes = supplementalNotes(text)
  if (!notes && countFilledFields({ businessName, industry, websiteUrl, locations, offerings, audience }) <= 2) {
    notes = text
  }

  return {
    ...(businessName ? { businessName } : {}),
    ...(industry ? { industry } : {}),
    ...(websiteUrl ? { websiteUrl } : {}),
    ...(locations ? { locations } : {}),
    ...(offerings ? { offerings } : {}),
    ...(audience ? { audience } : {}),
    ...(notes ? { notes } : {}),
  }
}

/** Later sources override earlier ones for each non-empty field. */
export function combineAdBriefForm(
  ...sources: Array<Partial<AdBriefFormFields> | null | undefined>
): AdBriefFormFields {
  const result = emptyBrief()

  for (const source of sources) {
    if (!source) continue
    for (const key of BRIEF_FIELD_KEYS) {
      const value = source[key]?.trim()
      if (value) result[key] = value
    }
  }

  if (!result.goal) result.goal = 'leads'
  return result
}

export function mergeAdBriefForm(
  current: AdBriefFormFields,
  parsed: Partial<AdBriefFormFields>,
): AdBriefFormFields {
  return combineAdBriefForm(current, parsed)
}
