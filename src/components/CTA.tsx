import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'

export default function CTA() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    navigate('/sign-up', { state: { email } })
  }

  return (
    <section id="cta" className="py-24 px-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-navy-900 rounded-3xl p-10 md:p-16 text-center text-cream relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-teal-400/10 via-transparent to-amber-400/10" />
          <div className="relative">
            <h2 className="font-serif text-4xl md:text-5xl mb-4">
              Ready to reclaim your time?
            </h2>
            <p className="text-cream/60 text-lg mb-8 max-w-xl mx-auto">
              Join 500+ small businesses saving 15+ hours a week. Start your free
              14-day trial — no credit card required.
            </p>
            <form
              className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto"
              onSubmit={handleSubmit}
            >
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@yourbusiness.com"
                className="flex-1 px-4 py-3.5 rounded-xl bg-navy-800 border border-cream/10 text-cream placeholder:text-cream/30 focus:outline-none focus:ring-2 focus:ring-teal-400/50"
                required
              />
              <button
                type="submit"
                className="bg-teal-400 text-navy-900 font-semibold px-6 py-3.5 rounded-xl hover:bg-teal-300 transition-colors whitespace-nowrap"
              >
                Start Free Trial
              </button>
            </form>
            <p className="text-xs text-cream/40 mt-4">
              Or{' '}
              <Link to="/contact" className="text-teal-400 hover:underline">
                book a 15-min demo
              </Link>{' '}
              with our team
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
