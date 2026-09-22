import type { AdminStripeToken } from '../../lib/admin'
import { SecretValue } from '../SecretField'
import AdminDeleteButton from '../AdminDeleteButton'
import AdminResizableTable, { type AdminTableColumn } from './AdminResizableTable'
import { ExpandableText, formatCellValue, formatDate } from './adminTableUtils'

type ColumnId =
  | 'user'
  | 'business'
  | 'accountId'
  | 'accessToken'
  | 'refreshToken'
  | 'publishableKey'
  | 'email'
  | 'country'
  | 'mode'
  | 'scopes'
  | 'updated'
  | 'status'
  | 'actions'

const COLUMNS: AdminTableColumn<ColumnId>[] = [
  { id: 'user', label: 'User', defaultWidth: 160, minWidth: 100 },
  { id: 'business', label: 'Business', defaultWidth: 140, minWidth: 100 },
  { id: 'accountId', label: 'Account ID', defaultWidth: 160, minWidth: 120 },
  { id: 'accessToken', label: 'Access token', defaultWidth: 200, minWidth: 140 },
  { id: 'refreshToken', label: 'Refresh token', defaultWidth: 180, minWidth: 120 },
  { id: 'publishableKey', label: 'Publishable key', defaultWidth: 180, minWidth: 120 },
  { id: 'email', label: 'Email', defaultWidth: 180, minWidth: 120 },
  { id: 'country', label: 'Country', defaultWidth: 90, minWidth: 70 },
  { id: 'mode', label: 'Mode', defaultWidth: 80, minWidth: 60 },
  { id: 'scopes', label: 'Scopes', defaultWidth: 140, minWidth: 100 },
  { id: 'updated', label: 'Updated', defaultWidth: 160, minWidth: 110 },
  { id: 'status', label: 'Status', defaultWidth: 110, minWidth: 90 },
  { id: 'actions', label: 'Actions', defaultWidth: 80, minWidth: 70, expandable: false, resizable: false, nowrap: true },
]

function TokenCell({ value, expanded }: { value: string | null; expanded: boolean }) {
  if (!value) return <span className="text-navy-500">—</span>
  return <SecretValue value={value} truncateLength={24} expanded={expanded} />
}

function StatusBadge({ status }: { status: AdminStripeToken['connection_status'] }) {
  if (!status) return <span className="text-navy-500">—</span>
  if (status === 'connected') {
    return <span className="text-teal-600 capitalize">{status}</span>
  }
  if (status === 'error') {
    return <span className="text-red-600 capitalize">{status}</span>
  }
  return <span className="text-navy-500 capitalize">{status}</span>
}

type AdminStripeTokensTableProps = {
  stripeTokens: AdminStripeToken[]
  isDeleting: (id: string) => boolean
  onDelete: (id: string, label: string) => Promise<void>
}

export default function AdminStripeTokensTable({
  stripeTokens,
  isDeleting,
  onDelete,
}: AdminStripeTokensTableProps) {
  return (
    <AdminResizableTable
      storageKey="admin-stripe-tokens-column-widths"
      columns={COLUMNS}
      rows={stripeTokens}
      getRowId={(row) => row.user_id}
      emptyMessage="No Stripe tokens stored yet."
      renderCell={(columnId, token, expanded) => {
        const deleteLabel = token.business_name ?? token.user_email ?? token.user_id

        switch (columnId) {
          case 'user':
            return (
              <ExpandableText value={formatCellValue(token.user_email ?? token.user_id)} expanded={expanded} />
            )
          case 'business':
            return <ExpandableText value={formatCellValue(token.business_name)} expanded={expanded} />
          case 'accountId':
            return <ExpandableText value={formatCellValue(token.stripe_account_id)} expanded={expanded} monospace />
          case 'accessToken':
            return token.access_token ? (
              <TokenCell value={token.access_token} expanded={expanded} />
            ) : (
              '—'
            )
          case 'refreshToken':
            return <TokenCell value={token.refresh_token} expanded={expanded} />
          case 'publishableKey':
            return <TokenCell value={token.publishable_key} expanded={expanded} />
          case 'email':
            return <ExpandableText value={formatCellValue(token.email)} expanded={expanded} />
          case 'country':
            return <ExpandableText value={formatCellValue(token.country)} expanded={expanded} />
          case 'mode':
            return (
              <ExpandableText
                value={token.livemode ? 'Live' : 'Test'}
                expanded={expanded}
              />
            )
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
                label={`Stripe token for ${deleteLabel}`}
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
