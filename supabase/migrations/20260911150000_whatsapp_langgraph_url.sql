alter table public.whatsapp_connections
  add column if not exists gateway_langgraph_url text;

alter table public.website_infrastructure
  add column if not exists whatsapp_web_langgraph_url text not null default '';
