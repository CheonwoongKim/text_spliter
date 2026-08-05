import { NextRequest, NextResponse } from 'next/server';
import { getUserEmailFromToken } from '@/lib/auth-server';
import { createClient } from '@supabase/supabase-js';
import { getDecryptedApiKeyMap } from '@/lib/api-key-store';
import { DEFAULT_EMBEDDING_DIMENSIONS } from '@/lib/constants';
import {
  assertSafeDatabaseIdentifier,
  vectorSearchSetupSql,
} from '@/lib/vectorstore-server';

// POST - Create a new table in Supabase
export async function POST(request: NextRequest) {
  try {
    const userEmail = await getUserEmailFromToken(request);
    if (!userEmail) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { tableName, vectorDimension = DEFAULT_EMBEDDING_DIMENSIONS } = body as {
      tableName: string;
      vectorDimension?: number;
    };

    if (!tableName) {
      return NextResponse.json(
        { error: 'Table name is required' },
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

    if (!Number.isInteger(vectorDimension) || vectorDimension < 1 || vectorDimension > 4096) {
      return NextResponse.json(
        { error: 'Vector dimension must be an integer between 1 and 4096.' },
        { status: 400 }
      );
    }

    // Get Supabase credentials from database
    const keys = await getDecryptedApiKeyMap(userEmail, ['supabaseUrl', 'supabaseKey']);

    if (!keys.supabaseUrl || !keys.supabaseKey) {
      return NextResponse.json(
        { error: 'Supabase credentials not configured. Please set up in Connect page.' },
        { status: 400 }
      );
    }

    const supabaseUrl = keys.supabaseUrl;
    const supabaseKey = keys.supabaseKey;

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Create table with pgvector support
    // Note: Supabase JS client doesn't support DDL directly, so we use RPC or raw SQL
    const setupSql = `
        -- Enable pgvector extension if not already enabled
        CREATE EXTENSION IF NOT EXISTS vector;

        -- Create table
        CREATE TABLE IF NOT EXISTS ${tableName} (
          id BIGSERIAL PRIMARY KEY,
          content TEXT NOT NULL,
          embedding vector(${vectorDimension}),
          metadata JSONB,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );

        -- Create index for vector similarity search
        CREATE INDEX IF NOT EXISTS ${tableName}_embedding_idx
        ON ${tableName}
        USING ivfflat (embedding vector_cosine_ops)
        WITH (lists = 100);
        ${vectorSearchSetupSql({
          schemaName: 'public',
          tableName,
          vectorDimension,
        })}
      `;
    const { error } = await supabase.rpc('exec_sql', {
      sql: setupSql,
    });

    if (error) {
      return NextResponse.json(
        {
          error: 'Table creation requires the exec_sql RPC or a manual SQL run.',
          details: error.message,
          instructions: setupSql.trim(),
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Table '${tableName}' created successfully`,
      tableName,
      vectorDimension
    });
  } catch (error) {
    console.error('Error creating table:', error);
    return NextResponse.json(
      {
        error: 'Failed to create table',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// DELETE - Drop a table from Supabase
export async function DELETE(request: NextRequest) {
  try {
    const userEmail = await getUserEmailFromToken(request);
    if (!userEmail) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const tableName = searchParams.get('tableName');

    if (!tableName) {
      return NextResponse.json(
        { error: 'Table name is required' },
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

    // Get Supabase credentials from database
    const keys = await getDecryptedApiKeyMap(userEmail, ['supabaseUrl', 'supabaseKey']);

    if (!keys.supabaseUrl || !keys.supabaseKey) {
      return NextResponse.json(
        { error: 'Supabase credentials not configured. Please set up in Connect page.' },
        { status: 400 }
      );
    }

    const supabaseUrl = keys.supabaseUrl;
    const supabaseKey = keys.supabaseKey;

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Drop table using RPC
    const { error } = await supabase.rpc('exec_sql', {
      sql: `DROP TABLE IF EXISTS ${tableName} CASCADE;`
    });

    if (error) {
      return NextResponse.json(
        {
          error: 'Direct table deletion is not supported via API. Please use Supabase SQL Editor.',
          instructions: `
            1. Go to Supabase Dashboard > SQL Editor
            2. Run this SQL: DROP TABLE IF EXISTS ${tableName} CASCADE;
          `
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Table '${tableName}' deleted successfully`
    });
  } catch (error) {
    console.error('Error deleting table:', error);
    return NextResponse.json(
      {
        error: 'Failed to delete table',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
