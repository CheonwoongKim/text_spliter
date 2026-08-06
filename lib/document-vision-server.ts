import "server-only";

import type {
  JsonValue,
  VisionEngineConfig,
  VisionEngineType,
  VisionInputMode,
} from "@/lib/types";
import {
  documentFileExtension,
  resolveVisionInputMode,
} from "@/lib/document-vision";

const PDF_MIME_TYPE = "application/pdf";

interface VisionBinaryPart {
  mimeType: string;
  base64: string;
}

export interface PreparedVisionInput {
  filename: string;
  mode: VisionInputMode;
  document?: VisionBinaryPart;
  images?: VisionBinaryPart[];
  renderer?: {
    name: string;
    version?: string;
  };
}

export interface VisionProviderResult {
  text: string;
  model: string;
  raw: JsonValue;
}

interface NativeRendererResponse {
  renderer?: { name?: string; version?: string };
  pages?: Array<{
    pageNumber?: number;
    mimeType?: string;
    data?: string;
    base64?: string;
    imageBase64?: string;
  }>;
}

function resolvedMimeType(file: File): string {
  if (file.type) return file.type;
  const extension = documentFileExtension(file.name);
  if (extension === "pdf") return PDF_MIME_TYPE;
  if (extension === "png") return "image/png";
  if (extension === "jpg" || extension === "jpeg") return "image/jpeg";
  if (extension === "webp") return "image/webp";
  return "application/octet-stream";
}

function stripDataUrlPrefix(value: string): string {
  const comma = value.indexOf(",");
  return value.startsWith("data:") && comma >= 0 ? value.slice(comma + 1) : value;
}

function asJsonValue(value: unknown): JsonValue {
  return JSON.parse(JSON.stringify(value)) as JsonValue;
}

async function responseError(response: Response, provider: string): Promise<Error> {
  const body = await response.text().catch(() => "");
  let message = body;
  try {
    const parsed = JSON.parse(body) as {
      error?: { message?: string } | string;
      message?: string;
    };
    message = typeof parsed.error === "string"
      ? parsed.error
      : parsed.error?.message || parsed.message || body;
  } catch {
    // Keep the provider text response.
  }
  return new Error(`${provider} request failed (HTTP ${response.status}): ${message.slice(0, 1200)}`);
}

async function renderPages({
  file,
  endpoint,
  apiKey,
  mode,
}: {
  file: File;
  endpoint?: string;
  apiKey?: string;
  mode: "native-page-capture" | "rasterized-fallback";
}): Promise<Pick<PreparedVisionInput, "images" | "renderer">> {
  if (!endpoint) {
    const reason = mode === "native-page-capture"
      ? "DOC/DOCX/HWP/HWPX files require native page capture"
      : "This model requires PDF page images";
    throw new Error(
      `${reason}. Configure Native document renderer in Settings > Connections.`
    );
  }

  const form = new FormData();
  form.append("file", file);
  form.append("mode", mode);
  form.append("outputFormat", "png");

  const headers: Record<string, string> = {};
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;
  const response = await fetch(`${endpoint.replace(/\/+$/, "")}/v1/render`, {
    method: "POST",
    headers,
    body: form,
    signal: AbortSignal.timeout(300_000),
  });
  if (!response.ok) throw await responseError(response, "Native document renderer");

  const body = (await response.json()) as NativeRendererResponse;
  const images = (body.pages || [])
    .sort((left, right) => (left.pageNumber || 0) - (right.pageNumber || 0))
    .map((page) => ({
      mimeType: page.mimeType || "image/png",
      base64: stripDataUrlPrefix(page.data || page.base64 || page.imageBase64 || ""),
    }))
    .filter((page) => page.base64.length > 0);

  if (images.length === 0) {
    throw new Error("Native document renderer returned no page images.");
  }

  return {
    images,
    renderer: {
      name: body.renderer?.name || "native-document-renderer",
      ...(body.renderer?.version ? { version: body.renderer.version } : {}),
    },
  };
}

