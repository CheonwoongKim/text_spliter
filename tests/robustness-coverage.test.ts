import assert from "node:assert/strict";
import test from "node:test";
import {
  buildRobustnessCoverage,
  ROBUSTNESS_SCENARIOS,
  ROBUSTNESS_TAG_SUGGESTIONS,
} from "@/lib/robustness-coverage";

function evaluationCase(
  case_key: string,
  tags: string[] = [],
  answerable = true,
) {
  return { case_key, tags, answerable };
}

test("an empty golden set reports every scenario as a gap", () => {
  const report = buildRobustnessCoverage([]);

  assert.equal(report.totalCases, 0);
  assert.equal(report.coveredCount, 0);
  assert.equal(report.gaps.length, ROBUSTNESS_SCENARIOS.length);
  assert.equal(report.coverageRatio, 0);
});

test("a scenario needs its minimum number of cases before it counts as covered", () => {
  const scenario = ROBUSTNESS_SCENARIOS.find((item) => item.id === "multilingual");
  assert.ok(scenario && scenario.minimumCases >= 2);

  const one = buildRobustnessCoverage([evaluationCase("c1", ["multilingual"])]);
  assert.equal(
    one.scenarios.find((entry) => entry.scenario.id === "multilingual")?.covered,
    false,
    "a single case must not read as coverage",
  );

  const enough = buildRobustnessCoverage([
    evaluationCase("c1", ["multilingual"]),
    evaluationCase("c2", ["bilingual"]),
  ]);
  assert.equal(
    enough.scenarios.find((entry) => entry.scenario.id === "multilingual")?.covered,
    true,
  );
});

test("tags are matched regardless of spacing and case", () => {
  const report = buildRobustnessCoverage([
    evaluationCase("c1", ["Prompt Injection"]),
  ]);

  assert.equal(
    report.scenarios.find((entry) => entry.scenario.id === "prompt-injection")?.caseCount,
    1,
  );
});

test("unanswerable coverage is read from the structured field, not only tags", () => {
  const report = buildRobustnessCoverage([
    evaluationCase("c1", [], false),
    evaluationCase("c2", [], false),
  ]);
  const unanswerable = report.scenarios.find((entry) => entry.scenario.id === "unanswerable");

  assert.equal(unanswerable?.covered, true);
  assert.deepEqual(unanswerable?.caseKeys, ["c1", "c2"]);
});

test("an answerable case does not accidentally cover the unanswerable scenario", () => {
  const report = buildRobustnessCoverage([
    evaluationCase("c1", [], true),
    evaluationCase("c2", [], true),
  ]);

  assert.equal(
    report.scenarios.find((entry) => entry.scenario.id === "unanswerable")?.caseCount,
    0,
  );
});

test("gaps name the scenario and explain why it matters", () => {
  const report = buildRobustnessCoverage([evaluationCase("c1", ["table"])]);

  for (const gap of report.gaps) {
    assert.ok(gap.label.trim(), `${gap.id} needs a label`);
    assert.ok(gap.rationale.trim(), `${gap.id} must explain why it is tested`);
  }
});

test("coverage ratio reflects how many scenarios are satisfied", () => {
  const full = buildRobustnessCoverage(
    ROBUSTNESS_SCENARIOS.flatMap((scenario) =>
      Array.from({ length: scenario.minimumCases }, (_, index) =>
        evaluationCase(`${scenario.id}-${index}`, [scenario.tags[0]]))),
  );

  assert.equal(full.coveredCount, ROBUSTNESS_SCENARIOS.length);
  assert.equal(full.coverageRatio, 1);
  assert.deepEqual(full.gaps, []);
});

test("every scenario offers a suggestion tag the editor can apply", () => {
  for (const scenario of ROBUSTNESS_SCENARIOS) {
    assert.ok(
      ROBUSTNESS_TAG_SUGGESTIONS.includes(scenario.tags[0]),
      `${scenario.id} must be taggable from the editor`,
    );
  }
});
