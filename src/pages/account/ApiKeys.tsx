import { useCallback, useEffect, useState, type FormEvent } from 'react'
import FormField from '../../components/FormField'
import { inputClass } from '../../constants/forms'
import { useAuth } from '../../context/AuthContext'
import { generateApiKey, getKeyPrefix, hashApiKey, maskApiKey } from '../../lib/apiKeys'
import { supabase } from '../../lib/supabase'
import type { ApiKey } from '../../types/database'

export default function ApiKeys() {
  const { user } = useAuth()
  const [keys, setKeys] = useState<ApiKey[]>([])
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [newKey, setNewKey] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const loadKeys = useCallback(async () => {
    if (!supabase || !user) {
      setLoading(false)
      return
    }

    const { data, error: fetchError } = await supabase
      .from('api_keys')
      .select('id, user_id, name, key_prefix, key_hash, last_used_at, created_at, revoked_at')
      .eq('user_id', user.id)
      .is('revoked_at', null)
      .order('created_at', { ascending: false })

    if (!fetchError && data) {
      setKeys(data)
    }
    setLoading(false)
  }, [user])

  useEffect(() => {
    loadKeys()
  }, [loadKeys])

  async function handleGenerate(e: FormEvent) {
    e.preventDefault()
    if (!supabase || !user) return

    setGenerating(true)
    setError(null)
    setNewKey(null)

    const key = generateApiKey()
    const keyHash = await hashApiKey(key)
    const keyPrefix = getKeyPrefix(key)

    const { error: insertError } = await supabase.from('api_keys').insert({
      user_id: user.id,
      name: name.trim(),
      key_prefix: keyPrefix,
      key_hash: keyHash,
      key_secret: key,
    })

    setGenerating(false)

    if (insertError) {
      setError(insertError.message)
      return
    }

    setNewKey(key)
    setName('')
    await loadKeys()
  }

  async function handleRevoke(keyId: string) {
    if (!supabase) return

    const { error: revokeError } = await supabase
      .from('api_keys')
      .update({ revoked_at: new Date().toISOString() })
      .eq('id', keyId)

    if (!revokeError) {
      await loadKeys()
    }
  }

  async function handleCopy() {
    if (!newKey) return
    await navigator.clipboard.writeText(newKey)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-6">
      <section className="bg-white rounded-2xl border border-navy-900/5 p-8 shadow-sm">
        <h2 className="text-lg font-semibold text-navy-900 mb-1">Generate API key</h2>
        <p className="text-sm text-navy-600 mb-6">
          Create keys to integrate Clinty with your apps, CRM, or custom workflows. Keys are stored
          securely — we only show the full key once at creation.
        </p>

        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 mb-5">
            {error}
          </div>
        )}

        {newKey && (
          <div className="rounded-xl bg-teal-400/10 border border-teal-400/20 p-5 mb-6">
            <p className="text-sm font-medium text-navy-900 mb-2">
              Copy your API key now — you won&apos;t be able to see it again.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <code className="flex-1 bg-navy-900 text-teal-400 text-xs sm:text-sm px-4 py-3 rounded-lg font-mono break-all">
                {newKey}
              </code>
              <button
                onClick={handleCopy}
                className="shrink-0 bg-navy-900 text-cream text-sm font-medium px-4 py-3 rounded-lg hover:bg-navy-800 transition-colors"
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>
        )}

        <form onSubmit={handleGenerate} className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <FormField label="Key name" id="key-name" required>
              <input
                id="key-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="e.g. Production CRM"
                className={inputClass}
                disabled={generating}
              />
            </FormField>
          </div>
          <button
            type="submit"
            disabled={generating || !name.trim()}
            className="sm:self-end bg-navy-900 text-cream font-medium px-6 py-3 rounded-xl hover:bg-navy-800 transition-colors disabled:opacity-60 whitespace-nowrap"
          >
            {generating ? 'Generating...' : 'Generate Key'}
          </button>
        </form>
      </section>

      <section className="bg-white rounded-2xl border border-navy-900/5 p-8 shadow-sm">
        <h2 className="text-lg font-semibold text-navy-900 mb-4">Active keys</h2>

        {loading ? (
          <p className="text-sm text-navy-600">Loading keys...</p>
        ) : keys.length === 0 ? (
          <p className="text-sm text-navy-600 py-4">No API keys yet. Generate one above to get started.</p>
        ) : (
          <ul className="divide-y divide-navy-900/5">
            {keys.map((key) => (
              <li key={key.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-4 first:pt-0 last:pb-0">
                <div>
                  <div className="font-medium text-navy-900 text-sm">{key.name}</div>
                  <code className="text-xs text-navy-600 font-mono">{maskApiKey(key.key_prefix)}</code>
                  <div className="text-xs text-navy-600 mt-1">
                    Created{' '}
                    {new Date(key.created_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </div>
                </div>
                <button
                  onClick={() => handleRevoke(key.id)}
                  className="text-sm text-red-600 hover:text-red-700 font-medium self-start sm:self-center"
                >
                  Revoke
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="bg-cream rounded-2xl border border-navy-900/5 p-6">
        <h3 className="text-sm font-semibold text-navy-900 mb-2">Using your API key</h3>
        <p className="text-xs text-navy-600 mb-3">
          Include your key in the Authorization header of API requests:
        </p>
        <code className="block bg-navy-900 text-teal-400 text-xs px-4 py-3 rounded-lg font-mono">
          Authorization: Bearer clinty_sk_your_key_here
        </code>
      </section>
    </div>
  )
}
