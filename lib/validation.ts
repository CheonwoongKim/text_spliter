/**
 * Input validation utilities for API routes
 */

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * Validate pagination parameters
 */
export function validatePagination(limit: unknown, offset: unknown): { limit: number; offset: number } {
  const parsedLimit = parseInt(String(limit), 10);
  const parsedOffset = parseInt(String(offset), 10);

  if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 100) {
    throw new ValidationError('Limit must be a number between 1 and 100');
  }

  if (isNaN(parsedOffset) || parsedOffset < 0) {
    throw new ValidationError('Offset must be a non-negative number');
  }

  return { limit: parsedLimit, offset: parsedOffset };
}

/**
 * Validate file upload
 */
export function validateFile(file: unknown): File {
  if (!file || !(file instanceof File)) {
    throw new ValidationError('No valid file provided');
  }

  const maxSize = 50 * 1024 * 1024; // 50MB
  if (file.size > maxSize) {
    throw new ValidationError(`File size must not exceed ${maxSize / 1024 / 1024}MB`);
  }

  const allowedTypes = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/jpg',
    'image/webp',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // docx
    'application/msword', // doc
    'text/plain',
  ];

  if (!allowedTypes.includes(file.type)) {
    throw new ValidationError(`File type ${file.type} is not supported. Allowed types: ${allowedTypes.join(', ')}`);
  }

  return file;
}

/**
 * Validate parser type
 */
export function validateParserType(parserType: unknown): 'Upstage' | 'LlamaIndex' | 'Azure' | 'Google' {
  const validTypes = ['Upstage', 'LlamaIndex', 'Azure', 'Google'] as const;

  if (!parserType || typeof parserType !== 'string' || !validTypes.includes(parserType as any)) {
    throw new ValidationError(`Invalid parser type. Must be one of: ${validTypes.join(', ')}`);
  }

  return parserType as 'Upstage' | 'LlamaIndex' | 'Azure' | 'Google';
}

/**
 * Validate splitter type
 */
export function validateSplitterType(splitterType: unknown): string {
  const validTypes = [
    'RecursiveCharacterTextSplitter',
    'CharacterTextSplitter',
    'TokenTextSplitter',
    'MarkdownTextSplitter',
    'LatexTextSplitter',
    'PythonCodeTextSplitter',
    'RecursiveJsonSplitter'
  ];

  if (!splitterType || typeof splitterType !== 'string' || !validTypes.includes(splitterType)) {
    throw new ValidationError(`Invalid splitter type. Must be one of: ${validTypes.join(', ')}`);
  }

  return splitterType;
}

/**
 * Validate chunk size and overlap
 */
export function validateChunkConfig(chunkSize: unknown, chunkOverlap: unknown): { chunkSize: number; chunkOverlap: number } {
  const size = parseInt(String(chunkSize), 10);
  const overlap = parseInt(String(chunkOverlap), 10);

  if (isNaN(size) || size < 1 || size > 10000) {
    throw new ValidationError('Chunk size must be a number between 1 and 10000');
  }

  if (isNaN(overlap) || overlap < 0 || overlap >= size) {
    throw new ValidationError('Chunk overlap must be a non-negative number less than chunk size');
  }

  return { chunkSize: size, chunkOverlap: overlap };
}

/**
 * Validate ID parameter
 */
export function validateId(id: unknown): number {
  const parsedId = parseInt(String(id), 10);

  if (isNaN(parsedId) || parsedId < 1) {
    throw new ValidationError('ID must be a positive number');
  }

  return parsedId;
}

/**
 * Sanitize string input to prevent XSS
 */
export function sanitizeString(input: unknown, maxLength: number = 1000): string {
  if (typeof input !== 'string') {
    return '';
  }

  // Remove any HTML tags and limit length
  return input.replace(/<[^>]*>/g, '').slice(0, maxLength).trim();
}

/**
 * Validate API key name
 */
export function validateApiKeyName(keyName: unknown): string {
  const validKeyNames = [
    'upstageParser',
    'llamaParser',
    'azureParserKey',
    'azureParserEndpoint',
    'googleParserKey',
    'googleParserProjectId',
    'googleParserLocation',
    'googleParserProcessorId',
    'chroamaUrl',
    'chroamaApiKey',
    'pineconeUrl',
    'pineconeApiKey',
    'weaviateUrl',
    'weaviateApiKey',
  ];

  if (!keyName || typeof keyName !== 'string' || !validKeyNames.includes(keyName)) {
    throw new ValidationError(`Invalid API key name. Must be one of: ${validKeyNames.join(', ')}`);
  }

  return keyName;
}
