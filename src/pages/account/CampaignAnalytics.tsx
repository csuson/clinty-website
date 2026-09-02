import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type {
  AdCampaignAnalyticsReport,
  AdCampaignDailyPoint,
  AdPlatformAnalytics,
} from '../../constants/adCampaigns'
import { fetchAdCampaignAnalytics } from '../../lib/adCampaigns'
import { fetchPlatformCredentialsForPublish } from '../../lib/googleAds/credentials'

const PERIOD_OPTIONS = [
  { label: '7 days', value: 7 },
  { label: '30 days', value: 30 },
  { label: '90 days', value: 90 },
] as const

function money(value: number): string {
  return value.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
}

function count(value: number): string {
  return value.toLocaleString('en-US', { maximumFractionDigits: 1 })
}

function percent(value: number): string {
  return `${(value * 100).toFixed(2)}%`
}

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

function DailyChart({ daily }: { daily: AdCampaignDailyPoint[] }) {
  if (!daily.length) {
    return <p className="text-sm text-navy-600">No daily spend yet for this period.</p>
  }

  const maxSpend = Math.max(...daily.map((point) => point.spend_usd), 1)
  const maxClicks = Math.max(...daily.map((point) => point.clicks), 1)
  const barWidth = Math.min(28, Math.floor(560 / Math.max(daily.length, 1)) - 4)

  return (
    <svg
      viewBox={`0 0 ${Math.max(daily.length * (barWidth + 8), 240)} 120`}
      className="w-full h-auto"
      role="img"
      aria-label="Daily ad spend and clicks"
    >
      {daily.map((point, index) => {
        const x = index * (barWidth + 8) + 4
        const spendHeight = (point.spend_usd / maxSpend) * 72
        const clickHeight = (point.clicks / maxClicks) * 72
        return (
          <g key={point.date}>
            <rect
              x={x}
              y={96 - spendHeight}
              width={barWidth / 2}
              height={spendHeight}
              rx="2"
              className="fill-navy-900"
            />
            <rect
              x={x + barWidth / 2}
              y={96 - clickHeight}
              width={barWidth / 2}
              height={clickHeight}
              rx="2"
              className="fill-teal-400"
            />
            <text
              x={x + barWidth / 2}
              y="112"
              textAnchor="middle"
              className="fill-navy-600 text-[8px]"
            >
              {point.date.slice(5)}
            </text>
          </g>
        )
      })}
      <g transform={`translate(${Math.max(daily.length * (barWidth + 8) - 88, 8)}, 8)`}>
        <rect width="8" height="8" rx="2" className="fill-navy-900" />
        <text x="12" y="7" className="fill-navy-600 text-[8px]">Spend</text>
        <rect y="14" width="8" height="8" rx="2" className="fill-teal-400" />
        <text x="12" y="21" className="fill-navy-600 text-[8px]">Clicks</text>
      </g>
    </svg>
  )
}

