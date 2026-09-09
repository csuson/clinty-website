import { Link } from 'react-router-dom'

type ClintyLogoProps = {
  className?: string
  markClassName?: string
  wordmarkClassName?: string
  variant?: 'default' | 'dark'
  linked?: boolean
}

export default function ClintyLogo({
  className = '',
  markClassName = 'w-9 h-9',
  wordmarkClassName = '',
  variant = 'default',
  linked = true,
}: ClintyLogoProps) {
  const markSrc = variant === 'dark' ? '/logo-mark.svg' : '/logo-mark.svg'
  const wordmark = (
    <span
      className={`font-serif text-[1.65rem] leading-none tracking-tight ${
        variant === 'dark' ? 'text-cream' : 'text-navy-900'
      } ${wordmarkClassName}`}
      aria-hidden="true"
    >
      Clinty
    </span>
  )

  const content = (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <img src={markSrc} alt="" aria-hidden="true" className={`${markClassName} rounded-xl`} />
      {wordmark}
      <span className="sr-only">Clinty</span>
    </span>
  )

  if (!linked) return content

  return (
    <Link to="/" className="inline-flex items-center group">
      {content}
    </Link>
  )
}
