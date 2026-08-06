import { isVisionEngine } from "@/lib/document-engines";
import type { DocumentEngineType, ParserType } from "@/lib/types";

const STANDARD_EXTENSIONS = [
  ".pdf",
  ".png",
  ".jpg",
  ".jpeg",
  ".docx",
  ".pptx",
] as const;

const DOCLING_EXTENSIONS = [
  ...STANDARD_EXTENSIONS,
  ".webp",
  ".doc",
  ".ppt",
  ".xls",
  ".xlsx",
  ".csv",
  ".html",
  ".htm",
  ".md",
  ".txt",
] as const;

const VISION_EXTENSIONS = [
  ".pdf",
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".doc",
  ".docx",
  ".hwp",
  ".hwpx",
  ".ppt",
  ".pptx",
] as const;

function extensionsForEngine(engineType: DocumentEngineType): readonly string[] {
  if (isVisionEngine(engineType)) return VISION_EXTENSIONS;
  return engineType === ("Docling" satisfies ParserType) ? DOCLING_EXTENSIONS : STANDARD_EXTENSIONS;
}

export function getParserFileTypeProfile(engineTypes: DocumentEngineType[]) {
  const effectiveTypes = engineTypes.length > 0 ? engineTypes : ["Upstage" as const];
  const extensions = extensionsForEngine(effectiveTypes[0]).filter((extension) =>
    effectiveTypes.every((engineType) =>
      extensionsForEngine(engineType).includes(extension)
    )
  );

  return {
    extensions,
    accept: extensions.join(","),
    label: extensions.map((extension) => extension.slice(1).toUpperCase()).join(", "),
  };
}

export function isParserFileSupported(
  filename: string,
  engineTypes: DocumentEngineType[]
): boolean {
  const normalizedName = filename.trim().toLowerCase();
  return getParserFileTypeProfile(engineTypes).extensions.some((extension) =>
    normalizedName.endsWith(extension)
  );
}
