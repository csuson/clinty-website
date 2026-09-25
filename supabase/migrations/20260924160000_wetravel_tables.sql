-- WeTravel Partner API credentials (server-side only — no user RLS policies)
create table if not exists public.wetravel_tokens (
  user_id uuid primary key references auth.users (id) on delete cascade,
  api_key text not null,
  sandbox boolean not null default false,
  display_name text,
  updated_at timestamptz not null default now()
);

alter table public.wetravel_tokens enable row level security;

-- WeTravel connection status (visible to the account owner)
create table if not exists public.wetravel_connections (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  sandbox boolean not null default false,
  connected_at timestamptz not null default now(),
  status text not null default 'connected'
    check (status in ('connected', 'disconnected', 'error')),
  last_error text
);

alter table public.wetravel_connections enable row level security;

drop policy if exists "Users can view own wetravel connection" on public.wetravel_connections;
create policy "Users can view own wetravel connection"
  on public.wetravel_connections for select
  using (auth.uid() = user_id);

-- Synced WeTravel bookings (from webhooks / API poll)
create table if not exists public.wetravel_bookings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  wetravel_order_id text,
  trip_uuid text,
  trip_title text,
  buyer_email text,
  buyer_name text,
  status text,
  start_date date,
  end_date date,
  amount numeric,
  currency text,
  payload jsonb not null default '{}'::jsonb,
  calendar_event_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, wetravel_order_id)
);

create index if not exists wetravel_bookings_user_id_idx
  on public.wetravel_bookings (user_id);

alter table public.wetravel_bookings enable row level security;

drop policy if exists "Users can view own wetravel bookings" on public.wetravel_bookings;
create policy "Users can view own wetravel bookings"
  on public.wetravel_bookings for select
  using (auth.uid() = user_id);

comment on table public.wetravel_tokens is
  'WeTravel Partner API refresh tokens (server-side only).';
comment on table public.wetravel_connections is
  'WeTravel connection status visible to the account owner.';
comment on table public.wetravel_bookings is
  'WeTravel bookings synced via webhooks or API for agent/calendar use.';
