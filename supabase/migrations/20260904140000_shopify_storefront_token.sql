alter table public.shopify_tokens
  add column if not exists storefront_access_token text,
  add column if not exists storefront_token_type text not null default 'public';

alter table public.shopify_connections
  add column if not exists storefront_ready boolean not null default false;
