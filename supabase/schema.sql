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

-- Square OAuth tokens (server-side only — no user RLS policies)
create table if not exists public.square_tokens (
  user_id uuid primary key references auth.users (id) on delete cascade,
  access_token text not null,
  refresh_token text,
  merchant_id text not null,
  application_id text not null,
  expires_at timestamptz,
  scopes text[] not null default '{}',
  updated_at timestamptz not null default now()
);

alter table public.square_tokens enable row level security;

-- Square connection status (visible to the account owner)
create table if not exists public.square_connections (
  user_id uuid primary key references auth.users (id) on delete cascade,
  merchant_id text,
  business_name text,
  location_id text,
  location_name text,
  team_member_id text,
  timezone text,
  service_variation_id text,
  service_variation_version bigint,
  service_variation_name text,
  scopes text[] not null default '{}',
  connected_at timestamptz not null default now(),
  token_expiry timestamptz,
  status text not null default 'connected' check (status in ('connected', 'disconnected', 'error'))
);

alter table public.square_connections enable row level security;

drop policy if exists "Users can view own square connection" on public.square_connections;
create policy "Users can view own square connection"
  on public.square_connections for select
  using (auth.uid() = user_id);

-- Yahoo OAuth tokens (server-side only — no user RLS policies)
create table if not exists public.yahoo_tokens (
  user_id uuid primary key references auth.users (id) on delete cascade,
  access_token text not null,
  refresh_token text,
  token_uri text not null default 'https://api.login.yahoo.com/oauth2/get_token',
  client_id text not null,
  client_secret text not null,
  scopes text[] not null default '{}',
  yahoo_account text,
  expiry timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.yahoo_tokens enable row level security;

-- Yahoo connection status (visible to the account owner)
create table if not exists public.yahoo_connections (
  user_id uuid primary key references auth.users (id) on delete cascade,
  yahoo_email text,
  scopes text[] not null default '{}',
  connected_at timestamptz not null default now(),
  token_expiry timestamptz,
  status text not null default 'connected' check (status in ('connected', 'disconnected', 'error'))
);

alter table public.yahoo_connections enable row level security;

drop policy if exists "Users can view own yahoo connection" on public.yahoo_connections;
create policy "Users can view own yahoo connection"
  on public.yahoo_connections for select
  using (auth.uid() = user_id);

-- Admin dashboard: set ADMIN_EMAILS in Supabase Edge Function secrets and
-- VITE_ADMIN_EMAILS in the website .env (comma-separated admin emails).
-- The admin-data Edge Function uses the service role to read all rows.

-- Agent runtime configuration per user
create table if not exists public.agent_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  clinty_api_key_id uuid references public.api_keys (id) on delete set null,
  langgraph_api_key text,
  url text,
  graph_id text,
  openapi_key text,
  database_uri text,
  redis_uri text,
  secrets_dir text,
  calendar_provider text,
  square_access_token text,
  square_location_id text,
  square_service_variation_id text,
  square_service_variation_version bigint,
  square_team_member_id text,
  square_timezone text,
  auto_book_scheduling boolean,
  auto_respond_instruction boolean,
  auto_respond_scheduling boolean,
  environment text,
  log_level text,
  pgoptions text,
  postgres_schema text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.agent_settings enable row level security;

drop policy if exists "Users can view own agent settings" on public.agent_settings;
create policy "Users can view own agent settings"
  on public.agent_settings for select
  using (auth.uid() = user_id);

drop policy if exists "Users can create own agent settings" on public.agent_settings;
create policy "Users can create own agent settings"
  on public.agent_settings for insert
  with check (
    auth.uid() = user_id
    and (
      clinty_api_key_id is null
      or exists (
        select 1
        from public.api_keys
        where id = clinty_api_key_id
          and user_id = auth.uid()
          and revoked_at is null
      )
    )
  );

drop policy if exists "Users can update own agent settings" on public.agent_settings;
create policy "Users can update own agent settings"
  on public.agent_settings for update
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and (
      clinty_api_key_id is null
      or exists (
        select 1
        from public.api_keys
        where id = clinty_api_key_id
          and user_id = auth.uid()
          and revoked_at is null
      )
    )
  );

