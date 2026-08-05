import { NextRequest, NextResponse } from "next/server";

import { getUserFromToken } from "@/lib/auth-server";
import {
  assertNormalizedDocument,
  DOCUMENT_EVALUATION_VERSION,
  evaluateDocumentIR,
} from "@/lib/document-evaluation";
import { assertSupabaseResult, getAppSupabase } from "@/lib/supabase-server";
import type { NormalizedDocument } from "@/lib/document-ir";

class DocumentEvaluationRequestError extends Error {
  constructor(message: string, public readonly status = 400) {
    super(message);
    this.name = "DocumentEvaluationRequestError";
  }
}

function requiredText(value: unknown, label: string, maxLength: number): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new DocumentEvaluationRequestError(`${label} is required.`);
  }
  if (value.trim().length > maxLength) {
    throw new DocumentEvaluationRequestError(`${label} must be at most ${maxLength} characters.`);
  }
  return value.trim();
}

function optionalText(value: unknown, maxLength: number): string | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string" || value.trim().length > maxLength) {
    throw new DocumentEvaluationRequestError(`Text must be at most ${maxLength} characters.`);
  }
  return value.trim() || null;
}

function requiredId(value: unknown, label: string): string {
  return requiredText(value, label, 80);
}

function parseResultId(value: unknown, label = "Parse result ID"): number {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id < 1) {
    throw new DocumentEvaluationRequestError(`${label} must be a positive integer.`);
  }
  return id;
}

function parseResultIds(value: unknown): number[] {
  if (!Array.isArray(value) || !value.length || value.length > 20) {
    throw new DocumentEvaluationRequestError("Select between 1 and 20 parser runs.");
  }
  return [...new Set(value.map((item) => parseResultId(item, "Candidate parse result ID")))];
}

function objectValue(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new DocumentEvaluationRequestError(`${label} must be an object.`);
  }
  return value as Record<string, unknown>;
}

function benchmarkAttributes(value: unknown): Record<string, unknown> {
  const attributes = value === undefined || value === null ? {} : objectValue(value, "Attributes");
  const normalized: Record<string, unknown> = {};
  for (const key of ["documentType", "language", "layout", "quality"]) {
    const text = optionalText(attributes[key], 80);
    if (text) normalized[key] = text;
  }
  if (attributes.tags !== undefined) {
    if (!Array.isArray(attributes.tags) || attributes.tags.length > 30) {
      throw new DocumentEvaluationRequestError("Tags must contain at most 30 items.");
    }
    normalized.tags = attributes.tags.map((tag) => requiredText(tag, "Tag", 80));
  }
  return normalized;
}

function validatedDocument(value: unknown, label: string): NormalizedDocument {
  try {
    assertNormalizedDocument(value, label);
  } catch (error) {
    throw new DocumentEvaluationRequestError(error instanceof Error ? error.message : `${label} is invalid.`);
  }
  if (JSON.stringify(value).length > 25_000_000) {
    throw new DocumentEvaluationRequestError(`${label} must be at most 25 MB.`);
  }
  return value;
}

async function ownedBenchmark(ownerId: string, benchmarkId: string) {
  const { data, error } = await getAppSupabase()
    .from("document_evaluation_benchmarks")
    .select("*")
    .eq("id", benchmarkId)
    .eq("owner_id", ownerId)
    .maybeSingle();
  assertSupabaseResult(error, "Failed to load document benchmark");
  if (!data) throw new DocumentEvaluationRequestError("Document benchmark not found.", 404);
  return data;
}

async function ownedGroundTruth(ownerId: string, groundTruthId: string) {
  const { data, error } = await getAppSupabase()
    .from("document_evaluation_ground_truths")
    .select("*")
    .eq("id", groundTruthId)
    .eq("owner_id", ownerId)
    .maybeSingle();
  assertSupabaseResult(error, "Failed to load document reference");
  if (!data) throw new DocumentEvaluationRequestError("Document reference not found.", 404);
  return data;
}

