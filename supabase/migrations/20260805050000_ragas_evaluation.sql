create table if not exists public.evaluation_judge_batches (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  evaluation_run_id uuid not null references public.evaluation_runs(id) on delete cascade,
  name text not null,
  status text not null default 'running',
  framework text not null default 'ragas',
  framework_version text,
  evaluator_config jsonb not null default '{}'::jsonb,
  metric_config jsonb not null default '{}'::jsonb,
  case_count integer not null default 0,
  completed_count integer not null default 0,
  succeeded_count integer not null default 0,
  failed_count integer not null default 0,
  aggregate_metrics jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint evaluation_judge_batches_name_check check (char_length(name) between 1 and 160),
  constraint evaluation_judge_batches_status_check check (status in ('running', 'completed', 'failed')),
  constraint evaluation_judge_batches_framework_check check (framework = 'ragas'),
  constraint evaluation_judge_batches_evaluator_object_check check (jsonb_typeof(evaluator_config) = 'object'),
  constraint evaluation_judge_batches_metric_object_check check (jsonb_typeof(metric_config) = 'object'),
  constraint evaluation_judge_batches_aggregate_object_check check (jsonb_typeof(aggregate_metrics) = 'object'),
  constraint evaluation_judge_batches_count_check check (
    case_count >= 0
    and completed_count >= 0
    and succeeded_count >= 0
    and failed_count >= 0
    and completed_count <= case_count
    and succeeded_count + failed_count = completed_count
  )
);

create table if not exists public.evaluation_judge_case_runs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  judge_batch_id uuid not null references public.evaluation_judge_batches(id) on delete cascade,
  evaluation_case_run_id uuid not null references public.evaluation_case_runs(id) on delete cascade,
  status text not null default 'pending',
  scores jsonb not null default '{}'::jsonb,
  metric_details jsonb not null default '{}'::jsonb,
  prompt_manifest jsonb not null default '{}'::jsonb,
  usage jsonb not null default '{}'::jsonb,
  error jsonb,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint evaluation_judge_case_runs_status_check check (status in ('pending', 'running', 'succeeded', 'failed')),
  constraint evaluation_judge_case_runs_scores_object_check check (jsonb_typeof(scores) = 'object'),
  constraint evaluation_judge_case_runs_details_object_check check (jsonb_typeof(metric_details) = 'object'),
  constraint evaluation_judge_case_runs_prompts_object_check check (jsonb_typeof(prompt_manifest) = 'object'),
  constraint evaluation_judge_case_runs_usage_object_check check (jsonb_typeof(usage) = 'object'),
  constraint evaluation_judge_case_runs_error_object_check check (error is null or jsonb_typeof(error) = 'object'),
  constraint evaluation_judge_case_runs_batch_case_unique unique (judge_batch_id, evaluation_case_run_id)
);

create index if not exists evaluation_judge_batches_run_created_idx
  on public.evaluation_judge_batches (evaluation_run_id, created_at desc);
create index if not exists evaluation_judge_batches_owner_created_idx
  on public.evaluation_judge_batches (owner_id, created_at desc);
create index if not exists evaluation_judge_case_runs_batch_created_idx
  on public.evaluation_judge_case_runs (judge_batch_id, created_at);
create index if not exists evaluation_judge_case_runs_case_idx
  on public.evaluation_judge_case_runs (evaluation_case_run_id, created_at desc);

drop trigger if exists set_evaluation_judge_case_runs_updated_at on public.evaluation_judge_case_runs;
create trigger set_evaluation_judge_case_runs_updated_at
before update on public.evaluation_judge_case_runs
for each row execute function public.set_updated_at();

alter table public.evaluation_judge_batches enable row level security;
alter table public.evaluation_judge_case_runs enable row level security;

revoke all on table public.evaluation_judge_batches from anon, authenticated;
revoke all on table public.evaluation_judge_case_runs from anon, authenticated;

grant all on table public.evaluation_judge_batches to service_role;
grant all on table public.evaluation_judge_case_runs to service_role;
