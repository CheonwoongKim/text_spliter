export const DOCUMENT_IR_SCHEMA_VERSION = "1.0" as const;

export type DocumentBlockType =
  | "title"
  | "section-header"
  | "paragraph"
  | "list"
  | "list-item"
  | "table"
  | "table-cell"
  | "figure"
  | "chart"
  | "diagram"
  | "caption"
  | "formula"
  | "code"
  | "header"
  | "footer"
  | "footnote"
  | "page-number"
  | "key-value"
  | "signature"
  | "unknown";

export type CoordinateSystem =
  | "normalized"
  | "pixel"
  | "point"
  | "inch"
  | "unknown";

export interface DocumentPoint {
  x: number;
  y: number;
}

export interface DocumentRegion {
  coordinateSystem: CoordinateSystem;
  polygon: DocumentPoint[];
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export type DocumentBlockRelationType =
  | "child-of"
  | "caption-of"
  | "continues-from"
  | "continues-on"
  | "references"
  | "reading-next";

export interface DocumentBlockRelation {
  type: DocumentBlockRelationType;
  targetBlockId: string;
}

export interface DocumentTableCell {
  rowIndex: number;
  columnIndex: number;
  rowSpan?: number;
  columnSpan?: number;
  text?: string;
  region?: DocumentRegion;
  isHeader?: boolean;
}

export interface DocumentTable {
  rowCount?: number;
  columnCount?: number;
  cells: DocumentTableCell[];
}

export interface DocumentBlock {
  id: string;
  type: DocumentBlockType;
  pageNumber: number;
  readingOrder?: number;
  text?: string;
  markdown?: string;
  html?: string;
  confidence?: number;
  region?: DocumentRegion;
  parentId?: string;
  relations?: DocumentBlockRelation[];
  table?: DocumentTable;
  source?: {
    providerObjectType?: string;
    providerObjectId?: string;
    providerIndex?: number;
  };
}

export interface DocumentPage {
  pageNumber: number;
  width?: number;
  height?: number;
  unit?: CoordinateSystem;
  text?: string;
  markdown?: string;
  blocks: DocumentBlock[];
}

export interface NormalizedDocument {
  schemaVersion: typeof DOCUMENT_IR_SCHEMA_VERSION;
  text?: string;
  markdown?: string;
  html?: string;
  pages: DocumentPage[];
  statistics: {
    pageCount: number;
    blockCount: number;
    tableCount: number;
    figureCount: number;
    formulaCount: number;
  };
}

export function createDocumentRegion(
  polygon: DocumentPoint[],
  coordinateSystem: CoordinateSystem = "unknown"
): DocumentRegion | undefined {
  if (polygon.length === 0) {
    return undefined;
  }

  const xs = polygon.map((point) => point.x);
  const ys = polygon.map((point) => point.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const maxX = Math.max(...xs);
  const maxY = Math.max(...ys);

  return {
    coordinateSystem,
    polygon,
    boundingBox: {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    },
  };
}

export function summarizeDocument(pages: DocumentPage[]): NormalizedDocument["statistics"] {
  const blocks = pages.flatMap((page) => page.blocks);

  return {
    pageCount: pages.length,
    blockCount: blocks.length,
    tableCount: blocks.filter((block) => block.type === "table").length,
    figureCount: blocks.filter((block) =>
      block.type === "figure" || block.type === "chart" || block.type === "diagram"
    ).length,
    formulaCount: blocks.filter((block) => block.type === "formula").length,
  };
}
