import { NextRequest, NextResponse } from "next/server";

import { getUserFromToken } from "@/lib/auth-server";
import { handleDatasetAction } from "@/lib/evaluation/dataset-actions";
import { handleJudgeAction } from "@/lib/evaluation/judge-actions";
import { EvaluationRequestError, requiredText } from "@/lib/evaluation/request";
import { handleRunAction } from "@/lib/evaluation/run-actions";
import { RagasWorkerError } from "@/lib/ragas-worker";
import { assertSupabaseResult, getAppSupabase } from "@/lib/supabase-server";

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromToken(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const supabase = getAppSupabase();

    const [
      datasetsResult,
      versionsResult,
      casesResult,
      runsResult,
      caseRunsResult,
      judgeBatchesResult,
      judgeCaseRunsResult,
    ] = await Promise.all([
      supabase.from("evaluation_datasets").select("*").eq("owner_id", user.id).order("updated_at", { ascending: false }),
      supabase.from("evaluation_dataset_versions").select("*").eq("owner_id", user.id).order("version_number", { ascending: false }),
      supabase.from("evaluation_cases").select("*").eq("owner_id", user.id).order("position", { ascending: true }).order("created_at", { ascending: true }),
      supabase.from("evaluation_runs").select("*").eq("owner_id", user.id).order("created_at", { ascending: false }).limit(100),
      supabase.from("evaluation_case_runs").select("*").eq("owner_id", user.id).order("created_at", { ascending: true }).limit(2000),
      supabase.from("evaluation_judge_batches").select("*").eq("owner_id", user.id).order("created_at", { ascending: false }).limit(100),
      supabase.from("evaluation_judge_case_runs").select("*").eq("owner_id", user.id).order("created_at", { ascending: true }).limit(4000),
    ]);
    assertSupabaseResult(datasetsResult.error, "Failed to load evaluation datasets");
    assertSupabaseResult(versionsResult.error, "Failed to load evaluation versions");
    assertSupabaseResult(casesResult.error, "Failed to load evaluation cases");
    assertSupabaseResult(runsResult.error, "Failed to load evaluation runs");
    assertSupabaseResult(caseRunsResult.error, "Failed to load evaluation case runs");
    assertSupabaseResult(judgeBatchesResult.error, "Failed to load evaluator batches");
    assertSupabaseResult(judgeCaseRunsResult.error, "Failed to load evaluator case runs");

    return NextResponse.json({
      datasets: datasetsResult.data || [],
      versions: versionsResult.data || [],
      cases: casesResult.data || [],
      runs: runsResult.data || [],
      caseRuns: caseRunsResult.data || [],
      judgeBatches: judgeBatchesResult.data || [],
      judgeCaseRuns: judgeCaseRunsResult.data || [],
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to load evaluation workspace", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

/**
 * Dispatches an evaluation action to the domain that owns it. Each handler
 * returns `null` when the action is not its own.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromToken(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = (await request.json()) as Record<string, unknown>;
    const action = requiredText(body.action, "Action", 80);
    const context = { user, body, action, supabase: getAppSupabase() };

    for (const handle of [handleJudgeAction, handleDatasetAction, handleRunAction]) {
      const response = await handle(context);
      if (response) return response;
    }

    throw new EvaluationRequestError(`Unsupported evaluation action: ${action}`);
  } catch (error) {
    const status = error instanceof EvaluationRequestError || error instanceof RagasWorkerError
      ? error.status
      : 500;
    return NextResponse.json(
      {
        error: error instanceof EvaluationRequestError || error instanceof RagasWorkerError
          ? error.message
          : "Evaluation request failed",
        details: error instanceof EvaluationRequestError || error instanceof RagasWorkerError
          ? undefined
          : error instanceof Error ? error.message : "Unknown error",
      },
      { status }
    );
  }
}
