import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

import { getDecryptedApiKeyMap } from "@/lib/api-key-store";
import { getUserFromToken } from "@/lib/auth-server";
import { API_KEY_NAMES } from "@/lib/constants";
import {
  prepareVisionInput,
  runVisionProvider,
} from "@/lib/document-vision-server";
import {
  aggregateVisualJudgeMetrics,
  buildJudgePrompt,
  buildJudgeTargets,
  DOCUMENT_VLM_JUDGE_VERSION,
  judgeInstructions,
  parseJudgeResponse,
  preJudgeMissingTargets,
  type VisualJudgeVerdict,
} from "@/lib/document-vlm-judge";
import { assertSupabaseResult, getAppSupabase } from "@/lib/supabase-server";
import type { NormalizedDocument } from "@/lib/document-ir";
import type { VisionEngineType } from "@/lib/types";
import { validateDocumentEngineType } from "@/lib/validation";

const VISION_CREDENTIAL_KEYS = [
  API_KEY_NAMES.OPENAI_EMBEDDING,
  API_KEY_NAMES.GEMINI_VISION,
  API_KEY_NAMES.ANTHROPIC_VISION,
  API_KEY_NAMES.QWEN_VISION,
  API_KEY_NAMES.QWEN_VISION_ENDPOINT,
  API_KEY_NAMES.NATIVE_DOCUMENT_RENDERER_ENDPOINT,
  API_KEY_NAMES.NATIVE_DOCUMENT_RENDERER_API_KEY,
];

/** Bounded so one judge run cannot fan out over a large document. */
const MAX_JUDGE_TARGETS = 24;

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromToken(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const runId = new URL(request.url).searchParams.get("runId");
    const query = getAppSupabase()
      .from("document_vlm_judge_runs")
      .select("*")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    const { data, error } = runId
      ? await query.eq("document_evaluation_run_id", runId)
      : await query;
    assertSupabaseResult(error, "Failed to load visual judge runs");

    return NextResponse.json({ judgeRuns: data || [] });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to load visual judge runs",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * Score the visual blocks of a completed document evaluation with a document
 * VLM. Results are stored as their own measurement layer and are never merged
 * into the deterministic document metrics of the evaluation run.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromToken(request);
    if (!user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = (await request.json()) as {
      documentEvaluationRunId?: string;
      engineType?: string;
    };
    const evaluationRunId = body.documentEvaluationRunId?.trim();
    if (!evaluationRunId) {
      return NextResponse.json(
        { error: "A document evaluation run is required." },
        { status: 400 }
      );
    }

    let engineType: VisionEngineType;
    try {
      const engine = validateDocumentEngineType(body.engineType);
      if (engine !== "OpenAI Vision" && engine !== "Gemini Vision"
        && engine !== "Claude Vision" && engine !== "Qwen Vision") {
        throw new Error("Visual judging requires a document VLM engine.");
      }
      engineType = engine;
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Unsupported judge engine." },
        { status: 400 }
      );
    }

    const supabase = getAppSupabase();
    const { data: evaluationRun, error: runError } = await supabase
      .from("document_evaluation_runs")
      .select("id,owner_id,status,reference_snapshot,candidate_snapshot,file_storage_key,file_name")
      .eq("id", evaluationRunId)
      .eq("owner_id", user.id)
      .maybeSingle();
    assertSupabaseResult(runError, "Failed to load document evaluation run");
    if (!evaluationRun) {
      return NextResponse.json({ error: "Document evaluation run not found." }, { status: 404 });
    }
    if (evaluationRun.status !== "completed") {
      return NextResponse.json(
        { error: "Complete the document evaluation before visual judging." },
        { status: 409 }
      );
    }

    const reference = evaluationRun.reference_snapshot as NormalizedDocument;
    const candidate = evaluationRun.candidate_snapshot as NormalizedDocument;
    const targets = buildJudgeTargets(reference, candidate, MAX_JUDGE_TARGETS);

    if (targets.length === 0) {
      return NextResponse.json(
        {
          error: "This document has no chart, figure, diagram, or formula to judge visually.",
        },
        { status: 409 }
      );
    }

    const prompt = buildJudgePrompt(targets);
    const promptHash = createHash("sha256").update(prompt).digest("hex");

    const { data: judgeRun, error: createError } = await supabase
      .from("document_vlm_judge_runs")
      .insert({
        owner_id: user.id,
        document_evaluation_run_id: evaluationRunId,
        status: "running",
        engine_type: engineType,
        contract_version: DOCUMENT_VLM_JUDGE_VERSION,
        prompt_hash: promptHash,
      })
      .select("id")
      .single();
    assertSupabaseResult(createError, "Failed to create visual judge run");
    if (!judgeRun) {
      return NextResponse.json({ error: "Failed to create visual judge run." }, { status: 500 });
    }

    try {
      // An omitted block needs no model call: its absence is already the verdict.
      const missing = preJudgeMissingTargets(targets);
      const judgeable = targets.filter((target) => target.candidateText);

      let verdicts: VisualJudgeVerdict[] = missing;
      let model: string | null = null;

      if (judgeable.length > 0) {
        const credentials = await getDecryptedApiKeyMap(user.email, VISION_CREDENTIAL_KEYS);
        const sourceFile = await loadSourceFile(evaluationRun.file_storage_key, evaluationRun.file_name);
        const input = await prepareVisionInput({
          file: sourceFile,
          engineType,
          config: {},
          rendererEndpoint: credentials[API_KEY_NAMES.NATIVE_DOCUMENT_RENDERER_ENDPOINT],
          rendererApiKey: credentials[API_KEY_NAMES.NATIVE_DOCUMENT_RENDERER_API_KEY],
        });

        const result = await runVisionProvider({
          engineType,
          input,
          config: { prompt: `${judgeInstructions()}\n\n${buildJudgePrompt(judgeable)}` },
          credentials,
        });
        model = result.model;
        verdicts = [...missing, ...parseJudgeResponse(result.text, judgeable)];
      }

      const metrics = aggregateVisualJudgeMetrics(targets, verdicts);
      const { error: updateError } = await supabase
        .from("document_vlm_judge_runs")
        .update({
          status: "completed",
          model,
          metrics,
          verdicts,
          completed_at: new Date().toISOString(),
        })
        .eq("id", judgeRun.id)
        .eq("owner_id", user.id);
      assertSupabaseResult(updateError, "Failed to save visual judge run");

      return NextResponse.json({ id: judgeRun.id, metrics, verdicts });
    } catch (error) {
      await supabase
        .from("document_vlm_judge_runs")
        .update({
          status: "failed",
          error: { message: error instanceof Error ? error.message : "Unknown error" },
          completed_at: new Date().toISOString(),
        })
        .eq("id", judgeRun.id)
        .eq("owner_id", user.id);
      throw error;
    }
  } catch (error) {
    return NextResponse.json(
      {
        error: "Visual judging failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/** The judge must see the page, so the original document is required. */
async function loadSourceFile(storageKey: unknown, fileName: unknown): Promise<File> {
  if (typeof storageKey !== "string" || !storageKey) {
    throw new Error(
      "Visual judging needs the original document. Sync this parse result with its source file first."
    );
  }

  const { data, error } = await getAppSupabase()
    .storage
    .from("documents")
    .download(storageKey);
  if (error || !data) {
    throw new Error(`Failed to download the source document: ${error?.message || "not found"}`);
  }

  return new File([data], typeof fileName === "string" ? fileName : "document", {
    type: data.type || "application/octet-stream",
  });
}
