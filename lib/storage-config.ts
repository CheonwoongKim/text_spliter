/**
 * Centralized storage configuration
 * Shared across all API routes that interact with the storage service
 */

export const STORAGE_API_BASE = process.env.STORAGE_API_BASE || 'http://ywstorage.synology.me:4000';
export const DEFAULT_BUCKET = process.env.STORAGE_DEFAULT_BUCKET || 'loan-agent-files';
