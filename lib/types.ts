// Splitter types
export type SplitterType =
  | "CharacterTextSplitter"
  | "RecursiveCharacterTextSplitter"
  | "TokenTextSplitter"
  | "MarkdownTextSplitter"
  | "LatexTextSplitter"
  | "CodeSplitter"
  | "SemanticChunker";

// Encoding names for TokenTextSplitter
export type EncodingName = "cl100k_base" | "p50k_base" | "r50k_base";

// Programming languages for CodeSplitter
export type ProgrammingLanguage =
  | "python" | "js" | "ts" | "java" | "cpp" | "go"
  | "rust" | "php" | "ruby" | "swift" | "kotlin"
  | "csharp" | "html" | "markdown" | "latex";

// Breakpoint types for SemanticChunker
export type BreakpointType = "percentile" | "standard_deviation" | "interquartile" | "gradient";

// Splitter configuration
export interface SplitterConfig {
  splitterType: SplitterType;
  chunkSize: number;
  chunkOverlap: number;
  separator?: string;
  separators?: string[];
  encodingName?: EncodingName;
  modelName?: string;
  language?: ProgrammingLanguage;
  breakpointType?: BreakpointType;
}

// Chunk metadata
export interface ChunkMetadata {
  startIndex: number;
  endIndex: number;
  length: number;
  chunkSize: number;
  chunkOverlap: number;
  tokenCount?: number;
}

// Individual chunk result
export interface ChunkResult {
  index: number;
  content: string;
  metadata: ChunkMetadata;
}

// API response
export interface SplitResponse {
  chunks: ChunkResult[];
  totalChunks: number;
  splitterType: SplitterType;
  parameters: SplitterConfig;
  statistics: {
    averageChunkSize: number;
    minChunkSize: number;
    maxChunkSize: number;
    processingTime: number;
  };
}

// API request
export interface SplitRequest {
  text: string;
  config: SplitterConfig;
}

// View mode
export type ViewMode = "json" | "card";

// Input mode
export type InputMode = "upload" | "plaintext";

// Splitter description
export interface SplitterDescription {
  name: string;
  description: string;
  useCases: string[];
  parameters: {
    name: string;
    description: string;
    type: string;
    default?: string | number;
    required: boolean;
  }[];
}

// Parser types
export type ParserType = "Upstage" | "LlamaIndex" | "Azure" | "Google";

// Parser configuration
export interface ParserConfig {
  parserType: ParserType;

  // Common parser settings
  language?: string; // OCR language (e.g., 'ko', 'en', 'ja')
  extractImages?: boolean;
  extractTables?: boolean;
  pageRange?: string; // e.g., "1-5" or "1,3,5-10"

  // Upstage specific settings
  upstageOutputFormat?: 'text' | 'html' | 'markdown';

  // LlamaIndex specific settings
  llamaResultType?: 'text' | 'markdown' | 'json';
  llamaGpt4oMode?: boolean;

  // Azure specific settings
  azureModelId?: string; // e.g., 'prebuilt-layout', 'prebuilt-read', 'prebuilt-document'
  azureOutputFormat?: 'text' | 'markdown'; // outputContentFormat parameter

  // Google specific settings (JSON only - no output format option)
  googleProcessorId?: string;
  googleLocation?: string;
}

// Parse request
export interface ParseRequest {
  file: File;
  config: ParserConfig;
}

// Parse response
export interface ParseResponse {
  text?: string;
  html?: string;
  markdown?: string;
  json?: any;
  metadata?: {
    fileName: string;
    fileSize: number;
    mimeType: string;
    pageCount?: number;
    processingTime: number;
  };
}

// Parser view mode - now dynamic based on available content
export type ParserViewMode = "text" | "html" | "markdown" | "json" | "raw";

// VectorStore types
export interface DatabaseSchema {
  name: string;
  tables: TableInfo[];
}

export interface TableInfo {
  name: string;
  schema: string;
  rowCount: number;
  columns: ColumnInfo[];
}

export interface ColumnInfo {
  name: string;
  type: string;
  nullable: boolean;
  isPrimaryKey?: boolean;
}

export interface TableRow {
  [key: string]: any;
}

export interface VectorStoreConfig {
  selectedSchema?: string;
  selectedTable?: string;
}

export interface TableDataResponse {
  rows: TableRow[];
  totalCount: number;
  columns: ColumnInfo[];
}

