/** Sentinel stored in DB; unlimited monthly AI usage. */
export const AI_TOKEN_LIMIT_UNLIMITED = -1

export type AiTokenLimitPreset = {
  label: string
  value: number
  description?: string
}

/** Suggested monthly limits for admin configuration. */
export const AI_TOKEN_LIMIT_PRESETS: AiTokenLimitPreset[] = [
  { label: '25,000 / month', value: 25_000, description: 'Starter — light AI usage' },
  { label: '100,000 / month', value: 100_000, description: 'Default — prompt + H5P generation' },
  { label: '250,000 / month', value: 250_000, description: 'Growth — frequent content creation' },
  { label: '500,000 / month', value: 500_000, description: 'Business — teams and agencies' },
  { label: '1,000,000 / month', value: 1_000_000, description: 'Enterprise — heavy automation' },
  { label: 'Unlimited', value: AI_TOKEN_LIMIT_UNLIMITED, description: 'No monthly cap' },
]

export const AI_TOKEN_LIMIT_CUSTOM = 'custom'

export function isUnlimitedTokenLimit(limit: number | null | undefined): boolean {
  return limit === AI_TOKEN_LIMIT_UNLIMITED
}

export function formatTokenLimit(limit: number | null | undefined): string {
  if (limit == null) return 'Global default'
  if (isUnlimitedTokenLimit(limit)) return 'Unlimited'
  return limit.toLocaleString()
}

export function parseTokenLimitInput(raw: string): number | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  const value = Number(trimmed)
  if (!Number.isFinite(value)) return null
  if (value === AI_TOKEN_LIMIT_UNLIMITED) return AI_TOKEN_LIMIT_UNLIMITED
  if (value > 0) return value
  return null
}

export function isValidTokenLimit(limit: number): boolean {
  return isUnlimitedTokenLimit(limit) || limit > 0
}

export function presetValueForLimit(limit: number): string {
  const match = AI_TOKEN_LIMIT_PRESETS.find((preset) => preset.value === limit)
  return match ? String(match.value) : AI_TOKEN_LIMIT_CUSTOM
}
