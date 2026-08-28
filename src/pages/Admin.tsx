import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { fetchAdminData, deleteAdminRecord, type AdminData, type AdminDeleteResource } from '../lib/admin'
import AdminAgentSettingsTable from '../components/AdminAgentSettingsTable'
import AdminApiKeysTable from '../components/admin/AdminApiKeysTable'
import AdminGmailTokensTable from '../components/admin/AdminGmailTokensTable'
import AdminSquareTokensTable from '../components/admin/AdminSquareTokensTable'
import AdminUsersTable from '../components/admin/AdminUsersTable'
import ImportAgentSettingsEnv from '../components/admin/ImportAgentSettingsEnv'

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
              <AdminUsersTable
                users={data.users}
                currentUserId={user?.id}
                isDeleting={(id) => isDeleting('user', id)}
                onDelete={(id, email) =>
                  handleDelete(
                    'user',
                    id,
                    email,
                    `Delete user ${email}? This removes their profile, API keys, Gmail tokens, and agent settings.`,
                  )
                }
              />
            </Section>

            <Section title="API Keys" count={data.apiKeys.length}>
              <AdminApiKeysTable
                apiKeys={data.apiKeys}
                isDeleting={(id) => isDeleting('api_key', id)}
                onDelete={(id, name) => handleDelete('api_key', id, `API key ${name}`)}
              />
            </Section>

            <Section title="Gmail Tokens" count={data.gmailTokens.length}>
              <AdminGmailTokensTable
                gmailTokens={data.gmailTokens}
                isDeleting={(id) => isDeleting('gmail_token', id)}
                onDelete={(id, label) => handleDelete('gmail_token', id, `Gmail token for ${label}`)}
              />
            </Section>

            <Section title="Square Tokens" count={(data.squareTokens ?? []).length}>
              <AdminSquareTokensTable
                squareTokens={data.squareTokens ?? []}
                isDeleting={(id) => isDeleting('square_token', id)}
                onDelete={(id, label) => handleDelete('square_token', id, `Square token for ${label}`)}
              />
            </Section>

            <Section title="Agent Settings" count={(data.agentSettings ?? []).length}>
              <div className="px-6 py-4 border-b border-navy-900/5 flex flex-wrap items-center gap-3">
                <Link
                  to="/admin/agent-settings/new"
                  className="inline-flex items-center text-sm font-medium bg-navy-900 text-cream px-4 py-2 rounded-lg hover:bg-navy-800 transition-colors"
                >
                  Add Agent Settings
                </Link>
                <ImportAgentSettingsEnv
                  users={data.users.map((user) => ({ id: user.id, email: user.email }))}
                  apiKeys={data.apiKeys}
                  onImported={loadData}
                />
              </div>
              <AdminAgentSettingsTable
                settings={data.agentSettings ?? []}
                isDeleting={isDeleting}
                onDelete={(id, name) => handleDelete('agent_settings', id, `agent settings ${name}`)}
              />
            </Section>
          </div>
        ) : null}
      </div>
    </div>
  )
}
