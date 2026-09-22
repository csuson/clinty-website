import FormField from './FormField'
import { inputClass } from '../constants/forms'

export const DEFAULT_DAILY_INCOMING_WHATSAPP_LIMIT = 50

export type AgentBehaviorSettings = {
  auto_book_scheduling: boolean | null
  multiple_booking_enabled: boolean
  overbook_enabled: boolean
  max_bookings_per_slot: number
  auto_respond_instruction: boolean | null
  auto_respond_scheduling: boolean | null
  auto_respond_whatsapp: boolean
  auto_respond_catalog: boolean
  auto_respond_personal: boolean
  email_ignore_personal: boolean
  email_ad_enabled: boolean
  email_draft_instead_of_hitl: boolean
  whatsapp_ignore_personal: boolean
  thread_message_cap: number
  whatsapp_thread_message_cap: number
  daily_incoming_email_limit: number
  daily_incoming_email_timezone: string | null
  daily_incoming_whatsapp_limit: number
  appointment_reminders_enabled: boolean
  appointment_reminder_email_hours: string
  appointment_reminder_whatsapp_hours: string
}

export function defaultAgentBehaviorSettings(): AgentBehaviorSettings {
  return {
    auto_book_scheduling: null,
    multiple_booking_enabled: false,
    overbook_enabled: false,
    max_bookings_per_slot: 2,
    auto_respond_instruction: null,
    auto_respond_scheduling: null,
    auto_respond_whatsapp: true,
    auto_respond_catalog: false,
    auto_respond_personal: true,
    email_ignore_personal: false,
    email_ad_enabled: false,
    email_draft_instead_of_hitl: false,
    whatsapp_ignore_personal: true,
    thread_message_cap: 10,
    whatsapp_thread_message_cap: 10,
    daily_incoming_email_limit: 50,
    daily_incoming_email_timezone: '',
    daily_incoming_whatsapp_limit: DEFAULT_DAILY_INCOMING_WHATSAPP_LIMIT,
    appointment_reminders_enabled: true,
    appointment_reminder_email_hours: '24',
    appointment_reminder_whatsapp_hours: '2',
  }
}

const readOnlyInputClass = `${inputClass} bg-navy-50/60 text-navy-700 cursor-not-allowed`

function booleanSelectValue(value: boolean | null | undefined): string {
  if (value === null || value === undefined) return ''
  return value ? 'true' : 'false'
}

function parseBooleanSelect(value: string): boolean | null {
  if (value === '') return null
  return value === 'true'
}

function parseRequiredBooleanSelect(value: string, fallback: boolean): boolean {
  const parsed = parseBooleanSelect(value)
  return parsed ?? fallback
}

function BehaviorSubsection({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-navy-900">{title}</h3>
        {description ? <p className="text-sm text-navy-600 mt-1">{description}</p> : null}
      </div>
      <div className="grid gap-5 sm:grid-cols-2">{children}</div>
    </div>
  )
}

type AgentBehaviorFieldsProps = {
  settings: AgentBehaviorSettings
  onChange: <K extends keyof AgentBehaviorSettings>(field: K, value: AgentBehaviorSettings[K]) => void
  disabled?: boolean
  idPrefix?: string
  showCopy?: boolean
  /** When false, thread caps and daily ingest limits are read-only (admin-managed). */
  limitsEditable?: boolean
}

