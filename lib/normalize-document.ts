import type { ParserType } from "@/lib/types";
import {
  DOCUMENT_IR_SCHEMA_VERSION,
  createDocumentRegion,
  summarizeDocument,
  type CoordinateSystem,
  type DocumentBlock,
  type DocumentBlockType,
  type DocumentPage,
  type DocumentPoint,
  type DocumentRegion,
  type DocumentTableCell,
  type NormalizedDocument,
} from "@/lib/document-ir";

interface LegacyPage {
  pageNumber: number;
  text?: string;
  markdown?: string;
  width?: number;
  height?: number;
  items?: unknown[];
}

export interface NormalizeDocumentInput {
  parserType: ParserType;
  raw?: unknown;
  text?: string;
  markdown?: string;
  html?: string;
  pages?: LegacyPage[];
}

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord | undefined {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as UnknownRecord)
    : undefined;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function asNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function firstString(...values: unknown[]): string | undefined {
  for (const value of values) {
    const stringValue = asString(value);
    if (stringValue !== undefined) {
      return stringValue;
    }
  }
  return undefined;
}

function normalizeBlockType(value: unknown): DocumentBlockType {
  const label = String(value || "").toLowerCase().replace(/[\s_]+/g, "-");

  if (label.includes("section") && (label.includes("head") || label.includes("title"))) return "section-header";
  if (label === "title" || label.includes("document-title")) return "title";
  if (label.includes("table-cell")) return "table-cell";
  if (label.includes("table")) return "table";
  if (label.includes("chart")) return "chart";
  if (label.includes("diagram")) return "diagram";
  if (label.includes("figure") || label.includes("picture") || label === "image") return "figure";
  if (label.includes("caption")) return "caption";
  if (label.includes("formula") || label.includes("equation")) return "formula";
  if (label.includes("footnote")) return "footnote";
  if (label.includes("footer")) return "footer";
  if (label.includes("header")) return "header";
  if (label.includes("page-number")) return "page-number";
  if (label.includes("list-item")) return "list-item";
  if (label === "list" || label.includes("bullets")) return "list";
  if (label.includes("code")) return "code";
  if (label.includes("key-value") || label.includes("keyvalue")) return "key-value";
  if (label.includes("signature")) return "signature";
  if (label.includes("paragraph") || label === "text" || label === "line") return "paragraph";
  return "unknown";
}

function coordinateSystemFromUnit(value: unknown): CoordinateSystem {
  const unit = String(value || "").toLowerCase();
  if (unit.includes("norm")) return "normalized";
  if (unit.includes("pixel")) return "pixel";
  if (unit.includes("point")) return "point";
  if (unit.includes("inch")) return "inch";
  return "unknown";
}

function pointsFromValue(value: unknown): DocumentPoint[] {
  if (Array.isArray(value)) {
    if (value.every((item) => typeof item === "number")) {
      const points: DocumentPoint[] = [];
      for (let index = 0; index + 1 < value.length; index += 2) {
        points.push({ x: value[index] as number, y: value[index + 1] as number });
      }
      return points;
    }

    return value.flatMap((item) => {
      const point = asRecord(item);
      const x = asNumber(point?.x);
      const y = asNumber(point?.y);
      return x !== undefined && y !== undefined ? [{ x, y }] : [];
    });
  }

  const box = asRecord(value);
  if (!box) return [];

  const left = asNumber(box.l) ?? asNumber(box.left) ?? asNumber(box.x);
  const top = asNumber(box.t) ?? asNumber(box.top) ?? asNumber(box.y);
  const right = asNumber(box.r) ?? asNumber(box.right) ?? (
    left !== undefined && asNumber(box.width) !== undefined
      ? left + (asNumber(box.width) as number)
      : undefined
  );
  const bottom = asNumber(box.b) ?? asNumber(box.bottom) ?? (
    top !== undefined && asNumber(box.height) !== undefined
      ? top + (asNumber(box.height) as number)
      : undefined
  );

  if (left === undefined || top === undefined || right === undefined || bottom === undefined) {
    return [];
  }

  return [
    { x: left, y: top },
    { x: right, y: top },
    { x: right, y: bottom },
    { x: left, y: bottom },
  ];
}

