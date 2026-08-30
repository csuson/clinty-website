import { downloadOutlookTokenJson, outlookTokenToPayload } from '../../lib/outlook/oauth'
import type { AdminOutlookToken } from '../../lib/admin'
import { SecretValue } from '../SecretField'
import AdminDeleteButton from '../AdminDeleteButton'
import AdminResizableTable, { type AdminTableColumn } from './AdminResizableTable'
import { CopyButton, ExpandableText, formatCellValue, formatDate } from './adminTableUtils'

type ColumnId =
  | 'user'
  | 'outlookAccount'
  | 'accessToken'
  | 'refreshToken'
  | 'clientId'
  | 'expiry'
  | 'scopes'
  | 'connected'
  | 'updated'
  | 'status'
  | 'download'
  | 'actions'

const COLUMNS: AdminTableColumn<ColumnId>[] = [
  { id: 'user', label: 'User', defaultWidth: 160, minWidth: 100 },
  { id: 'outlookAccount', label: 'Microsoft account', defaultWidth: 180, minWidth: 120 },
  { id: 'accessToken', label: 'Access token', defaultWidth: 200, minWidth: 140 },
  { id: 'refreshToken', label: 'Refresh token', defaultWidth: 200, minWidth: 140 },
  { id: 'clientId', label: 'Client ID', defaultWidth: 160, minWidth: 110 },
  { id: 'expiry', label: 'Expiry', defaultWidth: 160, minWidth: 110 },
  { id: 'scopes', label: 'Scopes', defaultWidth: 220, minWidth: 140 },
  { id: 'connected', label: 'Connected', defaultWidth: 160, minWidth: 110 },
  { id: 'updated', label: 'Updated', defaultWidth: 160, minWidth: 110 },
  { id: 'status', label: 'Status', defaultWidth: 110, minWidth: 90 },
  { id: 'download', label: 'Download', defaultWidth: 120, minWidth: 100, expandable: false, resizable: false, nowrap: true },
  { id: 'actions', label: 'Actions', defaultWidth: 80, minWidth: 70, expandable: false, resizable: false, nowrap: true },
]

function tokenJsonFilename(token: AdminOutlookToken): string {
  const label = token.outlook_account ?? token.outlook_email ?? token.user_email ?? token.user_id
  const safe = label.replace(/[^a-zA-Z0-9._-]+/g, '_')
  return safe ? `outlook-token-${safe}.json` : 'outlook-token.json'
}

function DownloadTokenButton({ token }: { token: AdminOutlookToken }) {
  function handleDownload() {
    downloadOutlookTokenJson(outlookTokenToPayload(token), tokenJsonFilename(token))
  }

  return (
    <button
      type="button"
      onClick={handleDownload}
      className="inline-flex items-center gap-1.5 text-xs font-medium text-teal-600 hover:text-teal-700 whitespace-nowrap"
      title="Download outlook-token.json"
    >
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
      </svg>
      token.json
    </button>
  )
}

function TokenCell({ value, expanded }: { value: string | null; expanded: boolean }) {
  if (!value) return <span className="text-navy-500">—</span>
  return <SecretValue value={value} truncateLength={24} expanded={expanded} />
}

function StatusBadge({ status }: { status: AdminOutlookToken['connection_status'] }) {
  if (!status) return <span className="text-navy-500">—</span>
  if (status === 'connected') {
    return <span className="text-teal-600 capitalize">{status}</span>
  }
  if (status === 'error') {
    return <span className="text-red-600 capitalize">{status}</span>
  }
  return <span className="text-navy-500 capitalize">{status}</span>
}

type AdminOutlookTokensTableProps = {
  outlookTokens: AdminOutlookToken[]
  isDeleting: (id: string) => boolean
  onDelete: (id: string, label: string) => Promise<void>
}

export default function AdminOutlookTokensTable({
  outlookTokens,
  isDeleting,
  onDelete,
}: AdminOutlookTokensTableProps) {
  return (
    <AdminResizableTable
      storageKey="admin-outlook-tokens-column-widths"
      columns={COLUMNS}
      rows={outlookTokens}
      getRowId={(row) => row.user_id}
      emptyMessage="No Outlook tokens stored yet."
      renderCell={(columnId, token, expanded) => {
        const deleteLabel = token.outlook_account ?? token.outlook_email ?? token.user_email ?? token.user_id

        switch (columnId) {
          case 'user':
            return (
              <ExpandableText value={formatCellValue(token.user_email ?? token.user_id)} expanded={expanded} />
            )
          case 'outlookAccount':
            return (
              <ExpandableText
                value={formatCellValue(token.outlook_account ?? token.outlook_email)}
                expanded={expanded}
              />
            )
          case 'accessToken':
            return token.access_token ? (
              <div className="flex items-start gap-2 flex-wrap">
                <TokenCell value={token.access_token} expanded={expanded} />
                <CopyButton value={token.access_token} label="Outlook access token" />
              </div>
            ) : (
              '—'
            )
          case 'refreshToken':
            return token.refresh_token ? (
              <div className="flex items-start gap-2 flex-wrap">
                <TokenCell value={token.refresh_token} expanded={expanded} />
                <CopyButton value={token.refresh_token} label="Outlook refresh token" />
              </div>
            ) : (
              '—'
            )
          case 'clientId':
            return <ExpandableText value={formatCellValue(token.client_id)} expanded={expanded} monospace />
          case 'expiry':
            return <ExpandableText value={formatDate(token.expiry)} expanded={expanded} />
          case 'scopes':
            return (
              <ExpandableText value={formatCellValue(token.scopes.join(', '))} expanded={expanded} />
            )
          case 'connected':
            return <ExpandableText value={formatDate(token.connected_at)} expanded={expanded} />
          case 'updated':
            return <ExpandableText value={formatDate(token.updated_at)} expanded={expanded} />
          case 'status':
            return <StatusBadge status={token.connection_status} />
          case 'download':
            return <DownloadTokenButton token={token} />
          case 'actions':
            return (
              <AdminDeleteButton
                label={`Outlook token for ${deleteLabel}`}
                disabled={isDeleting(token.user_id)}
                onDelete={() => onDelete(token.user_id, deleteLabel)}
              />
            )
          default:
            return '—'
        }
      }}
    />
  )
}
