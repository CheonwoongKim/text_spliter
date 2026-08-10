import { NextRequest, NextResponse } from "next/server";

import { getUserFromToken } from "@/lib/auth-server";
import { assertSupabaseResult, getAppSupabase } from "@/lib/supabase-server";
import { MANAGED_VECTOR_SCHEMA } from "@/lib/vectorstore";

interface CollectionSummaryRow {
  name: string;
  embedding_model: string;
  vector_dimension: number;
  row_count: number | string;
}

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromToken(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data, error } = await getAppSupabase().rpc("list_vector_collections", {
      p_owner_id: user.id,
    });
    assertSupabaseResult(error, "Failed to load vector collections");

    const tables = ((data || []) as CollectionSummaryRow[]).map((collection) => ({
      name: collection.name,
      schema: MANAGED_VECTOR_SCHEMA,
      rowCount: Number(collection.row_count) || 0,
      embeddingModel: collection.embedding_model,
      vectorDimension: collection.vector_dimension,
      columns: [
        { name: "id", type: "bigint", nullable: false, isPrimaryKey: true },
        { name: "content", type: "text", nullable: false },
        { name: "metadata", type: "jsonb", nullable: false },
        { name: "embedding", type: `vector(${collection.vector_dimension})`, nullable: false },
        { name: "created_at", type: "timestamptz", nullable: false },
      ],
    }));

    return NextResponse.json([{ name: MANAGED_VECTOR_SCHEMA, tables }]);
  } catch (error) {
    return NextResponse.json({
      error: "Failed to load managed vector collections.",
      details: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
}
