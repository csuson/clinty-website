import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import AuthLayout, { AuthConfigNotice, AuthError, AuthSuccess } from '../components/AuthLayout'
import FormField from '../components/FormField'
import { inputClass } from '../constants/forms'
import { useAuth } from '../context/AuthContext'

export default function SignUp() {
  const { signUp, configured } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const prefillEmail = (location.state as { email?: string } | null)?.email ?? ''

  const [fullName, setFullName] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [email, setEmail] = useState(prefillEmail)
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setSubmitting(true)

    const { error: signUpError } = await signUp({
      email,
      password,
      fullName,
      companyName,
    })
    setSubmitting(false)

    if (signUpError) {
      setError(signUpError)
      return
    }

    setSuccess('Account created! Check your email to confirm, then sign in.')
    setTimeout(() => navigate('/sign-in'), 2500)
  }

  return (
    <AuthLayout
      title="Start your free trial"
      subtitle="Create an account in under a minute"
      footer={
        <>
          Already have an account?{' '}
          <Link to="/sign-in" className="text-teal-500 font-medium hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      {!configured && (
        <div className="mb-5">
          <AuthConfigNotice />
        </div>
      )}

      {error && <AuthError message={error} />}
      {success && <AuthSuccess message={success} />}

      <form onSubmit={handleSubmit} className="space-y-5">
        <FormField label="Full name" id="full-name" required>
          <input
            id="full-name"
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            autoComplete="name"
            className={inputClass}
            placeholder="Jane Smith"
            disabled={submitting}
          />
        </FormField>

        <FormField label="Business name" id="company-name" required>
          <input
            id="company-name"
            type="text"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            required
            autoComplete="organization"
            className={inputClass}
            placeholder="Your business name"
            disabled={submitting}
          />
        </FormField>

        <FormField label="Work email" id="email" required>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className={inputClass}
            placeholder="you@yourbusiness.com"
            disabled={submitting}
          />
        </FormField>

        <FormField label="Password" id="password" required>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
            className={inputClass}
            placeholder="At least 8 characters"
            disabled={submitting}
          />
        </FormField>

        <p className="text-xs text-navy-600">
          By signing up, you agree to our{' '}
          <Link to="/terms" className="text-teal-500 hover:underline">
            Terms of Service
          </Link>{' '}
          and{' '}
          <Link to="/privacy" className="text-teal-500 hover:underline">
            Privacy Policy
          </Link>
          .
        </p>

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-navy-900 text-cream font-medium px-6 py-3.5 rounded-xl hover:bg-navy-800 transition-colors disabled:opacity-60"
        >
          {submitting ? 'Creating account...' : 'Create Account'}
        </button>
      </form>
    </AuthLayout>
  )
}
