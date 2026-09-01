export type AdPlatform = 'google' | 'facebook' | 'yelp'

export type PlatformBudgetSplit = Record<AdPlatform, number>

export const AD_PLATFORMS: AdPlatform[] = ['google', 'facebook', 'yelp']

export const AD_PLATFORM_LABELS: Record<AdPlatform, string> = {
  google: 'Google Search',
  facebook: 'Meta',
  yelp: 'Yelp',
}

export const EMPTY_PLATFORM_BUDGET_SPLIT: PlatformBudgetSplit = {
  google: 0,
  facebook: 0,
  yelp: 0,
}

const DEFAULT_COMBO_SPLITS: Record<string, PlatformBudgetSplit> = {
  'google,facebook': { google: 55, facebook: 45, yelp: 0 },
  'google,yelp': { google: 60, facebook: 0, yelp: 40 },
  'facebook,yelp': { google: 0, facebook: 55, yelp: 45 },
  'google,facebook,yelp': { google: 40, facebook: 35, yelp: 25 },
}

export const DEFAULT_AD_PLATFORMS: AdPlatform[] = ['google', 'facebook']

const MIN_PLATFORM_SHARE = 5

function platformKey(platforms: AdPlatform[]): string {
  return [...platforms].sort().join(',')
}

export function isAdPlatform(value: string): value is AdPlatform {
  return AD_PLATFORMS.includes(value as AdPlatform)
}

export function parseAdPlatforms(value: unknown): AdPlatform[] {
  if (!Array.isArray(value)) return [...DEFAULT_AD_PLATFORMS]

  const platforms = value.filter((item): item is AdPlatform => typeof item === 'string' && isAdPlatform(item))
  return platforms.length > 0 ? platforms : [...DEFAULT_AD_PLATFORMS]
}

export function defaultBudgetSplit(platforms: AdPlatform[]): PlatformBudgetSplit {
  if (platforms.length === 0) return { ...EMPTY_PLATFORM_BUDGET_SPLIT }
  if (platforms.length === 1) {
    return {
      google: platforms[0] === 'google' ? 100 : 0,
      facebook: platforms[0] === 'facebook' ? 100 : 0,
      yelp: platforms[0] === 'yelp' ? 100 : 0,
    }
  }

  return { ...(DEFAULT_COMBO_SPLITS[platformKey(platforms)] ?? evenBudgetSplit(platforms)) }
}

function evenBudgetSplit(platforms: AdPlatform[]): PlatformBudgetSplit {
  const share = Math.floor(100 / platforms.length)
  const split = { ...EMPTY_PLATFORM_BUDGET_SPLIT }
  let remaining = 100

  for (const platform of platforms) {
    const value = platform === platforms[platforms.length - 1] ? remaining : share
    split[platform] = value
    remaining -= value
  }

  return split
}

export function activeBudgetSplit(
  platforms: AdPlatform[],
  split: PlatformBudgetSplit,
): PlatformBudgetSplit {
  if (platforms.length === 0) return { ...EMPTY_PLATFORM_BUDGET_SPLIT }
  if (platforms.length === 1) return defaultBudgetSplit(platforms)

  const normalized = { ...EMPTY_PLATFORM_BUDGET_SPLIT }
  let total = 0

  for (const platform of platforms) {
    normalized[platform] = Math.max(0, Math.round(split[platform] ?? 0))
    total += normalized[platform]
  }

  if (total <= 0) return defaultBudgetSplit(platforms)

  for (const platform of platforms) {
    normalized[platform] = Math.round((normalized[platform] / total) * 100)
  }

  const diff = 100 - platforms.reduce((sum, platform) => sum + normalized[platform], 0)
  if (diff !== 0) normalized[platforms[0]] += diff

  return normalized
}

export function parsePlatformBudgetSplit(value: unknown): PlatformBudgetSplit | null {
  if (!value || typeof value !== 'object') return null

  const row = value as Record<string, unknown>
  const split: PlatformBudgetSplit = {
    google: parseShare(row.google),
    facebook: parseShare(row.facebook),
    yelp: parseShare(row.yelp),
  }

  if (split.google + split.facebook + split.yelp <= 0) return null
  return split
}

function parseShare(value: unknown): number {
  const parsed = typeof value === 'number' ? value : Number.parseInt(String(value ?? ''), 10)
  return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : 0
}

