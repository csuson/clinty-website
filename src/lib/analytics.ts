import { supabase } from './supabase'
import { getFunctionErrorMessage } from './supabaseFunctions'

export type AnalyticsTenant = {
  user_id: string
  email: string | null
  name: string | null
  company_name: string | null
}

export type InboundChannelStats = {
  received: number
  dispatched: number
  filtered: number
  failed: number
  total: number
}

export type InboundSummary = {
  period_days: number
  tenant_schema: string | null
  inbound_storage_enabled: boolean
  note?: string
  privacy?: {
    pii_redact_days: number
    retention_days: number
    pii_redact_enabled: boolean
    retention_enabled: boolean
    maintenance_interval_minutes: number
  }
  totals: {
    received: number
    dispatched: number
    filtered: number
    failed: number
  }
  by_channel: Record<string, InboundChannelStats>
  by_source: Record<string, number>
  top_senders: Array<{
    channel: string
    sender: string
    count: number
  }>
  daily_volume: Array<{
    date: string
    whatsapp: number
    email: number
    total: number
  }>
  analytics_user_id?: string
  analytics_tenants?: AnalyticsTenant[] | null
}

export type AnalyticsSummary = {
  period_days: number
  tenant_schema: string | null
  analytics_enabled: boolean
  note?: string
  messages: {
    total_received: number
    whatsapp_received: number
    email_received: number
    dispatched: number
    dispatch_failed: number
    daily_limit_reached: number
  }
  triage: {
    respond: number
    ignore: number
    notify: number
    by_request_type: Record<string, number>
  }
  responses: {
    whatsapp_sent: number
    email_sent: number
    auto_sent: number
    manual_approved: number
  }
  bookings: {
    created: number
    failed: number
  }
  hitl: {
    triage_reviewed: number
    tool_reviewed: number
    approved: number
    edited: number
    ignored: number
    responded_with_feedback: number
  }
  performance: {
    avg_response_time_seconds: number | null
  }
  daily_volume: Array<{
    date: string
    whatsapp: number
    email: number
    total: number
  }>
  weekly_volume?: WeeklyVolume[]
  inbound?: InboundSummary
  analytics_user_id?: string
  analytics_tenants?: AnalyticsTenant[] | null
}

export type WeeklyVolume = {
  week_start: string
  inbound: number
  outbound: number
}

export type WeeklyVolumePoint = {
  week_start: string
  inbound: number
  outbound: number
}

const ANALYTICS_TIMEOUT_MS = 30_000
const ANALYTICS_TIMEOUT_MESSAGE =
  'Analytics timed out before Clinty finished talking to the assistant. Try again, or confirm the LangGraph URL and Clinty API key in Agent Settings.'

export class AnalyticsRequestError extends Error {
  tenants: AnalyticsTenant[] | null
  analyticsUserId?: string

  constructor(message: string, tenants: AnalyticsTenant[] | null = null, analyticsUserId?: string) {
    super(message)
    this.name = 'AnalyticsRequestError'
    this.tenants = tenants
    this.analyticsUserId = analyticsUserId
  }
}

function readAnalyticsMeta(data: unknown): { tenants: AnalyticsTenant[] | null; analyticsUserId?: string } {
  if (!data || typeof data !== 'object') return { tenants: null }
  const record = data as { analytics_tenants?: unknown; analytics_user_id?: unknown }
  return {
    tenants: Array.isArray(record.analytics_tenants) ? record.analytics_tenants as AnalyticsTenant[] : null,
    analyticsUserId: typeof record.analytics_user_id === 'string' ? record.analytics_user_id : undefined,
  }
}

async function invokeAnalyticsFunction<T>(
  functionName: string,
  days: number,
  userId?: string,
): Promise<T> {
  if (!supabase) {
    throw new Error('Supabase is not configured.')
  }

  const result = await supabase.functions.invoke(functionName, {
    body: { days, user_id: userId },
    timeout: ANALYTICS_TIMEOUT_MS,
  })

  if (result.error || hasFunctionFailure(result.data)) {
    const meta = readAnalyticsMeta(result.data)
    throw new AnalyticsRequestError(
      await getFunctionErrorMessage(result.error, result.data, {
        timeoutMessage: ANALYTICS_TIMEOUT_MESSAGE,
      }),
      meta.tenants,
      meta.analyticsUserId,
    )
  }

  return result.data as T
}

export async function fetchAnalyticsSummary(days = 30, userId?: string): Promise<AnalyticsSummary> {
  return invokeAnalyticsFunction<AnalyticsSummary>('analytics-summary', days, userId)
}

export async function fetchInboundAnalytics(days = 30, userId?: string): Promise<InboundSummary> {
  return invokeAnalyticsFunction<InboundSummary>('analytics-inbound', days, userId)
}

export function formatAnalyticsTenant(tenant: AnalyticsTenant): string {
  const parts = [tenant.name, tenant.company_name, tenant.email].filter(Boolean)
  return parts.length > 0 ? parts.join(' · ') : tenant.user_id
}

function hasFunctionFailure(data: unknown): boolean {
  return Boolean(
    data
    && typeof data === 'object'
    && 'error' in data
    && typeof (data as { error?: unknown }).error === 'string'
    && (data as { error: string }).error,
  )
}

export function formatInboundSource(source: string): string {
  switch (source) {
    case 'gmail_ingest':
      return 'Gmail'
    case 'outlook_ingest':
      return 'Outlook'
    case 'yahoo_ingest':
      return 'Yahoo'
    case 'whatsapp_cloud':
      return 'WhatsApp Cloud'
    case 'whatsapp_web':
      return 'WhatsApp Web'
    default:
      return source.replace(/_/g, ' ')
  }
}

export function totalInboundStored(inbound: InboundSummary | undefined): number {
  if (!inbound) return 0
  const totals = inbound.totals
  return totals.received + totals.dispatched + totals.filtered + totals.failed
}

function parseIsoDate(value: string): Date {
  const parsed = new Date(`${value}T00:00:00`)
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed
}

function formatIsoDate(value: Date): string {
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function startOfWeekMonday(value: Date): Date {
  const date = new Date(value.getFullYear(), value.getMonth(), value.getDate())
  const weekday = date.getDay()
  date.setDate(date.getDate() + (weekday === 0 ? -6 : 1 - weekday))
  return date
}

export function weeklyVolumeFromAnalytics(
  weekly: WeeklyVolume[] | null | undefined,
  dailyInbound: AnalyticsSummary['daily_volume'],
  periodDays: number,
): WeeklyVolumePoint[] {
  if (weekly?.length) {
    return weekly.map((entry) => ({
      week_start: entry.week_start,
      inbound: entry.inbound,
      outbound: entry.outbound,
    }))
  }

  const today = startOfWeekMonday(new Date())
  const periodStart = new Date()
  periodStart.setHours(0, 0, 0, 0)
  periodStart.setDate(periodStart.getDate() - (Math.max(periodDays, 1) - 1))
  let week = startOfWeekMonday(periodStart)

  const inboundByWeek = new Map<string, number>()
  for (const entry of dailyInbound) {
    const key = formatIsoDate(startOfWeekMonday(parseIsoDate(entry.date)))
    inboundByWeek.set(key, (inboundByWeek.get(key) ?? 0) + entry.total)
  }

  const points: WeeklyVolumePoint[] = []
  while (week <= today) {
    const key = formatIsoDate(week)
    points.push({
      week_start: key,
      inbound: inboundByWeek.get(key) ?? 0,
      outbound: 0,
    })
    week = new Date(week.getFullYear(), week.getMonth(), week.getDate() + 7)
  }
  return points
}
