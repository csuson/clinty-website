import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { fetchAdminData, deleteAdminRecord, type AdminData, type AdminDeleteResource, type AdminGmailToken } from '../lib/admin'
import { downloadTokenJson, gmailTokenToPayload } from '../lib/gmail/oauth'
import { SecretValue } from '../components/SecretField'
import AdminDeleteButton from '../components/AdminDeleteButton'

function formatDate(value: string | null): string {
  if (!value) return '—'
  return new Date(value).toLocaleString()
}

function truncate(value: string, length = 24): string {
  if (value.length <= length) return value
  return `${value.slice(0, length)}…`
}

function SecretCell({ value }: { value: string | null }) {
  if (!value) return <span className="text-navy-500">—</span>
  return <SecretValue value={value} truncateLength={20} />
}

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    await navigator.clipboard.writeText(value)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1500)
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="text-xs font-medium text-teal-600 hover:text-teal-700"
      title={`Copy ${label}`}
    >
      {copied ? 'Copied' : 'Copy'}
    </button>
  )
}

function tokenJsonFilename(token: AdminGmailToken): string {
  const label = token.google_account ?? token.user_email ?? token.user_id
  const safe = label.replace(/[^a-zA-Z0-9._-]+/g, '_')
  return safe ? `token-${safe}.json` : 'token.json'
}

function DownloadTokenButton({ token }: { token: AdminGmailToken }) {
  function handleDownload() {
    downloadTokenJson(gmailTokenToPayload(token), tokenJsonFilename(token))
  }

  return (
    <button
      type="button"
      onClick={handleDownload}
      className="inline-flex items-center gap-1.5 text-xs font-medium text-teal-600 hover:text-teal-700 whitespace-nowrap"
      title="Download token.json"
    >
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
      </svg>
      token.json
    </button>
  )
}

function Section({
  title,
  count,
  children,
}: {
  title: string
  count: number
  children: React.ReactNode
}) {
  return (
    <section className="bg-white rounded-2xl border border-navy-900/5 overflow-hidden">
      <div className="px-6 py-4 border-b border-navy-900/5 flex items-center justify-between gap-4">
        <h2 className="font-serif text-xl text-navy-900">{title}</h2>
        <span className="text-sm text-navy-500">{count} total</span>
      </div>
      <div className="overflow-x-auto">{children}</div>
    </section>
  )
}

