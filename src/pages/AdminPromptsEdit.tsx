import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import AdminPromptsForm, { emptyAdminPromptsForm } from '../components/AdminPromptsForm'
import { DEFAULT_RESPONSE_TONE } from '../constants/responseTones'
import {
  fetchAdminData,
  saveAdminUserPrompts,
  type AdminPromptsInput,
  type AdminUserPrompts,
} from '../lib/admin'
import {
  responseToneCustomText,
  responseToneSelectValue,
  serializeResponseToneForSave,
  serializeWhatsappResponseToneForSave,
  whatsappToneSelectValue,
} from '../lib/prompts'

function promptsToForm(row: AdminUserPrompts | null, userId: string): AdminPromptsInput {
  if (!row) return emptyAdminPromptsForm(userId)

  return {
    user_id: row.user_id,
    background: row.background ?? '',
    calendar_preference: row.calendar_preference ?? '',
    default_footer: row.default_footer ?? '',
    promotions: row.promotions ?? '',
    response_tone: row.response_tone ?? '',
    whatsapp_response_tone: row.whatsapp_response_tone,
  }
}

function applyToneState(row: AdminUserPrompts | null) {
  const responseTone = row?.response_tone ?? ''
  const whatsappTone = row?.whatsapp_response_tone ?? ''

  return {
    emailToneSelect: responseToneSelectValue(responseTone),
    emailToneCustom: responseToneCustomText(responseTone),
    whatsappToneSelect: whatsappToneSelectValue(whatsappTone),
    whatsappToneCustom: responseToneCustomText(whatsappTone),
  }
}

export default function AdminPromptsEdit() {
  const { userId } = useParams<{ userId: string }>()
  const navigate = useNavigate()
  const [form, setForm] = useState<AdminPromptsInput>(emptyAdminPromptsForm())
  const [users, setUsers] = useState<{ id: string; email: string }[]>([])
  const [emailToneSelect, setEmailToneSelect] = useState(DEFAULT_RESPONSE_TONE)
  const [emailToneCustom, setEmailToneCustom] = useState('')
  const [whatsappToneSelect, setWhatsappToneSelect] = useState('')
  const [whatsappToneCustom, setWhatsappToneCustom] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)

  const loadData = useCallback(async () => {
    if (!userId) {
      setNotFound(true)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    setNotFound(false)

    try {
      const data = await fetchAdminData()
      setUsers(data.users.map((user) => ({ id: user.id, email: user.email })))

      const prompts = data.userPrompts.find((entry) => entry.user_id === userId) ?? null
      if (!prompts && !data.users.some((user) => user.id === userId)) {
        setNotFound(true)
        return
      }

      setForm(promptsToForm(prompts, userId))
      const toneState = applyToneState(prompts)
      setEmailToneSelect(toneState.emailToneSelect)
      setEmailToneCustom(toneState.emailToneCustom)
      setWhatsappToneSelect(toneState.whatsappToneSelect)
      setWhatsappToneCustom(toneState.whatsappToneCustom)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load prompts')
    } finally {
      setLoading(false)
    }
  }, [userId])

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
            <h1 className="font-serif text-3xl md:text-4xl text-navy-900 mb-1">Edit Prompts</h1>
            <p className="text-navy-600 text-sm">Update AI prompt text for a customer account.</p>
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
          <div className="text-navy-600 text-sm">Loading prompts…</div>
        ) : notFound ? (
          <div className="rounded-xl border border-navy-900/10 bg-cream px-4 py-3 text-sm text-navy-700">
            User prompts not found.{' '}
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
            submitLabel="Save Prompts"
            savingLabel="Saving…"
            userLocked
            onSubmit={handleSubmit}
          />
        )}
      </div>
    </div>
  )
}
