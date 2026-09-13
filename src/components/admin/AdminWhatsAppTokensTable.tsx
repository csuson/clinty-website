import type { AdminWhatsAppConnection } from '../../lib/admin'
import { SecretValue } from '../SecretField'
import AdminDeleteButton from '../AdminDeleteButton'
import AdminResizableTable, { type AdminTableColumn } from './AdminResizableTable'
import { ExpandableText, formatCellValue, formatDate } from './adminTableUtils'

type ColumnId =
  | 'user'
  | 'phone'
  | 'gatewayUrl'
  | 'gatewayApiKey'
  | 'authPrefix'
  | 'status'
  | 'connected'
  | 'lastError'
  | 'actions'

const COLUMNS: AdminTableColumn<ColumnId>[] = [
  { id: 'user', label: 'User', defaultWidth: 160, minWidth: 100 },
  { id: 'phone', label: 'Phone', defaultWidth: 140, minWidth: 100 },
  { id: 'gatewayUrl', label: 'Gateway URL', defaultWidth: 220, minWidth: 140 },
  { id: 'gatewayApiKey', label: 'Gateway API key', defaultWidth: 220, minWidth: 140 },
  { id: 'authPrefix', label: 'Auth prefix', defaultWidth: 140, minWidth: 100 },
  { id: 'status', label: 'Status', defaultWidth: 110, minWidth: 90 },
  { id: 'connected', label: 'Connected', defaultWidth: 160, minWidth: 110 },
  { id: 'lastError', label: 'Last error', defaultWidth: 200, minWidth: 120 },
  { id: 'actions', label: 'Actions', defaultWidth: 80, minWidth: 70, expandable: false, resizable: false, nowrap: true },
]

function TokenCell({ value, expanded }: { value: string | null; expanded: boolean }) {
  if (!value) return <span className="text-navy-500">—</span>
  return <SecretValue value={value} truncateLength={24} expanded={expanded} />
}

function StatusBadge({ status }: { status: AdminWhatsAppConnection['status'] }) {
  if (status === 'connected') {
    return <span className="text-teal-600 capitalize">{status}</span>
  }
  if (status === 'error') {
    return <span className="text-red-600 capitalize">{status}</span>
  }
  if (status === 'pairing') {
    return <span className="text-amber-700 capitalize">{status}</span>
  }
  return <span className="text-navy-500 capitalize">{status}</span>
}

type AdminWhatsAppTokensTableProps = {
  whatsappConnections: AdminWhatsAppConnection[]
  isDeleting: (id: string) => boolean
  onDelete: (id: string, label: string) => Promise<void>
}

export default function AdminWhatsAppTokensTable({
  whatsappConnections,
  isDeleting,
  onDelete,
}: AdminWhatsAppTokensTableProps) {
  return (
    <AdminResizableTable
      storageKey="admin-whatsapp-tokens-column-widths"
      columns={COLUMNS}
      rows={whatsappConnections}
      getRowId={(row) => row.user_id}
      emptyMessage="No WhatsApp gateway settings stored yet."
      renderCell={(columnId, connection, expanded) => {
        const deleteLabel = connection.phone ?? connection.user_email ?? connection.user_id

        switch (columnId) {
          case 'user':
            return (
              <ExpandableText value={formatCellValue(connection.user_email ?? connection.user_id)} expanded={expanded} />
            )
          case 'phone':
            return <ExpandableText value={formatCellValue(connection.phone)} expanded={expanded} />
          case 'gatewayUrl':
            return (
              <ExpandableText
                value={formatCellValue(connection.effective_gateway_url ?? connection.gateway_url)}
                expanded={expanded}
                monospace
              />
            )
          case 'gatewayApiKey':
            return (
              <div className="space-y-1">
                <TokenCell value={connection.effective_gateway_api_key} expanded={expanded} />
                {connection.uses_clinty_api_key ? (
                  <span className="text-xs text-navy-500">Uses Clinty API key</span>
                ) : null}
              </div>
            )
          case 'authPrefix':
            return (
              <ExpandableText
                value={formatCellValue(connection.effective_auth_storage_prefix)}
                expanded={expanded}
                monospace
              />
            )
          case 'status':
            return <StatusBadge status={connection.status} />
          case 'connected':
            return <ExpandableText value={formatDate(connection.connected_at)} expanded={expanded} />
          case 'lastError':
            return <ExpandableText value={formatCellValue(connection.last_error)} expanded={expanded} />
          case 'actions':
            return (
              <AdminDeleteButton
                label={`WhatsApp settings for ${deleteLabel}`}
                disabled={isDeleting(connection.user_id)}
                onDelete={() => onDelete(connection.user_id, deleteLabel)}
              />
            )
          default:
            return '—'
        }
      }}
    />
  )
}
