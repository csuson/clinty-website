import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

export type AiFeature = 'prompt_background' | 'h5p_generate'

export type OpenAiUsage = {
  prompt_tokens: number
  completion_tokens: number
  total_tokens: number
}

const DEFAULT_MONTHLY_LIMIT = 100_000
export const AI_TOKEN_LIMIT_UNLIMITED = -1

export function isUnlimitedTokenLimit(limit: number): boolean {
  return limit === AI_TOKEN_LIMIT_UNLIMITED
}

export function readOpenAiUsage(data: unknown): OpenAiUsage {
  const usage = (data as { usage?: Record<string, unknown> })?.usage
  const prompt = Number(usage?.prompt_tokens ?? 0)
  const completion = Number(usage?.completion_tokens ?? 0)
  const total = Number(usage?.total_tokens ?? prompt + completion)
  return {
    prompt_tokens: Number.isFinite(prompt) ? prompt : 0,
    completion_tokens: Number.isFinite(completion) ? completion : 0,
    total_tokens: Number.isFinite(total) ? total : 0,
  }
}

function monthStartIso(): string {
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString()
}

export async function getPlatformMonthlyLimit(admin: SupabaseClient): Promise<number> {
  const { data, error } = await admin
    .from('platform_ai_settings')
    .select('monthly_token_limit')
    .eq('id', 1)
    .maybeSingle()

  if (error || data?.monthly_token_limit == null) {
    return DEFAULT_MONTHLY_LIMIT
  }

  return data.monthly_token_limit
}

export async function getUserMonthlyTokenLimit(
  admin: SupabaseClient,
  userId: string,
): Promise<number> {
  const [{ data: profile }, platformLimit] = await Promise.all([
    admin.from('profiles').select('ai_monthly_token_limit').eq('id', userId).maybeSingle(),
    getPlatformMonthlyLimit(admin),
  ])

  const override = profile?.ai_monthly_token_limit
  if (typeof override === 'number' && (override > 0 || isUnlimitedTokenLimit(override))) {
    return override
  }

  return platformLimit
}

export async function getMonthlyTokenUsage(admin: SupabaseClient, userId: string): Promise<number> {
  const { data, error } = await admin
    .from('ai_usage_events')
    .select('total_tokens')
    .eq('user_id', userId)
    .gte('created_at', monthStartIso())

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []).reduce((sum, row) => sum + (row.total_tokens ?? 0), 0)
}

export async function assertWithinTokenLimit(admin: SupabaseClient, userId: string): Promise<void> {
  const [used, limit] = await Promise.all([
    getMonthlyTokenUsage(admin, userId),
    getUserMonthlyTokenLimit(admin, userId),
  ])

  if (isUnlimitedTokenLimit(limit)) {
    return
  }

  if (used >= limit) {
    throw new Error(
      `Monthly AI token limit reached (${used.toLocaleString()} / ${limit.toLocaleString()}). Contact support to increase your limit.`,
    )
  }
}

export async function logAiUsage(
  admin: SupabaseClient,
  input: {
    user_id: string
    feature: AiFeature
    model: string
    usage: OpenAiUsage
  },
): Promise<void> {
  const { error } = await admin.from('ai_usage_events').insert({
    user_id: input.user_id,
    feature: input.feature,
    model: input.model,
    prompt_tokens: input.usage.prompt_tokens,
    completion_tokens: input.usage.completion_tokens,
    total_tokens: input.usage.total_tokens,
  })

  if (error) {
    throw new Error(error.message)
  }
}

export async function buildUsageSummary(admin: SupabaseClient, userId: string) {
  const monthStart = monthStartIso()
  const [limit, eventsRes] = await Promise.all([
    getUserMonthlyTokenLimit(admin, userId),
    admin
      .from('ai_usage_events')
      .select('feature, total_tokens, created_at')
      .eq('user_id', userId)
      .gte('created_at', monthStart)
      .order('created_at', { ascending: false }),
  ])

  if (eventsRes.error) {
    throw new Error(eventsRes.error.message)
  }

  const events = eventsRes.data ?? []
  const tokens_used = events.reduce((sum, row) => sum + (row.total_tokens ?? 0), 0)
  const by_feature: Record<string, number> = {}

  for (const row of events) {
    const feature = row.feature ?? 'unknown'
    by_feature[feature] = (by_feature[feature] ?? 0) + (row.total_tokens ?? 0)
  }

  const unlimited = isUnlimitedTokenLimit(limit)

  return {
    period: 'month',
    month_start: monthStart,
    tokens_used,
    tokens_limit: limit,
    tokens_remaining: unlimited ? null : Math.max(0, limit - tokens_used),
    unlimited_limit: unlimited,
    limit_reached: unlimited ? false : tokens_used >= limit,
    by_feature,
    recent_events: events.slice(0, 20).map((row) => ({
      feature: row.feature,
      total_tokens: row.total_tokens,
      created_at: row.created_at,
    })),
  }
}
