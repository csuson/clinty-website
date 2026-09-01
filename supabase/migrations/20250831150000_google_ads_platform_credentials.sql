alter table public.google_ads_connections
  add column if not exists platform_credentials jsonb;
