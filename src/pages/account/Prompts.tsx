import { useEffect, useMemo, useState, type FormEvent } from 'react'
import FormField from '../../components/FormField'
import AiUsageMeter from '../../components/AiUsageMeter'
import { inputClass, textareaClass } from '../../constants/forms'
import {
  DEFAULT_RESPONSE_TONE,
  RESPONSE_TONE_PRESETS,
  WHATSAPP_SAME_AS_EMAIL,
} from '../../constants/responseTones'
import { useAuth } from '../../context/AuthContext'
import { useAiUsage } from '../../hooks/useAiUsage'
import { GENERAL_SMALL_BUSINESS_RESPONSE_PREFERENCES_EXAMPLE } from '../../constants/customResponsePreferencesExample'
import {
  BUSINESS_BACKGROUND_TYPE_OPTIONS,
  type BusinessBackgroundType,
} from '../../constants/businessBackgroundTypes'
import {
  EXAMPLE_PROMPT_BACKGROUND,
  EXAMPLE_PROMPT_CALENDAR_PREFERENCE,
  EXAMPLE_PROMPT_FOOTER,
} from '../../constants/promptExamples'
import { isLocalOrPrivateWebsiteUrl, normalizeWebsiteUrl } from '../../lib/websiteTextExtract'
import {
  defaultPromptFields,
  describeGeneratedBusinessType,
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
  const [websiteHtmlFile, setWebsiteHtmlFile] = useState<File | null>(null)
  const [businessType, setBusinessType] = useState<BusinessBackgroundType>('auto')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [lastUsage, setLastUsage] = useState<number | null>(null)
  const { usage: aiUsage, loading: aiUsageLoading, refresh: refreshAiUsage, limitReached } = useAiUsage(user?.id)

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

    const whatsappTone = serializeWhatsappResponseToneForSave(whatsappToneSelect, whatsappToneCustom)
    const payload: PromptFields = {
      ...prompts,
      responseTone: serializeResponseToneForSave(emailToneSelect, emailToneCustom),
      // Empty / same-as-email → null in DB via promptTextToDb in saveUserPrompts.
      whatsappResponseTone: whatsappTone ?? WHATSAPP_SAME_AS_EMAIL,
    }

    try {
      const saved = await saveUserPrompts(user.id, payload)
      applyToneFields(payload)
      setMessage(
        saved.assistantReloaded
          ? 'Prompts saved. The assistant reloaded the new values.'
          : saved.assistantReloadError
            ? `Prompts saved. The assistant did not reload: ${saved.assistantReloadError}`
            : 'Prompts saved successfully.',
      )
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

  const isLocalWebsiteUrl = useMemo(() => {
    const siteUrl = normalizeWebsiteUrl(websiteUrl.trim())
    return siteUrl ? isLocalOrPrivateWebsiteUrl(siteUrl) : false
  }, [websiteUrl])

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
      const { background, usage, businessType: detectedType } = await generateBackgroundFromWebsite(url, {
        userId: user?.id,
        htmlFile: websiteHtmlFile,
        businessType,
      })
      setPrompts((current) => ({ ...current, background }))
      setLastUsage(usage?.total_tokens ?? null)
      void refreshAiUsage()
      setMessage(
        `Business Background generated (${describeGeneratedBusinessType(detectedType)}). Review and save when ready.`,
      )
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
          promotions, payment links, response tone, scheduling preferences, and the footer appended
          to outbound messages.
        </p>

        {error && <Alert type="error" message={error} />}
        {message && <Alert type="success" message={message} />}

        <div className="space-y-8">
          <div className="rounded-xl border border-navy-900/10 bg-cream/60 p-5 space-y-4">
            <div>
              <h3 className="text-base font-semibold text-navy-900 mb-1">Generate from website</h3>
              <p className="text-sm text-navy-600">
                Enter your business website and Clinty will draft Business Background text from your
                public pages. Auto-detect chooses lessons/appointments vs fixed camp weeks (or
                general). Override below if needed, then review and save.
              </p>
            </div>

            <AiUsageMeter
              usage={aiUsage}
              loading={aiUsageLoading}
              lastCallTokens={lastUsage}
            />

            {isLocalWebsiteUrl && (
              <p className="text-sm text-navy-700 mb-4 rounded-lg border border-navy-900/10 bg-white/80 px-4 py-3">
                Local dev URLs cannot be read directly from clinty.net because of browser security.
                Upload a saved HTML page from your site, or let your Clinty assistant fetch the
                site if it runs on the same machine.
              </p>
            )}
            <div className="flex flex-col gap-3">
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
                <div className="sm:w-56">
                  <FormField label="Business type" id="prompt-business-type">
                    <select
                      id="prompt-business-type"
                      value={businessType}
                      onChange={(e) => setBusinessType(e.target.value as BusinessBackgroundType)}
                      className={inputClass}
                      disabled={generating || saving}
                    >
                      {BUSINESS_BACKGROUND_TYPE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </FormField>
                </div>
                <button
                  type="button"
                  onClick={handleGenerateBackground}
                  disabled={generating || saving || !websiteUrl.trim() || limitReached}
                  className="bg-teal-500 text-white font-medium px-6 py-3 rounded-xl hover:bg-teal-600 transition-colors disabled:opacity-60 whitespace-nowrap"
                >
                  {generating ? 'Generating...' : 'Generate background'}
                </button>
              </div>
              <p className="text-xs text-navy-600">
                {BUSINESS_BACKGROUND_TYPE_OPTIONS.find((option) => option.value === businessType)?.description}
              </p>
            </div>
            {limitReached && (
              <p className="text-sm text-red-700">
                Monthly AI token limit reached. You can still edit prompts manually or ask an admin to increase your limit.
              </p>
            )}
            {isLocalWebsiteUrl && (
              <div className="mt-4">
                <FormField
                  label="Saved HTML page (optional)"
                  id="prompt-website-html-file"
                  hint="Open your local site, choose File → Save As → Webpage, HTML only, then upload it here."
                >
                  <input
                    id="prompt-website-html-file"
                    type="file"
                    accept=".html,.htm,text/html"
                    onChange={(e) => setWebsiteHtmlFile(e.target.files?.[0] ?? null)}
                    className={inputClass}
                    disabled={generating || saving}
                  />
                </FormField>
              </div>
            )}
          </div>

          <PromptSection
            title="Business Background"
            description="Who you are, booking model, offerings, constraints, agent rules, and a short reply template."
            id="prompt-background"
            value={prompts.background}
            onChange={(background) => setPrompts((current) => ({ ...current, background }))}
            disabled={saving || generating}
            example={{
              summary: 'Example for a kite school (The Kite School)',
              text: EXAMPLE_PROMPT_BACKGROUND,
            }}
          />

          <PromptSection
            title="Promotions"
            description="Current specials, discounts, and time-limited offers the agent should mention when relevant."
            id="prompt-promotions"
            value={prompts.promotions}
            onChange={(promotions) => setPrompts((current) => ({ ...current, promotions }))}
            disabled={saving || generating}
            rows={5}
          />

          <PromptSection
            title="Payment links"
            description="Fixed checkout URLs (Square Payment Links, Wix pay links, etc.) the agent may send when someone asks how to pay. One line per link: short label, then the full URL."
            id="prompt-payment-links"
            value={prompts.paymentLinks}
            onChange={(paymentLinks) => setPrompts((current) => ({ ...current, paymentLinks }))}
            disabled={saving || generating}
            rows={5}
          />

          <PromptSection
            title="Custom response preferences"
            description="Optional extra rules for the response agent. These are appended to Clinty’s built-in response preferences (scheduling, catalog, language, and branding rules). Use bullet lines for clarity."
            id="prompt-response-preferences"
            value={prompts.responsePreferences}
            onChange={(responsePreferences) =>
              setPrompts((current) => ({ ...current, responsePreferences }))
            }
            disabled={saving || generating}
            rows={6}
            example={{
              summary: 'Example for a general small business',
              text: GENERAL_SMALL_BUSINESS_RESPONSE_PREFERENCES_EXAMPLE,
            }}
          />

          <PromptSection
            title="WhatsApp custom response preferences"
            description="Optional override for WhatsApp only. Leave blank to reuse the custom response preferences above for WhatsApp as well."
            id="prompt-whatsapp-response-preferences"
            value={prompts.whatsappResponsePreferences}
            onChange={(whatsappResponsePreferences) =>
              setPrompts((current) => ({ ...current, whatsappResponsePreferences }))
            }
            disabled={saving || generating}
            rows={5}
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
            description="Booking duration, availability windows, and rules for proposing appointment times."
            id="prompt-calendar-preference"
            value={prompts.calendarPreference}
            onChange={(calendarPreference) =>
              setPrompts((current) => ({ ...current, calendarPreference }))
            }
            disabled={saving || generating}
            rows={5}
            example={{
              summary: 'Example availability rules',
              text: EXAMPLE_PROMPT_CALENDAR_PREFERENCE,
            }}
          />

          <PromptSection
            title="Default footer"
            description="Text appended to the end of outbound email and message replies."
            id="prompt-default-footer"
            value={prompts.defaultFooter}
            onChange={(defaultFooter) => setPrompts((current) => ({ ...current, defaultFooter }))}
            disabled={saving || generating}
            rows={5}
            example={{
              summary: 'Example booking footer',
              text: EXAMPLE_PROMPT_FOOTER,
            }}
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
            Clear fields
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
  example,
}: {
  title: string
  description: string
  id: string
  value: string
  onChange: (value: string) => void
  disabled: boolean
  rows?: number
  example?: { summary: string; text: string }
}) {
  return (
    <div className="border-t border-navy-900/5 pt-8 first:border-t-0 first:pt-0">
      <h3 className="text-base font-semibold text-navy-900 mb-1">{title}</h3>
      <p className="text-sm text-navy-600 mb-4">{description}</p>
      {example && (
        <details className="mb-4 rounded-xl border border-navy-900/10 bg-navy-900/[0.02] text-sm text-navy-700">
          <summary className="cursor-pointer select-none px-4 py-3 font-medium text-navy-900">
            {example.summary}
          </summary>
          <div className="border-t border-navy-900/10 px-4 py-3 space-y-3">
            <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-navy-800">
              {example.text}
            </pre>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onChange(example.text)}
              className="text-sm font-medium text-teal-700 hover:text-teal-800 disabled:opacity-50"
            >
              Use this example
            </button>
          </div>
        </details>
      )}
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
