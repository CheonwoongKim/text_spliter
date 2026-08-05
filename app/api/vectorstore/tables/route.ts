import { NextRequest, NextResponse } from "next/server";

import { getUserFromToken } from "@/lib/auth-server";
import { assertSupabaseResult, getAppSupabase } from "@/lib/supabase-server";
import {
  MANAGED_VECTOR_DIMENSIONS,
  MANAGED_VECTOR_EMBEDDING_MODEL,
  MANAGED_VECTOR_SCHEMA,
  normalizeVectorCollectionName,
} from "@/lib/vectorstore";
import {
  getOwnedVectorCollection,
  vectorStoreErrorResponse,
  VectorStoreRequestError,
} from "@/lib/vectorstore-server";

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromToken(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = await request.json() as { tableName?: unknown; vectorDimension?: unknown };
    let name: string;
    try {
      name = normalizeVectorCollectionName(body.tableName);
    } catch (error) {
      throw new VectorStoreRequestError(error instanceof Error ? error.message : "Invalid collection name.");
    }
    const vectorDimension = body.vectorDimension ?? MANAGED_VECTOR_DIMENSIONS;
    if (vectorDimension !== MANAGED_VECTOR_DIMENSIONS) {
      throw new VectorStoreRequestError(
        `Managed Vector Store uses ${MANAGED_VECTOR_DIMENSIONS}-dimension embeddings.`
      );
    }

    const { data, error } = await getAppSupabase()
      .from("vector_collections")
      .insert({
        owner_id: user.id,
        name,
        embedding_model: MANAGED_VECTOR_EMBEDDING_MODEL,
        vector_dimension: MANAGED_VECTOR_DIMENSIONS,
      })
      .select("id,name,embedding_model,vector_dimension,created_at,updated_at")
      .single();
    if (error?.code === "23505") {
      throw new VectorStoreRequestError(`Collection '${name}' already exists.`, 409);
    }
    assertSupabaseResult(error, "Failed to create vector collection");

    return NextResponse.json({
      success: true,
      message: `Collection '${name}' created successfully`,
      schema: MANAGED_VECTOR_SCHEMA,
      tableName: name,
      vectorDimension: MANAGED_VECTOR_DIMENSIONS,
      collection: data,
    });
  } catch (error) {
    const response = vectorStoreErrorResponse(error);
    return NextResponse.json(response.body, { status: response.status });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getUserFromToken(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const tableName = new URL(request.url).searchParams.get("tableName");
    const collection = await getOwnedVectorCollection(user.id, tableName);
    const { error } = await getAppSupabase()
      .from("vector_collections")
      .delete()
      .eq("id", collection.id)
      .eq("owner_id", user.id);
    assertSupabaseResult(error, "Failed to delete vector collection");

    return NextResponse.json({
      success: true,
      message: `Collection '${collection.name}' deleted successfully`,
    });
  } catch (error) {
    const response = vectorStoreErrorResponse(error);
    return NextResponse.json(response.body, { status: response.status });
  }
}
