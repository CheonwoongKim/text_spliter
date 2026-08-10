/**
 * Application-wide constants
 */

// Pagination
export const DEFAULT_ROWS_PER_PAGE = 20;
export const VDB_ROWS_PER_PAGE = 50;

// API
export const DEFAULT_FETCH_TIMEOUT = 30000; // 30 seconds
export const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

// Reproducible RAG defaults
export const DEFAULT_EMBEDDING_MODEL = 'text-embedding-3-small';
export const DEFAULT_EMBEDDING_DIMENSIONS = 1536;

/**
 * Embedding configurations a managed collection can be built with.
 *
 * The unit of choice is a (model, dimensions) pair, because the same model at a
 * different width produces vectors that are not comparable. A collection stores
 * both, and retrieval reuses them exactly: mixing does not fail, it silently
 * returns meaningless cosine distances.
 *
 * `searchMode` records how the dimension is queried. pgvector caps an HNSW index
 * at 2000 dimensions, so 3072 uses exact cosine search — slower on large
 * collections, but with no approximate-recall loss to confound a measurement.
 */
export type EmbeddingSearchMode = 'hnsw' | 'exact';

export const SUPPORTED_EMBEDDING_MODELS = [
  {
    key: 'text-embedding-3-small@1536',
    id: 'text-embedding-3-small',
    dimensions: 1536,
    searchMode: 'hnsw',
    label: '3-small · 1536d',
    description: 'Lower cost. Solid baseline for most documents.',
  },
  {
    key: 'text-embedding-3-large@1536',
    id: 'text-embedding-3-large',
    dimensions: 1536,
    searchMode: 'hnsw',
    label: '3-large · 1536d',
    description: 'Higher quality than 3-small, reduced to 1536 dimensions. Indexed search.',
  },
  {
    key: 'text-embedding-3-large@3072',
    id: 'text-embedding-3-large',
    dimensions: 3072,
    searchMode: 'exact',
    label: '3-large · 3072d',
    description: 'Full width, highest quality. Exact search, so slower on large collections.',
  },
] as const;

export type SupportedEmbeddingModelKey = (typeof SUPPORTED_EMBEDDING_MODELS)[number]['key'];
export type SupportedEmbeddingModel = (typeof SUPPORTED_EMBEDDING_MODELS)[number]['id'];
export type SupportedEmbeddingDimensions = (typeof SUPPORTED_EMBEDDING_MODELS)[number]['dimensions'];

export const SUPPORTED_EMBEDDING_MODEL_IDS: readonly string[] =
  [...new Set(SUPPORTED_EMBEDDING_MODELS.map((model) => model.id))];

export const SUPPORTED_EMBEDDING_DIMENSIONS: readonly number[] =
  [...new Set(SUPPORTED_EMBEDDING_MODELS.map((model) => model.dimensions))];

export function embeddingModelKey(model: string, dimensions: number): string {
  return `${model}@${dimensions}`;
}

export function findEmbeddingModel(model: unknown, dimensions: unknown) {
  return SUPPORTED_EMBEDDING_MODELS.find(
    (entry) => entry.id === model && entry.dimensions === dimensions,
  );
}

/** A model alone is not enough: it must be supported at the given width. */
export function isSupportedEmbeddingModel(model: unknown, dimensions: unknown): boolean {
  return Boolean(findEmbeddingModel(model, dimensions));
}

export function describeEmbeddingModel(model: string, dimensions: number): string {
  return findEmbeddingModel(model, dimensions)?.label || embeddingModelKey(model, dimensions);
}
export const DEFAULT_GENERATION_MODEL = 'gpt-5.6-terra';
export const RAG_PROMPT_VERSION = 'grounded-answer-v1';
export const RAG_TOP_K_MIN = 1;
export const RAG_TOP_K_MAX = 20;
export const RAG_QUESTION_MAX_LENGTH = 8000;

// Text limits
export const MAX_TEXT_LENGTH = 100000;
export const MAX_CHUNK_SIZE = 10000;
export const DEFAULT_CHUNK_SIZE = 1000;
export const DEFAULT_CHUNK_OVERLAP = 200;

// Copy feedback duration
export const COPY_FEEDBACK_DURATION = 2000; // 2 seconds

// Auto-hide success message duration
export const SUCCESS_MESSAGE_DURATION = 3000; // 3 seconds

// Pagination limits
export const MIN_PAGE = 0;
export const MAX_PAGE_SIZE = 100;

// Text preview length
export const PREVIEW_TEXT_LENGTH = 100;
export const MODAL_PREVIEW_LENGTH = 200;

/**
 * API Key Names for database storage
 */
