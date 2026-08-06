import type {
  ParserEngineConfig,
  ParserEngineConfigMap,
  ParserType,
} from "@/lib/types";

export const PARSER_SETTINGS_SCHEMA_VERSION = 1;

const DEFAULT_CONFIGS: ParserEngineConfigMap = {
  Upstage: {},
  LlamaIndex: {
    llamaTier: "agentic",
    llamaVersion: "latest",
  },
  Azure: {
    azureModelId: "prebuilt-layout",
    azureOutputFormat: "markdown",
  },
  Google: {},
  Docling: {
    doclingOutputFormat: "markdown",
    doclingOcrMode: "auto",
    doclingPipeline: "standard",
    doclingTableMode: "accurate",
    extractImages: false,
  },
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function trimmedString(value: unknown, maxLength = 128): string | undefined {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim().slice(0, maxLength);
  return normalized || undefined;
}

function enumValue<T extends string>(
  value: unknown,
  allowed: readonly T[],
  fallback: T
): T {
  return typeof value === "string" && allowed.includes(value as T)
    ? value as T
    : fallback;
}

export function getDefaultParserEngineConfig(
  parserType: ParserType
): ParserEngineConfig {
  return { ...DEFAULT_CONFIGS[parserType] };
}

export function createDefaultParserEngineConfigMap(): ParserEngineConfigMap {
  return {
    Upstage: getDefaultParserEngineConfig("Upstage"),
    LlamaIndex: getDefaultParserEngineConfig("LlamaIndex"),
    Azure: getDefaultParserEngineConfig("Azure"),
    Google: getDefaultParserEngineConfig("Google"),
    Docling: getDefaultParserEngineConfig("Docling"),
  };
}

export function normalizeParserEngineConfig(
  parserType: ParserType,
  value: unknown
): ParserEngineConfig {
  const source = asRecord(value);

  switch (parserType) {
    case "Upstage":
      return {
        ...(trimmedString(source.language, 32)
          ? { language: trimmedString(source.language, 32) }
          : {}),
      };
    case "LlamaIndex":
      return {
        llamaTier: enumValue(
          source.llamaTier,
          ["fast", "cost_effective", "agentic", "agentic_plus"] as const,
          "agentic"
        ),
        llamaVersion: trimmedString(source.llamaVersion, 64) || "latest",
        ...(trimmedString(source.pageRange, 200)
          ? { pageRange: trimmedString(source.pageRange, 200) }
          : {}),
        ...(trimmedString(source.language, 32)
          ? { language: trimmedString(source.language, 32) }
          : {}),
      };
    case "Azure":
      return {
        azureModelId: enumValue(
          source.azureModelId,
          ["prebuilt-layout", "prebuilt-read", "prebuilt-document"] as const,
          "prebuilt-layout"
        ),
        azureOutputFormat: enumValue(
          source.azureOutputFormat,
          ["text", "markdown"] as const,
          "markdown"
        ),
      };
    case "Google":
      return {
        ...(trimmedString(source.googleLocation, 64)
          ? { googleLocation: trimmedString(source.googleLocation, 64) }
          : {}),
        ...(trimmedString(source.googleProcessorId, 160)
          ? { googleProcessorId: trimmedString(source.googleProcessorId, 160) }
          : {}),
      };
    case "Docling":
      return {
        doclingOutputFormat: enumValue(
          source.doclingOutputFormat,
          ["markdown", "html", "json"] as const,
          "markdown"
        ),
        doclingOcrMode: enumValue(
          source.doclingOcrMode,
          ["disabled", "auto", "force"] as const,
          "auto"
        ),
        doclingPipeline: enumValue(
          source.doclingPipeline,
          ["standard", "vlm"] as const,
          "standard"
        ),
        doclingTableMode: enumValue(
          source.doclingTableMode,
          ["fast", "accurate"] as const,
          "accurate"
        ),
        extractImages: source.extractImages === true,
        ...(trimmedString(source.language, 32)
          ? { language: trimmedString(source.language, 32) }
          : {}),
      };
  }
}

export function summarizeParserEngineConfig(
  parserType: ParserType,
  config: unknown
): string {
  const normalized = normalizeParserEngineConfig(parserType, config);

  switch (parserType) {
    case "Upstage":
      return normalized.language ? `OCR ${normalized.language}` : "Automatic OCR";
    case "LlamaIndex":
      return `${normalized.llamaTier} · ${normalized.llamaVersion}`;
    case "Azure":
      return `${normalized.azureModelId} · ${normalized.azureOutputFormat}`;
    case "Google":
      return normalized.googleProcessorId
        ? `${normalized.googleLocation || "API default"} · ${normalized.googleProcessorId}`
        : "Connect defaults";
    case "Docling":
      return `${normalized.doclingPipeline} · ${normalized.doclingOcrMode} OCR · ${normalized.doclingTableMode}`;
  }
}
