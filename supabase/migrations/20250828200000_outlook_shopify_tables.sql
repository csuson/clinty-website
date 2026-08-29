-- Microsoft Outlook OAuth tokens (server-side only — no user RLS policies)
create table if not exists public.outlook_tokens (
  user_id uuid primary key references auth.users (id) on delete cascade,
  access_token text not null,
  refresh_token text,
  token_uri text not null default 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
  client_id text not null,
  client_secret text not null,
  scopes text[] not null default '{}',
  outlook_account text,
  expiry timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.outlook_tokens enable row level security;

-- Microsoft Outlook connection status (visible to the account owner)
create table if not exists public.outlook_connections (
  user_id uuid primary key references auth.users (id) on delete cascade,
  outlook_email text,
  scopes text[] not null default '{}',
  connected_at timestamptz not null default now(),
  token_expiry timestamptz,
  status text not null default 'connected' check (status in ('connected', 'disconnected', 'error'))
);

alter table public.outlook_connections enable row level security;

drop policy if exists "Users can view own outlook connection" on public.outlook_connections;
create policy "Users can view own outlook connection"
  on public.outlook_connections for select
  using (auth.uid() = user_id);

-- Shopify OAuth tokens (server-side only — no user RLS policies)
create table if not exists public.shopify_tokens (
  user_id uuid primary key references auth.users (id) on delete cascade,
  shop_domain text not null,
  access_token text not null,
  client_id text not null,
  scopes text[] not null default '{}',
  updated_at timestamptz not null default now()
);

alter table public.shopify_tokens enable row level security;

-- Shopify connection status (visible to the account owner)
create table if not exists public.shopify_connections (
  user_id uuid primary key references auth.users (id) on delete cascade,
  shop_domain text,
  shop_name text,
  scopes text[] not null default '{}',
  connected_at timestamptz not null default now(),
  status text not null default 'connected' check (status in ('connected', 'disconnected', 'error'))
);

alter table public.shopify_connections enable row level security;

drop policy if exists "Users can view own shopify connection" on public.shopify_connections;
create policy "Users can view own shopify connection"
  on public.shopify_connections for select
  using (auth.uid() = user_id);
