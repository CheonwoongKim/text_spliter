import { NextRequest, NextResponse } from 'next/server';
import { getUserEmailFromToken } from '@/lib/auth-server';
import { query } from '@/lib/db';
import { createClient } from '@supabase/supabase-js';

interface ApiKey {
  key_name: string;
  encrypted_key: string;
}

// POST - Create a new table in Supabase
export async function POST(request: NextRequest) {
  try {
    const userEmail = getUserEmailFromToken(request);
    if (!userEmail) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { tableName, vectorDimension = 1536 } = body as {
      tableName: string;
      vectorDimension?: number;
    };

    if (!tableName) {
      return NextResponse.json(
        { error: 'Table name is required' },
        { status: 400 }
      );
    }

    // Validate table name (alphanumeric and underscores only)
    if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(tableName)) {
      return NextResponse.json(
        { error: 'Invalid table name. Must start with a letter and contain only letters, numbers, and underscores.' },
        { status: 400 }
      );
    }

    // Get Supabase credentials from database
    const dbKeys = await query<ApiKey[]>(
      'SELECT key_name, encrypted_key FROM user_api_keys WHERE user_email = ? AND (key_name = ? OR key_name = ?)',
      [userEmail, 'supabaseUrl', 'supabaseKey']
    );

    if (dbKeys.length < 2) {
      return NextResponse.json(
        { error: 'Supabase credentials not configured. Please set up in Connect page.' },
        { status: 400 }
      );
    }

    const { decrypt } = await import('@/lib/encryption');
    const supabaseUrl = decrypt(dbKeys.find(k => k.key_name === 'supabaseUrl')!.encrypted_key);
    const supabaseKey = decrypt(dbKeys.find(k => k.key_name === 'supabaseKey')!.encrypted_key);

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Create table with pgvector support
    // Note: Supabase JS client doesn't support DDL directly, so we use RPC or raw SQL
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: `
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
      `
    });

    if (error) {
      // If RPC doesn't exist, try direct query
      const { error: sqlError } = await supabase.from(tableName).select('*').limit(0);

      if (sqlError && sqlError.message.includes('does not exist')) {
        // Table doesn't exist, we need to create it via SQL
        // Since Supabase JS doesn't support DDL, return instructions
        return NextResponse.json(
          {
            error: 'Direct table creation is not supported via API. Please use Supabase SQL Editor.',
            instructions: `
              1. Go to Supabase Dashboard > SQL Editor
              2. Run this SQL:

              CREATE EXTENSION IF NOT EXISTS vector;

              CREATE TABLE ${tableName} (
                id BIGSERIAL PRIMARY KEY,
                content TEXT NOT NULL,
                embedding vector(${vectorDimension}),
                metadata JSONB,
                created_at TIMESTAMPTZ DEFAULT NOW()
              );

              CREATE INDEX ${tableName}_embedding_idx
              ON ${tableName}
              USING ivfflat (embedding vector_cosine_ops)
              WITH (lists = 100);
            `
          },
          { status: 400 }
        );
      }
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
    const userEmail = getUserEmailFromToken(request);
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

    // Get Supabase credentials from database
    const dbKeys = await query<ApiKey[]>(
      'SELECT key_name, encrypted_key FROM user_api_keys WHERE user_email = ? AND (key_name = ? OR key_name = ?)',
      [userEmail, 'supabaseUrl', 'supabaseKey']
    );

    if (dbKeys.length < 2) {
      return NextResponse.json(
        { error: 'Supabase credentials not configured. Please set up in Connect page.' },
        { status: 400 }
      );
    }

    const { decrypt } = await import('@/lib/encryption');
    const supabaseUrl = decrypt(dbKeys.find(k => k.key_name === 'supabaseUrl')!.encrypted_key);
    const supabaseKey = decrypt(dbKeys.find(k => k.key_name === 'supabaseKey')!.encrypted_key);

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
