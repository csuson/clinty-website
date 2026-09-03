-- Shopify mandatory compliance webhook audit + optional shop_id for shop/redact matching
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