export default function AgentBehaviorFields({
  settings,
  onChange,
  disabled = false,
  idPrefix = 'agent',
  showCopy = false,
  limitsEditable = true,
}: AgentBehaviorFieldsProps) {
  const copy = (value: string | null | undefined) =>
    showCopy && value?.trim() ? value : undefined
  const limitsLocked = disabled || !limitsEditable

  return (
    <div className="space-y-8">
      <BehaviorSubsection
        title="Email"
        description="Auto-reply, scheduling, catalog, and inbox limits for email."
      >
        <FormField
          label="Auto Respond Instruction"
          id={`${idPrefix}-auto-respond-instruction`}
          copyValue={copy(booleanSelectValue(settings.auto_respond_instruction))}
        >
          <select
            id={`${idPrefix}-auto-respond-instruction`}
            value={booleanSelectValue(settings.auto_respond_instruction)}
            onChange={(e) => onChange('auto_respond_instruction', parseBooleanSelect(e.target.value))}
            className={inputClass}
            disabled={disabled}
          >
            <option value="">Not set</option>
            <option value="true">True</option>
            <option value="false">False</option>
          </select>
        </FormField>
        <FormField
          label="Auto Respond Scheduling"
          id={`${idPrefix}-auto-respond-scheduling`}
          copyValue={copy(booleanSelectValue(settings.auto_respond_scheduling))}
        >
          <select
            id={`${idPrefix}-auto-respond-scheduling`}
            value={booleanSelectValue(settings.auto_respond_scheduling)}
            onChange={(e) => onChange('auto_respond_scheduling', parseBooleanSelect(e.target.value))}
            className={inputClass}
            disabled={disabled}
          >
            <option value="">Not set</option>
            <option value="true">True</option>
            <option value="false">False</option>
          </select>
        </FormField>
        <FormField
          label="Auto Book Scheduling"
          id={`${idPrefix}-auto-book-scheduling`}
          copyValue={copy(booleanSelectValue(settings.auto_book_scheduling))}
        >
          <select
            id={`${idPrefix}-auto-book-scheduling`}
            value={booleanSelectValue(settings.auto_book_scheduling)}
            onChange={(e) => onChange('auto_book_scheduling', parseBooleanSelect(e.target.value))}
            className={inputClass}
            disabled={disabled}
          >
            <option value="">Not set</option>
            <option value="true">True</option>
            <option value="false">False</option>
          </select>
        </FormField>
        <FormField
          label="Multiple booking"
          id={`${idPrefix}-multiple-booking-enabled`}
          copyValue={copy(booleanSelectValue(settings.multiple_booking_enabled))}
        >
          <select
            id={`${idPrefix}-multiple-booking-enabled`}
            value={booleanSelectValue(settings.multiple_booking_enabled)}
            onChange={(e) =>
              onChange(
                'multiple_booking_enabled',
                parseRequiredBooleanSelect(e.target.value, false),
              )
            }
            className={inputClass}
            disabled={disabled}
          >
            <option value="true">True</option>
            <option value="false">False</option>
          </select>
        </FormField>
        <FormField
          label="Overbook time slots"
          id={`${idPrefix}-overbook-enabled`}
          copyValue={copy(booleanSelectValue(settings.overbook_enabled))}
        >
          <select
            id={`${idPrefix}-overbook-enabled`}
            value={booleanSelectValue(settings.overbook_enabled)}
            onChange={(e) =>
              onChange('overbook_enabled', parseRequiredBooleanSelect(e.target.value, false))
            }
            className={inputClass}
            disabled={disabled}
          >
            <option value="true">True</option>
            <option value="false">False</option>
          </select>
        </FormField>
        <FormField
          label="Appointment reminders"
          id={`${idPrefix}-appointment-reminders-enabled`}
          copyValue={copy(booleanSelectValue(settings.appointment_reminders_enabled))}
        >
          <select
            id={`${idPrefix}-appointment-reminders-enabled`}
            value={booleanSelectValue(settings.appointment_reminders_enabled)}
            onChange={(e) =>
              onChange(
                'appointment_reminders_enabled',
                parseRequiredBooleanSelect(e.target.value, true),
              )
            }
            className={inputClass}
            disabled={disabled}
          >
            <option value="true">True</option>
            <option value="false">False</option>
          </select>
        </FormField>
        <FormField
          label="Reminder email (hours before)"
          id={`${idPrefix}-appointment-reminder-email-hours`}
          copyValue={copy(settings.appointment_reminder_email_hours)}
        >
          <input
            id={`${idPrefix}-appointment-reminder-email-hours`}
            type="text"
            value={settings.appointment_reminder_email_hours}
            onChange={(e) => onChange('appointment_reminder_email_hours', e.target.value)}
            className={inputClass}
            disabled={disabled}
            placeholder="24,2"
          />
        </FormField>
        <FormField
          label="Max bookings per slot"
          id={`${idPrefix}-max-bookings-per-slot`}
          copyValue={copy(String(settings.max_bookings_per_slot))}
        >
          <input
            id={`${idPrefix}-max-bookings-per-slot`}
            type="number"
            min={2}
            max={20}
            value={settings.max_bookings_per_slot}
            onChange={(e) => {
              const parsed = Number.parseInt(e.target.value, 10)
              onChange(
                'max_bookings_per_slot',
                Number.isFinite(parsed) ? Math.max(2, parsed) : 2,
              )
            }}
            className={inputClass}
            disabled={disabled}
          />
        </FormField>
        <FormField
          label="Auto Respond Catalog"
          id={`${idPrefix}-auto-respond-catalog`}
          copyValue={copy(booleanSelectValue(settings.auto_respond_catalog))}
        >
          <select
            id={`${idPrefix}-auto-respond-catalog`}
            value={booleanSelectValue(settings.auto_respond_catalog)}
            onChange={(e) =>
              onChange('auto_respond_catalog', parseRequiredBooleanSelect(e.target.value, false))
            }
            className={inputClass}
            disabled={disabled}
          >
            <option value="true">True</option>
            <option value="false">False</option>
          </select>
        </FormField>
        <FormField
          label="Email Ignore Personal"
          id={`${idPrefix}-email-ignore-personal`}
          copyValue={copy(booleanSelectValue(settings.email_ignore_personal))}
        >
          <select
            id={`${idPrefix}-email-ignore-personal`}
            value={booleanSelectValue(settings.email_ignore_personal)}
            onChange={(e) =>
              onChange('email_ignore_personal', parseRequiredBooleanSelect(e.target.value, false))
            }
            className={inputClass}
            disabled={disabled}
          >
            <option value="true">True</option>
            <option value="false">False</option>
          </select>
        </FormField>
        <FormField
          label="Auto Respond Personal"
          id={`${idPrefix}-auto-respond-personal`}
          copyValue={copy(booleanSelectValue(settings.auto_respond_personal))}
        >
          <select
            id={`${idPrefix}-auto-respond-personal`}
            value={booleanSelectValue(settings.auto_respond_personal)}
            onChange={(e) =>
              onChange('auto_respond_personal', parseRequiredBooleanSelect(e.target.value, true))
            }
            className={inputClass}
            disabled={disabled}
          >
            <option value="true">True</option>
            <option value="false">False</option>
          </select>
        </FormField>
        <FormField
          label="Email Ad Prompt"
          id={`${idPrefix}-email-ad-enabled`}
          copyValue={copy(booleanSelectValue(settings.email_ad_enabled))}
        >
          <select
            id={`${idPrefix}-email-ad-enabled`}
            value={booleanSelectValue(settings.email_ad_enabled)}
            onChange={(e) =>
              onChange('email_ad_enabled', parseRequiredBooleanSelect(e.target.value, false))
            }
            className={inputClass}
            disabled={disabled}
          >
            <option value="true">True</option>
            <option value="false">False</option>
          </select>
        </FormField>
        <FormField
          label="Draft Instead of HITL"
          id={`${idPrefix}-email-draft-instead-of-hitl`}
          copyValue={copy(booleanSelectValue(settings.email_draft_instead_of_hitl))}
        >
          <select
            id={`${idPrefix}-email-draft-instead-of-hitl`}
            value={booleanSelectValue(settings.email_draft_instead_of_hitl)}
            onChange={(e) =>
              onChange(
                'email_draft_instead_of_hitl',
                parseRequiredBooleanSelect(e.target.value, false),
              )
            }
            className={inputClass}
            disabled={disabled}
          >
            <option value="true">True</option>
            <option value="false">False</option>
          </select>
        </FormField>
        <FormField
          label="Thread Message Cap"
          id={`${idPrefix}-thread-message-cap`}
          copyValue={copy(String(settings.thread_message_cap))}
        >
          <input
            id={`${idPrefix}-thread-message-cap`}
            type="number"
            min={1}
            value={settings.thread_message_cap}
            onChange={(e) => onChange('thread_message_cap', Number(e.target.value) || 10)}
            className={limitsLocked ? readOnlyInputClass : inputClass}
            disabled={limitsLocked}
            readOnly={!limitsEditable}
          />
        </FormField>
        <FormField
          label="Daily Incoming Email Limit"
          id={`${idPrefix}-daily-incoming-email-limit`}
          copyValue={copy(String(settings.daily_incoming_email_limit))}
        >
          <input
            id={`${idPrefix}-daily-incoming-email-limit`}
            type="number"
            min={0}
            value={settings.daily_incoming_email_limit}
            onChange={(e) =>
              onChange('daily_incoming_email_limit', Math.max(0, Number(e.target.value) || 0))
            }
            className={limitsLocked ? readOnlyInputClass : inputClass}
            disabled={limitsLocked}
            readOnly={!limitsEditable}
          />
        </FormField>
        <FormField
          label="Daily Incoming Email Timezone"
          id={`${idPrefix}-daily-incoming-email-timezone`}
          copyValue={copy(settings.daily_incoming_email_timezone ?? '')}
        >
          <input
            id={`${idPrefix}-daily-incoming-email-timezone`}
            type="text"
            value={settings.daily_incoming_email_timezone ?? ''}
            onChange={(e) => onChange('daily_incoming_email_timezone', e.target.value || null)}
            placeholder="America/Los_Angeles"
            className={inputClass}
            disabled={disabled}
          />
        </FormField>
      </BehaviorSubsection>

      <BehaviorSubsection
        title="WhatsApp"
        description="Auto-reply, appointment reminders, and thread limits for WhatsApp Web."
      >
        <FormField
          label="Auto Respond WhatsApp"
          id={`${idPrefix}-auto-respond-whatsapp`}
          copyValue={copy(booleanSelectValue(settings.auto_respond_whatsapp))}
        >
          <select
            id={`${idPrefix}-auto-respond-whatsapp`}
            value={booleanSelectValue(settings.auto_respond_whatsapp)}
            onChange={(e) =>
              onChange('auto_respond_whatsapp', parseRequiredBooleanSelect(e.target.value, true))
            }
            className={inputClass}
            disabled={disabled}
          >
            <option value="true">True</option>
            <option value="false">False</option>
          </select>
        </FormField>
        <FormField
          label="WhatsApp Ignore Personal"
          id={`${idPrefix}-whatsapp-ignore-personal`}
          copyValue={copy(booleanSelectValue(settings.whatsapp_ignore_personal))}
        >
          <select
            id={`${idPrefix}-whatsapp-ignore-personal`}
            value={booleanSelectValue(settings.whatsapp_ignore_personal)}
            onChange={(e) =>
              onChange('whatsapp_ignore_personal', parseRequiredBooleanSelect(e.target.value, true))
            }
            className={inputClass}
            disabled={disabled}
          >
            <option value="true">True</option>
            <option value="false">False</option>
          </select>
        </FormField>
        <FormField
          label="Reminder WhatsApp (hours before)"
          id={`${idPrefix}-appointment-reminder-whatsapp-hours`}
          copyValue={copy(settings.appointment_reminder_whatsapp_hours)}
        >
          <input
            id={`${idPrefix}-appointment-reminder-whatsapp-hours`}
            type="text"
            value={settings.appointment_reminder_whatsapp_hours}
            onChange={(e) => onChange('appointment_reminder_whatsapp_hours', e.target.value)}
            className={inputClass}
            disabled={disabled}
            placeholder="2"
          />
        </FormField>
        <FormField
          label="WhatsApp Thread Message Cap"
          id={`${idPrefix}-whatsapp-thread-message-cap`}
          copyValue={copy(String(settings.whatsapp_thread_message_cap))}
        >
          <input
            id={`${idPrefix}-whatsapp-thread-message-cap`}
            type="number"
            min={1}
            value={settings.whatsapp_thread_message_cap}
            onChange={(e) =>
              onChange('whatsapp_thread_message_cap', Number(e.target.value) || 10)
            }
            className={limitsLocked ? readOnlyInputClass : inputClass}
            disabled={limitsLocked}
            readOnly={!limitsEditable}
          />
        </FormField>
        <FormField
          label="Daily Incoming WhatsApp Limit"
          id={`${idPrefix}-daily-incoming-whatsapp-limit`}
          copyValue={copy(String(settings.daily_incoming_whatsapp_limit))}
        >
          <input
            id={`${idPrefix}-daily-incoming-whatsapp-limit`}
            type="number"
            min={0}
            value={settings.daily_incoming_whatsapp_limit}
            onChange={(e) =>
              onChange(
                'daily_incoming_whatsapp_limit',
                Math.max(0, Number(e.target.value) || 0),
              )
            }
            className={limitsLocked ? readOnlyInputClass : inputClass}
            disabled={limitsLocked}
            readOnly={!limitsEditable}
          />
        </FormField>
      </BehaviorSubsection>
    </div>
  )
}