export async function prepareVisionInput({
  file,
  engineType,
  config,
  rendererEndpoint,
  rendererApiKey,
}: {
  file: File;
  engineType: VisionEngineType;
  config: VisionEngineConfig;
  rendererEndpoint?: string;
  rendererApiKey?: string;
}): Promise<PreparedVisionInput> {
  const mimeType = resolvedMimeType(file);
  const mode = resolveVisionInputMode({
    engineType,
    filename: file.name,
    mimeType,
    inputPreference: config.inputPreference,
  });
  if (mode === "original-image") {
    const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");
    return {
      filename: file.name,
      mode: "original-image",
      images: [{ mimeType, base64 }],
    };
  }

  if (mode === "native-document") {
      const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");
      return {
        filename: file.name,
        mode: "native-document",
        document: { mimeType: PDF_MIME_TYPE, base64 },
      };
  }

  if (mode === "rasterized-fallback") {
    const rendered = await renderPages({
      file,
      endpoint: rendererEndpoint,
      apiKey: rendererApiKey,
      mode: "rasterized-fallback",
    });
    return {
      filename: file.name,
      mode: "rasterized-fallback",
      ...rendered,
    };
  }

  if (mode === "native-page-capture") {
    const rendered = await renderPages({
      file,
      endpoint: rendererEndpoint,
      apiKey: rendererApiKey,
      mode: "native-page-capture",
    });
    return {
      filename: file.name,
      mode: "native-page-capture",
      ...rendered,
    };
  }

  throw new Error("Unsupported vision input mode.");
}

function requireText(text: string, provider: string): string {
  const normalized = text.trim();
  if (!normalized) throw new Error(`${provider} returned no document text.`);
  return normalized;
}

export async function runOpenAIVision({
  apiKey,
  input,
  config,
}: {
  apiKey?: string;
  input: PreparedVisionInput;
  config: VisionEngineConfig;
}): Promise<VisionProviderResult> {
  if (!apiKey) throw new Error("OpenAI API key is not configured in Settings > Connections.");
  const content: Array<Record<string, unknown>> = [];
  if (input.document) {
    content.push({
      type: "input_file",
      filename: input.filename,
      file_data: `data:${input.document.mimeType};base64,${input.document.base64}`,
      detail: config.pdfDetail || "high",
    });
  }
  for (const image of input.images || []) {
    content.push({
      type: "input_image",
      image_url: `data:${image.mimeType};base64,${image.base64}`,
      detail: config.pdfDetail || "high",
    });
  }
  content.push({ type: "input_text", text: config.prompt });

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: config.modelId,
      input: [{ role: "user", content }],
      max_output_tokens: config.maxOutputTokens,
      store: false,
    }),
    signal: AbortSignal.timeout(300_000),
  });
  if (!response.ok) throw await responseError(response, "OpenAI");
  const body = await response.json() as {
    model?: string;
    output_text?: string;
    output?: Array<{ content?: Array<{ type?: string; text?: string }> }>;
  };
  const text = body.output_text || (body.output || [])
    .flatMap((item) => item.content || [])
    .filter((item) => item.type === "output_text")
    .map((item) => item.text || "")
    .join("\n");
  return {
    text: requireText(text, "OpenAI"),
    model: body.model || config.modelId || "OpenAI Vision",
    raw: asJsonValue(body),
  };
}

export async function runGeminiVision({
  apiKey,
  input,
  config,
}: {
  apiKey?: string;
  input: PreparedVisionInput;
  config: VisionEngineConfig;
}): Promise<VisionProviderResult> {
  if (!apiKey) throw new Error("Gemini API key is not configured in Settings > Connections.");
  const parts: Array<Record<string, unknown>> = [];
  if (input.document) {
    parts.push({ inline_data: { mime_type: input.document.mimeType, data: input.document.base64 } });
  }
  for (const image of input.images || []) {
    parts.push({ inline_data: { mime_type: image.mimeType, data: image.base64 } });
  }
  parts.push({ text: config.prompt });
  const model = config.modelId || "gemini-3.5-flash";
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        contents: [{ role: "user", parts }],
        generationConfig: { maxOutputTokens: config.maxOutputTokens },
      }),
      signal: AbortSignal.timeout(300_000),
    }
  );
  if (!response.ok) throw await responseError(response, "Gemini");
  const body = await response.json() as {
    modelVersion?: string;
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = (body.candidates || [])
    .flatMap((candidate) => candidate.content?.parts || [])
    .map((part) => part.text || "")
    .join("\n");
  return {
    text: requireText(text, "Gemini"),
    model: body.modelVersion || model,
    raw: asJsonValue(body),
  };
}

