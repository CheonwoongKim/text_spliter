import { NextRequest, NextResponse } from "next/server";
import type { ParseResponse } from "@/lib/types";
import { query } from "@/lib/db";
import { decrypt } from "@/lib/encryption";

interface ApiKey {
  id: number;
  user_email: string;
  key_name: string;
  encrypted_key: string;
  created_at: string;
  updated_at: string;
}

// Verify JWT token and extract user email
function getUserEmailFromToken(request: NextRequest): string | null {
  const authHeader = request.headers.get("authorization");
  const token =
    authHeader?.replace("Bearer ", "") ||
    request.cookies.get("auth_token")?.value;

  if (!token) {
    return null;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(token.split(".")[1], "base64").toString()
    );
    return payload.email || null;
  } catch (error) {
    console.error("Error decoding token:", error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Authenticate user
    const userEmail = getUserEmailFromToken(request);
    if (!userEmail) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get form data
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const parserType = formData.get("parserType") as string;

    // Get parser settings
    const language = formData.get("language") as string | null;
    const extractImages = formData.get("extractImages") === "true";
    const extractTables = formData.get("extractTables") === "true";
    const pageRange = formData.get("pageRange") as string | null;

    // Upstage specific
    const upstageOutputFormat = formData.get("upstageOutputFormat") as string | null;

    // Azure specific
    const azureModelId = formData.get("azureModelId") as string | null;
    const azureOutputFormat = formData.get("azureOutputFormat") as string | null;

    // LlamaIndex specific
    const llamaResultType = formData.get("llamaResultType") as string | null;
    const llamaGpt4oMode = formData.get("llamaGpt4oMode") === "true";

    // Google specific
    const googleProcessorId = formData.get("googleProcessorId") as string | null;
    const googleLocation = formData.get("googleLocation") as string | null;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    // Fetch API keys from database
    const keys = await query<ApiKey[]>(
      "SELECT * FROM user_api_keys WHERE user_email = ?",
      [userEmail]
    );

    // Decrypt and map keys
    const apiKeys: Record<string, string> = {};
    keys.forEach((key) => {
      apiKeys[key.key_name] = decrypt(key.encrypted_key);
    });

    // Get the appropriate API key based on parser type
    let apiKey: string | undefined;
    let endpoint: string | undefined;
    let projectId: string | undefined;

    if (parserType === "Upstage") {
      apiKey = apiKeys["upstageParser"];
      if (!apiKey) {
        return NextResponse.json(
          { error: "Upstage API key not found. Please add it in the APIs page." },
          { status: 400 }
        );
      }
    } else if (parserType === "LlamaIndex") {
      apiKey = apiKeys["llamaParser"];
      if (!apiKey) {
        return NextResponse.json(
          { error: "LlamaIndex API key not found. Please add it in the APIs page." },
          { status: 400 }
        );
      }
    } else if (parserType === "Azure") {
      apiKey = apiKeys["azureParserKey"];
      endpoint = apiKeys["azureParserEndpoint"];
      if (!apiKey || !endpoint) {
        return NextResponse.json(
          { error: "Azure API key or endpoint not found. Please add them in the APIs page." },
          { status: 400 }
        );
      }
    } else if (parserType === "Google") {
      apiKey = apiKeys["googleParserKey"];
      projectId = apiKeys["googleParserProjectId"];

      if (!apiKey || !projectId) {
        return NextResponse.json(
          { error: "Google Document AI API key or Project ID not found. Please add them in the APIs page." },
          { status: 400 }
        );
      }
    }

    let parsedText = "";
    let parsedHtml = "";

    // Parse based on parser type
    if (parserType === "Upstage") {
      // Use Upstage Document AI API
      const upstageFormData = new FormData();
      upstageFormData.append("document", file);

      // Add output format if specified
      const outputFmt = upstageOutputFormat || "markdown";
      if (outputFmt) {
        upstageFormData.append("output_format", outputFmt);
      }

      // Add OCR options if specified
      if (language) {
        upstageFormData.append("ocr", JSON.stringify({ language }));
      }

      const response = await fetch(
        "https://api.upstage.ai/v1/document-ai/document-parse",
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

      // Extract text and html based on output format
      if (outputFmt === "html") {
        parsedText = data.content?.html || data.content?.text || "";
        parsedHtml = data.content?.html || "";
      } else if (outputFmt === "markdown") {
        parsedText = data.content?.markdown || data.content?.text || "";
        parsedHtml = data.content?.html || "";
      } else {
        parsedText = data.content?.text || "";
        parsedHtml = data.content?.html || "";
      }
    } else if (parserType === "LlamaIndex") {
      // Use LlamaParse API
      const llamaFormData = new FormData();
      llamaFormData.append("file", file);

      // Add result type and other options
      const resultType = llamaResultType || "markdown";
      if (llamaGpt4oMode) {
        llamaFormData.append("gpt4o_mode", "true");
      }
      if (language) {
        llamaFormData.append("language", language);
      }

      // Upload document
      const uploadResponse = await fetch(
        "https://api.cloud.llamaindex.ai/api/parsing/upload",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
          },
          body: llamaFormData,
        }
      );

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json();
        throw new Error(
          errorData.error?.message || "Failed to upload document to LlamaParse"
        );
      }

      const uploadData = await uploadResponse.json();
      const jobId = uploadData.id;

      // Poll for results with appropriate endpoint based on result type
      let parseComplete = false;
      let maxRetries = 30;
      let retryCount = 0;

      while (!parseComplete && retryCount < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait 2 seconds

        const resultResponse = await fetch(
          `https://api.cloud.llamaindex.ai/api/parsing/job/${jobId}/result/${resultType}`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${apiKey}`,
            },
          }
        );

        if (resultResponse.ok) {
          const resultData = await resultResponse.json();
          if (resultData.status === "SUCCESS") {
            // Extract content based on result type
            if (resultType === "json") {
              parsedText = JSON.stringify(resultData.json || resultData, null, 2);
              parsedHtml = "";
            } else if (resultType === "markdown") {
              parsedText = resultData.markdown || "";
              parsedHtml = resultData.html || "";
            } else {
              parsedText = resultData.text || resultData.markdown || "";
              parsedHtml = resultData.html || "";
            }
            parseComplete = true;
          } else if (resultData.status === "ERROR") {
            throw new Error("LlamaParse job failed");
          }
        }

        retryCount++;
      }

      if (!parseComplete) {
        throw new Error("LlamaParse job timed out");
      }
    } else if (parserType === "Azure") {
      // Use Azure Document Intelligence API
      if (!endpoint || !apiKey) {
        throw new Error("Azure endpoint and API key are required");
      }

      // Convert file to base64
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      // Determine model ID (use setting or default to prebuilt-layout for better markdown support)
      const modelId = azureModelId || "prebuilt-layout";

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
        body: buffer,
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
      if (!projectId || !apiKey) {
        throw new Error("Google Document AI requires projectId and API key");
      }

      // Get location and processor ID from settings or database
      const location = googleLocation || apiKeys["googleParserLocation"];
      const processorId = googleProcessorId || apiKeys["googleParserProcessorId"];

      if (!location || !processorId) {
        throw new Error("Google Document AI requires location and processor ID. Please set them in settings or APIs page.");
      }

      // Convert file to base64
      const bytes = await file.arrayBuffer();
      const base64 = Buffer.from(bytes).toString("base64");

      // Process document
      const processUrl = `https://${location}-documentai.googleapis.com/v1/projects/${projectId}/locations/${location}/processors/${processorId}:process`;

      const processResponse = await fetch(processUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
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

      // Extract text from document
      parsedText = processData.document?.text || "";

      // Create simple HTML from text
      parsedHtml = `<pre>${parsedText}</pre>`;
    } else {
      throw new Error(`Unsupported parser type: ${parserType}`);
    }

    const processingTime = Date.now() - startTime;

    // Build response based on parser type and format
    const result: ParseResponse = {
      metadata: {
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        processingTime,
      },
    };

    // Map output based on parser type and selected format
    if (parserType === "Upstage") {
      const format = upstageOutputFormat || "text";
      if (format === "html") {
        result.html = parsedHtml || parsedText;
        result.text = parsedText; // Fallback
      } else if (format === "markdown") {
        result.markdown = parsedText;
        result.text = parsedText; // Fallback
      } else {
        result.text = parsedText;
      }
    } else if (parserType === "LlamaIndex") {
      const format = llamaResultType || "text";
      if (format === "json") {
        try {
          result.json = JSON.parse(parsedText);
        } catch {
          result.json = parsedText; // If parsing fails, store as string
        }
        result.text = parsedText; // Fallback
      } else if (format === "markdown") {
        result.markdown = parsedText;
        result.html = parsedHtml;
        result.text = parsedText; // Fallback
      } else {
        result.text = parsedText;
      }
    } else if (parserType === "Azure") {
      const format = azureOutputFormat || "text";
      if (format === "markdown") {
        result.markdown = parsedText;
        result.text = parsedText; // Fallback
      } else {
        result.text = parsedText;
      }
    } else if (parserType === "Google") {
      // Google returns JSON only
      try {
        result.json = JSON.parse(parsedText);
      } catch {
        result.json = parsedText;
      }
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
