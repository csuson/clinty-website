import { useEffect, useState, type FormEvent } from 'react'
import FormField from '../../components/FormField'
import { inputClass } from '../../constants/forms'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'

export default function AccountSettings() {
  const { user, profile, refreshProfile } = useAuth()

  const [fullName, setFullName] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [profileMessage, setProfileMessage] = useState<string | null>(null)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)

  useEffect(() => {
    setFullName(profile?.full_name ?? '')
    setCompanyName(profile?.company_name ?? '')
  }, [profile])

  async function handleProfileSubmit(e: FormEvent) {
    e.preventDefault()
    if (!supabase || !user) return

    setSavingProfile(true)
    setProfileMessage(null)
    setProfileError(null)

    const { error } = await supabase
      .from('profiles')
      .update({ full_name: fullName, company_name: companyName })
      .eq('id', user.id)

    setSavingProfile(false)

    if (error) {
      setProfileError(error.message)
      return
    }

    await refreshProfile()
    setProfileMessage('Profile updated successfully.')
  }

  async function handlePasswordSubmit(e: FormEvent) {
    e.preventDefault()
    if (!supabase) return

    if (newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters.')
      return
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match.')
      return
    }

    setSavingPassword(true)
    setPasswordMessage(null)
    setPasswordError(null)

    const { error } = await supabase.auth.updateUser({ password: newPassword })

    setSavingPassword(false)

    if (error) {
      setPasswordError(error.message)
      return
    }

    setNewPassword('')
    setConfirmPassword('')
    setPasswordMessage('Password updated successfully.')
  }

  return (
    <div className="space-y-6">
      <section className="bg-white rounded-2xl border border-navy-900/5 p-8 shadow-sm">
        <h2 className="text-lg font-semibold text-navy-900 mb-1">Profile</h2>
        <p className="text-sm text-navy-600 mb-6">Update your personal and business information.</p>

        {profileError && <Alert type="error" message={profileError} />}
        {profileMessage && <Alert type="success" message={profileMessage} />}

        <form onSubmit={handleProfileSubmit} className="space-y-5">
          <FormField label="Email" id="email">
            <input
              id="email"
              type="email"
              value={profile?.email ?? user?.email ?? ''}
              disabled
              className={`${inputClass} opacity-70 cursor-not-allowed`}
            />
          </FormField>

          <FormField label="Full name" id="full-name" required>
            <input
              id="full-name"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              className={inputClass}
              disabled={savingProfile}
            />
          </FormField>

          <FormField label="Business name" id="company-name" required>
            <input
              id="company-name"
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              required
              className={inputClass}
              disabled={savingProfile}
            />
          </FormField>

          <button
            type="submit"
            disabled={savingProfile}
            className="bg-navy-900 text-cream font-medium px-6 py-3 rounded-xl hover:bg-navy-800 transition-colors disabled:opacity-60"
          >
            {savingProfile ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </section>

      <section className="bg-white rounded-2xl border border-navy-900/5 p-8 shadow-sm">
        <h2 className="text-lg font-semibold text-navy-900 mb-1">Password</h2>
        <p className="text-sm text-navy-600 mb-6">Choose a strong password with at least 8 characters.</p>

        {passwordError && <Alert type="error" message={passwordError} />}
        {passwordMessage && <Alert type="success" message={passwordMessage} />}

        <form onSubmit={handlePasswordSubmit} className="space-y-5">
          <FormField label="New password" id="new-password" required>
            <input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={8}
              className={inputClass}
              disabled={savingPassword}
            />
          </FormField>

          <FormField label="Confirm new password" id="confirm-password" required>
            <input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
              className={inputClass}
              disabled={savingPassword}
            />
          </FormField>

          <button
            type="submit"
            disabled={savingPassword}
            className="border border-navy-900/15 text-navy-900 font-medium px-6 py-3 rounded-xl hover:bg-navy-900/5 transition-colors disabled:opacity-60"
          >
            {savingPassword ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </section>
    </div>
  )
}

function Alert({ type, message }: { type: 'error' | 'success'; message: string }) {
  const styles =
    type === 'error'
      ? 'bg-red-50 border-red-200 text-red-700'
      : 'bg-teal-400/10 border-teal-400/20 text-teal-600'

  return <div className={`rounded-xl border text-sm px-4 py-3 mb-5 ${styles}`}>{message}</div>
}
