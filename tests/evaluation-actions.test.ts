import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

/**
 * The evaluation API dispatches to one handler per domain. Splitting those
 * handlers must never drop an action, and no action may be claimed twice, since
 * the first handler that answers wins.
 */
const HANDLER_MODULES = [
  "../lib/evaluation/judge-actions.ts",
  "../lib/evaluation/dataset-actions.ts",
  "../lib/evaluation/run-actions.ts",
] as const;

const EXPECTED_ACTIONS = [
  "attach_case_run",
  "check_evaluator",
  "clone_version",
  "create_case",
  "create_dataset",
  "create_judge_batch",
  "create_run",
  "delete_case",
  "delete_dataset",
  "execute_judge_case_run",
  "recalculate_run_metrics",
  "review_case_run",
  "start_case_run",
  "update_case",
  "update_dataset",
] as const;

async function actionsIn(modulePath: string): Promise<string[]> {
  const source = await readFile(new URL(modulePath, import.meta.url), "utf8");
  return [...source.matchAll(/action === "([a-z_]+)"/g)].map((match) => match[1]);
}

test("every evaluation action is handled by exactly one domain module", async () => {
  const perModule = await Promise.all(HANDLER_MODULES.map(actionsIn));
  const owners = new Map<string, string[]>();

  perModule.forEach((actions, index) => {
    for (const action of new Set(actions)) {
      owners.set(action, [...(owners.get(action) || []), HANDLER_MODULES[index]]);
    }
  });

  for (const action of EXPECTED_ACTIONS) {
    const claimants = owners.get(action) || [];
    assert.equal(claimants.length, 1, `${action} must be handled once, found ${claimants.length}`);
  }

  assert.deepEqual(
    [...owners.keys()].sort(),
    [...EXPECTED_ACTIONS].sort(),
    "the handled actions must match the documented set exactly",
  );
});

test("the route only dispatches and never handles an action itself", async () => {
  const route = await readFile(
    new URL("../app/api/evaluation/route.ts", import.meta.url),
    "utf8",
  );

  assert.equal(
    [...route.matchAll(/action === "([a-z_]+)"/g)].length,
    0,
    "action logic belongs in a domain module, not in the route",
  );
  for (const handler of ["handleJudgeAction", "handleDatasetAction", "handleRunAction"]) {
    assert.ok(route.includes(handler), `${handler} must be reachable from the route`);
  }
});

test("no handler module exceeds the file size limit the split was made to fix", async () => {
  for (const modulePath of [...HANDLER_MODULES, "../app/api/evaluation/route.ts"]) {
    const source = await readFile(new URL(modulePath, import.meta.url), "utf8");
    const lines = source.split("\n").length;
    assert.ok(lines <= 800, `${modulePath} has ${lines} lines, over the 800 line limit`);
  }
});
