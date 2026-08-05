import { NextRequest, NextResponse } from "next/server";
import { createHash, randomUUID } from "node:crypto";
import type {
  JsonObject,
  JsonValue,
  LlamaParseTier,
  ParseResponse,
  ParserType,
} from "@/lib/types";
import { getDocumentEngine } from "@/lib/document-engines";
import { normalizeDocument } from "@/lib/normalize-document";
import { getDecryptedApiKeyMap } from "@/lib/api-key-store";
import { getUserEmailFromToken } from "@/lib/auth-server";
import { getGoogleServiceAccountAccessToken } from "@/lib/google-auth";
import {
  API_KEY_NAMES,
  API_ENDPOINTS,
  PARSER_TYPES,
  POLLING_CONFIG,
} from "@/lib/constants";

interface LlamaParseResult {
  job?: {
    status?: "PENDING" | "RUNNING" | "COMPLETED" | "FAILED" | "CANCELLED";
    error_message?: string | null;
  };
  text?: { pages?: Array<{ page_number: number; text?: string }> };
  markdown?: { pages?: Array<{ page_number: number; markdown?: string }> };
  items?: {
    pages?: Array<{
      page_number: number;
      page_width?: number;
      page_height?: number;
      items?: JsonValue[];
    }>;
  };
  metadata?: { version?: string };
  [key: string]: unknown;
}

interface DoclingResult {
  document?: {
    md_content?: string;
    html_content?: string;
    text_content?: string;
    json_content?: JsonValue;
  };
  status?: "success" | "partial_success" | "skipped" | "failure";
  errors?: unknown[];
  [key: string]: unknown;
}

