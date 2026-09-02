import { supabase } from './supabase'
import { getFunctionErrorMessage } from './supabaseFunctions'

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
}

const ANALYTICS_TIMEOUT_MS = 30_000

export async function fetchAnalyticsSummary(days = 30): Promise<AnalyticsSummary> {
  if (!supabase) {
    throw new Error('Supabase is not configured.')
  }

  const result = await supabase.functions.invoke('analytics-summary', {
    body: { days },
    timeout: ANALYTICS_TIMEOUT_MS,
  })

  if (result.error || hasFunctionFailure(result.data)) {
    throw new Error(await getFunctionErrorMessage(result.error, result.data))
  }

  return result.data as AnalyticsSummary
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
