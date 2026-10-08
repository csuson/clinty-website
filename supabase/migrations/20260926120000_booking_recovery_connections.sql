-- Booking recovery gateway: per-operator routing + shared gateway base URL.

create table if not exists public.booking_recovery_connections (
  user_id uuid primary key references auth.users (id) on delete cascade,
  langgraph_url text not null default '',
  langgraph_api_key text,
  square_merchant_id text,
  webhook_token text,
  webhook_secret text,
  enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

create unique index if not exists booking_recovery_connections_square_merchant_id_uidx
  on public.booking_recovery_connections (square_merchant_id)
  where square_merchant_id is not null and btrim(square_merchant_id) <> '';

create unique index if not exists booking_recovery_connections_webhook_token_uidx
  on public.booking_recovery_connections (webhook_token)
  where webhook_token is not null and btrim(webhook_token) <> '';

comment on table public.booking_recovery_connections is
  'Maps Square merchant_id / Google Apps Script webhook_token to an email-assistant URL.';

alter table public.booking_recovery_connections enable row level security;

drop policy if exists "Users can view own booking recovery connection"
  on public.booking_recovery_connections;
create policy "Users can view own booking recovery connection"
  on public.booking_recovery_connections for select
  using (auth.uid() = user_id);

drop trigger if exists booking_recovery_connections_updated_at on public.booking_recovery_connections;
create trigger booking_recovery_connections_updated_at
  before update on public.booking_recovery_connections
  for each row execute function public.set_updated_at();

alter table public.website_infrastructure
  add column if not exists booking_recovery_gateway_url text not null default '';
