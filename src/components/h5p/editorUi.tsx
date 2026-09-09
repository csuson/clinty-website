import { useEffect, useState, type ReactNode } from 'react'

export const editorInputClass =
  'w-full px-3 py-2 rounded-md border border-slate-300 bg-white text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500'

export const editorTextareaClass = `${editorInputClass} min-h-[5.5rem] resize-y leading-relaxed`

export function truncateLabel(text: string, fallback: string, max = 42): string {
  const trimmed = text.trim()
  if (!trimmed) return fallback
  return trimmed.length > max ? `${trimmed.slice(0, max)}…` : trimmed
}

export function useSelectedIndex(itemCount: number) {
  const [selectedIndex, setSelectedIndex] = useState(0)

  useEffect(() => {
    if (selectedIndex >= itemCount) {
      setSelectedIndex(Math.max(0, itemCount - 1))
    }
  }, [itemCount, selectedIndex])

  return { selectedIndex, setSelectedIndex }
}

export function EditorField({
  label,
  id,
  hint,
  children,
}: {
  label: string
  id: string
  hint?: string
  children: ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-semibold text-slate-800">
        {label}
      </label>
      {hint && <p className="text-xs text-slate-500">{hint}</p>}
      {children}
    </div>
  )
}

export function ToggleField({
  label,
  description,
  checked,
  onChange,
}: {
  label: string
  description?: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <label className="flex items-start gap-3 cursor-pointer group">
      <span className="relative mt-0.5 inline-flex h-5 w-9 shrink-0 items-center">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="peer sr-only"
        />
        <span className="absolute inset-0 rounded-full bg-slate-300 transition-colors peer-checked:bg-blue-600" />
        <span className="absolute left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform peer-checked:translate-x-4" />
      </span>
      <span>
        <span className="block text-sm font-semibold text-slate-800 group-hover:text-slate-900">{label}</span>
        {description && <span className="block text-xs text-slate-500 mt-0.5">{description}</span>}
      </span>
    </label>
  )
}

export function CollapsibleSection({
  title,
  defaultOpen = true,
  children,
}: {
  title: string
  defaultOpen?: boolean
  children: ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <section className="border border-slate-200 rounded-lg bg-white overflow-hidden shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 bg-slate-50 border-b border-slate-200 text-left hover:bg-slate-100/80 transition-colors"
      >
        <span className="text-sm font-semibold text-slate-800">{title}</span>
        <svg
          className={`w-4 h-4 text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && <div className="p-4 space-y-4">{children}</div>}
    </section>
  )
}

export function EditorShell({
  contentTypeLabel,
  countLabel,
  children,
}: {
  contentTypeLabel: string
  countLabel?: string
  children: ReactNode
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-[#ececec] overflow-hidden shadow-sm">
      <div className="px-4 py-3 bg-white border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-blue-700">{contentTypeLabel}</p>
        {countLabel && <p className="text-xs text-slate-500">{countLabel}</p>}
      </div>
      <div className="p-4 space-y-4">{children}</div>
    </div>
  )
}

export function ListSection({
  title,
  description,
  sidebar,
  children,
}: {
  title: string
  description?: string
  sidebar: ReactNode
  children: ReactNode
}) {
  return (
    <section className="border border-slate-200 rounded-lg bg-white overflow-hidden shadow-sm">
      <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
        <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
        {description && <p className="text-xs text-slate-500 mt-0.5">{description}</p>}
      </div>
      <div className="flex flex-col lg:flex-row min-h-[24rem]">
        <aside className="lg:w-56 shrink-0 border-b lg:border-b-0 lg:border-r border-slate-200 bg-slate-50/70 p-3 space-y-2">
          {sidebar}
        </aside>
        <div className="flex-1 p-4 space-y-4">{children}</div>
      </div>
    </section>
  )
}

export function SidebarAddButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full px-3 py-2 rounded-md text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors"
    >
      + {label}
    </button>
  )
}

export function SidebarImportButton({
  label = 'Import CSV',
  accept = '.csv,.txt,text/csv,text/plain',
  onImport,
}: {
  label?: string
  accept?: string
  onImport: (file: File) => void | Promise<void>
}) {
  return (
    <label className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 cursor-pointer">
      {label}
      <input
        type="file"
        accept={accept}
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) void onImport(file)
          e.target.value = ''
        }}
      />
    </label>
  )
}

export function SidebarItemButton({
  active,
  badge,
  label,
  onClick,
}: {
  active: boolean
  badge: string
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
        active
          ? 'bg-blue-100 text-blue-900 border border-blue-200'
          : 'text-slate-700 hover:bg-white border border-transparent'
      }`}
    >
      <span className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500">{badge}</span>
      <span className="block truncate mt-0.5">{label}</span>
    </button>
  )
}

export function ItemToolbar({
  typeLabel,
  onMoveUp,
  onMoveDown,
  onRemove,
  disableMoveUp,
  disableMoveDown,
}: {
  typeLabel?: string
  onMoveUp: () => void
  onMoveDown: () => void
  onRemove: () => void
  disableMoveUp?: boolean
  disableMoveDown?: boolean
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200">
      {typeLabel ? (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Item type</p>
          <p className="text-sm font-medium text-slate-800 mt-0.5">{typeLabel}</p>
        </div>
      ) : (
        <div />
      )}
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onMoveUp}
          disabled={disableMoveUp}
          className="px-2 py-1 rounded text-xs font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-40"
          title="Move up"
        >
          ↑
        </button>
        <button
          type="button"
          onClick={onMoveDown}
          disabled={disableMoveDown}
          className="px-2 py-1 rounded text-xs font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-40"
          title="Move down"
        >
          ↓
        </button>
        <button
          type="button"
          onClick={onRemove}
          className="px-2 py-1 rounded text-xs font-medium text-red-700 hover:bg-red-50"
        >
          Remove
        </button>
      </div>
    </div>
  )
}

export function moveListItem<T>(items: T[], index: number, direction: -1 | 1): T[] {
  const target = index + direction
  if (target < 0 || target >= items.length) return items
  const next = [...items]
  ;[next[index], next[target]] = [next[target], next[index]]
  return next
}
