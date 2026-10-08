import type { AdminWhatsAppConnection } from '../../lib/admin'
import { SecretValue } from '../SecretField'
import AdminDeleteButton from '../AdminDeleteButton'
import AdminResizableTable, { type AdminTableColumn } from './AdminResizableTable'
import { ExpandableText, formatCellValue, formatDate } from './adminTableUtils'

type ColumnId =
  | 'user'
  | 'phone'
  | 'deviceStatus'
  | 'gatewayUrl'
  | 'gatewayApiKey'
  | 'langgraphUrl'
  | 'authPrefix'
  | 'linkedAt'
  | 'lastError'
  | 'actions'

const COLUMNS: AdminTableColumn<ColumnId>[] = [
  { id: 'user', label: 'User', defaultWidth: 160, minWidth: 100 },
  { id: 'phone', label: 'Linked number', defaultWidth: 140, minWidth: 100 },
  { id: 'deviceStatus', label: 'Device status', defaultWidth: 120, minWidth: 90 },
  { id: 'gatewayUrl', label: 'Gateway URL', defaultWidth: 220, minWidth: 140 },
  { id: 'gatewayApiKey', label: 'Gateway API key', defaultWidth: 200, minWidth: 140 },
  { id: 'langgraphUrl', label: 'LangGraph URL', defaultWidth: 220, minWidth: 140 },
  { id: 'authPrefix', label: 'Auth prefix', defaultWidth: 140, minWidth: 100 },
  { id: 'linkedAt', label: 'Linked at', defaultWidth: 160, minWidth: 110 },
  { id: 'lastError', label: 'Last error', defaultWidth: 200, minWidth: 120 },
  { id: 'actions', label: 'Actions', defaultWidth: 80, minWidth: 70, expandable: false, resizable: false, nowrap: true },
]

function TokenCell({ value, expanded }: { value: string | null; expanded: boolean }) {
  if (!value) return <span className="text-navy-500">—</span>
  return <SecretValue value={value} truncateLength={24} expanded={expanded} />
}

function StatusBadge({ status }: { status: AdminWhatsAppConnection['status'] }) {
  if (status === 'connected') {
    return <span className="text-teal-600 capitalize">linked</span>
  }
  if (status === 'error') {
    return <span className="text-red-600 capitalize">{status}</span>
  }
  if (status === 'pairing') {
    return <span className="text-amber-700 capitalize">pairing</span>
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
      emptyMessage="No WhatsApp linked devices yet. Use Link a device above, or wait for a user to scan QR."
      renderCell={(columnId, connection, expanded) => {
        const deleteLabel = connection.phone ?? connection.user_email ?? connection.user_id

        switch (columnId) {
          case 'user':
            return (
              <ExpandableText value={formatCellValue(connection.user_email ?? connection.user_id)} expanded={expanded} />
            )
          case 'phone':
            return <ExpandableText value={formatCellValue(connection.phone)} expanded={expanded} />
          case 'deviceStatus':
            return <StatusBadge status={connection.status} />
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
          case 'langgraphUrl':
            return (
              <ExpandableText
                value={formatCellValue(
                  connection.effective_langgraph_url ?? connection.gateway_langgraph_url ?? null,
                )}
                expanded={expanded}
                monospace
              />
            )
          case 'authPrefix':
            return (
              <ExpandableText
                value={formatCellValue(connection.effective_auth_storage_prefix)}
                expanded={expanded}
                monospace
              />
            )
          case 'linkedAt':
            return <ExpandableText value={formatDate(connection.connected_at)} expanded={expanded} />
          case 'lastError':
            return <ExpandableText value={formatCellValue(connection.last_error)} expanded={expanded} />
          case 'actions':
            return (
              <AdminDeleteButton
                label={`WhatsApp device for ${deleteLabel}`}
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
