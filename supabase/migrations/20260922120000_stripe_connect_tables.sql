-- Stripe Connect OAuth tokens (server-side only — no user RLS policies)
create table if not exists public.stripe_tokens (
  user_id uuid primary key references auth.users (id) on delete cascade,
  access_token text not null,
  refresh_token text,
  stripe_account_id text not null,
  client_id text not null,
  publishable_key text,
  livemode boolean not null default false,
  scopes text[] not null default '{}',
  updated_at timestamptz not null default now()
);

alter table public.stripe_tokens enable row level security;

-- Stripe connection status (visible to the account owner)
create table if not exists public.stripe_connections (
  user_id uuid primary key references auth.users (id) on delete cascade,
  stripe_account_id text,
  business_name text,
  email text,
  country text,
  default_currency text,
  livemode boolean not null default false,
  scopes text[] not null default '{}',
  connected_at timestamptz not null default now(),
  status text not null default 'connected' check (status in ('connected', 'disconnected', 'error'))
);

alter table public.stripe_connections enable row level security;

drop policy if exists "Users can view own stripe connection" on public.stripe_connections;
create policy "Users can view own stripe connection"
  on public.stripe_connections for select
  using (auth.uid() = user_id);

comment on table public.stripe_tokens is
  'Stripe Connect OAuth tokens for merchant payment access (server-side only).';
comment on table public.stripe_connections is
  'Stripe Connect connection status visible to the account owner.';
