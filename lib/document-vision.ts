import type {
  VisionEngineType,
  VisionInputMode,
  VisionInputPreference,
} from "@/lib/types";

const IMAGE_EXTENSIONS = new Set(["png", "jpg", "jpeg", "webp", "gif"]);
const OFFICE_EXTENSIONS = new Set(["doc", "docx", "hwp", "hwpx", "ppt", "pptx"]);

export function documentFileExtension(filename: string): string {
  const match = filename.toLowerCase().match(/\.([^.]+)$/);
  return match?.[1] || "";
}

export function resolveVisionInputMode({
  engineType,
  filename,
  mimeType,
  inputPreference = "auto",
}: {
  engineType: VisionEngineType;
  filename: string;
  mimeType: string;
  inputPreference?: VisionInputPreference;
}): VisionInputMode {
  const extension = documentFileExtension(filename);
  if (mimeType.startsWith("image/") || IMAGE_EXTENSIONS.has(extension)) {
    return "original-image";
  }
  if (mimeType === "application/pdf" || extension === "pdf") {
    return engineType !== "Qwen Vision" && inputPreference !== "page-images"
      ? "native-document"
      : "rasterized-fallback";
  }
  if (OFFICE_EXTENSIONS.has(extension)) return "native-page-capture";
  throw new Error(`Unsupported document extension: ${extension || "unknown"}`);
}
