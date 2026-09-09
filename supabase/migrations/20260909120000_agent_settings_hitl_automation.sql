-- HITL / automation settings previously only available via Render env vars.
alter table public.agent_settings
  add column if not exists auto_respond_whatsapp boolean not null default true,
  add column if not exists auto_respond_catalog boolean not null default false,
  add column if not exists whatsapp_ignore_personal boolean not null default true,
  add column if not exists thread_message_cap integer not null default 10,
  add column if not exists whatsapp_thread_message_cap integer not null default 10;

alter table public.agent_settings
  add constraint agent_settings_thread_message_cap_positive
    check (thread_message_cap >= 1),
  add constraint agent_settings_whatsapp_thread_message_cap_positive
    check (whatsapp_thread_message_cap >= 1);
