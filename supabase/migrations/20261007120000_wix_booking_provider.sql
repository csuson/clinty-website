-- Wix Bookings calendar integration (email_assistant CALENDAR_PROVIDER=wix)

create table if not exists public.wix_tokens (
  user_id uuid primary key references auth.users (id) on delete cascade,
  api_key text,
  -- Nullable: API-key auth requires site_id; OAuth app auth (app_id/secret/instance_id) does not.
  site_id text,
  service_id text not null,
  app_id text,
  app_secret text,
  instance_id text,
  timezone text not null default 'America/Los_Angeles',
  resource_id text,
  location_id text,
  updated_at timestamptz not null default now()
);

alter table public.wix_tokens enable row level security;

create table if not exists public.wix_connections (
  user_id uuid primary key references auth.users (id) on delete cascade,
  site_id text,
  display_name text,
  service_id text,
  connected_at timestamptz not null default now(),
  status text not null default 'connected'
    check (status in ('connected', 'disconnected', 'error')),
  last_error text
);

alter table public.wix_connections enable row level security;

drop policy if exists "Users can view own wix connection" on public.wix_connections;
create policy "Users can view own wix connection"
  on public.wix_connections for select
  using (auth.uid() = user_id);

create table if not exists public.wix_bookings (
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

create index if not exists wix_bookings_user_id_idx
  on public.wix_bookings (user_id);

alter table public.wix_bookings enable row level security;

drop policy if exists "Users can view own wix bookings" on public.wix_bookings;
create policy "Users can view own wix bookings"
  on public.wix_bookings for select
  using (auth.uid() = user_id);

comment on table public.wix_tokens is
  'Wix Bookings API key or OAuth app credentials (server-side only).';
comment on table public.wix_connections is
  'User-visible Wix Bookings connection status.';
