import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import RagasEvaluationModal from "../components/evaluation/RagasEvaluationModal";
import type { EvaluationRun } from "../lib/types";

test("Ragas execution failures remain visible inside the open modal", () => {
  const run = {
    name: "QA run",
    succeeded_count: 1,
  } as EvaluationRun;
  const markup = renderToStaticMarkup(createElement(RagasEvaluationModal, {
    open: true,
    run,
    model: "gpt-5.6-terra",
    metrics: ["faithfulness"],
    health: {
      frameworkVersion: "0.4.3",
      workerVersion: "1.0.0",
      allowedModels: ["gpt-5.6-terra"],
      supportedMetrics: ["faithfulness"],
    },
    healthError: null,
    executionError: "Connect an OpenAI API key before running Ragas.",
    checking: false,
    executing: false,
    progress: { completed: 0, total: 1 },
    onModelChange: () => undefined,
    onToggleMetric: () => undefined,
    onClose: () => undefined,
    onRun: () => undefined,
  }));

  assert.match(markup, /role="alert"/);
  assert.match(markup, /Connect an OpenAI API key before running Ragas\./);
});