function regionFromValue(
  value: unknown,
  fallbackCoordinateSystem: CoordinateSystem = "unknown"
): DocumentRegion | undefined {
  const record = asRecord(value);
  const boundingPoly = asRecord(record?.boundingPoly ?? record?.bounding_poly);

  const normalizedPoints = pointsFromValue(
    boundingPoly?.normalizedVertices ?? boundingPoly?.normalized_vertices
  );
  if (normalizedPoints.length > 0) {
    return createDocumentRegion(normalizedPoints, "normalized");
  }

  const coordinateSystem = coordinateSystemFromUnit(
    record?.unit ?? record?.coord_origin ?? record?.coordinateSystem
  );
  const candidates = [
    boundingPoly?.vertices,
    record?.polygon,
    record?.boundingPolygon,
    record?.bounding_polygon,
    record?.boundingBox,
    record?.bounding_box,
    record?.bbox,
    record?.coordinates,
    value,
  ];

  for (const candidate of candidates) {
    const points = pointsFromValue(candidate);
    if (points.length > 0) {
      return createDocumentRegion(
        points,
        coordinateSystem === "unknown" ? fallbackCoordinateSystem : coordinateSystem
      );
    }
  }

  return undefined;
}

function textFromAnchor(fullText: string, value: unknown): string | undefined {
  const anchor = asRecord(value);
  const segments = asArray(anchor?.textSegments ?? anchor?.text_segments);
  if (!anchor || segments.length === 0) return undefined;

  const text = segments.map((segmentValue) => {
    const segment = asRecord(segmentValue);
    const start = Number(segment?.startIndex ?? segment?.start_index ?? 0);
    const end = Number(segment?.endIndex ?? segment?.end_index ?? start);
    return fullText.slice(start, end);
  }).join("");

  return text || undefined;
}

function textFromContent(value: unknown): string | undefined {
  const record = asRecord(value);
  const content = asRecord(record?.content);
  return firstString(
    record?.text,
    record?.markdown,
    record?.md,
    record?.value,
    content?.text,
    content?.markdown,
    content?.value
  );
}

function createBlock(
  engineId: string,
  pageNumber: number,
  index: number,
  value: unknown,
  defaults: Partial<DocumentBlock> = {}
): DocumentBlock {
  const record = asRecord(value);
  const layout = asRecord(record?.layout);
  const confidence = asNumber(record?.confidence) ?? asNumber(layout?.confidence);

  return {
    id: `${engineId}-p${pageNumber}-b${index + 1}`,
    type: defaults.type ?? normalizeBlockType(
      record?.type ?? record?.category ?? record?.label ?? record?.role
    ),
    pageNumber,
    readingOrder: defaults.readingOrder ?? index,
    text: defaults.text ?? textFromContent(value),
    markdown: defaults.markdown ?? firstString(record?.markdown, record?.md),
    html: defaults.html ?? asString(record?.html),
    confidence: defaults.confidence ?? confidence,
    region: defaults.region ?? regionFromValue(layout ?? value),
    table: defaults.table,
    source: defaults.source ?? {
      providerObjectType: firstString(record?.type, record?.category, record?.label),
      providerObjectId: firstString(record?.id, record?.self_ref),
      providerIndex: index,
    },
  };
}

function normalizeLegacyPages(engineId: string, pages: LegacyPage[]): DocumentPage[] {
  return pages.map((page) => ({
    pageNumber: page.pageNumber,
    width: page.width,
    height: page.height,
    text: page.text,
    markdown: page.markdown,
    blocks: asArray(page.items).map((item, index) =>
      createBlock(engineId, page.pageNumber, index, item)
    ),
  }));
}