// Splitter information map
export const SPLITTER_INFO: Record<SplitterType, SplitterDescription> = {
  CharacterTextSplitter: {
    name: "Character Text Splitter",
    description:
      "특정 구분자를 기준으로 텍스트를 분할합니다. 가장 단순한 형태의 스플리터입니다.",
    useCases: [
      "단순한 텍스트 분할이 필요할 때",
      "특정 구분자(예: 줄바꿈, 마침표)를 기준으로 나누고 싶을 때",
      "구조가 일정한 문서를 처리할 때",
    ],
    parameters: [
      {
        name: "chunkSize",
        description: "각 청크의 최대 문자 수",
        type: "number",
        default: 1000,
        required: true,
      },
      {
        name: "chunkOverlap",
        description: "연속된 청크 간 중복되는 문자 수",
        type: "number",
        default: 200,
        required: true,
      },
      {
        name: "separator",
        description: "텍스트를 나누는 기준 구분자",
        type: "string",
        default: "\n\n",
        required: false,
      },
    ],
  },
  RecursiveCharacterTextSplitter: {
    name: "Recursive Character Text Splitter",
    description:
      "여러 구분자를 계층적으로 시도하여 텍스트를 분할합니다. 가장 권장되는 범용 스플리터입니다.",
    useCases: [
      "일반적인 텍스트 문서 처리 (권장)",
      "단락, 문장 구조를 유지하면서 분할하고 싶을 때",
      "자연스러운 경계에서 텍스트를 나누고 싶을 때",
    ],
    parameters: [
      {
        name: "chunkSize",
        description: "각 청크의 최대 문자 수",
        type: "number",
        default: 1000,
        required: true,
      },
      {
        name: "chunkOverlap",
        description: "연속된 청크 간 중복되는 문자 수",
        type: "number",
        default: 200,
        required: true,
      },
      {
        name: "separators",
        description: "계층적으로 시도할 구분자 목록 (우선순위 순)",
        type: "string[]",
        default: '["\\n\\n", "\\n", " ", ""]',
        required: false,
      },
    ],
  },
  TokenTextSplitter: {
    name: "Token Text Splitter",
    description:
      "토큰 단위로 텍스트를 정확하게 분할합니다. OpenAI 모델 사용 시 유용합니다.",
    useCases: [
      "LLM의 토큰 제한을 정확하게 맞춰야 할 때",
      "OpenAI API를 사용하는 경우",
      "토큰 수를 기준으로 비용을 계산해야 할 때",
    ],
    parameters: [
      {
        name: "chunkSize",
        description: "각 청크의 최대 토큰 수",
        type: "number",
        default: 1000,
        required: true,
      },
      {
        name: "chunkOverlap",
        description: "연속된 청크 간 중복되는 토큰 수",
        type: "number",
        default: 200,
        required: true,
      },
      {
        name: "encodingName",
        description: "사용할 인코딩 방식 (예: cl100k_base, p50k_base)",
        type: "string",
        default: "cl100k_base",
        required: false,
      },
    ],
  },
  MarkdownTextSplitter: {
    name: "Markdown Text Splitter",
    description:
      "Markdown 문서의 구조(헤더, 리스트 등)를 유지하면서 텍스트를 분할합니다.",
    useCases: [
      "Markdown 문서를 처리할 때",
      "기술 문서나 README 파일 분할 시",
      "블로그 포스트나 문서 구조를 유지하고 싶을 때",
    ],
    parameters: [
      {
        name: "chunkSize",
        description: "각 청크의 최대 문자 수",
        type: "number",
        default: 1000,
        required: true,
      },
      {
        name: "chunkOverlap",
        description: "연속된 청크 간 중복되는 문자 수",
        type: "number",
        default: 200,
        required: true,
      },
    ],
  },
  LatexTextSplitter: {
    name: "LaTeX Text Splitter",
    description:
      "LaTeX 문서의 구조(섹션, 서브섹션 등)를 유지하면서 텍스트를 분할합니다.",
    useCases: [
      "LaTeX 논문이나 문서를 처리할 때",
      "학술 문서를 분할할 때",
      "수식과 텍스트가 혼합된 문서를 처리할 때",
    ],
    parameters: [
      {
        name: "chunkSize",
        description: "각 청크의 최대 문자 수",
        type: "number",
        default: 1000,
        required: true,
      },
      {
        name: "chunkOverlap",
        description: "연속된 청크 간 중복되는 문자 수",
        type: "number",
        default: 200,
        required: true,
      },
    ],
  },
  CodeSplitter: {
    name: "Code Splitter",
    description:
      "프로그래밍 언어의 구조(함수, 클래스 등)를 유지하면서 코드를 분할합니다.",
    useCases: [
      "소스 코드를 처리할 때",
      "코드 문서화나 분석 시",
      "함수나 클래스 단위로 코드를 나누고 싶을 때",
    ],
    parameters: [
      {
        name: "chunkSize",
        description: "각 청크의 최대 문자 수",
        type: "number",
        default: 1000,
        required: true,
      },
      {
        name: "chunkOverlap",
        description: "연속된 청크 간 중복되는 문자 수",
        type: "number",
        default: 200,
        required: true,
      },
      {
        name: "language",
        description: "프로그래밍 언어 (예: python, javascript, typescript)",
        type: "string",
        default: "python",
        required: true,
      },
    ],
  },
  SemanticChunker: {
    name: "Semantic Chunker",
    description:
      "임베딩을 사용하여 의미적으로 유사한 문장들을 그룹화하여 분할합니다. OpenAI API가 필요합니다.",
    useCases: [
      "의미적으로 관련된 내용을 함께 유지하고 싶을 때",
      "문맥을 최대한 보존하면서 분할하고 싶을 때",
      "고품질의 의미 기반 청킹이 필요할 때",
    ],
    parameters: [
      {
        name: "breakpointType",
        description: "문장 경계를 결정하는 방식 (percentile, standard_deviation, interquartile, gradient)",
        type: "string",
        default: "percentile",
        required: false,
      },
    ],
  },
};
