create table if not exists public.parser_engine_settings (
  id uuid primary key default gen_random_uuid(),
  user_email text not null,
  parser_type text not null,
  config jsonb not null default '{}'::jsonb,
  schema_version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint parser_engine_settings_parser_type_check
    check (parser_type in ('Upstage', 'LlamaIndex', 'Azure', 'Google', 'Docling')),
  constraint parser_engine_settings_config_check
    check (jsonb_typeof(config) = 'object'),
  constraint parser_engine_settings_schema_version_check
    check (schema_version > 0),
  constraint parser_engine_settings_user_parser_unique
    unique (user_email, parser_type)
);

drop trigger if exists set_parser_engine_settings_updated_at
  on public.parser_engine_settings;
create trigger set_parser_engine_settings_updated_at
before update on public.parser_engine_settings
for each row execute function public.set_updated_at();

create index if not exists parser_engine_settings_user_email_idx
  on public.parser_engine_settings (user_email);

alter table public.parser_engine_settings enable row level security;
revoke all on table public.parser_engine_settings from anon, authenticated;
grant all on table public.parser_engine_settings to service_role;