function normalizeUpstage(raw: unknown): DocumentPage[] {
  const root = asRecord(raw);
  const data = asRecord(root?.data);
  const elements = asArray(root?.elements ?? data?.elements);
  const pages = new Map<number, DocumentPage>();

  elements.forEach((elementValue, index) => {
    const element = asRecord(elementValue);
    const pageNumber = Number(element?.page ?? element?.page_number ?? element?.pageNumber ?? 1);
    const page = pages.get(pageNumber) ?? { pageNumber, blocks: [] };
    page.blocks.push(createBlock("upstage", pageNumber, index, elementValue));
    pages.set(pageNumber, page);
  });

  return Array.from(pages.values()).sort((a, b) => a.pageNumber - b.pageNumber);
}

function normalizeLlamaParse(raw: unknown): DocumentPage[] {
  const root = asRecord(raw);
  const textRoot = asRecord(root?.text);
  const markdownRoot = asRecord(root?.markdown);
  const itemsRoot = asRecord(root?.items);
  const textPages = asArray(textRoot?.pages);
  const markdownPages = asArray(markdownRoot?.pages);
  const itemPages = asArray(itemsRoot?.pages);
  const pageNumbers = new Set<number>();

  [...textPages, ...markdownPages, ...itemPages].forEach((pageValue) => {
    const page = asRecord(pageValue);
    pageNumbers.add(Number(page?.page_number ?? page?.pageNumber ?? 1));
  });

  return Array.from(pageNumbers).sort((a, b) => a - b).map((pageNumber) => {
    const textPage = textPages.find((value) => Number(asRecord(value)?.page_number) === pageNumber);
    const markdownPage = markdownPages.find((value) => Number(asRecord(value)?.page_number) === pageNumber);
    const itemPageValue = itemPages.find((value) => Number(asRecord(value)?.page_number) === pageNumber);
    const itemPage = asRecord(itemPageValue);

    return {
      pageNumber,
      width: asNumber(itemPage?.page_width),
      height: asNumber(itemPage?.page_height),
      text: asString(asRecord(textPage)?.text),
      markdown: asString(asRecord(markdownPage)?.markdown),
      blocks: asArray(itemPage?.items).map((item, index) =>
        createBlock("llamaparse", pageNumber, index, item)
      ),
    };
  });
}

