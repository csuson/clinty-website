import { useRef, useState } from 'react'
import { createAgentSettings, type AdminApiKey } from '../../lib/admin'
import {
  envFilenameToSettingsName,
  findApiKeyBySecret,
  parseEnvFile,
  parsedEnvToAgentSettingsInput,
  type ParsedEnvFile,
} from '../../lib/agentSettingsEnv'
import { inputClass } from '../../constants/forms'
import FormField from '../FormField'
import { toAgentSettingsPayload } from '../AdminAgentSettingsForm'

type ImportAgentSettingsEnvProps = {
  users: { id: string; email: string }[]
  apiKeys: AdminApiKey[]
  onImported: () => Promise<void>
}

function formatPreviewValue(value: string | undefined): string {
  if (!value) return '—'
  if (value.length <= 48) return value
  return `${value.slice(0, 48)}…`
}

function ImportPreview({ parsed }: { parsed: ParsedEnvFile }) {
  const rows = [
    ['Auto Book Scheduling', parsed.AUTO_BOOK_SCHEDULING],
    ['Auto Respond Instruction', parsed.AUTO_RESPOND_INSTRUCTION],
    ['Auto Respond Scheduling', parsed.AUTO_RESPOND_SCHEDULING],
    ['Calendar', parsed.CALENDAR_PROVIDER],
    ['Clinty API Key', parsed.CLINTY_API_KEY],
    ['Database URI', parsed.DATABASE_URI],
    ['Environment', parsed.ENVIRONMENT],
    ['LangSmith Key', parsed.LANGSMITH_API_KEY],
    ['Log Level', parsed.LOG_LEVEL],
    ['OpenAI Key', parsed.OPENAI_API_KEY],
    ['PGOPTIONS', parsed.PGOPTIONS],
    ['Postgres Schema', parsed.POSTGRES_SCHEMA],
    ['Redis URI', parsed.REDIS_URI],
    ['Secrets Dir', parsed.SECRETS_DIR],
    ['Square Location', parsed.SQUARE_LOCATION_ID],
    ['Square Timezone', parsed.SQUARE_TIMEZONE],
  ]

  return (
    <dl className="grid gap-2 text-xs">
      {rows.map(([label, value]) => (
        <div key={label} className="grid grid-cols-[8rem_1fr] gap-3">
          <dt className="text-navy-500">{label}</dt>
          <dd className="font-mono text-navy-800 break-all">{formatPreviewValue(value)}</dd>
        </div>
      ))}
    </dl>
  )
}

