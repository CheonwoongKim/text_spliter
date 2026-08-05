import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

import { getUserFromToken } from "@/lib/auth-server";
import { assertSupabaseResult, getAppSupabase } from "@/lib/supabase-server";

class EvaluationRequestError extends Error {
  constructor(message: string, public readonly status = 400) {
    super(message);
    this.name = "EvaluationRequestError";
  }
}

interface ExpectedEvidenceInput {
  documentHash?: unknown;
  pageNumber?: unknown;
  blockId?: unknown;
  chunkKey?: unknown;
  note?: unknown;
}

function requiredText(value: unknown, label: string, maxLength: number): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new EvaluationRequestError(`${label} is required.`);
  }
  if (value.trim().length > maxLength) {
    throw new EvaluationRequestError(`${label} must be at most ${maxLength} characters.`);
  }
  return value.trim();
}

function optionalText(value: unknown, maxLength: number): string | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string") throw new EvaluationRequestError("Invalid text value.");
  if (value.trim().length > maxLength) {
    throw new EvaluationRequestError(`Text must be at most ${maxLength} characters.`);
  }
  return value.trim() || null;
}

function textArray(value: unknown, label: string, maxItems = 100): string[] {
  if (!Array.isArray(value)) throw new EvaluationRequestError(`${label} must be an array.`);
  if (value.length > maxItems) {
    throw new EvaluationRequestError(`${label} must contain at most ${maxItems} items.`);
  }
  return value.map((item) => requiredText(item, label, 1000));
}

function expectedEvidenceArray(value: unknown): Array<Record<string, string | number>> {
  if (!Array.isArray(value)) {
    throw new EvaluationRequestError("Expected evidence must be an array.");
  }
  if (value.length > 100) {
    throw new EvaluationRequestError("Expected evidence must contain at most 100 items.");
  }

  return value.map((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw new EvaluationRequestError("Each evidence item must be an object.");
    }
    const evidence = item as ExpectedEvidenceInput;
    const normalized: Record<string, string | number> = {};
    const documentHash = optionalText(evidence.documentHash, 128);
    const blockId = optionalText(evidence.blockId, 200);
    const chunkKey = optionalText(evidence.chunkKey, 200);
    const note = optionalText(evidence.note, 1000);
    if (documentHash) normalized.documentHash = documentHash;
    if (blockId) normalized.blockId = blockId;
    if (chunkKey) normalized.chunkKey = chunkKey;
    if (note) normalized.note = note;
    if (evidence.pageNumber !== undefined && evidence.pageNumber !== null && evidence.pageNumber !== "") {
      const pageNumber = Number(evidence.pageNumber);
      if (!Number.isInteger(pageNumber) || pageNumber < 1) {
        throw new EvaluationRequestError("Evidence page number must be a positive integer.");
      }
      normalized.pageNumber = pageNumber;
    }
    if (Object.keys(normalized).length === 0) {
      throw new EvaluationRequestError("An evidence item must contain at least one reference field.");
    }
    return normalized;
  });
}

function jsonObject(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new EvaluationRequestError(`${label} must be an object.`);
  }
  return value as Record<string, unknown>;
}

async function ownedVersion(ownerId: string, versionId: string) {
  const { data, error } = await getAppSupabase()
    .from("evaluation_dataset_versions")
    .select("*")
    .eq("id", versionId)
    .eq("owner_id", ownerId)
    .maybeSingle();
  assertSupabaseResult(error, "Failed to load evaluation dataset version");
  if (!data) throw new EvaluationRequestError("Dataset version not found.", 404);
  return data;
}

async function draftVersion(ownerId: string, versionId: string) {
  const version = await ownedVersion(ownerId, versionId);
  if (version.status !== "draft") {
    throw new EvaluationRequestError(
      "Frozen versions cannot be edited. Create the next version to continue editing.",
      409
    );
  }
  return version;
}

