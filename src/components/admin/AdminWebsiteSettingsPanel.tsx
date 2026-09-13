import type { AdminWebsiteSettings } from '../../lib/admin'
import { edgeWebsiteSupabaseSettings, resolveWebsiteSupabaseSettings } from '../../lib/agentSettingsEnv'
import { SecretValue } from '../SecretField'
import { CopyButton } from './adminTableUtils'

type SettingRow = {
  label: string
  envKey: string
  value: string
  secret?: boolean
}

function SettingField({ label, envKey, value, secret = false }: SettingRow) {
  const trimmed = value.trim()

  return (
    <div className="grid gap-2 sm:grid-cols-[minmax(0,220px)_1fr] sm:gap-4 py-4 border-b border-navy-900/5 last:border-b-0">
      <div>
        <p className="text-sm font-medium text-navy-900">{label}</p>
        <p className="text-xs font-mono text-navy-500 mt-0.5">{envKey}</p>
      </div>
      <div className="flex items-start gap-3 flex-wrap min-w-0">
        {!trimmed ? (
          <span className="text-sm text-navy-500">Not configured</span>
        ) : secret ? (
          <SecretValue value={trimmed} truncateLength={32} className="font-mono text-sm" />
        ) : (
          <>
            <span className="font-mono text-sm text-navy-900 break-all">{trimmed}</span>
            <CopyButton value={trimmed} label={label} />
          </>
        )}
      </div>
    </div>
  )
}

function SettingsGroup({ title, description, rows }: { title: string; description?: string; rows: SettingRow[] }) {
  return (
    <div>
      <div className="mb-2">
        <h3 className="text-sm font-semibold text-navy-900">{title}</h3>
        {description ? <p className="text-sm text-navy-600 mt-1">{description}</p> : null}
      </div>
      <div className="rounded-xl border border-navy-900/5 divide-y divide-navy-900/5 px-4">
        {rows.map((row) => (
          <SettingField key={row.envKey} {...row} />
        ))}
      </div>
    </div>
  )
}

function supabaseKeysMatch(
  effective: ReturnType<typeof resolveWebsiteSupabaseSettings>,
  edge: ReturnType<typeof edgeWebsiteSupabaseSettings>,
): boolean {
  const urlMatches = !effective.supabase_url || !edge.supabase_url || effective.supabase_url === edge.supabase_url
  const anonMatches =
    !effective.supabase_anon_key || !edge.supabase_anon_key || effective.supabase_anon_key === edge.supabase_anon_key
  return urlMatches && anonMatches
}

function buildSupabaseRows(settings?: AdminWebsiteSettings | null): SettingRow[] {
  const supabase = resolveWebsiteSupabaseSettings(settings)
  return [
    { label: 'Project URL', envKey: 'SUPABASE_URL', value: supabase.supabase_url },
    { label: 'Anon key', envKey: 'SUPABASE_ANON_KEY', value: supabase.supabase_anon_key, secret: true },
    {
      label: 'Service role key',
      envKey: 'SUPABASE_SERVICE_ROLE_KEY',
      value: supabase.supabase_service_role,
      secret: true,
    },
  ]
}

export function countConfiguredWebsiteSettings(settings?: AdminWebsiteSettings | null): number {
  return buildSupabaseRows(settings).filter((row) => row.value.trim()).length
}

type AdminWebsiteSettingsPanelProps = {
  settings?: AdminWebsiteSettings | null
}

export default function AdminWebsiteSettingsPanel({ settings }: AdminWebsiteSettingsPanelProps) {
  const supabaseRows = buildSupabaseRows(settings)
  const edgeSupabaseMismatch = !supabaseKeysMatch(
    resolveWebsiteSupabaseSettings(settings),
    edgeWebsiteSupabaseSettings(settings),
  )
  const edgeSupabase = edgeWebsiteSupabaseSettings(settings)

  return (
    <div className="px-6 py-5 space-y-6">
      <p className="text-sm text-navy-600">
        Supabase URL and anon key use this website&apos;s <code className="text-xs">VITE_SUPABASE_*</code> build values.
        Service role uses Edge Function secrets. WhatsApp gateway settings are configured per user in WhatsApp
        Settings.
      </p>

      {edgeSupabaseMismatch ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 space-y-2">
          <p className="font-medium">Edge Function anon key differs from this website</p>
          <p>
            The deployed site uses <code className="text-xs">VITE_SUPABASE_ANON_KEY</code>. Your Edge Function secret{' '}
            <code className="text-xs">SUPABASE_ANON_KEY</code> is different — update or remove that secret in the
            Supabase dashboard so server-side agent-settings matches.
          </p>
          {edgeSupabase.supabase_anon_key ? (
            <div className="flex items-start gap-3 flex-wrap pt-1">
              <span className="text-xs font-medium text-amber-950">Edge secret value:</span>
              <SecretValue
                value={edgeSupabase.supabase_anon_key}
                truncateLength={24}
                className="font-mono text-xs text-amber-950"
              />
            </div>
          ) : null}
        </div>
      ) : null}

      <SettingsGroup
        title="Supabase"
        description="Read-only — from build env and Edge Function secrets."
        rows={supabaseRows}
      />
    </div>
  )
}
