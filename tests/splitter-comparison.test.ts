import assert from "node:assert/strict";
import test from "node:test";
import {
  bestRunIds,
  calculateSplitterRunMetrics,
  compareSplitterRuns,
  describeSplitterRun,
  splitterRunSignature,
  type SplitterRun,
} from "@/lib/splitter-comparison";
import { splitText } from "@/lib/splitters";
import type { SplitterConfig } from "@/lib/types";

const SOURCE = [
  "Retrieval augmented generation depends on chunk quality.",
  "A chunk that ends mid sentence loses the context a reader needs.",
  "Tables must stay together or their rows lose their headers.",
].join("\n\n");

function config(overrides: Partial<SplitterConfig> = {}): SplitterConfig {
  return {
    splitterType: "RecursiveCharacterTextSplitter",
    chunkSize: 80,
    chunkOverlap: 0,
    separators: ["\n\n", "\n", " ", ""],
    ...overrides,
  };
}

async function buildRun(id: string, overrides: Partial<SplitterConfig> = {}): Promise<SplitterRun> {
  const runConfig = config(overrides);
  return { id, config: runConfig, result: await splitText(SOURCE, runConfig) };
}

test("metrics summarize a chunking run without any external call", async () => {
  const run = await buildRun("run-1");
  const metrics = calculateSplitterRunMetrics(run);

  assert.equal(metrics.id, "run-1");
  assert.equal(metrics.totalChunks, run.result.chunks.length);
  assert.ok(metrics.minLength <= metrics.medianLength);
  assert.ok(metrics.medianLength <= metrics.maxLength);
  assert.ok(metrics.lengthStdDev >= 0);
  assert.ok(metrics.brokenBoundaryRatio >= 0 && metrics.brokenBoundaryRatio <= 1);
});

test("a larger chunk size produces fewer chunks", async () => {
  const [small, large] = await Promise.all([
    buildRun("small", { chunkSize: 60 }),
    buildRun("large", { chunkSize: 400 }),
  ]);
  const [smallMetrics, largeMetrics] = compareSplitterRuns([small, large]);

  assert.ok(
    largeMetrics.totalChunks < smallMetrics.totalChunks,
    "a bigger chunk size must not produce more chunks",
  );
});

test("measured overlap reflects the configured overlap", async () => {
  const [none, overlapping] = await Promise.all([
    buildRun("none", { chunkSize: 60, chunkOverlap: 0 }),
    buildRun("overlapping", { chunkSize: 60, chunkOverlap: 30 }),
  ]);

  const noneMetrics = calculateSplitterRunMetrics(none);
  const overlappingMetrics = calculateSplitterRunMetrics(overlapping);

  assert.equal(noneMetrics.measuredOverlap, 0);
  assert.ok(
    overlappingMetrics.measuredOverlap >= noneMetrics.measuredOverlap,
    "an overlapping configuration must not measure less overlap",
  );
});

test("provenance coverage stays zero without a parsed document", async () => {
  const metrics = calculateSplitterRunMetrics(await buildRun("plain"));

  assert.equal(metrics.provenanceCoverage, 0);
  assert.equal(metrics.pageSpanningRatio, 0);
});

test("the best run is only highlighted when runs actually differ", async () => {
  const [small, large] = await Promise.all([
    buildRun("small", { chunkSize: 60 }),
    buildRun("large", { chunkSize: 400 }),
  ]);
  const metrics = compareSplitterRuns([small, large]);

  assert.deepEqual(bestRunIds(metrics, "totalChunks", "lower"), ["large"]);
  assert.deepEqual(bestRunIds([metrics[0]], "totalChunks", "lower"), [], "one run has no winner");
  assert.deepEqual(
    bestRunIds([metrics[0], { ...metrics[1], totalChunks: metrics[0].totalChunks }], "totalChunks", "lower"),
    [],
    "a tie has no winner",
  );
});

test("identical configurations share a signature and differing ones do not", () => {
  assert.equal(splitterRunSignature(config()), splitterRunSignature(config()));
  assert.notEqual(
    splitterRunSignature(config()),
    splitterRunSignature(config({ chunkSize: 500 })),
  );
  assert.notEqual(
    splitterRunSignature(config()),
    splitterRunSignature(config({ splitterType: "CharacterTextSplitter" })),
  );
});

test("run labels describe the configuration a reviewer is comparing", () => {
  assert.equal(
    describeSplitterRun({
      id: "x",
      config: config({ chunkSize: 1000, chunkOverlap: 200 }),
      result: { chunks: [], totalChunks: 0, splitterType: "RecursiveCharacterTextSplitter", parameters: config(), statistics: { averageChunkSize: 0, minChunkSize: 0, maxChunkSize: 0, processingTime: 0 } },
    }),
    "RecursiveCharacterTextSplitter · 1000/200",
  );
});
