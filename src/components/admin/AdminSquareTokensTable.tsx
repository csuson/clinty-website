import type { AdminSquareToken } from '../../lib/admin'
import { SecretValue } from '../SecretField'
import AdminDeleteButton from '../AdminDeleteButton'
import AdminResizableTable, { type AdminTableColumn } from './AdminResizableTable'
import { CopyButton, ExpandableText, formatCellValue, formatDate } from './adminTableUtils'

type ColumnId =
  | 'user'
  | 'business'
  | 'merchantId'
  | 'accessToken'
  | 'refreshToken'
  | 'locationId'
  | 'teamMemberId'
  | 'timezone'
  | 'expires'
  | 'scopes'
  | 'updated'
  | 'status'
  | 'actions'

const COLUMNS: AdminTableColumn<ColumnId>[] = [
  { id: 'user', label: 'User', defaultWidth: 160, minWidth: 100 },
  { id: 'business', label: 'Business', defaultWidth: 140, minWidth: 100 },
  { id: 'merchantId', label: 'Merchant ID', defaultWidth: 140, minWidth: 100 },
  { id: 'accessToken', label: 'Access token', defaultWidth: 200, minWidth: 140 },
  { id: 'refreshToken', label: 'Refresh token', defaultWidth: 180, minWidth: 120 },
  { id: 'locationId', label: 'Location ID', defaultWidth: 140, minWidth: 100 },
  { id: 'teamMemberId', label: 'Team member ID', defaultWidth: 140, minWidth: 100 },
  { id: 'timezone', label: 'Timezone', defaultWidth: 150, minWidth: 100 },
  { id: 'expires', label: 'Expires', defaultWidth: 160, minWidth: 110 },
  { id: 'scopes', label: 'Scopes', defaultWidth: 220, minWidth: 140 },
  { id: 'updated', label: 'Updated', defaultWidth: 160, minWidth: 110 },
  { id: 'status', label: 'Status', defaultWidth: 110, minWidth: 90 },
  { id: 'actions', label: 'Actions', defaultWidth: 80, minWidth: 70, expandable: false, resizable: false, nowrap: true },
]

function TokenCell({ value, expanded }: { value: string | null; expanded: boolean }) {
  if (!value) return <span className="text-navy-500">—</span>
  return <SecretValue value={value} truncateLength={24} expanded={expanded} />
}

function StatusBadge({ status }: { status: AdminSquareToken['connection_status'] }) {
  if (!status) return <span className="text-navy-500">—</span>
  if (status === 'connected') {
    return <span className="text-teal-600 capitalize">{status}</span>
  }
  if (status === 'error') {
    return <span className="text-red-600 capitalize">{status}</span>
  }
  return <span className="text-navy-500 capitalize">{status}</span>
}

type AdminSquareTokensTableProps = {
  squareTokens: AdminSquareToken[]
  isDeleting: (id: string) => boolean
  onDelete: (id: string, label: string) => Promise<void>
}

export default function AdminSquareTokensTable({
  squareTokens,
  isDeleting,
  onDelete,
}: AdminSquareTokensTableProps) {
  return (
    <AdminResizableTable
      storageKey="admin-square-tokens-column-widths"
      columns={COLUMNS}
      rows={squareTokens}
      getRowId={(row) => row.user_id}
      emptyMessage="No Square tokens stored yet."
      renderCell={(columnId, token, expanded) => {
        const deleteLabel = token.business_name ?? token.user_email ?? token.user_id

        switch (columnId) {
          case 'user':
            return (
              <ExpandableText value={formatCellValue(token.user_email ?? token.user_id)} expanded={expanded} />
            )
          case 'business':
            return <ExpandableText value={formatCellValue(token.business_name)} expanded={expanded} />
          case 'merchantId':
            return <ExpandableText value={formatCellValue(token.merchant_id)} expanded={expanded} monospace />
          case 'accessToken':
            return token.access_token ? (
              <div className="flex items-start gap-2 flex-wrap">
                <TokenCell value={token.access_token} expanded={expanded} />
                <CopyButton value={token.access_token} label="Square access token" />
              </div>
            ) : (
              '—'
            )
          case 'refreshToken':
            return <TokenCell value={token.refresh_token} expanded={expanded} />
          case 'locationId':
            return (
              <ExpandableText
                value={formatCellValue(token.location_id ?? token.location_name)}
                expanded={expanded}
                monospace
              />
            )
          case 'teamMemberId':
            return <ExpandableText value={formatCellValue(token.team_member_id)} expanded={expanded} monospace />
          case 'timezone':
            return <ExpandableText value={formatCellValue(token.timezone)} expanded={expanded} />
          case 'expires':
            return <ExpandableText value={formatDate(token.expires_at)} expanded={expanded} />
          case 'scopes':
            return (
              <ExpandableText value={formatCellValue(token.scopes.join(', '))} expanded={expanded} />
            )
          case 'updated':
            return <ExpandableText value={formatDate(token.updated_at)} expanded={expanded} />
          case 'status':
            return <StatusBadge status={token.connection_status} />
          case 'actions':
            return (
              <AdminDeleteButton
                label={`Square token for ${deleteLabel}`}
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
