import { NextRequest, NextResponse } from "next/server";
import { getUserEmailFromToken } from "@/lib/auth-server";
import { DOCUMENT_ENGINE_TYPES } from "@/lib/constants";
import {
  DOCUMENT_ENGINE_SETTINGS_SCHEMA_VERSION,
  normalizeDocumentEngineConfig,
} from "@/lib/document-engine-settings";
import { getDocumentEngine } from "@/lib/document-engines";
import { assertSupabaseResult, getAppSupabase } from "@/lib/supabase-server";
import type { DocumentEngineType } from "@/lib/types";
import { ValidationError, validateDocumentEngineType } from "@/lib/validation";

interface DocumentEngineSettingsRow {
  parser_type: DocumentEngineType;
  config: unknown;
  schema_version: number;
  updated_at: string;
}

export async function GET(request: NextRequest) {
  try {
    const userEmail = await getUserEmailFromToken(request);
    if (!userEmail) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data, error } = await getAppSupabase()
      .from("parser_engine_settings")
      .select("parser_type,config,schema_version,updated_at")
      .eq("user_email", userEmail);
    assertSupabaseResult(error, "Failed to load document engine settings");

    const rows = (data || []) as DocumentEngineSettingsRow[];
    const rowsByEngine = new Map(rows.map((row) => [row.parser_type, row]));
    const settings = DOCUMENT_ENGINE_TYPES.map((engineType) => {
      const row = rowsByEngine.get(engineType);
      return {
        engineType,
        engineId: getDocumentEngine(engineType).id,
        config: normalizeDocumentEngineConfig(engineType, row?.config),
        schemaVersion: row?.schema_version || DOCUMENT_ENGINE_SETTINGS_SCHEMA_VERSION,
        persisted: Boolean(row),
        updatedAt: row?.updated_at || null,
      };
    });

    return NextResponse.json({ settings });
  } catch (error) {
    console.error("[API /document-engine-settings GET] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load document engine settings" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const userEmail = await getUserEmailFromToken(request);
    if (!userEmail) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const engineType = validateDocumentEngineType(body?.engineType) as DocumentEngineType;
    const config = normalizeDocumentEngineConfig(engineType, body?.config);
    const row = {
      user_email: userEmail,
      parser_type: engineType,
      config,
      schema_version: DOCUMENT_ENGINE_SETTINGS_SCHEMA_VERSION,
    };

    const { data, error } = await getAppSupabase()
      .from("parser_engine_settings")
      .upsert(row, { onConflict: "user_email,parser_type" })
      .select("parser_type,config,schema_version,updated_at")
      .single();
    assertSupabaseResult(error, "Failed to save document engine settings");

    const saved = data as DocumentEngineSettingsRow;
    return NextResponse.json({
      setting: {
        engineType,
        engineId: getDocumentEngine(engineType).id,
        config: normalizeDocumentEngineConfig(engineType, saved.config),
        schemaVersion: saved.schema_version,
        persisted: true,
        updatedAt: saved.updated_at,
      },
    });
  } catch (error) {
    const status = error instanceof ValidationError ? 400 : 500;
    console.error("[API /document-engine-settings POST] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save document engine settings" },
      { status }
    );
  }
}
