import assert from "node:assert/strict";
import test from "node:test";
import type { MetricBreakdownRow } from "@/lib/evaluation-metrics";
import {
  compareParserRetrieval,
  describeParserDelta,
  MIN_RELIABLE_SAMPLE,
} from "@/lib/parser-retrieval-delta";

function row(
  key: string,
  succeededCount: number,
  recall: number | null,
  sampleCount = succeededCount,
): MetricBreakdownRow {
  return {
    key,
    succeededCount,
    successRate: 1,
    recallAtK: { average: recall, sampleCount },
    precisionAtK: { average: recall, sampleCount },
  } as unknown as MetricBreakdownRow;
}

test("the parser with the most scored cases becomes the default baseline", () => {
  const comparison = compareParserRetrieval([
    row("Upstage", 4, 0.5),
    row("LlamaIndex", 12, 0.6),
  ]);

  assert.equal(comparison.baselineParser, "LlamaIndex");
  assert.equal(comparison.parsers[0].parser, "LlamaIndex", "the baseline is listed first");
  assert.equal(comparison.parsers[0].isBaseline, true);
});

test("an explicit baseline overrides the default", () => {
  const comparison = compareParserRetrieval(
    [row("Upstage", 4, 0.5), row("LlamaIndex", 12, 0.6)],
    "Upstage",
  );

  assert.equal(comparison.baselineParser, "Upstage");
});

test("a better parser reports a positive delta against the baseline", () => {
  const comparison = compareParserRetrieval(
    [row("Upstage", 10, 0.5), row("LlamaIndex", 10, 0.8)],
    "Upstage",
  );
  const candidate = comparison.parsers.find((entry) => entry.parser === "LlamaIndex");
  const recall = candidate?.metrics.find((metric) => metric.key === "recallAtK");

  assert.ok(recall);
  assert.equal(Number(recall.delta?.toFixed(6)), 0.3);
  assert.equal(recall.baselineAverage, 0.5);
  assert.equal(candidate?.reliable, true);
});

test("a worse parser reports a negative delta rather than being hidden", () => {
  const comparison = compareParserRetrieval(
    [row("Upstage", 10, 0.7), row("Docling", 10, 0.4)],
    "Upstage",
  );
  const recall = comparison.parsers
    .find((entry) => entry.parser === "Docling")
    ?.metrics.find((metric) => metric.key === "recallAtK");

  assert.ok(recall && recall.delta !== null && recall.delta < 0);
});

test("a thin sample is reported but flagged as unreliable", () => {
  const thin = MIN_RELIABLE_SAMPLE - 1;
  const comparison = compareParserRetrieval(
    [row("Upstage", 20, 0.5), row("Azure", thin, 0.9)],
    "Upstage",
  );
  const candidate = comparison.parsers.find((entry) => entry.parser === "Azure");

  assert.equal(candidate?.reliable, false, "a small sample must not read as a finding");
  assert.ok(
    describeParserDelta(candidate!, "recallAtK").includes("too few cases"),
    "the caveat must be visible in the label",
  );
});

test("the baseline compares against itself as zero", () => {
  const comparison = compareParserRetrieval([row("Upstage", 10, 0.5)], "Upstage");
  const recall = comparison.parsers[0].metrics.find((metric) => metric.key === "recallAtK");

  assert.equal(recall?.delta, 0);
  assert.equal(describeParserDelta(comparison.parsers[0], "recallAtK"), "Baseline");
});

test("an unscored metric yields no delta instead of a zero", () => {
  const comparison = compareParserRetrieval(
    [row("Upstage", 10, 0.5), row("Google", 10, null, 0)],
    "Upstage",
  );
  const candidate = comparison.parsers.find((entry) => entry.parser === "Google");
  const recall = candidate?.metrics.find((metric) => metric.key === "recallAtK");

  assert.equal(recall?.average, null);
  assert.equal(recall?.delta, null, "a missing average must not be scored as no change");
  assert.equal(describeParserDelta(candidate!, "recallAtK"), "Not scored");
});

test("chunks with no parser provenance are reported separately, not silently merged", () => {
  const comparison = compareParserRetrieval([
    row("Upstage", 10, 0.5),
    row("unknown", 3, 0.9),
  ]);

  assert.deepEqual(comparison.unscoredParsers, ["unknown"]);
  assert.ok(
    comparison.parsers.every((entry) => entry.parser !== "unknown"),
    "unattributed chunks must not be compared as if they were a parser",
  );
});

test("an empty breakdown produces an empty comparison rather than throwing", () => {
  const comparison = compareParserRetrieval([]);

  assert.equal(comparison.baselineParser, null);
  assert.deepEqual(comparison.parsers, []);
});
