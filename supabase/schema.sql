-- Run this in the Supabase SQL Editor (Dashboard → SQL → New query)

-- Customer profiles linked to Supabase Auth users
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text,
  company_name text,
  plan text not null default 'starter' check (plan in ('starter', 'growth', 'business')),
  billing_status text not null default 'trialing' check (billing_status in ('trialing', 'active', 'past_due', 'canceled')),
  trial_ends_at timestamptz default (now() + interval '14 days'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- API keys for customer integrations
create table if not exists public.api_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  key_prefix text not null,
  key_hash text not null,
  key_secret text,
  last_used_at timestamptz,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

alter table public.api_keys enable row level security;

drop policy if exists "Users can view own api keys" on public.api_keys;
create policy "Users can view own api keys"
  on public.api_keys for select
  using (auth.uid() = user_id);

drop policy if exists "Users can create own api keys" on public.api_keys;
create policy "Users can create own api keys"
  on public.api_keys for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own api keys" on public.api_keys;
create policy "Users can update own api keys"
  on public.api_keys for update
  using (auth.uid() = user_id);

-- Auto-create a profile row when a customer signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name, company_name)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'company_name'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Keep updated_at current on profile edits
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_updated_at on public.profiles;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Migration for existing profiles tables (safe to re-run)
alter table public.profiles add column if not exists plan text not null default 'starter';
alter table public.profiles add column if not exists billing_status text not null default 'trialing';
alter table public.profiles add column if not exists trial_ends_at timestamptz default (now() + interval '14 days');
alter table public.api_keys add column if not exists key_secret text;

-- Gmail OAuth tokens (server-side only — no user RLS policies)
create table if not exists public.gmail_tokens (
  user_id uuid primary key references auth.users (id) on delete cascade,
  access_token text not null,
  refresh_token text,
  token_uri text not null default 'https://oauth2.googleapis.com/token',
  client_id text not null,
  client_secret text not null,
  scopes text[] not null default '{}',
  universe_domain text not null default 'googleapis.com',
  google_account text,
  expiry timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.gmail_tokens enable row level security;

-- Gmail connection status (visible to the account owner)
create table if not exists public.gmail_connections (
  user_id uuid primary key references auth.users (id) on delete cascade,
  google_email text,
  scopes text[] not null default '{}',
  connected_at timestamptz not null default now(),
  token_expiry timestamptz,
  status text not null default 'connected' check (status in ('connected', 'disconnected', 'error'))
);

alter table public.gmail_connections enable row level security;

drop policy if exists "Users can view own gmail connection" on public.gmail_connections;
create policy "Users can view own gmail connection"
  on public.gmail_connections for select
  using (auth.uid() = user_id);

-- Admin dashboard: set ADMIN_EMAILS in Supabase Edge Function secrets and
-- VITE_ADMIN_EMAILS in the website .env (comma-separated admin emails).
-- The admin-data Edge Function uses the service role to read all rows.
