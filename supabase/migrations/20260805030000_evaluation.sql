create table if not exists public.evaluation_datasets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint evaluation_datasets_name_check check (char_length(name) between 1 and 120)
);

create table if not exists public.evaluation_dataset_versions (
  id uuid primary key default gen_random_uuid(),
  dataset_id uuid not null references public.evaluation_datasets(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  version_number integer not null,
  status text not null default 'draft',
  change_note text,
  frozen_at timestamptz,
  created_at timestamptz not null default now(),
  constraint evaluation_dataset_versions_number_check check (version_number > 0),
  constraint evaluation_dataset_versions_status_check check (status in ('draft', 'frozen', 'archived')),
  constraint evaluation_dataset_versions_unique unique (dataset_id, version_number)
);

create table if not exists public.evaluation_cases (
  id uuid primary key default gen_random_uuid(),
  dataset_version_id uuid not null references public.evaluation_dataset_versions(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  case_key text not null,
  question text not null,
  reference_answer text,
  reference_facts jsonb not null default '[]'::jsonb,
  expected_evidence jsonb not null default '[]'::jsonb,
  answerable boolean not null default true,
  tags text[] not null default '{}'::text[],
  language text,
  difficulty text not null default 'medium',
  rubric jsonb not null default '{}'::jsonb,
  notes text,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint evaluation_cases_key_check check (char_length(case_key) between 1 and 120),
  constraint evaluation_cases_question_check check (char_length(question) between 1 and 8000),
  constraint evaluation_cases_facts_array_check check (jsonb_typeof(reference_facts) = 'array'),
  constraint evaluation_cases_evidence_array_check check (jsonb_typeof(expected_evidence) = 'array'),
  constraint evaluation_cases_rubric_object_check check (jsonb_typeof(rubric) = 'object'),
  constraint evaluation_cases_difficulty_check check (difficulty in ('easy', 'medium', 'hard')),
  constraint evaluation_cases_version_key_unique unique (dataset_version_id, case_key)
);

create table if not exists public.evaluation_runs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  dataset_version_id uuid not null references public.evaluation_dataset_versions(id) on delete cascade,
  name text not null,
  status text not null default 'running',
  pipeline_config jsonb not null,
  case_count integer not null default 0,
  completed_count integer not null default 0,
  succeeded_count integer not null default 0,
  failed_count integer not null default 0,
  aggregate_metrics jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint evaluation_runs_name_check check (char_length(name) between 1 and 160),
  constraint evaluation_runs_status_check check (status in ('running', 'completed', 'failed')),
  constraint evaluation_runs_count_check check (
    case_count >= 0 and completed_count >= 0 and succeeded_count >= 0 and failed_count >= 0
  )
);

create table if not exists public.evaluation_case_runs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  evaluation_run_id uuid not null references public.evaluation_runs(id) on delete cascade,
  evaluation_case_id uuid not null references public.evaluation_cases(id) on delete cascade,
  rag_run_id uuid references public.rag_runs(id) on delete set null,
  status text not null default 'pending',
  question_snapshot text not null,
  reference_answer_snapshot text,
  reference_facts_snapshot jsonb not null default '[]'::jsonb,
  expected_evidence_snapshot jsonb not null default '[]'::jsonb,
  rubric_snapshot jsonb not null default '{}'::jsonb,
  actual_answer text,
  retrieved_contexts jsonb,
  citations jsonb,
  rag_usage jsonb,
  rag_timings jsonb,
  rag_pipeline_config jsonb,
  error jsonb,
  manual_score jsonb not null default '{}'::jsonb,
  reviewer_decision text not null default 'pending',
  reviewer_notes text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint evaluation_case_runs_status_check check (status in ('pending', 'running', 'succeeded', 'failed')),
  constraint evaluation_case_runs_decision_check check (reviewer_decision in ('pending', 'pass', 'fail')),
  constraint evaluation_case_runs_run_case_unique unique (evaluation_run_id, evaluation_case_id)
);

create index if not exists evaluation_datasets_owner_updated_idx
  on public.evaluation_datasets (owner_id, updated_at desc);
create index if not exists evaluation_versions_dataset_number_idx
  on public.evaluation_dataset_versions (dataset_id, version_number desc);
create index if not exists evaluation_cases_version_position_idx
  on public.evaluation_cases (dataset_version_id, position, created_at);
create index if not exists evaluation_runs_owner_created_idx
  on public.evaluation_runs (owner_id, created_at desc);
create index if not exists evaluation_case_runs_run_idx
  on public.evaluation_case_runs (evaluation_run_id, created_at);

drop trigger if exists set_evaluation_datasets_updated_at on public.evaluation_datasets;
create trigger set_evaluation_datasets_updated_at
before update on public.evaluation_datasets
for each row execute function public.set_updated_at();

drop trigger if exists set_evaluation_cases_updated_at on public.evaluation_cases;
create trigger set_evaluation_cases_updated_at
before update on public.evaluation_cases
for each row execute function public.set_updated_at();

drop trigger if exists set_evaluation_case_runs_updated_at on public.evaluation_case_runs;
create trigger set_evaluation_case_runs_updated_at
before update on public.evaluation_case_runs
for each row execute function public.set_updated_at();

alter table public.evaluation_datasets enable row level security;
alter table public.evaluation_dataset_versions enable row level security;
alter table public.evaluation_cases enable row level security;
alter table public.evaluation_runs enable row level security;
alter table public.evaluation_case_runs enable row level security;

revoke all on table public.evaluation_datasets from anon, authenticated;
revoke all on table public.evaluation_dataset_versions from anon, authenticated;
revoke all on table public.evaluation_cases from anon, authenticated;
revoke all on table public.evaluation_runs from anon, authenticated;
revoke all on table public.evaluation_case_runs from anon, authenticated;

grant all on table public.evaluation_datasets to service_role;
grant all on table public.evaluation_dataset_versions to service_role;
grant all on table public.evaluation_cases to service_role;
grant all on table public.evaluation_runs to service_role;
grant all on table public.evaluation_case_runs to service_role;
