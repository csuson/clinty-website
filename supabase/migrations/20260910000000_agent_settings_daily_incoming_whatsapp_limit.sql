-- Daily ingest limit for WhatsApp (maps to DAILY_INCOMING_WHATSAPP_LIMIT runtime env var).
alter table public.agent_settings
  add column if not exists daily_incoming_whatsapp_limit integer not null default 50;

alter table public.agent_settings
  drop constraint if exists agent_settings_daily_incoming_whatsapp_limit_positive;

alter table public.agent_settings
  add constraint agent_settings_daily_incoming_whatsapp_limit_positive
    check (daily_incoming_whatsapp_limit >= 0);