export const API_KEY_NAMES = {
  OPENAI_EMBEDDING: 'openaiEmbedding',
  GEMINI_VISION: 'geminiVision',
  ANTHROPIC_VISION: 'anthropicVision',
  QWEN_VISION: 'qwenVision',
  QWEN_VISION_ENDPOINT: 'qwenVisionEndpoint',
  NATIVE_DOCUMENT_RENDERER_ENDPOINT: 'nativeDocumentRendererEndpoint',
  NATIVE_DOCUMENT_RENDERER_API_KEY: 'nativeDocumentRendererApiKey',
  UPSTAGE_PARSER: 'upstageParser',
  LLAMA_PARSER: 'llamaParser',
  AZURE_PARSER_KEY: 'azureParserKey',
  AZURE_PARSER_ENDPOINT: 'azureParserEndpoint',
  GOOGLE_PARSER_SERVICE_ACCOUNT_EMAIL: 'googleParserServiceAccountEmail',
  GOOGLE_PARSER_PRIVATE_KEY: 'googleParserPrivateKey',
  GOOGLE_PARSER_PROJECT_ID: 'googleParserProjectId',
  GOOGLE_PARSER_LOCATION: 'googleParserLocation',
  GOOGLE_PARSER_PROCESSOR_ID: 'googleParserProcessorId',
  DOCLING_ENDPOINT: 'doclingEndpoint',
  DOCLING_API_KEY: 'doclingApiKey',
  CHROMA_URL: 'chroamaUrl',
  CHROMA_API_KEY: 'chroamaApiKey',
  PINECONE_URL: 'pineconeUrl',
  PINECONE_API_KEY: 'pineconeApiKey',
  WEAVIATE_URL: 'weaviateUrl',
  WEAVIATE_API_KEY: 'weaviateApiKey',
} as const;

export const CONNECT_KEY_NAMES = [
  API_KEY_NAMES.OPENAI_EMBEDDING,
  API_KEY_NAMES.GEMINI_VISION,
  API_KEY_NAMES.ANTHROPIC_VISION,
  API_KEY_NAMES.QWEN_VISION,
  API_KEY_NAMES.QWEN_VISION_ENDPOINT,
  API_KEY_NAMES.NATIVE_DOCUMENT_RENDERER_ENDPOINT,
  API_KEY_NAMES.NATIVE_DOCUMENT_RENDERER_API_KEY,
  API_KEY_NAMES.UPSTAGE_PARSER,
  API_KEY_NAMES.LLAMA_PARSER,
  API_KEY_NAMES.AZURE_PARSER_KEY,
  API_KEY_NAMES.AZURE_PARSER_ENDPOINT,
  API_KEY_NAMES.GOOGLE_PARSER_SERVICE_ACCOUNT_EMAIL,
  API_KEY_NAMES.GOOGLE_PARSER_PRIVATE_KEY,
  API_KEY_NAMES.GOOGLE_PARSER_PROJECT_ID,
  API_KEY_NAMES.GOOGLE_PARSER_LOCATION,
  API_KEY_NAMES.GOOGLE_PARSER_PROCESSOR_ID,
  API_KEY_NAMES.DOCLING_ENDPOINT,
  API_KEY_NAMES.DOCLING_API_KEY,
] as const;

/**
 * External API Endpoints
 */
export const API_ENDPOINTS = {
  UPSTAGE_PARSE: 'https://api.upstage.ai/v1/document-ai/document-parse',
  LLAMA_PARSE_UPLOAD: 'https://api.cloud.llamaindex.ai/api/v2/parse/upload',
  LLAMA_PARSE_JOB: (jobId: string) =>
    `https://api.cloud.llamaindex.ai/api/v2/parse/${jobId}`,
} as const;

/**
 * Polling Configuration for async operations
 */
export const POLLING_CONFIG = {
  MAX_RETRIES: 60,
  RETRY_DELAY_MS: 2000,
  TIMEOUT_MS: 120000,
} as const;

/**
 * File Upload Configuration
 */
export const FILE_UPLOAD_CONFIG = {
  MAX_SIZE_BYTES: 50 * 1024 * 1024, // 50MB
  ALLOWED_MIME_TYPES: [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/jpg',
    'image/webp',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // docx
    'application/msword', // doc
    'application/x-hwp',
    'application/vnd.hancom.hwp',
    'application/vnd.hancom.hwpx',
    'text/plain',
  ],
} as const;

/**
 * Pagination API Configuration
 */
export const PAGINATION_API_CONFIG = {
  DEFAULT_LIMIT: 50,
  DEFAULT_OFFSET: 0,
  MAX_LIMIT: 100,
  MIN_LIMIT: 1,
} as const;

/**
 * Chunk Configuration Limits
 */
export const CHUNK_CONFIG_LIMITS = {
  MAX_CHUNK_SIZE: 10000,
  MIN_CHUNK_SIZE: 1,
  MIN_CHUNK_OVERLAP: 0,
} as const;

/**
 * Parser Types
 */
export const PARSER_TYPES = ['Upstage', 'LlamaIndex', 'Azure', 'Google', 'Docling'] as const;
export type ParserType = typeof PARSER_TYPES[number];

export const VISION_ENGINE_TYPES = [
  'OpenAI Vision',
  'Gemini Vision',
  'Claude Vision',
  'Qwen Vision',
] as const;
export type VisionEngineType = typeof VISION_ENGINE_TYPES[number];
export const DOCUMENT_ENGINE_TYPES = [...PARSER_TYPES, ...VISION_ENGINE_TYPES] as const;
export type DocumentEngineType = typeof DOCUMENT_ENGINE_TYPES[number];

/**
 * Splitter Types
 */
export { SPLITTER_TYPES } from "./types";
export type { SplitterType } from "./types";