function normalizeAzure(raw: unknown): DocumentPage[] {
  const root = asRecord(raw);
  const analyzeResult = asRecord(root?.analyzeResult ?? root?.analyze_result ?? raw);
  const pages = new Map<number, DocumentPage>();

  asArray(analyzeResult?.pages).forEach((pageValue, pageIndex) => {
    const page = asRecord(pageValue);
    const pageNumber = Number(page?.pageNumber ?? page?.page_number ?? pageIndex + 1);
    pages.set(pageNumber, {
      pageNumber,
      width: asNumber(page?.width),
      height: asNumber(page?.height),
      unit: coordinateSystemFromUnit(page?.unit),
      blocks: [],
    });
  });

  const paragraphs = asArray(analyzeResult?.paragraphs);
  if (paragraphs.length > 0) {
    paragraphs.forEach((paragraphValue, index) => {
      const paragraph = asRecord(paragraphValue);
      const boundingRegion = asRecord(asArray(paragraph?.boundingRegions ?? paragraph?.bounding_regions)[0]);
      const pageNumber = Number(boundingRegion?.pageNumber ?? boundingRegion?.page_number ?? 1);
      const page = pages.get(pageNumber) ?? { pageNumber, blocks: [] };
      page.blocks.push(createBlock("azure", pageNumber, index, paragraphValue, {
        type: normalizeBlockType(paragraph?.role ?? "paragraph"),
        text: asString(paragraph?.content),
        region: regionFromValue(boundingRegion, page.unit),
      }));
      pages.set(pageNumber, page);
    });
  } else {
    asArray(analyzeResult?.pages).forEach((pageValue, pageIndex) => {
      const pageRecord = asRecord(pageValue);
      const pageNumber = Number(pageRecord?.pageNumber ?? pageIndex + 1);
      const page = pages.get(pageNumber) ?? { pageNumber, blocks: [] };
      page.blocks.push(...asArray(pageRecord?.lines).map((line, index) =>
        createBlock("azure", pageNumber, index, line, {
          type: "paragraph",
          text: asString(asRecord(line)?.content),
          region: regionFromValue(line, page.unit),
        })
      ));
      pages.set(pageNumber, page);
    });
  }

  asArray(analyzeResult?.tables).forEach((tableValue, index) => {
    const table = asRecord(tableValue);
    const boundingRegion = asRecord(asArray(table?.boundingRegions ?? table?.bounding_regions)[0]);
    const pageNumber = Number(boundingRegion?.pageNumber ?? boundingRegion?.page_number ?? 1);
    const page = pages.get(pageNumber) ?? { pageNumber, blocks: [] };
    const cells: DocumentTableCell[] = asArray(table?.cells).map((cellValue) => {
      const cell = asRecord(cellValue);
      const cellRegion = asRecord(asArray(cell?.boundingRegions ?? cell?.bounding_regions)[0]);
      return {
        rowIndex: Number(cell?.rowIndex ?? cell?.row_index ?? 0),
        columnIndex: Number(cell?.columnIndex ?? cell?.column_index ?? 0),
        rowSpan: asNumber(cell?.rowSpan ?? cell?.row_span),
        columnSpan: asNumber(cell?.columnSpan ?? cell?.column_span),
        text: asString(cell?.content),
        region: regionFromValue(cellRegion, page.unit),
        isHeader: String(cell?.kind || "").toLowerCase().includes("header"),
      };
    });

    page.blocks.push(createBlock("azure-table", pageNumber, page.blocks.length + index, tableValue, {
      type: "table",
      text: cells.map((cell) => cell.text).filter(Boolean).join("\t"),
      region: regionFromValue(boundingRegion, page.unit),
      table: {
        rowCount: asNumber(table?.rowCount ?? table?.row_count),
        columnCount: asNumber(table?.columnCount ?? table?.column_count),
        cells,
      },
    }));
    pages.set(pageNumber, page);
  });

  asArray(analyzeResult?.figures).forEach((figureValue, index) => {
    const figure = asRecord(figureValue);
    const boundingRegion = asRecord(asArray(figure?.boundingRegions ?? figure?.bounding_regions)[0]);
    const pageNumber = Number(boundingRegion?.pageNumber ?? boundingRegion?.page_number ?? 1);
    const page = pages.get(pageNumber) ?? { pageNumber, blocks: [] };
    page.blocks.push(createBlock("azure-figure", pageNumber, page.blocks.length + index, figureValue, {
      type: "figure",
      region: regionFromValue(boundingRegion, page.unit),
    }));
    pages.set(pageNumber, page);
  });

  return Array.from(pages.values()).sort((a, b) => a.pageNumber - b.pageNumber);
}

function googleTableCells(fullText: string, rows: unknown, isHeader: boolean): DocumentTableCell[] {
  return asArray(rows).flatMap((rowValue, rowIndex) => {
    const row = asRecord(rowValue);
    return asArray(row?.cells).map((cellValue, columnIndex) => {
      const cell = asRecord(cellValue);
      const layout = asRecord(cell?.layout);
      return {
        rowIndex,
        columnIndex,
        rowSpan: asNumber(cell?.rowSpan ?? cell?.row_span),
        columnSpan: asNumber(cell?.colSpan ?? cell?.col_span),
        text: textFromAnchor(fullText, layout?.textAnchor ?? layout?.text_anchor),
        region: regionFromValue(layout, "normalized"),
        isHeader,
      };
    });
  });
}

