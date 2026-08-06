import { NextRequest, NextResponse } from "next/server";
import { getUserEmailFromToken } from "@/lib/auth-server";
import { PARSER_TYPES } from "@/lib/constants";
import {
  normalizeParserEngineConfig,
  PARSER_SETTINGS_SCHEMA_VERSION,
} from "@/lib/parser-engine-settings";
import { assertSupabaseResult, getAppSupabase } from "@/lib/supabase-server";
import type { ParserType } from "@/lib/types";
import { ValidationError, validateParserType } from "@/lib/validation";

interface ParserSettingsRow {
  parser_type: ParserType;
  config: unknown;
  schema_version: number;
  updated_at: string;
}

export async function GET(request: NextRequest) {
  try {
    const userEmail = await getUserEmailFromToken(request);
    if (!userEmail) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await getAppSupabase()
      .from("parser_engine_settings")
      .select("parser_type,config,schema_version,updated_at")
      .eq("user_email", userEmail);
    assertSupabaseResult(error, "Failed to load parser engine settings");

    const rows = (data || []) as ParserSettingsRow[];
    const rowsByParser = new Map(rows.map((row) => [row.parser_type, row]));
    const settings = PARSER_TYPES.map((parserType) => {
      const row = rowsByParser.get(parserType);
      return {
        parserType,
        config: normalizeParserEngineConfig(parserType, row?.config),
        schemaVersion: row?.schema_version || PARSER_SETTINGS_SCHEMA_VERSION,
        persisted: Boolean(row),
        updatedAt: row?.updated_at || null,
      };
    });

    return NextResponse.json({ settings });
  } catch (error) {
    console.error("[API /parser-settings GET] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load parser settings" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const userEmail = await getUserEmailFromToken(request);
    if (!userEmail) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parserType = validateParserType(body?.parserType) as ParserType;
    const config = normalizeParserEngineConfig(parserType, body?.config);
    const row = {
      user_email: userEmail,
      parser_type: parserType,
      config,
      schema_version: PARSER_SETTINGS_SCHEMA_VERSION,
    };

    const { data, error } = await getAppSupabase()
      .from("parser_engine_settings")
      .upsert(row, { onConflict: "user_email,parser_type" })
      .select("parser_type,config,schema_version,updated_at")
      .single();
    assertSupabaseResult(error, "Failed to save parser engine settings");

    const saved = data as ParserSettingsRow;
    return NextResponse.json({
      setting: {
        parserType,
        config: normalizeParserEngineConfig(parserType, saved.config),
        schemaVersion: saved.schema_version,
        persisted: true,
        updatedAt: saved.updated_at,
      },
    });
  } catch (error) {
    const status = error instanceof ValidationError ? 400 : 500;
    console.error("[API /parser-settings POST] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save parser settings" },
      { status }
    );
  }
}
