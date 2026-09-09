-- Daily ingest limits (maps to DAILY_INCOMING_EMAIL_* runtime env vars).
alter table public.agent_settings
  add column if not exists daily_incoming_email_limit integer not null default 50,
  add column if not exists daily_incoming_email_timezone text;

alter table public.agent_settings
  add constraint agent_settings_daily_incoming_email_limit_positive
    check (daily_incoming_email_limit >= 0);
