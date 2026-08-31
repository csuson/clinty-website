import { useId } from 'react'

type IconProps = {
  className?: string
}

export function GmailIcon({ className = 'w-7 h-7' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z"
      />
    </svg>
  )
}

export function GoogleCalendarIcon({ className = 'w-7 h-7' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M18 2h1a2 2 0 0 1 2 2v1H3V4a2 2 0 0 1 2-2h1V0h2v2h6V0h2v2z" />
      <path fill="#EA4335" d="M21 7H3v13a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V7z" />
      <path fill="#fff" d="M7 11h2v2H7v-2zm4 0h2v2h-2v-2zm4 0h2v2h-2v-2zM7 15h2v2H7v-2zm4 0h2v2h-2v-2z" />
      <path fill="#34A853" d="M3 7h18v2H3V7z" opacity="0.3" />
    </svg>
  )
}

export function GoogleDocsIcon({ className = 'w-7 h-7' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z"
      />
      <path fill="#A1C2FA" d="M14 2v6h6" />
      <path
        fill="#fff"
        d="M8 12h8v1.5H8V12zm0 3h8v1.5H8V15zm0 3h5.5V19.5H8V18z"
      />
    </svg>
  )
}

export function GoogleAdsIcon({ className = 'w-7 h-7' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#FBBC04" d="M4 18.5 11.5 5.5 19 18.5H4z" />
      <path fill="#34A853" d="M11.5 5.5 19 18.5h-5.5L11.5 5.5z" />
      <path fill="#4285F4" d="M13.5 18.5 11.5 5.5 19 18.5h-5.5z" />
      <circle cx="17" cy="7" r="3.5" fill="#4285F4" />
    </svg>
  )
}

export function SquareIcon({ className = 'w-7 h-7' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
      <path d="M4.01 0A4.01 4.01 0 0 0 0 4.01v15.98A4.01 4.01 0 0 0 4.01 24h15.98A4.01 4.01 0 0 0 24 19.99V4.01A4.01 4.01 0 0 0 19.99 0H4.01zm9.66 4.39c1.01 0 1.83.82 1.83 1.83s-.82 1.83-1.83 1.83-1.83-.82-1.83-1.83.82-1.83 1.83-1.83zm-5.66 2.74h11.32v1.83H8.01V7.13zm0 3.66h11.32v1.83H8.01v-1.83zm0 3.66h7.55v1.83H8.01v-1.83z" />
    </svg>
  )
}

export function ExcelIcon({ className = 'w-7 h-7' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#217346" d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" />
      <path fill="#33C481" d="M14 2v6h6" />
      <path
        fill="#fff"
        d="M8.5 11.5 10.2 14l-1.7 2.5H9.8l.9-1.4.9 1.4h1.2l-1.7-2.5 1.7-2.5h-1.2l-.9 1.4-.9-1.4H8.5z"
      />
    </svg>
  )
}

export function OutlookIcon({ className = 'w-7 h-7' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#0078D4" d="M7 4h10a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" />
      <path fill="#28A8EA" d="M13 7h8v10h-8a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2z" />
      <path
        fill="#fff"
        d="M9.5 8.5a3 3 0 1 0 0 6 3 3 0 0 0 0-6zm6.5 1.5h4v1.5h-4V10zm0 2.5h4V14h-4v-1.5z"
      />
    </svg>
  )
}

export function MicrosoftCalendarIcon({ className = 'w-7 h-7' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#0078D4" d="M18 2h1a2 2 0 0 1 2 2v1H3V4a2 2 0 0 1 2-2h1V0h2v2h6V0h2v2z" />
      <path fill="#106EBE" d="M21 7H3v13a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V7z" />
      <path fill="#fff" d="M7 11h2v2H7v-2zm4 0h2v2h-2v-2zm4 0h2v2h-2v-2zM7 15h2v2H7v-2zm4 0h2v2h-2v-2z" />
    </svg>
  )
}

export function WhatsAppIcon({ className = 'w-7 h-7' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  )
}

