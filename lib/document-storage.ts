import 'server-only';

import { createHash } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { FILE_UPLOAD_CONFIG } from '@/lib/constants';
import { DOCUMENT_LIST_PAGE_SIZE, DOCUMENTS_BUCKET } from '@/lib/storage-config';
import { ValidationError } from '@/lib/validation';

export interface StoredDocument {
  id: string;
  key: string;
  name: string;
  size: number;
  contentType: string;
  createdAt: string;
  updatedAt: string;
}

function safeFileName(fileName: string): string {
  const sanitized = fileName
    .normalize('NFKC')
    .replace(/[\\/\u0000-\u001f\u007f]/g, '_')
    .replace(/\s+/g, ' ')
    .trim();

  return (sanitized || 'document').slice(0, 180);
}

function originalNameFromStoredName(name: string): string {
  return /^[a-f0-9]{64}-/.test(name) ? name.slice(65) : name;
}

export function assertUserDocumentKey(key: string, userId: string): string {
  const expectedPrefix = `${userId}/`;
  const isSafe =
    key.startsWith(expectedPrefix) &&
    key.length > expectedPrefix.length &&
    !key.includes('\\') &&
    !key.split('/').includes('..');

  if (!isSafe) {
    throw new ValidationError('Invalid document key');
  }

  return key;
}

export async function uploadDocument(
  supabase: SupabaseClient,
  userId: string,
  file: File
): Promise<{ key: string; hash: string; size: number; contentType: string }> {
  if (file.size > FILE_UPLOAD_CONFIG.MAX_SIZE_BYTES) {
    throw new ValidationError(
      `File size must not exceed ${FILE_UPLOAD_CONFIG.MAX_SIZE_BYTES / 1024 / 1024}MB`
    );
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const hash = createHash('sha256').update(bytes).digest('hex');
  const key = `${userId}/${hash}-${safeFileName(file.name)}`;
  const contentType = file.type || 'application/octet-stream';
  const { error } = await supabase.storage.from(DOCUMENTS_BUCKET).upload(key, bytes, {
    contentType,
    cacheControl: '3600',
    upsert: true,
    metadata: {
      originalName: file.name,
      sha256: hash,
    },
  });

  if (error) {
    throw new Error(`Failed to upload document to Supabase Storage: ${error.message}`);
  }

  return { key, hash, size: bytes.byteLength, contentType };
}

export async function listUserDocuments(
  supabase: SupabaseClient,
  userId: string
): Promise<StoredDocument[]> {
  const documents: StoredDocument[] = [];
  let offset = 0;

  while (true) {
    const { data, error } = await supabase.storage.from(DOCUMENTS_BUCKET).list(userId, {
      limit: DOCUMENT_LIST_PAGE_SIZE,
      offset,
      sortBy: { column: 'created_at', order: 'desc' },
    });

    if (error) {
      throw new Error(`Failed to list Supabase Storage documents: ${error.message}`);
    }

    const files = (data || []).filter((item) => item.id !== null);
    documents.push(
      ...files.map((item) => ({
        id: item.id,
        key: `${userId}/${item.name}`,
        name: originalNameFromStoredName(item.name),
        size: Number(item.metadata?.size || 0),
        contentType: String(item.metadata?.mimetype || 'application/octet-stream'),
        createdAt: item.created_at || item.updated_at || new Date(0).toISOString(),
        updatedAt: item.updated_at || item.created_at || new Date(0).toISOString(),
      }))
    );

    if ((data || []).length < DOCUMENT_LIST_PAGE_SIZE) {
      break;
    }

    offset += DOCUMENT_LIST_PAGE_SIZE;
  }

  return documents;
}

export function fileNameFromDocumentKey(key: string): string {
  const storedName = key.split('/').pop() || key;
  return originalNameFromStoredName(storedName);
}
