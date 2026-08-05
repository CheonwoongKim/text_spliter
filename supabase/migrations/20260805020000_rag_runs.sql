create table if not exists public.rag_runs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  user_email text,
  question text not null,
  status text not null default 'running',
  pipeline_config jsonb not null,
  retrieved_contexts jsonb,
  answer text,
  citations jsonb,
  usage jsonb,
  timings jsonb,
  provider_response_id text,
  error jsonb,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint rag_runs_status_check check (
    status in ('running', 'succeeded', 'failed')
  )
);

create index if not exists rag_runs_owner_created_idx
  on public.rag_runs (owner_id, created_at desc);
create index if not exists rag_runs_status_idx
  on public.rag_runs (status);

alter table public.rag_runs enable row level security;

revoke all on table public.rag_runs from anon, authenticated;
grant all on table public.rag_runs to service_role;
