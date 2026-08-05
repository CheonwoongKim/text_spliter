# Repository Guide

## Overview

This repository is a document-processing workbench built with Next.js 16, React 19, TypeScript, Tailwind CSS, and Supabase. It supports document parsing, text splitting, managed pgvector collections, RAG runs, and evaluation workflows. A private Python/FastAPI worker under `services/ragas-worker` runs Ragas model evaluations.

## Project Layout

- `app/`: App Router pages and authenticated API routes.
- `components/`: Feature-oriented React components (`parser`, `splitter`, `storage`, `vectorstore`, and `evaluation`).
- `lib/`: Shared contracts, server integrations, authentication, persistence, parsing, retrieval, and evaluation logic.
- `services/ragas-worker/`: Python 3.11+ FastAPI worker and pytest suite.
- `supabase/migrations/`: Versioned database, Storage, pgvector, RPC, and RLS changes.
- `tests/`: Node/TypeScript unit tests.
- `docs/ARCHITECTURE.md`: Runtime structure, data flow, persistence, and domain invariants.

## Common Commands

```bash
npm install              # install Node dependencies
npm run dev:supabase     # run Next.js with linked Supabase credentials
npm run ragas:setup      # create/install the Python worker environment
npm run lint             # ESLint, with zero warnings allowed
npm run typecheck        # strict TypeScript checks
npm run test:unit        # TypeScript unit tests
npm run ragas:test       # Python worker tests
npm run build            # production Next.js build
npm run verify           # lint + typecheck + unit tests + build
```

Use Node.js 20.9 or newer. The Ragas worker supports Python 3.11 through 3.13.

## Change Guidelines

- Keep feature UI in its matching `components/<feature>` directory. Move code to `components/shared` only when multiple features use it.
- Keep provider-specific parsing and credentials on the server. API routes should return shared contracts rather than leaking provider-specific shapes into UI code.
- Preserve provider-native parser output in `raw` and normalize new parsing runs to the shared Document IR.
- Treat frozen evaluation dataset versions, ground-truth versions, run snapshots, and execution traces as immutable.
- Add database, Storage, RPC, pgvector, and RLS changes as new timestamped files in `supabase/migrations/`; do not rewrite applied migrations.
- Use Supabase Storage APIs instead of writing directly to `storage.objects`.
- Keep all user-owned database queries, vector searches, and Storage paths explicitly scoped to the authenticated user.
- Never expose Supabase secret keys, encryption keys, provider credentials, or the Ragas worker token to client components or browser responses.
- Follow the existing strict TypeScript configuration and `@/*` import alias. Avoid broad refactors when a focused change is sufficient.

## Verification

For TypeScript or UI changes, run the narrowest relevant test first, then `npm run lint` and `npm run typecheck`. Run `npm run build` when routing, server/client boundaries, configuration, or production bundling may be affected. Run `npm run ragas:test` for worker changes. Before handing off a broad change, prefer `npm run verify` plus the Python suite when applicable.

Some integration paths require a linked Supabase project and secrets from `.env.local`; never commit local environment files. If an integration cannot be exercised, report the exact missing dependency and still run all unaffected checks.
