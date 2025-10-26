/**
 * Application-wide constants
 */

// Pagination
export const DEFAULT_ROWS_PER_PAGE = 20;
export const VDB_ROWS_PER_PAGE = 50;

// API
export const DEFAULT_FETCH_TIMEOUT = 30000; // 30 seconds
export const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

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
  UPSTAGE_PARSER: 'upstageParser',
  LLAMA_PARSER: 'llamaParser',
  AZURE_PARSER_KEY: 'azureParserKey',
  AZURE_PARSER_ENDPOINT: 'azureParserEndpoint',
  GOOGLE_PARSER_KEY: 'googleParserKey',
  GOOGLE_PARSER_PROJECT_ID: 'googleParserProjectId',
  GOOGLE_PARSER_LOCATION: 'googleParserLocation',
  GOOGLE_PARSER_PROCESSOR_ID: 'googleParserProcessorId',
  CHROMA_URL: 'chroamaUrl',
  CHROMA_API_KEY: 'chroamaApiKey',
  PINECONE_URL: 'pineconeUrl',
  PINECONE_API_KEY: 'pineconeApiKey',
  WEAVIATE_URL: 'weaviateUrl',
  WEAVIATE_API_KEY: 'weaviateApiKey',
} as const;

/**
 * External API Endpoints
 */
export const API_ENDPOINTS = {
  UPSTAGE_PARSE: 'https://api.upstage.ai/v1/document-ai/document-parse',
  LLAMA_UPLOAD: 'https://api.cloud.llamaindex.ai/api/parsing/upload',
  LLAMA_JOB_RESULT: (jobId: string, resultType: string) =>
    `https://api.cloud.llamaindex.ai/api/parsing/job/${jobId}/result/${resultType}`,
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
export const PARSER_TYPES = ['Upstage', 'LlamaIndex', 'Azure', 'Google'] as const;
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
