import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

interface FaqPageLayoutProps {
  title: string
  description?: string
  children: ReactNode
}

export default function FaqPageLayout({ title, description, children }: FaqPageLayoutProps) {
  return (
    <div className="pt-32 pb-24 px-6">
      <div className="max-w-3xl mx-auto">
        <Link
          to="/faq"
          className="inline-flex items-center gap-1.5 text-sm text-navy-600 hover:text-navy-900 transition-colors mb-8"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to FAQ
        </Link>

        <header className="mb-10">
          <p className="text-sm font-medium text-teal-600 mb-2">FAQ</p>
          <h1 className="font-serif text-4xl md:text-5xl text-navy-900 mb-3">{title}</h1>
          {description && <p className="text-navy-600 text-lg leading-relaxed">{description}</p>}
        </header>

        <article className="space-y-10 text-navy-600 leading-relaxed">{children}</article>
      </div>
    </div>
  )
}

export function FaqSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="text-xl font-semibold text-navy-900 mb-4">{title}</h2>
      <div className="space-y-4">{children}</div>
    </section>
  )
}

export function FaqSubsection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <h3 className="text-base font-semibold text-navy-900 mb-3">{title}</h3>
      <div className="space-y-3">{children}</div>
    </div>
  )
}

export function FaqTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-navy-900/10">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-cream border-b border-navy-900/10">
            {headers.map((header) => (
              <th
                key={header}
                className="text-left font-semibold text-navy-900 px-4 py-3 whitespace-nowrap"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index} className="border-b border-navy-900/5 last:border-0">
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="px-4 py-3 align-top text-navy-600">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function FaqSteps({ steps }: { steps: string[] }) {
  return (
    <ol className="list-decimal pl-5 space-y-2">
      {steps.map((step) => (
        <li key={step}>{step}</li>
      ))}
    </ol>
  )
}

export function FaqCallout({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl bg-teal-400/10 border border-teal-400/20 px-4 py-3 text-sm text-navy-800">
      {children}
    </div>
  )
}
