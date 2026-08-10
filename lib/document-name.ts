/**
 * Naming for stored documents.
 *
 * A document is stored under `{sha256}-{name}` inside its owner's folder, and
 * that whole string travels in the URL path of the upload request. Two things
 * follow, and both cost us a file:
 *
 *  - A `#` in the name ends the URL. `# AIM 사전 질의서.docx` was sent as a URL
 *    fragment, never reached the server, and the object was stored under a name
 *    with no name left in it — while the upload still reported success.
 *  - Supabase Storage rejects a key with any character outside a small ASCII
 *    set, so a Korean name fails outright. Every name in this product is
 *    Korean, so that is the common case, not the edge case.
 *
 * So a name that cannot be a key is carried in the key encoded, and decoded
 * back for display. Names that are already safe stay readable, which keeps the
 * storage browser useful for everything written in ASCII.
 *
 * Kept apart from the storage client, which is server-only, so these rules can
 * be tested directly.
 */

/** Objects are stored as `{sha256}-{name}` inside the owner's folder. */
const HASHED_NAME = /^[a-f0-9]{64}-/;

/** Length of the `{sha256}-` prefix. */
const PREFIX_LENGTH = 65;

/**
 * What Supabase Storage accepts in a key, minus `#` and `?`, which a URL reads
 * as the start of a fragment or a query and drops from the path.
 */
const KEY_SAFE = /^[A-Za-z0-9_!\-.*'() &$@=;:+,]+$/;

/** Marks an encoded name. Outside the base64url alphabet, so it cannot collide. */
const ENCODED_PREFIX = '!';

/** Leaves room for the prefix and the encoding within a workable key length. */
const MAX_NAME_LENGTH = 120;

function toBase64Url(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);

  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(value: string): string | null {
  try {
    const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));

    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return null;
  }
}

/** The name part of the key a file is stored under. Never empty, always a valid key. */
export function storedNameFromFileName(fileName: string): string {
  const cleaned = fileName
    .normalize('NFKC')
    .replace(/\p{Cc}/gu, '_')
    .replace(/[\\/]/g, '_')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_NAME_LENGTH);

  const name = cleaned || 'document';
  if (KEY_SAFE.test(name) && !name.startsWith(ENCODED_PREFIX)) return name;

  return ENCODED_PREFIX + toBase64Url(name);
}

/**
 * The name a file was uploaded under, from the name it is stored under.
 *
 * Falls back to the stored name rather than returning nothing, for the objects
 * written before names were encoded. One of those has no name part at all, and
 * an empty string dropped it out of the file list with nothing reported.
 */
export function originalNameFromStoredName(storedName: string): string {
  if (!HASHED_NAME.test(storedName)) return storedName;

  const name = storedName.slice(PREFIX_LENGTH);
  if (!name) return storedName;
  if (!name.startsWith(ENCODED_PREFIX)) return name;

  return fromBase64Url(name.slice(ENCODED_PREFIX.length)) || name;
}

export function fileNameFromDocumentKey(key: string): string {
  return originalNameFromStoredName(key.split('/').pop() || key);
}
