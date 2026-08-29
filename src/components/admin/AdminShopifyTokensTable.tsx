import type { AdminShopifyToken } from '../../lib/admin'
import { SecretValue } from '../SecretField'
import AdminDeleteButton from '../AdminDeleteButton'
import AdminResizableTable, { type AdminTableColumn } from './AdminResizableTable'
import { CopyButton, ExpandableText, formatCellValue, formatDate } from './adminTableUtils'

type ColumnId =
  | 'user'
  | 'shopName'
  | 'shopDomain'
  | 'accessToken'
  | 'clientId'
  | 'scopes'
  | 'connected'
  | 'updated'
  | 'status'
  | 'actions'

const COLUMNS: AdminTableColumn<ColumnId>[] = [
  { id: 'user', label: 'User', defaultWidth: 160, minWidth: 100 },
  { id: 'shopName', label: 'Store', defaultWidth: 140, minWidth: 100 },
  { id: 'shopDomain', label: 'Shop domain', defaultWidth: 180, minWidth: 120 },
  { id: 'accessToken', label: 'Access token', defaultWidth: 200, minWidth: 140 },
  { id: 'clientId', label: 'Client ID', defaultWidth: 160, minWidth: 110 },
  { id: 'scopes', label: 'Scopes', defaultWidth: 220, minWidth: 140 },
  { id: 'connected', label: 'Connected', defaultWidth: 160, minWidth: 110 },
  { id: 'updated', label: 'Updated', defaultWidth: 160, minWidth: 110 },
  { id: 'status', label: 'Status', defaultWidth: 110, minWidth: 90 },
  { id: 'actions', label: 'Actions', defaultWidth: 80, minWidth: 70, expandable: false, resizable: false, nowrap: true },
]

function TokenCell({ value, expanded }: { value: string | null; expanded: boolean }) {
  if (!value) return <span className="text-navy-500">—</span>
  return <SecretValue value={value} truncateLength={24} expanded={expanded} />
}

function StatusBadge({ status }: { status: AdminShopifyToken['connection_status'] }) {
  if (!status) return <span className="text-navy-500">—</span>
  if (status === 'connected') {
    return <span className="text-teal-600 capitalize">{status}</span>
  }
  if (status === 'error') {
    return <span className="text-red-600 capitalize">{status}</span>
  }
  return <span className="text-navy-500 capitalize">{status}</span>
}

type AdminShopifyTokensTableProps = {
  shopifyTokens: AdminShopifyToken[]
  isDeleting: (id: string) => boolean
  onDelete: (id: string, label: string) => Promise<void>
}

export default function AdminShopifyTokensTable({
  shopifyTokens,
  isDeleting,
  onDelete,
}: AdminShopifyTokensTableProps) {
  return (
    <AdminResizableTable
      storageKey="admin-shopify-tokens-column-widths"
      columns={COLUMNS}
      rows={shopifyTokens}
      getRowId={(row) => row.user_id}
      emptyMessage="No Shopify tokens stored yet."
      renderCell={(columnId, token, expanded) => {
        const deleteLabel = token.shop_name ?? token.shop_domain ?? token.user_email ?? token.user_id

        switch (columnId) {
          case 'user':
            return (
              <ExpandableText value={formatCellValue(token.user_email ?? token.user_id)} expanded={expanded} />
            )
          case 'shopName':
            return <ExpandableText value={formatCellValue(token.shop_name)} expanded={expanded} />
          case 'shopDomain':
            return <ExpandableText value={formatCellValue(token.shop_domain)} expanded={expanded} monospace />
          case 'accessToken':
            return token.access_token ? (
              <div className="flex items-start gap-2 flex-wrap">
                <TokenCell value={token.access_token} expanded={expanded} />
                <CopyButton value={token.access_token} label="Shopify access token" />
              </div>
            ) : (
              '—'
            )
          case 'clientId':
            return <ExpandableText value={formatCellValue(token.client_id)} expanded={expanded} monospace />
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
          case 'actions':
            return (
              <AdminDeleteButton
                label={`Shopify token for ${deleteLabel}`}
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
