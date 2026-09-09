import { useCallback, useEffect, useState } from 'react'
import { fetchAiUsageSummary, type AiUsageSummary } from '../lib/aiUsage'
import { isUnlimitedTokenLimit } from '../constants/aiTokenLimits'

export function useAiUsage(userId?: string) {
  const [usage, setUsage] = useState<AiUsageSummary | null>(null)
  const [loading, setLoading] = useState(Boolean(userId))

  const refresh = useCallback(async () => {
    if (!userId) {
      setUsage(null)
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      setUsage(await fetchAiUsageSummary(userId))
    } catch {
      setUsage(null)
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const unlimited = usage ? isUnlimitedTokenLimit(usage.tokens_limit) : false

  return {
    usage,
    loading,
    refresh,
    unlimited,
    limitReached: unlimited ? false : (usage?.limit_reached ?? false),
  }
}
