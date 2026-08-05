import "server-only";

import {
  DEFAULT_EMBEDDING_DIMENSIONS,
  DEFAULT_EMBEDDING_MODEL,
} from "@/lib/constants";

interface OpenAIErrorBody {
  error?: {
    message?: string;
    type?: string;
    code?: string;
  };
}

export class OpenAIRequestError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string
  ) {
    super(message);
    this.name = "OpenAIRequestError";
  }
}

async function readOpenAIError(response: Response): Promise<OpenAIRequestError> {
  const body = (await response.json().catch(() => ({}))) as OpenAIErrorBody;
  return new OpenAIRequestError(
    body.error?.message || `OpenAI request failed with status ${response.status}`,
    response.status,
    body.error?.code || body.error?.type
  );
}

export async function createEmbeddings({
  apiKey,
  inputs,
  model = DEFAULT_EMBEDDING_MODEL,
  dimensions = DEFAULT_EMBEDDING_DIMENSIONS,
}: {
  apiKey: string;
  inputs: string[];
  model?: string;
  dimensions?: number;
}): Promise<{ embeddings: number[][]; model: string; usage: Record<string, number> }> {
  const requestBody: Record<string, unknown> = {
    model,
    input: inputs,
    encoding_format: "float",
  };
  if (model.startsWith("text-embedding-3")) {
    requestBody.dimensions = dimensions;
  }

  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(requestBody),
    signal: AbortSignal.timeout(60_000),
  });

  if (!response.ok) throw await readOpenAIError(response);

  const body = (await response.json()) as {
    data?: Array<{ embedding?: number[]; index?: number }>;
    model?: string;
    usage?: Record<string, number>;
  };
  const ordered = [...(body.data || [])].sort(
    (left, right) => (left.index || 0) - (right.index || 0)
  );
  const embeddings = ordered.map((item) => item.embedding || []);

  if (
    embeddings.length !== inputs.length ||
    embeddings.some((embedding) => embedding.length !== dimensions)
  ) {
    throw new OpenAIRequestError("OpenAI returned an invalid embedding payload", 502);
  }

  return { embeddings, model: body.model || model, usage: body.usage || {} };
}

function extractOutputText(body: {
  output_text?: string;
  output?: Array<{
    content?: Array<{ type?: string; text?: string }>;
  }>;
}): string {
  if (body.output_text?.trim()) return body.output_text.trim();

  return (body.output || [])
    .flatMap((item) => item.content || [])
    .filter((item) => item.type === "output_text" && item.text)
    .map((item) => item.text?.trim())
    .filter(Boolean)
    .join("\n")
    .trim();
}

export async function createGroundedResponse({
  apiKey,
  model,
  reasoningEffort,
  instructions,
  input,
  safetyIdentifier,
}: {
  apiKey: string;
  model: string;
  reasoningEffort: string;
  instructions: string;
  input: string;
  safetyIdentifier: string;
}): Promise<{
  id?: string;
  model: string;
  text: string;
  usage: Record<string, unknown>;
}> {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      instructions,
      input,
      reasoning: { effort: reasoningEffort },
      text: { verbosity: "low" },
      max_output_tokens: 1200,
      store: false,
      safety_identifier: safetyIdentifier,
    }),
    signal: AbortSignal.timeout(120_000),
  });

  if (!response.ok) throw await readOpenAIError(response);

  const body = (await response.json()) as {
    id?: string;
    model?: string;
    output_text?: string;
    output?: Array<{ content?: Array<{ type?: string; text?: string }> }>;
    usage?: Record<string, unknown>;
  };
  const text = extractOutputText(body);

  if (!text) {
    throw new OpenAIRequestError("OpenAI returned no answer text", 502);
  }

  return { id: body.id, model: body.model || model, text, usage: body.usage || {} };
}
