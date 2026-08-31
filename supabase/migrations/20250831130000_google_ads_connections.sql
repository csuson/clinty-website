-- Per-user Google Ads campaign AI API URL
create table if not exists public.google_ads_connections (
  user_id uuid primary key references auth.users (id) on delete cascade,
  ad_campaign_api_url text,
  status text not null default 'disconnected'
    check (status in ('connected', 'disconnected', 'error')),
  connected_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.google_ads_connections enable row level security;

drop policy if exists "Users can view own google ads connection" on public.google_ads_connections;
create policy "Users can view own google ads connection"
  on public.google_ads_connections for select
  using (auth.uid() = user_id);
