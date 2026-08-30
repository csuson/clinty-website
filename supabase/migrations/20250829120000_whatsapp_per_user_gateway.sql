-- Per-user WhatsApp Web gateway (URL + API key stored server-side for edge functions)
alter table public.whatsapp_connections
  add column if not exists gateway_url text,
  add column if not exists gateway_api_key text;
