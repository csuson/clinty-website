import { supabase } from './supabase'
import { getFunctionErrorMessage } from './supabaseFunctions'

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
  inbound?: InboundSummary
}

const ANALYTICS_TIMEOUT_MS = 30_000

async function invokeAnalyticsFunction<T>(functionName: string, days: number): Promise<T> {
  if (!supabase) {
    throw new Error('Supabase is not configured.')
  }

  const result = await supabase.functions.invoke(functionName, {
    body: { days },
    timeout: ANALYTICS_TIMEOUT_MS,
  })

  if (result.error || hasFunctionFailure(result.data)) {
    throw new Error(await getFunctionErrorMessage(result.error, result.data))
  }

  return result.data as T
}

export async function fetchAnalyticsSummary(days = 30): Promise<AnalyticsSummary> {
  return invokeAnalyticsFunction<AnalyticsSummary>('analytics-summary', days)
}

export async function fetchInboundAnalytics(days = 30): Promise<InboundSummary> {
  return invokeAnalyticsFunction<InboundSummary>('analytics-inbound', days)
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
