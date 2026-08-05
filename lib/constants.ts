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
  SUPABASE_URL: 'supabaseUrl',
  SUPABASE_KEY: 'supabaseKey',
  CHROMA_URL: 'chroamaUrl',
  CHROMA_API_KEY: 'chroamaApiKey',
  PINECONE_URL: 'pineconeUrl',
  PINECONE_API_KEY: 'pineconeApiKey',
  WEAVIATE_URL: 'weaviateUrl',
  WEAVIATE_API_KEY: 'weaviateApiKey',
} as const;

export const CONNECT_KEY_NAMES = [
  API_KEY_NAMES.OPENAI_EMBEDDING,
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
  API_KEY_NAMES.SUPABASE_URL,
  API_KEY_NAMES.SUPABASE_KEY,
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

/**
 * Splitter Types
 */
export const SPLITTER_TYPES = [
  'RecursiveCharacterTextSplitter',
  'CharacterTextSplitter',
  'TokenTextSplitter',
  'MarkdownTextSplitter',
  'LatexTextSplitter',
  'PythonCodeTextSplitter',
  'RecursiveJsonSplitter',
] as const;
export type SplitterType = typeof SPLITTER_TYPES[number];
