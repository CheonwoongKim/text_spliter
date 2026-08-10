/**
 * Golden set actions: datasets, cases, and version cloning.
 *
 * Cases are editable only while their version is a draft; a frozen version is
 * cloned into a new draft instead of being modified in place.
 */
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";

import type { EvaluationActionContext } from "@/lib/evaluation/context";
import {
  EvaluationRequestError,
  expectedEvidenceArray,
  jsonObject,
  optionalText,
  requiredText,
  textArray,
} from "@/lib/evaluation/request";
import { draftVersion, ownedVersion } from "@/lib/evaluation/store";
import { assertSupabaseResult } from "@/lib/supabase-server";

export async function handleDatasetAction(context: EvaluationActionContext): Promise<NextResponse | null> {
  const { user, body, action, supabase } = context;

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

  return null;
}