export type AgentBehaviorRowInput = {
  auto_book_scheduling?: boolean | null
  multiple_booking_enabled?: boolean | null
  overbook_enabled?: boolean | null
  max_bookings_per_slot?: number | null
  auto_respond_instruction?: boolean | null
  auto_respond_scheduling?: boolean | null
  auto_respond_whatsapp?: boolean | null
  auto_respond_catalog?: boolean | null
  auto_respond_personal?: boolean | null
  email_ignore_personal?: boolean | null
  email_ad_enabled?: boolean | null
  email_draft_instead_of_hitl?: boolean | null
  whatsapp_ignore_personal?: boolean | null
  thread_message_cap?: number | null
  whatsapp_thread_message_cap?: number | null
  daily_incoming_email_limit?: number | null
  daily_incoming_email_timezone?: string | null
  daily_incoming_whatsapp_limit?: number | null
  appointment_reminders_enabled?: boolean | null
  appointment_reminder_email_hours?: string | null
  appointment_reminder_whatsapp_hours?: string | null
}

export function agentBehaviorFromRow(
  row: Partial<AgentBehaviorRowInput> | null | undefined,
): AgentBehaviorSettings {
  const defaults = defaultAgentBehaviorSettings()
  if (!row) return defaults

  return {
    auto_book_scheduling: row.auto_book_scheduling ?? defaults.auto_book_scheduling,
    multiple_booking_enabled:
      row.multiple_booking_enabled ?? defaults.multiple_booking_enabled,
    overbook_enabled: row.overbook_enabled ?? defaults.overbook_enabled,
    max_bookings_per_slot: row.max_bookings_per_slot ?? defaults.max_bookings_per_slot,
    auto_respond_instruction: row.auto_respond_instruction ?? defaults.auto_respond_instruction,
    auto_respond_scheduling: row.auto_respond_scheduling ?? defaults.auto_respond_scheduling,
    auto_respond_whatsapp: row.auto_respond_whatsapp ?? defaults.auto_respond_whatsapp,
    auto_respond_catalog: row.auto_respond_catalog ?? defaults.auto_respond_catalog,
    auto_respond_personal: row.auto_respond_personal ?? defaults.auto_respond_personal,
    email_ignore_personal: row.email_ignore_personal ?? defaults.email_ignore_personal,
    email_ad_enabled: row.email_ad_enabled ?? defaults.email_ad_enabled,
    email_draft_instead_of_hitl:
      row.email_draft_instead_of_hitl ?? defaults.email_draft_instead_of_hitl,
    whatsapp_ignore_personal: row.whatsapp_ignore_personal ?? defaults.whatsapp_ignore_personal,
    thread_message_cap: row.thread_message_cap ?? defaults.thread_message_cap,
    whatsapp_thread_message_cap:
      row.whatsapp_thread_message_cap ?? defaults.whatsapp_thread_message_cap,
    daily_incoming_email_limit:
      row.daily_incoming_email_limit ?? defaults.daily_incoming_email_limit,
    daily_incoming_email_timezone: row.daily_incoming_email_timezone?.trim() ?? '',
    daily_incoming_whatsapp_limit:
      row.daily_incoming_whatsapp_limit ?? defaults.daily_incoming_whatsapp_limit,
    appointment_reminders_enabled:
      row.appointment_reminders_enabled ?? defaults.appointment_reminders_enabled,
    appointment_reminder_email_hours:
      row.appointment_reminder_email_hours?.trim() || defaults.appointment_reminder_email_hours,
    appointment_reminder_whatsapp_hours:
      row.appointment_reminder_whatsapp_hours?.trim()
      || defaults.appointment_reminder_whatsapp_hours,
  }
}

