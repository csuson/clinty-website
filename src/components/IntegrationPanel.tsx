import type { ReactNode } from 'react'

export type IntegrationStatusKind =
  | 'loading'
  | 'connected'
  | 'disconnected'
  | 'partial'
  | 'unavailable'

export type IntegrationPanelProps = {
  title: string
  icon: ReactNode
  iconWrapperClassName?: string
  status: IntegrationStatusKind
  statusLabel: string
  expanded: boolean
  onToggle: () => void
  children: ReactNode
}

const statusStyles: Record<IntegrationStatusKind, string> = {
  loading: 'bg-navy-900/5 text-navy-600',
  connected: 'bg-teal-400/15 text-teal-700',
  disconnected: 'bg-navy-900/5 text-navy-600',
  partial: 'bg-amber-400/15 text-amber-800',
  unavailable: 'bg-amber-400/15 text-amber-800',
}

export function oauthIntegrationStatus(
  loading: boolean,
  configured: boolean,
  connected: boolean,
): { status: IntegrationStatusKind; statusLabel: string } {
  if (loading) return { status: 'loading', statusLabel: 'Checking…' }
  if (!configured) return { status: 'unavailable', statusLabel: 'Unavailable' }
  if (connected) return { status: 'connected', statusLabel: 'Connected' }
  return { status: 'disconnected', statusLabel: 'Not connected' }
}

export default function IntegrationPanel({
  title,
  icon,
  iconWrapperClassName = 'bg-cream',
  status,
  statusLabel,
  expanded,
  onToggle,
  children,
}: IntegrationPanelProps) {
  return (
    <section className="bg-white rounded-2xl border border-navy-900/5 shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className={`w-full flex items-center gap-4 p-5 text-left transition-colors ${
          expanded ? 'bg-cream/40' : 'hover:bg-cream/50'
        }`}
      >
        <div
          className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${iconWrapperClassName}`}
        >
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-semibold text-navy-900">{title}</h2>
        </div>
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium shrink-0 ${statusStyles[status]}`}
        >
          {statusLabel}
        </span>
        <svg
          className={`w-5 h-5 text-navy-600 shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {expanded && (
        <div className="px-8 pb-8 pt-2 border-t border-navy-900/5">
          {children}
        </div>
      )}
    </section>
  )
}
