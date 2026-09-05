import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { inputClass } from '../../constants/forms'
import { isAdminEmail } from '../../constants/admin'
import { useAuth } from '../../context/AuthContext'
import { fetchAdminData } from '../../lib/admin'
import {
  AnalyticsRequestError,
  fetchAnalyticsSummary,
  fetchInboundAnalytics,
  formatAnalyticsTenant,
  formatInboundSource,
  totalInboundStored,
  weeklyVolumeFromAnalytics,
  type AnalyticsSummary,
  type AnalyticsTenant,
  type InboundSummary,
  type WeeklyVolumePoint,
} from '../../lib/analytics'

const PERIOD_OPTIONS = [
  { label: '7 days', value: 7 },
  { label: '30 days', value: 30 },
  { label: '90 days', value: 90 },
] as const

function StatCard({
  label,
  value,
  sub,
}: {
  label: string
  value: string
  sub?: string
}) {
  return (
    <div className="bg-white rounded-2xl border border-navy-900/5 p-5 shadow-sm">
      <div className="text-2xl md:text-3xl font-bold text-navy-900 mb-1">{value}</div>
      <div className="text-sm font-medium text-navy-900">{label}</div>
      {sub ? <div className="text-xs text-navy-600 mt-1">{sub}</div> : null}
    </div>
  )
}

function niceMax(value: number): number {
  if (value <= 1) return 1
  const magnitude = 10 ** Math.floor(Math.log10(value))
  const scaled = value / magnitude
  const nice = scaled <= 1 ? 1 : scaled <= 2 ? 2 : scaled <= 5 ? 5 : 10
  return nice * magnitude
}

