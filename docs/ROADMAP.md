# Product Roadmap

## Completed foundation

- [x] Supabase Auth sign-up, sign-in, session restoration, and sign-out
- [x] encrypted provider credential storage and connection tests
- [x] Supabase application database for parse and split results
- [x] private Supabase Storage bucket with per-user paths and RLS
- [x] provider-independent Document IR
- [x] multi-engine parse experiments and manual comparison scorecard

## Phase 1 — Parser execution baseline

- [ ] verify Upstage, LlamaParse, Azure Document Intelligence, Google Document AI, and Docling with representative documents
- [ ] expose engine availability and missing credential states before execution
- [ ] isolate engine failures while retaining successful runs
- [ ] record cost, latency, model version, and effective options for every run

## Phase 2 — Source/result comparison

- [ ] add a page-aware PDF and image source viewer
- [ ] synchronize source pages with normalized result pages
- [ ] visualize reading order, table, figure, and text blocks
- [ ] compare two or more runs without losing provider-native output

## Phase 3 — Evaluation framework

- [ ] create a benchmark corpus for text-heavy, table-heavy, scanned, visual, and mixed-layout documents
- [ ] define text, structure, reading-order, table, figure, and context metrics
- [ ] combine reproducible automatic metrics with manual review
- [ ] export experiment configurations and scorecards

## Phase 4 — Vision model adapters

- [ ] define a document-VLM adapter contract separate from OCR engines
- [ ] add configurable page rendering and prompt templates
- [ ] preserve visual citations and page/block provenance
- [ ] compare quality, latency, and cost with specialized parsers

## Phase 5 — Chunking and VDB validation

- [ ] run chunking strategies against normalized block structure
- [ ] preserve page, heading, table, and figure provenance in chunks
- [ ] evaluate retrieval quality before VDB upload
- [ ] version embedding models and target VDB schemas
