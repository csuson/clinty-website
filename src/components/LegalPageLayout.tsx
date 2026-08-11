import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

interface LegalPageLayoutProps {
  title: string
  lastUpdated: string
  children: ReactNode
}

export default function LegalPageLayout({ title, lastUpdated, children }: LegalPageLayoutProps) {
  return (
    <div className="pt-32 pb-24 px-6">
      <div className="max-w-3xl mx-auto">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm text-navy-600 hover:text-navy-900 transition-colors mb-8"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to home
        </Link>

        <header className="mb-12">
          <h1 className="font-serif text-4xl md:text-5xl text-navy-900 mb-3">{title}</h1>
          <p className="text-sm text-navy-600">Last updated: {lastUpdated}</p>
        </header>

        <article className="prose-legal space-y-8 text-navy-600 leading-relaxed">
          {children}
        </article>
      </div>
    </div>
  )
}

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="text-xl font-semibold text-navy-900 mb-3">{title}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  )
}
