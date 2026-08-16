import { useState } from 'react'

export function formatDate(value: string | null): string {
  if (!value) return '—'
  return new Date(value).toLocaleString()
}

export function formatCellValue(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return '—'
  return String(value)
}

export function ExpandToggleButton({
  expanded,
  onToggle,
  label,
}: {
  expanded: boolean
  onToggle: () => void
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={expanded ? `Collapse ${label}` : `Expand ${label}`}
      title={expanded ? `Collapse ${label}` : `Expand ${label}`}
      className="inline-flex items-center justify-center text-navy-500 hover:text-teal-600 shrink-0"
    >
      <svg
        className={`w-3.5 h-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        aria-hidden="true"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    </button>
  )
}

export function ExpandableText({
  value,
  expanded,
  monospace = false,
}: {
  value: string
  expanded: boolean
  monospace?: boolean
}) {
  if (value === '—') {
    return <span className="text-navy-500">—</span>
  }

  return (
    <span
      className={`${monospace ? 'font-mono text-xs' : ''} break-all ${expanded ? 'whitespace-pre-wrap' : 'line-clamp-2'}`}
    >
      {value}
    </span>
  )
}

export function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    await navigator.clipboard.writeText(value)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1500)
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="text-xs font-medium text-teal-600 hover:text-teal-700 shrink-0"
      title={`Copy ${label}`}
    >
      {copied ? 'Copied' : 'Copy'}
    </button>
  )
}