function normalizeGoogle(raw: unknown): DocumentPage[] {
  const root = asRecord(raw);
  const document = asRecord(root?.document ?? raw);
  const fullText = asString(document?.text) || "";
  const pages = new Map<number, DocumentPage>();

  asArray(document?.pages).forEach((pageValue, pageIndex) => {
    const pageRecord = asRecord(pageValue);
    const dimension = asRecord(pageRecord?.dimension);
    const pageNumber = Number(pageRecord?.pageNumber ?? pageRecord?.page_number ?? pageIndex + 1);
    const page: DocumentPage = {
      pageNumber,
      width: asNumber(dimension?.width),
      height: asNumber(dimension?.height),
      unit: coordinateSystemFromUnit(dimension?.unit),
      blocks: [],
    };

    asArray(pageRecord?.paragraphs).forEach((paragraphValue, index) => {
      const paragraph = asRecord(paragraphValue);
      const layout = asRecord(paragraph?.layout);
      page.blocks.push(createBlock("google", pageNumber, index, paragraphValue, {
        type: "paragraph",
        text: textFromAnchor(fullText, layout?.textAnchor ?? layout?.text_anchor),
        region: regionFromValue(layout, "normalized"),
      }));
    });

    asArray(pageRecord?.tables).forEach((tableValue, index) => {
      const table = asRecord(tableValue);
      const headerRows = table?.headerRows ?? table?.header_rows;
      const headerCells = googleTableCells(fullText, headerRows, true);
      const bodyCells = googleTableCells(fullText, table?.bodyRows ?? table?.body_rows, false)
        .map((cell) => ({ ...cell, rowIndex: cell.rowIndex + asArray(headerRows).length }));
      const cells = [...headerCells, ...bodyCells];
      page.blocks.push(createBlock("google-table", pageNumber, page.blocks.length + index, tableValue, {
        type: "table",
        text: cells.map((cell) => cell.text).filter(Boolean).join("\t"),
        region: regionFromValue(asRecord(table?.layout), "normalized"),
        table: { cells },
      }));
    });

    asArray(pageRecord?.visualElements ?? pageRecord?.visual_elements).forEach((visualValue, index) => {
      page.blocks.push(createBlock("google-visual", pageNumber, page.blocks.length + index, visualValue, {
        type: "figure",
        region: regionFromValue(asRecord(asRecord(visualValue)?.layout), "normalized"),
      }));
    });

    page.text = page.blocks.map((block) => block.text).filter(Boolean).join("\n");
    pages.set(pageNumber, page);
  });

  const documentLayout = asRecord(document?.documentLayout ?? document?.document_layout);
  const addLayoutBlocks = (blocks: unknown, parentId?: string, parentPageNumber = 1): void => {
    asArray(blocks).forEach((blockValue, index) => {
      const block = asRecord(blockValue);
      const pageNumber = Number(block?.pageNumber ?? block?.page_number ?? parentPageNumber);
      const page = pages.get(pageNumber) ?? { pageNumber, blocks: [] };
      const normalizedBlock = createBlock("google-layout", pageNumber, page.blocks.length + index, blockValue, {
        text: firstString(block?.text, block?.content),
      });
      if (parentId) normalizedBlock.parentId = parentId;
      page.blocks.push(normalizedBlock);
      pages.set(pageNumber, page);
      addLayoutBlocks(block?.blocks ?? block?.children, normalizedBlock.id, pageNumber);
    });
  };
  addLayoutBlocks(documentLayout?.blocks);

  return Array.from(pages.values()).sort((a, b) => a.pageNumber - b.pageNumber);
}

