import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import { getUserFromToken } from '@/lib/auth-server';
import { getDecryptedApiKeyMap } from '@/lib/api-key-store';
import { assertSupabaseResult, getAppSupabase } from '@/lib/supabase-server';
import {
  DEFAULT_EMBEDDING_DIMENSIONS,
  DEFAULT_EMBEDDING_MODEL,
} from '@/lib/constants';
import { createEmbeddings } from '@/lib/openai-server';
import { normalizeVectorChunk } from '@/lib/vectorstore';
import {
  getOwnedVectorCollection,
  vectorStoreErrorResponse,
} from '@/lib/vectorstore-server';

interface SplitResult {
  id: number;
  user_email: string;
  parse_run_id: string | null;
  document_hash: string | null;
  source_metadata: Record<string, unknown> | null;
  splitter_type: string;
  original_text: string;
  chunk_size: number | null;
  chunk_overlap: number | null;
  chunks: any[];
  chunk_count: number;
  created_at: string;
}

// POST - Upload split results to Supabase vector database
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromToken(request);
    if (!user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { splitResultId, tableName, batchSize = 10 } = body as {
      splitResultId: number;
      tableName: string;
      batchSize?: number;
    };

    if (!splitResultId || !tableName) {
      return NextResponse.json(
        { error: 'Split result ID and table name are required' },
        { status: 400 }
      );
    }

    const collection = await getOwnedVectorCollection(user.id, tableName);
    if (!Number.isInteger(batchSize) || batchSize < 1 || batchSize > 100) {
      return NextResponse.json(
        { error: 'Batch size must be an integer between 1 and 100' },
        { status: 400 }
      );
    }

    // Get split result from database
    const { data: splitResultData, error: splitResultError } = await getAppSupabase()
      .from('split_results')
      .select('*')
      .eq('id', splitResultId)
      .eq('user_email', user.email)
      .maybeSingle();
    assertSupabaseResult(splitResultError, 'Failed to load split result');

    if (!splitResultData) {
      return NextResponse.json(
        { error: 'Split result not found' },
        { status: 404 }
      );
    }

    const splitResult = splitResultData as SplitResult;
    const chunks = typeof splitResult.chunks === 'string'
      ? JSON.parse(splitResult.chunks)
      : splitResult.chunks;

    if (!Array.isArray(chunks) || chunks.length === 0) {
      return NextResponse.json(
        { error: 'No chunks found in split result' },
        { status: 400 }
      );
    }

    let normalizedChunks: ReturnType<typeof normalizeVectorChunk>[];
    try {
      normalizedChunks = chunks.map(normalizeVectorChunk);
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Invalid chunk data.' },
        { status: 400 }
      );
    }

    const keys = await getDecryptedApiKeyMap(user.email, ['openaiEmbedding']);
    const openaiKey = keys.openaiEmbedding || process.env.OPENAI_API_KEY;

    if (!openaiKey) {
      return NextResponse.json(
        { error: 'OpenAI credentials are not configured. Please set up the AI Models tab in Connect.' },
        { status: 400 }
      );
    }

    const embeddingUsage = { prompt_tokens: 0, total_tokens: 0 };
    let chunksUploaded = 0;
    let resolvedEmbeddingModel = DEFAULT_EMBEDDING_MODEL;

    console.log(`Generating embeddings for ${normalizedChunks.length} chunks...`);

    // Process chunks in batches to avoid rate limits
    for (let i = 0; i < normalizedChunks.length; i += batchSize) {
      const batch = normalizedChunks.slice(i, i + batchSize);
      const contents = batch.map((chunk) => chunk.content);
      const result = await createEmbeddings({
        apiKey: openaiKey,
        inputs: contents,
        model: DEFAULT_EMBEDDING_MODEL,
        dimensions: DEFAULT_EMBEDDING_DIMENSIONS,
      });
      if (result.embeddings.length !== batch.length) {
        throw new Error('The embedding provider returned an incomplete batch.');
      }
      embeddingUsage.prompt_tokens += result.usage.prompt_tokens || 0;
      embeddingUsage.total_tokens += result.usage.total_tokens || 0;
      resolvedEmbeddingModel = result.model;

      const embeddedBatch = batch.map((chunk, batchIndex) => {
        const { content, metadata: chunkMetadata } = chunk;
        const chunkIndex = i + batchIndex;
        const embeddedSource = chunkMetadata.source !== null &&
          typeof chunkMetadata.source === 'object' &&
          !Array.isArray(chunkMetadata.source)
          ? chunkMetadata.source as Record<string, unknown>
          : {};
        const sourceMetadata = splitResult.source_metadata || embeddedSource;
        const sourceFileName = typeof sourceMetadata.fileName === 'string'
          ? sourceMetadata.fileName
          : null;
        const documentType = sourceFileName?.includes('.')
          ? sourceFileName.split('.').pop()?.toLowerCase() || null
          : null;

        return {
          owner_id: user.id,
          collection_id: collection.id,
          source_split_result_id: splitResultId,
          chunk_index: chunkIndex,
          chunk_key: `${splitResultId}:${chunkIndex}`,
          content,
          content_hash: createHash('sha256').update(content).digest('hex'),
          embedding: result.embeddings[batchIndex],
          metadata: {
            ...chunkMetadata,
            source: `split_result_${splitResultId}`,
            source_metadata: sourceMetadata,
            split_result_id: splitResultId,
            parse_run_id: splitResult.parse_run_id || sourceMetadata.parseRunId || null,
            document_hash: splitResult.document_hash || sourceMetadata.documentHash || null,
            parser_type: sourceMetadata.parserType || null,
            engine_id: sourceMetadata.engineId || null,
            document_type: documentType,
            splitter_type: splitResult.splitter_type,
            chunk_size: splitResult.chunk_size,
            chunk_overlap: splitResult.chunk_overlap,
            chunk_index: chunkIndex,
            chunk_key: `${splitResultId}:${chunkIndex}`,
            content_hash: createHash('sha256').update(content).digest('hex'),
            embedding_provider: 'openai',
            embedding_model: result.model,
            embedding_dimensions: DEFAULT_EMBEDDING_DIMENSIONS,
            embedded_at: new Date().toISOString(),
          },
        };
      });

      const { error: upsertError } = await getAppSupabase()
        .from('vector_documents')
        .upsert(embeddedBatch, { onConflict: 'collection_id,chunk_key' });
      assertSupabaseResult(upsertError, 'Failed to store vector documents');
      chunksUploaded += embeddedBatch.length;

      console.log(`Processed batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(normalizedChunks.length / batchSize)}`);
    }

    return NextResponse.json({
      success: true,
      message: `Successfully uploaded ${chunksUploaded} chunks to collection '${collection.name}'`,
      chunksUploaded,
      tableName: collection.name,
      embedding: {
        provider: 'openai',
        model: DEFAULT_EMBEDDING_MODEL,
        resolvedModel: resolvedEmbeddingModel,
        dimensions: DEFAULT_EMBEDDING_DIMENSIONS,
        usage: embeddingUsage,
      },
    });
  } catch (error) {
    console.error('Error uploading to vector database:', error);
    const response = vectorStoreErrorResponse(error);
    if (response.status !== 500) {
      return NextResponse.json(response.body, { status: response.status });
    }
    return NextResponse.json(
      {
        error: 'Failed to upload to vector database',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
