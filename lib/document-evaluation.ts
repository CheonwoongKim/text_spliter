import type {
  DocumentBlock,
  DocumentBlockType,
  DocumentPage,
  DocumentRegion,
  DocumentTable,
  NormalizedDocument,
} from "@/lib/document-ir";

export const DOCUMENT_EVALUATION_VERSION = "document-ir-eval-v1" as const;
export const DOCUMENT_EVALUATION_MAX_CANDIDATES = 5;
export const DOCUMENT_EVALUATION_MAX_BLOCK_PAIRS = 100_000;
export const DOCUMENT_EVALUATION_MAX_JSON_CHARACTERS = 10_000_000;

const DOCUMENT_EVALUATION_MAX_BLOCK_CONTENT_CHARACTERS = 250_000;
const DOCUMENT_EVALUATION_MAX_CONTENT_CHARACTERS = 5_000_000;

export class DocumentEvaluationLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DocumentEvaluationLimitError";
  }
}

export function isDocumentHash(value: unknown): value is string {
  return typeof value === "string" && /^[a-f0-9]{64}$/i.test(value);
}

export type DocumentEvaluationDimension =
  | "text"
  | "readingOrder"
  | "layout"
  | "structure"
  | "table"
  | "figure"
  | "caption"
  | "provenance";

export interface DocumentEvaluationIssue {
  code: string;
  dimension: DocumentEvaluationDimension;
  severity: "info" | "warning" | "error";
  pageNumber: number;
  referenceBlockId?: string;
  candidateBlockId?: string;
  blockType?: DocumentBlockType;
  score?: number;
  message: string;
}

export interface DocumentPageEvaluation {
  pageNumber: number;
  referenceBlockCount: number;
  candidateBlockCount: number;
  matchedBlockCount: number;
  textSimilarity: number | null;
  readingOrderAccuracy: number | null;
  layoutMeanIoU: number | null;
  issueCount: number;
}

export interface DocumentEvaluationMetrics {
  version: typeof DOCUMENT_EVALUATION_VERSION;
  textPrecision: number | null;
  textRecall: number | null;
  textF1: number | null;
  blockPrecision: number | null;
  blockRecall: number | null;
  blockF1: number | null;
  blockTypeAccuracy: number | null;
  readingOrderAccuracy: number | null;
  layoutMeanIoU: number | null;
  tableStructureScore: number | null;
  tableCellTextSimilarity: number | null;
  figureRecall: number | null;
  captionRecall: number | null;
  provenanceCompleteness: number | null;
  pageCountAccuracy: number | null;
  samples: {
    referencePages: number;
    candidatePages: number;
    referenceBlocks: number;
    candidateBlocks: number;
    matchedBlocks: number;
    textBlocks: number;
    layoutBlocks: number;
    orderPairs: number;
    tables: number;
    tableCells: number;
    figures: number;
    captions: number;
  };
  pages: DocumentPageEvaluation[];
}

export interface DocumentEvaluationResult {
  metrics: DocumentEvaluationMetrics;
  issues: DocumentEvaluationIssue[];
}

interface NormalizedBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface IndexedBlock {
  block: DocumentBlock;
  index: number;
  text: string;
  box: NormalizedBox | null;
}

interface BlockMatch {
  reference: IndexedBlock;
  candidate: IndexedBlock;
  matchScore: number;
  textScore: number | null;
  layoutIoU: number | null;
}

const MAX_ISSUES = 1000;
const FIGURE_TYPES = new Set<DocumentBlockType>(["figure", "chart", "diagram"]);
const DOCUMENT_BLOCK_TYPES = new Set<DocumentBlockType>([
  "title", "section-header", "paragraph", "list", "list-item", "table", "table-cell",
  "figure", "chart", "diagram", "caption", "formula", "code", "header", "footer",
  "footnote", "page-number", "key-value", "signature", "unknown",
]);

function roundMetric(value: number | null): number | null {
  return value === null || !Number.isFinite(value)
    ? null
    : Number(Math.max(0, Math.min(1, value)).toFixed(6));
}

