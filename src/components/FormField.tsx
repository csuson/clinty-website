import type { ReactNode } from 'react'

export default function FormField({
  label,
  id,
  required,
  children,
}: {
  label: string
  id: string
  required?: boolean
  children: ReactNode
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-navy-900 mb-1.5">
        {label}
        {required && <span className="text-teal-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}