function PlatformTable({ platforms }: { platforms: AdPlatformAnalytics[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wide text-navy-500">
            <th className="pb-2 font-medium">Platform</th>
            <th className="pb-2 font-medium">Spend</th>
            <th className="pb-2 font-medium">Impr.</th>
            <th className="pb-2 font-medium">Clicks</th>
            <th className="pb-2 font-medium">CTR</th>
            <th className="pb-2 font-medium">Avg CPC</th>
            <th className="pb-2 font-medium">Conv.</th>
            <th className="pb-2 font-medium">CPA</th>
          </tr>
        </thead>
        <tbody>
          {platforms.map((platform) => (
            <tr key={platform.platform} className="border-t border-navy-900/5">
              <td className="py-2.5 font-medium text-navy-900">
                {platform.label}
                {!platform.connected && platform.error ? (
                  <div className="text-xs font-normal text-navy-500 mt-0.5">{platform.error}</div>
                ) : null}
              </td>
              <td className="py-2.5">{platform.connected ? money(platform.spend_usd) : '—'}</td>
              <td className="py-2.5">{platform.connected ? count(platform.impressions) : '—'}</td>
              <td className="py-2.5">{platform.connected ? count(platform.clicks) : '—'}</td>
              <td className="py-2.5">{platform.connected ? percent(platform.ctr) : '—'}</td>
              <td className="py-2.5">{platform.connected ? money(platform.cpc_usd) : '—'}</td>
              <td className="py-2.5">{platform.connected ? count(platform.conversions) : '—'}</td>
              <td className="py-2.5">{platform.connected && platform.conversions > 0 ? money(platform.cpa_usd) : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function CampaignAnalytics() {
  const [days, setDays] = useState(30)
  const [report, setReport] = useState<AdCampaignAnalyticsReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadReport = useCallback(async (periodDays: number) => {
    setLoading(true)
    setError(null)
    try {
      const credentials = await fetchPlatformCredentialsForPublish()
      setReport(await fetchAdCampaignAnalytics(periodDays, ['google', 'facebook', 'yelp'], credentials))
    } catch (err) {
      setReport(null)
      setError(err instanceof Error ? err.message : 'Failed to load campaign analytics')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadReport(days)
  }, [days, loadReport])

  const totals = report?.totals
  const campaigns = report?.platforms.flatMap((platform) =>
    platform.campaigns.map((campaign) => ({ ...campaign, platform: platform.label })),
  ) ?? []
  const keywords = report?.platforms.flatMap((platform) => platform.keywords) ?? []

  return (
    <section className="bg-white rounded-2xl border border-navy-900/5 p-8 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-lg font-semibold text-navy-900 mb-1">Campaign performance</h2>
          <p className="text-sm text-navy-600">
            Spend, traffic, and conversions from the Google Ads, Meta, and Yelp accounts
            connected under{' '}
            <Link to="/account/integrations" className="text-[#4285F4] hover:underline">
              Integrations
            </Link>
            . Numbers come from the ad platforms — paused campaigns stay at zero until you enable them.
          </p>
        </div>
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

      {loading ? (
        <p className="text-sm text-navy-600">Loading performance…</p>
      ) : error ? (
        <div className="rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3">
          {error}
        </div>
      ) : report && totals ? (
        <div className="space-y-8">
          {report.note ? (
            <div className="rounded-xl bg-amber-400/10 border border-amber-400/20 text-navy-800 text-sm px-4 py-3">
              {report.note}
            </div>
          ) : null}

          <p className="text-xs text-navy-500">
            {report.start_date} to {report.end_date}
          </p>

          <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <StatCard
              label="Spend"
              value={money(totals.spend_usd)}
              sub="What you were billed this period"
            />
            <StatCard
              label="Clicks"
              value={count(totals.clicks)}
              sub={`${count(totals.impressions)} impressions · ${percent(totals.ctr)} CTR`}
            />
            <StatCard
              label="Avg CPC"
              value={totals.clicks > 0 ? money(totals.cpc_usd) : '—'}
              sub="Average cost per click"
            />
            <StatCard
              label="Conversions"
              value={count(totals.conversions)}
              sub={
                totals.conversions > 0
                  ? `${money(totals.cpa_usd)} CPA · ${percent(totals.conversion_rate)} conv. rate`
                  : 'Leads, bookings, or sales from ads'
              }
            />
          </div>

          <div>
            <h3 className="text-sm font-semibold text-navy-900 mb-3">By platform</h3>
            <PlatformTable platforms={report.platforms} />
          </div>

          <div>
            <h3 className="text-sm font-semibold text-navy-900 mb-3">Daily spend and clicks</h3>
            <DailyChart daily={report.daily} />
          </div>

          {campaigns.length > 0 ? (
            <div>
              <h3 className="text-sm font-semibold text-navy-900 mb-3">Campaigns</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wide text-navy-500">
                      <th className="pb-2 font-medium">Campaign</th>
                      <th className="pb-2 font-medium">Platform</th>
                      <th className="pb-2 font-medium">Status</th>
                      <th className="pb-2 font-medium">Spend</th>
                      <th className="pb-2 font-medium">Clicks</th>
                      <th className="pb-2 font-medium">CTR</th>
                      <th className="pb-2 font-medium">Conv.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {campaigns.map((campaign) => (
                      <tr key={`${campaign.platform}-${campaign.id}-${campaign.name}`} className="border-t border-navy-900/5">
                        <td className="py-2.5 font-medium text-navy-900">{campaign.name}</td>
                        <td className="py-2.5 text-navy-600">{campaign.platform}</td>
                        <td className="py-2.5 text-navy-600">{campaign.status || '—'}</td>
                        <td className="py-2.5">{money(campaign.spend_usd)}</td>
                        <td className="py-2.5">{count(campaign.clicks)}</td>
                        <td className="py-2.5">{percent(campaign.ctr)}</td>
                        <td className="py-2.5">{count(campaign.conversions)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          {keywords.length > 0 ? (
            <div>
              <h3 className="text-sm font-semibold text-navy-900 mb-3">Top Google keywords</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wide text-navy-500">
                      <th className="pb-2 font-medium">Keyword</th>
                      <th className="pb-2 font-medium">Match</th>
                      <th className="pb-2 font-medium">Clicks</th>
                      <th className="pb-2 font-medium">Spend</th>
                      <th className="pb-2 font-medium">CPC</th>
                      <th className="pb-2 font-medium">Conv.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {keywords.map((keyword) => (
                      <tr key={`${keyword.match_type}-${keyword.text}`} className="border-t border-navy-900/5">
                        <td className="py-2.5 font-medium text-navy-900">{keyword.text}</td>
                        <td className="py-2.5 uppercase text-xs text-navy-500">{keyword.match_type}</td>
                        <td className="py-2.5">{count(keyword.clicks)}</td>
                        <td className="py-2.5">{money(keyword.spend_usd)}</td>
                        <td className="py-2.5">{money(keyword.cpc_usd)}</td>
                        <td className="py-2.5">{count(keyword.conversions)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}
