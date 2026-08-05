# Architecture

## Product boundary

The application is a document-processing workbench. It lets an authenticated user:

1. upload a source document;
2. run one or more parser, OCR, or document-VLM engines;
3. compare normalized and provider-native results against the source;
4. test chunking strategies;
5. persist approved chunks to a vector database.

## Runtime structure

```text
app/
├── api/                 # authenticated server routes and provider adapters
├── login/               # Supabase Auth entry point
└── page.tsx             # workbench composition and client state

components/
├── connect/             # provider credential settings
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
```

## Persistence

- `user_api_keys`: encrypted provider credentials, scoped by authenticated email.
- `parse_results`: immutable parser run metadata plus editable result formats.
- `split_results`: chunking configuration, source metadata, and generated chunks.
- `documents` bucket: private source objects under `{auth_user_id}/`.

Application persistence uses the server-only Supabase secret client. Every API route verifies the caller with Supabase Auth and explicitly scopes database rows and object paths to that caller.

## Document processing contracts

- `lib/document-engines.ts` is the capability registry and stable engine identity source.
- Provider-native responses are preserved in `raw`.
- `lib/normalize-document.ts` converts provider output into `Document IR`.
- A SHA-256 source hash links runs created from the same document.
- OCR is modeled as a processing stage, not as a synonym for document parsing.

## Change rules

- Add schema and Storage changes as new files under `supabase/migrations/`.
- Keep credentials out of client bundles and Git-tracked environment files.
- Put feature-specific UI in its feature directory; use `components/shared` only when at least two features consume a component.
- Keep provider-specific parsing in server routes and return the shared `ParseResponse` contract.
- Do not write directly to `storage.objects`; use the Supabase Storage API.
