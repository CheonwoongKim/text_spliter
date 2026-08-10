import {
  normalizeEvaluationText,
  normalizedEditSimilarity,
} from "@/lib/document-evaluation";
import type {
  DocumentBlock,
  DocumentBlockType,
  DocumentPage,
  DocumentRegion,
  DocumentTable,
} from "@/lib/document-ir";
import type { ParseResponse } from "@/lib/types";

export type ParserAlignmentMethod = "source-region" | "reading-order" | "content";

export interface ParserFocusVariant {
  runId: string;
  engine: string;
  role: "primary" | "additional" | "run";
  blockId?: string;
  blockType?: DocumentBlockType;
  content: string;
  missing: boolean;
  confidence?: number;
  region?: DocumentRegion;
  table?: DocumentTable;
  similarityToConsensus: number | null;
  matchesConsensus: boolean;
}

export interface ParserFocusVariantGroup {
  id: string;
  runIds: string[];
  engines: string[];
  engineCount: number;
  content: string;
  missing: boolean;
  blockType?: DocumentBlockType;
  table?: DocumentTable;
  variants: ParserFocusVariant[];
}

export interface ParserFocusArea {
  id: string;
  pageNumber: number;
  order: number;
  label: string;
  blockType: DocumentBlockType;
  region?: DocumentRegion;
  variants: ParserFocusVariant[];
  groups: ParserFocusVariantGroup[];
  hasDisagreement: boolean;
  severity: "info" | "warning" | "error";
  agreementCount: number;
  engineCount: number;
  consensusContent: string;
  majorityGroupId?: string;
  alignmentConfidence: number;
  alignmentMethod: ParserAlignmentMethod;
  reasons: string[];
}

interface NormalizedBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface RunBlock {
  runId: string;
  engine: string;
  role: ParserFocusVariant["role"];
  pageNumber: number;
  pageWidth?: number;
  pageHeight?: number;
  order: number;
  block: DocumentBlock;
  content: string;
  box: NormalizedBox | null;
}

interface AreaSlot {
  id: string;
  pageNumber: number;
  order: number;
  members: Map<string, RunBlock>;
  matchScores: number[];
  matchMethods: ParserAlignmentMethod[];
}

interface MatchResult {
  score: number;
  method: ParserAlignmentMethod;
}

const MAX_FOCUS_AREAS = 1_000;
const MAX_BLOCK_CONTENT = 8_000;
const HIGH_RISK_TYPES = new Set<DocumentBlockType>([
  "table", "figure", "chart", "diagram", "formula", "key-value",
]);

function runId(run: ParseResponse, index: number): string {
  return run.run?.id || `legacy-run-${index}`;
}

function engineLabel(run: ParseResponse, index: number): string {
  return run.run?.engineId || run.metadata?.parserType || `Run ${index + 1}`;
}

function runRole(run: ParseResponse): ParserFocusVariant["role"] {
  if (run.run?.role === "primary") return "primary";
  if (run.run?.role === "additional") return "additional";
  return "run";
}