function Table({
  headers,
  rows,
  emptyMessage,
}: {
  headers: string[]
  rows: React.ReactNode
  emptyMessage: string
}) {
  const isEmpty = !rows

  return (
    <table className="min-w-full text-sm">
      <thead className="bg-navy-900/[0.03] text-left text-navy-600">
        <tr>
          {headers.map((header) => (
            <th key={header} className="px-4 py-3 font-medium whitespace-nowrap">
              {header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-navy-900/5 text-navy-800">
        {isEmpty ? (
          <tr>
            <td colSpan={headers.length} className="px-4 py-8 text-center text-navy-500">
              {emptyMessage}
            </td>
          </tr>
        ) : (
          rows
        )}
      </tbody>
    </table>
  )
}

export default function Admin() {
  const { user } = useAuth()
  const [data, setData] = useState<AdminData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deletingKey, setDeletingKey] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      setData(await fetchAdminData())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load admin data')
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  async function handleDelete(resource: AdminDeleteResource, id: string, label: string, confirmMessage?: string) {
    const message = confirmMessage ?? `Delete ${label}? This cannot be undone.`
    if (!window.confirm(message)) return

    const key = `${resource}:${id}`
    setDeletingKey(key)
    setError(null)

    try {
      await deleteAdminRecord(resource, id)
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete record')
    } finally {
      setDeletingKey(null)
    }
  }

  function isDeleting(resource: AdminDeleteResource, id: string): boolean {
    return deletingKey === `${resource}:${id}`
  }

  return (
    <div className="pt-28 pb-24 px-6">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-teal-600 mb-1">Admin</p>
            <h1 className="font-serif text-3xl md:text-4xl text-navy-900 mb-1">Dashboard</h1>
            <p className="text-navy-600 text-sm">Signed in as {user?.email}</p>
          </div>
          <div className="flex items-center gap-3 self-start">
            <Link
              to="/account"
              className="text-sm font-medium border border-navy-900/15 text-navy-900 px-4 py-2 rounded-lg hover:bg-navy-900/5 transition-colors"
            >
              Back to Account
            </Link>
            <button
              type="button"
              onClick={loadData}
              disabled={loading}
              className="text-sm font-medium bg-navy-900 text-cream px-4 py-2 rounded-lg hover:bg-navy-800 transition-colors disabled:opacity-60"
            >
              {loading ? 'Refreshing…' : 'Refresh'}
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading && !data ? (
          <div className="text-navy-600 text-sm">Loading admin data…</div>
        ) : data ? (
          <div className="space-y-8">
            <Section title="Users" count={data.users.length}>
              <Table
                headers={['Email', 'Name', 'Company', 'Plan', 'Billing', 'Trial ends', 'Created', '']}
                emptyMessage="No users yet."
                rows={
                  data.users.length > 0
                    ? data.users.map((profile) => (
                        <tr key={profile.id}>
                          <td className="px-4 py-3 whitespace-nowrap">{profile.email}</td>
                          <td className="px-4 py-3 whitespace-nowrap">{profile.full_name ?? '—'}</td>
                          <td className="px-4 py-3 whitespace-nowrap">{profile.company_name ?? '—'}</td>
                          <td className="px-4 py-3 whitespace-nowrap capitalize">{profile.plan}</td>
                          <td className="px-4 py-3 whitespace-nowrap capitalize">{profile.billing_status.replace('_', ' ')}</td>
                          <td className="px-4 py-3 whitespace-nowrap">{formatDate(profile.trial_ends_at)}</td>
                          <td className="px-4 py-3 whitespace-nowrap">{formatDate(profile.created_at)}</td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <AdminDeleteButton
                              label={profile.email}
                              disabled={isDeleting('user', profile.id) || profile.id === user?.id}
                              onDelete={() =>
                                handleDelete(
                                  'user',
                                  profile.id,
                                  profile.email,
                                  `Delete user ${profile.email}? This removes their profile, API keys, Gmail tokens, and agent settings.`,
                                )
                              }
                            />
                          </td>
                        </tr>
                      ))
                    : null
                }
              />
            </Section>

            <Section title="API Keys" count={data.apiKeys.length}>
              <Table
                headers={['User', 'Name', 'API Key', 'Prefix', 'Hash', 'Created', 'Last used', 'Status', '']}
                emptyMessage="No API keys yet."
                rows={
                  data.apiKeys.length > 0
                    ? data.apiKeys.map((key) => (
                        <tr key={key.id}>
                          <td className="px-4 py-3 whitespace-nowrap">{key.user_email ?? key.user_id}</td>
                          <td className="px-4 py-3 whitespace-nowrap">{key.name}</td>
                          <td className="px-4 py-3">
                            {key.key_secret ? (
                              <div className="flex items-center gap-2 flex-wrap">
                                <SecretValue value={key.key_secret} truncateLength={32} />
                                <CopyButton value={key.key_secret} label="API key" />
                              </div>
                            ) : (
                              <span className="text-xs text-navy-500">Not stored (created before secret column)</span>
                            )}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap font-mono text-xs">{key.key_prefix}</td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="font-mono text-xs">{truncate(key.key_hash, 16)}</span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">{formatDate(key.created_at)}</td>
                          <td className="px-4 py-3 whitespace-nowrap">{formatDate(key.last_used_at)}</td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {key.revoked_at ? (
                              <span className="text-red-600">Revoked</span>
                            ) : (
                              <span className="text-teal-600">Active</span>
                            )}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <AdminDeleteButton
                              label={`API key ${key.name}`}
                              disabled={isDeleting('api_key', key.id)}
                              onDelete={() => handleDelete('api_key', key.id, `API key ${key.name}`)}
                            />
                          </td>
                        </tr>
                      ))
                    : null
                }
              />
            </Section>

            <Section title="Gmail Tokens" count={data.gmailTokens.length}>
              <Table
                headers={['User', 'Google account', 'Access token', 'Refresh token', 'Expiry', 'Scopes', 'Updated', 'Download', '']}
                emptyMessage="No Gmail tokens stored yet."
                rows={
                  data.gmailTokens.length > 0
                    ? data.gmailTokens.map((token) => (
                        <tr key={token.user_id}>
                          <td className="px-4 py-3 whitespace-nowrap">{token.user_email ?? token.user_id}</td>
                          <td className="px-4 py-3 whitespace-nowrap">{token.google_account ?? '—'}</td>
                          <td className="px-4 py-3">
                            <span className="font-mono text-xs">{truncate(token.access_token, 20)}</span>
                          </td>
                          <td className="px-4 py-3">
                            {token.refresh_token ? (
                              <span className="font-mono text-xs">{truncate(token.refresh_token, 20)}</span>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">{formatDate(token.expiry)}</td>
                          <td className="px-4 py-3 min-w-48">
                            <span className="text-xs text-navy-600">{token.scopes.join(', ') || '—'}</span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">{formatDate(token.updated_at)}</td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <DownloadTokenButton token={token} />
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <AdminDeleteButton
                              label={`Gmail token for ${token.google_account ?? token.user_email ?? token.user_id}`}
                              disabled={isDeleting('gmail_token', token.user_id)}
                              onDelete={() =>
                                handleDelete(
                                  'gmail_token',
                                  token.user_id,
                                  `Gmail token for ${token.google_account ?? token.user_email ?? token.user_id}`,
                                )
                              }
                            />
                          </td>
                        </tr>
                      ))
                    : null
                }
              />
            </Section>

            <Section title="Agent Settings" count={(data.agentSettings ?? []).length}>
              <div className="px-6 py-4 border-b border-navy-900/5">
                <Link
                  to="/admin/agent-settings/new"
                  className="inline-flex items-center text-sm font-medium bg-navy-900 text-cream px-4 py-2 rounded-lg hover:bg-navy-800 transition-colors"
                >
                  Add Agent Settings
                </Link>
              </div>
              <Table
                headers={[
                  'User',
                  'Name',
                  'Clinty API Key',
                  'LangGraph Key',
                  'URL',
                  'Graph ID',
                  'OpenAPI Key',
                  'Database URI',
                  'Redis URI',
                  'Secrets Dir',
                  'Calendar',
                  'Square Token',
                  'Square Location',
                  'Square Variation',
                  'Square Version',
                  'Square Team',
                  'Square TZ',
                  'Created',
                  'Updated',
                  '',
                ]}
                emptyMessage="No agent settings yet."
                rows={
                  data.agentSettings?.length
                    ? data.agentSettings.map((settings) => (
                        <tr key={settings.id}>
                          <td className="px-4 py-3 whitespace-nowrap">{settings.user_email ?? settings.user_id}</td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              <span>{settings.name}</span>
                              <Link
                                to={`/admin/agent-settings/${settings.id}/edit`}
                                className="text-xs font-medium text-teal-600 hover:text-teal-700 underline"
                              >
                                Edit
                              </Link>
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {settings.clinty_api_key_id ? (
                              <div className="space-y-1">
                                <div className="text-xs font-medium text-navy-900">
                                  {settings.clinty_api_key_name ?? settings.clinty_api_key_id}
                                </div>
                                {settings.clinty_api_key_secret ? (
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <SecretValue value={settings.clinty_api_key_secret} truncateLength={24} />
                                    <CopyButton value={settings.clinty_api_key_secret} label="Clinty API key" />
                                  </div>
                                ) : (
                                  <span className="text-xs text-navy-500">Linked key (secret not stored)</span>
                                )}
                              </div>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td className="px-4 py-3"><SecretCell value={settings.langgraph_api_key} /></td>
                          <td className="px-4 py-3"><SecretCell value={settings.url} /></td>
                          <td className="px-4 py-3 whitespace-nowrap">{settings.graph_id ?? '—'}</td>
                          <td className="px-4 py-3"><SecretCell value={settings.openapi_key} /></td>
                          <td className="px-4 py-3"><SecretCell value={settings.database_uri} /></td>
                          <td className="px-4 py-3"><SecretCell value={settings.redis_uri} /></td>
                          <td className="px-4 py-3 whitespace-nowrap">{settings.secrets_dir ?? '—'}</td>
                          <td className="px-4 py-3 whitespace-nowrap">{settings.calendar_provider ?? '—'}</td>
                          <td className="px-4 py-3"><SecretCell value={settings.square_access_token} /></td>
                          <td className="px-4 py-3 whitespace-nowrap">{settings.square_location_id ?? '—'}</td>
                          <td className="px-4 py-3 whitespace-nowrap">{settings.square_service_variation_id ?? '—'}</td>
                          <td className="px-4 py-3 whitespace-nowrap">{settings.square_service_variation_version ?? '—'}</td>
                          <td className="px-4 py-3 whitespace-nowrap">{settings.square_team_member_id ?? '—'}</td>
                          <td className="px-4 py-3 whitespace-nowrap">{settings.square_timezone ?? '—'}</td>
                          <td className="px-4 py-3 whitespace-nowrap">{formatDate(settings.created_at)}</td>
                          <td className="px-4 py-3 whitespace-nowrap">{formatDate(settings.updated_at)}</td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <AdminDeleteButton
                              label={`agent settings ${settings.name}`}
                              disabled={isDeleting('agent_settings', settings.id)}
                              onDelete={() =>
                                handleDelete('agent_settings', settings.id, `agent settings ${settings.name}`)
                              }
                            />
                          </td>
                        </tr>
                      ))
                    : null
                }
              />
            </Section>
          </div>
        ) : null}
      </div>
    </div>
  )
}
