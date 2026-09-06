import { useEffect, useState, type FormEvent } from 'react'
import FormField from '../../components/FormField'
import { inputClass, textareaClass } from '../../constants/forms'
import {
  DEFAULT_RESPONSE_TONE,
  RESPONSE_TONE_PRESETS,
  WHATSAPP_SAME_AS_EMAIL,
} from '../../constants/responseTones'
import { useAuth } from '../../context/AuthContext'
import {
  defaultPromptFields,
  fetchUserPrompts,
  generateBackgroundFromWebsite,
  responseToneCustomText,
  responseToneSelectValue,
  saveUserPrompts,
  serializeResponseToneForSave,
  serializeWhatsappResponseToneForSave,
  whatsappToneSelectValue,
  type PromptFields,
} from '../../lib/prompts'

export default function Prompts() {
  const { user } = useAuth()
  const [prompts, setPrompts] = useState<PromptFields>(defaultPromptFields())
  const [emailToneSelect, setEmailToneSelect] = useState(DEFAULT_RESPONSE_TONE)
  const [emailToneCustom, setEmailToneCustom] = useState('')
  const [whatsappToneSelect, setWhatsappToneSelect] = useState(WHATSAPP_SAME_AS_EMAIL)
  const [whatsappToneCustom, setWhatsappToneCustom] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  function applyToneFields(fields: PromptFields) {
    setPrompts(fields)
    setEmailToneSelect(responseToneSelectValue(fields.responseTone))
    setEmailToneCustom(responseToneCustomText(fields.responseTone))
    setWhatsappToneSelect(whatsappToneSelectValue(fields.whatsappResponseTone))
    setWhatsappToneCustom(responseToneCustomText(fields.whatsappResponseTone))
  }

  useEffect(() => {
    if (!user) {
      setLoading(false)
      return
    }

    fetchUserPrompts(user.id)
      .then(applyToneFields)
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to load prompts')
      })
      .finally(() => setLoading(false))
  }, [user])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!user) return

    setSaving(true)
    setMessage(null)
    setError(null)

    const payload: PromptFields = {
      ...prompts,
      responseTone: serializeResponseToneForSave(emailToneSelect, emailToneCustom),
      whatsappResponseTone:
        serializeWhatsappResponseToneForSave(whatsappToneSelect, whatsappToneCustom) ??
        WHATSAPP_SAME_AS_EMAIL,
    }

    try {
      await saveUserPrompts(user.id, payload)
      applyToneFields(payload)
      setMessage('Prompts saved successfully.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save prompts')
    } finally {
      setSaving(false)
    }
  }

  function handleReset() {
    applyToneFields(defaultPromptFields())
    setMessage(null)
    setError(null)
  }

  async function handleGenerateBackground() {
    const url = websiteUrl.trim()
    if (!url) {
      setError('Enter your website URL first.')
      return
    }

    setGenerating(true)
    setMessage(null)
    setError(null)

    try {
      const background = await generateBackgroundFromWebsite(url)
      setPrompts((current) => ({ ...current, background }))
      setMessage('Business Background generated from your website. Review and save when ready.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate background')
    } finally {
      setGenerating(false)
    }
  }

  if (loading) {
    return (
      <section className="bg-white rounded-2xl border border-navy-900/5 p-8 shadow-sm">
        <p className="text-sm text-navy-600">Loading prompts...</p>
      </section>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <section className="bg-white rounded-2xl border border-navy-900/5 p-8 shadow-sm">
        <h2 className="text-lg font-semibold text-navy-900 mb-1">Prompts</h2>
        <p className="text-sm text-navy-600 mb-6">
          Customize the context your AI agent uses when replying to customers — business background,
          response tone, scheduling preferences, and the footer appended to outbound messages.
        </p>

        {error && <Alert type="error" message={error} />}
        {message && <Alert type="success" message={message} />}

        <div className="space-y-8">
          <div className="rounded-xl border border-navy-900/10 bg-cream/60 p-5">
            <h3 className="text-base font-semibold text-navy-900 mb-1">Generate from website</h3>
            <p className="text-sm text-navy-600 mb-4">
              Enter your business website and Clinty will draft Business Background text from your
              public pages (home, about, pricing, location, etc.). Review and edit before saving.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
              <div className="flex-1">
                <FormField label="Website URL" id="prompt-website-url">
                  <input
                    id="prompt-website-url"
                    type="text"
                    inputMode="url"
                    placeholder="yourbusiness.com"
                    value={websiteUrl}
                    onChange={(e) => setWebsiteUrl(e.target.value)}
                    className={inputClass}
                    disabled={generating || saving}
                  />
                </FormField>
              </div>
              <button
                type="button"
                onClick={handleGenerateBackground}
                disabled={generating || saving || !websiteUrl.trim()}
                className="bg-teal-500 text-white font-medium px-6 py-3 rounded-xl hover:bg-teal-600 transition-colors disabled:opacity-60 whitespace-nowrap"
              >
                {generating ? 'Generating...' : 'Generate background'}
              </button>
            </div>
          </div>

          <PromptSection
            title="Business Background"
            description="Who you are, what you offer, pricing, locations, and reply templates for common inquiries."
            id="prompt-background"
            value={prompts.background}
            onChange={(background) => setPrompts((current) => ({ ...current, background }))}
            disabled={saving || generating}
          />

          <ToneSection
            title="Email response tone"
            description="How the assistant writes email replies — language and content rules still apply."
            idPrefix="email-tone"
            selectValue={emailToneSelect}
            customText={emailToneCustom}
            onSelectChange={setEmailToneSelect}
            onCustomChange={setEmailToneCustom}
            disabled={saving || generating}
          />

          <ToneSection
            title="WhatsApp response tone"
            description="Optional override for WhatsApp. Leave as “Same as email” to reuse the email tone above."
            idPrefix="whatsapp-tone"
            selectValue={whatsappToneSelect}
            customText={whatsappToneCustom}
            onSelectChange={setWhatsappToneSelect}
            onCustomChange={setWhatsappToneCustom}
            disabled={saving || generating}
            includeSameAsEmail
          />

          <PromptSection
            title="Calendar preference"
            description="Lesson length, availability windows, and rules for proposing appointment times."
            id="prompt-calendar-preference"
            value={prompts.calendarPreference}
            onChange={(calendarPreference) =>
              setPrompts((current) => ({ ...current, calendarPreference }))
            }
            disabled={saving || generating}
          />

          <PromptSection
            title="Default footer"
            description="Text appended to the end of outbound email and message replies."
            id="prompt-default-footer"
            value={prompts.defaultFooter}
            onChange={(defaultFooter) => setPrompts((current) => ({ ...current, defaultFooter }))}
            disabled={saving || generating}
            rows={4}
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mt-8">
          <button
            type="submit"
            disabled={saving || generating}
            className="bg-navy-900 text-cream font-medium px-6 py-3 rounded-xl hover:bg-navy-800 transition-colors disabled:opacity-60"
          >
            {saving ? 'Saving...' : 'Save Prompts'}
          </button>
          <button
            type="button"
            onClick={handleReset}
            disabled={saving || generating}
            className="border border-navy-900/15 text-navy-900 font-medium px-6 py-3 rounded-xl hover:bg-navy-900/5 transition-colors disabled:opacity-60"
          >
            Reset to defaults
          </button>
        </div>
      </section>
    </form>
  )
}

