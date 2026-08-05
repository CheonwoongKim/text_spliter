import "server-only";

export const RAGAS_METRICS = [
  "faithfulness",
  "answerRelevancy",
  "contextPrecision",
  "contextRecall",
] as const;

export const RAGAS_EVALUATOR_MODELS = [
  "gpt-5.6-sol",
  "gpt-5.6-terra",
  "gpt-5.6-luna",
] as const;

export type RagasMetric = (typeof RAGAS_METRICS)[number];
export type RagasEvaluatorModel = (typeof RAGAS_EVALUATOR_MODELS)[number];

export interface RagasWorkerHealth {
  status: "ok";
  framework: "ragas";
  frameworkVersion: string;
  workerVersion: string;
  metricContractVersion: string;
  supportedMetrics: string[];
  allowedModels: string[];
}

export interface RagasWorkerResult {
  request_id: string;
  status: "succeeded" | "partial";
  framework: "ragas";
  framework_version: string;
  worker_version: string;
  metric_contract_version: string;
  evaluator: Record<string, unknown>;
  scores: Partial<Record<RagasMetric, number>>;
  metric_details: Partial<Record<RagasMetric, {
    score?: number | null;
    reason?: string | null;
    status: "succeeded" | "failed" | "unavailable";
    error?: string | null;
  }>>;
  prompt_manifest: Record<string, unknown>;
  usage: Record<string, unknown>;
  duration_ms: number;
}

export class RagasWorkerError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = "RagasWorkerError";
  }
}

function workerConfig() {
  const url = process.env.RAGAS_WORKER_URL?.trim();
  const token = process.env.RAGAS_WORKER_TOKEN?.trim();
  if (!url) throw new RagasWorkerError("Ragas evaluator worker is not configured.", 503);
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new RagasWorkerError("Ragas evaluator worker URL is invalid.", 503);
  }
  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new RagasWorkerError("Ragas evaluator worker URL must use HTTP or HTTPS.", 503);
  }
  return { url: parsed.toString().replace(/\/$/, ""), token };
}

async function parseWorkerResponse(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    throw new RagasWorkerError("Ragas evaluator worker returned an invalid response.", 502);
  }
}

function responseMessage(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "Ragas evaluator worker request failed.";
  const record = payload as Record<string, unknown>;
  return typeof record.detail === "string"
    ? record.detail
    : typeof record.error === "string" ? record.error : "Ragas evaluator worker request failed.";
}

export async function getRagasWorkerHealth(): Promise<RagasWorkerHealth> {
  const config = workerConfig();
  let response: Response;
  try {
    response = await fetch(`${config.url}/health`, {
      cache: "no-store",
      signal: AbortSignal.timeout(5_000),
    });
  } catch {
    throw new RagasWorkerError("Ragas evaluator worker is not reachable.", 503);
  }
  const payload = await parseWorkerResponse(response);
  if (!response.ok) throw new RagasWorkerError(responseMessage(payload), 503);
  return payload as RagasWorkerHealth;
}

export async function evaluateWithRagas(input: {
  requestId: string;
  apiKey: string;
  model: RagasEvaluatorModel;
  metrics: RagasMetric[];
  sample: {
    userInput: string;
    response: string;
    reference: string | null;
    retrievedContexts: string[];
  };
}): Promise<RagasWorkerResult> {
  const config = workerConfig();
  if (!config.token) throw new RagasWorkerError("Ragas evaluator worker token is not configured.", 503);
  let response: Response;
  try {
    response = await fetch(`${config.url}/evaluate`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${config.token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        request_id: input.requestId,
        openai_api_key: input.apiKey,
        evaluator: { provider: "openai", model: input.model, timeout_seconds: 180 },
        metrics: input.metrics,
        sample: {
          user_input: input.sample.userInput,
          response: input.sample.response,
          reference: input.sample.reference,
          retrieved_contexts: input.sample.retrievedContexts,
        },
      }),
      signal: AbortSignal.timeout(190_000),
    });
  } catch {
    throw new RagasWorkerError("Ragas evaluator worker is not reachable or timed out.", 503);
  }
  const payload = await parseWorkerResponse(response);
  if (!response.ok) {
    throw new RagasWorkerError(responseMessage(payload), response.status >= 500 ? 502 : 400);
  }
  return payload as RagasWorkerResult;
}
