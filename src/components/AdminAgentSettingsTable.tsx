import { Link } from 'react-router-dom'
import type {
  AdminAgentSettings,
  AdminDeleteResource,
  AdminGmailToken,
  AdminOutlookToken,
  AdminShopifyToken,
  AdminSquareToken,
  AdminWebsiteSettings,
  AdminWhatsAppConnection,
} from '../lib/admin'
import {
  agentSettingsEnvFilename,
  buildAgentSettingsEnvContext,
  downloadAgentSettingsEnv,
} from '../lib/agentSettingsEnv'
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

function TextCell({
  value,
  expanded,
  label,
  monospace = false,
}: {
  value: string | number | null | undefined
  expanded: boolean
  label: string
  monospace?: boolean
}) {
  const formatted = formatCellValue(value)
  if (formatted === '—') return <span className="text-navy-500">—</span>
  return (
    <div className="flex items-start gap-2 flex-wrap">
      <ExpandableText value={formatted} expanded={expanded} monospace={monospace} />
      <CopyButton value={formatted} label={label} />
    </div>
  )
}

function ExportAgentSettingsEnvButton({
  settings,
  gmailTokens,
  outlookTokens,
  squareTokens,
  shopifyTokens,
  websiteSettings,
  whatsappConnections,
}: {
  settings: AdminAgentSettings
  gmailTokens: AdminGmailToken[]
  outlookTokens: AdminOutlookToken[]
  squareTokens: AdminSquareToken[]
  shopifyTokens: AdminShopifyToken[]
  whatsappConnections: AdminWhatsAppConnection[]
  websiteSettings?: AdminWebsiteSettings | null
}) {
  const filename = agentSettingsEnvFilename(settings)

  return (
    <button
      type="button"
      onClick={() =>
        downloadAgentSettingsEnv(
          settings,
          buildAgentSettingsEnvContext(settings, {
            gmailTokens,
            outlookTokens,
            squareTokens,
            shopifyTokens,
            whatsappConnections,
            websiteSettings,
          }),
        )
      }
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
  gmailTokens: AdminGmailToken[]
  outlookTokens: AdminOutlookToken[]
  squareTokens: AdminSquareToken[]
  shopifyTokens: AdminShopifyToken[]
  whatsappConnections: AdminWhatsAppConnection[]
  websiteSettings?: AdminWebsiteSettings | null
  isDeleting: (resource: AdminDeleteResource, id: string) => boolean
  onDelete: (id: string, name: string) => Promise<void>
}

export default function AdminAgentSettingsTable({
  settings,
  gmailTokens,
  outlookTokens,
  squareTokens,
  shopifyTokens,
  whatsappConnections,
  websiteSettings,
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
              <TextCell
                value={row.user_email ?? row.user_id}
                expanded={expanded}
                label="User"
              />
            )
          case 'name':
            return (
              <div className="flex items-start gap-3 flex-wrap">
                <TextCell value={row.name} expanded={expanded} label="Name" />
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
                <TextCell
                  value={row.clinty_api_key_name ?? row.clinty_api_key_id}
                  expanded={expanded}
                  label="Clinty API key name"
                />
                {row.clinty_api_key_secret ? (
                  <SecretCell value={row.clinty_api_key_secret} expanded={expanded} />
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
            return <TextCell value={row.graph_id} expanded={expanded} label="Graph ID" monospace />
          case 'openapiKey':
            return <SecretCell value={row.openapi_key} expanded={expanded} />
          case 'databaseUri':
            return <SecretCell value={row.database_uri} expanded={expanded} />
          case 'redisUri':
            return <SecretCell value={row.redis_uri} expanded={expanded} />
          case 'secretsDir':
            return <TextCell value={row.secrets_dir} expanded={expanded} label="Secrets dir" monospace />
          case 'calendar':
            return <TextCell value={row.calendar_provider} expanded={expanded} label="Calendar provider" />
          case 'autoBook':
            return (
              <TextCell value={formatBoolean(row.auto_book_scheduling)} expanded={expanded} label="Auto book" />
            )
          case 'autoRespondInstruction':
            return (
              <TextCell
                value={formatBoolean(row.auto_respond_instruction)}
                expanded={expanded}
                label="Auto respond instruction"
              />
            )
          case 'autoRespondScheduling':
            return (
              <TextCell
                value={formatBoolean(row.auto_respond_scheduling)}
                expanded={expanded}
                label="Auto respond scheduling"
              />
            )
          case 'environment':
            return <TextCell value={row.environment} expanded={expanded} label="Environment" />
          case 'logLevel':
            return <TextCell value={row.log_level} expanded={expanded} label="Log level" />
          case 'pgoptions':
            return <TextCell value={row.pgoptions} expanded={expanded} label="PGOPTIONS" monospace />
          case 'postgresSchema':
            return (
              <TextCell value={row.postgres_schema} expanded={expanded} label="Postgres schema" monospace />
            )
          case 'squareToken':
            return <SecretCell value={row.square_access_token} expanded={expanded} />
          case 'squareLocation':
            return (
              <TextCell value={row.square_location_id} expanded={expanded} label="Square location" monospace />
            )
          case 'squareVariation':
            return (
              <TextCell
                value={row.square_service_variation_id}
                expanded={expanded}
                label="Square variation"
                monospace
              />
            )
          case 'squareVersion':
            return (
              <TextCell
                value={row.square_service_variation_version}
                expanded={expanded}
                label="Square version"
                monospace
              />
            )
          case 'squareTeam':
            return (
              <TextCell value={row.square_team_member_id} expanded={expanded} label="Square team" monospace />
            )
          case 'squareTz':
            return <TextCell value={row.square_timezone} expanded={expanded} label="Square timezone" />
          case 'created':
            return <TextCell value={formatDate(row.created_at)} expanded={expanded} label="Created" />
          case 'updated':
            return <TextCell value={formatDate(row.updated_at)} expanded={expanded} label="Updated" />
          case 'actions':
            return (
              <div className="flex items-center gap-3">
                <ExportAgentSettingsEnvButton
                  settings={row}
                  gmailTokens={gmailTokens}
                  outlookTokens={outlookTokens}
                  squareTokens={squareTokens}
                  shopifyTokens={shopifyTokens}
                  whatsappConnections={whatsappConnections}
                  websiteSettings={websiteSettings}
                />
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