export async function runClaudeVision({
  apiKey,
  input,
  config,
}: {
  apiKey?: string;
  input: PreparedVisionInput;
  config: VisionEngineConfig;
}): Promise<VisionProviderResult> {
  if (!apiKey) throw new Error("Anthropic API key is not configured in Settings > Connections.");
  const content: Array<Record<string, unknown>> = [];
  if (input.document) {
    content.push({
      type: "document",
      source: { type: "base64", media_type: input.document.mimeType, data: input.document.base64 },
    });
  }
  for (const image of input.images || []) {
    content.push({
      type: "image",
      source: { type: "base64", media_type: image.mimeType, data: image.base64 },
    });
  }
  content.push({ type: "text", text: config.prompt });
  const model = config.modelId || "claude-opus-5";
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({ model, max_tokens: config.maxOutputTokens, messages: [{ role: "user", content }] }),
    signal: AbortSignal.timeout(300_000),
  });
  if (!response.ok) throw await responseError(response, "Anthropic");
  const body = await response.json() as {
    model?: string;
    content?: Array<{ type?: string; text?: string }>;
  };
  const text = (body.content || [])
    .filter((part) => part.type === "text")
    .map((part) => part.text || "")
    .join("\n");
  return {
    text: requireText(text, "Anthropic"),
    model: body.model || model,
    raw: asJsonValue(body),
  };
}

export async function runQwenVision({
  apiKey,
  endpoint,
  input,
  config,
}: {
  apiKey?: string;
  endpoint?: string;
  input: PreparedVisionInput;
  config: VisionEngineConfig;
}): Promise<VisionProviderResult> {
  if (!apiKey) throw new Error("Qwen API key is not configured in Settings > Connections.");
  if (!endpoint) throw new Error("Qwen compatible API endpoint is not configured in Settings > Connections.");
  if (!input.images?.length) throw new Error("Qwen Vision requires page images.");
  const content: Array<Record<string, unknown>> = input.images.map((image) => ({
    type: "image_url",
    image_url: { url: `data:${image.mimeType};base64,${image.base64}` },
  }));
  content.push({ type: "text", text: config.prompt });
  const model = config.modelId || "qwen3-vl-plus";
  const response = await fetch(`${endpoint.replace(/\/+$/, "")}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content }],
      max_tokens: config.maxOutputTokens,
    }),
    signal: AbortSignal.timeout(300_000),
  });
  if (!response.ok) throw await responseError(response, "Qwen");
  const body = await response.json() as {
    model?: string;
    choices?: Array<{
      message?: { content?: string | Array<{ type?: string; text?: string }> };
    }>;
  };
  const value = body.choices?.[0]?.message?.content;
  const text = typeof value === "string"
    ? value
    : (value || []).map((part) => part.text || "").join("\n");
  return {
    text: requireText(text, "Qwen"),
    model: body.model || model,
    raw: asJsonValue(body),
  };
}

export async function runVisionProvider({
  engineType,
  input,
  config,
  credentials,
}: {
  engineType: VisionEngineType;
  input: PreparedVisionInput;
  config: VisionEngineConfig;
  credentials: Record<string, string>;
}): Promise<VisionProviderResult> {
  switch (engineType) {
    case "OpenAI Vision":
      return runOpenAIVision({ apiKey: credentials.openaiEmbedding, input, config });
    case "Gemini Vision":
      return runGeminiVision({ apiKey: credentials.geminiVision, input, config });
    case "Claude Vision":
      return runClaudeVision({ apiKey: credentials.anthropicVision, input, config });
    case "Qwen Vision":
      return runQwenVision({
        apiKey: credentials.qwenVision,
        endpoint: credentials.qwenVisionEndpoint,
        input,
        config,
      });
  }
}
