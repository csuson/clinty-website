alter table public.shopify_tokens
  alter column access_token drop not null,
  alter column client_id drop not null;
