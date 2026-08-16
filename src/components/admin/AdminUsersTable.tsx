import AdminDeleteButton from '../AdminDeleteButton'
import AdminResizableTable, { type AdminTableColumn } from './AdminResizableTable'
import { ExpandableText, formatCellValue, formatDate } from './adminTableUtils'
import type { Profile } from '../../types/database'

type ColumnId = 'email' | 'name' | 'company' | 'plan' | 'billing' | 'trialEnds' | 'created' | 'actions'

const COLUMNS: AdminTableColumn<ColumnId>[] = [
  { id: 'email', label: 'Email', defaultWidth: 200, minWidth: 120 },
  { id: 'name', label: 'Name', defaultWidth: 140, minWidth: 100 },
  { id: 'company', label: 'Company', defaultWidth: 140, minWidth: 100 },
  { id: 'plan', label: 'Plan', defaultWidth: 100, minWidth: 80 },
  { id: 'billing', label: 'Billing', defaultWidth: 110, minWidth: 90 },
  { id: 'trialEnds', label: 'Trial ends', defaultWidth: 160, minWidth: 110 },
  { id: 'created', label: 'Created', defaultWidth: 160, minWidth: 110 },
  { id: 'actions', label: 'Actions', defaultWidth: 80, minWidth: 70, expandable: false, resizable: false, nowrap: true },
]

type AdminUsersTableProps = {
  users: Profile[]
  currentUserId?: string
  isDeleting: (id: string) => boolean
  onDelete: (id: string, email: string) => Promise<void>
}

export default function AdminUsersTable({
  users,
  currentUserId,
  isDeleting,
  onDelete,
}: AdminUsersTableProps) {
  return (
    <AdminResizableTable
      storageKey="admin-users-column-widths"
      columns={COLUMNS}
      rows={users}
      getRowId={(row) => row.id}
      emptyMessage="No users yet."
      renderCell={(columnId, profile, expanded) => {
        switch (columnId) {
          case 'email':
            return <ExpandableText value={profile.email} expanded={expanded} />
          case 'name':
            return <ExpandableText value={formatCellValue(profile.full_name)} expanded={expanded} />
          case 'company':
            return <ExpandableText value={formatCellValue(profile.company_name)} expanded={expanded} />
          case 'plan':
            return <ExpandableText value={profile.plan} expanded={expanded} />
          case 'billing':
            return (
              <ExpandableText
                value={profile.billing_status.replace('_', ' ')}
                expanded={expanded}
              />
            )
          case 'trialEnds':
            return <ExpandableText value={formatDate(profile.trial_ends_at)} expanded={expanded} />
          case 'created':
            return <ExpandableText value={formatDate(profile.created_at)} expanded={expanded} />
          case 'actions':
            return (
              <AdminDeleteButton
                label={profile.email}
                disabled={isDeleting(profile.id) || profile.id === currentUserId}
                onDelete={() =>
                  onDelete(
                    profile.id,
                    profile.email,
                  )
                }
              />
            )
          default:
            return '—'
        }
      }}
    />
  )
}