export function budgetSplitForPlatforms(
  platforms: AdPlatform[],
  current?: PlatformBudgetSplit | null,
): PlatformBudgetSplit {
  if (platforms.length <= 1) return defaultBudgetSplit(platforms)
  if (!current) return defaultBudgetSplit(platforms)

  const active = activeBudgetSplit(platforms, current)
  const hasMissingShare = platforms.some((platform) => active[platform] <= 0)
  if (hasMissingShare) return defaultBudgetSplit(platforms)

  return active
}

export function updatePlatformBudgetShare(
  platforms: AdPlatform[],
  current: PlatformBudgetSplit,
  platform: AdPlatform,
  nextValue: number,
): PlatformBudgetSplit {
  if (!platforms.includes(platform)) return current
  if (platforms.length <= 1) return defaultBudgetSplit(platforms)

  const maxShare = 100 - MIN_PLATFORM_SHARE * (platforms.length - 1)
  const clamped = Math.max(MIN_PLATFORM_SHARE, Math.min(maxShare, Math.round(nextValue)))
  const others = platforms.filter((item) => item !== platform)
  const remaining = 100 - clamped
  const othersTotal = others.reduce((sum, item) => sum + Math.max(current[item], 1), 0)

  const next: PlatformBudgetSplit = { ...EMPTY_PLATFORM_BUDGET_SPLIT, [platform]: clamped }

  for (let index = 0; index < others.length; index += 1) {
    const item = others[index]
    if (index === others.length - 1) {
      const used = others.slice(0, -1).reduce((sum, other) => sum + next[other], 0)
      next[item] = Math.max(MIN_PLATFORM_SHARE, remaining - used)
    } else {
      next[item] = Math.max(
        MIN_PLATFORM_SHARE,
        Math.round((Math.max(current[item], 1) / othersTotal) * remaining),
      )
    }
  }

  return activeBudgetSplit(platforms, next)
}

export function toggleAdPlatform(
  platforms: AdPlatform[],
  split: PlatformBudgetSplit,
  platform: AdPlatform,
): { platforms: AdPlatform[]; platformBudgetSplit: PlatformBudgetSplit } {
  const nextPlatforms = platforms.includes(platform)
    ? platforms.filter((item) => item !== platform)
    : [...platforms, platform]

  if (nextPlatforms.length === 0) {
    return { platforms: nextPlatforms, platformBudgetSplit: { ...EMPTY_PLATFORM_BUDGET_SPLIT } }
  }

  return {
    platforms: nextPlatforms,
    platformBudgetSplit: budgetSplitForPlatforms(nextPlatforms, split),
  }
}

export function formatPlatformsForBrief(platforms: AdPlatform[]): string {
  return platforms.map((platform) => `${AD_PLATFORM_LABELS[platform]} (${platform})`).join(', ')
}

export function composePlatformsBriefLines(platforms: AdPlatform[]): string[] {
  const lines: string[] = []
  if (platforms.length === 0) return lines

  lines.push(`Platforms to draft: ${formatPlatformsForBrief(platforms)}`)
  lines.push(`Requested platform ids: ${platforms.join(', ')}`)

  if (platforms.includes('yelp')) {
    lines.push('Include a Yelp Ads campaign (platform: yelp).')
  }

  return lines
}

export function formatBudgetSplitLine(
  platforms: AdPlatform[],
  split: PlatformBudgetSplit,
  monthlyBudgetUsd?: number,
): string {
  const active = activeBudgetSplit(platforms, split)
  const parts = platforms.map((platform) => {
    const pct = active[platform]
    if (monthlyBudgetUsd && monthlyBudgetUsd > 0) {
      const usd = Math.round((monthlyBudgetUsd * pct) / 100)
      return `${pct}% ${AD_PLATFORM_LABELS[platform]} ($${usd.toLocaleString()})`
    }
    return `${pct}% ${AD_PLATFORM_LABELS[platform]}`
  })

  return parts.join(' / ')
}

export function budgetSplitPayload(
  platforms: AdPlatform[],
  split: PlatformBudgetSplit,
): Record<AdPlatform, number> | undefined {
  if (platforms.length === 0) return undefined

  const active = activeBudgetSplit(platforms, split)
  return Object.fromEntries(platforms.map((platform) => [platform, active[platform] / 100])) as Record<
    AdPlatform,
    number
  >
}
