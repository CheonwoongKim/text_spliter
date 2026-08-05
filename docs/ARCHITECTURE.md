# Architecture

## Product boundary

The application is a document-processing workbench. It lets an authenticated user:

1. upload a source document;
2. run one or more parser, OCR, or document-VLM engines;
3. compare normalized and provider-native results against the source;
4. test chunking strategies;
5. persist approved chunks to a vector database;
6. run grounded retrieval tests with reproducible execution traces.

## Runtime structure

```text
app/
├── api/                 # authenticated server routes and provider adapters
├── login/               # Supabase Auth entry point
└── page.tsx             # workbench composition and client state

components/
├── connect/             # provider credential settings
├── evaluation/          # golden sets, batch runs, evidence review, and manual scores
├── layout/              # application shell and auth boundary
├── parser/              # document parsing and comparison UI
├── shared/              # cross-feature UI primitives
├── splitter/            # chunking configuration and result UI
├── storage/             # source files and persisted run results
└── vectorstore/         # vector database inspection and upload UI

lib/
├── document-*           # engine registry, normalized IR, and source storage
├── normalize-document   # provider response normalization
├── supabase-*           # browser and server Supabase clients
├── auth*                # browser and server authentication helpers
├── api-key-store        # encrypted provider credential access
├── splitters            # chunking implementations
└── types                # shared application contracts

supabase/migrations/     # versioned database, Storage bucket, and RLS changes
```

## Data flow

```text
Supabase Auth
    ↓
private documents bucket ──→ parser adapters ──→ normalized Document IR
                                  ↓                       ↓
                           raw provider output      comparison/evaluation
                                  ↓                       ↓
                              parse_results ──→ split_results ──→ target VDB
                                                                      ↓
                                          rag_runs ← retrieval + grounded answer
                                              ↑
                 golden set versions ──→ evaluation runs ──→ human review
```

## Persistence

- `user_api_keys`: encrypted provider credentials, scoped by authenticated email.
- `parse_results`: immutable parser run metadata plus editable result formats.
- `split_results`: chunking configuration, source metadata, and generated chunks.
- `rag_runs`: immutable RAG configurations, retrieved evidence, answers, citations, usage, timings, and failures.
- `evaluation_datasets` / `evaluation_dataset_versions`: owned golden sets with immutable frozen versions.
- `evaluation_cases`: questions, reference answers/facts, answerability, expected evidence, tags, and rubrics.
- `evaluation_runs` / `evaluation_case_runs`: frozen pipeline runs, RAG links/snapshots, per-case outcomes, and reviewer scores.
- `documents` bucket: private source objects under `{auth_user_id}/`.

Application persistence uses the server-only Supabase secret client. Every API route verifies the caller with Supabase Auth and explicitly scopes database rows and object paths to that caller.

## Document processing contracts

- `lib/document-engines.ts` is the capability registry and stable engine identity source.
- Provider-native responses are preserved in `raw`.
- `lib/normalize-document.ts` converts provider output into `Document IR`.
- A SHA-256 source hash links runs created from the same document.
- OCR is modeled as a processing stage, not as a synonym for document parsing.

## RAG execution contracts

- New VDB uploads use `text-embedding-3-small` with an explicit 1536 dimensions; legacy ada-002 tables remain selectable for comparison.
- Chunk metadata records stable provenance, a content hash, embedding provider/model/dimensions, and the originating parse/split run.
- Each target vector table has a table-specific cosine-search function. It executes with the target database caller's permissions.
- The answer step uses the OpenAI Responses API and a versioned grounded-answer prompt. Retrieved chunks are treated as untrusted data.
- `rag_runs` never stores provider credentials. It stores the target host, requested and resolved models, prompt version, evidence, usage, and latency.

## Evaluation contracts

- A new dataset starts with draft version 1. Cases can only be edited while their version is draft.
- Starting an evaluation run freezes the selected dataset version and snapshots every selected case before execution.
- Browser-side orchestration executes each case through the authenticated RAG API; each result is linked by `rag_run_id` and copied into the case-run snapshot for review.
- Manual correctness, faithfulness, and citation-quality scores remain separate from pass/fail decisions and future automatic metrics.
- Successful case runs calculate versioned deterministic retrieval metrics from expected evidence identifiers and retrieved chunk provenance. Evidence notes without document, page, block, or chunk identifiers remain unscored rather than becoming false failures.
- Run summaries keep macro averages, metric sample counts, and breakdowns for document type, language, difficulty, answerability, tags, parser, chunker, embedding model, and generator.
- An optional completed run from the same dataset can be selected as a baseline. Per-metric allowed drops are stored with the candidate run, and regressions are recorded without overwriting human-review results.
- Frozen versions are never edited in place. The next version clones the golden cases into a new draft.

## Change rules

- Add schema and Storage changes as new files under `supabase/migrations/`.
- Keep credentials out of client bundles and Git-tracked environment files.
- Put feature-specific UI in its feature directory; use `components/shared` only when at least two features consume a component.
- Keep provider-specific parsing in server routes and return the shared `ParseResponse` contract.
- Do not write directly to `storage.objects`; use the Supabase Storage API.