async function refreshRunSummary(ownerId: string, runId: string) {
  const supabase = getAppSupabase();
  const { data: rows, error } = await supabase
    .from("evaluation_case_runs")
    .select("status,manual_score,reviewer_decision")
    .eq("evaluation_run_id", runId)
    .eq("owner_id", ownerId);
  assertSupabaseResult(error, "Failed to summarize evaluation case runs");

  const caseRuns = rows || [];
  const completedCount = caseRuns.filter((row) => ["succeeded", "failed"].includes(row.status)).length;
  const succeededCount = caseRuns.filter((row) => row.status === "succeeded").length;
  const failedCount = caseRuns.filter((row) => row.status === "failed").length;
  const reviewed = caseRuns.filter((row) => row.reviewer_decision !== "pending");
  const scored = caseRuns
    .map((row) => row.manual_score as Record<string, unknown>)
    .filter((score) => Object.keys(score || {}).length > 0);
  const average = (key: string): number | null => {
    const values = scored
      .map((score) => score[key])
      .filter((value): value is number => typeof value === "number");
    if (!values.length) return null;
    return Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2));
  };
  const aggregateMetrics = {
    completionRate: caseRuns.length ? completedCount / caseRuns.length : 0,
    successRate: completedCount ? succeededCount / completedCount : 0,
    reviewedCount: reviewed.length,
    passRate: reviewed.length
      ? reviewed.filter((row) => row.reviewer_decision === "pass").length / reviewed.length
      : null,
    manualAverages: {
      correctness: average("correctness"),
      faithfulness: average("faithfulness"),
      citationQuality: average("citationQuality"),
    },
  };
  const isComplete = caseRuns.length > 0 && completedCount === caseRuns.length;
  const { error: updateError } = await supabase
    .from("evaluation_runs")
    .update({
      completed_count: completedCount,
      succeeded_count: succeededCount,
      failed_count: failedCount,
      aggregate_metrics: aggregateMetrics,
      ...(isComplete ? { status: "completed", completed_at: new Date().toISOString() } : {}),
    })
    .eq("id", runId)
    .eq("owner_id", ownerId);
  assertSupabaseResult(updateError, "Failed to update evaluation run summary");

  return aggregateMetrics;
}

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromToken(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const supabase = getAppSupabase();

    const [datasetsResult, versionsResult, casesResult, runsResult, caseRunsResult] = await Promise.all([
      supabase.from("evaluation_datasets").select("*").eq("owner_id", user.id).order("updated_at", { ascending: false }),
      supabase.from("evaluation_dataset_versions").select("*").eq("owner_id", user.id).order("version_number", { ascending: false }),
      supabase.from("evaluation_cases").select("*").eq("owner_id", user.id).order("position", { ascending: true }).order("created_at", { ascending: true }),
      supabase.from("evaluation_runs").select("*").eq("owner_id", user.id).order("created_at", { ascending: false }).limit(100),
      supabase.from("evaluation_case_runs").select("*").eq("owner_id", user.id).order("created_at", { ascending: true }).limit(2000),
    ]);
    assertSupabaseResult(datasetsResult.error, "Failed to load evaluation datasets");
    assertSupabaseResult(versionsResult.error, "Failed to load evaluation versions");
    assertSupabaseResult(casesResult.error, "Failed to load evaluation cases");
    assertSupabaseResult(runsResult.error, "Failed to load evaluation runs");
    assertSupabaseResult(caseRunsResult.error, "Failed to load evaluation case runs");

    return NextResponse.json({
      datasets: datasetsResult.data || [],
      versions: versionsResult.data || [],
      cases: casesResult.data || [],
      runs: runsResult.data || [],
      caseRuns: caseRunsResult.data || [],
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to load evaluation workspace", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromToken(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = (await request.json()) as Record<string, unknown>;
    const action = requiredText(body.action, "Action", 80);
    const supabase = getAppSupabase();

    if (action === "create_dataset") {
      const name = requiredText(body.name, "Dataset name", 120);
      const description = optionalText(body.description, 2000);
      const { data: dataset, error } = await supabase
        .from("evaluation_datasets")
        .insert({ owner_id: user.id, name, description })
        .select("*")
        .single();
      assertSupabaseResult(error, "Failed to create evaluation dataset");
      if (!dataset) throw new Error("Dataset was not returned after creation.");

      const { data: version, error: versionError } = await supabase
        .from("evaluation_dataset_versions")
        .insert({
          dataset_id: dataset.id,
          owner_id: user.id,
          version_number: 1,
          status: "draft",
          change_note: "Initial golden set",
        })
        .select("*")
        .single();
      if (versionError || !version) {
        await supabase.from("evaluation_datasets").delete().eq("id", dataset.id).eq("owner_id", user.id);
        assertSupabaseResult(versionError, "Failed to create initial dataset version");
        throw new Error("Initial dataset version was not returned after creation.");
      }
      return NextResponse.json({ dataset, version });
    }

    if (action === "update_dataset") {
      const datasetId = requiredText(body.datasetId, "Dataset ID", 80);
      const name = requiredText(body.name, "Dataset name", 120);
      const description = optionalText(body.description, 2000);
      const { data, error } = await supabase
        .from("evaluation_datasets")
        .update({ name, description })
        .eq("id", datasetId)
        .eq("owner_id", user.id)
        .select("*")
        .maybeSingle();
      assertSupabaseResult(error, "Failed to update evaluation dataset");
      if (!data) throw new EvaluationRequestError("Dataset not found.", 404);
      return NextResponse.json({ dataset: data });
    }

    if (action === "delete_dataset") {
      const datasetId = requiredText(body.datasetId, "Dataset ID", 80);
      const { data, error } = await supabase
        .from("evaluation_datasets")
        .delete()
        .eq("id", datasetId)
        .eq("owner_id", user.id)
        .select("id")
        .maybeSingle();
      assertSupabaseResult(error, "Failed to delete evaluation dataset");
      if (!data) throw new EvaluationRequestError("Dataset not found.", 404);
      return NextResponse.json({ success: true });
    }

    if (action === "create_case" || action === "update_case") {
      const versionId = requiredText(body.versionId, "Dataset version ID", 80);
      await draftVersion(user.id, versionId);
      const question = requiredText(body.question, "Question", 8000);
      const caseKey = requiredText(
        body.caseKey || `case-${randomUUID().slice(0, 8)}`,
        "Case key",
        120
      );
      const difficulty = body.difficulty || "medium";
      if (!["easy", "medium", "hard"].includes(String(difficulty))) {
        throw new EvaluationRequestError("Difficulty must be easy, medium, or hard.");
      }
      const payload = {
        dataset_version_id: versionId,
        owner_id: user.id,
        case_key: caseKey,
        question,
        reference_answer: optionalText(body.referenceAnswer, 20_000),
        reference_facts: textArray(body.referenceFacts || [], "Reference facts"),
        expected_evidence: expectedEvidenceArray(body.expectedEvidence || []),
        answerable: body.answerable !== false,
        tags: textArray(body.tags || [], "Tags", 30).map((tag) => tag.slice(0, 80)),
        language: optionalText(body.language, 30),
        difficulty: String(difficulty),
        rubric: jsonObject(body.rubric || {}, "Rubric"),
        notes: optionalText(body.notes, 5000),
        position: Number.isInteger(body.position) ? Number(body.position) : 0,
      };

      if (action === "create_case") {
        const { data, error } = await supabase
          .from("evaluation_cases")
          .insert(payload)
          .select("*")
          .single();
        assertSupabaseResult(error, "Failed to create evaluation case");
        return NextResponse.json({ evaluationCase: data });
      }

      const caseId = requiredText(body.caseId, "Case ID", 80);
      const { data, error } = await supabase
        .from("evaluation_cases")
        .update(payload)
        .eq("id", caseId)
        .eq("owner_id", user.id)
        .eq("dataset_version_id", versionId)
        .select("*")
        .maybeSingle();
      assertSupabaseResult(error, "Failed to update evaluation case");
      if (!data) throw new EvaluationRequestError("Evaluation case not found.", 404);
      return NextResponse.json({ evaluationCase: data });
    }

    if (action === "delete_case") {
      const versionId = requiredText(body.versionId, "Dataset version ID", 80);
      const caseId = requiredText(body.caseId, "Case ID", 80);
      await draftVersion(user.id, versionId);
      const { data, error } = await supabase
        .from("evaluation_cases")
        .delete()
        .eq("id", caseId)
        .eq("owner_id", user.id)
        .eq("dataset_version_id", versionId)
        .select("id")
        .maybeSingle();
      assertSupabaseResult(error, "Failed to delete evaluation case");
      if (!data) throw new EvaluationRequestError("Evaluation case not found.", 404);
      return NextResponse.json({ success: true });
    }

    if (action === "clone_version") {
      const sourceVersionId = requiredText(body.versionId, "Dataset version ID", 80);
      const sourceVersion = await ownedVersion(user.id, sourceVersionId);
      const { data: versions, error: versionsError } = await supabase
        .from("evaluation_dataset_versions")
        .select("version_number")
        .eq("dataset_id", sourceVersion.dataset_id)
        .eq("owner_id", user.id)
        .order("version_number", { ascending: false })
        .limit(1);
      assertSupabaseResult(versionsError, "Failed to calculate the next dataset version");
      const nextVersionNumber = Number(versions?.[0]?.version_number || 0) + 1;
      const { data: nextVersion, error: createError } = await supabase
        .from("evaluation_dataset_versions")
        .insert({
          dataset_id: sourceVersion.dataset_id,
          owner_id: user.id,
          version_number: nextVersionNumber,
          status: "draft",
          change_note: optionalText(body.changeNote, 1000) || `Cloned from v${sourceVersion.version_number}`,
        })
        .select("*")
        .single();
      assertSupabaseResult(createError, "Failed to create the next dataset version");
      if (!nextVersion) throw new Error("Dataset version was not returned after creation.");

      const { data: sourceCases, error: sourceCasesError } = await supabase
        .from("evaluation_cases")
        .select("case_key,question,reference_answer,reference_facts,expected_evidence,answerable,tags,language,difficulty,rubric,notes,position")
        .eq("dataset_version_id", sourceVersionId)
        .eq("owner_id", user.id);
      assertSupabaseResult(sourceCasesError, "Failed to load cases for version cloning");
      if (sourceCases?.length) {
        const { error: copyError } = await supabase.from("evaluation_cases").insert(
          sourceCases.map((evaluationCase) => ({
            ...evaluationCase,
            dataset_version_id: nextVersion.id,
            owner_id: user.id,
          }))
        );
        if (copyError) {
          await supabase.from("evaluation_dataset_versions").delete().eq("id", nextVersion.id).eq("owner_id", user.id);
          assertSupabaseResult(copyError, "Failed to copy evaluation cases into the next version");
        }
      }
      return NextResponse.json({ version: nextVersion, copiedCases: sourceCases?.length || 0 });
    }

    if (action === "create_run") {
      const versionId = requiredText(body.versionId, "Dataset version ID", 80);
      const version = await ownedVersion(user.id, versionId);
      const caseIds = [...new Set(textArray(body.caseIds, "Case IDs", 20))];
      if (!caseIds.length) throw new EvaluationRequestError("Select at least one evaluation case.");
      const pipelineConfig = jsonObject(body.pipelineConfig, "Pipeline config");
      const schemaName = requiredText(pipelineConfig.schema || "public", "Vector schema", 63);
      const tableName = requiredText(pipelineConfig.tableName, "Vector table", 63);
      if (schemaName !== "public" || !/^[a-zA-Z][a-zA-Z0-9_]*$/.test(tableName)) {
        throw new EvaluationRequestError("The evaluation target must be a valid table in the public schema.");
      }
      const topK = Number(pipelineConfig.topK);
      if (!Number.isInteger(topK) || topK < 1 || topK > 20) {
        throw new EvaluationRequestError("Top K must be an integer between 1 and 20.");
      }
      if (!["text-embedding-3-small", "text-embedding-ada-002"].includes(String(pipelineConfig.embeddingModel))) {
        throw new EvaluationRequestError("Unsupported evaluation embedding model.");
      }
      if (!["gpt-5.6-sol", "gpt-5.6-terra", "gpt-5.6-luna"].includes(String(pipelineConfig.generationModel))) {
        throw new EvaluationRequestError("Unsupported evaluation generation model.");
      }
      if (!["none", "low", "medium", "high"].includes(String(pipelineConfig.reasoningEffort))) {
        throw new EvaluationRequestError("Unsupported evaluation reasoning effort.");
      }
      if (version.status === "archived") {
        throw new EvaluationRequestError("Archived dataset versions cannot be executed.", 409);
      }
      const { data: cases, error: casesError } = await supabase
        .from("evaluation_cases")
        .select("*")
        .eq("dataset_version_id", versionId)
        .eq("owner_id", user.id)
        .in("id", caseIds);
      assertSupabaseResult(casesError, "Failed to load selected evaluation cases");
      if (!cases || cases.length !== caseIds.length) {
        throw new EvaluationRequestError("One or more selected cases do not belong to this dataset version.");
      }

      if (version.status === "draft") {
        const { error: freezeError } = await supabase
          .from("evaluation_dataset_versions")
          .update({ status: "frozen", frozen_at: new Date().toISOString() })
          .eq("id", versionId)
          .eq("owner_id", user.id)
          .eq("status", "draft");
        assertSupabaseResult(freezeError, "Failed to freeze the dataset version");
      }
      const runName = optionalText(body.name, 160) || `v${version.version_number} · ${new Date().toLocaleString("en-CA")}`;
      const { data: run, error: runError } = await supabase
        .from("evaluation_runs")
        .insert({
          owner_id: user.id,
          dataset_version_id: versionId,
          name: runName,
          status: "running",
          pipeline_config: pipelineConfig,
          case_count: cases.length,
          started_at: new Date().toISOString(),
        })
        .select("*")
        .single();
      assertSupabaseResult(runError, "Failed to create evaluation run");
      if (!run) throw new Error("Evaluation run was not returned after creation.");

      const orderedCases = [...cases].sort((left, right) => left.position - right.position);
      const { data: caseRuns, error: caseRunError } = await supabase
        .from("evaluation_case_runs")
        .insert(orderedCases.map((evaluationCase) => ({
          owner_id: user.id,
          evaluation_run_id: run.id,
          evaluation_case_id: evaluationCase.id,
          status: "pending",
          question_snapshot: evaluationCase.question,
          reference_answer_snapshot: evaluationCase.reference_answer,
          reference_facts_snapshot: evaluationCase.reference_facts,
          expected_evidence_snapshot: evaluationCase.expected_evidence,
          rubric_snapshot: evaluationCase.rubric,
        })))
        .select("id,evaluation_case_id,question_snapshot");
      if (caseRunError || !caseRuns) {
        await supabase.from("evaluation_runs").delete().eq("id", run.id).eq("owner_id", user.id);
        assertSupabaseResult(caseRunError, "Failed to create evaluation case runs");
        throw new Error("Evaluation case runs were not returned after creation.");
      }
      return NextResponse.json({ run, tasks: caseRuns });
    }

    if (action === "start_case_run") {
      const caseRunId = requiredText(body.caseRunId, "Case run ID", 80);
      const { data, error } = await supabase
        .from("evaluation_case_runs")
        .update({ status: "running" })
        .eq("id", caseRunId)
        .eq("owner_id", user.id)
        .eq("status", "pending")
        .select("id")
        .maybeSingle();
      assertSupabaseResult(error, "Failed to start evaluation case run");
      if (!data) throw new EvaluationRequestError("Pending evaluation case run not found.", 404);
      return NextResponse.json({ success: true });
    }

    if (action === "attach_case_run") {
      const caseRunId = requiredText(body.caseRunId, "Case run ID", 80);
      const requestedStatus = String(body.status || "failed");
      if (!["succeeded", "failed"].includes(requestedStatus)) {
        throw new EvaluationRequestError("Case run status must be succeeded or failed.");
      }
      const { data: caseRun, error: caseRunError } = await supabase
        .from("evaluation_case_runs")
        .select("id,evaluation_run_id,status,rag_run_id")
        .eq("id", caseRunId)
        .eq("owner_id", user.id)
        .maybeSingle();
      assertSupabaseResult(caseRunError, "Failed to load evaluation case run");
      if (!caseRun) throw new EvaluationRequestError("Evaluation case run not found.", 404);

      const ragRunId = optionalText(body.ragRunId, 80);
      if (["succeeded", "failed"].includes(caseRun.status)) {
        if (caseRun.status === requestedStatus && caseRun.rag_run_id === ragRunId) {
          return NextResponse.json({ success: true, idempotent: true });
        }
        throw new EvaluationRequestError("Completed evaluation case runs cannot be replaced.", 409);
      }
      let ragRun: Record<string, unknown> | null = null;
      if (ragRunId) {
        const { data, error } = await supabase
          .from("rag_runs")
          .select("id,status,pipeline_config,retrieved_contexts,answer,citations,usage,timings,error")
          .eq("id", ragRunId)
          .eq("owner_id", user.id)
          .maybeSingle();
        assertSupabaseResult(error, "Failed to load linked RAG run");
        if (!data) throw new EvaluationRequestError("Linked RAG run not found.", 404);
        ragRun = data;
      }
      if (requestedStatus === "succeeded" && (!ragRun || ragRun.status !== "succeeded")) {
        throw new EvaluationRequestError("A successful evaluation case requires a successful RAG run.");
      }

      const { error: updateError } = await supabase
        .from("evaluation_case_runs")
        .update({
          status: requestedStatus,
          rag_run_id: ragRunId,
          actual_answer: ragRun?.answer || null,
          retrieved_contexts: ragRun?.retrieved_contexts || null,
          citations: ragRun?.citations || null,
          rag_usage: ragRun?.usage || null,
          rag_timings: ragRun?.timings || null,
          rag_pipeline_config: ragRun?.pipeline_config || null,
          error: ragRun?.error || body.error || null,
        })
        .eq("id", caseRunId)
        .eq("owner_id", user.id);
      assertSupabaseResult(updateError, "Failed to attach RAG result to evaluation case");
      await refreshRunSummary(user.id, caseRun.evaluation_run_id);
      return NextResponse.json({ success: true });
    }

    if (action === "review_case_run") {
      const caseRunId = requiredText(body.caseRunId, "Case run ID", 80);
      const decision = String(body.decision || "pending");
      if (!["pending", "pass", "fail"].includes(decision)) {
        throw new EvaluationRequestError("Reviewer decision must be pending, pass, or fail.");
      }
      const rawScore = jsonObject(body.manualScore || {}, "Manual score");
      const manualScore: Record<string, number> = {};
      for (const key of ["correctness", "faithfulness", "citationQuality"]) {
        const value = rawScore[key];
        if (value === null || value === undefined || value === "") continue;
        const score = Number(value);
        if (!Number.isInteger(score) || score < 1 || score > 5) {
          throw new EvaluationRequestError(`${key} score must be an integer from 1 to 5.`);
        }
        manualScore[key] = score;
      }
      const { data: reviewTarget, error: reviewTargetError } = await supabase
        .from("evaluation_case_runs")
        .select("status")
        .eq("id", caseRunId)
        .eq("owner_id", user.id)
        .maybeSingle();
      assertSupabaseResult(reviewTargetError, "Failed to load evaluation case run for review");
      if (!reviewTarget) throw new EvaluationRequestError("Evaluation case run not found.", 404);
      if (!["succeeded", "failed"].includes(reviewTarget.status)) {
        throw new EvaluationRequestError("Only completed case runs can be reviewed.", 409);
      }
      const { data: caseRun, error } = await supabase
        .from("evaluation_case_runs")
        .update({
          manual_score: manualScore,
          reviewer_decision: decision,
          reviewer_notes: optionalText(body.notes, 5000),
          reviewed_at: decision === "pending" ? null : new Date().toISOString(),
        })
        .eq("id", caseRunId)
        .eq("owner_id", user.id)
        .select("evaluation_run_id")
        .maybeSingle();
      assertSupabaseResult(error, "Failed to save manual evaluation review");
      if (!caseRun) throw new EvaluationRequestError("Evaluation case run not found.", 404);
      const aggregateMetrics = await refreshRunSummary(user.id, caseRun.evaluation_run_id);
      return NextResponse.json({ success: true, aggregateMetrics });
    }

    throw new EvaluationRequestError(`Unsupported evaluation action: ${action}`);
  } catch (error) {
    const status = error instanceof EvaluationRequestError ? error.status : 500;
    return NextResponse.json(
      {
        error: error instanceof EvaluationRequestError ? error.message : "Evaluation request failed",
        details: error instanceof EvaluationRequestError
          ? undefined
          : error instanceof Error ? error.message : "Unknown error",
      },
      { status }
    );
  }
}