function mean(values: number[]): number | null {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

function ratio(numerator: number, denominator: number): number | null {
  return denominator > 0 ? numerator / denominator : null;
}

function harmonicMean(left: number | null, right: number | null): number | null {
  if (left === null || right === null) return null;
  return left + right > 0 ? (2 * left * right) / (left + right) : 0;
}

export function normalizeEvaluationText(value: string | undefined): string {
  return (value || "")
    .normalize("NFC")
    .replace(/\r\n?/g, "\n")
    .replace(/[\t\f\v ]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function blockText(block: DocumentBlock): string {
  return normalizeEvaluationText(block.text || block.markdown || block.html);
}

function diceSimilarity(left: string, right: string): number {
  if (left === right) return 1;
  if (!left || !right) return 0;
  if (left.length < 3 || right.length < 3) {
    const leftSet = new Set(left);
    const rightSet = new Set(right);
    const overlap = [...leftSet].filter((value) => rightSet.has(value)).length;
    return (2 * overlap) / (leftSet.size + rightSet.size);
  }
  const grams = new Map<string, number>();
  for (let index = 0; index <= left.length - 3; index += 1) {
    const gram = left.slice(index, index + 3);
    grams.set(gram, (grams.get(gram) || 0) + 1);
  }
  let overlap = 0;
  for (let index = 0; index <= right.length - 3; index += 1) {
    const gram = right.slice(index, index + 3);
    const count = grams.get(gram) || 0;
    if (count > 0) {
      overlap += 1;
      grams.set(gram, count - 1);
    }
  }
  return (2 * overlap) / ((left.length - 2) + (right.length - 2));
}

function sequenceEditSimilarity<T>(left: T[], right: T[]): number {
  if (left.length === 0 && right.length === 0) return 1;
  if (left.length === 0 || right.length === 0) return 0;
  if (left.length > right.length) return sequenceEditSimilarity(right, left);
  let previous = Array.from({ length: left.length + 1 }, (_, index) => index);
  let current = new Array<number>(left.length + 1);
  for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
    current[0] = rightIndex;
    for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
      const substitution = previous[leftIndex - 1] + (left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1);
      current[leftIndex] = Math.min(
        previous[leftIndex] + 1,
        current[leftIndex - 1] + 1,
        substitution
      );
    }
    [previous, current] = [current, previous];
  }
  return 1 - previous[left.length] / Math.max(left.length, right.length);
}

export function normalizedEditSimilarity(leftValue: string, rightValue: string): number {
  const left = normalizeEvaluationText(leftValue);
  const right = normalizeEvaluationText(rightValue);
  if (left === right) return 1;
  if (!left || !right) return 0;
  if (left.length * right.length <= 1_500_000) {
    return sequenceEditSimilarity(Array.from(left), Array.from(right));
  }
  const leftTokens = left.split(/\s+/);
  const rightTokens = right.split(/\s+/);
  if (leftTokens.length * rightTokens.length <= 1_500_000) {
    return sequenceEditSimilarity(leftTokens, rightTokens);
  }
  return diceSimilarity(left, right);
}

function regionBox(region: DocumentRegion | undefined, page: DocumentPage): NormalizedBox | null {
  const box = region?.boundingBox;
  if (!box || box.width < 0 || box.height < 0) return null;
  if (region.coordinateSystem === "normalized") return box;
  if (page.width && page.height && page.width > 0 && page.height > 0) {
    return {
      x: box.x / page.width,
      y: box.y / page.height,
      width: box.width / page.width,
      height: box.height / page.height,
    };
  }
  return null;
}

export function intersectionOverUnion(left: NormalizedBox, right: NormalizedBox): number {
  const intersectionWidth = Math.max(0, Math.min(left.x + left.width, right.x + right.width) - Math.max(left.x, right.x));
  const intersectionHeight = Math.max(0, Math.min(left.y + left.height, right.y + right.height) - Math.max(left.y, right.y));
  const intersection = intersectionWidth * intersectionHeight;
  const union = left.width * left.height + right.width * right.height - intersection;
  return union > 0 ? intersection / union : 0;
}

function typeFamily(type: DocumentBlockType): string {
  if (FIGURE_TYPES.has(type)) return "figure";
  if (["title", "section-header"].includes(type)) return "heading";
  if (["list", "list-item"].includes(type)) return "list";
  if (["header", "footer", "page-number", "footnote"].includes(type)) return "furniture";
  return type;
}

function indexedBlocks(page: DocumentPage): IndexedBlock[] {
  return page.blocks.map((block, index) => ({
    block,
    index,
    text: blockText(block),
    box: regionBox(block.region, page),
  }));
}

function matchPageBlocks(referencePage: DocumentPage, candidatePage: DocumentPage): {
  matches: BlockMatch[];
  unmatchedReference: IndexedBlock[];
  unmatchedCandidate: IndexedBlock[];
} {
  const reference = indexedBlocks(referencePage);
  const candidate = indexedBlocks(candidatePage);
  const pairs: Array<{ referenceIndex: number; candidateIndex: number; score: number }> = [];

  reference.forEach((referenceBlock, referenceIndex) => {
    candidate.forEach((candidateBlock, candidateIndex) => {
      const exactType = referenceBlock.block.type === candidateBlock.block.type;
      const sameFamily = typeFamily(referenceBlock.block.type) === typeFamily(candidateBlock.block.type);
      const textScore = referenceBlock.text || candidateBlock.text
        ? diceSimilarity(referenceBlock.text, candidateBlock.text)
        : null;
      const layoutScore = referenceBlock.box && candidateBlock.box
        ? intersectionOverUnion(referenceBlock.box, candidateBlock.box)
        : null;
      const maxPosition = Math.max(1, reference.length - 1, candidate.length - 1);
      const positionScore = 1 - Math.min(1, Math.abs(referenceBlock.index - candidateBlock.index) / maxPosition);
      const score = (exactType ? 0.3 : sameFamily ? 0.15 : 0)
        + (textScore === null ? 0 : textScore * 0.45)
        + (layoutScore === null ? 0 : layoutScore * 0.2)
        + positionScore * 0.05;
      if (score >= 0.32) pairs.push({ referenceIndex, candidateIndex, score });
    });
  });

  pairs.sort((left, right) => right.score - left.score);
  const usedReference = new Set<number>();
  const usedCandidate = new Set<number>();
  const matches: BlockMatch[] = [];
  for (const pair of pairs) {
    if (usedReference.has(pair.referenceIndex) || usedCandidate.has(pair.candidateIndex)) continue;
    const referenceBlock = reference[pair.referenceIndex];
    const candidateBlock = candidate[pair.candidateIndex];
    usedReference.add(pair.referenceIndex);
    usedCandidate.add(pair.candidateIndex);
    matches.push({
      reference: referenceBlock,
      candidate: candidateBlock,
      matchScore: pair.score,
      textScore: referenceBlock.text || candidateBlock.text
        ? normalizedEditSimilarity(referenceBlock.text, candidateBlock.text)
        : null,
      layoutIoU: referenceBlock.box && candidateBlock.box
        ? intersectionOverUnion(referenceBlock.box, candidateBlock.box)
        : null,
    });
  }

  return {
    matches,
    unmatchedReference: reference.filter((_, index) => !usedReference.has(index)),
    unmatchedCandidate: candidate.filter((_, index) => !usedCandidate.has(index)),
  };
}

function dimensionAccuracy(referenceValue: number | undefined, candidateValue: number | undefined): number {
  if (referenceValue === undefined && candidateValue === undefined) return 1;
  if (referenceValue === undefined || candidateValue === undefined) return 0;
  const maximum = Math.max(1, referenceValue, candidateValue);
  return 1 - Math.abs(referenceValue - candidateValue) / maximum;
}

function tableScores(reference: DocumentTable | undefined, candidate: DocumentTable | undefined): {
  structure: number | null;
  cellText: number | null;
  cellCount: number;
} {
  if (!reference || reference.cells.length === 0) return { structure: null, cellText: null, cellCount: 0 };
  if (!candidate) return { structure: 0, cellText: 0, cellCount: reference.cells.length };
  const inferredDimensions = (table: DocumentTable) => ({
    rows: table.rowCount ?? Math.max(0, ...table.cells.map((cell) => cell.rowIndex + (cell.rowSpan || 1))),
    columns: table.columnCount ?? Math.max(0, ...table.cells.map((cell) => cell.columnIndex + (cell.columnSpan || 1))),
  });
  const referenceDimensions = inferredDimensions(reference);
  const candidateDimensions = inferredDimensions(candidate);
  const referenceCells = new Map(reference.cells.map((cell) => [`${cell.rowIndex}:${cell.columnIndex}`, cell]));
  const candidateCells = new Map(candidate.cells.map((cell) => [`${cell.rowIndex}:${cell.columnIndex}`, cell]));
  let matchedPositions = 0;
  const spanScores: number[] = [];
  const textScores: number[] = [];
  for (const referenceCell of reference.cells) {
    const candidateCell = candidateCells.get(`${referenceCell.rowIndex}:${referenceCell.columnIndex}`);
    if (!candidateCell) {
      textScores.push(0);
      continue;
    }
    matchedPositions += 1;
    const rowSpanMatch = (referenceCell.rowSpan || 1) === (candidateCell.rowSpan || 1) ? 1 : 0;
    const columnSpanMatch = (referenceCell.columnSpan || 1) === (candidateCell.columnSpan || 1) ? 1 : 0;
    const headerMatch = Boolean(referenceCell.isHeader) === Boolean(candidateCell.isHeader) ? 1 : 0;
    spanScores.push((rowSpanMatch + columnSpanMatch + headerMatch) / 3);
    textScores.push(normalizedEditSimilarity(referenceCell.text || "", candidateCell.text || ""));
  }
  for (const [position] of candidateCells) {
    if (!referenceCells.has(position)) textScores.push(0);
  }
  const positionPrecision = ratio(matchedPositions, candidate.cells.length) ?? 0;
  const positionRecall = ratio(matchedPositions, reference.cells.length) ?? 0;
  const positionF1 = harmonicMean(positionPrecision, positionRecall) ?? 0;
  const spanAndHeaderAccuracy = spanScores.reduce((sum, score) => sum + score, 0)
    / Math.max(reference.cells.length, candidate.cells.length, 1);
  const structure = mean([
    dimensionAccuracy(referenceDimensions.rows, candidateDimensions.rows),
    dimensionAccuracy(referenceDimensions.columns, candidateDimensions.columns),
    positionF1,
    spanAndHeaderAccuracy,
  ]) || 0;
  return { structure, cellText: mean(textScores), cellCount: reference.cells.length };
}

function readingOrderScore(matches: BlockMatch[]): { score: number | null; pairs: number; inversions: number } {
  if (matches.length < 2) return { score: null, pairs: 0, inversions: 0 };
  const sorted = [...matches].sort((left, right) => {
    const leftOrder = left.reference.block.readingOrder ?? left.reference.index;
    const rightOrder = right.reference.block.readingOrder ?? right.reference.index;
    return leftOrder - rightOrder;
  });
  let pairs = 0;
  let concordant = 0;
  for (let leftIndex = 0; leftIndex < sorted.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < sorted.length; rightIndex += 1) {
      pairs += 1;
      const leftOrder = sorted[leftIndex].candidate.block.readingOrder ?? sorted[leftIndex].candidate.index;
      const rightOrder = sorted[rightIndex].candidate.block.readingOrder ?? sorted[rightIndex].candidate.index;
      if (leftOrder < rightOrder) concordant += 1;
    }
  }
  return { score: pairs ? concordant / pairs : null, pairs, inversions: pairs - concordant };
}

