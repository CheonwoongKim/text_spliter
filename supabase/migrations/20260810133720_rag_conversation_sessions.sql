-- Group RAG runs into conversations so multi-turn retrieval can be measured.
--
-- A single-turn question is answerable from the question alone. A follow-up
-- ("what about the second one?") is not: it depends on prior turns. Without a
-- session identity the workbench cannot tell whether a retrieval failure came
-- from the index, the chunking, or the missing conversational context.
--
-- Both columns are nullable so every existing single-turn run stays valid and
-- unchanged; a run with no session is simply a conversation of length one.
--
-- This records and measures conversation state only. It does not enable a
-- memory provider, persist extracted user memories, or let stored memory act as
-- document evidence, all of which remain separately approved changes.

alter table public.rag_runs
  add column if not exists session_id uuid,
  add column if not exists turn_index integer;

alter table public.rag_runs
  drop constraint if exists rag_runs_turn_index_check;

alter table public.rag_runs
  add constraint rag_runs_turn_index_check
    check (turn_index is null or turn_index >= 0);

-- A turn number is only meaningful inside a session.
alter table public.rag_runs
  drop constraint if exists rag_runs_session_turn_check;

alter table public.rag_runs
  add constraint rag_runs_session_turn_check
    check ((session_id is null) = (turn_index is null));

create index if not exists rag_runs_session_turn_idx
  on public.rag_runs (owner_id, session_id, turn_index);
