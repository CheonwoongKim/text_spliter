import { NextRequest, NextResponse } from 'next/server';
import { getUserEmailFromToken } from '@/lib/auth-server';
import { query } from '@/lib/db';
import { createClient } from '@supabase/supabase-js';

interface ApiKey {
  key_name: string;
  encrypted_key: string;
}

interface SplitResult {
  id: number;
  user_email: string;
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
    const userEmail = getUserEmailFromToken(request);
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

    // Get split result from database
    const splitResults = await query<SplitResult[]>(
      'SELECT * FROM split_results WHERE id = ? AND user_email = ?',
      [splitResultId, userEmail]
    );

    if (splitResults.length === 0) {
      return NextResponse.json(
        { error: 'Split result not found' },
        { status: 404 }
      );
    }

    const splitResult = splitResults[0];
    const chunks = JSON.parse(splitResult.chunks as any);

    if (!Array.isArray(chunks) || chunks.length === 0) {
      return NextResponse.json(
        { error: 'No chunks found in split result' },
        { status: 400 }
      );
    }

    // Get API keys from database
    const dbKeys = await query<ApiKey[]>(
      'SELECT key_name, encrypted_key FROM user_api_keys WHERE user_email = ? AND (key_name IN (?, ?, ?))',
      [userEmail, 'supabaseUrl', 'supabaseKey', 'openaiEmbedding']
    );

    if (dbKeys.length < 3) {
      return NextResponse.json(
        { error: 'Supabase and OpenAI credentials not configured. Please set up in Connect page.' },
        { status: 400 }
      );
    }

    const { decrypt } = await import('@/lib/encryption');
    const supabaseUrl = decrypt(dbKeys.find(k => k.key_name === 'supabaseUrl')!.encrypted_key);
    const supabaseKey = decrypt(dbKeys.find(k => k.key_name === 'supabaseKey')!.encrypted_key);
    const openaiKey = decrypt(dbKeys.find(k => k.key_name === 'openaiEmbedding')!.encrypted_key);

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Generate embeddings for all chunks
    const embeddedChunks: Array<{
      content: string;
      embedding: number[];
      metadata: any;
    }> = [];

    console.log(`Generating embeddings for ${chunks.length} chunks...`);

    // Process chunks in batches to avoid rate limits
    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);

      const batchEmbeddings = await Promise.all(
        batch.map(async (chunk) => {
          const content = typeof chunk === 'string' ? chunk : chunk.pageContent || chunk.text || JSON.stringify(chunk);

          // Generate embedding using OpenAI
          const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${openaiKey}`,
            },
            body: JSON.stringify({
              input: content,
              model: 'text-embedding-ada-002',
            }),
          });

          if (!embeddingResponse.ok) {
            const error = await embeddingResponse.json();
            throw new Error(`OpenAI API error: ${error.error?.message || 'Unknown error'}`);
          }

          const embeddingData = await embeddingResponse.json();
          const embedding = embeddingData.data[0].embedding;

          // Extract metadata
          const metadata = {
            source: `split_result_${splitResultId}`,
            splitter_type: splitResult.splitter_type,
            chunk_size: splitResult.chunk_size,
            chunk_overlap: splitResult.chunk_overlap,
            chunk_index: chunks.indexOf(chunk),
            ...(typeof chunk === 'object' && chunk.metadata ? chunk.metadata : {}),
          };

          return {
            content,
            embedding,
            metadata,
          };
        })
      );

      embeddedChunks.push(...batchEmbeddings);

      console.log(`Processed batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(chunks.length / batchSize)}`);
    }

    // Insert into Supabase
    const { data, error } = await supabase
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
