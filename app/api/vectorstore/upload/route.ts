import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import { getUserEmailFromToken } from '@/lib/auth-server';
import { createClient } from '@supabase/supabase-js';
import { getDecryptedApiKeyMap } from '@/lib/api-key-store';
import { assertSupabaseResult, getAppSupabase } from '@/lib/supabase-server';
import {
  DEFAULT_EMBEDDING_DIMENSIONS,
  DEFAULT_EMBEDDING_MODEL,
} from '@/lib/constants';
import { createEmbeddings } from '@/lib/openai-server';
import { assertSafeDatabaseIdentifier } from '@/lib/vectorstore-server';

interface SplitResult {
  id: number;
  user_email: string;
  parse_run_id: string | null;
  document_hash: string | null;
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
    const userEmail = await getUserEmailFromToken(request);
    if (!userEmail) {
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

    try {
      assertSafeDatabaseIdentifier(tableName, 'Table name');
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Invalid table name' },
        { status: 400 }
      );
    }
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
      .eq('user_email', userEmail)
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

    // Get API keys from database
    const keys = await getDecryptedApiKeyMap(
      userEmail,
      ['supabaseUrl', 'supabaseKey', 'openaiEmbedding']
    );

    if (!keys.supabaseUrl || !keys.supabaseKey || !keys.openaiEmbedding) {
      return NextResponse.json(
        { error: 'Supabase and OpenAI credentials not configured. Please set up in Connect page.' },
        { status: 400 }
      );
    }

    const supabaseUrl = keys.supabaseUrl;
    const supabaseKey = keys.supabaseKey;
    const openaiKey = keys.openaiEmbedding;

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Generate embeddings for all chunks
    const embeddedChunks: Array<{
      content: string;
      embedding: number[];
      metadata: any;
    }> = [];
    const embeddingUsage = { prompt_tokens: 0, total_tokens: 0 };

    console.log(`Generating embeddings for ${chunks.length} chunks...`);

    // Process chunks in batches to avoid rate limits
    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);

      const contents = batch.map((chunk) =>
        typeof chunk === 'string'
          ? chunk
          : chunk.pageContent || chunk.text || JSON.stringify(chunk)
      );
      const result = await createEmbeddings({
        apiKey: openaiKey,
        inputs: contents,
        model: DEFAULT_EMBEDDING_MODEL,
        dimensions: DEFAULT_EMBEDDING_DIMENSIONS,
      });
      embeddingUsage.prompt_tokens += result.usage.prompt_tokens || 0;
      embeddingUsage.total_tokens += result.usage.total_tokens || 0;

      const batchEmbeddings = batch.map((chunk, batchIndex) => {
        const content = contents[batchIndex];
        const chunkIndex = i + batchIndex;
        const chunkMetadata = typeof chunk === 'object' && chunk.metadata
          ? chunk.metadata
          : {};

        return {
          content,
          embedding: result.embeddings[batchIndex],
          metadata: {
            ...chunkMetadata,
            source: `split_result_${splitResultId}`,
            split_result_id: splitResultId,
            parse_run_id: splitResult.parse_run_id,
            document_hash: splitResult.document_hash,
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

      embeddedChunks.push(...batchEmbeddings);

      console.log(`Processed batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(chunks.length / batchSize)}`);
    }

    // Insert into Supabase
    const { error } = await supabase
      .from(tableName)
      .insert(embeddedChunks);

    if (error) {
      console.error('Supabase insert error:', error);
      return NextResponse.json(
        {
          error: 'Failed to insert into Supabase',
          details: error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Successfully uploaded ${embeddedChunks.length} chunks to table '${tableName}'`,
      chunksUploaded: embeddedChunks.length,
      tableName,
      embedding: {
        provider: 'openai',
        model: DEFAULT_EMBEDDING_MODEL,
        resolvedModel: embeddedChunks[0]?.metadata.embedding_model || DEFAULT_EMBEDDING_MODEL,
        dimensions: DEFAULT_EMBEDDING_DIMENSIONS,
        usage: embeddingUsage,
      },
    });
  } catch (error) {
    console.error('Error uploading to vector database:', error);
    return NextResponse.json(
      {
        error: 'Failed to upload to vector database',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
