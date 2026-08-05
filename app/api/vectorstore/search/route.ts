import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { getDecryptedApiKeyMap } from "@/lib/api-key-store";
import { getUserEmailFromToken } from "@/lib/auth-server";
import { DEFAULT_EMBEDDING_DIMENSIONS } from "@/lib/constants";
import {
  assertSafeDatabaseIdentifier,
  ragMatchFunctionName,
  vectorSearchSetupSql,
} from "@/lib/vectorstore-server";

export async function POST(request: NextRequest) {
  try {
    const userEmail = await getUserEmailFromToken(request);
    if (!userEmail) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as {
      schema?: string;
      tableName?: string;
      vectorDimension?: number;
    };
    const schemaName = body.schema || "public";
    const tableName = body.tableName?.trim() || "";
    const vectorDimension = body.vectorDimension ?? DEFAULT_EMBEDDING_DIMENSIONS;

    assertSafeDatabaseIdentifier(schemaName, "Schema name");
    assertSafeDatabaseIdentifier(tableName, "Table name");
    if (schemaName !== "public") {
      return NextResponse.json(
        { error: "RAG search setup currently supports the public schema only." },
        { status: 400 }
      );
    }

    const keys = await getDecryptedApiKeyMap(userEmail, ["supabaseUrl", "supabaseKey"]);
    if (!keys.supabaseUrl || !keys.supabaseKey) {
      return NextResponse.json(
        { error: "Supabase credentials are not configured in Connect." },
        { status: 400 }
      );
    }

    const sql = vectorSearchSetupSql({ schemaName, tableName, vectorDimension });
    const target = createClient(keys.supabaseUrl, keys.supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error } = await target.rpc("exec_sql", { sql });

    if (error) {
      return NextResponse.json(
        {
          error: "Search setup requires the exec_sql RPC or a manual SQL run.",
          details: error.message,
          instructions: sql.trim(),
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      schema: schemaName,
      tableName,
      vectorDimension,
      functionName: ragMatchFunctionName(tableName),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to configure vector search.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
