import assert from "node:assert/strict";
import test from "node:test";
import {
  COST_RATE_VERSION,
  EMBEDDING_RATES,
  estimateRunCost,
  formatUsd,
  GENERATION_RATES,
  sumRunCosts,
} from "@/lib/cost-estimate";
import { SUPPORTED_EMBEDDING_MODELS } from "@/lib/constants";

test("every selectable embedding model has a published rate", () => {
  for (const model of SUPPORTED_EMBEDDING_MODELS) {
    assert.ok(
      EMBEDDING_RATES[model.id],
      `${model.id} is selectable, so its cost must not be unknown`,
    );
  }
});

test("a priced run reports embedding, generation, and total cost", () => {
  const cost = estimateRunCost({
    embeddingModel: "text-embedding-3-small",
    generationModel: "gpt-5.6-terra",
    embeddingUsage: { prompt_tokens: 1_000_000, total_tokens: 1_000_000 },
    generationUsage: { input_tokens: 1_000_000, output_tokens: 1_000_000 },
  });

  assert.equal(cost.rateVersion, COST_RATE_VERSION);
  assert.equal(cost.embeddingUsd, EMBEDDING_RATES["text-embedding-3-small"].inputPerMillion);
  assert.equal(
    cost.generationUsd,
    GENERATION_RATES["gpt-5.6-terra"].inputPerMillion
      + (GENERATION_RATES["gpt-5.6-terra"].outputPerMillion || 0),
  );
  assert.equal(cost.totalUsd, (cost.embeddingUsd || 0) + (cost.generationUsd || 0));
  assert.deepEqual(cost.unpricedModels, []);
});

test("a more expensive model costs more for the same usage", () => {
  const usage = { prompt_tokens: 500_000, total_tokens: 500_000 };
  const small = estimateRunCost({ embeddingModel: "text-embedding-3-small", embeddingUsage: usage });
  const large = estimateRunCost({ embeddingModel: "text-embedding-3-large", embeddingUsage: usage });

  assert.ok(
    (large.embeddingUsd || 0) > (small.embeddingUsd || 0),
    "3-large must not appear cheaper than 3-small",
  );
});

test("an unknown model is reported as unpriced, never as free", () => {
  const cost = estimateRunCost({
    embeddingModel: "some-future-model",
    generationModel: "gpt-5.6-terra",
    embeddingUsage: { prompt_tokens: 1000 },
    generationUsage: { input_tokens: 100, output_tokens: 10 },
  });

  assert.equal(cost.embeddingUsd, null, "an unpriced model must not be counted as zero");
  assert.deepEqual(cost.unpricedModels, ["some-future-model"]);
  assert.ok(cost.totalUsd !== null, "the priced part is still reported");
});

test("missing usage yields an unknown cost rather than zero", () => {
  const cost = estimateRunCost({
    embeddingModel: "text-embedding-3-small",
    generationModel: "gpt-5.6-terra",
  });

  assert.equal(cost.embeddingUsd, null);
  assert.equal(cost.generationUsd, null);
  assert.equal(cost.totalUsd, null);
});

test("costs sum across runs and stay null when nothing is priced", () => {
  const priced = estimateRunCost({
    embeddingModel: "text-embedding-3-small",
    embeddingUsage: { prompt_tokens: 1_000_000 },
  });

  assert.equal(sumRunCosts([priced, priced]), (priced.totalUsd || 0) * 2);
  assert.equal(sumRunCosts([]), null);
  assert.equal(sumRunCosts([null, undefined]), null);
});

test("costs render readably at every magnitude", () => {
  assert.equal(formatUsd(null), "-");
  assert.equal(formatUsd(0), "$0");
  assert.equal(formatUsd(0.000123), "$0.0001");
  assert.equal(formatUsd(1.5), "$1.50");
});