function formatWeekLabel(weekStart: string): string {
  const parsed = new Date(`${weekStart}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) return weekStart.slice(5)
  return parsed.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function WeeklyVolumeChart({
  volume,
  ariaLabel = 'Weekly inbound and outbound message volume',
}: {
  volume: WeeklyVolumePoint[]
  ariaLabel?: string
}) {
  const [hoveredWeek, setHoveredWeek] = useState<string | null>(null)

  if (!volume.length) {
    return (
      <p className="text-sm text-navy-600">
        No inbound or outbound messages recorded yet for this period.
      </p>
    )
  }

  const max = niceMax(Math.max(...volume.flatMap((entry) => [entry.inbound, entry.outbound]), 1))
  const ticks = [max, max / 2, 0]
  const hovered = volume.find((entry) => entry.week_start === hoveredWeek) ?? null

  return (
    <div className="space-y-3" role="img" aria-label={ariaLabel}>
      <div className="flex flex-wrap items-center gap-4 text-xs text-navy-600">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-teal-400" />
          Inbound
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-navy-900" />
          Outbound
        </span>
        {hovered ? (
          <span className="sm:ml-auto font-medium text-navy-800">
            Week of {formatWeekLabel(hovered.week_start)} · {hovered.inbound} in · {hovered.outbound} out
          </span>
        ) : (
          <span className="sm:ml-auto text-navy-500">Hover a week for inbound and outbound counts</span>
        )}
      </div>

      <div className="flex gap-3">
        <div className="flex h-56 shrink-0 flex-col justify-between py-1 text-right text-[11px] text-navy-500">
          {ticks.map((tick) => (
            <span key={tick}>{Number.isInteger(tick) ? tick : tick.toFixed(1)}</span>
          ))}
        </div>

        <div className="min-w-0 flex-1">
          <div className="relative h-56">
            <div className="pointer-events-none absolute inset-0 flex flex-col justify-between py-1">
              {ticks.map((tick) => (
                <div key={tick} className="border-t border-navy-900/8" />
              ))}
            </div>

            <div className="absolute inset-0 flex items-end gap-3 px-1">
              {volume.map((entry) => {
                const isHovered = hoveredWeek === entry.week_start
                return (
                  <button
                    key={entry.week_start}
                    type="button"
                    className="group flex h-full min-w-0 flex-1 items-end justify-center gap-1"
                    onMouseEnter={() => setHoveredWeek(entry.week_start)}
                    onMouseLeave={() => setHoveredWeek(null)}
                    onFocus={() => setHoveredWeek(entry.week_start)}
                    onBlur={() => setHoveredWeek(null)}
                    aria-label={`Week of ${formatWeekLabel(entry.week_start)}: ${entry.inbound} inbound, ${entry.outbound} outbound`}
                  >
                    <div
                      className={`w-1/2 max-w-6 min-w-2 rounded-t-md bg-teal-400 transition-opacity ${
                        isHovered ? 'opacity-100' : 'opacity-90 group-hover:opacity-100'
                      }`}
                      style={{
                        height: entry.inbound === 0 ? '4px' : `${Math.max((entry.inbound / max) * 100, 2)}%`,
                        opacity: entry.inbound === 0 ? 0.25 : undefined,
                      }}
                    />
                    <div
                      className={`w-1/2 max-w-6 min-w-2 rounded-t-md bg-navy-900 transition-opacity ${
                        isHovered ? 'opacity-100' : 'opacity-90 group-hover:opacity-100'
                      }`}
                      style={{
                        height: entry.outbound === 0 ? '4px' : `${Math.max((entry.outbound / max) * 100, 2)}%`,
                        opacity: entry.outbound === 0 ? 0.2 : undefined,
                      }}
                    />
                  </button>
                )
              })}
            </div>
          </div>

          <div className="mt-2 flex gap-3 px-1">
            {volume.map((entry) => (
              <span
                key={entry.week_start}
                className="min-w-0 flex-1 text-center text-[10px] text-navy-500"
              >
                {formatWeekLabel(entry.week_start)}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function formatSeconds(seconds: number | null): string {
  if (seconds == null) return '—'
  if (seconds < 60) return `${Math.round(seconds)}s`
  const minutes = Math.floor(seconds / 60)
  const remainder = Math.round(seconds % 60)
  return `${minutes}m ${remainder}s`
}

export default function Analytics() {
  const { user, profile } = useAuth()
  const isAdmin = isAdminEmail(user?.email) || isAdminEmail(profile?.email)
  const [days, setDays] = useState(30)
  const [selectedUserId, setSelectedUserId] = useState<string | undefined>(undefined)
  const [tenants, setTenants] = useState<AnalyticsTenant[]>([])
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null)
  const [inbound, setInbound] = useState<InboundSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const showAccountPicker = isAdmin || tenants.length > 0

  const loadSummary = useCallback(async (periodDays: number, userId?: string) => {
    setLoading(true)
    setError(null)
    try {
      const [summaryData, inboundData] = await Promise.all([
        fetchAnalyticsSummary(periodDays, userId),
        fetchInboundAnalytics(periodDays, userId),
      ])
      setSummary(summaryData)
      setInbound(inboundData)
      if (summaryData.analytics_tenants?.length) {
        setTenants(summaryData.analytics_tenants)
      }
      if (summaryData.analytics_user_id && summaryData.analytics_user_id !== userId) {
        setSelectedUserId(summaryData.analytics_user_id)
      }
    } catch (err) {
      setSummary(null)
      setInbound(null)
      if (err instanceof AnalyticsRequestError) {
        if (err.tenants?.length) {
          setTenants(err.tenants)
        }
        if (err.analyticsUserId && err.analyticsUserId !== userId) {
          setSelectedUserId(err.analyticsUserId)
        }
      }
      setError(err instanceof Error ? err.message : 'Failed to load analytics')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!isAdmin) return
    let cancelled = false
    void fetchAdminData()
      .then((data) => {
        if (cancelled || data.users.length === 0) return
        setTenants((current) => {
          if (current.length > 0) return current
          return data.users.map((account) => ({
            user_id: account.id,
            email: account.email ?? null,
            name: account.full_name ?? null,
            company_name: account.company_name ?? null,
          }))
        })
      })
      .catch(() => {
        // Analytics responses may still populate the account list.
      })
    return () => {
      cancelled = true
    }
  }, [isAdmin])

  useEffect(() => {
    void loadSummary(days, selectedUserId)
  }, [days, selectedUserId, loadSummary])

  const totalResponses =
    (summary?.responses.whatsapp_sent ?? 0) + (summary?.responses.email_sent ?? 0)

  const inboundArchive = inbound ?? summary?.inbound
  const inboundTotal = totalInboundStored(inboundArchive)
  const weeklyVolume = weeklyVolumeFromAnalytics(
    summary?.weekly_volume,
    inboundArchive?.daily_volume ?? summary?.daily_volume ?? [],
    days,
  )

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-navy-900/5 p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
          <div>
            <h2 className="font-serif text-2xl text-navy-900 mb-2">Assistant Analytics</h2>
            <p className="text-sm text-navy-600">
              Message volume, triage outcomes, replies, bookings, and human review activity
              {showAccountPicker
                ? ' from any Clinty account’s deployed assistant.'
                : ' from your deployed assistant.'}
            </p>
          </div>
          <div className="flex flex-col sm:items-end gap-2">
            {showAccountPicker ? (
              <label className="block w-full sm:w-80">
                <span className="block text-xs font-medium text-navy-600 mb-1">Account</span>
                <select
                  value={selectedUserId ?? summary?.analytics_user_id ?? ''}
                  onChange={(event) => setSelectedUserId(event.target.value || undefined)}
                  className={inputClass}
                  disabled={tenants.length === 0}
                >
                  {tenants.length === 0 ? (
                    <option value="">Loading accounts…</option>
                  ) : (
                    tenants.map((tenant) => (
                      <option key={tenant.user_id} value={tenant.user_id}>
                        {formatAnalyticsTenant(tenant)}
                      </option>
                    ))
                  )}
                </select>
              </label>
            ) : null}
            <div className="flex gap-2">
              {PERIOD_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setDays(option.value)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    days === option.value
                      ? 'bg-navy-900 text-cream'
                      : 'bg-navy-900/5 text-navy-700 hover:bg-navy-900/10'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {loading ? (
          <p className="text-sm text-navy-600">Loading analytics…</p>
        ) : error ? (
          <div className="rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 space-y-3">
            <p>{error}</p>
            {/api key/i.test(error) ? (
              <ul className="list-disc pl-5 space-y-1 text-red-800/90">
                <li>
                  Generate a key in{' '}
                  <Link to="/account/api-keys" className="underline font-medium">
                    Account → API Keys
                  </Link>
                </li>
                <li>Ask your admin to link that key in Agent Settings (Clinty API Key field)</li>
                <li>Confirm the assistant LangGraph URL is set in Agent Settings</li>
              </ul>
            ) : null}
          </div>
        ) : summary ? (
          <div className="space-y-8">
            {!summary.analytics_enabled && summary.note ? (
              <div className="rounded-xl bg-amber-400/10 border border-amber-400/20 text-navy-800 text-sm px-4 py-3">
                {summary.note}
              </div>
            ) : null}

            <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
              <StatCard
                label="Messages received"
                value={String(summary.messages.total_received)}
                sub={`WhatsApp ${summary.messages.whatsapp_received} · Email ${summary.messages.email_received}`}
              />
              <StatCard
                label="Replies sent"
                value={String(totalResponses)}
                sub={`${summary.responses.auto_sent} automatic · ${summary.responses.manual_approved} approved`}
              />
              <StatCard
                label="Bookings"
                value={String(summary.bookings.created)}
                sub={
                  summary.bookings.failed > 0
                    ? `${summary.bookings.failed} failed`
                    : 'Appointments created'
                }
              />
              <StatCard
                label="Avg response time"
                value={formatSeconds(summary.performance.avg_response_time_seconds)}
                sub="Inbound message to first reply"
              />
            </div>

            <div className="grid lg:grid-cols-2 gap-4">
              <section className="rounded-2xl border border-navy-900/5 p-5">
                <h3 className="text-sm font-semibold text-navy-900 mb-4">Triage decisions</h3>
                <dl className="grid grid-cols-3 gap-3 mb-4">
                  <div>
                    <dt className="text-xs text-navy-600">Respond</dt>
                    <dd className="text-xl font-semibold text-navy-900">{summary.triage.respond}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-navy-600">Ignore</dt>
                    <dd className="text-xl font-semibold text-navy-900">{summary.triage.ignore}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-navy-600">Review</dt>
                    <dd className="text-xl font-semibold text-navy-900">{summary.triage.notify}</dd>
                  </div>
                </dl>
                {Object.keys(summary.triage.by_request_type).length > 0 ? (
                  <ul className="space-y-1 text-sm text-navy-700">
                    {Object.entries(summary.triage.by_request_type).map(([type, count]) => (
                      <li key={type} className="flex justify-between gap-4">
                        <span className="capitalize">{type.replace(/_/g, ' ')}</span>
                        <span className="font-medium text-navy-900">{count}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-navy-600">No request-type breakdown yet.</p>
                )}
              </section>

              <section className="rounded-2xl border border-navy-900/5 p-5">
                <h3 className="text-sm font-semibold text-navy-900 mb-4">Human review (HITL)</h3>
                <dl className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="text-xs text-navy-600">Triage reviews</dt>
                    <dd className="text-lg font-semibold text-navy-900">{summary.hitl.triage_reviewed}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-navy-600">Tool reviews</dt>
                    <dd className="text-lg font-semibold text-navy-900">{summary.hitl.tool_reviewed}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-navy-600">Approved</dt>
                    <dd className="text-lg font-semibold text-navy-900">{summary.hitl.approved}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-navy-600">Edited</dt>
                    <dd className="text-lg font-semibold text-navy-900">{summary.hitl.edited}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-navy-600">Ignored</dt>
                    <dd className="text-lg font-semibold text-navy-900">{summary.hitl.ignored}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-navy-600">Feedback replies</dt>
                    <dd className="text-lg font-semibold text-navy-900">
                      {summary.hitl.responded_with_feedback}
                    </dd>
                  </div>
                </dl>
              </section>
            </div>

            <section className="rounded-2xl border border-navy-900/5 p-5">
              <div className="flex items-center justify-between gap-4 mb-4">
                <h3 className="text-sm font-semibold text-navy-900">Weekly inbound and outbound volume</h3>
                {summary.tenant_schema ? (
                  <span className="text-xs text-navy-500">Schema: {summary.tenant_schema}</span>
                ) : null}
              </div>
              <WeeklyVolumeChart volume={weeklyVolume} />
            </section>

            {inboundArchive ? (
              <section className="rounded-2xl border border-navy-900/5 p-5 space-y-5">
                <div>
                  <h3 className="text-sm font-semibold text-navy-900 mb-1">Inbound message archive</h3>
                  <p className="text-sm text-navy-600">
                    Stored email and WhatsApp requests for statistics and marketing, including
                    filtered messages that never reached the agent.
                  </p>
                </div>

                {!inboundArchive.inbound_storage_enabled && inboundArchive.note ? (
                  <div className="rounded-xl bg-amber-400/10 border border-amber-400/20 text-navy-800 text-sm px-4 py-3">
                    {inboundArchive.note}
                  </div>
                ) : null}

                <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
                  <StatCard
                    label="Stored messages"
                    value={String(inboundTotal)}
                    sub={`${inboundArchive.totals.dispatched} dispatched to agent`}
                  />
                  <StatCard
                    label="Filtered / skipped"
                    value={String(inboundArchive.totals.filtered)}
                    sub="Sender, keyword, or empty-body filters"
                  />
                  <StatCard
                    label="Dispatch failures"
                    value={String(inboundArchive.totals.failed)}
                    sub="Messages that failed to reach the agent"
                  />
                  <StatCard
                    label="Awaiting disposition"
                    value={String(inboundArchive.totals.received)}
                    sub="Logged but not yet updated"
                  />
                </div>

                <div className="grid lg:grid-cols-2 gap-4">
                  <section className="rounded-xl border border-navy-900/5 p-4">
                    <h4 className="text-sm font-semibold text-navy-900 mb-3">By channel</h4>
                    {Object.keys(inboundArchive.by_channel).length > 0 ? (
                      <ul className="space-y-2 text-sm text-navy-700">
                        {Object.entries(inboundArchive.by_channel).map(([channel, stats]) => (
                          <li key={channel} className="flex justify-between gap-4">
                            <span className="capitalize">{channel}</span>
                            <span className="font-medium text-navy-900">
                              {stats.total}
                              <span className="text-navy-500 font-normal">
                                {' '}
                                ({stats.dispatched} dispatched, {stats.filtered} filtered)
                              </span>
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-navy-600">No archived messages yet.</p>
                    )}
                  </section>

                  <section className="rounded-xl border border-navy-900/5 p-4">
                    <h4 className="text-sm font-semibold text-navy-900 mb-3">By source</h4>
                    {Object.keys(inboundArchive.by_source).length > 0 ? (
                      <ul className="space-y-2 text-sm text-navy-700">
                        {Object.entries(inboundArchive.by_source).map(([source, count]) => (
                          <li key={source} className="flex justify-between gap-4">
                            <span>{formatInboundSource(source)}</span>
                            <span className="font-medium text-navy-900">{count}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-navy-600">No source breakdown yet.</p>
                    )}
                  </section>
                </div>

                {inboundArchive.top_senders.length > 0 ? (
                  <section className="rounded-xl border border-navy-900/5 p-4">
                    <h4 className="text-sm font-semibold text-navy-900 mb-3">Top senders</h4>
                    <ul className="space-y-2 text-sm text-navy-700">
                      {inboundArchive.top_senders.slice(0, 10).map((entry) => (
                        <li
                          key={`${entry.channel}:${entry.sender}`}
                          className="flex justify-between gap-4"
                        >
                          <span className="truncate">
                            {entry.sender}
                            <span className="text-navy-500"> · {entry.channel}</span>
                          </span>
                          <span className="font-medium text-navy-900 shrink-0">{entry.count}</span>
                        </li>
                      ))}
                    </ul>
                  </section>
                ) : null}

                {inboundArchive.privacy ? (
                  <section className="rounded-xl border border-navy-900/5 p-4">
                    <h4 className="text-sm font-semibold text-navy-900 mb-2">Privacy policy</h4>
                    <p className="text-sm text-navy-600">
                      Full sender and message previews are kept for{' '}
                      {inboundArchive.privacy.pii_redact_enabled
                        ? `${inboundArchive.privacy.pii_redact_days} days`
                        : 'the full retention window'}
                      , then redacted to hashed identifiers while counts and trends remain.
                      {inboundArchive.privacy.retention_enabled
                        ? ` Records are deleted after ${inboundArchive.privacy.retention_days} days.`
                        : ' Retention purge is disabled.'}
                    </p>
                  </section>
                ) : null}
              </section>
            ) : null}

            <section className="rounded-2xl border border-navy-900/5 p-5">
              <h3 className="text-sm font-semibold text-navy-900 mb-4">Pipeline health</h3>
              <dl className="grid sm:grid-cols-3 gap-4 text-sm">
                <div>
                  <dt className="text-xs text-navy-600">Dispatched to agent</dt>
                  <dd className="text-lg font-semibold text-navy-900">{summary.messages.dispatched}</dd>
                </div>
                <div>
                  <dt className="text-xs text-navy-600">Dispatch failures</dt>
                  <dd className="text-lg font-semibold text-navy-900">{summary.messages.dispatch_failed}</dd>
                </div>
                <div>
                  <dt className="text-xs text-navy-600">Daily email limit hits</dt>
                  <dd className="text-lg font-semibold text-navy-900">
                    {summary.messages.daily_limit_reached}
                  </dd>
                </div>
              </dl>
            </section>
          </div>
        ) : null}
      </div>
    </div>
  )
}
