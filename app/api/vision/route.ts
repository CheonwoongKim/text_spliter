import { createHash, randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getDecryptedApiKeyMap } from "@/lib/api-key-store";
import { getUserEmailFromToken } from "@/lib/auth-server";
import { API_KEY_NAMES, FILE_UPLOAD_CONFIG } from "@/lib/constants";
import {
  DOCUMENT_ENGINE_SETTINGS_SCHEMA_VERSION,
  normalizeDocumentEngineConfig,
} from "@/lib/document-engine-settings";
import { getDocumentEngine, isVisionEngine } from "@/lib/document-engines";
import {
  prepareVisionInput,
  runVisionProvider,
} from "@/lib/document-vision-server";
import { normalizeDocument } from "@/lib/normalize-document";
import type {
  DocumentEngineConfig,
  JsonObject,
  ParseResponse,
  VisionEngineType,
} from "@/lib/types";
import { ValidationError, validateDocumentEngineType } from "@/lib/validation";

const VISION_CREDENTIAL_KEYS = [
  API_KEY_NAMES.OPENAI_EMBEDDING,
  API_KEY_NAMES.GEMINI_VISION,
  API_KEY_NAMES.ANTHROPIC_VISION,
  API_KEY_NAMES.QWEN_VISION,
  API_KEY_NAMES.QWEN_VISION_ENDPOINT,
  API_KEY_NAMES.NATIVE_DOCUMENT_RENDERER_ENDPOINT,
  API_KEY_NAMES.NATIVE_DOCUMENT_RENDERER_API_KEY,
];

export async function POST(request: NextRequest) {
  const started = Date.now();
  const startedAt = new Date(started).toISOString();

  try {
    const userEmail = await getUserEmailFromToken(request);
    if (!userEmail) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) throw new ValidationError("No valid file provided");
    if (file.size > FILE_UPLOAD_CONFIG.MAX_SIZE_BYTES) {
      throw new ValidationError(`File size must not exceed ${FILE_UPLOAD_CONFIG.MAX_SIZE_BYTES / 1024 / 1024}MB`);
    }

    const engineType = validateDocumentEngineType(form.get("engineType"));
    if (!isVisionEngine(engineType)) {
      throw new ValidationError(`${engineType} is not a vision engine`);
    }
    const rawConfig = form.get("config");
    const parsedConfig = typeof rawConfig === "string" && rawConfig
      ? JSON.parse(rawConfig) as DocumentEngineConfig
      : {};
    const config = normalizeDocumentEngineConfig(engineType, parsedConfig);
    const credentials = await getDecryptedApiKeyMap(userEmail, VISION_CREDENTIAL_KEYS);
    const input = await prepareVisionInput({
      file,
      engineType: engineType as VisionEngineType,
      config,
      rendererEndpoint: credentials[API_KEY_NAMES.NATIVE_DOCUMENT_RENDERER_ENDPOINT],
      rendererApiKey: credentials[API_KEY_NAMES.NATIVE_DOCUMENT_RENDERER_API_KEY],
    });
    const providerResult = await runVisionProvider({
      engineType: engineType as VisionEngineType,
      input,
      config,
      credentials,
    });

    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const documentHash = createHash("sha256").update(fileBuffer).digest("hex");
    const experimentIdValue = form.get("experimentId");
    const experimentId = typeof experimentIdValue === "string"
      && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(experimentIdValue)
      ? experimentIdValue
      : undefined;
    const roleValue = form.get("experimentRole");
    const role = roleValue === "primary" || roleValue === "additional" ? roleValue : undefined;
    const engine = getDocumentEngine(engineType);
    const runConfig = {
      modelId: config.modelId || null,
      inputPreference: config.inputPreference || "auto",
      pdfDetail: config.pdfDetail || "high",
      maxOutputTokens: config.maxOutputTokens || 16000,
      prompt: config.prompt || "",
    } as JsonObject;
    const normalizedDocument = normalizeDocument({
      parserType: engineType,
      raw: providerResult.raw,
      text: providerResult.text,
      markdown: providerResult.text,
    });
    const processingTime = Date.now() - started;
    const runId = randomUUID();

    const result: ParseResponse = {
      text: providerResult.text,
      markdown: providerResult.text,
      raw: providerResult.raw,
      document: normalizedDocument,
      run: {
        id: runId,
        engineId: engine.id,
        provider: engine.provider,
        model: providerResult.model,
        status: "succeeded",
        config: runConfig,
        settingsSchemaVersion: DOCUMENT_ENGINE_SETTINGS_SCHEMA_VERSION,
        experimentId,
        role,
        engineKind: "vision",
        inputMode: input.mode,
        renderer: input.renderer,
        startedAt,
        completedAt: new Date().toISOString(),
      },
      metadata: {
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type || "application/octet-stream",
        pageCount: input.images?.length || normalizedDocument.statistics.pageCount,
        processingTime,
        parserType: engineType,
        engineKind: "vision",
        inputMode: input.mode,
        documentHash,
      },
    };

    return NextResponse.json(result);
  } catch (error) {
    const status = error instanceof ValidationError || error instanceof SyntaxError ? 400 : 500;
    console.error("[API /vision] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process document with vision model" },
      { status }
    );
  }
}
