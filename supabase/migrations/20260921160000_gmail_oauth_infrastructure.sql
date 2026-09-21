-- Site-wide Google OAuth client (Gmail Integrations). Admin-editable; Edge Function secrets remain fallback.
alter table public.website_infrastructure
  add column if not exists google_client_id text not null default '',
  add column if not exists google_client_secret text not null default '';
