-- Optional Response Template in outbound replies (default off).
alter table public.agent_settings
  add column if not exists response_template_enabled boolean not null default false;
