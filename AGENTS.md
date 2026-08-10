# Repository Guide

## Overview

This repository is an authenticated document-processing and evaluation workbench built with Next.js 16, React 19, strict TypeScript, Tailwind CSS, and Supabase. It supports multi-engine parser/Vision experiments, focused and full-result comparison, text splitting, managed pgvector collections, grounded RAG runs, and human/deterministic/model-judge evaluation. A private Python/FastAPI worker under `services/ragas-worker` runs Ragas model evaluations.

The Memory Guide is currently educational UI only. It explains memory architectures and providers but does not enable conversational memory, persist memory records, or call an external memory service.

## Project Layout

- `app/`: App Router shell, public authentication pages, and authenticated API routes. `app/page.tsx` composes the signed-in workspace.
- `components/parser/`: Engine selection, multi-run overview, full comparison, focus review, and JSON/Markdown/HTML result presentation.
- `components/guides/`: Static product guides. `MemoryGuidePanel.tsx` is the current memory-architecture reference.
- `components/{splitter,storage,vectorstore,evaluation}/`: Feature UI for the rest of the document workflow.
- `components/{layout,settings,account,auth}/`: Application shell, configuration, account, and public authentication UI.
- `components/shared/`: Reusable primitives consumed by more than one feature.
- `lib/`: Shared contracts, server integrations, authentication, persistence, parsing, retrieval, comparison, and evaluation logic.
- `styles/design-tokens.css` and `tailwind.config.ts`: The single-light-theme design system and strict Tailwind adapter.
- `services/ragas-worker/`: Python 3.11+ FastAPI worker and pytest suite.
- `supabase/migrations/`: Versioned database, Storage, pgvector, RPC, and RLS changes.
- `tests/`: Node/TypeScript unit tests.
- `docs/ARCHITECTURE.md`: Runtime structure, data flow, persistence, and domain invariants.

## Common Commands

```bash
npm install              # install Node dependencies
npm run dev              # run Next.js with the current environment
npm run dev:supabase     # run Next.js with linked Supabase credentials
npm run ragas:setup      # create/install the Python worker environment
npm run check:design     # enforce product design tokens and allowed scales
npm run lint             # ESLint, with zero warnings allowed
npm run typecheck        # strict TypeScript checks
npm run test:unit        # TypeScript unit tests
npm run ragas:test       # Python worker tests
npm run build            # production Next.js build
npm run verify           # design check + lint + typecheck + unit tests + build
```

Use Node.js 20.9 or newer. The Ragas worker supports Python 3.11 through 3.13.

## Product and Architecture Invariants

### Application shell and navigation

- The authenticated workbench is a stateful panel shell rather than one URL per dashboard menu. Add menu IDs, labels, sections, and breadcrumbs through `lib/navigation.ts`, render the panel in `app/page.tsx`, and map its icon in `components/layout/Sidebar.tsx`.
- The sidebar reads top to bottom as the pipeline: document, parse, chunk, index, ask. Measurement and saved artifacts sit in their own sections so an archive is never read as the next step. Menu labels are Korean and short enough for the narrow rail.
- Answer evaluation and parser evaluation are separate menus, not tabs of one screen: they take different inputs, produce different metrics, and are never summed.
- A renamed menu ID keeps an entry in `RENAMED_MENUS` so a returning user's stored value still resolves.
- `/login` and `/signup` remain distinct public routes protected by `AuthGuard`; dashboard panels remain behind Supabase Auth.
- Persisted menu values pass through `normalizeAppMenu`. Unknown or removed values must fall back safely to Parser.

### Parser experiments and comparison

- A parser experiment has exactly one primary engine and zero or more unique additional engines. The primary runs first; selected engines execute sequentially to avoid provider rate spikes and retain partial successes.
- Never execute the same engine twice in one experiment. Preserve a stable run identity even for legacy results without a stored run ID.
- Preserve provider-native output in `raw` and normalize new successful runs to the shared Document IR. Do not discard text, Markdown, HTML, JSON, page, table, figure, or provenance data merely to simplify the UI.
- Multi-engine evaluation is the product goal. The result UI must expose every completed engine, not silently collapse to the primary result.
- `ParserResultsOverview` is the entry point for per-engine detail, full comparison, and focus review. `ParserFocusWorkbench` identifies high-risk source regions and groups materially different outputs; it does not claim an automatic winner.
- JSON and Markdown must use their dedicated viewers. HTML output is supported and must remain accessible in the result format tabs.
- Comparison work is bounded. Keep the block-pair budget and validation limits in `lib/parser-focus-analysis.ts` so large documents cannot trigger unbounded pairwise work.

### RAG and evaluation

- Managed vector data is owner-scoped and uses the application Supabase pgvector schema. Retrieval must never cross users or collections.
- A collection records the embedding model it was built with, and both upload and retrieval derive the model from the collection rather than from the request. Mixing models does not fail; it returns cosine distances that are meaningless, so the mismatch is rejected instead.
- An embedding option is a (model, dimensions) pair, because the same model at a different width produces vectors that are not comparable. Each supported width has its own pgvector column and is routed by `match_vector_documents_v2`; adding a width requires a new column and a new branch in that function.
- pgvector caps an HNSW index at 2000 dimensions. A wider width is searched exactly rather than approximately, so a measurement is never confounded by approximate-recall loss. State that cost in the UI instead of hiding it.
- Chunks record the pages and blocks they cover. Retrieval metrics match expected evidence against that provenance, so a chunk with an unverifiable position reports no provenance rather than a guessed one.
- Cost is estimated per run from stored usage and a versioned rate table. An unknown model or missing usage reports an unknown cost, never zero.
- Grounded answers distinguish retrieved document evidence from model output and preserve citations and execution traces in `rag_runs`.
- Frozen evaluation dataset versions, ground-truth versions, run snapshots, and execution traces are immutable.
- Deterministic retrieval metrics, document-IR metrics, Ragas model-judge metrics, and human review are separate measurement layers. Do not collapse them into a single unexplained score.
- The Ragas worker is private server-to-server infrastructure. Browser code must never receive its token or decrypted provider credentials.

