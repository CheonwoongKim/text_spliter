import assert from "node:assert/strict";
import test from "node:test";

import {
  buildParserFocusAreas,
  differenceSegments,
  selectParserSpotCheckAreas,
} from "../lib/parser-focus-analysis";
import type { NormalizedDocument } from "../lib/document-ir";
import type { ParseResponse } from "../lib/types";

function documentWith(options: { paragraph?: string; includeTable?: boolean }): NormalizedDocument {
  const includeTable = options.includeTable !== false;
  return {
    schemaVersion: "1.0",
    pages: [{
      pageNumber: 1,
      blocks: [
        {
          id: "title",
          type: "title",
          pageNumber: 1,
          readingOrder: 0,
          text: "Quarterly report",
        },
        {
          id: "paragraph",
          type: "paragraph",
          pageNumber: 1,
          readingOrder: 1,
          text: options.paragraph || "Revenue increased by 18%.",
        },
        ...(includeTable ? [{
          id: "table",
          type: "table" as const,
          pageNumber: 1,
          readingOrder: 2,
          table: {
            rowCount: 1,
            columnCount: 2,
            cells: [
              { rowIndex: 0, columnIndex: 0, text: "Revenue" },
              { rowIndex: 0, columnIndex: 1, text: "18%" },
            ],
          },
        }] : []),
      ],
    }],
    statistics: {
      pageCount: 1,
      blockCount: includeTable ? 3 : 2,
      tableCount: includeTable ? 1 : 0,
      figureCount: 0,
      formulaCount: 0,
    },
  };
}

function run(
  id: string,
  engineId: string,
  role: "primary" | "additional",
  document: NormalizedDocument,
): ParseResponse {
  return {
    document,
    run: {
      id,
      engineId,
      provider: engineId,
      status: "succeeded",
      config: {},
      role,
      startedAt: "2026-08-07T00:00:00.000Z",
    },
  };
}

test("focus analysis finds changed and omitted document areas across engines", () => {
  const areas = buildParserFocusAreas([
    run("primary", "Primary parser", "primary", documentWith({})),
    run("additional", "Vision model", "additional", documentWith({
      paragraph: "Revenue increased by 13%.",
      includeTable: false,
    })),
  ]);

  const paragraph = areas.find((area) => area.blockType === "paragraph");
  const table = areas.find((area) => area.blockType === "table");
  const title = areas.find((area) => area.blockType === "title");

  assert.equal(title?.hasDisagreement, false);
  assert.equal(paragraph?.hasDisagreement, true);
  assert.equal(paragraph?.groups.length, 2);
  assert.match(paragraph?.reasons.join(" ") || "", /content differs/i);
  assert.equal(table?.hasDisagreement, true);
  assert.equal(table?.severity, "error");
  assert.equal(table?.groups.some((group) => group.missing), true);
  assert.equal(table?.variants.find((variant) => variant.runId === "additional")?.missing, true);
});

test("focus analysis is not biased by which engine is passed first", () => {
  const primary = run("primary", "Primary parser", "primary", documentWith({}));
  const additional = run("additional", "Vision model", "additional", documentWith({
    paragraph: "Revenue increased by 13%.",
    includeTable: false,
  }));
  const signature = (runs: ParseResponse[]) => buildParserFocusAreas(runs)
    .map((area) => ({
      page: area.pageNumber,
      type: area.blockType,
      groups: area.groups.map((group) => ({ missing: group.missing, count: group.engineCount })),
      disagreement: area.hasDisagreement,
    }))
    .sort((left, right) => left.type.localeCompare(right.type));

  assert.deepEqual(signature([primary, additional]), signature([additional, primary]));
});

test("source-region alignment survives different engine reading orders", () => {
  const region = (y: number) => ({
    coordinateSystem: "normalized" as const,
    polygon: [],
    boundingBox: { x: 0.1, y, width: 0.8, height: 0.1 },
  });
  const source = documentWith({});
  source.pages[0].blocks[0].region = region(0.1);
  source.pages[0].blocks[1].region = region(0.4);
  const reordered = documentWith({});
  reordered.pages[0].blocks[0].readingOrder = 1;
  reordered.pages[0].blocks[0].region = region(0.1);
  reordered.pages[0].blocks[1].readingOrder = 0;
  reordered.pages[0].blocks[1].region = region(0.4);

  const areas = buildParserFocusAreas([
    run("source", "Layout parser", "primary", source),
    run("reordered", "Vision parser", "additional", reordered),
  ]);
  const title = areas.find((area) => area.blockType === "title");

  assert.equal(title?.groups[0]?.engineCount, 2);
  assert.equal(title?.alignmentMethod, "source-region");
  assert.ok((title?.alignmentConfidence || 0) > 0.7);
});

test("spot checks include agreed high-risk areas", () => {
  const areas = buildParserFocusAreas([
    run("primary", "Primary parser", "primary", documentWith({})),
    run("additional", "Vision model", "additional", documentWith({})),
  ]);
  const spotChecks = selectParserSpotCheckAreas(areas, 2);

  assert.equal(spotChecks.length, 2);
  assert.equal(spotChecks[0]?.blockType, "table");
  assert.equal(spotChecks.every((area) => !area.hasDisagreement), true);
});

test("table comparison detects structural changes even when cell text is unchanged", () => {
  const reference = documentWith({});
  const candidate = documentWith({});
  const candidateTable = candidate.pages[0].blocks.find((block) => block.type === "table");
  candidateTable!.table!.cells[0].columnSpan = 2;

  const tableArea = buildParserFocusAreas([
    run("reference", "Reference parser", "primary", reference),
    run("candidate", "Candidate parser", "additional", candidate),
  ]).find((area) => area.blockType === "table");

  assert.equal(tableArea?.hasDisagreement, true);
  assert.equal(tableArea?.groups.length, 2);
  assert.match(tableArea?.reasons.join(" ") || "", /table cells or structure differ/i);
});

test("focus analysis highlights only the changed middle of a candidate", () => {
  assert.deepEqual(differenceSegments("Revenue increased by 18%.", "Revenue increased by 13%."), [
    { text: "Revenue increased by 1", changed: false },
    { text: "3", changed: true },
    { text: "%.", changed: false },
  ]);
});
