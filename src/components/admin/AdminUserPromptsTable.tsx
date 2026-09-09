import { Link } from 'react-router-dom'
import AdminDeleteButton from '../AdminDeleteButton'
import AdminResizableTable, { type AdminTableColumn } from './AdminResizableTable'
import { ExpandableText, formatCellValue, formatDate } from './adminTableUtils'
import { presetLabel } from '../../constants/responseTones'
import type { AdminDeleteResource, AdminUserPrompts } from '../../lib/admin'

type ColumnId =
  | 'user'
  | 'background'
  | 'promotions'
  | 'responseTone'
  | 'whatsappTone'
  | 'updated'
  | 'actions'

const COLUMNS: AdminTableColumn<ColumnId>[] = [
  { id: 'user', label: 'User', defaultWidth: 180, minWidth: 120 },
  { id: 'background', label: 'Background', defaultWidth: 260, minWidth: 160 },
  { id: 'promotions', label: 'Promotions', defaultWidth: 180, minWidth: 120 },
  { id: 'responseTone', label: 'Email tone', defaultWidth: 120, minWidth: 90 },
  { id: 'whatsappTone', label: 'WhatsApp tone', defaultWidth: 130, minWidth: 90 },
  { id: 'updated', label: 'Updated', defaultWidth: 160, minWidth: 110 },
  { id: 'actions', label: 'Actions', defaultWidth: 140, minWidth: 110, expandable: false, resizable: false, nowrap: true },
]

function toneLabel(value: string | null): string {
  if (!value?.trim()) return 'Same as email'
  return presetLabel(value.trim())
}

type AdminUserPromptsTableProps = {
  userPrompts: AdminUserPrompts[]
  isDeleting: (resource: AdminDeleteResource, id: string) => boolean
  onDelete: (userId: string, label: string) => Promise<void>
}

export default function AdminUserPromptsTable({
  userPrompts,
  isDeleting,
  onDelete,
}: AdminUserPromptsTableProps) {
  return (
    <AdminResizableTable
      storageKey="admin-user-prompts-column-widths"
      columns={COLUMNS}
      rows={userPrompts}
      getRowId={(row) => row.user_id}
      emptyMessage="No saved prompts yet."
      renderCell={(columnId, row, expanded) => {
        switch (columnId) {
          case 'user':
            return (
              <div className="flex items-start gap-3 flex-wrap">
                <ExpandableText
                  value={formatCellValue(row.user_email ?? row.user_id)}
                  expanded={expanded}
                />
                <Link
                  to={`/admin/prompts/${row.user_id}/edit`}
                  className="text-xs font-medium text-teal-600 hover:text-teal-700 underline shrink-0"
                >
                  Edit
                </Link>
              </div>
            )
          case 'background':
            return <ExpandableText value={formatCellValue(row.background)} expanded={expanded} />
          case 'promotions':
            return <ExpandableText value={formatCellValue(row.promotions)} expanded={expanded} />
          case 'responseTone':
            return toneLabel(row.response_tone)
          case 'whatsappTone':
            return toneLabel(row.whatsapp_response_tone)
          case 'updated':
            return <ExpandableText value={formatDate(row.updated_at)} expanded={expanded} />
          case 'actions':
            return (
              <AdminDeleteButton
                label={`prompts for ${row.user_email ?? row.user_id}`}
                disabled={isDeleting('user_prompts', row.user_id)}
                onDelete={() => onDelete(row.user_id, row.user_email ?? row.user_id)}
              />
            )
          default:
            return '—'
        }
      }}
    />
  )
}