export function agentBehaviorToDbPayload(settings: AgentBehaviorSettings) {
  return {
    auto_book_scheduling: settings.auto_book_scheduling,
    multiple_booking_enabled: settings.multiple_booking_enabled,
    overbook_enabled: settings.overbook_enabled,
    max_bookings_per_slot: settings.max_bookings_per_slot,
    auto_respond_instruction: settings.auto_respond_instruction,
    auto_respond_scheduling: settings.auto_respond_scheduling,
    auto_respond_whatsapp: settings.auto_respond_whatsapp,
    auto_respond_catalog: settings.auto_respond_catalog,
    auto_respond_personal: settings.auto_respond_personal,
    email_ignore_personal: settings.email_ignore_personal,
    email_ad_enabled: settings.email_ad_enabled,
    email_draft_instead_of_hitl: settings.email_draft_instead_of_hitl,
    whatsapp_ignore_personal: settings.whatsapp_ignore_personal,
    thread_message_cap: settings.thread_message_cap,
    whatsapp_thread_message_cap: settings.whatsapp_thread_message_cap,
    daily_incoming_email_limit: settings.daily_incoming_email_limit,
    daily_incoming_email_timezone: settings.daily_incoming_email_timezone?.trim() || null,
    daily_incoming_whatsapp_limit: settings.daily_incoming_whatsapp_limit,
    appointment_reminders_enabled: settings.appointment_reminders_enabled,
    appointment_reminder_email_hours: settings.appointment_reminder_email_hours?.trim() || '24',
    appointment_reminder_whatsapp_hours:
      settings.appointment_reminder_whatsapp_hours?.trim() || '2',
  }
}

