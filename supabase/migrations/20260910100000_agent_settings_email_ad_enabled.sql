-- Toggle Clinty ad prompt on outbound email replies.
alter table public.agent_settings
  add column if not exists email_ad_enabled boolean not null default true;
