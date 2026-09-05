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
  type AnalyticsSummary,
  type AnalyticsTenant,
  type InboundSummary,
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

function DailyVolumeChart({
  volume,
  ariaLabel = 'Daily inbound message volume',
}: {
  volume: AnalyticsSummary['daily_volume']
  ariaLabel?: string
}) {
  if (!volume.length) {
    return (
      <p className="text-sm text-navy-600">
        No inbound messages recorded yet for this period.
      </p>
    )
  }

  const max = Math.max(...volume.map((entry) => entry.total), 1)
  const barWidth = Math.min(28, Math.floor(560 / Math.max(volume.length, 1)) - 4)

  return (
    <svg
      viewBox={`0 0 ${Math.max(volume.length * (barWidth + 8), 240)} 120`}
      className="w-full h-auto"
      role="img"
      aria-label={ariaLabel}
    >
      {volume.map((entry, index) => {
        const x = index * (barWidth + 8) + 4
        const whatsappHeight = (entry.whatsapp / max) * 72
        const emailHeight = (entry.email / max) * 72
        const baseY = 96
        return (
          <g key={entry.date}>
            {entry.email > 0 ? (
              <rect
                x={x}
                y={baseY - emailHeight - whatsappHeight}
                width={barWidth}
                height={emailHeight}
                rx="3"
                className="fill-navy-900/20"
              />
            ) : null}
            {entry.whatsapp > 0 ? (
              <rect
                x={x}
                y={baseY - whatsappHeight}
                width={barWidth}
                height={whatsappHeight}
                rx="3"
                className="fill-teal-400"
              />
            ) : null}
            <text
              x={x + barWidth / 2}
              y="112"
              textAnchor="middle"
              className="fill-navy-600 text-[8px]"
            >
              {entry.date.slice(5)}
            </text>
          </g>
        )
      })}
      <g transform={`translate(${Math.max(volume.length * (barWidth + 8) - 72, 8)}, 8)`}>
        <rect width="8" height="8" rx="2" className="fill-teal-400" />
        <text x="12" y="7" className="fill-navy-600 text-[8px]">WhatsApp</text>
        <rect y="14" width="8" height="8" rx="2" className="fill-navy-900/20" />
        <text x="12" y="21" className="fill-navy-600 text-[8px]">Email</text>
      </g>
    </svg>
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
  const inboundVolume = inboundArchive?.daily_volume ?? summary?.daily_volume ?? []

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
                <h3 className="text-sm font-semibold text-navy-900">Daily inbound volume</h3>
                {summary.tenant_schema ? (
                  <span className="text-xs text-navy-500">Schema: {summary.tenant_schema}</span>
                ) : null}
              </div>
              <DailyVolumeChart volume={inboundVolume} />
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
