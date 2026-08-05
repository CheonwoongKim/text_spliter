alter table public.document_evaluation_benchmarks
  drop constraint if exists document_evaluation_benchmarks_hash_check;

-- NOT VALID preserves legacy rows with a missing hash while enforcing the
-- invariant for every new or updated benchmark.
alter table public.document_evaluation_benchmarks
  add constraint document_evaluation_benchmarks_hash_check
  check (document_hash is not null and document_hash ~ '^[a-f0-9]{64}$') not valid;

create or replace function public.clone_document_evaluation_ground_truth(
  p_owner_id uuid,
  p_source_id uuid,
  p_notes text default null
)
returns setof public.document_evaluation_ground_truths
language plpgsql
security invoker
set search_path = public
as $$
declare
  source_reference public.document_evaluation_ground_truths%rowtype;
  draft_reference public.document_evaluation_ground_truths%rowtype;
  next_version integer;
begin
  select *
    into source_reference
    from public.document_evaluation_ground_truths
   where id = p_source_id
     and owner_id = p_owner_id;

  if not found then
    raise exception 'Document reference not found.' using errcode = 'P0002';
  end if;

  if source_reference.status <> 'frozen' then
    raise exception 'Only frozen document references can be cloned.' using errcode = '55000';
  end if;

  -- Serialize version allocation per benchmark. Concurrent requests return the
  -- same existing draft instead of creating duplicate draft versions.
  perform pg_advisory_xact_lock(hashtextextended(source_reference.benchmark_id::text, 0));

  select *
    into draft_reference
    from public.document_evaluation_ground_truths
   where benchmark_id = source_reference.benchmark_id
     and owner_id = p_owner_id
     and status = 'draft'
   order by version_number desc
   limit 1;

  if found then
    return next draft_reference;
    return;
  end if;

  select coalesce(max(version_number), 0) + 1
    into next_version
    from public.document_evaluation_ground_truths
   where benchmark_id = source_reference.benchmark_id
     and owner_id = p_owner_id;

  insert into public.document_evaluation_ground_truths (
    benchmark_id,
    owner_id,
    version_number,
    status,
    source_parse_result_id,
    normalized_document,
    notes
  ) values (
    source_reference.benchmark_id,
    p_owner_id,
    next_version,
    'draft',
    source_reference.source_parse_result_id,
    source_reference.normalized_document,
    coalesce(nullif(btrim(p_notes), ''), format('Cloned from v%s', source_reference.version_number))
  )
  returning * into draft_reference;

  return next draft_reference;
end;
$$;

revoke all on function public.clone_document_evaluation_ground_truth(uuid, uuid, text)
  from public, anon, authenticated;
grant execute on function public.clone_document_evaluation_ground_truth(uuid, uuid, text)
  to service_role;
