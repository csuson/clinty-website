-- Response tone presets for email and WhatsApp (see email_assistant RESPONSE_TONE)
alter table public.user_prompts
  add column if not exists response_tone text,
  add column if not exists whatsapp_response_tone text;

comment on column public.user_prompts.response_tone is
  'Email reply tone preset (professional, friendly, …) or custom instructions';
comment on column public.user_prompts.whatsapp_response_tone is
  'WhatsApp reply tone override; null means use response_tone';
