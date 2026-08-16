import { useState } from 'react'

function EyeToggleButton({
  visible,
  onToggle,
  disabled = false,
}: {
  visible: boolean
  onToggle: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      aria-label={visible ? 'Hide secret' : 'Show secret'}
      title={visible ? 'Hide secret' : 'Show secret'}
      className="inline-flex items-center justify-center text-teal-600 hover:text-teal-700 disabled:opacity-60 shrink-0"
    >
      {visible ? (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
          />
        </svg>
      ) : (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
          />
        </svg>
      )}
    </button>
  )
}

type SecretInputProps = {
  id: string
  value: string
  onChange: (value: string) => void
  className?: string
  disabled?: boolean
  placeholder?: string
}

export function SecretInput({
  id,
  value,
  onChange,
  className,
  disabled = false,
  placeholder,
}: SecretInputProps) {
  const [visible, setVisible] = useState(false)

  return (
    <div className="flex items-center gap-2">
      <input
        id={id}
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={className}
        disabled={disabled}
        autoComplete="off"
      />
      <EyeToggleButton
        visible={visible}
        onToggle={() => setVisible((current) => !current)}
        disabled={disabled}
      />
    </div>
  )
}

type SecretValueProps = {
  value: string
  truncateLength?: number
  className?: string
}

function maskSecret(value: string, truncateLength: number): string {
  if (value.length <= truncateLength) {
    return '•'.repeat(Math.min(value.length, truncateLength))
  }
  return `${value.slice(0, truncateLength)}…`
}

export function SecretValue({ value, truncateLength = 20, className = 'font-mono text-xs' }: SecretValueProps) {
  const [visible, setVisible] = useState(false)

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className={`${className} break-all`}>
        {visible ? value : maskSecret(value, truncateLength)}
      </span>
      <EyeToggleButton visible={visible} onToggle={() => setVisible((current) => !current)} />
    </div>
  )
}
