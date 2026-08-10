export const SPLITTER_TYPES = [
  "RecursiveCharacterTextSplitter",
  "CharacterTextSplitter",
  "TokenTextSplitter",
  "MarkdownTextSplitter",
  "LatexTextSplitter",
  "CodeSplitter",
  "SemanticChunker",
  "DocumentStructureSplitter",
] as const;

export type SplitterType = (typeof SPLITTER_TYPES)[number];
export type EncodingName = "cl100k_base" | "p50k_base" | "r50k_base";
export type ProgrammingLanguage =
  | "python" | "js" | "ts" | "java" | "cpp" | "go"
  | "rust" | "php" | "ruby" | "swift" | "kotlin"
  | "csharp" | "html" | "markdown" | "latex";
export type BreakpointType = "percentile" | "standard_deviation" | "interquartile" | "gradient";

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

export interface SourceMetadata {
  fileName?: string;
  parserType?: string;
  parseRunId?: string;
  documentHash?: string;
  engineId?: string;
  /** Page holding the largest share of the chunk. */
  pageNumber?: number;
  /** Every page the chunk overlaps, in ascending order. */
  pageNumbers?: number[];
  /** Document IR blocks the chunk overlaps, in reading order. */
  blockIds?: string[];
  bBox?: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
  originalJson?: unknown;
}

export interface ChunkMetadata {
  startIndex: number;
  endIndex: number;
  length: number;
  chunkSize: number;
  chunkOverlap: number;
  tokenCount?: number;
  source?: SourceMetadata;
}

export interface ChunkResult {
  index: number;
  content: string;
  metadata: ChunkMetadata;
}

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

export interface SplitRequest {
  text: string;
  config: SplitterConfig;
  sourceMetadata?: SourceMetadata;
}

export type ViewMode = "json" | "card";
export type InputMode = "upload" | "plaintext" | "storage";

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
  DocumentStructureSplitter: {
    name: "Document Structure Splitter",
    description:
      "파싱된 Document IR의 블록 경계를 따라 분할합니다. 표는 쪼개지 않고, 헤딩 문맥을 상속하며, "
      + "페이지를 넘지 않습니다. 각 청크에 정확한 페이지·블록 provenance가 기록되어 검색 평가에 바로 쓰입니다. "
      + "Parser 결과를 Splitter로 보낸 경우에만 사용할 수 있습니다.",
    useCases: [
      "표·수식·그림이 포함된 문서를 손상 없이 청킹하고 싶을 때",
      "검색 결과를 페이지·블록 단위 기대 근거로 채점하고 싶을 때",
      "파서 품질이 검색 품질에 미치는 영향을 측정하고 싶을 때",
    ],
    parameters: [
      {
        name: "chunkSize",
        description: "블록을 누적할 최대 문자 수. 표처럼 나눌 수 없는 블록은 이 값을 넘어도 하나로 유지됩니다.",
        type: "number",
        default: 1000,
        required: true,
      },
    ],
  },
};
