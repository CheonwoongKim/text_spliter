import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  DEFAULT_EMBEDDING_DIMENSIONS,
  DEFAULT_EMBEDDING_MODEL,
  describeEmbeddingModel,
  embeddingModelKey,
  findEmbeddingModel,
  isSupportedEmbeddingModel,
  SUPPORTED_EMBEDDING_DIMENSIONS,
  SUPPORTED_EMBEDDING_MODELS,
  SUPPORTED_EMBEDDING_MODEL_IDS,
} from "@/lib/constants";
import { embeddingColumnForDimensions } from "@/lib/vectorstore";

test("more than one embedding configuration is selectable", () => {
  assert.ok(
    SUPPORTED_EMBEDDING_MODELS.length >= 2,
    "a workbench that compares retrieval quality needs at least two options",
  );
  assert.ok(SUPPORTED_EMBEDDING_MODEL_IDS.includes(DEFAULT_EMBEDDING_MODEL));
  assert.ok(SUPPORTED_EMBEDDING_DIMENSIONS.includes(DEFAULT_EMBEDDING_DIMENSIONS));
});

test("a model at a different width is a distinct, separately keyed option", () => {
  const keys = SUPPORTED_EMBEDDING_MODELS.map((model) => model.key);
  assert.equal(new Set(keys).size, keys.length, "keys must be unique");

  const large1536 = findEmbeddingModel("text-embedding-3-large", 1536);
  const large3072 = findEmbeddingModel("text-embedding-3-large", 3072);
  assert.ok(large1536 && large3072, "the same model is offered at two widths");
  assert.notEqual(large1536.key, large3072.key);
});

test("support is decided by the model and width together", () => {
  assert.equal(isSupportedEmbeddingModel("text-embedding-3-small", 1536), true);
  assert.equal(isSupportedEmbeddingModel("text-embedding-3-large", 3072), true);
  assert.equal(
    isSupportedEmbeddingModel("text-embedding-3-small", 3072),
    false,
    "a width the model is not offered at must be rejected",
  );
  assert.equal(isSupportedEmbeddingModel("text-embedding-ada-002", 1536), false);
  assert.equal(isSupportedEmbeddingModel("text-embedding-3-small", 999), false);
  assert.equal(isSupportedEmbeddingModel(undefined, undefined), false);
});

test("every supported width has a storage column and a declared search mode", () => {
  for (const model of SUPPORTED_EMBEDDING_MODELS) {
    assert.ok(model.label.trim(), `${model.key} needs a label`);
    assert.ok(model.description.trim(), `${model.key} needs a description`);
    assert.ok(
      ["hnsw", "exact"].includes(model.searchMode),
      `${model.key} must declare how it is searched`,
    );
    assert.doesNotThrow(
      () => embeddingColumnForDimensions(model.dimensions),
      `${model.dimensions} must have a storage column`,
    );
  }
});

test("widths above the HNSW limit are searched exactly rather than approximately", () => {
  for (const model of SUPPORTED_EMBEDDING_MODELS) {
    if (model.dimensions > 2000) {
      assert.equal(
        model.searchMode,
        "exact",
        `pgvector cannot build an HNSW index for ${model.dimensions} dimensions`,
      );
    }
  }
});

test("each width maps to its own storage column", () => {
  const columns = SUPPORTED_EMBEDDING_DIMENSIONS.map(embeddingColumnForDimensions);
  assert.equal(new Set(columns).size, columns.length, "widths must not share a column");
  assert.throws(() => embeddingColumnForDimensions(768), /does not store/);
});

test("keys and labels are stable and human readable", () => {
  assert.equal(embeddingModelKey("text-embedding-3-large", 3072), "text-embedding-3-large@3072");
  assert.equal(describeEmbeddingModel("text-embedding-3-large", 3072), "3-large · 3072d");
  assert.equal(
    describeEmbeddingModel("unknown-model", 512),
    "unknown-model@512",
    "an unknown pair still renders identifiably",
  );
});

test("the migrations permit exactly the models and widths the application offers", async () => {
  const modelMigration = await readFile(
    new URL("../supabase/migrations/20260810131304_multi_embedding_model.sql", import.meta.url),
    "utf8",
  );
  const dimensionMigration = await readFile(
    new URL("../supabase/migrations/20260810135301_multi_dimension_embeddings.sql", import.meta.url),
    "utf8",
  );

  for (const model of SUPPORTED_EMBEDDING_MODEL_IDS) {
    assert.ok(
      modelMigration.includes(`'${model}'`),
      `${model} must be permitted by the collection check constraint`,
    );
  }
  for (const dimensions of SUPPORTED_EMBEDDING_DIMENSIONS) {
    assert.ok(
      dimensionMigration.includes(String(dimensions)),
      `${dimensions} must be permitted and routable in the search function`,
    );
  }
});
