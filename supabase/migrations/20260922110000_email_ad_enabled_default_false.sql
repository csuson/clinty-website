-- Default email ad off for new agent_settings rows.
alter table public.agent_settings
  alter column email_ad_enabled set default false;
