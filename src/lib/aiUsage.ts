import { supabase } from './supabase'
import { getFunctionErrorMessage } from './supabaseFunctions'
import { isUnlimitedTokenLimit } from '../constants/aiTokenLimits'

export type AiUsageSummary = {
  period: 'month'
  month_start: string
  tokens_used: number
  tokens_limit: number
  tokens_remaining: number | null
  unlimited_limit: boolean
  limit_reached: boolean
  by_feature: Record<string, number>
  recent_events: Array<{
    feature: string
    total_tokens: number
    created_at: string
  }>
  analytics_user_id?: string
}

export type AiTokenUsage = {
  prompt_tokens: number
  completion_tokens: number
  total_tokens: number
}

export function formatAiFeature(feature: string): string {
  switch (feature) {
    case 'prompt_background':
      return 'Prompt background'
    case 'h5p_generate':
      return 'H5P generation'
    default:
      return feature.replace(/_/g, ' ')
  }
}

export function formatAiUsageLimit(limit: number): string {
  if (isUnlimitedTokenLimit(limit)) return 'Unlimited'
  return limit.toLocaleString()
}

export async function fetchAiUsageSummary(userId?: string): Promise<AiUsageSummary> {
  if (!supabase) {
    throw new Error('Supabase is not configured.')
  }

  const result = await supabase.functions.invoke('ai-usage-summary', {
    body: userId ? { user_id: userId } : {},
    timeout: 30_000,
  })

  if (result.error || hasFunctionFailure(result.data)) {
    throw new Error(
      await getFunctionErrorMessage(result.error, result.data, {
        timeoutMessage: 'AI usage stats timed out. Refresh the page to try again.',
      }),
    )
  }

  return result.data as AiUsageSummary
}

export async function fetchAdminAiSettings(): Promise<{ monthly_token_limit: number }> {
  if (!supabase) {
    throw new Error('Supabase is not configured.')
  }

  const result = await supabase.functions.invoke('admin-ai-settings', {
    body: { action: 'get' },
  })

  if (result.error || hasFunctionFailure(result.data)) {
    throw new Error(await getFunctionErrorMessage(result.error, result.data))
  }

  return result.data as { monthly_token_limit: number }
}

export async function updateAdminAiSettings(input: {
  monthly_token_limit?: number
  user_id?: string
  ai_monthly_token_limit?: number
  clear_user_override?: boolean
}): Promise<Record<string, unknown>> {
  if (!supabase) {
    throw new Error('Supabase is not configured.')
  }

  let body: Record<string, unknown>
  if (input.clear_user_override && input.user_id) {
    body = { action: 'clear_user_override', user_id: input.user_id }
  } else if (input.user_id && input.ai_monthly_token_limit != null) {
    body = { action: 'update', user_id: input.user_id, monthly_token_limit: input.ai_monthly_token_limit }
  } else if (input.monthly_token_limit != null) {
    body = { action: 'update', monthly_token_limit: input.monthly_token_limit }
  } else {
    throw new Error('Missing AI settings update payload')
  }

  const result = await supabase.functions.invoke('admin-ai-settings', { body })

  if (result.error || hasFunctionFailure(result.data)) {
    throw new Error(await getFunctionErrorMessage(result.error, result.data))
  }

  return result.data as Record<string, unknown>
}

function hasFunctionFailure(data: unknown): boolean {
  return Boolean(
    data &&
      typeof data === 'object' &&
      'error' in data &&
      typeof (data as { error?: unknown }).error === 'string' &&
      (data as { error: string }).error,
  )
}
