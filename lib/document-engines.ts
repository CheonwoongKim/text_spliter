import type {
  DocumentEngineKind,
  DocumentEngineType,
  ParserType,
  VisionEngineType,
} from "@/lib/types";

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

export interface DocumentInputCapabilities {
  nativePdf: boolean;
  originalImages: boolean;
  nativeOfficeCapture: boolean;
  pdfRasterFallback: boolean;
}

export interface DocumentEngineDefinition {
  id: string;
  engineType: DocumentEngineType;
  kind: DocumentEngineKind;
  parserType?: ParserType;
  provider: string;
  displayName: string;
  category: DocumentEngineCategory;
  deployment: DeploymentMode;
  stages: DocumentProcessingStage[];
  capabilities: DocumentEngineCapabilities;
  input: DocumentInputCapabilities;
  defaultModel?: string;
  supportsVersionPinning: boolean;
}

const PARSER_INPUT: DocumentInputCapabilities = {
  nativePdf: true,
  originalImages: true,
  nativeOfficeCapture: false,
  pdfRasterFallback: false,
};

const PARSER_CAPABILITIES: DocumentEngineCapabilities = {
  ocr: true,
  layout: true,
  boundingBoxes: true,
  readingOrder: true,
  tables: true,
  formulas: true,
  images: true,
  visualUnderstanding: false,
  structuredOutput: true,
};

const VISION_CAPABILITIES: DocumentEngineCapabilities = {
  ocr: true,
  layout: true,
  boundingBoxes: false,
  readingOrder: true,
  tables: true,
  formulas: true,
  images: true,
  visualUnderstanding: true,
  structuredOutput: false,
};

const NATIVE_PDF_VISION_INPUT: DocumentInputCapabilities = {
  nativePdf: true,
  originalImages: true,
  nativeOfficeCapture: true,
  pdfRasterFallback: true,
};

export const DOCUMENT_ENGINES: Record<DocumentEngineType, DocumentEngineDefinition> = {
  Upstage: {
    id: "upstage-document-parse",
    engineType: "Upstage",
    kind: "parser",
    parserType: "Upstage",
    provider: "Upstage",
    displayName: "Upstage Document Parse",
    category: "ocr-layout-hybrid",
    deployment: "managed",
    stages: ["ocr", "layout", "structure"],
    capabilities: PARSER_CAPABILITIES,
    input: PARSER_INPUT,
    supportsVersionPinning: false,
  },
  LlamaIndex: {
    id: "llama-parse-v2",
    engineType: "LlamaIndex",
    kind: "parser",
    parserType: "LlamaIndex",
    provider: "LlamaIndex",
    displayName: "LlamaParse v2",
    category: "document-ai",
    deployment: "managed",
    stages: ["ocr", "layout", "structure", "visual-understanding"],
    capabilities: { ...PARSER_CAPABILITIES, visualUnderstanding: true },
    input: PARSER_INPUT,
    supportsVersionPinning: true,
  },
  Azure: {
    id: "azure-document-intelligence",
    engineType: "Azure",
    kind: "parser",
    parserType: "Azure",
    provider: "Microsoft Azure",
    displayName: "Azure Document Intelligence",
    category: "document-ai",
    deployment: "managed",
    stages: ["ocr", "layout", "structure"],
    capabilities: PARSER_CAPABILITIES,
    input: PARSER_INPUT,
    supportsVersionPinning: true,
  },
  Google: {
    id: "google-document-ai",
    engineType: "Google",
    kind: "parser",
    parserType: "Google",
    provider: "Google Cloud",
    displayName: "Google Document AI",
    category: "document-ai",
    deployment: "managed",
    stages: ["ocr", "layout", "structure", "visual-understanding"],
    capabilities: { ...PARSER_CAPABILITIES, visualUnderstanding: true },
    input: PARSER_INPUT,
    supportsVersionPinning: true,
  },
  Docling: {
    id: "docling-convert",
    engineType: "Docling",
    kind: "parser",
    parserType: "Docling",
    provider: "Docling",
    displayName: "Docling",
    category: "document-parser",
    deployment: "self-hosted",
    stages: ["ocr", "layout", "structure", "visual-understanding"],
    capabilities: { ...PARSER_CAPABILITIES, visualUnderstanding: true },
    input: PARSER_INPUT,
    supportsVersionPinning: false,
  },
  "OpenAI Vision": {
    id: "openai-vision",
    engineType: "OpenAI Vision",
    kind: "vision",
    provider: "OpenAI",
    displayName: "OpenAI Vision",
    category: "document-vlm",
    deployment: "managed",
    stages: ["ocr", "layout", "visual-understanding", "structure"],
    capabilities: VISION_CAPABILITIES,
    input: NATIVE_PDF_VISION_INPUT,
    defaultModel: "gpt-5.6-sol",
    supportsVersionPinning: true,
  },
  "Gemini Vision": {
    id: "gemini-vision",
    engineType: "Gemini Vision",
    kind: "vision",
    provider: "Google",
    displayName: "Gemini Vision",
    category: "document-vlm",
    deployment: "managed",
    stages: ["ocr", "layout", "visual-understanding", "structure"],
    capabilities: VISION_CAPABILITIES,
    input: NATIVE_PDF_VISION_INPUT,
    defaultModel: "gemini-3.5-flash",
    supportsVersionPinning: true,
  },
  "Claude Vision": {
    id: "claude-vision",
    engineType: "Claude Vision",
    kind: "vision",
    provider: "Anthropic",
    displayName: "Claude Vision",
    category: "document-vlm",
    deployment: "managed",
    stages: ["ocr", "layout", "visual-understanding", "structure"],
    capabilities: VISION_CAPABILITIES,
    input: NATIVE_PDF_VISION_INPUT,
    defaultModel: "claude-opus-5",
    supportsVersionPinning: true,
  },
  "Qwen Vision": {
    id: "qwen-vision",
    engineType: "Qwen Vision",
    kind: "vision",
    provider: "Alibaba Cloud",
    displayName: "Qwen Vision",
    category: "document-vlm",
    deployment: "managed",
    stages: ["ocr", "layout", "visual-understanding", "structure"],
    capabilities: VISION_CAPABILITIES,
    input: {
      nativePdf: false,
      originalImages: true,
      nativeOfficeCapture: true,
      pdfRasterFallback: true,
    },
    defaultModel: "qwen3-vl-plus",
    supportsVersionPinning: true,
  },
};

export function getDocumentEngine(engineType: DocumentEngineType): DocumentEngineDefinition {
  return DOCUMENT_ENGINES[engineType];
}

export function listDocumentEngines(kind?: DocumentEngineKind): DocumentEngineDefinition[] {
  const engines = Object.values(DOCUMENT_ENGINES);
  return kind ? engines.filter((engine) => engine.kind === kind) : engines;
}

export function isVisionEngine(engineType: DocumentEngineType): engineType is VisionEngineType {
  return DOCUMENT_ENGINES[engineType].kind === "vision";
}
