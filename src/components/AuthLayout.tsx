import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

interface AuthLayoutProps {
  title: string
  subtitle: string
  children: ReactNode
  footer: ReactNode
}

export default function AuthLayout({ title, subtitle, children, footer }: AuthLayoutProps) {
  return (
    <div className="pt-32 pb-24 px-6 min-h-[80vh] flex items-start justify-center">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2.5 mb-8">
            <div className="w-8 h-8 rounded-lg bg-navy-900 flex items-center justify-center">
              <span className="text-teal-400 font-bold text-sm">C</span>
            </div>
            <span className="font-semibold text-lg text-navy-900">Clinty</span>
          </Link>
          <h1 className="font-serif text-3xl md:text-4xl text-navy-900 mb-2">{title}</h1>
          <p className="text-navy-600">{subtitle}</p>
        </div>

        <div className="bg-white rounded-2xl border border-navy-900/5 p-8 shadow-sm">
          {children}
        </div>

        <p className="text-center text-sm text-navy-600 mt-6">{footer}</p>
      </div>
    </div>
  )
}

export function AuthError({ message }: { message: string }) {
  return (
    <div className="rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 mb-5">
      {message}
    </div>
  )
}

export function AuthSuccess({ message }: { message: string }) {
  return (
    <div className="rounded-xl bg-teal-400/10 border border-teal-400/20 text-teal-600 text-sm px-4 py-3 mb-5">
      {message}
    </div>
  )
}

export function AuthConfigNotice() {
  return (
    <div className="rounded-xl bg-amber-400/10 border border-amber-400/20 text-navy-900 text-sm px-4 py-3 space-y-2">
      <p className="font-medium">Database not configured yet</p>
      <p className="text-navy-600">
        Copy <code className="text-xs bg-cream px-1 py-0.5 rounded">.env.example</code> to{' '}
        <code className="text-xs bg-cream px-1 py-0.5 rounded">.env</code>, add your Supabase
        credentials, and run <code className="text-xs bg-cream px-1 py-0.5 rounded">supabase/schema.sql</code>{' '}
        in the Supabase SQL editor.
      </p>
    </div>
  )
}
