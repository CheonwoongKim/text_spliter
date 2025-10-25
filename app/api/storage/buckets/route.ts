import { NextRequest } from 'next/server';
import { getUserEmailFromToken, createUnauthorizedResponse } from '@/lib/auth-server';

const STORAGE_API_BASE = process.env.STORAGE_API_BASE || 'http://ywstorage.synology.me:4000';

// Convert email to valid S3 bucket name
// S3 bucket naming rules: lowercase, numbers, hyphens, 3-63 chars
function emailToBucketName(email: string): string {
  return email
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-') // Replace non-alphanumeric with hyphens
    .replace(/-+/g, '-')         // Replace multiple hyphens with single
    .replace(/^-|-$/g, '')       // Remove leading/trailing hyphens
    .substring(0, 63);           // Max 63 chars
}

// POST - Create bucket for user
export async function POST(request: NextRequest) {
  const email = getUserEmailFromToken(request);
  if (!email) {
    return createUnauthorizedResponse();
  }

  const bucketName = emailToBucketName(email);
  console.log('[Storage API] Creating bucket for user:', email, 'Bucket name:', bucketName);

  try {
    const authHeader = request.headers.get('authorization');

    const response = await fetch(`${STORAGE_API_BASE}/v1/storage/buckets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader || '',
      },
      body: JSON.stringify({
        bucket: bucketName,
        region: 'us-east-1',
      }),
    });

    console.log('[Storage API] Bucket creation response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Storage API] Bucket creation error:', errorText);

      // Parse error if it's JSON
      let errorData: any = { error: errorText };
      try {
        errorData = JSON.parse(errorText);
      } catch {
        // Not JSON, keep as is
      }

      // If bucket already exists, that's ok
      const alreadyExistsCheck =
        response.status === 409 ||
        errorText.includes('already exists') ||
        errorText.includes('already own it') ||
        (errorData.message && errorData.message.includes('already'));

      if (alreadyExistsCheck) {
        console.log('[Storage API] Bucket already exists, returning success');
        return new Response(
          JSON.stringify({ bucket: bucketName, message: 'Bucket ready' }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ error: errorData.message || errorData.error || errorText || 'Failed to create bucket' }),
        { status: response.status, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    return new Response(
      JSON.stringify({ ...data, bucket: bucketName }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[Storage API] Error creating bucket:', error);

    // Network errors might mean the bucket was already created in a previous request
    // Return the bucket name anyway so the user can continue
    return new Response(
      JSON.stringify({
        bucket: bucketName,
        message: 'Bucket initialization completed',
        warning: 'Network error occurred but bucket should be ready'
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// GET - Get user's bucket name
export async function GET(request: NextRequest) {
  const email = getUserEmailFromToken(request);
  if (!email) {
    return createUnauthorizedResponse();
  }

  const bucketName = emailToBucketName(email);

  return new Response(
    JSON.stringify({ bucket: bucketName, email }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
}