drop policy if exists "Users can delete own agent settings" on public.agent_settings;
create policy "Users can delete own agent settings"
  on public.agent_settings for delete
  using (auth.uid() = user_id);

drop trigger if exists agent_settings_updated_at on public.agent_settings;

create trigger agent_settings_updated_at
  before update on public.agent_settings
  for each row execute function public.set_updated_at();

create index if not exists agent_settings_clinty_api_key_id_idx
  on public.agent_settings (clinty_api_key_id);

-- Migration for existing agent_settings tables (safe to re-run)
alter table public.agent_settings drop column if exists clinty_api_key;
alter table public.agent_settings add column if not exists clinty_api_key_id uuid references public.api_keys (id) on delete set null;
alter table public.agent_settings add column if not exists auto_book_scheduling boolean;
alter table public.agent_settings add column if not exists auto_respond_instruction boolean;
alter table public.agent_settings add column if not exists auto_respond_scheduling boolean;
alter table public.agent_settings add column if not exists environment text;
alter table public.agent_settings add column if not exists log_level text;
alter table public.agent_settings add column if not exists pgoptions text;
alter table public.agent_settings add column if not exists postgres_schema text;
alter table public.square_connections add column if not exists service_variation_id text;
alter table public.square_connections add column if not exists service_variation_version bigint;
alter table public.square_connections add column if not exists service_variation_name text;
alter table public.square_connections add column if not exists team_member_id text;

-- WhatsApp Web connection status (visible to the account owner)
create table if not exists public.whatsapp_connections (
  user_id uuid primary key references auth.users (id) on delete cascade,
  phone text,
  connected_at timestamptz not null default now(),
  status text not null default 'disconnected'
    check (status in ('connected', 'disconnected', 'pairing', 'error')),
  last_error text
);

alter table public.whatsapp_connections enable row level security;

drop policy if exists "Users can view own whatsapp connection" on public.whatsapp_connections;
create policy "Users can view own whatsapp connection"
  on public.whatsapp_connections for select
  using (auth.uid() = user_id);

-- User-editable AI prompt text (background, calendar rules, message footer)
create table if not exists public.user_prompts (
  user_id uuid primary key references auth.users (id) on delete cascade,
  background text,
  calendar_preference text,
  default_footer text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_prompts enable row level security;

drop policy if exists "Users can view own prompts" on public.user_prompts;
create policy "Users can view own prompts"
  on public.user_prompts for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own prompts" on public.user_prompts;
create policy "Users can insert own prompts"
  on public.user_prompts for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own prompts" on public.user_prompts;
create policy "Users can update own prompts"
  on public.user_prompts for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop trigger if exists user_prompts_updated_at on public.user_prompts;
create trigger user_prompts_updated_at
  before update on public.user_prompts
  for each row execute function public.set_updated_at();

-- Meta Data Deletion Request callback (App Dashboard compliance)
create table if not exists public.meta_data_deletion_requests (
  id uuid primary key default gen_random_uuid(),
  confirmation_code text not null unique,
  meta_user_id text not null,
  clinty_user_id uuid references auth.users (id) on delete set null,
  status text not null check (status in ('pending', 'completed', 'no_data')),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists meta_data_deletion_requests_meta_user_id_idx
  on public.meta_data_deletion_requests (meta_user_id);

alter table public.meta_data_deletion_requests enable row level security;

-- Shopify mandatory compliance webhooks (customers/data_request, customers/redact, shop/redact)
alter table public.shopify_connections
  add column if not exists shop_id bigint;

alter table public.shopify_tokens
  add column if not exists shop_id bigint;

create table if not exists public.shopify_compliance_requests (
  id uuid primary key default gen_random_uuid(),
  confirmation_code text not null unique,
  topic text not null check (topic in ('customers/data_request', 'customers/redact', 'shop/redact')),
  shop_id bigint,
  shop_domain text not null,
  clinty_user_id uuid references auth.users (id) on delete set null,
  status text not null check (status in ('pending', 'completed', 'no_data', 'acknowledged')),
  payload jsonb,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists shopify_compliance_requests_shop_domain_idx
  on public.shopify_compliance_requests (shop_domain);

create index if not exists shopify_compliance_requests_shop_id_idx
  on public.shopify_compliance_requests (shop_id);

alter table public.shopify_compliance_requests enable row level security;
