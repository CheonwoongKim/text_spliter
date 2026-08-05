import type { ParserType } from "@/lib/types";

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

function extensionsForParser(parserType: ParserType): readonly string[] {
  return parserType === "Docling" ? DOCLING_EXTENSIONS : STANDARD_EXTENSIONS;
}

export function getParserFileTypeProfile(parserTypes: ParserType[]) {
  const effectiveTypes = parserTypes.length > 0 ? parserTypes : ["Upstage" as const];
  const extensions = extensionsForParser(effectiveTypes[0]).filter((extension) =>
    effectiveTypes.every((parserType) =>
      extensionsForParser(parserType).includes(extension)
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
  parserTypes: ParserType[]
): boolean {
  const normalizedName = filename.trim().toLowerCase();
  return getParserFileTypeProfile(parserTypes).extensions.some((extension) =>
    normalizedName.endsWith(extension)
  );
}
