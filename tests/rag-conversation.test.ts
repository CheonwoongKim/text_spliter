import assert from "node:assert/strict";
import test from "node:test";
import {
  buildRetrievalQuery,
  isValidSessionId,
  MAX_CONTEXT_TURNS,
  MAX_TURN_CHARACTERS,
  nextTurnIndex,
  normalizeConversationTurns,
  renderConversationContext,
  RETRIEVAL_QUERY_MAX_LENGTH,
} from "@/lib/rag-conversation";

function turn(index: number) {
  return { question: `question ${index}`, answer: `answer ${index}` };
}

test("only complete turns are kept", () => {
  const turns = normalizeConversationTurns([
    turn(1),
    { question: "no answer" },
    { answer: "no question" },
    { question: "  ", answer: "blank" },
    turn(2),
  ]);

  assert.deepEqual(turns, [turn(1), turn(2)]);
});

test("history is capped so it cannot crowd out retrieved evidence", () => {
  const many = Array.from({ length: MAX_CONTEXT_TURNS + 4 }, (_, index) => turn(index));
  const turns = normalizeConversationTurns(many);

  assert.equal(turns.length, MAX_CONTEXT_TURNS);
  assert.deepEqual(turns.at(-1), many.at(-1), "the most recent turns are the ones kept");
});

test("an oversized turn is truncated rather than dropped", () => {
  const [only] = normalizeConversationTurns([
    { question: "q".repeat(MAX_TURN_CHARACTERS * 2), answer: "a" },
  ]);

  assert.ok(only.question.length <= MAX_TURN_CHARACTERS + 1);
  assert.ok(only.question.endsWith("…"));
});

test("non-array history is ignored", () => {
  assert.deepEqual(normalizeConversationTurns(undefined), []);
  assert.deepEqual(normalizeConversationTurns("history"), []);
  assert.deepEqual(normalizeConversationTurns(null), []);
});

test("a single-turn query is searched exactly as asked", () => {
  assert.equal(buildRetrievalQuery("what is the revenue?", []), "what is the revenue?");
});

test("a follow-up query carries prior turns but ends with the current question", () => {
  const query = buildRetrievalQuery("what about the second one?", [turn(1)]);

  assert.ok(query.includes("question 1"));
  assert.ok(query.includes("answer 1"));
  assert.ok(
    query.trimEnd().endsWith("what about the second one?"),
    "the current question must stay last and dominant",
  );
});

test("a very long conversation query is bounded", () => {
  const long = Array.from({ length: MAX_CONTEXT_TURNS }, () => ({
    question: "q".repeat(MAX_TURN_CHARACTERS),
    answer: "a".repeat(MAX_TURN_CHARACTERS),
  }));
  const query = buildRetrievalQuery("final question", normalizeConversationTurns(long));

  assert.ok(query.length <= RETRIEVAL_QUERY_MAX_LENGTH);
  assert.ok(query.endsWith("final question"), "truncation keeps the current question");
});

test("rendered conversation is labelled as non-evidence", () => {
  const rendered = renderConversationContext([turn(1)]);

  assert.ok(/not document evidence/i.test(rendered));
  assert.ok(/never be cited/i.test(rendered));
  assert.ok(rendered.includes("question 1"));
});

test("no conversation renders nothing at all", () => {
  assert.equal(renderConversationContext([]), "");
});

test("session identity is validated before it reaches the database", () => {
  assert.equal(isValidSessionId("3f2504e0-4f89-11d3-9a0c-0305e82c3301"), true);
  assert.equal(isValidSessionId("not-a-uuid"), false);
  assert.equal(isValidSessionId(""), false);
  assert.equal(isValidSessionId(42), false);
});

test("turn index falls back to the first turn for invalid input", () => {
  assert.equal(nextTurnIndex(3), 3);
  assert.equal(nextTurnIndex(0), 0);
  assert.equal(nextTurnIndex(-1), 0);
  assert.equal(nextTurnIndex("two"), 0);
  assert.equal(nextTurnIndex(undefined), 0);
});

test("the migration keeps session and turn nullable together", async () => {
  const { readFile } = await import("node:fs/promises");
  const migration = await readFile(
    new URL(
      "../supabase/migrations/20260810133720_rag_conversation_sessions.sql",
      import.meta.url,
    ),
    "utf8",
  );

  assert.ok(migration.includes("add column if not exists session_id uuid"));
  assert.ok(migration.includes("add column if not exists turn_index integer"));
  assert.ok(
    migration.includes("(session_id is null) = (turn_index is null)"),
    "a turn number is only meaningful inside a session",
  );
  assert.ok(
    !/not null/i.test(migration),
    "existing single-turn runs must stay valid",
  );
});