function provenanceScore(block: DocumentBlock): number {
  const fields = [
    Boolean(block.id),
    Number.isInteger(block.pageNumber) && block.pageNumber > 0,
    typeof block.readingOrder === "number" && Number.isFinite(block.readingOrder),
    Boolean(block.region?.boundingBox),
    Boolean(block.source && (
      block.source.providerObjectId
      || block.source.providerObjectType
      || Number.isInteger(block.source.providerIndex)
    )),
  ];
  return fields.filter(Boolean).length / fields.length;
}

function pushIssue(issues: DocumentEvaluationIssue[], issue: DocumentEvaluationIssue): void {
  if (issues.length < MAX_ISSUES) issues.push(issue);
}

export function estimateDocumentEvaluationBlockPairs(
  reference: NormalizedDocument,
  candidate: NormalizedDocument
): number {
  const candidatePages = new Map(candidate.pages.map((page) => [page.pageNumber, page.blocks.length]));
  return reference.pages.reduce(
    (total, page) => total + page.blocks.length * (candidatePages.get(page.pageNumber) || 0),
    0
  );
}

export function assertDocumentEvaluationWorkload(
  reference: NormalizedDocument,
  candidate: NormalizedDocument
): void {
  const blockPairs = estimateDocumentEvaluationBlockPairs(reference, candidate);
  if (blockPairs > DOCUMENT_EVALUATION_MAX_BLOCK_PAIRS) {
    throw new DocumentEvaluationLimitError(
      `Document comparison requires ${blockPairs.toLocaleString()} block pairs; the limit is ${DOCUMENT_EVALUATION_MAX_BLOCK_PAIRS.toLocaleString()}. Split the document or reduce blocks per page.`
    );
  }
}

