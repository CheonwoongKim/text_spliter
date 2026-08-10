/**
 * Owned-row lookups and run summary recalculation for the evaluation API.
 *
 * Every read is scoped to the authenticated owner, and a run is summarized from
 * its stored case snapshots so frozen results never change.
 */
import { aggregateJudgeMetrics } from "@/lib/evaluation-judge";
import {
  aggregateDeterministicMetrics,
  buildMetricBreakdowns,
  calculateDeterministicMetrics,
  DETERMINISTIC_METRIC_KEYS,
  type EvaluationMetricRow,
} from "@/lib/evaluation-metrics";
import {
  DEFAULT_REGRESSION_THRESHOLD,
  EvaluationRequestError,
  runTopK,
} from "@/lib/evaluation/request";
import { assertSupabaseResult, getAppSupabase } from "@/lib/supabase-server";
import type { DeterministicMetricKey, ExpectedEvidence } from "@/lib/types";

export async function ownedVersion(ownerId: string, versionId: string) {
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

export async function ownedRun(ownerId: string, runId: string) {
  const { data, error } = await getAppSupabase()
    .from("evaluation_runs")
    .select("*")
    .eq("id", runId)
    .eq("owner_id", ownerId)
    .maybeSingle();
  assertSupabaseResult(error, "Failed to load evaluation run");
  if (!data) throw new EvaluationRequestError("Evaluation run not found.", 404);
  return data;
}

export async function draftVersion(ownerId: string, versionId: string) {
  const version = await ownedVersion(ownerId, versionId);
  if (version.status !== "draft") {
    throw new EvaluationRequestError(
      "Frozen versions cannot be edited. Create the next version to continue editing.",
      409
    );
  }
  return version;
}

export async function refreshRunSummary(ownerId: string, runId: string) {
  const supabase = getAppSupabase();
  const run = await ownedRun(ownerId, runId);
  const { data: rows, error } = await supabase
    .from("evaluation_case_runs")
    .select("id,status,manual_score,reviewer_decision,expected_evidence_snapshot,retrieved_contexts,citations,rag_pipeline_config,deterministic_metrics,case_attributes_snapshot")
    .eq("evaluation_run_id", runId)
    .eq("owner_id", ownerId);
  assertSupabaseResult(error, "Failed to summarize evaluation case runs");

  const caseRuns = (rows || []).map((row) => {
    const deterministicMetrics = row.status === "succeeded"
      ? calculateDeterministicMetrics({
          expectedEvidence: (Array.isArray(row.expected_evidence_snapshot)
            ? row.expected_evidence_snapshot
            : []) as ExpectedEvidence[],
          retrievedContexts: Array.isArray(row.retrieved_contexts) ? row.retrieved_contexts : [],
          citations: Array.isArray(row.citations) ? row.citations : [],
          topK: runTopK(
            row.rag_pipeline_config && typeof row.rag_pipeline_config === "object"
              ? row.rag_pipeline_config as Record<string, unknown>
              : null,
            run.pipeline_config as Record<string, unknown>
          ),
        })
      : null;
    return { ...row, calculatedMetrics: deterministicMetrics };
  });

  const metricUpdates = caseRuns.filter((row) => {
    const next = row.calculatedMetrics || {};
    return JSON.stringify(row.deterministic_metrics || {}) !== JSON.stringify(next);
  });
  if (metricUpdates.length) {
    await Promise.all(metricUpdates.map(async (row) => {
      const { error: metricError } = await supabase
        .from("evaluation_case_runs")
        .update({ deterministic_metrics: row.calculatedMetrics || {} })
        .eq("id", row.id)
        .eq("owner_id", ownerId);
      assertSupabaseResult(metricError, "Failed to save deterministic evaluation metrics");
    }));
  }
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
  const metricRows: EvaluationMetricRow[] = caseRuns.map((row) => ({
    status: row.status,
    deterministicMetrics: row.calculatedMetrics,
    attributes: row.case_attributes_snapshot && typeof row.case_attributes_snapshot === "object"
      ? row.case_attributes_snapshot as Record<string, unknown>
      : {},
    pipelineConfig: row.rag_pipeline_config && typeof row.rag_pipeline_config === "object"
      ? row.rag_pipeline_config as Record<string, unknown>
      : run.pipeline_config as Record<string, unknown>,
    retrievedContexts: Array.isArray(row.retrieved_contexts) ? row.retrieved_contexts : [],
  }));
  const deterministic = aggregateDeterministicMetrics(
    metricRows.map((row) => row.deterministicMetrics)
  );
  const isComplete = caseRuns.length > 0 && completedCount === caseRuns.length;
  const thresholds = (run.regression_thresholds || {}) as Partial<Record<DeterministicMetricKey, number>>;
  let comparison: Record<string, unknown> | null = null;
  if (run.baseline_run_id) {
    const { data: baseline, error: baselineError } = await supabase
      .from("evaluation_runs")
      .select("id,name,status,aggregate_metrics")
      .eq("id", run.baseline_run_id)
      .eq("owner_id", ownerId)
      .maybeSingle();
    assertSupabaseResult(baselineError, "Failed to load baseline evaluation run");
    const baselineAggregate = baseline?.aggregate_metrics && typeof baseline.aggregate_metrics === "object"
      ? baseline.aggregate_metrics as Record<string, unknown>
      : {};
    const baselineDeterministic = baselineAggregate.deterministic && typeof baselineAggregate.deterministic === "object"
      ? baselineAggregate.deterministic as Record<string, unknown>
      : {};
    const deltas: Partial<Record<DeterministicMetricKey, number | null>> = {};
    const regressions: Array<Record<string, unknown>> = [];
    let comparableMetricCount = 0;
    for (const key of DETERMINISTIC_METRIC_KEYS) {
      const candidateValue = deterministic[key];
      const baselineValue = baselineDeterministic[key];
      const delta = typeof candidateValue === "number" && typeof baselineValue === "number"
        ? Number((candidateValue - baselineValue).toFixed(6))
        : null;
      deltas[key] = delta;
      if (delta !== null) comparableMetricCount += 1;
      const allowedDrop = thresholds[key] ?? DEFAULT_REGRESSION_THRESHOLD;
      if (delta !== null && delta < -allowedDrop) {
        regressions.push({ metric: key, baseline: baselineValue, candidate: candidateValue, delta, allowedDrop });
      }
    }
    const baselineReady = baseline?.status === "completed" && comparableMetricCount > 0;
    comparison = {
      baselineRunId: run.baseline_run_id,
      baselineRunName: baseline?.name || null,
      status: !isComplete ? "pending" : !baselineReady ? "unavailable" : regressions.length ? "failed" : "passed",
      thresholds,
      deltas,
      regressions,
    };
  }
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
    deterministic,
    breakdowns: buildMetricBreakdowns(metricRows),
    comparison,
  };
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

export async function refreshJudgeBatchSummary(ownerId: string, batchId: string) {
  const supabase = getAppSupabase();
  const { data: batch, error: batchError } = await supabase
    .from("evaluation_judge_batches")
    .select("id,case_count,metric_config")
    .eq("id", batchId)
    .eq("owner_id", ownerId)
    .maybeSingle();
  assertSupabaseResult(batchError, "Failed to load evaluator batch");
  if (!batch) throw new EvaluationRequestError("Evaluator batch not found.", 404);

  const { data: rows, error } = await supabase
    .from("evaluation_judge_case_runs")
    .select("status,scores,metric_details,usage")
    .eq("judge_batch_id", batchId)
    .eq("owner_id", ownerId);
  assertSupabaseResult(error, "Failed to summarize evaluator batch");
  const configuredMetrics = batch.metric_config && typeof batch.metric_config === "object"
    && Array.isArray((batch.metric_config as Record<string, unknown>).metrics)
    ? (batch.metric_config as { metrics: string[] }).metrics
    : [];
  const aggregate = aggregateJudgeMetrics((rows || []).map((row) => ({
    status: row.status,
    scores: row.scores as Record<string, unknown>,
    metricDetails: row.metric_details as Record<string, unknown>,
    usage: row.usage as Record<string, unknown>,
  })), configuredMetrics);
  const complete = batch.case_count > 0 && aggregate.completedCount === batch.case_count;
  const status = complete
    ? aggregate.succeededCount > 0 ? "completed" : "failed"
    : "running";
  const { error: updateError } = await supabase
    .from("evaluation_judge_batches")
    .update({
      status,
      completed_count: aggregate.completedCount,
      succeeded_count: aggregate.succeededCount,
      failed_count: aggregate.failedCount,
      aggregate_metrics: { metrics: aggregate.metrics, usage: aggregate.usage },
      completed_at: complete ? new Date().toISOString() : null,
    })
    .eq("id", batchId)
    .eq("owner_id", ownerId);
  assertSupabaseResult(updateError, "Failed to update evaluator batch summary");
  return { ...aggregate, status };
}
