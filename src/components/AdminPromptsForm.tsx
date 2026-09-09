import type { FormEvent } from 'react'
import FormField from './FormField'
import { inputClass, textareaClass } from '../constants/forms'
import {
  DEFAULT_RESPONSE_TONE,
  RESPONSE_TONE_PRESETS,
  WHATSAPP_SAME_AS_EMAIL,
} from '../constants/responseTones'
import type { AdminPromptsInput } from '../lib/admin'

export function emptyAdminPromptsForm(userId = ''): AdminPromptsInput {
  return {
    user_id: userId,
    background: '',
    calendar_preference: '',
    default_footer: '',
    promotions: '',
    response_tone: DEFAULT_RESPONSE_TONE,
    whatsapp_response_tone: null,
  }
}

type AdminPromptsFormProps = {
  form: AdminPromptsInput
  setForm: (next: AdminPromptsInput | ((current: AdminPromptsInput) => AdminPromptsInput)) => void
  users: { id: string; email: string }[]
  emailToneSelect: string
  emailToneCustom: string
  whatsappToneSelect: string
  whatsappToneCustom: string
  onEmailToneSelectChange: (value: string) => void
  onEmailToneCustomChange: (value: string) => void
  onWhatsappToneSelectChange: (value: string) => void
  onWhatsappToneCustomChange: (value: string) => void
  saving: boolean
  submitLabel: string
  savingLabel: string
  userLocked?: boolean
  onSubmit: (payload: AdminPromptsInput) => Promise<void>
}

export default function AdminPromptsForm({
  form,
  setForm,
  users,
  emailToneSelect,
  emailToneCustom,
  whatsappToneSelect,
  whatsappToneCustom,
  onEmailToneSelectChange,
  onEmailToneCustomChange,
  onWhatsappToneSelectChange,
  onWhatsappToneCustomChange,
  saving,
  submitLabel,
  savingLabel,
  userLocked = false,
  onSubmit,
}: AdminPromptsFormProps) {
  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    await onSubmit(form)
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-navy-900/5 p-8 shadow-sm space-y-8">
      <FormField label="User" id="admin-prompts-user" required>
        <select
          id="admin-prompts-user"
          value={form.user_id}
          onChange={(e) => setForm((current) => ({ ...current, user_id: e.target.value }))}
          className={inputClass}
          disabled={saving || userLocked}
          required
        >
          <option value="">Select a user…</option>
          {users.map((user) => (
            <option key={user.id} value={user.id}>
              {user.email}
            </option>
          ))}
        </select>
      </FormField>

      <PromptField
        label="Business Background"
        id="admin-prompt-background"
        value={form.background}
        onChange={(background) => setForm((current) => ({ ...current, background }))}
        disabled={saving}
      />

      <PromptField
        label="Promotions"
        id="admin-prompt-promotions"
        value={form.promotions}
        onChange={(promotions) => setForm((current) => ({ ...current, promotions }))}
        disabled={saving}
        rows={5}
      />

      <ToneField
        title="Email response tone"
        idPrefix="admin-email-tone"
        selectValue={emailToneSelect}
        customText={emailToneCustom}
        onSelectChange={onEmailToneSelectChange}
        onCustomChange={onEmailToneCustomChange}
        disabled={saving}
      />

      <ToneField
        title="WhatsApp response tone"
        idPrefix="admin-whatsapp-tone"
        selectValue={whatsappToneSelect}
        customText={whatsappToneCustom}
        onSelectChange={onWhatsappToneSelectChange}
        onCustomChange={onWhatsappToneCustomChange}
        disabled={saving}
        includeSameAsEmail
      />

      <PromptField
        label="Calendar preference"
        id="admin-prompt-calendar"
        value={form.calendar_preference}
        onChange={(calendar_preference) => setForm((current) => ({ ...current, calendar_preference }))}
        disabled={saving}
        rows={5}
      />

      <PromptField
        label="Default footer"
        id="admin-prompt-footer"
        value={form.default_footer}
        onChange={(default_footer) => setForm((current) => ({ ...current, default_footer }))}
        disabled={saving}
        rows={5}
      />

      <button
        type="submit"
        disabled={saving || !form.user_id}
        className="bg-navy-900 text-cream font-medium px-6 py-3 rounded-xl hover:bg-navy-800 transition-colors disabled:opacity-60"
      >
        {saving ? savingLabel : submitLabel}
      </button>
    </form>
  )
}

function PromptField({
  label,
  id,
  value,
  onChange,
  disabled,
  rows = 12,
}: {
  label: string
  id: string
  value: string
  onChange: (value: string) => void
  disabled: boolean
  rows?: number
}) {
  return (
    <FormField label={label} id={id}>
      <textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        className={textareaClass}
        disabled={disabled}
      />
    </FormField>
  )
}

function ToneField({
  title,
  idPrefix,
  selectValue,
  customText,
  onSelectChange,
  onCustomChange,
  disabled,
  includeSameAsEmail = false,
}: {
  title: string
  idPrefix: string
  selectValue: string
  customText: string
  onSelectChange: (value: string) => void
  onCustomChange: (value: string) => void
  disabled: boolean
  includeSameAsEmail?: boolean
}) {
  return (
    <div className="border-t border-navy-900/5 pt-8">
      <h3 className="text-base font-semibold text-navy-900 mb-4">{title}</h3>
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

      {selectValue === 'custom' && (
        <div className="mt-4">
          <FormField label="Custom tone instructions" id={`${idPrefix}-custom`}>
            <textarea
              id={`${idPrefix}-custom`}
              value={customText}
              onChange={(e) => onCustomChange(e.target.value)}
              rows={3}
              className={textareaClass}
              disabled={disabled}
            />
          </FormField>
        </div>
      )}
    </div>
  )
}
