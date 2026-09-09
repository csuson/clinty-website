import { Link } from 'react-router-dom'
import { formatAiFeature, type AiUsageSummary } from '../lib/aiUsage'
import { formatTokenLimit, isUnlimitedTokenLimit } from '../constants/aiTokenLimits'

export default function AiUsageMeter({
  usage,
  loading,
  compact = false,
  showFeatureBreakdown = false,
  lastCallTokens,
}: {
  usage: AiUsageSummary | null
  loading?: boolean
  compact?: boolean
  showFeatureBreakdown?: boolean
  lastCallTokens?: number | null
}) {
  if (loading) {
    return <p className="text-xs text-navy-500">Loading AI usage…</p>
  }

  if (!usage) {
    return null
  }

  const unlimited = isUnlimitedTokenLimit(usage.tokens_limit)
  const limitLabel = formatTokenLimit(usage.tokens_limit)
  const usageLabel = unlimited
    ? `${usage.tokens_used.toLocaleString()} tokens used this month (unlimited)`
    : `${usage.tokens_used.toLocaleString()} / ${limitLabel} tokens this month`

  if (compact) {
    return (
      <div className="space-y-1">
        <p className={`text-xs ${usage.limit_reached ? 'text-red-700' : 'text-navy-500'}`}>
          {usageLabel}
          {usage.limit_reached ? ' — limit reached' : ''}
        </p>
        {!unlimited && (
          <div className="h-1.5 w-full max-w-xs rounded-full bg-navy-900/10 overflow-hidden">
            <div
              className={`h-full rounded-full ${usage.limit_reached ? 'bg-red-500' : 'bg-teal-500'}`}
              style={{
                width: `${Math.min(100, Math.round((usage.tokens_used / Math.max(usage.tokens_limit, 1)) * 100))}%`,
              }}
            />
          </div>
        )}
        {lastCallTokens != null && (
          <p className="text-xs text-teal-800">Last call: {lastCallTokens.toLocaleString()} tokens</p>
        )}
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-navy-900/10 bg-cream/40 px-4 py-3 space-y-2">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <p className={`text-sm ${usage.limit_reached ? 'text-red-700 font-medium' : 'text-navy-700'}`}>
          {usageLabel}
        </p>
        <Link to="/account/analytics" className="text-xs font-medium text-teal-700 hover:text-teal-800">
          View in Analytics →
        </Link>
      </div>

      {!unlimited && (
        <div className="h-2 w-full rounded-full bg-navy-900/10 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${usage.limit_reached ? 'bg-red-500' : 'bg-teal-500'}`}
            style={{
              width: `${Math.min(100, Math.round((usage.tokens_used / Math.max(usage.tokens_limit, 1)) * 100))}%`,
            }}
          />
        </div>
      )}

      {usage.limit_reached && (
        <p className="text-xs text-red-700">
          Monthly AI token limit reached. Contact support or ask an admin to increase your limit.
        </p>
      )}

      {lastCallTokens != null && (
        <p className="text-xs text-teal-800">Last call used {lastCallTokens.toLocaleString()} tokens.</p>
      )}

      {showFeatureBreakdown && Object.keys(usage.by_feature).length > 0 && (
        <div className="text-xs text-navy-600 space-y-1 pt-1 border-t border-navy-900/5">
          {Object.entries(usage.by_feature).map(([feature, tokens]) => (
            <p key={feature}>
              {formatAiFeature(feature)}: {tokens.toLocaleString()} tokens
            </p>
          ))}
        </div>
      )}
    </div>
  )
}
