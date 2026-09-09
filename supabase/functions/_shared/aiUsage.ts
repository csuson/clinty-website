import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { parseAdminNotificationEmails, sendTransactionalEmail } from './transactionalEmail.ts'

export type AiFeature =
  | 'prompt_background'
  | 'h5p_generate'
  | 'assistant_triage'
  | 'assistant_agent'
  | 'assistant_memory'
  | 'assistant_storefront'

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

function monthStartDate(): string {
  const now = new Date()
  const year = now.getUTCFullYear()
  const month = String(now.getUTCMonth() + 1).padStart(2, '0')
  return `${year}-${month}-01`
}

function formatTokenCount(value: number): string {
  return value.toLocaleString('en-US')
}

function usagePercent(used: number, limit: number): number {
  if (limit <= 0) return 0
  return Math.round((used / limit) * 100)
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

async function loadAlertState(
  admin: SupabaseClient,
  userId: string,
  monthStart: string,
) {
  const { data, error } = await admin
    .from('ai_usage_alert_state')
    .select('alert_90_sent_at, alert_100_sent_at')
    .eq('user_id', userId)
    .eq('month_start', monthStart)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  return data
}

async function markAlertSent(
  admin: SupabaseClient,
  userId: string,
  monthStart: string,
  field: 'alert_90_sent_at' | 'alert_100_sent_at',
): Promise<void> {
  const now = new Date().toISOString()
  const { data: updatedRows, error: updateError } = await admin
    .from('ai_usage_alert_state')
    .update({ [field]: now })
    .eq('user_id', userId)
    .eq('month_start', monthStart)
    .select('user_id')

  if (updateError) {
    throw new Error(updateError.message)
  }

  if (updatedRows?.length) {
    return
  }

  const { error: insertError } = await admin.from('ai_usage_alert_state').insert({
    user_id: userId,
    month_start: monthStart,
    [field]: now,
  })

  if (insertError) {
    throw new Error(insertError.message)
  }
}

async function sendUsageAlertEmails(input: {
  userEmail: string
  userName: string | null
  used: number
  limit: number
  threshold: 'warning' | 'limit'
}): Promise<void> {
  const adminEmails = parseAdminNotificationEmails()
  const percent = usagePercent(input.used, input.limit)
  const displayName = input.userName?.trim() || input.userEmail
  const subject =
    input.threshold === 'warning'
      ? `Clinty AI usage at ${percent}% of monthly limit`
      : 'Clinty AI monthly token limit reached'

  const intro =
    input.threshold === 'warning'
      ? `Your Clinty account has used ${formatTokenCount(input.used)} of ${formatTokenCount(input.limit)} AI tokens this month (${percent}%).`
      : `Your Clinty account has reached its monthly AI token limit (${formatTokenCount(input.used)} / ${formatTokenCount(input.limit)} tokens).`

  const userBody = `
    <p>Hi ${displayName},</p>
    <p>${intro}</p>
    <p>${
      input.threshold === 'warning'
        ? 'Assistant features will stop when you reach 100% of your limit. Contact support if you need a higher limit.'
        : 'New AI assistant requests are paused until your usage resets next month or your limit is increased.'
    }</p>
    <p>— Clinty</p>
  `.trim()

  const adminBody = `
    <p>AI usage alert for <strong>${displayName}</strong> (${input.userEmail}).</p>
    <p>${intro}</p>
    <p>Threshold: ${input.threshold === 'warning' ? '90% warning' : '100% limit reached'}.</p>
  `.trim()

  await Promise.all([
    sendTransactionalEmail({
      to: input.userEmail,
      subject,
      html: userBody,
      text: intro,
    }),
    adminEmails.length > 0
      ? sendTransactionalEmail({
        to: adminEmails,
        subject: `[Admin] ${subject} — ${displayName}`,
        html: adminBody,
        text: `${displayName} (${input.userEmail}): ${intro}`,
      })
      : Promise.resolve(false),
  ])
}

export async function maybeSendUsageAlerts(
  admin: SupabaseClient,
  userId: string,
  summary: Awaited<ReturnType<typeof buildUsageSummary>>,
): Promise<void> {
  if (summary.unlimited_limit || summary.tokens_limit <= 0) {
    return
  }

  const monthStart = monthStartDate()
  const used = summary.tokens_used
  const limit = summary.tokens_limit
  const warningThreshold = Math.ceil(limit * 0.9)

  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('email, full_name')
    .eq('id', userId)
    .maybeSingle()

  if (profileError) {
    throw new Error(profileError.message)
  }

  if (!profile?.email) {
    console.warn(`No profile email for user ${userId}; skipping usage alert emails`)
    return
  }

  const alertState = await loadAlertState(admin, userId, monthStart)

  if (used >= limit && !alertState?.alert_100_sent_at) {
    if (used >= warningThreshold && !alertState?.alert_90_sent_at) {
      await sendUsageAlertEmails({
        userEmail: profile.email,
        userName: profile.full_name,
        used,
        limit,
        threshold: 'warning',
      })
      await markAlertSent(admin, userId, monthStart, 'alert_90_sent_at')
    }

    await sendUsageAlertEmails({
      userEmail: profile.email,
      userName: profile.full_name,
      used,
      limit,
      threshold: 'limit',
    })
    await markAlertSent(admin, userId, monthStart, 'alert_100_sent_at')
    return
  }

  if (used >= warningThreshold && used < limit && !alertState?.alert_90_sent_at) {
    await sendUsageAlertEmails({
      userEmail: profile.email,
      userName: profile.full_name,
      used,
      limit,
      threshold: 'warning',
    })
    await markAlertSent(admin, userId, monthStart, 'alert_90_sent_at')
  }
}

export async function recordAiUsageWithAlerts(
  admin: SupabaseClient,
  input: {
    user_id: string
    feature: AiFeature
    model: string
    usage: OpenAiUsage
  },
): Promise<Awaited<ReturnType<typeof buildUsageSummary>>> {
  await logAiUsage(admin, input)
  const summary = await buildUsageSummary(admin, input.user_id)
  await maybeSendUsageAlerts(admin, input.user_id, summary)
  return summary
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
