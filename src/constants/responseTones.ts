/** Keep preset ids in sync with email_assistant/src/email_assistant/response_tone.py */

export const DEFAULT_RESPONSE_TONE = 'professional'

export const WHATSAPP_SAME_AS_EMAIL = ''

export type ResponseTonePreset = {
  id: string
  label: string
  description: string
}

export const RESPONSE_TONE_PRESETS: ResponseTonePreset[] = [
  {
    id: 'professional',
    label: 'Professional',
    description: 'Clear, courteous, and businesslike — concise complete sentences.',
  },
  {
    id: 'friendly',
    label: 'Friendly',
    description: 'Warm and approachable with conversational phrasing.',
  },
  {
    id: 'casual',
    label: 'Casual',
    description: 'Relaxed and informal, suited to chat-style messages.',
  },
  {
    id: 'formal',
    label: 'Formal',
    description: 'Polished and respectful — good for corporate correspondence.',
  },
  {
    id: 'enthusiastic',
    label: 'Enthusiastic',
    description: 'Upbeat and encouraging without exaggeration.',
  },
  {
    id: 'empathetic',
    label: 'Empathetic',
    description: 'Acknowledges the sender first; patient and supportive.',
  },
]

const PRESET_IDS = new Set(RESPONSE_TONE_PRESETS.map((preset) => preset.id))

export function isResponseTonePreset(value: string): boolean {
  return PRESET_IDS.has(value.trim().toLowerCase())
}

export function presetLabel(value: string): string {
  const preset = RESPONSE_TONE_PRESETS.find((item) => item.id === value)
  return preset?.label ?? value
}