async function ownedParseResult(userEmail: string, id: number) {
  const { data, error } = await getAppSupabase()
    .from("parse_results")
    .select("*")
    .eq("id", id)
    .eq("user_email", userEmail)
    .maybeSingle();
  assertSupabaseResult(error, "Failed to load parser result");
  if (!data) throw new DocumentEvaluationRequestError("Parser result not found.", 404);
  return data;
}

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromToken(request);
    if (!user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const supabase = getAppSupabase();
    const searchParams = new URL(request.url).searchParams;
    const runId = searchParams.get("runId");
    if (runId) {
      const { data, error } = await supabase
        .from("document_evaluation_runs")
        .select("*")
        .eq("id", runId)
        .eq("owner_id", user.id)
        .maybeSingle();
      assertSupabaseResult(error, "Failed to load document evaluation run");
      if (!data) return NextResponse.json({ error: "Document evaluation run not found" }, { status: 404 });
      return NextResponse.json({ run: data });
    }
    const groundTruthId = searchParams.get("groundTruthId");
    if (groundTruthId) {
      const { data, error } = await supabase
        .from("document_evaluation_ground_truths")
        .select("*")
        .eq("id", groundTruthId)
        .eq("owner_id", user.id)
        .maybeSingle();
      assertSupabaseResult(error, "Failed to load document reference");
      if (!data) return NextResponse.json({ error: "Document reference not found" }, { status: 404 });
      return NextResponse.json({ groundTruth: data });
    }
    const [benchmarks, groundTruths, runs, candidates] = await Promise.all([
      supabase.from("document_evaluation_benchmarks").select("*").eq("owner_id", user.id).order("updated_at", { ascending: false }),
      supabase.from("document_evaluation_ground_truths")
        .select("id,benchmark_id,owner_id,version_number,status,source_parse_result_id,notes,frozen_at,created_at,updated_at")
        .eq("owner_id", user.id)
        .order("version_number", { ascending: false }),
      supabase.from("document_evaluation_runs")
        .select("id,benchmark_id,ground_truth_id,owner_id,parse_result_id,status,framework_version,candidate_metadata,metrics,issue_count,error,started_at,completed_at,created_at")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false })
        .limit(300),
      supabase.from("parse_results")
        .select("id,run_id,document_hash,parser_type,engine_id,parser_model,parser_version,run_status,file_name,mime_type,processing_time,created_at")
        .eq("user_email", user.email)
        .eq("run_status", "succeeded")
        .not("normalized_document", "is", null)
        .order("created_at", { ascending: false })
        .limit(300),
    ]);
    assertSupabaseResult(benchmarks.error, "Failed to load document benchmarks");
    assertSupabaseResult(groundTruths.error, "Failed to load document references");
    assertSupabaseResult(runs.error, "Failed to load document evaluation runs");
    assertSupabaseResult(candidates.error, "Failed to load parser candidates");
    return NextResponse.json({
      benchmarks: benchmarks.data || [],
      groundTruths: groundTruths.data || [],
      runs: runs.data || [],
      candidates: candidates.data || [],
    });
  } catch (error) {
    return NextResponse.json({
      error: "Failed to load document evaluation workspace",
      details: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromToken(request);
    if (!user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = await request.json() as Record<string, unknown>;
    const action = requiredText(body.action, "Action", 80);
    const supabase = getAppSupabase();

    if (action === "create_benchmark") {
      const source = await ownedParseResult(user.email, parseResultId(body.parseResultId));
      const document = validatedDocument(source.normalized_document, "Reference Document IR");
      const name = optionalText(body.name, 160) || `${source.file_name} reference`;
      const { data: benchmark, error } = await supabase
        .from("document_evaluation_benchmarks")
        .insert({
          owner_id: user.id,
          name,
          description: optionalText(body.description, 2000),
          document_hash: source.document_hash,
          file_name: source.file_name,
          mime_type: source.mime_type,
          source_storage_key: source.file_storage_key,
          attributes: benchmarkAttributes(body.attributes),
        })
        .select("*")
        .single();
      assertSupabaseResult(error, "Failed to create document benchmark");
      if (!benchmark) throw new Error("Document benchmark was not returned after creation.");
      const { data: groundTruth, error: groundTruthError } = await supabase
        .from("document_evaluation_ground_truths")
        .insert({
          benchmark_id: benchmark.id,
          owner_id: user.id,
          version_number: 1,
          status: "draft",
          source_parse_result_id: source.id,
          normalized_document: document,
          notes: optionalText(body.notes, 5000),
        })
        .select("*")
        .single();
      if (groundTruthError || !groundTruth) {
        await supabase.from("document_evaluation_benchmarks").delete().eq("id", benchmark.id).eq("owner_id", user.id);
        assertSupabaseResult(groundTruthError, "Failed to create document reference");
        throw new Error("Document reference was not returned after creation.");
      }
      return NextResponse.json({ benchmark, groundTruth });
    }

    if (action === "update_benchmark") {
      const benchmarkId = requiredId(body.benchmarkId, "Benchmark ID");
      await ownedBenchmark(user.id, benchmarkId);
      const { data, error } = await supabase
        .from("document_evaluation_benchmarks")
        .update({
          name: requiredText(body.name, "Benchmark name", 160),
          description: optionalText(body.description, 2000),
          attributes: benchmarkAttributes(body.attributes),
        })
        .eq("id", benchmarkId)
        .eq("owner_id", user.id)
        .select("*")
        .single();
      assertSupabaseResult(error, "Failed to update document benchmark");
      return NextResponse.json({ benchmark: data });
    }

    if (action === "delete_benchmark") {
      const benchmarkId = requiredId(body.benchmarkId, "Benchmark ID");
      const { data, error } = await supabase
        .from("document_evaluation_benchmarks")
        .delete()
        .eq("id", benchmarkId)
        .eq("owner_id", user.id)
        .select("id")
        .maybeSingle();
      assertSupabaseResult(error, "Failed to delete document benchmark");
      if (!data) throw new DocumentEvaluationRequestError("Document benchmark not found.", 404);
      return NextResponse.json({ success: true });
    }

    if (action === "update_ground_truth") {
      const groundTruthId = requiredId(body.groundTruthId, "Reference ID");
      const groundTruth = await ownedGroundTruth(user.id, groundTruthId);
      if (groundTruth.status !== "draft") {
        throw new DocumentEvaluationRequestError("Frozen document references cannot be edited.", 409);
      }
      const normalizedDocument = validatedDocument(body.normalizedDocument, "Reference Document IR");
      const { data, error } = await supabase
        .from("document_evaluation_ground_truths")
        .update({ normalized_document: normalizedDocument, notes: optionalText(body.notes, 5000) })
        .eq("id", groundTruthId)
        .eq("owner_id", user.id)
        .eq("status", "draft")
        .select("*")
        .single();
      assertSupabaseResult(error, "Failed to update document reference");
      return NextResponse.json({ groundTruth: data });
    }

    if (action === "freeze_ground_truth") {
      const groundTruthId = requiredId(body.groundTruthId, "Reference ID");
      const groundTruth = await ownedGroundTruth(user.id, groundTruthId);
      if (groundTruth.status !== "draft") {
        throw new DocumentEvaluationRequestError("Only draft document references can be frozen.", 409);
      }
      validatedDocument(groundTruth.normalized_document, "Reference Document IR");
      const { data, error } = await supabase
        .from("document_evaluation_ground_truths")
        .update({ status: "frozen", frozen_at: new Date().toISOString() })
        .eq("id", groundTruthId)
        .eq("owner_id", user.id)
        .eq("status", "draft")
        .select("*")
        .single();
      assertSupabaseResult(error, "Failed to freeze document reference");
      return NextResponse.json({ groundTruth: data });
    }

    if (action === "clone_ground_truth") {
      const groundTruthId = requiredId(body.groundTruthId, "Reference ID");
      const source = await ownedGroundTruth(user.id, groundTruthId);
      const { data: latest, error: latestError } = await supabase
        .from("document_evaluation_ground_truths")
        .select("version_number")
        .eq("benchmark_id", source.benchmark_id)
        .eq("owner_id", user.id)
        .order("version_number", { ascending: false })
        .limit(1)
        .single();
      assertSupabaseResult(latestError, "Failed to calculate the next document reference version");
      const { data, error } = await supabase
        .from("document_evaluation_ground_truths")
        .insert({
          benchmark_id: source.benchmark_id,
          owner_id: user.id,
          version_number: Number(latest?.version_number || 0) + 1,
          status: "draft",
          source_parse_result_id: source.source_parse_result_id,
          normalized_document: source.normalized_document,
          notes: optionalText(body.notes, 5000) || `Cloned from v${source.version_number}`,
        })
        .select("*")
        .single();
      assertSupabaseResult(error, "Failed to clone document reference");
      return NextResponse.json({ groundTruth: data });
    }

    if (action === "evaluate_candidates") {
      const benchmarkId = requiredId(body.benchmarkId, "Benchmark ID");
      const groundTruthId = requiredId(body.groundTruthId, "Reference ID");
      const candidateIds = parseResultIds(body.parseResultIds);
      const benchmark = await ownedBenchmark(user.id, benchmarkId);
      const groundTruth = await ownedGroundTruth(user.id, groundTruthId);
      if (groundTruth.benchmark_id !== benchmarkId || groundTruth.status !== "frozen") {
        throw new DocumentEvaluationRequestError("Select a frozen reference from this benchmark.", 409);
      }
      const reference = validatedDocument(groundTruth.normalized_document, "Reference Document IR");
      const { data: candidates, error: candidateError } = await supabase
        .from("parse_results")
        .select("*")
        .eq("user_email", user.email)
        .eq("run_status", "succeeded")
        .in("id", candidateIds);
      assertSupabaseResult(candidateError, "Failed to load parser candidates");
      if (!candidates || candidates.length !== candidateIds.length) {
        throw new DocumentEvaluationRequestError("One or more parser candidates were not found.", 404);
      }

      const rows = candidates.map((candidate) => {
        if (benchmark.document_hash && candidate.document_hash !== benchmark.document_hash) {
          throw new DocumentEvaluationRequestError("Every candidate must come from the same source document.", 409);
        }
        const candidateDocument = validatedDocument(candidate.normalized_document, "Candidate Document IR");
        const result = evaluateDocumentIR(reference, candidateDocument);
        return {
          benchmark_id: benchmarkId,
          ground_truth_id: groundTruthId,
          owner_id: user.id,
          parse_result_id: candidate.id,
          status: "completed",
          framework_version: DOCUMENT_EVALUATION_VERSION,
          reference_snapshot: reference,
          candidate_snapshot: candidateDocument,
          candidate_metadata: {
            runId: candidate.run_id,
            engineId: candidate.engine_id,
            parserType: candidate.parser_type,
            model: candidate.parser_model,
            version: candidate.parser_version,
            config: candidate.run_config,
            processingTime: candidate.processing_time,
          },
          metrics: result.metrics,
          issues: result.issues,
          issue_count: result.issues.length,
          completed_at: new Date().toISOString(),
        };
      });
      const { data: runs, error } = await supabase
        .from("document_evaluation_runs")
        .insert(rows)
        .select("*");
      assertSupabaseResult(error, "Failed to save document evaluation runs");
      return NextResponse.json({ runs: runs || [] });
    }

    throw new DocumentEvaluationRequestError(`Unsupported document evaluation action: ${action}`);
  } catch (error) {
    const status = error instanceof DocumentEvaluationRequestError ? error.status : 500;
    return NextResponse.json({
      error: error instanceof DocumentEvaluationRequestError ? error.message : "Document evaluation request failed",
      details: error instanceof DocumentEvaluationRequestError
        ? undefined
        : error instanceof Error ? error.message : "Unknown error",
    }, { status });
  }
}
