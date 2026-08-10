import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

/**
 * A hand-rolled overlay looks finished and behaves badly: it traps nobody, it
 * ignores Escape, and a screen reader is never told a dialog opened. Every
 * overlay in the workbench goes through ModalDialog so those come for free.
 */
const dialog = readFileSync("components/shared/ModalDialog.tsx", "utf8");
const modal = readFileSync("components/shared/Modal.tsx", "utf8");
const status = readFileSync("components/shared/StatusMessage.tsx", "utf8");

test("the dialog primitive traps focus, restores it, and closes on Escape", () => {
  assert.match(dialog, /role="dialog"/);
  assert.match(dialog, /aria-modal/);
  assert.match(dialog, /event\.key === "Escape"/);
  assert.match(dialog, /previousFocus\?\.focus\(\)/, "focus returns where it came from");
  assert.match(dialog, /FOCUSABLE_SELECTOR/, "focus is trapped inside the dialog");
});

test("Modal is a convenience layer over that primitive, not a second one", () => {
  assert.match(modal, /from "\.\/ModalDialog"/);
  assert.doesNotMatch(
    modal,
    /className="fixed inset-0/,
    "Modal must not paint its own overlay; that is what it delegates",
  );
});

test("an outcome is carried by an icon and a role, not by colour alone", () => {
  assert.match(status, /role=\{tone === "danger" \? "alert" : "status"\}/);
  for (const tone of ["success", "danger", "warning", "info"]) {
    assert.ok(status.includes(`${tone}:`), `${tone} needs a defined treatment`);
  }
  assert.match(status, /Icon className/, "every tone renders an icon");
});

test("migrated dialogs use the shared overlay", () => {
  const migrated = [
    "components/vectorstore/VectorStoreLeftPanel.tsx",
    "components/vectorstore/VectorStoreRightPanel.tsx",
    "components/evaluation/RagasEvaluationModal.tsx",
  ];

  for (const path of migrated) {
    const panel = readFileSync(path, "utf8");
    assert.match(panel, /<Modal/, `${path} must use the shared overlay`);
    assert.doesNotMatch(
      panel,
      /className="fixed inset-0/,
      `${path} still paints its own overlay, so it traps no focus`,
    );
  }
});
