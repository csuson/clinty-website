import type { ReactNode } from 'react'
import { CopyButton } from './admin/adminTableUtils'

export default function FormField({
  label,
  id,
  required,
  hint,
  copyValue,
  children,
}: {
  label: string
  id: string
  required?: boolean
  hint?: string
  copyValue?: string | null
  children: ReactNode
}) {
  const copyText = copyValue?.trim()

  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <label htmlFor={id} className="block text-sm font-medium text-navy-900">
          {label}
          {required && <span className="text-teal-500 ml-0.5">*</span>}
        </label>
        {copyText ? <CopyButton value={copyText} label={label} /> : null}
      </div>
      {hint && <p className="text-sm text-navy-600 mb-2">{hint}</p>}
      {children}
    </div>
  )
}
