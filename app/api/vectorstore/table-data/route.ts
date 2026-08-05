import { NextRequest, NextResponse } from "next/server";

import { getUserFromToken } from "@/lib/auth-server";
import { assertSupabaseResult, getAppSupabase } from "@/lib/supabase-server";
import { assertManagedVectorSchema, vectorPageRange } from "@/lib/vectorstore";
import {
  getOwnedVectorCollection,
  vectorStoreErrorResponse,
  VectorStoreRequestError,
} from "@/lib/vectorstore-server";

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromToken(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const searchParams = new URL(request.url).searchParams;
    try {
      assertManagedVectorSchema(searchParams.get("schema"));
    } catch (error) {
      throw new VectorStoreRequestError(error instanceof Error ? error.message : "Invalid vector schema.");
    }
    const collection = await getOwnedVectorCollection(user.id, searchParams.get("table"));
    const page = vectorPageRange(searchParams.get("limit"), searchParams.get("offset"));
    const { data, error, count } = await getAppSupabase()
      .from("vector_documents")
      .select("id,content,metadata,created_at", { count: "exact" })
      .eq("owner_id", user.id)
      .eq("collection_id", collection.id)
      .order("created_at", { ascending: false })
      .range(page.from, page.to);
    assertSupabaseResult(error, "Failed to load vector documents");

    return NextResponse.json({
      rows: data || [],
      columns: [
        { name: "id", type: "bigint", nullable: false, isPrimaryKey: true },
        { name: "content", type: "text", nullable: false },
        { name: "metadata", type: "jsonb", nullable: false },
        { name: "created_at", type: "timestamptz", nullable: false },
      ],
      totalCount: count || 0,
    });
  } catch (error) {
    const response = vectorStoreErrorResponse(error);
    return NextResponse.json(response.body, { status: response.status });
  }
}
