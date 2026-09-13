-- Per-user WhatsApp Web gateway infrastructure (admin-editable)
alter table public.whatsapp_connections
  add column if not exists gateway_debug text,
  add column if not exists gateway_auth_backend text,
  add column if not exists gateway_auth_bucket text,
  add column if not exists gateway_auth_storage_prefix text,
  add column if not exists gateway_auth_dir text;
