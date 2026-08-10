-- Allow a managed vector collection to be built with more than one embedding
-- model so retrieval quality can be compared across models.
--
-- The vector column and its HNSW index stay at 1536 dimensions: pgvector needs
-- a fixed dimension to index, and text-embedding-3-large is requested at
-- reduced dimensions instead. `vector_dimension` therefore remains 1536.
--
-- Existing rows keep 'text-embedding-3-small' through the column default, so no
-- data migration is required. Collections remain single-model by design;
-- querying a collection with a different model is rejected in the API because
-- mixed-model cosine distances are meaningless rather than merely inaccurate.

alter table public.vector_collections
  drop constraint if exists vector_collections_model_check;

alter table public.vector_collections
  add constraint vector_collections_model_check
    check (embedding_model in ('text-embedding-3-small', 'text-embedding-3-large'));