export default function ImportAgentSettingsEnv({
  users,
  apiKeys,
  onImported,
}: ImportAgentSettingsEnvProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [parsed, setParsed] = useState<ParsedEnvFile | null>(null)
  const [filename, setFilename] = useState('')
  const [name, setName] = useState('')
  const [userId, setUserId] = useState('')
  const [clintyApiKeyId, setClintyApiKeyId] = useState('')
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const activeApiKeys = apiKeys.filter((key) => !key.revoked_at)
  const userApiKeys = activeApiKeys.filter((key) => key.user_id === userId)

  function resetModal() {
    setOpen(false)
    setParsed(null)
    setFilename('')
    setName('')
    setUserId('')
    setClintyApiKeyId('')
    setError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  function openImportDialog(content: string, fileName: string) {
    const env = parseEnvFile(content)
    if (Object.keys(env).length === 0) {
      setError('No valid KEY=VALUE entries found in the env file.')
      return
    }

    const matchedKey = findApiKeyBySecret(activeApiKeys, env.CLINTY_API_KEY)
    setParsed(env)
    setFilename(fileName)
    setName(envFilenameToSettingsName(fileName))
    setUserId(matchedKey?.user_id ?? users[0]?.id ?? '')
    setClintyApiKeyId(matchedKey?.id ?? '')
    setError(null)
    setOpen(true)
  }

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const content = await file.text()
      openImportDialog(content, file.name)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to read env file')
    }
  }

  function handleUserChange(nextUserId: string) {
    setUserId(nextUserId)
    const keysForUser = activeApiKeys.filter((key) => key.user_id === nextUserId)
    const matchedKey = parsed ? findApiKeyBySecret(keysForUser, parsed.CLINTY_API_KEY) : null
    setClintyApiKeyId(matchedKey?.id ?? keysForUser[0]?.id ?? '')
  }

  async function handleImport() {
    if (!parsed) return
    if (!userId) {
      setError('Select a user for these agent settings.')
      return
    }
    if (!name.trim()) {
      setError('Name is required.')
      return
    }

    setImporting(true)
    setError(null)

    try {
      const payload = toAgentSettingsPayload(
        parsedEnvToAgentSettingsInput(parsed, {
          name: name.trim(),
          user_id: userId,
          clinty_api_key_id: clintyApiKeyId || null,
        }),
      )
      await createAgentSettings(payload)
      await onImported()
      resetModal()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import agent settings')
    } finally {
      setImporting(false)
    }
  }

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".env,text/plain"
        className="hidden"
        onChange={handleFileChange}
      />
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className="inline-flex items-center text-sm font-medium border border-navy-900/15 text-navy-900 px-4 py-2 rounded-lg hover:bg-navy-900/5 transition-colors"
      >
        Import env file
      </button>

      {error && !open && (
        <p className="mt-2 text-xs text-red-600">{error}</p>
      )}

      {open && parsed && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-900/40">
          <div
            className="w-full max-w-lg bg-white rounded-2xl border border-navy-900/10 shadow-xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="import-agent-settings-title"
          >
            <div className="px-6 py-4 border-b border-navy-900/5">
              <h3 id="import-agent-settings-title" className="font-serif text-xl text-navy-900">
                Import Agent Settings
              </h3>
              <p className="text-sm text-navy-600 mt-1">
                From <span className="font-mono text-xs">{filename}</span>
              </p>
            </div>

            <div className="px-6 py-5 space-y-5 max-h-[70vh] overflow-y-auto">
              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <FormField label="Name" id="import-agent-name" required>
                <input
                  id="import-agent-name"
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className={inputClass}
                  disabled={importing}
                />
              </FormField>

              <FormField label="User" id="import-agent-user" required>
                <select
                  id="import-agent-user"
                  value={userId}
                  onChange={(event) => handleUserChange(event.target.value)}
                  className={inputClass}
                  disabled={importing}
                >
                  <option value="">Select a user</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.email}
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField label="Clinty API Key" id="import-agent-clinty-key">
                {!userId ? (
                  <p className="text-sm text-navy-500">Select a user to load API keys.</p>
                ) : userApiKeys.length === 0 ? (
                  <p className="text-sm text-navy-500">No active API keys for this user.</p>
                ) : (
                  <select
                    id="import-agent-clinty-key"
                    value={clintyApiKeyId}
                    onChange={(event) => setClintyApiKeyId(event.target.value)}
                    className={inputClass}
                    disabled={importing}
                  >
                    <option value="">None</option>
                    {userApiKeys.map((key) => (
                      <option key={key.id} value={key.id}>
                        {key.name}
                      </option>
                    ))}
                  </select>
                )}
              </FormField>

              <div className="rounded-xl border border-navy-900/10 bg-cream/60 px-4 py-3">
                <p className="text-xs font-medium text-navy-600 mb-3">Preview</p>
                <ImportPreview parsed={parsed} />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-navy-900/5 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={resetModal}
                disabled={importing}
                className="text-sm font-medium text-navy-600 hover:text-navy-900 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleImport}
                disabled={importing || !userId || !name.trim()}
                className="text-sm font-medium bg-navy-900 text-cream px-4 py-2 rounded-lg hover:bg-navy-800 transition-colors disabled:opacity-60"
              >
                {importing ? 'Importing…' : 'Import'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
