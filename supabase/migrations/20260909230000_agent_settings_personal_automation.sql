-- Email ignore personal + auto-respond personal for email and WhatsApp.
alter table public.agent_settings
  add column if not exists email_ignore_personal boolean not null default false,
  add column if not exists auto_respond_personal boolean not null default true;
