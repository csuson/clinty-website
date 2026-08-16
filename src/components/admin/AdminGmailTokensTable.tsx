import { downloadTokenJson, gmailTokenToPayload } from '../../lib/gmail/oauth'
import type { AdminGmailToken } from '../../lib/admin'
import { SecretValue } from '../SecretField'
import AdminDeleteButton from '../AdminDeleteButton'
import AdminResizableTable, { type AdminTableColumn } from './AdminResizableTable'
import { ExpandableText, formatCellValue, formatDate } from './adminTableUtils'

type ColumnId =
  | 'user'
  | 'googleAccount'
  | 'accessToken'
  | 'refreshToken'
  | 'expiry'
  | 'scopes'
  | 'updated'
  | 'download'
  | 'actions'

const COLUMNS: AdminTableColumn<ColumnId>[] = [
  { id: 'user', label: 'User', defaultWidth: 160, minWidth: 100 },
  { id: 'googleAccount', label: 'Google account', defaultWidth: 180, minWidth: 120 },
  { id: 'accessToken', label: 'Access token', defaultWidth: 180, minWidth: 120 },
  { id: 'refreshToken', label: 'Refresh token', defaultWidth: 180, minWidth: 120 },
  { id: 'expiry', label: 'Expiry', defaultWidth: 160, minWidth: 110 },
  { id: 'scopes', label: 'Scopes', defaultWidth: 220, minWidth: 140 },
  { id: 'updated', label: 'Updated', defaultWidth: 160, minWidth: 110 },
  { id: 'download', label: 'Download', defaultWidth: 120, minWidth: 100, expandable: false, resizable: false, nowrap: true },
  { id: 'actions', label: 'Actions', defaultWidth: 80, minWidth: 70, expandable: false, resizable: false, nowrap: true },
]

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

function TokenCell({ value, expanded }: { value: string | null; expanded: boolean }) {
  if (!value) return <span className="text-navy-500">—</span>
  return <SecretValue value={value} truncateLength={20} expanded={expanded} />
}

type AdminGmailTokensTableProps = {
  gmailTokens: AdminGmailToken[]
  isDeleting: (id: string) => boolean
  onDelete: (id: string, label: string) => Promise<void>
}

export default function AdminGmailTokensTable({
  gmailTokens,
  isDeleting,
  onDelete,
}: AdminGmailTokensTableProps) {
  return (
    <AdminResizableTable
      storageKey="admin-gmail-tokens-column-widths"
      columns={COLUMNS}
      rows={gmailTokens}
      getRowId={(row) => row.user_id}
      emptyMessage="No Gmail tokens stored yet."
      renderCell={(columnId, token, expanded) => {
        const deleteLabel = token.google_account ?? token.user_email ?? token.user_id

        switch (columnId) {
          case 'user':
            return (
              <ExpandableText value={formatCellValue(token.user_email ?? token.user_id)} expanded={expanded} />
            )
          case 'googleAccount':
            return <ExpandableText value={formatCellValue(token.google_account)} expanded={expanded} />
          case 'accessToken':
            return <TokenCell value={token.access_token} expanded={expanded} />
          case 'refreshToken':
            return <TokenCell value={token.refresh_token} expanded={expanded} />
          case 'expiry':
            return <ExpandableText value={formatDate(token.expiry)} expanded={expanded} />
          case 'scopes':
            return (
              <ExpandableText value={formatCellValue(token.scopes.join(', '))} expanded={expanded} />
            )
          case 'updated':
            return <ExpandableText value={formatDate(token.updated_at)} expanded={expanded} />
          case 'download':
            return <DownloadTokenButton token={token} />
          case 'actions':
            return (
              <AdminDeleteButton
                label={`Gmail token for ${deleteLabel}`}
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
