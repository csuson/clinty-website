-- W2/W4: Wix Bookings cancel recovery routing keys on booking_recovery_connections.

alter table public.booking_recovery_connections
  add column if not exists wix_instance_id text,
  add column if not exists wix_site_id text;

create unique index if not exists booking_recovery_connections_wix_instance_id_uidx
  on public.booking_recovery_connections (wix_instance_id)
  where wix_instance_id is not null and btrim(wix_instance_id) <> '';

create unique index if not exists booking_recovery_connections_wix_site_id_uidx
  on public.booking_recovery_connections (wix_site_id)
  where wix_site_id is not null and btrim(wix_site_id) <> '';

comment on column public.booking_recovery_connections.wix_instance_id is
  'Wix app instanceId used to route POST /v1/wix (preferred).';

comment on column public.booking_recovery_connections.wix_site_id is
  'Wix site ID fallback routing key for POST /v1/wix.';
