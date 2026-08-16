import { SecretValue } from '../SecretField'
import AdminDeleteButton from '../AdminDeleteButton'
import AdminResizableTable, { type AdminTableColumn } from './AdminResizableTable'
import { CopyButton, ExpandableText, formatCellValue, formatDate } from './adminTableUtils'
import type { AdminApiKey } from '../../lib/admin'

type ColumnId =
  | 'user'
  | 'name'
  | 'apiKey'
  | 'prefix'
  | 'hash'
  | 'created'
  | 'lastUsed'
  | 'status'
  | 'actions'

const COLUMNS: AdminTableColumn<ColumnId>[] = [
  { id: 'user', label: 'User', defaultWidth: 160, minWidth: 100 },
  { id: 'name', label: 'Name', defaultWidth: 140, minWidth: 100 },
  { id: 'apiKey', label: 'API Key', defaultWidth: 240, minWidth: 140 },
  { id: 'prefix', label: 'Prefix', defaultWidth: 120, minWidth: 90 },
  { id: 'hash', label: 'Hash', defaultWidth: 140, minWidth: 100 },
  { id: 'created', label: 'Created', defaultWidth: 160, minWidth: 110 },
  { id: 'lastUsed', label: 'Last used', defaultWidth: 160, minWidth: 110 },
  { id: 'status', label: 'Status', defaultWidth: 100, minWidth: 80 },
  { id: 'actions', label: 'Actions', defaultWidth: 80, minWidth: 70, expandable: false, resizable: false, nowrap: true },
]

type AdminApiKeysTableProps = {
  apiKeys: AdminApiKey[]
  isDeleting: (id: string) => boolean
  onDelete: (id: string, name: string) => Promise<void>
}

export default function AdminApiKeysTable({ apiKeys, isDeleting, onDelete }: AdminApiKeysTableProps) {
  return (
    <AdminResizableTable
      storageKey="admin-api-keys-column-widths"
      columns={COLUMNS}
      rows={apiKeys}
      getRowId={(row) => row.id}
      emptyMessage="No API keys yet."
      renderCell={(columnId, key, expanded) => {
        switch (columnId) {
          case 'user':
            return (
              <ExpandableText value={formatCellValue(key.user_email ?? key.user_id)} expanded={expanded} />
            )
          case 'name':
            return <ExpandableText value={key.name} expanded={expanded} />
          case 'apiKey':
            if (!key.key_secret) {
              return (
                <span className="text-xs text-navy-500">Not stored (created before secret column)</span>
              )
            }
            return (
              <div className="flex items-start gap-2 flex-wrap">
                <SecretValue value={key.key_secret} truncateLength={32} expanded={expanded} />
                <CopyButton value={key.key_secret} label="API key" />
              </div>
            )
          case 'prefix':
            return <ExpandableText value={key.key_prefix} expanded={expanded} monospace />
          case 'hash':
            return <ExpandableText value={key.key_hash} expanded={expanded} monospace />
          case 'created':
            return <ExpandableText value={formatDate(key.created_at)} expanded={expanded} />
          case 'lastUsed':
            return <ExpandableText value={formatDate(key.last_used_at)} expanded={expanded} />
          case 'status':
            return key.revoked_at ? (
              <span className="text-red-600">Revoked</span>
            ) : (
              <span className="text-teal-600">Active</span>
            )
          case 'actions':
            return (
              <AdminDeleteButton
                label={`API key ${key.name}`}
                disabled={isDeleting(key.id)}
                onDelete={() => onDelete(key.id, key.name)}
              />
            )
          default:
            return '—'
        }
      }}
    />
  )
}
