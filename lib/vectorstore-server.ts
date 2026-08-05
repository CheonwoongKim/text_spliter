import "server-only";

import { assertSupabaseResult, getAppSupabase } from "@/lib/supabase-server";
import { normalizeVectorCollectionName } from "@/lib/vectorstore";

export interface ManagedVectorCollection {
  id: string;
  owner_id: string;
  name: string;
  embedding_model: string;
  vector_dimension: number;
  created_at: string;
  updated_at: string;
}

export class VectorStoreRequestError extends Error {
  constructor(message: string, public readonly status = 400) {
    super(message);
    this.name = "VectorStoreRequestError";
  }
}

export async function getOwnedVectorCollection(
  ownerId: string,
  collectionName: unknown
): Promise<ManagedVectorCollection> {
  let name: string;
  try {
    name = normalizeVectorCollectionName(collectionName);
  } catch (error) {
    throw new VectorStoreRequestError(error instanceof Error ? error.message : "Invalid collection name.");
  }

  const { data, error } = await getAppSupabase()
    .from("vector_collections")
    .select("id,owner_id,name,embedding_model,vector_dimension,created_at,updated_at")
    .eq("owner_id", ownerId)
    .eq("name", name)
    .maybeSingle();
  assertSupabaseResult(error, "Failed to load vector collection");
  if (!data) throw new VectorStoreRequestError("Vector collection not found.", 404);
  return data as ManagedVectorCollection;
}

export function vectorStoreErrorResponse(error: unknown): {
  status: number;
  body: { error: string; details?: string };
} {
  if (error instanceof VectorStoreRequestError) {
    return { status: error.status, body: { error: error.message } };
  }
  return {
    status: 500,
    body: {
      error: "Vector Store request failed.",
      details: error instanceof Error ? error.message : "Unknown error",
    },
  };
}
