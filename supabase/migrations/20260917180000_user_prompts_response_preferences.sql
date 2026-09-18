-- Optional per-account rules appended to the assistant default_response_preferences.txt baseline.
alter table public.user_prompts
  add column if not exists response_preferences text;

comment on column public.user_prompts.response_preferences is
  'Extra response-agent rules appended to the email-assistant default_response_preferences.txt file at runtime.';

alter table public.user_prompts
  add column if not exists whatsapp_response_preferences text;

comment on column public.user_prompts.whatsapp_response_preferences is
  'Optional WhatsApp-only response rules; when null, email response_preferences is used for WhatsApp too.';