export function evaluateDocumentIR(
  reference: NormalizedDocument,
  candidate: NormalizedDocument
): DocumentEvaluationResult {
  assertDocumentEvaluationWorkload(reference, candidate);
  const referencePages = new Map(reference.pages.map((page) => [page.pageNumber, page]));
  const candidatePages = new Map(candidate.pages.map((page) => [page.pageNumber, page]));
  const pageNumbers = [...new Set([...referencePages.keys(), ...candidatePages.keys()])].sort((left, right) => left - right);
  const issues: DocumentEvaluationIssue[] = [];
  const pages: DocumentPageEvaluation[] = [];
  const allMatches: BlockMatch[] = [];
  const allUnmatchedReference: IndexedBlock[] = [];
  const allUnmatchedCandidate: IndexedBlock[] = [];
  let orderPairs = 0;
  let orderConcordant = 0;

  if (reference.pages.length !== candidate.pages.length) {
    pushIssue(issues, {
      code: "page-count-mismatch",
      dimension: "structure",
      severity: "error",
      pageNumber: 1,
      score: Math.min(reference.pages.length, candidate.pages.length) / Math.max(1, reference.pages.length, candidate.pages.length),
      message: `Expected ${reference.pages.length} pages but parsed ${candidate.pages.length}.`,
    });
  }

  for (const pageNumber of pageNumbers) {
    const referencePage = referencePages.get(pageNumber) || { pageNumber, blocks: [] };
    const candidatePage = candidatePages.get(pageNumber) || { pageNumber, blocks: [] };
    const pageIssueStart = issues.length;
    const matched = matchPageBlocks(referencePage, candidatePage);
    allMatches.push(...matched.matches);
    allUnmatchedReference.push(...matched.unmatchedReference);
    allUnmatchedCandidate.push(...matched.unmatchedCandidate);

    for (const block of matched.unmatchedReference) {
      pushIssue(issues, {
        code: "missing-block",
        dimension: FIGURE_TYPES.has(block.block.type) ? "figure" : block.block.type === "caption" ? "caption" : "structure",
        severity: ["table", "figure", "chart", "diagram"].includes(block.block.type) ? "error" : "warning",
        pageNumber,
        referenceBlockId: block.block.id,
        blockType: block.block.type,
        message: `Missing ${block.block.type} block from the reference document.`,
      });
    }
    for (const block of matched.unmatchedCandidate) {
      pushIssue(issues, {
        code: "extra-block",
        dimension: "structure",
        severity: "info",
        pageNumber,
        candidateBlockId: block.block.id,
        blockType: block.block.type,
        message: `Candidate contains an unmatched ${block.block.type} block.`,
      });
    }
    for (const match of matched.matches) {
      if (match.reference.block.type !== match.candidate.block.type) {
        pushIssue(issues, {
          code: "block-type-mismatch",
          dimension: "structure",
          severity: "warning",
          pageNumber,
          referenceBlockId: match.reference.block.id,
          candidateBlockId: match.candidate.block.id,
          blockType: match.reference.block.type,
          message: `Expected ${match.reference.block.type}, parsed ${match.candidate.block.type}.`,
        });
      }
      if (match.textScore !== null && match.textScore < 0.8) {
        pushIssue(issues, {
          code: "low-text-fidelity",
          dimension: "text",
          severity: match.textScore < 0.5 ? "error" : "warning",
          pageNumber,
          referenceBlockId: match.reference.block.id,
          candidateBlockId: match.candidate.block.id,
          blockType: match.reference.block.type,
          score: roundMetric(match.textScore) || 0,
          message: "Matched block has low normalized text similarity.",
        });
      }
      if (match.layoutIoU !== null && match.layoutIoU < 0.5) {
        pushIssue(issues, {
          code: "low-layout-overlap",
          dimension: "layout",
          severity: match.layoutIoU < 0.25 ? "error" : "warning",
          pageNumber,
          referenceBlockId: match.reference.block.id,
          candidateBlockId: match.candidate.block.id,
          blockType: match.reference.block.type,
          score: roundMetric(match.layoutIoU) || 0,
          message: "Matched block has low bounding-box IoU.",
        });
      }
    }

    const order = readingOrderScore(matched.matches);
    orderPairs += order.pairs;
    orderConcordant += order.pairs - order.inversions;
    if (order.inversions > 0) {
      pushIssue(issues, {
        code: "reading-order-inversion",
        dimension: "readingOrder",
        severity: order.score !== null && order.score < 0.8 ? "error" : "warning",
        pageNumber,
        score: roundMetric(order.score) ?? undefined,
        message: `${order.inversions} of ${order.pairs} matched block pairs are out of order.`,
      });
    }
    const pageTextScores = matched.matches
      .map((match) => match.textScore)
      .filter((score): score is number => score !== null);
    const pageLayoutScores = matched.matches
      .map((match) => match.layoutIoU)
      .filter((score): score is number => score !== null);
    pages.push({
      pageNumber,
      referenceBlockCount: referencePage.blocks.length,
      candidateBlockCount: candidatePage.blocks.length,
      matchedBlockCount: matched.matches.length,
      textSimilarity: roundMetric(mean(pageTextScores)),
      readingOrderAccuracy: roundMetric(order.score),
      layoutMeanIoU: roundMetric(mean(pageLayoutScores)),
      issueCount: issues.length - pageIssueStart,
    });
  }

  const referenceBlocks = reference.pages.flatMap((page) => page.blocks);
  const candidateBlocks = candidate.pages.flatMap((page) => page.blocks);
  const referenceTextBlocks = referenceBlocks.filter((block) => blockText(block));
  const candidateTextBlocks = candidateBlocks.filter((block) => blockText(block));
  let textRecallNumerator = 0;
  let textPrecisionNumerator = 0;
  for (const match of allMatches) {
    if (match.textScore === null) continue;
    textRecallNumerator += match.reference.text.length * match.textScore;
    textPrecisionNumerator += match.candidate.text.length * match.textScore;
  }
  const referenceTextLength = referenceTextBlocks.reduce((sum, block) => sum + blockText(block).length, 0);
  const candidateTextLength = candidateTextBlocks.reduce((sum, block) => sum + blockText(block).length, 0);
  const textRecall = ratio(textRecallNumerator, referenceTextLength);
  const textPrecision = ratio(textPrecisionNumerator, candidateTextLength);
  const blockRecall = ratio(allMatches.length, referenceBlocks.length);
  const blockPrecision = ratio(allMatches.length, candidateBlocks.length);
  const layoutScores = allMatches.map((match) => match.layoutIoU).filter((score): score is number => score !== null);
  const typeAccuracy = ratio(
    allMatches.filter((match) => match.reference.block.type === match.candidate.block.type).length,
    allMatches.length
  );

  const referenceTables = referenceBlocks.filter((block) => block.type === "table");
  const tableStructureScores: number[] = [];
  const tableCellTextScores: number[] = [];
  let tableCellCount = 0;
  for (const referenceTable of referenceTables) {
    const match = allMatches.find((item) => item.reference.block.id === referenceTable.id);
    const result = tableScores(referenceTable.table, match?.candidate.block.type === "table" ? match.candidate.block.table : undefined);
    if (result.structure !== null) tableStructureScores.push(result.structure);
    if (result.cellText !== null) tableCellTextScores.push(result.cellText);
    tableCellCount += result.cellCount;
    if (result.structure !== null && result.structure < 0.95) {
      pushIssue(issues, {
        code: "low-table-structure",
        dimension: "table",
        severity: result.structure < 0.5 ? "error" : "warning",
        pageNumber: referenceTable.pageNumber,
        referenceBlockId: referenceTable.id,
        candidateBlockId: match?.candidate.block.id,
        blockType: "table",
        score: roundMetric(result.structure) || 0,
        message: "Table rows, columns, cell positions, spans, or headers differ from the reference.",
      });
    }
    if (result.cellText !== null && result.cellText < 0.95) {
      pushIssue(issues, {
        code: "low-table-cell-text",
        dimension: "table",
        severity: result.cellText < 0.5 ? "error" : "warning",
        pageNumber: referenceTable.pageNumber,
        referenceBlockId: referenceTable.id,
        candidateBlockId: match?.candidate.block.id,
        blockType: "table",
        score: roundMetric(result.cellText) || 0,
        message: "Table cell text differs from the reference or contains missing or extra cells.",
      });
    }
  }

  const referenceFigures = referenceBlocks.filter((block) => FIGURE_TYPES.has(block.type));
  const matchedFigures = referenceFigures.filter((block) => allMatches.some((match) =>
    match.reference.block.id === block.id && FIGURE_TYPES.has(match.candidate.block.type)
  )).length;
  const referenceCaptions = referenceBlocks.filter((block) => block.type === "caption");
  const matchedCaptions = referenceCaptions.filter((block) => allMatches.some((match) =>
    match.reference.block.id === block.id && match.candidate.block.type === "caption"
  )).length;

  const metrics: DocumentEvaluationMetrics = {
    version: DOCUMENT_EVALUATION_VERSION,
    textPrecision: roundMetric(textPrecision),
    textRecall: roundMetric(textRecall),
    textF1: roundMetric(harmonicMean(textPrecision, textRecall)),
    blockPrecision: roundMetric(blockPrecision),
    blockRecall: roundMetric(blockRecall),
    blockF1: roundMetric(harmonicMean(blockPrecision, blockRecall)),
    blockTypeAccuracy: roundMetric(typeAccuracy),
    readingOrderAccuracy: roundMetric(orderPairs ? orderConcordant / orderPairs : null),
    layoutMeanIoU: roundMetric(mean(layoutScores)),
    tableStructureScore: roundMetric(mean(tableStructureScores)),
    tableCellTextSimilarity: roundMetric(mean(tableCellTextScores)),
    figureRecall: roundMetric(ratio(matchedFigures, referenceFigures.length)),
    captionRecall: roundMetric(ratio(matchedCaptions, referenceCaptions.length)),
    provenanceCompleteness: roundMetric(mean(candidateBlocks.map(provenanceScore))),
    pageCountAccuracy: roundMetric(reference.pages.length === candidate.pages.length
      ? 1
      : Math.min(reference.pages.length, candidate.pages.length)
        / Math.max(1, reference.pages.length, candidate.pages.length)),
    samples: {
      referencePages: reference.pages.length,
      candidatePages: candidate.pages.length,
      referenceBlocks: referenceBlocks.length,
      candidateBlocks: candidateBlocks.length,
      matchedBlocks: allMatches.length,
      textBlocks: referenceTextBlocks.length,
      layoutBlocks: layoutScores.length,
      orderPairs,
      tables: referenceTables.length,
      tableCells: tableCellCount,
      figures: referenceFigures.length,
      captions: referenceCaptions.length,
    },
    pages,
  };

  return { metrics, issues };
}

