import assert from "node:assert/strict";
import test from "node:test";

import { formatStorageSyncMessage } from "../lib/storage-sync";

test("empty storage sync responses render a safe no-op summary", () => {
  assert.equal(
    formatStorageSyncMessage({ updated: 0, total: 0 }),
    "Successfully synced 0 out of 0 parse results!\n\nMatched files:\nNo matching files found."
  );
});

test("storage sync summaries cap the file preview at five matches", () => {
  const matches = Array.from({ length: 6 }, (_, index) => ({
    id: index + 1,
    key: `documents/file-${index + 1}.pdf`,
  }));
  const message = formatStorageSyncMessage({ updated: 6, total: 6, matches });

  assert.match(message, /ID 5: documents\/file-5\.pdf/);
  assert.doesNotMatch(message, /file-6\.pdf/);
  assert.ok(message.endsWith("\n..."));
});
