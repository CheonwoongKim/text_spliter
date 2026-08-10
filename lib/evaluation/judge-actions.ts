/**
 * Ragas model-judge actions.
 *
 * Judge scores are a separate measurement layer from deterministic retrieval
 * metrics and human review, so they are written to their own tables and never
 * merged into the run's deterministic summary.
 */
import { NextResponse } from "next/server";

import { getDecryptedApiKeyMap } from "@/lib/api-key-store";
import { API_KEY_NAMES } from "@/lib/constants";
import type { EvaluationActionContext } from "@/lib/evaluation/context";
import {
  EvaluationRequestError,
  optionalText,
  requiredText,
  textArray,
} from "@/lib/evaluation/request";
import { ownedRun, refreshJudgeBatchSummary } from "@/lib/evaluation/store";
import {
  evaluateWithRagas,
  getRagasWorkerHealth,
  RAGAS_EVALUATOR_MODELS,
  RAGAS_METRICS,
  RagasWorkerError,
  type RagasEvaluatorModel,
  type RagasMetric,
} from "@/lib/ragas-worker";
import { assertSupabaseResult } from "@/lib/supabase-server";

export async function handleJudgeAction(context: EvaluationActionContext): Promise<NextResponse | null> {
  const { user, body, action, supabase } = context;

    if (action === "check_evaluator") {
      const health = await getRagasWorkerHealth();
      return NextResponse.json({ health });
    }

    if (action === "create_judge_batch") {
      const runId = requiredText(body.runId, "Evaluation run ID", 80);
      const run = await ownedRun(user.id, runId);
      if (run.status !== "completed") {
        throw new EvaluationRequestError("Complete the RAG evaluation run before model judging.", 409);
      }
      const model = requiredText(body.model, "Evaluator model", 80);
      if (!RAGAS_EVALUATOR_MODELS.includes(model as RagasEvaluatorModel)) {
        throw new EvaluationRequestError("Unsupported Ragas evaluator model.");
      }
      const metrics = [...new Set(textArray(body.metrics, "Ragas metrics", RAGAS_METRICS.length))];
      if (!metrics.length || metrics.some((metric) => !RAGAS_METRICS.includes(metric as RagasMetric))) {
        throw new EvaluationRequestError("Select at least one supported Ragas metric.");
      }
      const health = await getRagasWorkerHealth();
      if (!health.allowedModels.includes(model)) {
        throw new EvaluationRequestError("The evaluator worker does not allow this model.", 409);
      }
      if (metrics.some((metric) => !health.supportedMetrics.includes(metric))) {
        throw new EvaluationRequestError("The evaluator worker does not support every selected metric.", 409);
      }
      if (!user.email) throw new EvaluationRequestError("The signed-in account has no email address.", 409);
      const connectedKeys = await getDecryptedApiKeyMap(user.email, [API_KEY_NAMES.OPENAI_EMBEDDING]);
      if (!connectedKeys[API_KEY_NAMES.OPENAI_EMBEDDING]) {
        throw new EvaluationRequestError("Connect an OpenAI API key before running Ragas.", 409);
      }
      const { data: activeBatch, error: activeBatchError } = await supabase
        .from("evaluation_judge_batches")
        .select("*")
        .eq("evaluation_run_id", runId)
        .eq("owner_id", user.id)
        .eq("status", "running")
        .limit(1)
        .maybeSingle();
      assertSupabaseResult(activeBatchError, "Failed to check active evaluator batches");
      if (activeBatch) {
        const activeEvaluator = activeBatch.evaluator_config as Record<string, unknown>;
        const activeMetricConfig = activeBatch.metric_config as Record<string, unknown>;
        const activeMetrics = Array.isArray(activeMetricConfig.metrics) ? activeMetricConfig.metrics : [];
        const sameConfiguration = activeEvaluator.model === model
          && JSON.stringify(activeMetrics) === JSON.stringify(metrics);
        if (!sameConfiguration) {
          throw new EvaluationRequestError("Resume the running evaluator batch with its original model and metrics.", 409);
        }
        const { data: pendingTasks, error: pendingTasksError } = await supabase
          .from("evaluation_judge_case_runs")
          .select("id,evaluation_case_run_id")
          .eq("judge_batch_id", activeBatch.id)
          .eq("owner_id", user.id)
          .eq("status", "pending")
          .order("created_at", { ascending: true });
        assertSupabaseResult(pendingTasksError, "Failed to resume evaluator batch");
        if (!pendingTasks?.length) {
          throw new EvaluationRequestError("The remaining evaluator case is still running. Refresh shortly.", 409);
        }
        return NextResponse.json({ batch: activeBatch, tasks: pendingTasks, resumed: true });
      }
      const { data: successfulCaseRuns, error: caseRunsError } = await supabase
        .from("evaluation_case_runs")
        .select("id")
        .eq("evaluation_run_id", runId)
        .eq("owner_id", user.id)
        .eq("status", "succeeded")
        .order("created_at", { ascending: true });
      assertSupabaseResult(caseRunsError, "Failed to load successful evaluation cases");
      if (!successfulCaseRuns?.length) {
        throw new EvaluationRequestError("This run has no successful cases to evaluate.", 409);
      }

      const { data: batch, error: batchError } = await supabase
        .from("evaluation_judge_batches")
        .insert({
          owner_id: user.id,
          evaluation_run_id: runId,
          name: optionalText(body.name, 160) || `Ragas · ${model} · ${new Date().toLocaleString("en-CA")}`,
          status: "running",
          framework: "ragas",
          framework_version: health.frameworkVersion,
          evaluator_config: {
            provider: "openai",
            model,
            embeddingModel: "text-embedding-3-small",
            workerVersion: health.workerVersion,
          },
          metric_config: {
            metrics,
            contractVersion: health.metricContractVersion,
          },
          case_count: successfulCaseRuns.length,
          started_at: new Date().toISOString(),
        })
        .select("*")
        .single();
      assertSupabaseResult(batchError, "Failed to create evaluator batch");
      if (!batch) throw new Error("Evaluator batch was not returned after creation.");
      const { data: tasks, error: tasksError } = await supabase
        .from("evaluation_judge_case_runs")
        .insert(successfulCaseRuns.map((caseRun) => ({
          owner_id: user.id,
          judge_batch_id: batch.id,
          evaluation_case_run_id: caseRun.id,
          status: "pending",
        })))
        .select("id,evaluation_case_run_id");
      if (tasksError || !tasks) {
        await supabase.from("evaluation_judge_batches").delete().eq("id", batch.id).eq("owner_id", user.id);
        assertSupabaseResult(tasksError, "Failed to create evaluator case tasks");
        throw new Error("Evaluator case tasks were not returned after creation.");
      }
      return NextResponse.json({ batch, tasks });
    }

    if (action === "execute_judge_case_run") {
      const judgeCaseRunId = requiredText(body.judgeCaseRunId, "Evaluator case run ID", 80);
      const { data: task, error: taskError } = await supabase
        .from("evaluation_judge_case_runs")
        .select("*")
        .eq("id", judgeCaseRunId)
        .eq("owner_id", user.id)
        .maybeSingle();
      assertSupabaseResult(taskError, "Failed to load evaluator case task");
      if (!task) throw new EvaluationRequestError("Evaluator case task not found.", 404);
      if (["succeeded", "failed"].includes(task.status)) {
        return NextResponse.json({ success: task.status === "succeeded", caseRun: task, idempotent: true });
      }
      if (task.status !== "pending") {
        throw new EvaluationRequestError("This evaluator case task is already running.", 409);
      }
      const { data: batch, error: batchError } = await supabase
        .from("evaluation_judge_batches")
        .select("*")
        .eq("id", task.judge_batch_id)
        .eq("owner_id", user.id)
        .maybeSingle();
      assertSupabaseResult(batchError, "Failed to load evaluator batch");
      if (!batch || batch.status !== "running") {
        throw new EvaluationRequestError("The evaluator batch is no longer running.", 409);
      }
      const startedAt = new Date().toISOString();
      const { data: claimedTask, error: claimError } = await supabase
        .from("evaluation_judge_case_runs")
        .update({ status: "running", started_at: startedAt, error: null })
        .eq("id", judgeCaseRunId)
        .eq("owner_id", user.id)
        .eq("status", "pending")
        .select("id")
        .maybeSingle();
      assertSupabaseResult(claimError, "Failed to start evaluator case task");
      if (!claimedTask) throw new EvaluationRequestError("Evaluator case task was already claimed.", 409);

      try {
        const { data: evaluationCaseRun, error: evaluationCaseRunError } = await supabase
        .from("evaluation_case_runs")
        .select("id,status,question_snapshot,reference_answer_snapshot,reference_facts_snapshot,actual_answer,retrieved_contexts")
        .eq("id", task.evaluation_case_run_id)
        .eq("owner_id", user.id)
        .maybeSingle();
      assertSupabaseResult(evaluationCaseRunError, "Failed to load evaluation case snapshot");
      if (!evaluationCaseRun || evaluationCaseRun.status !== "succeeded" || !evaluationCaseRun.actual_answer) {
        throw new EvaluationRequestError("Only successful RAG case results can be model judged.", 409);
      }
      const contexts = Array.isArray(evaluationCaseRun.retrieved_contexts)
        ? evaluationCaseRun.retrieved_contexts.map((context) => {
            if (typeof context === "string") return context.trim();
            if (context && typeof context === "object" && typeof (context as Record<string, unknown>).content === "string") {
              return ((context as Record<string, unknown>).content as string).trim();
            }
            return "";
          }).filter(Boolean).slice(0, 20)
        : [];
      if (!contexts.length) {
        throw new EvaluationRequestError("The RAG case has no retrieved contexts to evaluate.", 409);
      }
      if (!user.email) throw new EvaluationRequestError("The signed-in account has no email address.", 409);
      const keys = await getDecryptedApiKeyMap(user.email, [API_KEY_NAMES.OPENAI_EMBEDDING]);
      const apiKey = keys[API_KEY_NAMES.OPENAI_EMBEDDING];
      if (!apiKey) {
        throw new EvaluationRequestError("Connect an OpenAI API key before running Ragas.", 409);
      }
      const evaluatorConfig = batch.evaluator_config as Record<string, unknown>;
      const metricConfig = batch.metric_config as Record<string, unknown>;
      const model = String(evaluatorConfig.model) as RagasEvaluatorModel;
      const metrics = (Array.isArray(metricConfig.metrics) ? metricConfig.metrics : []) as RagasMetric[];
      if (!RAGAS_EVALUATOR_MODELS.includes(model) || !metrics.length) {
        throw new EvaluationRequestError("The evaluator batch configuration is invalid.", 409);
      }
      const referenceFacts = Array.isArray(evaluationCaseRun.reference_facts_snapshot)
        ? evaluationCaseRun.reference_facts_snapshot.filter((fact): fact is string => typeof fact === "string" && Boolean(fact.trim()))
        : [];
      const reference = evaluationCaseRun.reference_answer_snapshot
        || (referenceFacts.length ? referenceFacts.map((fact) => `- ${fact}`).join("\n") : null);
        const result = await evaluateWithRagas({
          requestId: judgeCaseRunId,
          apiKey,
          model,
          metrics,
          sample: {
            userInput: evaluationCaseRun.question_snapshot,
            response: evaluationCaseRun.actual_answer,
            reference,
            retrievedContexts: contexts,
          },
        });
        const { data: completedTask, error: completeError } = await supabase
          .from("evaluation_judge_case_runs")
          .update({
            status: "succeeded",
            scores: result.scores,
            metric_details: result.metric_details,
            prompt_manifest: result.prompt_manifest,
            usage: {
              ...result.usage,
              durationMs: result.duration_ms,
              evaluator: result.evaluator,
              workerVersion: result.worker_version,
              metricContractVersion: result.metric_contract_version,
              resultStatus: result.status,
            },
            error: null,
            completed_at: new Date().toISOString(),
          })
          .eq("id", judgeCaseRunId)
          .eq("owner_id", user.id)
          .select("*")
          .single();
        assertSupabaseResult(completeError, "Failed to save evaluator case result");
        await supabase
          .from("evaluation_judge_batches")
          .update({ framework_version: result.framework_version })
          .eq("id", batch.id)
          .eq("owner_id", user.id);
        const aggregate = await refreshJudgeBatchSummary(user.id, batch.id);
        return NextResponse.json({ success: true, caseRun: completedTask, aggregate });
      } catch (error) {
        const message = error instanceof Error ? error.message.slice(0, 2000) : "Ragas evaluation failed.";
        const statusCode = error instanceof RagasWorkerError ? error.status : 500;
        const { data: failedTask, error: failError } = await supabase
          .from("evaluation_judge_case_runs")
          .update({
            status: "failed",
            error: { message, status: statusCode },
            completed_at: new Date().toISOString(),
          })
          .eq("id", judgeCaseRunId)
          .eq("owner_id", user.id)
          .select("*")
          .single();
        assertSupabaseResult(failError, "Failed to save evaluator case failure");
        const aggregate = await refreshJudgeBatchSummary(user.id, batch.id);
        return NextResponse.json({ success: false, caseRun: failedTask, aggregate, error: message });
      }
    }

  return null;
}