function normalizeDocling(raw: unknown): DocumentPage[] {
  const root = asRecord(raw);
  const document = asRecord(root?.document);
  const doclingDocument = asRecord(document?.json_content) ?? document ?? root;
  const pages = new Map<number, DocumentPage>();
  const pageValues = asRecord(doclingDocument?.pages);

  Object.entries(pageValues || {}).forEach(([key, pageValue]) => {
    const page = asRecord(pageValue);
    const size = asRecord(page?.size);
    const pageNumber = Number(page?.page_no ?? page?.pageNumber ?? key) || 1;
    pages.set(pageNumber, {
      pageNumber,
      width: asNumber(size?.width),
      height: asNumber(size?.height),
      unit: "point",
      blocks: [],
    });
  });

  const collections: Array<{ values: unknown; type: DocumentBlockType; prefix: string }> = [
    { values: doclingDocument?.texts, type: "paragraph", prefix: "docling-text" },
    { values: doclingDocument?.tables, type: "table", prefix: "docling-table" },
    { values: doclingDocument?.pictures, type: "figure", prefix: "docling-picture" },
    { values: doclingDocument?.key_value_items, type: "key-value", prefix: "docling-key-value" },
  ];

  collections.forEach((collection) => {
    asArray(collection.values).forEach((itemValue, index) => {
      const item = asRecord(itemValue);
      const provenance = asRecord(asArray(item?.prov)[0]);
      const pageNumber = Number(provenance?.page_no ?? provenance?.pageNumber ?? 1) || 1;
      const page = pages.get(pageNumber) ?? { pageNumber, blocks: [] };
      page.blocks.push(createBlock(collection.prefix, pageNumber, page.blocks.length + index, itemValue, {
        type: collection.type === "paragraph"
          ? normalizeBlockType(item?.label ?? collection.type)
          : collection.type,
        text: firstString(item?.text, item?.orig, item?.content),
        region: regionFromValue(provenance?.bbox ?? provenance, page.unit),
      }));
      pages.set(pageNumber, page);
    });
  });

  return Array.from(pages.values()).sort((a, b) => a.pageNumber - b.pageNumber);
}

function mergeLegacyPageContent(normalized: DocumentPage[], legacy: LegacyPage[]): DocumentPage[] {
  const pages = new Map<number, DocumentPage>();

  normalized.forEach((page) => pages.set(page.pageNumber, page));
  legacy.forEach((legacyPage) => {
    const existing = pages.get(legacyPage.pageNumber);
    if (existing) {
      existing.text ||= legacyPage.text;
      existing.markdown ||= legacyPage.markdown;
      existing.width ||= legacyPage.width;
      existing.height ||= legacyPage.height;
    } else {
      pages.set(legacyPage.pageNumber, {
        pageNumber: legacyPage.pageNumber,
        width: legacyPage.width,
        height: legacyPage.height,
        text: legacyPage.text,
        markdown: legacyPage.markdown,
        blocks: asArray(legacyPage.items).map((item, index) =>
          createBlock("legacy", legacyPage.pageNumber, index, item)
        ),
      });
    }
  });

  return Array.from(pages.values()).sort((a, b) => a.pageNumber - b.pageNumber);
}

export function normalizeDocument(input: NormalizeDocumentInput): NormalizedDocument {
  let pages: DocumentPage[] = [];

  if (input.raw) {
    switch (input.parserType) {
      case "Upstage":
        pages = normalizeUpstage(input.raw);
        break;
      case "LlamaIndex":
        pages = normalizeLlamaParse(input.raw);
        break;
      case "Azure":
        pages = normalizeAzure(input.raw);
        break;
      case "Google":
        pages = normalizeGoogle(input.raw);
        break;
      case "Docling":
        pages = normalizeDocling(input.raw);
        break;
    }
  }

  if (input.pages?.length) {
    pages = pages.length > 0
      ? mergeLegacyPageContent(pages, input.pages)
      : normalizeLegacyPages(input.parserType.toLowerCase(), input.pages);
  }

  if (pages.length === 0 && (input.text || input.markdown || input.html)) {
    const content = input.text || input.markdown || "";
    pages = [{
      pageNumber: 1,
      text: input.text,
      markdown: input.markdown,
      blocks: content ? [{
        id: `${input.parserType.toLowerCase()}-p1-b1`,
        type: "paragraph",
        pageNumber: 1,
        readingOrder: 0,
        text: content,
      }] : [],
    }];
  }

  pages.forEach((page) => {
    page.blocks.forEach((block, index) => {
      block.readingOrder ??= index;
    });
  });

  return {
    schemaVersion: DOCUMENT_IR_SCHEMA_VERSION,
    text: input.text,
    markdown: input.markdown,
    html: input.html,
    pages,
    statistics: summarizeDocument(pages),
  };
}