const LLAMA_PARSE_TIERS: LlamaParseTier[] = [
  "fast",
  "cost_effective",
  "agentic",
  "agentic_plus",
];
const DOCLING_OUTPUT_FORMATS = ["markdown", "html", "json"] as const;
const DOCLING_OCR_MODES = ["disabled", "auto", "force"] as const;
const DOCLING_PIPELINES = ["standard", "vlm"] as const;
const DOCLING_TABLE_MODES = ["fast", "accurate"] as const;

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const startedAt = new Date(startTime).toISOString();

  try {
    // Authenticate user
    const userEmail = await getUserEmailFromToken(request);
    if (!userEmail) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get form data
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const parserType = formData.get("parserType") as ParserType;

    // Get parser settings
    const language = formData.get("language") as string | null;
    const extractImages = formData.get("extractImages") === "true";
    const extractTables = formData.get("extractTables") === "true";
    const pageRange = formData.get("pageRange") as string | null;

    // Azure specific
    const azureModelId = formData.get("azureModelId") as string | null;
    const azureOutputFormat = formData.get("azureOutputFormat") as string | null;

    // LlamaIndex specific
    const requestedLlamaTier = (formData.get("llamaTier") || "agentic") as string;
    const llamaTier = LLAMA_PARSE_TIERS.includes(requestedLlamaTier as LlamaParseTier)
      ? (requestedLlamaTier as LlamaParseTier)
      : "agentic";
    const llamaVersion = (formData.get("llamaVersion") as string | null) || "latest";

    // Docling specific
    const requestedDoclingOutputFormat = (formData.get("doclingOutputFormat") || "markdown") as string;
    const doclingOutputFormat = DOCLING_OUTPUT_FORMATS.includes(
      requestedDoclingOutputFormat as (typeof DOCLING_OUTPUT_FORMATS)[number]
    ) ? requestedDoclingOutputFormat : "markdown";
    const requestedDoclingOcrMode = (formData.get("doclingOcrMode") || "auto") as string;
    const doclingOcrMode = DOCLING_OCR_MODES.includes(
      requestedDoclingOcrMode as (typeof DOCLING_OCR_MODES)[number]
    ) ? requestedDoclingOcrMode : "auto";
    const requestedDoclingPipeline = (formData.get("doclingPipeline") || "standard") as string;
    const doclingPipeline = DOCLING_PIPELINES.includes(
      requestedDoclingPipeline as (typeof DOCLING_PIPELINES)[number]
    ) ? requestedDoclingPipeline : "standard";
    const requestedDoclingTableMode = (formData.get("doclingTableMode") || "accurate") as string;
    const doclingTableMode = DOCLING_TABLE_MODES.includes(
      requestedDoclingTableMode as (typeof DOCLING_TABLE_MODES)[number]
    ) ? requestedDoclingTableMode : "accurate";

    // Google specific
    const googleProcessorId = formData.get("googleProcessorId") as string | null;
    const googleLocation = formData.get("googleLocation") as string | null;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    if (!PARSER_TYPES.includes(parserType)) {
      return NextResponse.json(
        { error: `Unsupported parser type: ${parserType || "missing"}` },
        { status: 400 }
      );
    }

    // A stable source fingerprint is the join key for comparing multiple runs
    // of the same document. Reuse this buffer for providers that need base64.
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const documentHash = createHash("sha256").update(fileBuffer).digest("hex");
    const runId = randomUUID();
    const engine = getDocumentEngine(parserType);

    const apiKeys = await getDecryptedApiKeyMap(userEmail);

    // Get the appropriate API key based on parser type
    let apiKey: string | undefined;
    let endpoint: string | undefined;
    let projectId: string | undefined;
    let googleServiceAccountEmail: string | undefined;
    let googlePrivateKey: string | undefined;
    let doclingApiKey: string | undefined;

    if (parserType === "Upstage") {
      apiKey = apiKeys[API_KEY_NAMES.UPSTAGE_PARSER];
      if (!apiKey) {
        return NextResponse.json(
          { error: "Upstage API key not found. Please add it in the APIs page." },
          { status: 400 }
        );
      }
    } else if (parserType === "LlamaIndex") {
      apiKey = apiKeys[API_KEY_NAMES.LLAMA_PARSER];
      if (!apiKey) {
        return NextResponse.json(
          { error: "LlamaIndex API key not found. Please add it in the APIs page." },
          { status: 400 }
        );
      }
    } else if (parserType === "Azure") {
      apiKey = apiKeys[API_KEY_NAMES.AZURE_PARSER_KEY];
      endpoint = apiKeys[API_KEY_NAMES.AZURE_PARSER_ENDPOINT];
      if (!apiKey || !endpoint) {
        return NextResponse.json(
          { error: "Azure API key or endpoint not found. Please add them in the APIs page." },
          { status: 400 }
        );
      }
    } else if (parserType === "Docling") {
      endpoint = apiKeys[API_KEY_NAMES.DOCLING_ENDPOINT];
      doclingApiKey = apiKeys[API_KEY_NAMES.DOCLING_API_KEY];
      if (!endpoint) {
        return NextResponse.json(
          { error: "Docling endpoint not found. Please add it in the APIs page (e.g., http://localhost:5001)." },
          { status: 400 }
        );
      }
    } else if (parserType === "Google") {
      googleServiceAccountEmail = apiKeys[API_KEY_NAMES.GOOGLE_PARSER_SERVICE_ACCOUNT_EMAIL];
      googlePrivateKey = apiKeys[API_KEY_NAMES.GOOGLE_PARSER_PRIVATE_KEY];
      projectId = apiKeys[API_KEY_NAMES.GOOGLE_PARSER_PROJECT_ID];

      if (!googleServiceAccountEmail || !googlePrivateKey || !projectId) {
        return NextResponse.json(
          { error: "Google Document AI service account credentials or Project ID not found. Please add them in the APIs page." },
          { status: 400 }
        );
      }
    }

    let parsedText = "";
    let parsedHtml = "";
    let parsedMarkdown = "";
    let parsedJson: any = null;
    let rawProviderResponse: unknown;
    let normalizedPages: ParseResponse["pages"];
    let parserVersion: string | undefined;
    let parserModel: string | undefined;

    // Parse based on parser type
    if (parserType === "Upstage") {
      // Use Upstage Document AI API
      const upstageFormData = new FormData();
      upstageFormData.append("document", file);

      // Request all output formats at once
      upstageFormData.append("output_formats", JSON.stringify(["html", "text", "markdown"]));

      // Add OCR options if specified
      if (language) {
        upstageFormData.append("ocr", JSON.stringify({ language }));
      }

      const response = await fetch(
        API_ENDPOINTS.UPSTAGE_PARSE,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
          },
          body: upstageFormData,
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error?.message || "Failed to parse document with Upstage API"
        );
      }

      const data = await response.json();
      rawProviderResponse = data;
      parsedJson = data;
      parserModel = "document-parse";

      // Extract all formats from response
      parsedText = data.content?.text || "";
      parsedHtml = data.content?.html || "";
      parsedMarkdown = data.content?.markdown || "";
    } else if (parserType === "LlamaIndex") {
      // LlamaParse v2: upload and create a parse job in one request.
      const llamaFormData = new FormData();
      llamaFormData.append("file", file);
      const configuration: Record<string, unknown> = {
        tier: llamaTier,
        version: llamaVersion,
      };

      if (pageRange) {
        configuration.page_ranges = { target_pages: pageRange };
      }

      if (language) {
        configuration.processing_options = {
          ocr_parameters: { languages: [language] },
        };
      }

      llamaFormData.append("configuration", JSON.stringify(configuration));

      // Upload document
      const uploadResponse = await fetch(
        API_ENDPOINTS.LLAMA_PARSE_UPLOAD,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
          },
          body: llamaFormData,
        }
      );

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        throw new Error(
          `Failed to upload document to LlamaParse: ${errorText}`
        );
      }

      const uploadData = (await uploadResponse.json()) as { id?: string };
      const jobId = uploadData.id;
      if (!jobId) {
        throw new Error("LlamaParse did not return a parse job ID");
      }

      // Fast tier only supports plain text. Other tiers also return markdown and items.
      const expand = llamaTier === "fast"
        ? "text,metadata"
        : "text,markdown,items,metadata";
      let finalResult: LlamaParseResult | null = null;
      let retryCount = 0;

      while (!finalResult && retryCount < POLLING_CONFIG.MAX_RETRIES) {
        await new Promise((resolve) => setTimeout(resolve, POLLING_CONFIG.RETRY_DELAY_MS));

        const resultResponse = await fetch(
          `${API_ENDPOINTS.LLAMA_PARSE_JOB(jobId)}?expand=${encodeURIComponent(expand)}`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${apiKey}`,
            },
          }
        );

        if (!resultResponse.ok) {
          const errorText = await resultResponse.text();
          throw new Error(`LlamaParse polling failed: ${errorText}`);
        }

        const resultData = (await resultResponse.json()) as LlamaParseResult;
        const status = resultData.job?.status;

        if (status === "COMPLETED") {
          finalResult = resultData;
        } else if (status === "FAILED" || status === "CANCELLED") {
          throw new Error(
            resultData.job?.error_message || `LlamaParse job ended with status ${status}`
          );
        }

        retryCount++;
      }

      if (!finalResult) {
        throw new Error("LlamaParse job timed out");
      }

      const textPages = finalResult.text?.pages || [];
      const markdownPages = finalResult.markdown?.pages || [];
      parsedText = textPages.map((page) => page.text || "").join("\n\n");
      parsedMarkdown = markdownPages
        .map((page) => page.markdown || "")
        .join("\n\n");
      parsedJson = finalResult;
      rawProviderResponse = finalResult;
      parserVersion = finalResult.metadata?.version || llamaVersion;
      parserModel = llamaTier;

      const pageNumbers = new Set<number>();
      textPages.forEach((page) => pageNumbers.add(page.page_number));
      markdownPages.forEach((page) => pageNumbers.add(page.page_number));
      (finalResult.items?.pages || []).forEach((page) => pageNumbers.add(page.page_number));
      normalizedPages = Array.from(pageNumbers)
        .sort((a, b) => a - b)
        .map((pageNumber) => {
          const textPage = textPages.find((page) => page.page_number === pageNumber);
          const markdownPage = markdownPages.find((page) => page.page_number === pageNumber);
          const itemsPage = finalResult.items?.pages?.find(
            (page) => page.page_number === pageNumber
          );

          return {
            pageNumber,
            text: textPage?.text,
            markdown: markdownPage?.markdown,
            width: itemsPage?.page_width,
            height: itemsPage?.page_height,
            items: itemsPage?.items,
          };
        });
    } else if (parserType === "Azure") {
      // Use Azure Document Intelligence API
      if (!endpoint || !apiKey) {
        throw new Error("Azure endpoint and API key are required");
      }

      // Convert file to base64
      // Determine model ID (use setting or default to prebuilt-layout for better markdown support)
      const modelId = azureModelId || "prebuilt-layout";
      parserModel = modelId;
      parserVersion = "2024-11-30";

      // Determine output format
      const outputContentFormat = azureOutputFormat || "markdown";

      // Start analysis with output format
      const analyzeUrl = `${endpoint}/formrecognizer/documentModels/${modelId}:analyze?api-version=2024-11-30&outputContentFormat=${outputContentFormat}`;

      const analyzeResponse = await fetch(analyzeUrl, {
        method: "POST",
        headers: {
          "Content-Type": file.type,
          "Ocp-Apim-Subscription-Key": apiKey,
        },
        body: fileBuffer,
      });

      if (!analyzeResponse.ok) {
        const errorData = await analyzeResponse.text();
        throw new Error(
          `Failed to start Azure Document Intelligence analysis: ${errorData}`
        );
      }

      // Get operation location
      const operationLocation = analyzeResponse.headers.get("Operation-Location");
      if (!operationLocation) {
        throw new Error("No Operation-Location header in response");
      }

      // Poll for results
      let analysisComplete = false;
      let maxRetries = 30;
      let retryCount = 0;

      while (!analysisComplete && retryCount < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait 2 seconds

        const resultResponse = await fetch(operationLocation, {
          method: "GET",
          headers: {
            "Ocp-Apim-Subscription-Key": apiKey,
          },
        });

        if (!resultResponse.ok) {
          throw new Error("Failed to get analysis results");
        }

        const resultData = await resultResponse.json();

        if (resultData.status === "succeeded") {
          rawProviderResponse = resultData;
          parsedJson = resultData;
          // Check if content field is available (API version 2024+ with outputContentFormat)
          if (resultData.analyzeResult?.content) {
            parsedText = resultData.analyzeResult.content;
            // Create simple HTML from markdown/text
            if (outputContentFormat === "markdown") {
              parsedHtml = `<pre>${parsedText}</pre>`;
            } else {
              parsedHtml = `<pre>${parsedText}</pre>`;
            }
          } else {
            // Fallback: Extract text from pages (older API or without outputContentFormat)
            const pages = resultData.analyzeResult?.pages || [];
            const textLines = pages.flatMap((page: any) =>
              page.lines?.map((line: any) => line.content) || []
            );
            parsedText = textLines.join("\n");
            parsedHtml = `<pre>${parsedText}</pre>`;
          }
          analysisComplete = true;
        } else if (resultData.status === "failed") {
          throw new Error("Azure Document Intelligence analysis failed");
        }

        retryCount++;
      }

      if (!analysisComplete) {
        throw new Error("Azure Document Intelligence analysis timed out");
      }
    } else if (parserType === "Google") {
      // Use Google Document AI API
      if (!projectId || !googleServiceAccountEmail || !googlePrivateKey) {
        throw new Error("Google Document AI requires service account credentials and a project ID");
      }

      // Get location and processor ID from settings or database
      const location = googleLocation || apiKeys["googleParserLocation"];
      const processorId = googleProcessorId || apiKeys["googleParserProcessorId"];

      if (!location || !processorId) {
        throw new Error("Google Document AI requires location and processor ID. Please set them in settings or APIs page.");
      }

      // Convert file to base64
      const base64 = fileBuffer.toString("base64");
      parserModel = processorId;

      // Process document
      const processUrl = `https://${location}-documentai.googleapis.com/v1/projects/${projectId}/locations/${location}/processors/${processorId}:process`;
      const googleAccessToken = await getGoogleServiceAccountAccessToken(
        googleServiceAccountEmail,
        googlePrivateKey
      );

      const processResponse = await fetch(processUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${googleAccessToken}`,
        },
        body: JSON.stringify({
          rawDocument: {
            content: base64,
            mimeType: file.type,
          },
        }),
      });

      if (!processResponse.ok) {
        const errorData = await processResponse.text();
        throw new Error(
          `Failed to process document with Google Document AI: ${errorData}`
        );
      }

      const processData = await processResponse.json();
      rawProviderResponse = processData;

      // Extract text from document
      parsedText = processData.document?.text || "";
      parsedJson = processData;

      // Create simple HTML from text
      parsedHtml = `<pre>${parsedText}</pre>`;
    } else if (parserType === "Docling") {
      // Use Docling API
      if (!endpoint) {
        throw new Error("Docling endpoint is required");
      }

      // Convert file to base64
      const base64 = fileBuffer.toString("base64");

      const outputFormat = doclingOutputFormat;
      parserModel = doclingPipeline;
      const toFormat = outputFormat === "markdown" ? "md" : outputFormat;
      const doclingUrl = `${endpoint.replace(/\/+$/, "")}/v1/convert/source`;
      const doclingHeaders: Record<string, string> = {
        "Content-Type": "application/json",
        "Accept": "application/json",
      };

      if (doclingApiKey) {
        doclingHeaders["X-Api-Key"] = doclingApiKey;
      }

      const doclingResponse = await fetch(doclingUrl, {
        method: "POST",
        headers: doclingHeaders,
        body: JSON.stringify({
          file_sources: [
            {
              base64_string: base64,
              filename: file.name,
            },
          ],
          options: {
            to_formats: [toFormat],
            pipeline: doclingPipeline,
            do_ocr: doclingOcrMode !== "disabled",
            force_ocr: doclingOcrMode === "force",
            ...(language ? { ocr_lang: [language] } : {}),
            table_mode: doclingTableMode,
            image_export_mode: extractImages ? "embedded" : "placeholder",
          },
        }),
      });

      if (!doclingResponse.ok) {
        const errorData = await doclingResponse.text();
        throw new Error(
          `Failed to process document with Docling: ${errorData}`
        );
      }

      const doclingData = (await doclingResponse.json()) as DoclingResult;
      rawProviderResponse = doclingData;
      if (doclingData.status === "failure") {
        throw new Error(`Docling conversion failed: ${JSON.stringify(doclingData.errors || [])}`);
      }

      const document = doclingData.document || {};
      parsedMarkdown = document.md_content || "";
      parsedHtml = document.html_content || "";
      parsedText = document.text_content || parsedMarkdown;
      parsedJson = document.json_content ?? (doclingData as unknown as JsonValue);

      if (!parsedText && parsedHtml) {
        parsedText = parsedHtml.replace(/<[^>]*>/g, "");
      }
    } else {
      throw new Error(`Unsupported parser type: ${parserType}`);
    }

    const processingTime = Date.now() - startTime;
    const runConfig: JsonObject = {
      language: language || null,
      pageRange: pageRange || null,
      extractImages,
      extractTables,
      upstageOutputFormat: (formData.get("upstageOutputFormat") as string | null) || null,
      llamaTier,
      llamaVersion,
      azureModelId: azureModelId || null,
      azureOutputFormat: azureOutputFormat || null,
      googleProcessorId: googleProcessorId || null,
      googleLocation: googleLocation || null,
      doclingOutputFormat,
      doclingOcrMode,
      doclingPipeline,
      doclingTableMode,
    };

    const normalizedDocument = normalizeDocument({
      parserType,
      raw: rawProviderResponse,
      text: parsedText || undefined,
      markdown: parsedMarkdown || undefined,
      html: parsedHtml || undefined,
      pages: normalizedPages,
    });

    // Build response based on parser type and format
    const result: ParseResponse = {
      document: normalizedDocument,
      raw: rawProviderResponse as JsonValue | undefined,
      run: {
        id: runId,
        engineId: engine.id,
        provider: engine.provider,
        model: parserModel,
        version: parserVersion,
        status: "succeeded",
        config: runConfig,
        startedAt,
        completedAt: new Date().toISOString(),
      },
      metadata: {
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        pageCount: normalizedDocument.statistics.pageCount || normalizedPages?.length,
        processingTime,
        parserType,
        parserVersion,
        documentHash,
      },
    };

    if (normalizedPages?.length) {
      result.pages = normalizedPages;
    }

    // Map output based on parser type and selected format
    if (parserType === "Upstage") {
      // Store all available formats
      if (parsedText) result.text = parsedText;
      if (parsedHtml) result.html = parsedHtml;
      if (parsedMarkdown) result.markdown = parsedMarkdown;
    } else if (parserType === "LlamaIndex") {
      // Store all available formats from JSON response
      if (parsedText) result.text = parsedText;
      if (parsedMarkdown) result.markdown = parsedMarkdown;
      if (parsedJson) result.json = parsedJson;
    } else if (parserType === "Azure") {
      const format = azureOutputFormat || "text";
      if (format === "markdown") {
        result.markdown = parsedText;
        result.text = parsedText; // Fallback
      } else {
        result.text = parsedText;
      }
    } else if (parserType === "Docling") {
      // Store all available formats
      if (parsedText) result.text = parsedText;
      if (parsedHtml) result.html = parsedHtml;
      if (parsedMarkdown) result.markdown = parsedMarkdown;
      if (parsedJson) result.json = parsedJson;
    } else if (parserType === "Google") {
      if (parsedJson) result.json = parsedJson;
      result.text = parsedText; // Fallback
    } else {
      // Default: return both text and html
      result.text = parsedText;
      if (parsedHtml) {
        result.html = parsedHtml;
      }
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error parsing document:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to parse document",
      },
      { status: 500 }
    );
  }
}
