/**
 * Evaluation run actions: creating a frozen run, attaching RAG results, and
 * recording human review.
 *
 * Starting a run freezes the dataset version and snapshots every selected case,
 * so later edits to the golden set cannot rewrite a past measurement.
 */
import { NextResponse } from "next/server";

import { describeEmbeddingModel } from "@/lib/constants";

import type { EvaluationActionContext } from "@/lib/evaluation/context";
import {
  EvaluationRequestError,
  jsonObject,
  optionalText,
  regressionThresholds,
  requiredText,
  textArray,
} from "@/lib/evaluation/request";
import { ownedRun, ownedVersion, refreshRunSummary } from "@/lib/evaluation/store";
import { assertSupabaseResult } from "@/lib/supabase-server";
import {
  assertManagedVectorSchema,
  MANAGED_VECTOR_SCHEMA,
} from "@/lib/vectorstore";
import {
  getOwnedVectorCollection,
  VectorStoreRequestError,
  type ManagedVectorCollection,
} from "@/lib/vectorstore-server";

export async function handleRunAction(context: EvaluationActionContext): Promise<NextResponse | null> {
  const { user, body, action, supabase } = context;

    if (action === "create_run") {
      const versionId = requiredText(body.versionId, "Dataset version ID", 80);
      const version = await ownedVersion(user.id, versionId);
      const baselineRunId = optionalText(body.baselineRunId, 80);
      const thresholds = regressionThresholds(body.regressionThresholds, Boolean(baselineRunId));
      if (baselineRunId) {
        const baseline = await ownedRun(user.id, baselineRunId);
        if (baseline.status !== "completed") {
          throw new EvaluationRequestError("The baseline run must be completed.", 409);
        }
        const baselineVersion = await ownedVersion(user.id, baseline.dataset_version_id);
        if (baselineVersion.dataset_id !== version.dataset_id) {
          throw new EvaluationRequestError("The baseline run must belong to the same evaluation dataset.", 409);
        }
        await refreshRunSummary(user.id, baselineRunId);
      }
      const caseIds = [...new Set(textArray(body.caseIds, "Case IDs", 20))];
      if (!caseIds.length) throw new EvaluationRequestError("Select at least one evaluation case.");
      const pipelineConfig = jsonObject(body.pipelineConfig, "Pipeline config");
      const schemaName = requiredText(pipelineConfig.schema || MANAGED_VECTOR_SCHEMA, "Vector schema", 63);
      const tableName = requiredText(pipelineConfig.tableName, "Vector table", 63);
      let collection: ManagedVectorCollection | null = null;
      try {
        assertManagedVectorSchema(schemaName);
        collection = await getOwnedVectorCollection(user.id, tableName);
      } catch (error) {
        if (error instanceof VectorStoreRequestError) {
          throw new EvaluationRequestError(error.message, error.status);
        }
        throw new EvaluationRequestError(
          error instanceof Error ? error.message : "Invalid managed vector collection."
        );
      }
      const topK = Number(pipelineConfig.topK);
      if (!Number.isInteger(topK) || topK < 1 || topK > 20) {
        throw new EvaluationRequestError("Top K must be an integer between 1 and 20.");
      }
      // A frozen run records the model it retrieved with, and that must be the
      // model the collection was built with or the scores compare nothing.
      if (pipelineConfig.embeddingModel !== collection.embedding_model
        || Number(pipelineConfig.embeddingDimensions ?? collection.vector_dimension)
          !== collection.vector_dimension) {
        throw new EvaluationRequestError(
          `Collection '${collection.name}' is indexed with `
          + `${describeEmbeddingModel(collection.embedding_model, collection.vector_dimension)}.`
        );
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
          baseline_run_id: baselineRunId,
          regression_thresholds: thresholds,
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
          case_attributes_snapshot: {
            caseKey: evaluationCase.case_key,
            answerable: evaluationCase.answerable,
            tags: evaluationCase.tags,
            language: evaluationCase.language,
            difficulty: evaluationCase.difficulty,
          },
        })))
        .select("id,evaluation_case_id,question_snapshot");
      if (caseRunError || !caseRuns) {
        await supabase.from("evaluation_runs").delete().eq("id", run.id).eq("owner_id", user.id);
        assertSupabaseResult(caseRunError, "Failed to create evaluation case runs");
        throw new Error("Evaluation case runs were not returned after creation.");
      }
      return NextResponse.json({ run, tasks: caseRuns });
    }

    if (action === "recalculate_run_metrics") {
      const runId = requiredText(body.runId, "Evaluation run ID", 80);
      await ownedRun(user.id, runId);
      const aggregateMetrics = await refreshRunSummary(user.id, runId);
      return NextResponse.json({ success: true, aggregateMetrics });
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
      const aggregateMetrics = await refreshRunSummary(user.id, caseRun.evaluation_run_id);
      return NextResponse.json({ success: true, aggregateMetrics });
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

  return null;
}
