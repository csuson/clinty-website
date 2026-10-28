import type { AdminBookingRecoveryConnection } from '../../lib/admin'
import AdminDeleteButton from '../AdminDeleteButton'
import AdminResizableTable, { type AdminTableColumn } from './AdminResizableTable'
import { ExpandableText, formatCellValue, formatDate } from './adminTableUtils'

type ColumnId =
  | 'user'
  | 'enabled'
  | 'merchant'
  | 'wixInstance'
  | 'wixSite'
  | 'token'
  | 'langgraph'
  | 'updated'
  | 'actions'

const COLUMNS: AdminTableColumn<ColumnId>[] = [
  { id: 'user', label: 'User', defaultWidth: 160, minWidth: 120 },
  { id: 'enabled', label: 'Enabled', defaultWidth: 80, minWidth: 70 },
  { id: 'merchant', label: 'Square merchant', defaultWidth: 140, minWidth: 100 },
  { id: 'wixInstance', label: 'Wix instance', defaultWidth: 140, minWidth: 100 },
  { id: 'wixSite', label: 'Wix site', defaultWidth: 140, minWidth: 100 },
  { id: 'token', label: 'Webhook token', defaultWidth: 140, minWidth: 100 },
  { id: 'langgraph', label: 'LangGraph URL', defaultWidth: 220, minWidth: 140 },
  { id: 'updated', label: 'Updated', defaultWidth: 140, minWidth: 110 },
  {
    id: 'actions',
    label: 'Actions',
    defaultWidth: 80,
    minWidth: 70,
    expandable: false,
    resizable: false,
    nowrap: true,
  },
]

type AdminBookingRecoveryTableProps = {
  connections: AdminBookingRecoveryConnection[]
  isDeleting: (id: string) => boolean
  onDelete: (id: string, label: string) => Promise<void>
}

export default function AdminBookingRecoveryTable({
  connections,
  isDeleting,
  onDelete,
}: AdminBookingRecoveryTableProps) {
  return (
    <AdminResizableTable
      storageKey="admin-booking-recovery-column-widths"
      columns={COLUMNS}
      rows={connections}
      getRowId={(row) => row.user_id}
      emptyMessage="No booking recovery connections yet."
      renderCell={(columnId, row, expanded) => {
        const deleteLabel = row.user_email ?? row.user_id

        switch (columnId) {
          case 'user':
            return (
              <ExpandableText value={formatCellValue(row.user_email ?? row.user_id)} expanded={expanded} />
            )
          case 'enabled':
            return (
              <span className={row.enabled ? 'text-teal-600' : 'text-navy-500'}>
                {row.enabled ? 'Yes' : 'No'}
              </span>
            )
          case 'merchant':
            return (
              <ExpandableText value={formatCellValue(row.square_merchant_id)} expanded={expanded} monospace />
            )
          case 'wixInstance':
            return (
              <ExpandableText value={formatCellValue(row.wix_instance_id)} expanded={expanded} monospace />
            )
          case 'wixSite':
            return (
              <ExpandableText value={formatCellValue(row.wix_site_id)} expanded={expanded} monospace />
            )
          case 'token':
            return (
              <ExpandableText value={formatCellValue(row.webhook_token)} expanded={expanded} monospace />
            )
          case 'langgraph':
            return (
              <ExpandableText value={formatCellValue(row.langgraph_url)} expanded={expanded} monospace />
            )
          case 'updated':
            return <ExpandableText value={formatDate(row.updated_at)} expanded={expanded} />
          case 'actions':
            return (
              <AdminDeleteButton
                label={`Booking recovery for ${deleteLabel}`}
                disabled={isDeleting(row.user_id)}
                onDelete={() => onDelete(row.user_id, deleteLabel)}
              />
            )
          default:
            return '—'
        }
      }}
    />
  )
}