/** Behavior fields users may update from the account dashboard (excludes admin-managed limits). */
export function agentBehaviorToUserDbPayload(settings: AgentBehaviorSettings) {
  return {
    auto_book_scheduling: settings.auto_book_scheduling,
    multiple_booking_enabled: settings.multiple_booking_enabled,
    overbook_enabled: settings.overbook_enabled,
    max_bookings_per_slot: settings.max_bookings_per_slot,
    auto_respond_instruction: settings.auto_respond_instruction,
    auto_respond_scheduling: settings.auto_respond_scheduling,
    auto_respond_whatsapp: settings.auto_respond_whatsapp,
    auto_respond_catalog: settings.auto_respond_catalog,
    auto_respond_personal: settings.auto_respond_personal,
    email_ignore_personal: settings.email_ignore_personal,
    whatsapp_ignore_personal: settings.whatsapp_ignore_personal,
    daily_incoming_email_timezone: settings.daily_incoming_email_timezone?.trim() || null,
    appointment_reminders_enabled: settings.appointment_reminders_enabled,
    appointment_reminder_email_hours: settings.appointment_reminder_email_hours?.trim() || '24',
    appointment_reminder_whatsapp_hours:
      settings.appointment_reminder_whatsapp_hours?.trim() || '2',
  }
}
