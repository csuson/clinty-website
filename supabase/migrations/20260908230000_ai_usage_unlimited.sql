-- Allow -1 as unlimited monthly AI token limit

alter table public.platform_ai_settings
  drop constraint if exists platform_ai_settings_monthly_token_limit_check;

alter table public.platform_ai_settings
  add constraint platform_ai_settings_monthly_token_limit_check
  check (monthly_token_limit = -1 or monthly_token_limit > 0);

alter table public.profiles
  drop constraint if exists profiles_ai_monthly_token_limit_check;

alter table public.profiles
  add constraint profiles_ai_monthly_token_limit_check
  check (ai_monthly_token_limit is null or ai_monthly_token_limit = -1 or ai_monthly_token_limit > 0);
