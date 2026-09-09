import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AdminPromptsForm, { emptyAdminPromptsForm } from '../components/AdminPromptsForm'
import {
  DEFAULT_RESPONSE_TONE,
  WHATSAPP_SAME_AS_EMAIL,
} from '../constants/responseTones'
import {
  fetchAdminData,
  saveAdminUserPrompts,
  type AdminPromptsInput,
} from '../lib/admin'
import {
  serializeResponseToneForSave,
  serializeWhatsappResponseToneForSave,
} from '../lib/prompts'

export default function AdminPromptsNew() {
  const navigate = useNavigate()
  const [form, setForm] = useState<AdminPromptsInput>(emptyAdminPromptsForm())
  const [users, setUsers] = useState<{ id: string; email: string }[]>([])
  const [emailToneSelect, setEmailToneSelect] = useState(DEFAULT_RESPONSE_TONE)
  const [emailToneCustom, setEmailToneCustom] = useState('')
  const [whatsappToneSelect, setWhatsappToneSelect] = useState(WHATSAPP_SAME_AS_EMAIL)
  const [whatsappToneCustom, setWhatsappToneCustom] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const data = await fetchAdminData()
      const existingUserIds = new Set(data.userPrompts.map((prompts) => prompts.user_id))
      setUsers(
        data.users
          .filter((user) => !existingUserIds.has(user.id))
          .map((user) => ({ id: user.id, email: user.email })),
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  async function handleSubmit(payload: AdminPromptsInput) {
    setSaving(true)
    setError(null)

    try {
      await saveAdminUserPrompts({
        ...payload,
        response_tone: serializeResponseToneForSave(emailToneSelect, emailToneCustom),
        whatsapp_response_tone: serializeWhatsappResponseToneForSave(
          whatsappToneSelect,
          whatsappToneCustom,
        ),
      })
      navigate('/admin')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save prompts')
      throw err
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="pt-28 pb-24 px-6">
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-teal-600 mb-1">Admin</p>
            <h1 className="font-serif text-3xl md:text-4xl text-navy-900 mb-1">Add Prompts</h1>
            <p className="text-navy-600 text-sm">Create prompt text for a customer who has not saved prompts yet.</p>
          </div>
          <Link
            to="/admin"
            className="text-sm font-medium border border-navy-900/15 text-navy-900 px-4 py-2 rounded-lg hover:bg-navy-900/5 transition-colors self-start"
          >
            Back to Dashboard
          </Link>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-navy-600 text-sm">Loading users…</div>
        ) : users.length === 0 ? (
          <div className="rounded-xl border border-navy-900/10 bg-cream px-4 py-3 text-sm text-navy-700">
            Every user already has saved prompts.{' '}
            <Link to="/admin" className="text-teal-600 hover:underline">
              Return to dashboard
            </Link>
          </div>
        ) : (
          <AdminPromptsForm
            form={form}
            setForm={setForm}
            users={users}
            emailToneSelect={emailToneSelect}
            emailToneCustom={emailToneCustom}
            whatsappToneSelect={whatsappToneSelect}
            whatsappToneCustom={whatsappToneCustom}
            onEmailToneSelectChange={setEmailToneSelect}
            onEmailToneCustomChange={setEmailToneCustom}
            onWhatsappToneSelectChange={setWhatsappToneSelect}
            onWhatsappToneCustomChange={setWhatsappToneCustom}
            saving={saving}
            submitLabel="Create Prompts"
            savingLabel="Saving…"
            onSubmit={handleSubmit}
          />
        )}
      </div>
    </div>
  )
}
