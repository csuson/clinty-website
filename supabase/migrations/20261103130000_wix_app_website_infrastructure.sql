-- Shared Clinty Wix Studio Custom App credentials for booking recovery + OAuth calendar.
-- One app serves all tenants: Booking Canceled → gateway /v1/wix; install yields per-site instance_id.

alter table public.website_infrastructure
  add column if not exists wix_app_id text not null default '',
  add column if not exists wix_app_secret text not null default '',
  add column if not exists wix_webhook_public_key text not null default '',
  add column if not exists wix_app_install_url text not null default '';

comment on column public.website_infrastructure.wix_app_id is
  'Clinty Wix Studio Custom App ID (Develop → OAuth). Shared across tenants.';

comment on column public.website_infrastructure.wix_app_secret is
  'Clinty Wix Studio Custom App Secret Key. Shared; never expose to browsers.';

comment on column public.website_infrastructure.wix_webhook_public_key is
  'Wix Webhooks → Get Public Key (JWT). Copy to booking-recovery-gateway WIX_WEBHOOK_PUBLIC_KEY.';

comment on column public.website_infrastructure.wix_app_install_url is
  'Optional override for the Wix installer URL. Empty → https://www.wix.com/installer/install?appId=…';
