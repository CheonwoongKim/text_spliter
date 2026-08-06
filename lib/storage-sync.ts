export interface StorageSyncMatch {
  id: number;
  key: string;
}

export interface StorageSyncResult {
  updated: number;
  total: number;
  matches?: StorageSyncMatch[];
}

export function formatStorageSyncMessage(result: StorageSyncResult): string {
  const matches = Array.isArray(result.matches) ? result.matches : [];
  const preview = matches
    .slice(0, 5)
    .map((match) => `- ID ${match.id}: ${match.key}`)
    .join("\n");
  const suffix = matches.length > 5 ? "\n..." : "";
  const matchSummary = preview || "No matching files found.";

  return `Successfully synced ${result.updated} out of ${result.total} parse results!\n\nMatched files:\n${matchSummary}${suffix}`;
}
