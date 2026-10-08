import type { AdminWixToken } from '../../lib/admin'
import { SecretValue } from '../SecretField'
import AdminDeleteButton from '../AdminDeleteButton'
import AdminResizableTable, { type AdminTableColumn } from './AdminResizableTable'
import { ExpandableText, formatCellValue, formatDate } from './adminTableUtils'

type ColumnId =
  | 'user'
  | 'siteId'
  | 'serviceId'
  | 'apiKey'
  | 'appId'
  | 'instanceId'
  | 'timezone'
  | 'resourceId'
  | 'locationId'
  | 'updated'
  | 'status'
  | 'actions'

const COLUMNS: AdminTableColumn<ColumnId>[] = [
  { id: 'user', label: 'User', defaultWidth: 160, minWidth: 100 },
  { id: 'siteId', label: 'Site ID', defaultWidth: 180, minWidth: 120 },
  { id: 'serviceId', label: 'Service ID', defaultWidth: 180, minWidth: 120 },
  { id: 'apiKey', label: 'API key', defaultWidth: 200, minWidth: 140 },
  { id: 'appId', label: 'App ID', defaultWidth: 140, minWidth: 100 },
  { id: 'instanceId', label: 'Instance ID', defaultWidth: 160, minWidth: 110 },
  { id: 'timezone', label: 'Timezone', defaultWidth: 150, minWidth: 100 },
  { id: 'resourceId', label: 'Resource ID', defaultWidth: 140, minWidth: 100 },
  { id: 'locationId', label: 'Location ID', defaultWidth: 140, minWidth: 100 },
  { id: 'updated', label: 'Updated', defaultWidth: 160, minWidth: 110 },
  { id: 'status', label: 'Status', defaultWidth: 110, minWidth: 90 },
  { id: 'actions', label: 'Actions', defaultWidth: 80, minWidth: 70, expandable: false, resizable: false, nowrap: true },
]

function TokenCell({ value, expanded }: { value: string | null; expanded: boolean }) {
  if (!value) return <span className="text-navy-500">—</span>
  return <SecretValue value={value} truncateLength={24} expanded={expanded} />
}

function StatusBadge({ status }: { status: AdminWixToken['connection_status'] }) {
  if (!status) return <span className="text-navy-500">—</span>
  if (status === 'connected') {
    return <span className="text-teal-600 capitalize">{status}</span>
  }
  if (status === 'error') {
    return <span className="text-red-600 capitalize">{status}</span>
  }
  return <span className="text-navy-500 capitalize">{status}</span>
}

type AdminWixTokensTableProps = {
  wixTokens: AdminWixToken[]
  isDeleting: (id: string) => boolean
  onDelete: (id: string, label: string) => Promise<void>
}

export default function AdminWixTokensTable({
  wixTokens,
  isDeleting,
  onDelete,
}: AdminWixTokensTableProps) {
  return (
    <AdminResizableTable
      storageKey="admin-wix-tokens-column-widths"
      columns={COLUMNS}
      rows={wixTokens}
      getRowId={(row) => row.user_id}
      emptyMessage="No Wix Bookings tokens stored yet."
      renderCell={(columnId, token, expanded) => {
        const deleteLabel = token.display_name ?? token.user_email ?? token.user_id

        switch (columnId) {
          case 'user':
            return (
              <ExpandableText value={formatCellValue(token.user_email ?? token.user_id)} expanded={expanded} />
            )
          case 'siteId':
            return <ExpandableText value={formatCellValue(token.site_id)} expanded={expanded} monospace />
          case 'serviceId':
            return <ExpandableText value={formatCellValue(token.service_id)} expanded={expanded} monospace />
          case 'apiKey':
            return <TokenCell value={token.api_key} expanded={expanded} />
          case 'appId':
            return <ExpandableText value={formatCellValue(token.app_id)} expanded={expanded} monospace />
          case 'instanceId':
            return <ExpandableText value={formatCellValue(token.instance_id)} expanded={expanded} monospace />
          case 'timezone':
            return <ExpandableText value={formatCellValue(token.timezone)} expanded={expanded} />
          case 'resourceId':
            return <ExpandableText value={formatCellValue(token.resource_id)} expanded={expanded} monospace />
          case 'locationId':
            return <ExpandableText value={formatCellValue(token.location_id)} expanded={expanded} monospace />
          case 'updated':
            return <ExpandableText value={formatDate(token.updated_at)} expanded={expanded} />
          case 'status':
            return <StatusBadge status={token.connection_status} />
          case 'actions':
            return (
              <AdminDeleteButton
                label={`Wix token for ${deleteLabel}`}
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