function stripHtml(value: string): string {
  return value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function tableContent(block: DocumentBlock): string {
  if (!block.table?.cells.length) return "";
  const dimensions = `${block.table.rowCount ?? "?"}x${block.table.columnCount ?? "?"}`;
  const cells = block.table.cells.map((cell) => (
    `[${cell.rowIndex + 1},${cell.columnIndex + 1};${cell.rowSpan || 1}x${cell.columnSpan || 1};${cell.isHeader ? "header" : "cell"}] ${cell.text || ""}`
  ));
  return [dimensions, ...cells].join("\n");
}

function blockContent(block: DocumentBlock): string {
  const content = block.type === "table"
    ? tableContent(block) || block.markdown || block.text || stripHtml(block.html || "")
    : block.text || block.markdown || stripHtml(block.html || "");
  return content.slice(0, MAX_BLOCK_CONTENT).trim();
}

function fallbackContent(run: ParseResponse): string {
  if (run.markdown) return run.markdown;
  if (run.text) return run.text;
  if (run.html) return stripHtml(run.html);
  if (run.json) return JSON.stringify(run.json, null, 2);
  return "";
}

function pagesForRun(run: ParseResponse): DocumentPage[] {
  if (run.document?.pages.length) return run.document.pages;
  if (run.pages?.length) {
    return run.pages.map((page) => ({
      pageNumber: page.pageNumber,
      width: page.width,
      height: page.height,
      blocks: [{
        id: `fallback-page-${page.pageNumber}`,
        type: "paragraph",
        pageNumber: page.pageNumber,
        readingOrder: 0,
        text: page.text || page.markdown || "",
      }],
    }));
  }
  const content = fallbackContent(run);
  return content ? [{
    pageNumber: 1,
    blocks: [{
      id: "fallback-document",
      type: "paragraph",
      pageNumber: 1,
      readingOrder: 0,
      text: content,
    }],
  }] : [];
}

function normalizedBox(block: DocumentBlock, page: DocumentPage): NormalizedBox | null {
  const box = block.region?.boundingBox;
  if (!box || box.width < 0 || box.height < 0) return null;
  if (block.region?.coordinateSystem === "normalized") return box;
  if (!page.width || !page.height || page.width <= 0 || page.height <= 0) return null;
  return {
    x: box.x / page.width,
    y: box.y / page.height,
    width: box.width / page.width,
    height: box.height / page.height,
  };
}

function blocksForRun(run: ParseResponse, index: number): RunBlock[] {
  const id = runId(run, index);
  const engine = engineLabel(run, index);
  const role = runRole(run);
  return pagesForRun(run).flatMap((page) => page.blocks.map((block, blockIndex) => ({
    runId: id,
    engine,
    role,
    pageNumber: page.pageNumber,
    pageWidth: page.width,
    pageHeight: page.height,
    order: block.readingOrder ?? blockIndex,
    block,
    content: blockContent(block),
    box: normalizedBox(block, page),
  })));
}

function intersectionOverUnion(left: NormalizedBox, right: NormalizedBox): number {
  const width = Math.max(0, Math.min(left.x + left.width, right.x + right.width) - Math.max(left.x, right.x));
  const height = Math.max(0, Math.min(left.y + left.height, right.y + right.height) - Math.max(left.y, right.y));
  const intersection = width * height;
  const union = left.width * left.height + right.width * right.height - intersection;
  return union > 0 ? intersection / union : 0;
}

function centerSimilarity(left: NormalizedBox, right: NormalizedBox): number {
  const leftX = left.x + left.width / 2;
  const leftY = left.y + left.height / 2;
  const rightX = right.x + right.width / 2;
  const rightY = right.y + right.height / 2;
  const distance = Math.sqrt((leftX - rightX) ** 2 + (leftY - rightY) ** 2);
  return Math.max(0, 1 - distance * 2);
}

function blockMatch(left: RunBlock, right: RunBlock): MatchResult {
  if (left.pageNumber !== right.pageNumber || left.runId === right.runId) {
    return { score: -1, method: "content" };
  }
  const sameType = left.block.type === right.block.type ? 1 : 0;
  const orderDistance = Math.abs(left.order - right.order);
  const orderScore = Math.max(0, 1 - orderDistance / 4);
  const textScore = left.content && right.content
    ? normalizedEditSimilarity(left.content, right.content)
    : 0;

  if (left.box && right.box) {
    const geometry = Math.max(
      intersectionOverUnion(left.box, right.box),
      centerSimilarity(left.box, right.box) * 0.8,
    );
    return {
      score: geometry * 0.55 + sameType * 0.15 + orderScore * 0.15 + textScore * 0.15,
      method: "source-region",
    };
  }

  const score = sameType * 0.25 + orderScore * 0.35 + textScore * 0.4;
  return {
    score,
    method: textScore > 0.8 && orderScore < 0.75 ? "content" : "reading-order",
  };
}

function slotMatch(slot: AreaSlot, block: RunBlock): MatchResult {
  return [...slot.members.values()].reduce<MatchResult>((best, member) => {
    const match = blockMatch(member, block);
    return match.score > best.score ? match : best;
  }, { score: -1, method: "content" });
}

function createSlots(runBlocks: RunBlock[][]): AreaSlot[] {
  const stream = runBlocks
    .flat()
    .sort((left, right) => (
      left.pageNumber - right.pageNumber
      || Number(Boolean(right.box)) - Number(Boolean(left.box))
      || left.order - right.order
      || left.runId.localeCompare(right.runId)
    ));
  const slots: AreaSlot[] = [];
  const slotsByPage = new Map<number, AreaSlot[]>();

  for (const block of stream) {
    const pageSlots = slotsByPage.get(block.pageNumber) || [];
    const candidates = pageSlots
      .filter((slot) => !slot.members.has(block.runId))
      .map((slot) => ({ slot, match: slotMatch(slot, block) }))
      .sort((left, right) => right.match.score - left.match.score);
    const best = candidates[0];
    const threshold = best?.match.method === "source-region" ? 0.38 : 0.48;

    if (best && best.match.score >= threshold) {
      best.slot.members.set(block.runId, block);
      best.slot.matchScores.push(best.match.score);
      best.slot.matchMethods.push(best.match.method);
      best.slot.order = Math.min(best.slot.order, block.order);
      continue;
    }

    const slot = {
      id: `page-${block.pageNumber}-area-${slots.length}`,
      pageNumber: block.pageNumber,
      order: block.order,
      members: new Map([[block.runId, block]]),
      matchScores: [],
      matchMethods: [],
    } satisfies AreaSlot;
    slots.push(slot);
    slotsByPage.set(block.pageNumber, [...pageSlots, slot]);
  }
  return slots;
}

function blockTypeLabel(type: DocumentBlockType): string {
  const labels: Partial<Record<DocumentBlockType, string>> = {
    title: "Title",
    "section-header": "Section heading",
    paragraph: "Paragraph",
    list: "List",
    "list-item": "List item",
    table: "Table",
    "table-cell": "Table cell",
    figure: "Figure",
    chart: "Chart",
    diagram: "Diagram",
    caption: "Caption",
    formula: "Formula",
    code: "Code",
    "key-value": "Key-value field",
  };
  return labels[type] || "Document block";
}

function groupingKey(variant: ParserFocusVariant): string {
  if (variant.missing) return "__missing__";
  return `${variant.blockType || "unknown"}\u0000${normalizeEvaluationText(variant.content)}`;
}

function stableKey(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function groupVariants(variants: ParserFocusVariant[]): ParserFocusVariantGroup[] {
  const groups = new Map<string, ParserFocusVariant[]>();
  for (const variant of variants) {
    const key = groupingKey(variant);
    groups.set(key, [...(groups.get(key) || []), variant]);
  }
  return [...groups.values()]
    .map((members) => ({
      id: `variant-group-${stableKey(groupingKey(members[0]))}`,
      runIds: members.map((variant) => variant.runId),
      engines: members.map((variant) => variant.engine),
      engineCount: members.length,
      content: members[0]?.content || "",
      missing: members[0]?.missing || false,
      blockType: members[0]?.blockType,
      table: members[0]?.table,
      variants: members,
    }))
    .sort((left, right) => Number(left.missing) - Number(right.missing) || right.engineCount - left.engineCount);
}

function alignmentMethod(slot: AreaSlot): ParserAlignmentMethod {
  const counts = new Map<ParserAlignmentMethod, number>();
  for (const method of slot.matchMethods) counts.set(method, (counts.get(method) || 0) + 1);
  return [...counts.entries()].sort((left, right) => right[1] - left[1])[0]?.[0]
    || ([...slot.members.values()].some((block) => block.box) ? "source-region" : "reading-order");
}

function finalizeSlot(slot: AreaSlot, runs: ParseResponse[], index: number): ParserFocusArea {
  const members = [...slot.members.values()];
  const anchor = members.find((member) => member.box) || members[0];
  const variants: ParserFocusVariant[] = runs.map((run, runIndex) => {
    const id = runId(run, runIndex);
    const matched = slot.members.get(id);
    return {
      runId: id,
      engine: engineLabel(run, runIndex),
      role: runRole(run),
      blockId: matched?.block.id,
      blockType: matched?.block.type,
      content: matched?.content || "",
      missing: !matched,
      confidence: matched?.block.confidence,
      region: matched?.block.region,
      table: matched?.block.table,
      similarityToConsensus: null,
      matchesConsensus: false,
    };
  });
  const type = anchor?.block.type || variants.find((variant) => variant.blockType)?.blockType || "unknown";
  const groups = groupVariants(variants);
  const largestContentGroup = groups.find((group) => !group.missing);
  const consensusContent = largestContentGroup?.content || "";
  const blockTypes = new Set(variants.filter((variant) => !variant.missing).map((variant) => variant.blockType));
  const missingCount = variants.filter((variant) => variant.missing).length;
  const distinctContentCount = groups.filter((group) => !group.missing).length;
  const matchConfidence = slot.matchScores.length
    ? slot.matchScores.reduce((sum, score) => sum + score, 0) / slot.matchScores.length
    : 0;
  const alignmentConfidence = members.length === 1 && runs.length > 1 ? 0 : matchConfidence;
  const lowAlignmentConfidence = members.length > 1 && alignmentConfidence < 0.55;
  const hasDisagreement = missingCount > 0
    || distinctContentCount > 1
    || blockTypes.size > 1
    || lowAlignmentConfidence;
  const reasons: string[] = [];
  if (missingCount > 0) reasons.push(`${missingCount} engine${missingCount === 1 ? "" : "s"} omitted this area`);
  if (blockTypes.size > 1) reasons.push("Block types differ");
  if (distinctContentCount > 1) {
    reasons.push(type === "table" ? "Table cells or structure differ" : "Extracted content differs");
  }
  if (lowAlignmentConfidence) reasons.push("Source alignment needs verification");
  if (!hasDisagreement) reasons.push("All engines agree after normalization");

  for (const variant of variants) {
    variant.matchesConsensus = !variant.missing
      && normalizeEvaluationText(variant.content) === normalizeEvaluationText(consensusContent)
      && variant.blockType === largestContentGroup?.blockType;
    variant.similarityToConsensus = variant.missing || !consensusContent
      ? null
      : normalizedEditSimilarity(consensusContent, variant.content);
  }

  const severity = hasDisagreement
    ? missingCount > 0 || HIGH_RISK_TYPES.has(type) ? "error" : "warning"
    : "info";
  const agreementCount = largestContentGroup?.engineCount || 0;
  const majorityGroupId = agreementCount > runs.length / 2 ? largestContentGroup?.id : undefined;

  return {
    id: slot.id || `focus-area-${index}`,
    pageNumber: slot.pageNumber,
    order: slot.order,
    label: `${blockTypeLabel(type)} ${slot.order + 1}`,
    blockType: type,
    region: anchor?.block.region,
    variants,
    groups,
    hasDisagreement,
    severity,
    agreementCount,
    engineCount: runs.length,
    consensusContent,
    majorityGroupId,
    alignmentConfidence,
    alignmentMethod: alignmentMethod(slot),
    reasons,
  };
}

export function buildParserFocusAreas(runs: ParseResponse[]): ParserFocusArea[] {
  if (runs.length === 0) return [];
  const slots = createSlots(runs.map(blocksForRun));
  return slots
    .map((slot, index) => finalizeSlot(slot, runs, index))
    .sort((left, right) => (
      Number(right.hasDisagreement) - Number(left.hasDisagreement)
      || Number(right.severity === "error") - Number(left.severity === "error")
      || left.pageNumber - right.pageNumber
      || left.order - right.order
    ))
    .slice(0, MAX_FOCUS_AREAS);
}

export function selectParserSpotCheckAreas(
  areas: ParserFocusArea[],
  limit = 3,
): ParserFocusArea[] {
  return areas
    .filter((area) => !area.hasDisagreement)
    .sort((left, right) => (
      Number(HIGH_RISK_TYPES.has(right.blockType)) - Number(HIGH_RISK_TYPES.has(left.blockType))
      || left.pageNumber - right.pageNumber
      || left.order - right.order
    ))
    .slice(0, Math.max(0, limit));
}

export interface DifferenceSegment {
  text: string;
  changed: boolean;
}

export function differenceSegments(reference: string, candidate: string): DifferenceSegment[] {
  if (!candidate) return [];
  if (!reference || reference === candidate) return [{ text: candidate, changed: false }];
  let prefix = 0;
  const maxPrefix = Math.min(reference.length, candidate.length);
  while (prefix < maxPrefix && reference[prefix] === candidate[prefix]) prefix += 1;
  let suffix = 0;
  const maxSuffix = Math.min(reference.length - prefix, candidate.length - prefix);
  while (
    suffix < maxSuffix
    && reference[reference.length - suffix - 1] === candidate[candidate.length - suffix - 1]
  ) suffix += 1;
  return [
    { text: candidate.slice(0, prefix), changed: false },
    { text: candidate.slice(prefix, candidate.length - suffix), changed: true },
    { text: suffix ? candidate.slice(candidate.length - suffix) : "", changed: false },
  ].filter((segment) => segment.text);
}