export function assertNormalizedDocument(value: unknown, label = "Document IR"): asserts value is NormalizedDocument {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object.`);
  }
  const document = value as Partial<NormalizedDocument>;
  if (document.schemaVersion !== "1.0" || !Array.isArray(document.pages)) {
    throw new Error(`${label} must use Document IR schema version 1.0.`);
  }
  if (!document.statistics || typeof document.statistics !== "object") {
    throw new Error(`${label} must include document statistics.`);
  }
  if (document.pages.length > 2000) throw new Error(`${label} contains too many pages.`);
  let blockCount = 0;
  let tableCellCount = 0;
  let contentCharacterCount = 0;
  const blockIds = new Set<string>();
  const pageNumbers = new Set<number>();
  for (const page of document.pages) {
    if (!page || !Number.isInteger(page.pageNumber) || page.pageNumber < 1 || !Array.isArray(page.blocks)) {
      throw new Error(`${label} contains an invalid page.`);
    }
    if (pageNumbers.has(page.pageNumber)) throw new Error(`${label} contains duplicate page numbers.`);
    pageNumbers.add(page.pageNumber);
    if ((page.width !== undefined && (!Number.isFinite(page.width) || page.width <= 0))
      || (page.height !== undefined && (!Number.isFinite(page.height) || page.height <= 0))) {
      throw new Error(`${label} contains invalid page dimensions.`);
    }
    if (page.blocks.length > 2000) throw new Error(`${label} contains too many blocks on one page.`);
    blockCount += page.blocks.length;
    if (blockCount > 20_000) throw new Error(`${label} contains too many blocks.`);
    for (const block of page.blocks) {
      if (!block || typeof block.id !== "string" || !block.id || !DOCUMENT_BLOCK_TYPES.has(block.type)) {
        throw new Error(`${label} contains an invalid block.`);
      }
      if (!Number.isInteger(block.pageNumber) || block.pageNumber !== page.pageNumber) {
        throw new Error(`${label} contains a block assigned to the wrong page.`);
      }
      if (block.readingOrder !== undefined && !Number.isFinite(block.readingOrder)) {
        throw new Error(`${label} contains an invalid reading order.`);
      }
      if ([block.text, block.markdown, block.html].some((text) => text !== undefined && typeof text !== "string")) {
        throw new Error(`${label} contains invalid block content.`);
      }
      for (const content of [block.text, block.markdown, block.html]) {
        if (!content) continue;
        if (content.length > DOCUMENT_EVALUATION_MAX_BLOCK_CONTENT_CHARACTERS) {
          throw new Error(`${label} contains a block with too much content.`);
        }
        contentCharacterCount += content.length;
      }
      if (contentCharacterCount > DOCUMENT_EVALUATION_MAX_CONTENT_CHARACTERS) {
        throw new Error(`${label} contains too much text content.`);
      }
      const box = block.region?.boundingBox;
      if (box && (![box.x, box.y, box.width, box.height].every(Number.isFinite) || box.width < 0 || box.height < 0)) {
        throw new Error(`${label} contains an invalid bounding box.`);
      }
      if (block.table !== undefined) {
        if (!block.table || !Array.isArray(block.table.cells) || block.table.cells.length > 10_000) {
          throw new Error(`${label} contains an invalid table.`);
        }
        tableCellCount += block.table.cells.length;
        if (tableCellCount > 50_000) throw new Error(`${label} contains too many table cells.`);
        for (const cell of block.table.cells) {
          if (!cell || !Number.isInteger(cell.rowIndex) || cell.rowIndex < 0
            || !Number.isInteger(cell.columnIndex) || cell.columnIndex < 0
            || (cell.rowSpan !== undefined && (!Number.isInteger(cell.rowSpan) || cell.rowSpan < 1))
            || (cell.columnSpan !== undefined && (!Number.isInteger(cell.columnSpan) || cell.columnSpan < 1))
            || (cell.text !== undefined && typeof cell.text !== "string")) {
            throw new Error(`${label} contains an invalid table cell.`);
          }
          if (cell.text) {
            if (cell.text.length > DOCUMENT_EVALUATION_MAX_BLOCK_CONTENT_CHARACTERS) {
              throw new Error(`${label} contains a table cell with too much content.`);
            }
            contentCharacterCount += cell.text.length;
            if (contentCharacterCount > DOCUMENT_EVALUATION_MAX_CONTENT_CHARACTERS) {
              throw new Error(`${label} contains too much text content.`);
            }
          }
        }
      }
      if (blockIds.has(block.id)) throw new Error(`${label} contains duplicate block IDs.`);
      blockIds.add(block.id);
    }
  }
}
