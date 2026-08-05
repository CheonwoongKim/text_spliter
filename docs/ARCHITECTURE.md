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
├── evaluation/          # RAG golden sets plus document-reference and parser evaluation
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

services/
└── ragas-worker/        # private Python evaluator service; no browser access

supabase/migrations/     # versioned database, Storage bucket, and RLS changes
```

## Data flow

```text
Supabase Auth
    ↓
private documents bucket ──→ parser adapters ──→ normalized Document IR
                                  ↓                       ↓
                           raw provider output      comparison/evaluation
                                  ↓                       ├────→ versioned document references
                                  ↓                       │          ↓
                                  ↓                       └────→ deterministic parser evaluation runs
                                  ↓
                              parse_results ──→ split_results ──→ owned vector collection
                                                                      ↓
                                          rag_runs ← retrieval + grounded answer
                                              ↑
                 golden set versions ──→ evaluation runs ──→ human review
                                                     └─────→ Ragas worker ──→ model-judge batches
```

## Persistence

- `user_api_keys`: encrypted provider credentials, scoped by authenticated email.
- `parse_results`: immutable parser run metadata plus editable result formats.
- `split_results`: chunking configuration, source metadata, and generated chunks.
- `rag_runs`: immutable RAG configurations, retrieved evidence, answers, citations, usage, timings, and failures.
- `evaluation_datasets` / `evaluation_dataset_versions`: owned golden sets with immutable frozen versions.
- `evaluation_cases`: questions, reference answers/facts, answerability, expected evidence, tags, and rubrics.
- `evaluation_runs` / `evaluation_case_runs`: frozen pipeline runs, RAG links/snapshots, per-case outcomes, and reviewer scores.
- `evaluation_judge_batches` / `evaluation_judge_case_runs`: versioned Ragas configuration, per-metric scores and reasons, prompt manifests, usage, and failures.
- `document_evaluation_benchmarks`: owned source-document identity and benchmark attributes.
- `document_evaluation_ground_truths`: editable draft and immutable frozen Document IR reference versions.
- `document_evaluation_runs`: reference/candidate snapshots, versioned deterministic metrics, and bounded page/block issues for one parser candidate.
- `vector_collections` / `vector_documents`: owner-scoped logical collections and 1536-dimensional pgvector chunks stored in the application Supabase.
- `documents` bucket: private source objects under `{auth_user_id}/`.

Application persistence uses the server-only Supabase secret client. Every API route verifies the caller with Supabase Auth and explicitly scopes database rows and object paths to that caller.

## Document processing contracts

- `lib/document-engines.ts` is the capability registry and stable engine identity source.
- Provider-native responses are preserved in `raw`.
- `lib/normalize-document.ts` converts provider output into `Document IR`.
- A SHA-256 source hash links runs created from the same document.
- OCR is modeled as a processing stage, not as a synonym for document parsing.

## RAG execution contracts

- VDB uploads use `text-embedding-3-small` with 1536 dimensions in owner-scoped managed collections.
- Chunk metadata records stable provenance, a content hash, embedding provider/model/dimensions, and the originating parse/split run.
- One migration-managed cosine-search RPC requires both owner and collection IDs, so retrieval cannot cross users or collections.
- The answer step uses the OpenAI Responses API and a versioned grounded-answer prompt. Retrieved chunks are treated as untrusted data.
- `rag_runs` never stores provider credentials. It stores the managed collection identity, requested and resolved models, prompt version, evidence, usage, and latency.

## Evaluation contracts

- A new dataset starts with draft version 1. Cases can only be edited while their version is draft.
- Starting an evaluation run freezes the selected dataset version and snapshots every selected case before execution.
- Browser-side orchestration executes each case through the authenticated RAG API; each result is linked by `rag_run_id` and copied into the case-run snapshot for review.
- Manual correctness, faithfulness, and citation-quality scores remain separate from pass/fail decisions and future automatic metrics.
- Successful case runs calculate versioned deterministic retrieval metrics from expected evidence identifiers and retrieved chunk provenance. Evidence notes without document, page, block, or chunk identifiers remain unscored rather than becoming false failures.
- Run summaries keep macro averages, metric sample counts, and breakdowns for document type, language, difficulty, answerability, tags, parser, chunker, embedding model, and generator.
- An optional completed run from the same dataset can be selected as a baseline. Per-metric allowed drops are stored with the candidate run, and regressions are recorded without overwriting human-review results.
- Completed successful cases can be evaluated by the private Ragas 0.4 worker. The Next.js server supplies the decrypted OpenAI key through an internal bearer-authenticated request; neither that key nor the worker token is exposed to the browser.
- Ragas batches snapshot evaluator and embedding models, metric contract/framework versions, prompt hashes/content, per-metric reasons, and token usage. Missing reference answers make reference-dependent metrics unavailable rather than zero.
- Deterministic retrieval metrics, Ragas model-judge metrics, and human scores are stored and displayed as separate measurement layers.
- Frozen versions are never edited in place. The next version clones the golden cases into a new draft.
- Document evaluation follows the same immutability rule but remains independent of RAG evaluation. A frozen Document IR reference is compared only with successful parser runs that share its source-document hash.
- `document-ir-eval-v1` reports text precision/recall/F1, block precision/recall/F1 and type accuracy, pairwise reading order, bounding-box IoU, table cell/structure fidelity, figure/caption recall, provenance completeness, and page accuracy without collapsing them into a composite score.
- Document evaluation runs snapshot both IR documents so later parser-result edits or reference versions cannot rewrite historical measurements. Large snapshots and issue lists are fetched only for the selected run.

## Change rules

- Add schema and Storage changes as new files under `supabase/migrations/`.
- Keep credentials out of client bundles and Git-tracked environment files.
- Put feature-specific UI in its feature directory; use `components/shared` only when at least two features consume a component.
- Keep provider-specific parsing in server routes and return the shared `ParseResponse` contract.
- Do not write directly to `storage.objects`; use the Supabase Storage API.
