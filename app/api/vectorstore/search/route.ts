import { NextRequest, NextResponse } from "next/server";

import { getUserFromToken } from "@/lib/auth-server";
import {
  assertManagedVectorSchema,
  MANAGED_VECTOR_DIMENSIONS,
  MANAGED_VECTOR_SCHEMA,
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
    const body = await request.json() as {
      schema?: unknown;
      tableName?: unknown;
      vectorDimension?: unknown;
    };
    try {
      assertManagedVectorSchema(body.schema ?? MANAGED_VECTOR_SCHEMA);
    } catch (error) {
      throw new VectorStoreRequestError(error instanceof Error ? error.message : "Invalid vector schema.");
    }
    const collection = await getOwnedVectorCollection(user.id, body.tableName);
    if ((body.vectorDimension ?? MANAGED_VECTOR_DIMENSIONS) !== collection.vector_dimension) {
      throw new VectorStoreRequestError("Embedding dimensions do not match this collection.", 409);
    }

    return NextResponse.json({
      success: true,
      schema: MANAGED_VECTOR_SCHEMA,
      tableName: collection.name,
      vectorDimension: collection.vector_dimension,
      functionName: "match_vector_documents",
      message: "Managed vector search is ready.",
    });
  } catch (error) {
    const response = vectorStoreErrorResponse(error);
    return NextResponse.json(response.body, { status: response.status });
  }
}
