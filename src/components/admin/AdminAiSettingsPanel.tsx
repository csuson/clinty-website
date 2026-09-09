import { useCallback, useEffect, useState } from 'react'
import { inputClass } from '../../constants/forms'
import {
  AI_TOKEN_LIMIT_CUSTOM,
  AI_TOKEN_LIMIT_PRESETS,
  AI_TOKEN_LIMIT_UNLIMITED,
  formatTokenLimit,
  isValidTokenLimit,
  parseTokenLimitInput,
  presetValueForLimit,
} from '../../constants/aiTokenLimits'
import { fetchAdminAiSettings, updateAdminAiSettings } from '../../lib/aiUsage'
import type { Profile } from '../../types/database'

function LimitPresetSelect({
  id,
  value,
  onChange,
  disabled,
}: {
  id: string
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}) {
  return (
    <select id={id} value={value} onChange={(event) => onChange(event.target.value)} className={inputClass} disabled={disabled}>
      {AI_TOKEN_LIMIT_PRESETS.map((preset) => (
        <option key={preset.value} value={String(preset.value)}>
          {preset.label}
          {preset.description ? ` — ${preset.description}` : ''}
        </option>
      ))}
      <option value={AI_TOKEN_LIMIT_CUSTOM}>Custom amount…</option>
    </select>
  )
}