### Memory Guide boundary

- `components/guides/MemoryGuidePanel.tsx` is an informational comparison of memory types, implementation methods, and the provider approaches introduced by Honcho, OpenViking, Mem0, Hindsight, Holographic, RetainDB, ByteRover, and Supermemory.
- Keep the page explicit that the product has not enabled a memory provider. Adding persistence, model calls, provider SDKs, background extraction, or a memory API requires a separately approved feature and architecture change.
- Provider capabilities and deployment modes can change. Verify them against official project documentation before updating the guide, and retain the official-document links.
- Keep document knowledge and conversational/user memory conceptually separate. Memory must not be presented as cited document evidence or silently override source-grounded facts.
- `rag_runs.session_id` and `turn_index` group runs into a conversation so multi-turn retrieval can be measured. Prior turns resolve references in a follow-up question only: they are never citable evidence and never override the documents. Recording conversation state is not a memory provider; persistence, extraction, or an external memory service remains a separately approved change.

### Design system

- The MVP has one light theme. Do not add dark-theme branches or raw Tailwind palette colors.
- Use semantic colors, typography, spacing, radius, motion, and layout dimensions from `styles/design-tokens.css` through `tailwind.config.ts`.
- The approved spacing scale is 4, 8, 12, 16, 24, 32, 40, 48, and 64px. Core UI type sizes are 13, 15, 17, 20, and 24px; 11px is the floor, used for compact labels, helpers, breadcrumbs, GNB labels, and similar secondary UI.
- Type sizes are tuned to the face's x-height, not to a nominal pixel value. Changing the UI face changes the optical size at every step, so re-check the smallest tiers against `tests/typography-metrics.test.ts` before shipping one.
- Use IBM Plex Sans KR for UI copy and the configured mono font only for data/code. Korean copy uses the design system's tighter tracking and readable line height.
- Interactive controls use Lucide icons with the established sizing and stroke conventions. Preserve visible keyboard focus and accessible names.
- A Lucide stroke renders at `strokeWidth * size / 24`. Below one pixel it is antialiased toward the background and the icon reads lighter than the colour it was given, so 16px and 20px icons use 1.5.
- Tracking and line height belong to the face, not to a habit: this face already sets Hangul tightly, so normal tracking is neutral. `font-size-adjust` renders the scale at the x-height it was drawn against, which keeps a face swap from resizing every step.
- React list keys must be unique and stable. Do not derive a key only from display content that may repeat within the same list.

## Change Guidelines

- Keep feature UI in its matching `components/<feature>` directory. Move code to `components/shared` only when multiple features use it.
- Build UI from the shared primitives rather than hand-rolling a control. `npm run check:design` enforces this as a shrinking budget: the counts in `COMPONENT_BUDGETS` may only go down. Lower one when a migration lands; never raise one. The script prints the new number when a budget can be tightened.
- Keep provider-specific parsing and credentials on the server. API routes should return shared contracts rather than leaking provider-specific shapes into UI code.
- Preserve provider-native parser output in `raw` and normalize new parsing runs to the shared Document IR.
- Add database, Storage, RPC, pgvector, and RLS changes as new timestamped files in `supabase/migrations/`; do not rewrite applied migrations.
- Use Supabase Storage APIs instead of writing directly to `storage.objects`.
- Keep all user-owned database queries, vector searches, and Storage paths explicitly scoped to the authenticated user.
- Never expose Supabase secret keys, encryption keys, provider credentials, or the Ragas worker token to client components or browser responses.
- Follow the existing strict TypeScript configuration and `@/*` import alias. Avoid broad refactors when a focused change is sufficient.
- Preserve unrelated worktree changes. Do not discard or rewrite user-owned edits to make a task easier.

## Verification

For TypeScript or UI changes, run the narrowest relevant test first, followed by `npm run check:design`, `npm run lint`, and `npm run typecheck`. Run `npm run build` when navigation, routing, server/client boundaries, configuration, dependencies, or production bundling may be affected.

Useful focused suites include:

- `tests/parser-experiment.test.ts` for engine ordering and deduplication.
- `tests/parser-focus-analysis.test.ts` for bounded source-region alignment and issue detection.
- `tests/parser-results-overview.test.tsx` and `tests/parser-viewers.test.tsx` for the multi-engine result UI.
- `tests/memory-guide.test.tsx` and `tests/navigation.test.ts` for the Memory Guide and menu integration.
- `npm run ragas:test` for Python worker changes.

Before handing off a broad change, prefer `npm run verify` plus the Python suite when applicable. Use `git diff --check` before committing.

Some integration paths require a linked Supabase project and secrets from `.env.local`; never commit local environment files. If an integration cannot be exercised, report the exact missing dependency and still run all unaffected checks.
