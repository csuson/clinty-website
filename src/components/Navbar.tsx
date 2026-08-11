import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

interface NavLink {
  label: string
  to: string
}

const links: NavLink[] = [
  { label: 'Features', to: '/#features' },
  { label: 'ROI Calculator', to: '/#roi' },
  { label: 'How It Works', to: '/#how-it-works' },
  { label: 'Pricing', to: '/#pricing' },
  { label: 'Contact', to: '/contact' },
]

export default function Navbar() {
  const [open, setOpen] = useState(false)
  const { user, profile, signOut, loading } = useAuth()

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-cream/80 backdrop-blur-lg border-b border-navy-900/5">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-lg bg-navy-900 flex items-center justify-center">
            <span className="text-teal-400 font-bold text-sm">C</span>
          </div>
          <span className="font-semibold text-lg text-navy-900">Clinty</span>
        </Link>

        <div className="hidden md:flex items-center gap-8">
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="text-sm text-navy-600 hover:text-navy-900 transition-colors"
            >
              {link.label}
            </Link>
          ))}

          {!loading && user ? (
            <div className="flex items-center gap-3">
              <Link
                to="/account"
                className="text-sm text-navy-600 hover:text-navy-900 transition-colors"
              >
                {profile?.full_name?.split(' ')[0] ?? 'Account'}
              </Link>
              <button
                onClick={() => signOut()}
                className="text-sm font-medium border border-navy-900/15 text-navy-900 px-4 py-2 rounded-lg hover:bg-navy-900/5 transition-colors"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link
                to="/sign-in"
                className="text-sm text-navy-600 hover:text-navy-900 transition-colors"
              >
                Sign In
              </Link>
              <Link
                to="/sign-up"
                className="text-sm font-medium bg-navy-900 text-cream px-4 py-2 rounded-lg hover:bg-navy-800 transition-colors"
              >
                Sign Up
              </Link>
            </div>
          )}
        </div>

        <button
          className="md:hidden p-2"
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            {open ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {open && (
        <div className="md:hidden bg-cream border-b border-navy-900/5 px-6 py-4 space-y-3">
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="block text-sm text-navy-600"
              onClick={() => setOpen(false)}
            >
              {link.label}
            </Link>
          ))}

          {!loading && user ? (
            <>
              <Link
                to="/account"
                className="block text-sm text-navy-600"
                onClick={() => setOpen(false)}
              >
                Account
              </Link>
              <button
                onClick={() => {
                  signOut()
                  setOpen(false)
                }}
                className="block w-full text-sm font-medium border border-navy-900/15 text-navy-900 px-4 py-2 rounded-lg text-center"
              >
                Sign Out
              </button>
            </>
          ) : (
            <>
              <Link
                to="/sign-in"
                className="block text-sm text-navy-600"
                onClick={() => setOpen(false)}
              >
                Sign In
              </Link>
              <Link
                to="/sign-up"
                className="block text-sm font-medium bg-navy-900 text-cream px-4 py-2 rounded-lg text-center"
                onClick={() => setOpen(false)}
              >
                Sign Up
              </Link>
            </>
          )}
        </div>
      )}
    </nav>
  )
}