function ToneSection({
  title,
  description,
  idPrefix,
  selectValue,
  customText,
  onSelectChange,
  onCustomChange,
  disabled,
  includeSameAsEmail = false,
}: {
  title: string
  description: string
  idPrefix: string
  selectValue: string
  customText: string
  onSelectChange: (value: string) => void
  onCustomChange: (value: string) => void
  disabled: boolean
  includeSameAsEmail?: boolean
}) {
  const previewPreset =
    selectValue === 'custom' || selectValue === WHATSAPP_SAME_AS_EMAIL
      ? null
      : RESPONSE_TONE_PRESETS.find((preset) => preset.id === selectValue)

  return (
    <div className="border-t border-navy-900/5 pt-8 first:border-t-0 first:pt-0">
      <h3 className="text-base font-semibold text-navy-900 mb-1">{title}</h3>
      <p className="text-sm text-navy-600 mb-4">{description}</p>

      <FormField label={title} id={`${idPrefix}-select`}>
        <select
          id={`${idPrefix}-select`}
          value={selectValue}
          onChange={(e) => onSelectChange(e.target.value)}
          className={inputClass}
          disabled={disabled}
        >
          {includeSameAsEmail && (
            <option value={WHATSAPP_SAME_AS_EMAIL}>Same as email</option>
          )}
          {RESPONSE_TONE_PRESETS.map((preset) => (
            <option key={preset.id} value={preset.id}>
              {preset.label}
            </option>
          ))}
          <option value="custom">Custom instructions…</option>
        </select>
      </FormField>

      {previewPreset && (
        <p className="text-sm text-navy-600 mt-3">{previewPreset.description}</p>
      )}

      {selectValue === 'custom' && (
        <div className="mt-4">
          <FormField label="Custom tone instructions" id={`${idPrefix}-custom`}>
            <textarea
              id={`${idPrefix}-custom`}
              value={customText}
              onChange={(e) => onCustomChange(e.target.value)}
              rows={3}
              placeholder="e.g. Warm but brief, like a helpful surf instructor"
              className={textareaClass}
              disabled={disabled}
            />
          </FormField>
        </div>
      )}

    </div>
  )
}

function PromptSection({
  title,
  description,
  id,
  value,
  onChange,
  disabled,
  rows = 12,
}: {
  title: string
  description: string
  id: string
  value: string
  onChange: (value: string) => void
  disabled: boolean
  rows?: number
}) {
  return (
    <div className="border-t border-navy-900/5 pt-8 first:border-t-0 first:pt-0">
      <h3 className="text-base font-semibold text-navy-900 mb-1">{title}</h3>
      <p className="text-sm text-navy-600 mb-4">{description}</p>
      <FormField label={title} id={id}>
        <textarea
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={rows}
          className={textareaClass}
          disabled={disabled}
        />
      </FormField>
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
