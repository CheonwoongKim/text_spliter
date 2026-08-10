-- Visual-semantic scoring of a parser candidate by a document VLM.
--
-- Deterministic document metrics compare strings, boxes, and table cells. They
-- cannot say whether a chart's values survived, whether a figure still means the
-- same thing, or whether a formula is mathematically equivalent. This records a
-- model's judgement of exactly those blocks.
--
-- It is a separate measurement layer, like the Ragas answer judge: it is stored
-- in its own table with its own contract version and is never folded into the
-- deterministic metrics of a document evaluation run. A block the judge could
-- not assess is stored as 'unavailable', which is not a zero.

create table if not exists public.document_vlm_judge_runs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  document_evaluation_run_id uuid not null
    references public.document_evaluation_runs(id) on delete cascade,
  status text not null default 'running',
  engine_type text not null,
  model text,
  contract_version text not null,
  prompt_hash text,
  metrics jsonb not null default '{}'::jsonb,
  verdicts jsonb not null default '[]'::jsonb,
  usage jsonb,
  error jsonb,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint document_vlm_judge_runs_status_check
    check (status in ('running', 'completed', 'failed')),
  constraint document_vlm_judge_runs_engine_check
    check (engine_type in ('OpenAI Vision', 'Gemini Vision', 'Claude Vision', 'Qwen Vision')),
  constraint document_vlm_judge_runs_metrics_check
    check (jsonb_typeof(metrics) = 'object'),
  constraint document_vlm_judge_runs_verdicts_check
    check (jsonb_typeof(verdicts) = 'array')
);

create index if not exists document_vlm_judge_runs_owner_created_idx
  on public.document_vlm_judge_runs (owner_id, created_at desc);
create index if not exists document_vlm_judge_runs_evaluation_idx
  on public.document_vlm_judge_runs (document_evaluation_run_id);

alter table public.document_vlm_judge_runs enable row level security;

revoke all on table public.document_vlm_judge_runs from anon, authenticated;
grant all on table public.document_vlm_judge_runs to service_role;
