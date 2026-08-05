import type { ParserType } from "@/lib/types";

export type DocumentProcessingStage =
  | "ocr"
  | "layout"
  | "structure"
  | "visual-understanding"
  | "structured-extraction";

export type DocumentEngineCategory =
  | "ocr-layout-hybrid"
  | "document-parser"
  | "document-ai"
  | "document-vlm";

export type DeploymentMode = "managed" | "self-hosted" | "hybrid";

export interface DocumentEngineCapabilities {
  ocr: boolean;
  layout: boolean;
  boundingBoxes: boolean;
  readingOrder: boolean;
  tables: boolean;
  formulas: boolean;
  images: boolean;
  visualUnderstanding: boolean;
  structuredOutput: boolean;
}

export interface DocumentEngineDefinition {
  id: string;
  parserType: ParserType;
  provider: string;
  displayName: string;
  category: DocumentEngineCategory;
  deployment: DeploymentMode;
  stages: DocumentProcessingStage[];
  capabilities: DocumentEngineCapabilities;
  supportsVersionPinning: boolean;
}

/**
 * Stable engine metadata used by parsing, persistence, and the comparison UI.
 *
 * ParserType is retained as a legacy UI/API identifier. New code should use
 * the stable `id` and capability flags instead of inferring behavior from the
 * provider name.
 */
export const DOCUMENT_ENGINES: Record<ParserType, DocumentEngineDefinition> = {
  Upstage: {
    id: "upstage-document-parse",
    parserType: "Upstage",
    provider: "Upstage",
    displayName: "Upstage Document Parse",
    category: "ocr-layout-hybrid",
    deployment: "managed",
    stages: ["ocr", "layout", "structure"],
    capabilities: {
      ocr: true,
      layout: true,
      boundingBoxes: true,
      readingOrder: true,
      tables: true,
      formulas: true,
      images: true,
      visualUnderstanding: false,
      structuredOutput: true,
    },
    supportsVersionPinning: false,
  },
  LlamaIndex: {
    id: "llama-parse-v2",
    parserType: "LlamaIndex",
    provider: "LlamaIndex",
    displayName: "LlamaParse v2",
    category: "document-ai",
    deployment: "managed",
    stages: ["ocr", "layout", "structure", "visual-understanding"],
    capabilities: {
      ocr: true,
      layout: true,
      boundingBoxes: true,
      readingOrder: true,
      tables: true,
      formulas: true,
      images: true,
      visualUnderstanding: true,
      structuredOutput: true,
    },
    supportsVersionPinning: true,
  },
  Azure: {
    id: "azure-document-intelligence",
    parserType: "Azure",
    provider: "Microsoft Azure",
    displayName: "Azure Document Intelligence",
    category: "document-ai",
    deployment: "managed",
    stages: ["ocr", "layout", "structure"],
    capabilities: {
      ocr: true,
      layout: true,
      boundingBoxes: true,
      readingOrder: true,
      tables: true,
      formulas: true,
      images: true,
      visualUnderstanding: false,
      structuredOutput: true,
    },
    supportsVersionPinning: true,
  },
  Google: {
    id: "google-document-ai",
    parserType: "Google",
    provider: "Google Cloud",
    displayName: "Google Document AI",
    category: "document-ai",
    deployment: "managed",
    stages: ["ocr", "layout", "structure", "visual-understanding"],
    capabilities: {
      ocr: true,
      layout: true,
      boundingBoxes: true,
      readingOrder: true,
      tables: true,
      formulas: true,
      images: true,
      visualUnderstanding: true,
      structuredOutput: true,
    },
    supportsVersionPinning: true,
  },
  Docling: {
    id: "docling-convert",
    parserType: "Docling",
    provider: "Docling",
    displayName: "Docling",
    category: "document-parser",
    deployment: "self-hosted",
    stages: ["ocr", "layout", "structure", "visual-understanding"],
    capabilities: {
      ocr: true,
      layout: true,
      boundingBoxes: true,
      readingOrder: true,
      tables: true,
      formulas: true,
      images: true,
      visualUnderstanding: true,
      structuredOutput: true,
    },
    supportsVersionPinning: false,
  },
};

export function getDocumentEngine(parserType: ParserType): DocumentEngineDefinition {
  return DOCUMENT_ENGINES[parserType];
}

export function listDocumentEngines(): DocumentEngineDefinition[] {
  return Object.values(DOCUMENT_ENGINES);
}
