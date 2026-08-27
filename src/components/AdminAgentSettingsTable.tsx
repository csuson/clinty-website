import { Link } from 'react-router-dom'
import type { AdminAgentSettings, AdminDeleteResource } from '../lib/admin'
import { agentSettingsEnvFilename, downloadAgentSettingsEnv } from '../lib/agentSettingsEnv'
import AdminDeleteButton from './AdminDeleteButton'
import { SecretValue } from './SecretField'
import AdminResizableTable, { type AdminTableColumn } from './admin/AdminResizableTable'
import { CopyButton, ExpandableText, formatCellValue, formatDate } from './admin/adminTableUtils'

type ColumnId =
  | 'user'
  | 'name'
  | 'clintyApiKey'
  | 'langgraphKey'
  | 'url'
  | 'graphId'
  | 'openapiKey'
  | 'databaseUri'
  | 'redisUri'
  | 'secretsDir'
  | 'calendar'
  | 'autoBook'
  | 'autoRespondInstruction'
  | 'autoRespondScheduling'
  | 'environment'
  | 'logLevel'
  | 'pgoptions'
  | 'postgresSchema'
  | 'squareToken'
  | 'squareLocation'
  | 'squareVariation'
  | 'squareVersion'
  | 'squareTeam'
  | 'squareTz'
  | 'created'
  | 'updated'
  | 'actions'

const COLUMNS: AdminTableColumn<ColumnId>[] = [
  { id: 'user', label: 'User', defaultWidth: 140, minWidth: 80 },
  { id: 'name', label: 'Name', defaultWidth: 160, minWidth: 100 },
  { id: 'clintyApiKey', label: 'Clinty API Key', defaultWidth: 220, minWidth: 120 },
  { id: 'langgraphKey', label: 'LangGraph Key', defaultWidth: 140, minWidth: 100 },
  { id: 'url', label: 'URL', defaultWidth: 120, minWidth: 80 },
  { id: 'graphId', label: 'Graph ID', defaultWidth: 110, minWidth: 80 },
  { id: 'openapiKey', label: 'OpenAPI Key', defaultWidth: 140, minWidth: 100 },
  { id: 'databaseUri', label: 'Database URI', defaultWidth: 160, minWidth: 100 },
  { id: 'redisUri', label: 'Redis URI', defaultWidth: 140, minWidth: 100 },
  { id: 'secretsDir', label: 'Secrets Dir', defaultWidth: 120, minWidth: 80 },
  { id: 'calendar', label: 'Calendar', defaultWidth: 100, minWidth: 80 },
  { id: 'autoBook', label: 'Auto Book', defaultWidth: 100, minWidth: 80 },
  { id: 'autoRespondInstruction', label: 'Auto Instruct', defaultWidth: 110, minWidth: 90 },
  { id: 'autoRespondScheduling', label: 'Auto Schedule', defaultWidth: 110, minWidth: 90 },
  { id: 'environment', label: 'Environment', defaultWidth: 110, minWidth: 90 },
  { id: 'logLevel', label: 'Log Level', defaultWidth: 100, minWidth: 80 },
  { id: 'pgoptions', label: 'PGOPTIONS', defaultWidth: 160, minWidth: 100 },
  { id: 'postgresSchema', label: 'Postgres Schema', defaultWidth: 130, minWidth: 90 },
  { id: 'squareToken', label: 'Square Token', defaultWidth: 140, minWidth: 100 },
  { id: 'squareLocation', label: 'Square Location', defaultWidth: 130, minWidth: 90 },
  { id: 'squareVariation', label: 'Square Variation', defaultWidth: 130, minWidth: 90 },
  { id: 'squareVersion', label: 'Square Version', defaultWidth: 120, minWidth: 90 },
  { id: 'squareTeam', label: 'Square Team', defaultWidth: 120, minWidth: 90 },
  { id: 'squareTz', label: 'Square TZ', defaultWidth: 130, minWidth: 90 },
  { id: 'created', label: 'Created', defaultWidth: 160, minWidth: 110 },
  { id: 'updated', label: 'Updated', defaultWidth: 160, minWidth: 110 },
  { id: 'actions', label: 'Actions', defaultWidth: 180, minWidth: 140, expandable: false, resizable: false, nowrap: true },
]

function formatBoolean(value: boolean | null | undefined): string {
  if (value === null || value === undefined) return '—'
  return value ? 'true' : 'false'
}

function SecretCell({ value, expanded }: { value: string | null; expanded: boolean }) {
  if (!value) return <span className="text-navy-500">—</span>
  return <SecretValue value={value} truncateLength={20} expanded={expanded} />
}

function ExportAgentSettingsEnvButton({ settings }: { settings: AdminAgentSettings }) {
  const filename = agentSettingsEnvFilename(settings)

  return (
    <button
      type="button"
      onClick={() => downloadAgentSettingsEnv(settings)}
      className="inline-flex items-center gap-1.5 text-xs font-medium text-teal-600 hover:text-teal-700 whitespace-nowrap"
      title={`Download ${filename}`}
    >
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
      </svg>
      Export to env
    </button>
  )
}