export default function AdminAiSettingsPanel({ users }: { users: Profile[] }) {
  const [globalPreset, setGlobalPreset] = useState(String(AI_TOKEN_LIMIT_PRESETS[1]?.value ?? 100_000))
  const [globalCustom, setGlobalCustom] = useState('')
  const [selectedUserId, setSelectedUserId] = useState('')
  const [userPreset, setUserPreset] = useState('')
  const [userCustom, setUserCustom] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const loadSettings = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchAdminAiSettings()
      const preset = presetValueForLimit(data.monthly_token_limit)
      setGlobalPreset(preset)
      if (preset === AI_TOKEN_LIMIT_CUSTOM) {
        setGlobalCustom(String(data.monthly_token_limit))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load AI settings')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadSettings()
  }, [loadSettings])

  useEffect(() => {
    if (!selectedUserId) {
      setUserPreset('')
      setUserCustom('')
      return
    }

    const profile = users.find((user) => user.id === selectedUserId)
    if (profile?.ai_monthly_token_limit == null) {
      setUserPreset('')
      setUserCustom('')
      return
    }

    const preset = presetValueForLimit(profile.ai_monthly_token_limit)
    setUserPreset(preset)
    setUserCustom(preset === AI_TOKEN_LIMIT_CUSTOM ? String(profile.ai_monthly_token_limit) : '')
  }, [selectedUserId, users])

  function resolveLimit(preset: string, custom: string): number | null {
    if (preset === AI_TOKEN_LIMIT_CUSTOM) {
      return parseTokenLimitInput(custom)
    }
    return parseTokenLimitInput(preset)
  }

  async function handleSaveGlobalLimit() {
    const limit = resolveLimit(globalPreset, globalCustom)
    if (limit == null || !isValidTokenLimit(limit)) {
      setError('Choose a preset or enter a valid custom limit (positive number or unlimited).')
      return
    }

    setSaving(true)
    setError(null)
    setMessage(null)

    try {
      await updateAdminAiSettings({ monthly_token_limit: limit })
      setMessage(`Global monthly limit set to ${formatTokenLimit(limit)}.`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update global limit')
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveUserLimit() {
    if (!selectedUserId) {
      setError('Select a user first.')
      return
    }

    const limit = resolveLimit(userPreset, userCustom)
    if (limit == null || !isValidTokenLimit(limit)) {
      setError('Choose a preset or enter a valid custom limit (positive number or unlimited).')
      return
    }

    setSaving(true)
    setError(null)
    setMessage(null)

    try {
      await updateAdminAiSettings({ user_id: selectedUserId, ai_monthly_token_limit: limit })
      setMessage(`User override set to ${formatTokenLimit(limit)} per month.`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update user limit')
    } finally {
      setSaving(false)
    }
  }

  async function handleClearUserOverride() {
    if (!selectedUserId) return

    setSaving(true)
    setError(null)
    setMessage(null)

    try {
      await updateAdminAiSettings({ user_id: selectedUserId, clear_user_override: true })
      setUserPreset('')
      setUserCustom('')
      setMessage('User override cleared. They now use the global limit.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear user override')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="px-6 py-5 space-y-6">
      <div className="max-w-3xl space-y-3">
        <p className="text-sm text-navy-600">
          AI token usage is tracked for prompt background generation and H5P content generation.
          Limits apply per calendar month (UTC). Users see usage on Prompts, H5P Builder, and Analytics.
        </p>
        <div className="rounded-xl border border-navy-900/10 bg-cream/40 px-4 py-3">
          <p className="text-xs font-semibold text-navy-800 mb-2">Suggested limits</p>
          <ul className="text-xs text-navy-600 space-y-1">
            {AI_TOKEN_LIMIT_PRESETS.map((preset) => (
              <li key={preset.value}>
                <span className="font-medium text-navy-800">{preset.label}</span>
                {preset.description ? ` — ${preset.description}` : ''}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-navy-600">Loading AI settings…</p>
      ) : (
        <>
          {message && (
            <div className="rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-900">
              {message}
            </div>
          )}
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
              {error}
            </div>
          )}

          <div className="grid lg:grid-cols-2 gap-6">
            <section className="rounded-xl border border-navy-900/10 p-5 space-y-4">
              <h3 className="text-sm font-semibold text-navy-900">Global monthly limit</h3>
              <label className="block">
                <span className="block text-xs font-medium text-navy-600 mb-1">Preset</span>
                <LimitPresetSelect
                  id="global-ai-limit-preset"
                  value={globalPreset}
                  onChange={setGlobalPreset}
                  disabled={saving}
                />
              </label>
              {globalPreset === AI_TOKEN_LIMIT_CUSTOM && (
                <label className="block">
                  <span className="block text-xs font-medium text-navy-600 mb-1">Custom tokens per month</span>
                  <input
                    type="number"
                    min={AI_TOKEN_LIMIT_UNLIMITED}
                    step={1000}
                    value={globalCustom}
                    onChange={(event) => setGlobalCustom(event.target.value)}
                    placeholder="Use -1 for unlimited"
                    className={inputClass}
                  />
                </label>
              )}
              <button
                type="button"
                onClick={() => void handleSaveGlobalLimit()}
                disabled={saving}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-navy-900 text-cream hover:bg-navy-800 disabled:opacity-60"
              >
                Save global limit
              </button>
            </section>

            <section className="rounded-xl border border-navy-900/10 p-5 space-y-4">
              <h3 className="text-sm font-semibold text-navy-900">Per-user override</h3>
              <label className="block">
                <span className="block text-xs font-medium text-navy-600 mb-1">User</span>
                <select
                  value={selectedUserId}
                  onChange={(event) => setSelectedUserId(event.target.value)}
                  className={inputClass}
                >
                  <option value="">Select user…</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.email}
                      {user.ai_monthly_token_limit != null
                        ? ` (override: ${formatTokenLimit(user.ai_monthly_token_limit)})`
                        : ''}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="block text-xs font-medium text-navy-600 mb-1">Preset</span>
                <LimitPresetSelect
                  id="user-ai-limit-preset"
                  value={userPreset || String(AI_TOKEN_LIMIT_PRESETS[1]?.value ?? 100_000)}
                  onChange={setUserPreset}
                  disabled={!selectedUserId || saving}
                />
              </label>
              {userPreset === AI_TOKEN_LIMIT_CUSTOM && (
                <label className="block">
                  <span className="block text-xs font-medium text-navy-600 mb-1">Custom tokens per month</span>
                  <input
                    type="number"
                    min={AI_TOKEN_LIMIT_UNLIMITED}
                    step={1000}
                    value={userCustom}
                    onChange={(event) => setUserCustom(event.target.value)}
                    disabled={!selectedUserId}
                    placeholder="Use -1 for unlimited"
                    className={inputClass}
                  />
                </label>
              )}
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void handleSaveUserLimit()}
                  disabled={saving || !selectedUserId}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-navy-900 text-cream hover:bg-navy-800 disabled:opacity-60"
                >
                  Save user override
                </button>
                <button
                  type="button"
                  onClick={() => void handleClearUserOverride()}
                  disabled={saving || !selectedUserId}
                  className="px-4 py-2 rounded-lg text-sm font-medium border border-navy-900/15 text-navy-800 hover:bg-navy-900/5 disabled:opacity-60"
                >
                  Clear override
                </button>
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  )
}
