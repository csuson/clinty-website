alter table public.agent_settings
  add column if not exists overbook_enabled boolean not null default false;

alter table public.agent_settings
  add column if not exists max_bookings_per_slot integer not null default 2;

comment on column public.agent_settings.overbook_enabled is
  'When true, time slots with existing appointments may still be offered/booked up to max_bookings_per_slot';

comment on column public.agent_settings.max_bookings_per_slot is
  'Maximum overlapping bookings allowed in the same booking-duration window when overbook_enabled is true';
