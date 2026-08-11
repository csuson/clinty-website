import { useState, type FormEvent, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { SUPPORT_EMAIL } from '../constants/contact'

const inquiryTypes = [
  'General inquiry',
  'Book a demo',
  'Technical support',
  'Billing question',
  'Partnership',
]

export default function Contact() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [company, setCompany] = useState('')
  const [inquiryType, setInquiryType] = useState(inquiryTypes[0])
  const [message, setMessage] = useState('')

  function handleSubmit(e: FormEvent) {
    e.preventDefault()

    const subject = `[Clinty] ${inquiryType}${company ? ` — ${company}` : ''}`
    const body = [
      `Name: ${name}`,
      `Email: ${email}`,
      company ? `Company: ${company}` : '',
      `Inquiry type: ${inquiryType}`,
      '',
      'Message:',
      message,
    ]
      .filter(Boolean)
      .join('\n')

    window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
  }

  return (
    <div className="pt-32 pb-24 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="max-w-2xl mx-auto text-center mb-16">
          <h1 className="font-serif text-4xl md:text-5xl text-navy-900 mb-4">
            Get in <em className="text-teal-500 not-italic">touch</em>
          </h1>
          <p className="text-navy-600 text-lg">
            Have a question, want a demo, or need help getting started? We&apos;d love to hear
            from you.
          </p>
        </div>

        <div className="grid lg:grid-cols-5 gap-10 max-w-5xl mx-auto">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl border border-navy-900/5 p-6">
              <div className="text-teal-500 mb-3">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <h2 className="font-semibold text-navy-900 mb-1">Get in touch</h2>
              <p className="text-sm text-navy-600">
                Use the contact form to reach our support team. We typically respond within one
                business day.
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-navy-900/5 p-6">
              <div className="text-amber-500 mb-3">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h2 className="font-semibold text-navy-900 mb-1">Response time</h2>
              <p className="text-sm text-navy-600">
                Monday–Friday, 9am–6pm PT. Demo requests are usually scheduled within 24 hours.
              </p>
            </div>

            <div className="bg-navy-900 rounded-2xl p-6 text-cream">
              <h2 className="font-semibold mb-2">Prefer to explore first?</h2>
              <p className="text-sm text-cream/60 mb-4">
                Try our ROI calculator to see how much time and money Clinty can save your team.
              </p>
              <Link
                to="/#roi"
                className="inline-flex items-center gap-2 text-sm font-medium text-teal-400 hover:text-teal-300 transition-colors"
              >
                Calculate your savings
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
            </div>
          </div>

          <form
            onSubmit={handleSubmit}
            className="lg:col-span-3 bg-white rounded-2xl border border-navy-900/5 p-8 shadow-sm space-y-5"
          >
            <h2 className="text-lg font-semibold text-navy-900">Send us a message</h2>

            <div className="grid sm:grid-cols-2 gap-5">
              <Field label="Name" id="name" required>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className={inputClass}
                  placeholder="Jane Smith"
                />
              </Field>
              <Field label="Email" id="email" required>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className={inputClass}
                  placeholder="you@yourbusiness.com"
                />
              </Field>
            </div>

            <Field label="Company" id="company">
              <input
                id="company"
                type="text"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className={inputClass}
                placeholder="Your business name"
              />
            </Field>

            <Field label="Inquiry type" id="inquiry-type" required>
              <select
                id="inquiry-type"
                value={inquiryType}
                onChange={(e) => setInquiryType(e.target.value)}
                required
                className={inputClass}
              >
                {inquiryTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Message" id="message" required>
              <textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
                rows={5}
                className={`${inputClass} resize-y min-h-[120px]`}
                placeholder="Tell us how we can help..."
              />
            </Field>

            <button
              type="submit"
              className="w-full sm:w-auto bg-navy-900 text-cream font-medium px-6 py-3.5 rounded-xl hover:bg-navy-800 transition-colors"
            >
              Send Message
            </button>

            <p className="text-xs text-navy-600">
              Submitting opens your email client so you can send your message.
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}

const inputClass =
  'w-full px-4 py-3 rounded-xl border border-navy-900/10 bg-cream text-navy-900 placeholder:text-navy-600/50 focus:outline-none focus:ring-2 focus:ring-teal-400/40 focus:border-teal-400/40 transition-shadow'

function Field({
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
