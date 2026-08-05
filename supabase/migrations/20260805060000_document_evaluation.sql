create table if not exists public.document_evaluation_benchmarks (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  document_hash char(64),
  file_name text not null,
  mime_type text not null,
  source_storage_key text,
  attributes jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint document_evaluation_benchmarks_name_check check (char_length(name) between 1 and 160),
  constraint document_evaluation_benchmarks_attributes_check check (jsonb_typeof(attributes) = 'object')
);

create table if not exists public.document_evaluation_ground_truths (
  id uuid primary key default gen_random_uuid(),
  benchmark_id uuid not null references public.document_evaluation_benchmarks(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  version_number integer not null default 1,
  status text not null default 'draft',
  source_parse_result_id bigint references public.parse_results(id) on delete set null,
  normalized_document jsonb not null,
  notes text,
  frozen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint document_evaluation_ground_truths_version_check check (version_number > 0),
  constraint document_evaluation_ground_truths_status_check check (status in ('draft', 'frozen', 'archived')),
  constraint document_evaluation_ground_truths_document_check check (jsonb_typeof(normalized_document) = 'object'),
  constraint document_evaluation_ground_truths_version_unique unique (benchmark_id, version_number)
);

create table if not exists public.document_evaluation_runs (
  id uuid primary key default gen_random_uuid(),
  benchmark_id uuid not null references public.document_evaluation_benchmarks(id) on delete cascade,
  ground_truth_id uuid not null references public.document_evaluation_ground_truths(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  parse_result_id bigint references public.parse_results(id) on delete set null,
  status text not null default 'completed',
  framework_version text not null,
  reference_snapshot jsonb not null,
  candidate_snapshot jsonb not null,
  candidate_metadata jsonb not null default '{}'::jsonb,
  metrics jsonb not null default '{}'::jsonb,
  issues jsonb not null default '[]'::jsonb,
  issue_count integer not null default 0,
  error jsonb,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint document_evaluation_runs_status_check check (status in ('completed', 'failed')),
  constraint document_evaluation_runs_reference_check check (jsonb_typeof(reference_snapshot) = 'object'),
  constraint document_evaluation_runs_candidate_check check (jsonb_typeof(candidate_snapshot) = 'object'),
  constraint document_evaluation_runs_metadata_check check (jsonb_typeof(candidate_metadata) = 'object'),
  constraint document_evaluation_runs_metrics_check check (jsonb_typeof(metrics) = 'object'),
  constraint document_evaluation_runs_issues_check check (jsonb_typeof(issues) = 'array'),
  constraint document_evaluation_runs_issue_count_check check (issue_count >= 0),
  constraint document_evaluation_runs_error_check check (error is null or jsonb_typeof(error) = 'object')
);

create index if not exists document_evaluation_benchmarks_owner_updated_idx
  on public.document_evaluation_benchmarks (owner_id, updated_at desc);
create index if not exists document_evaluation_benchmarks_hash_idx
  on public.document_evaluation_benchmarks (owner_id, document_hash);
create index if not exists document_evaluation_ground_truths_benchmark_version_idx
  on public.document_evaluation_ground_truths (benchmark_id, version_number desc);
create index if not exists document_evaluation_runs_benchmark_created_idx
  on public.document_evaluation_runs (benchmark_id, created_at desc);
create index if not exists document_evaluation_runs_parse_result_idx
  on public.document_evaluation_runs (parse_result_id, created_at desc);

drop trigger if exists set_document_evaluation_benchmarks_updated_at on public.document_evaluation_benchmarks;
create trigger set_document_evaluation_benchmarks_updated_at
before update on public.document_evaluation_benchmarks
for each row execute function public.set_updated_at();

drop trigger if exists set_document_evaluation_ground_truths_updated_at on public.document_evaluation_ground_truths;
create trigger set_document_evaluation_ground_truths_updated_at
before update on public.document_evaluation_ground_truths
for each row execute function public.set_updated_at();

alter table public.document_evaluation_benchmarks enable row level security;
alter table public.document_evaluation_ground_truths enable row level security;
alter table public.document_evaluation_runs enable row level security;

revoke all on table public.document_evaluation_benchmarks from anon, authenticated;
revoke all on table public.document_evaluation_ground_truths from anon, authenticated;
revoke all on table public.document_evaluation_runs from anon, authenticated;

grant all on table public.document_evaluation_benchmarks to service_role;
grant all on table public.document_evaluation_ground_truths to service_role;
grant all on table public.document_evaluation_runs to service_role;
