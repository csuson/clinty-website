-- Dual booking-recovery gateways + shared Apps Script Web App connect settings.
-- Square/Wix → booking_recovery_gateway_url (full gateway).
-- Apps Script POSTs → booking_recovery_google_gateway_url (falls back to full URL if empty).
-- Operators connect Google Calendar via Apps Script Web App URL + connect secret.

alter table public.website_infrastructure
  add column if not exists booking_recovery_google_gateway_url text not null default '',
  add column if not exists booking_recovery_apps_script_web_app_url text not null default '',
  add column if not exists booking_recovery_apps_script_connect_secret text not null default '';

comment on column public.website_infrastructure.booking_recovery_gateway_url is
  'Full booking-recovery-gateway base URL (Square /v1/square, Wix /v1/wix).';

comment on column public.website_infrastructure.booking_recovery_google_gateway_url is
  'Google-only gateway base URL for Apps Script POSTs (/v1/google/{token}). Empty → use booking_recovery_gateway_url.';

comment on column public.website_infrastructure.booking_recovery_apps_script_web_app_url is
  'Deployed Apps Script Web App /exec URL for multi-tenant Google Calendar connect.';

comment on column public.website_infrastructure.booking_recovery_apps_script_connect_secret is
  'BRIDGE_CONNECT_SECRET for Apps Script connect/status/disconnect query param s.';