type AdminAgentSettingsTableProps = {
  settings: AdminAgentSettings[]
  isDeleting: (resource: AdminDeleteResource, id: string) => boolean
  onDelete: (id: string, name: string) => Promise<void>
}

export default function AdminAgentSettingsTable({
  settings,
  isDeleting,
  onDelete,
}: AdminAgentSettingsTableProps) {
  return (
    <AdminResizableTable
      storageKey="admin-agent-settings-column-widths"
      columns={COLUMNS}
      rows={settings}
      getRowId={(row) => row.id}
      emptyMessage="No agent settings yet."
      renderCell={(columnId, row, expanded) => {
        switch (columnId) {
          case 'user':
            return (
              <ExpandableText value={formatCellValue(row.user_email ?? row.user_id)} expanded={expanded} />
            )
          case 'name':
            return (
              <div className="flex items-start gap-3 flex-wrap">
                <ExpandableText value={row.name} expanded={expanded} />
                <Link
                  to={`/admin/agent-settings/${row.id}/edit`}
                  className="text-xs font-medium text-teal-600 hover:text-teal-700 underline shrink-0"
                >
                  Edit
                </Link>
              </div>
            )
          case 'clintyApiKey':
            if (!row.clinty_api_key_id) return '—'
            return (
              <div className="space-y-1">
                <ExpandableText
                  value={formatCellValue(row.clinty_api_key_name ?? row.clinty_api_key_id)}
                  expanded={expanded}
                />
                {row.clinty_api_key_secret ? (
                  <div className="flex items-start gap-2 flex-wrap">
                    <SecretValue value={row.clinty_api_key_secret} truncateLength={24} expanded={expanded} />
                    <CopyButton value={row.clinty_api_key_secret} label="Clinty API key" />
                  </div>
                ) : (
                  <span className="text-xs text-navy-500">Linked key (secret not stored)</span>
                )}
              </div>
            )
          case 'langgraphKey':
            return <SecretCell value={row.langgraph_api_key} expanded={expanded} />
          case 'url':
            return <SecretCell value={row.url} expanded={expanded} />
          case 'graphId':
            return <ExpandableText value={formatCellValue(row.graph_id)} expanded={expanded} monospace />
          case 'openapiKey':
            return <SecretCell value={row.openapi_key} expanded={expanded} />
          case 'databaseUri':
            return <SecretCell value={row.database_uri} expanded={expanded} />
          case 'redisUri':
            return <SecretCell value={row.redis_uri} expanded={expanded} />
          case 'secretsDir':
            return <ExpandableText value={formatCellValue(row.secrets_dir)} expanded={expanded} monospace />
          case 'calendar':
            return <ExpandableText value={formatCellValue(row.calendar_provider)} expanded={expanded} />
          case 'autoBook':
            return <ExpandableText value={formatBoolean(row.auto_book_scheduling)} expanded={expanded} />
          case 'autoRespondInstruction':
            return (
              <ExpandableText value={formatBoolean(row.auto_respond_instruction)} expanded={expanded} />
            )
          case 'autoRespondScheduling':
            return (
              <ExpandableText value={formatBoolean(row.auto_respond_scheduling)} expanded={expanded} />
            )
          case 'environment':
            return <ExpandableText value={formatCellValue(row.environment)} expanded={expanded} />
          case 'logLevel':
            return <ExpandableText value={formatCellValue(row.log_level)} expanded={expanded} />
          case 'pgoptions':
            return <ExpandableText value={formatCellValue(row.pgoptions)} expanded={expanded} monospace />
          case 'postgresSchema':
            return <ExpandableText value={formatCellValue(row.postgres_schema)} expanded={expanded} monospace />
          case 'squareToken':
            return <SecretCell value={row.square_access_token} expanded={expanded} />
          case 'squareLocation':
            return (
              <ExpandableText value={formatCellValue(row.square_location_id)} expanded={expanded} monospace />
            )
          case 'squareVariation':
            return (
              <ExpandableText
                value={formatCellValue(row.square_service_variation_id)}
                expanded={expanded}
                monospace
              />
            )
          case 'squareVersion':
            return (
              <ExpandableText
                value={formatCellValue(row.square_service_variation_version)}
                expanded={expanded}
                monospace
              />
            )
          case 'squareTeam':
            return (
              <ExpandableText value={formatCellValue(row.square_team_member_id)} expanded={expanded} monospace />
            )
          case 'squareTz':
            return <ExpandableText value={formatCellValue(row.square_timezone)} expanded={expanded} />
          case 'created':
            return <ExpandableText value={formatDate(row.created_at)} expanded={expanded} />
          case 'updated':
            return <ExpandableText value={formatDate(row.updated_at)} expanded={expanded} />
          case 'actions':
            return (
              <div className="flex items-center gap-3">
                <ExportAgentSettingsEnvButton settings={row} />
                <AdminDeleteButton
                  label={`agent settings ${row.name}`}
                  disabled={isDeleting('agent_settings', row.id)}
                  onDelete={() => onDelete(row.id, row.name)}
                />
              </div>
            )
          default:
            return '—'
        }
      }}
    />
  )
}
