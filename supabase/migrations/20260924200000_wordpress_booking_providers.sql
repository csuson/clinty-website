-- FluentBooking + LatePoint WordPress booking integrations

create table if not exists public.fluentbooking_tokens (
  user_id uuid primary key references auth.users (id) on delete cascade,
  site_url text not null,
  username text not null,
  app_password text not null,
  calendar_id text not null,
  event_id text,
  timezone text not null default 'America/Los_Angeles',
  updated_at timestamptz not null default now()
);

alter table public.fluentbooking_tokens enable row level security;

create table if not exists public.fluentbooking_connections (
  user_id uuid primary key references auth.users (id) on delete cascade,
  site_url text,
  display_name text,
  calendar_id text,
  event_id text,
  connected_at timestamptz not null default now(),
  status text not null default 'connected'
    check (status in ('connected', 'disconnected', 'error')),
  last_error text
);

alter table public.fluentbooking_connections enable row level security;

drop policy if exists "Users can view own fluentbooking connection" on public.fluentbooking_connections;
create policy "Users can view own fluentbooking connection"
  on public.fluentbooking_connections for select
  using (auth.uid() = user_id);

create table if not exists public.fluentbooking_bookings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  external_booking_id text,
  event_id text,
  guest_email text,
  guest_name text,
  status text,
  start_time timestamptz,
  end_time timestamptz,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, external_booking_id)
);

create index if not exists fluentbooking_bookings_user_id_idx
  on public.fluentbooking_bookings (user_id);

alter table public.fluentbooking_bookings enable row level security;

drop policy if exists "Users can view own fluentbooking bookings" on public.fluentbooking_bookings;
create policy "Users can view own fluentbooking bookings"
  on public.fluentbooking_bookings for select
  using (auth.uid() = user_id);

create table if not exists public.latepoint_tokens (
  user_id uuid primary key references auth.users (id) on delete cascade,
  site_url text not null,
  api_key text not null,
  service_id text not null,
  agent_id text not null,
  location_id text,
  timezone text not null default 'America/Los_Angeles',
  updated_at timestamptz not null default now()
);

alter table public.latepoint_tokens enable row level security;

create table if not exists public.latepoint_connections (
  user_id uuid primary key references auth.users (id) on delete cascade,
  site_url text,
  display_name text,
  service_id text,
  agent_id text,
  connected_at timestamptz not null default now(),
  status text not null default 'connected'
    check (status in ('connected', 'disconnected', 'error')),
  last_error text
);

alter table public.latepoint_connections enable row level security;

drop policy if exists "Users can view own latepoint connection" on public.latepoint_connections;
create policy "Users can view own latepoint connection"
  on public.latepoint_connections for select
  using (auth.uid() = user_id);

create table if not exists public.latepoint_bookings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  external_booking_id text,
  service_id text,
  guest_email text,
  guest_name text,
  status text,
  start_time timestamptz,
  end_time timestamptz,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, external_booking_id)
);

create index if not exists latepoint_bookings_user_id_idx
  on public.latepoint_bookings (user_id);

alter table public.latepoint_bookings enable row level security;

drop policy if exists "Users can view own latepoint bookings" on public.latepoint_bookings;
create policy "Users can view own latepoint bookings"
  on public.latepoint_bookings for select
  using (auth.uid() = user_id);

comment on table public.fluentbooking_tokens is
  'FluentBooking WordPress Application Password credentials (server-side only).';
comment on table public.latepoint_tokens is
  'LatePoint REST API Extension credentials (server-side only).';