export function ShopifyIcon({ className = 'w-7 h-7' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
      <path
        fill="#95BF47"
        d="M15.34 3.5c-.05 0-.1.01-.15.02-.05-.01-.1-.02-.15-.02-1.2 0-2.17.97-2.17 2.17 0 .35.08.68.23.98L12 8.5l-.9-1.85c.15-.3.23-.63.23-.98 0-1.2-.97-2.17-2.17-2.17-.05 0-.1.01-.15.02-.05-.01-.1-.02-.15-.02C6.8 3.5 4 6.3 4 9.75V20a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V9.75C20 6.3 17.2 3.5 15.34 3.5zM12 17.5a3.25 3.25 0 1 1 0-6.5 3.25 3.25 0 0 1 0 6.5z"
      />
    </svg>
  )
}

export function QuickBooksIcon({ className = 'w-7 h-7' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="11" fill="#2CA01C" />
      <path
        fill="#fff"
        d="M8.5 7.5h2.2c1.8 0 3 1.1 3 2.7 0 1.1-.6 2-1.6 2.4l2 3.4h-2.3l-1.8-3.1H10v3.1H8.5V7.5zm2.2 4.1c.9 0 1.4-.5 1.4-1.3s-.5-1.3-1.4-1.3H10v2.6h.7z"
      />
    </svg>
  )
}

export function FacebookIcon({ className = 'w-7 h-7' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
      <path
        fill="#1877F2"
        d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z"
      />
    </svg>
  )
}

export function MessengerIcon({ className = 'w-7 h-7' }: IconProps) {
  const gradientId = useId()
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#0099FF" />
          <stop offset="100%" stopColor="#A033FF" />
        </linearGradient>
      </defs>
      <path
        fill={`url(#${gradientId})`}
        d="M12 0C5.373 0 0 4.975 0 11.111c0 3.497 1.745 6.616 4.472 8.652V24l4.086-2.242c1.09.301 2.245.464 3.442.464 6.627 0 12-4.975 12-11.111C24 4.975 18.627 0 12 0zm1.193 14.963-3.056-3.259-5.97 3.259 6.588-7.011 3.132 3.259 5.881-3.259-6.575 7.011z"
      />
    </svg>
  )
}

export function InstagramIcon({ className = 'w-7 h-7' }: IconProps) {
  const gradientId = useId()
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#FD5949" />
          <stop offset="50%" stopColor="#D6249F" />
          <stop offset="100%" stopColor="#285AEB" />
        </linearGradient>
      </defs>
      <rect width="24" height="24" rx="6" fill={`url(#${gradientId})`} />
      <path
        fill="#fff"
        d="M12 7.2A4.8 4.8 0 1 0 16.8 12 4.805 4.805 0 0 0 12 7.2zm0 7.9A3.1 3.1 0 1 1 15.1 12 3.104 3.104 0 0 1 12 15.1zM16.55 6.75a1.125 1.125 0 1 0 1.125 1.125A1.125 1.125 0 0 0 16.55 6.75zM12 4.8c-1.32 0-1.49.005-2.01.03a3.3 3.3 0 0 0-1.09.21 2.18 2.18 0 0 0-.79.51 2.18 2.18 0 0 0-.51.79 3.3 3.3 0 0 0-.21 1.09C7.405 7.96 7.4 8.13 7.4 9.45v.1c0 1.32.005 1.49.03 2.01a3.3 3.3 0 0 0 .21 1.09 2.18 2.18 0 0 0 .51.79 2.18 2.18 0 0 0 .79.51 3.3 3.3 0 0 0 1.09.21c.52.025.69.03 2.01.03s1.49-.005 2.01-.03a3.3 3.3 0 0 0 1.09-.21 2.32 2.32 0 0 0 1.3-1.3 3.3 3.3 0 0 0 .21-1.09c.025-.52.03-.69.03-2.01s-.005-1.49-.03-2.01a3.3 3.3 0 0 0-.21-1.09 2.18 2.18 0 0 0-.51-.79 2.18 2.18 0 0 0-.79-.51 3.3 3.3 0 0 0-1.09-.21c-.52-.025-.69-.03-2.01-.03z"
      />
    </svg>
  )
}
