import type { EvaluationCase } from "@/lib/types";

/**
 * Robustness coverage for a golden set.
 *
 * An average score over clean, answerable, single-language questions says
 * nothing about how a pipeline behaves on a rotated scan, a Korean-English
 * mixed document, an injected instruction, or a question the corpus cannot
 * answer. Those are exactly the cases that fail in production.
 *
 * Coverage is derived from case tags and attributes the reviewer already
 * writes, so nothing new has to be maintained. A gap is reported as a gap, not
 * silently averaged away: a golden set with no unanswerable case cannot tell
 * whether the pipeline knows how to say "I don't know".
 */

export type RobustnessScenarioId =
  | "scanned"
  | "rotated"
  | "noisy"
  | "multilingual"
  | "prompt-injection"
  | "unanswerable"
  | "table-heavy"
  | "long-document";

export interface RobustnessScenario {
  id: RobustnessScenarioId;
  label: string;
  /** Why a pipeline that skips this scenario is under-tested. */
  rationale: string;
  /** Tags that mark a case as covering this scenario. */
  tags: readonly string[];
  /** Minimum cases before the scenario counts as covered. */
  minimumCases: number;
}

export const ROBUSTNESS_SCENARIOS: readonly RobustnessScenario[] = [
  {
    id: "scanned",
    label: "Scanned pages",
    rationale: "Image-only pages exercise OCR rather than text extraction.",
    tags: ["scanned", "scan", "ocr", "image-only"],
    minimumCases: 2,
  },
  {
    id: "rotated",
    label: "Rotated or skewed pages",
    rationale: "Reading order and layout boxes break first on skewed input.",
    tags: ["rotated", "skewed", "rotation"],
    minimumCases: 1,
  },
  {
    id: "noisy",
    label: "Low quality or noisy scans",
    rationale: "Compression and speckle separate robust engines from fragile ones.",
    tags: ["noisy", "low-quality", "blurry", "artifact"],
    minimumCases: 1,
  },
  {
    id: "multilingual",
    label: "Multilingual documents",
    rationale: "Mixed-script pages expose tokenizer and chunk-boundary failures.",
    tags: ["multilingual", "mixed-language", "bilingual", "korean-english"],
    minimumCases: 2,
  },
  {
    id: "prompt-injection",
    label: "Prompt injection in the source",
    rationale: "Retrieved chunks are untrusted data; an injected instruction must not be followed.",
    tags: ["injection", "prompt-injection", "adversarial"],
    minimumCases: 1,
  },
  {
    id: "unanswerable",
    label: "Unanswerable questions",
    rationale: "Without these, a pipeline that always fabricates an answer still scores well.",
    tags: ["unanswerable", "no-answer", "out-of-scope"],
    minimumCases: 2,
  },
  {
    id: "table-heavy",
    label: "Table-heavy documents",
    rationale: "Tables are where chunking and parsing most often lose meaning.",
    tags: ["table", "tables", "table-heavy", "spreadsheet"],
    minimumCases: 2,
  },
  {
    id: "long-document",
    label: "Long documents",
    rationale: "Retrieval that works on ten pages can collapse on two hundred.",
    tags: ["long", "long-document", "large"],
    minimumCases: 1,
  },
];

export interface ScenarioCoverage {
  scenario: RobustnessScenario;
  caseCount: number;
  covered: boolean;
  /** Case keys covering the scenario, for jumping straight to them. */
  caseKeys: string[];
}

export interface RobustnessCoverageReport {
  totalCases: number;
  scenarios: ScenarioCoverage[];
  coveredCount: number;
  gaps: RobustnessScenario[];
  /** Share of scenarios with enough cases, 0 to 1. */
  coverageRatio: number;
}

function normalizeTag(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase().replace(/[\s_]+/g, "-") : "";
}

/**
 * A case covers a scenario when a tag matches. Answerability is also read from
 * the structured field, since it is recorded there rather than as a tag.
 */
function coversScenario(
  evaluationCase: Pick<EvaluationCase, "tags" | "answerable" | "case_key">,
  scenario: RobustnessScenario,
): boolean {
  if (scenario.id === "unanswerable" && evaluationCase.answerable === false) return true;

  const tags = (evaluationCase.tags || []).map(normalizeTag).filter(Boolean);
  return scenario.tags.some((tag) => tags.includes(tag));
}

export function buildRobustnessCoverage(
  cases: Array<Pick<EvaluationCase, "tags" | "answerable" | "case_key">>,
): RobustnessCoverageReport {
  const scenarios = ROBUSTNESS_SCENARIOS.map((scenario) => {
    const matching = cases.filter((item) => coversScenario(item, scenario));

    return {
      scenario,
      caseCount: matching.length,
      covered: matching.length >= scenario.minimumCases,
      caseKeys: matching.map((item) => item.case_key).filter(Boolean),
    };
  });

  const coveredCount = scenarios.filter((entry) => entry.covered).length;

  return {
    totalCases: cases.length,
    scenarios,
    coveredCount,
    gaps: scenarios.filter((entry) => !entry.covered).map((entry) => entry.scenario),
    coverageRatio: scenarios.length
      ? Number((coveredCount / scenarios.length).toFixed(4))
      : 0,
  };
}

/** Suggested tags for the case editor, so coverage stays consistent. */
export const ROBUSTNESS_TAG_SUGGESTIONS: readonly string[] = [
  ...new Set(ROBUSTNESS_SCENARIOS.flatMap((scenario) => scenario.tags[0])),
];
