alter table public.agent_settings
  add column if not exists email_draft_instead_of_hitl boolean not null default false;
