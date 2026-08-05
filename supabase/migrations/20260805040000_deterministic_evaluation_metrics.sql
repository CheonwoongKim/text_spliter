alter table public.evaluation_runs
  add column if not exists baseline_run_id uuid references public.evaluation_runs(id) on delete set null,
  add column if not exists regression_thresholds jsonb not null default '{}'::jsonb;

alter table public.evaluation_case_runs
  add column if not exists deterministic_metrics jsonb not null default '{}'::jsonb,
  add column if not exists case_attributes_snapshot jsonb not null default '{}'::jsonb;

alter table public.evaluation_runs
  drop constraint if exists evaluation_runs_regression_thresholds_object_check;
alter table public.evaluation_runs
  add constraint evaluation_runs_regression_thresholds_object_check
  check (jsonb_typeof(regression_thresholds) = 'object');

alter table public.evaluation_case_runs
  drop constraint if exists evaluation_case_runs_deterministic_metrics_object_check;
alter table public.evaluation_case_runs
  add constraint evaluation_case_runs_deterministic_metrics_object_check
  check (jsonb_typeof(deterministic_metrics) = 'object');

alter table public.evaluation_case_runs
  drop constraint if exists evaluation_case_runs_case_attributes_object_check;
alter table public.evaluation_case_runs
  add constraint evaluation_case_runs_case_attributes_object_check
  check (jsonb_typeof(case_attributes_snapshot) = 'object');

create index if not exists evaluation_runs_baseline_idx
  on public.evaluation_runs (baseline_run_id)
  where baseline_run_id is not null;
