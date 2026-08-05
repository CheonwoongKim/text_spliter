# Product Roadmap

## Completed foundation

- [x] Supabase Auth sign-up, sign-in, session restoration, and sign-out
- [x] encrypted provider credential storage and connection tests
- [x] Supabase application database for parse and split results
- [x] private Supabase Storage bucket with per-user paths and RLS
- [x] provider-independent Document IR
- [x] multi-engine parse experiments and manual comparison scorecard
- [x] versioned RAG runs with pgvector evidence, citations, model/usage, and latency traces
- [x] `text-embedding-3-small` upload provenance with explicit legacy ada-002 compatibility

## Evaluation delivery plan

### Stage 1 — Golden sets and manual runs (next)

- [ ] add an Evaluation menu with dataset, version, and case management
- [ ] let reviewers author questions, reference answers/facts, answerability, expected evidence, tags, and rubrics
- [ ] execute selected cases against a frozen parser/chunker/retriever/generator configuration
- [ ] record reviewer scores, notes, pass/fail decisions, and source/evidence links

### Stage 2 — Deterministic retrieval metrics

- [ ] calculate Recall@K, Precision@K, MRR, nDCG, hit rate, citation precision, and citation recall
- [ ] report scores by document type, language, difficulty, parser, chunker, embedding model, and generator
- [ ] support baseline-vs-candidate comparisons and regression thresholds

### Stage 3 — Ragas evaluator worker

- [ ] add an isolated Python worker for Ragas metrics and evaluator-model configuration
- [ ] persist faithfulness, answer relevancy, context precision/recall, metric versions, prompts, and evaluator usage
- [ ] keep deterministic, model-judged, and human scores separate rather than collapsing them into one number

### Stage 4 — Document and multimodal evaluation

- [ ] evaluate text fidelity, reading order, table structure/cells, figures, captions, layout, and page/block provenance
- [ ] connect parser/OCR/VLM outputs to downstream retrieval deltas
- [ ] add robustness sets for scans, rotations, noise, multilingual documents, prompt injection, and unanswerable questions

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

- [ ] create the document benchmark corpus used by the Evaluation delivery plan
- [ ] connect parser-specific metrics to golden-set and downstream RAG scores
- [ ] export frozen experiment configurations, artifacts, and scorecards

## Phase 4 — Vision model adapters

- [ ] define a document-VLM adapter contract separate from OCR engines
- [ ] add configurable page rendering and prompt templates
- [ ] preserve visual citations and page/block provenance
- [ ] compare quality, latency, and cost with specialized parsers

## Phase 5 — Chunking and VDB validation

- [ ] run chunking strategies against normalized block structure
- [ ] preserve page, heading, table, and figure provenance in chunks
- [x] expose retrieval evidence and similarity for every RAG test
- [x] version embedding models in chunk metadata and RAG traces
- [ ] add pre-upload retrieval experiments and candidate index comparison
