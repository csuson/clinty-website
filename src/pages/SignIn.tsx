import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import AuthLayout, { AuthConfigNotice, AuthError, AuthSuccess } from '../components/AuthLayout'
import FormField from '../components/FormField'
import { inputClass } from '../constants/forms'
import { useAuth } from '../context/AuthContext'

export default function SignIn() {
  const { signIn, configured } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const from = (location.state as { from?: string } | null)?.from ?? '/account'
  const emailConfirmed = searchParams.get('email_confirmed') === '1'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    const { error: signInError } = await signIn({ email, password })
    setSubmitting(false)

    if (signInError) {
      setError(signInError)
      return
    }

    navigate(from, { replace: true })
  }

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to manage your AI agents"
      footer={
        <>
          Don&apos;t have an account?{' '}
          <Link to="/sign-up" className="text-teal-500 font-medium hover:underline">
            Sign up free
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
      {emailConfirmed && (
        <AuthSuccess message="Email confirmed. Sign in to continue." />
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <FormField label="Email" id="email" required>
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
            autoComplete="current-password"
            className={inputClass}
            placeholder="Your password"
            disabled={submitting}
          />
        </FormField>

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-navy-900 text-cream font-medium px-6 py-3.5 rounded-xl hover:bg-navy-800 transition-colors disabled:opacity-60"
        >
          {submitting ? 'Signing in...' : 'Sign In'}
        </button>
      </form>
    </AuthLayout>
  )
}
