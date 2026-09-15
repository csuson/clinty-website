alter table public.agent_settings
  add column if not exists multiple_booking_enabled boolean not null default false;

comment on column public.agent_settings.multiple_booking_enabled is
  'When true, the assistant may check and book several appointments in one scheduling flow';
