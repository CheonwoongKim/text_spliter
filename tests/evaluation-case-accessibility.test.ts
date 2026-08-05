import assert from "node:assert/strict";
import test from "node:test";

import { evaluationCaseSelectionLabel } from "../lib/evaluation-accessibility";

test("evaluation case run checkboxes include the case key in their accessible name", () => {
  assert.equal(
    evaluationCaseSelectionLabel({
      case_key: "cobalt-orchid",
      question: "What evidence should be returned?",
    }),
    "Select cobalt-orchid for run"
  );
});

test("evaluation case run checkbox labels fall back to the question", () => {
  assert.equal(
    evaluationCaseSelectionLabel({ case_key: " ", question: "Fallback question" }),
    "Select Fallback question for run"
  );
});
