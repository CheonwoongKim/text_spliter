/**
 * Input validation utilities for API routes
 */

import {
  PAGINATION_API_CONFIG,
  FILE_UPLOAD_CONFIG,
  PARSER_TYPES,
  SPLITTER_TYPES,
  CHUNK_CONFIG_LIMITS,
  API_KEY_NAMES,
} from './constants';

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

  if (isNaN(parsedLimit) || parsedLimit < PAGINATION_API_CONFIG.MIN_LIMIT || parsedLimit > PAGINATION_API_CONFIG.MAX_LIMIT) {
    throw new ValidationError(`Limit must be a number between ${PAGINATION_API_CONFIG.MIN_LIMIT} and ${PAGINATION_API_CONFIG.MAX_LIMIT}`);
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

  if (file.size > FILE_UPLOAD_CONFIG.MAX_SIZE_BYTES) {
    throw new ValidationError(`File size must not exceed ${FILE_UPLOAD_CONFIG.MAX_SIZE_BYTES / 1024 / 1024}MB`);
  }

  if (!FILE_UPLOAD_CONFIG.ALLOWED_MIME_TYPES.includes(file.type)) {
    throw new ValidationError(`File type ${file.type} is not supported. Allowed types: ${FILE_UPLOAD_CONFIG.ALLOWED_MIME_TYPES.join(', ')}`);
  }

  return file;
}

/**
 * Validate parser type
 */
export function validateParserType(parserType: unknown): 'Upstage' | 'LlamaIndex' | 'Azure' | 'Google' {
  if (!parserType || typeof parserType !== 'string' || !PARSER_TYPES.includes(parserType as any)) {
    throw new ValidationError(`Invalid parser type. Must be one of: ${PARSER_TYPES.join(', ')}`);
  }

  return parserType as 'Upstage' | 'LlamaIndex' | 'Azure' | 'Google';
}

/**
 * Validate splitter type
 */
export function validateSplitterType(splitterType: unknown): string {
  if (!splitterType || typeof splitterType !== 'string' || !SPLITTER_TYPES.includes(splitterType as any)) {
    throw new ValidationError(`Invalid splitter type. Must be one of: ${SPLITTER_TYPES.join(', ')}`);
  }

  return splitterType;
}

/**
 * Validate chunk size and overlap
 */
export function validateChunkConfig(chunkSize: unknown, chunkOverlap: unknown): { chunkSize: number; chunkOverlap: number } {
  const size = parseInt(String(chunkSize), 10);
  const overlap = parseInt(String(chunkOverlap), 10);

  if (isNaN(size) || size < CHUNK_CONFIG_LIMITS.MIN_CHUNK_SIZE || size > CHUNK_CONFIG_LIMITS.MAX_CHUNK_SIZE) {
    throw new ValidationError(`Chunk size must be a number between ${CHUNK_CONFIG_LIMITS.MIN_CHUNK_SIZE} and ${CHUNK_CONFIG_LIMITS.MAX_CHUNK_SIZE}`);
  }

  if (isNaN(overlap) || overlap < CHUNK_CONFIG_LIMITS.MIN_CHUNK_OVERLAP || overlap >= size) {
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
  const validKeyNames = Object.values(API_KEY_NAMES);

  if (!keyName || typeof keyName !== 'string' || !validKeyNames.includes(keyName)) {
    throw new ValidationError(`Invalid API key name. Must be one of: ${validKeyNames.join(', ')}`);
  }

  return keyName;
}
