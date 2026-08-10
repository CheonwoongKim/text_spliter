-- Allow a managed collection to store embeddings at a dimension other than
-- 1536, so `text-embedding-3-large` can be evaluated at its native 3072
-- dimensions instead of only in reduced form.
--
-- pgvector caps an HNSW index at 2000 dimensions, so a 3072-dimension column
-- cannot be indexed that way. Rather than silently degrade recall, 3072 uses
-- exact (sequential) cosine search: for an evaluation workbench that is the more
-- defensible trade-off, because exact search has no approximate-recall loss to
-- confound a measurement. It is slower on large collections, and that cost is
-- stated in the UI.
--
-- A row stores exactly one embedding column, chosen by its collection's
-- dimension. Existing rows keep using `embedding`, so no data is rewritten.

alter table public.vector_documents
  add column if not exists embedding_3072 extensions.vector(3072);

-- A row now populates exactly one embedding column, so the original column can
-- no longer be required.
alter table public.vector_documents
  alter column embedding drop not null;

alter table public.vector_documents
  drop constraint if exists vector_documents_single_embedding_check;

alter table public.vector_documents
  add constraint vector_documents_single_embedding_check
    check (num_nonnulls(embedding, embedding_3072) = 1);

alter table public.vector_collections
  drop constraint if exists vector_collections_dimension_check;

alter table public.vector_collections
  add constraint vector_collections_dimension_check
    check (vector_dimension in (1536, 3072));

-- Dimension-aware search. Each branch compares against one fixed-width column so
-- the 1536 branch keeps using its HNSW index.
create or replace function public.match_vector_documents_v2(
  p_owner_id uuid,
  p_collection_id uuid,
  p_query_embedding extensions.vector,
  p_dimension integer,
  p_match_count integer default 5
)
returns table (
  id bigint,
  content text,
  metadata jsonb,
  similarity double precision
)
language plpgsql
stable
security invoker
set search_path = public, extensions
as $$
declare
  v_limit integer := least(greatest(coalesce(p_match_count, 5), 1), 20);
begin
  if p_dimension = 1536 then
    return query
      select
        documents.id,
        documents.content,
        documents.metadata,
        1 - (documents.embedding <=> p_query_embedding::extensions.vector(1536)) as similarity
      from public.vector_documents as documents
      where documents.owner_id = p_owner_id
        and documents.collection_id = p_collection_id
        and documents.embedding is not null
      order by documents.embedding <=> p_query_embedding::extensions.vector(1536)
      limit v_limit;
  elsif p_dimension = 3072 then
    return query
      select
        documents.id,
        documents.content,
        documents.metadata,
        1 - (documents.embedding_3072 <=> p_query_embedding::extensions.vector(3072)) as similarity
      from public.vector_documents as documents
      where documents.owner_id = p_owner_id
        and documents.collection_id = p_collection_id
        and documents.embedding_3072 is not null
      order by documents.embedding_3072 <=> p_query_embedding::extensions.vector(3072)
      limit v_limit;
  else
    raise exception 'Unsupported embedding dimension: %', p_dimension;
  end if;
end;
$$;

revoke all on function public.match_vector_documents_v2(uuid, uuid, extensions.vector, integer, integer)
  from public, anon, authenticated;
grant execute on function public.match_vector_documents_v2(uuid, uuid, extensions.vector, integer, integer)
  to service_role;

-- Report the dimension so the collection browser can label a collection without
-- reading a row.
create or replace function public.list_vector_collections(p_owner_id uuid)
returns table (
  id uuid,
  name text,
  embedding_model text,
  vector_dimension integer,
  row_count bigint,
  created_at timestamptz,
  updated_at timestamptz
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    collections.id,
    collections.name,
    collections.embedding_model,
    collections.vector_dimension,
    count(documents.id) as row_count,
    collections.created_at,
    collections.updated_at
  from public.vector_collections as collections
  left join public.vector_documents as documents
    on documents.collection_id = collections.id
  where collections.owner_id = p_owner_id
  group by collections.id
  order by collections.updated_at desc;
$$;

revoke all on function public.list_vector_collections(uuid)
  from public, anon, authenticated;
grant execute on function public.list_vector_collections(uuid)
  to service_role;
