/**
 * Read text from various file types using server-side API
 */
export async function readFile(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch("/api/parse-file", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to parse file");
  }

  const data = await response.json();
  return data.text;
}

/**
 * Validate file type
 */
export function isValidFileType(file: File): boolean {
  const extension = file.name.split(".").pop()?.toLowerCase();
  return ["txt", "pdf", "doc", "docx"].includes(extension || "");
}
