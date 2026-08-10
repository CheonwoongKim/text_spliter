export type JsonViewerValue = Record<string, unknown> | unknown[];

/** Convert API JSON payloads, including serialized and malformed legacy values, into a safe tree root. */
export function normalizeJsonViewerValue(value: unknown): JsonViewerValue {
  let parsed = value;

  if (typeof value === "string") {
    try {
      parsed = JSON.parse(value);
    } catch {
      return { value };
    }
  }

  if (parsed !== null && typeof parsed === "object") {
    return parsed as JsonViewerValue;
  }

  return { value: parsed };
}
