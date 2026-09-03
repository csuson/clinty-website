import { useState, type FormEvent, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import PageMeta from '../components/PageMeta'
import { SUPPORT_EMAIL, WHATSAPP_PHONE_DISPLAY, WHATSAPP_URL } from '../constants/contact'

const whatsappContactUrl = `${WHATSAPP_URL}?text=${encodeURIComponent('Hi Clinty — I have a question about your AI agents.')}`

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
      <PageMeta
        title="Contact"
        description="Contact Clinty for demos, support, billing questions, and partnership inquiries about AI agents for small business."
        path="/contact"
      />
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
              <div className="text-teal-500 mb-3">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
              </div>
              <h2 className="font-semibold text-navy-900 mb-1">Contact via WhatsApp</h2>
              <p className="text-sm text-navy-600 mb-4">
                Message us on WhatsApp for a quick reply — demos, support, or general questions.
              </p>
              <a
                href={whatsappContactUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm font-medium bg-teal-500 text-white px-4 py-2.5 rounded-xl hover:bg-teal-600 transition-colors"
              >
                Chat on WhatsApp
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </a>
              <p className="text-xs text-navy-600 mt-3">{WHATSAPP_PHONE_DISPLAY}</p>
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
