import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import type { VercelRequest, VercelResponse } from '@vercel/node';

// Issues short-lived client upload tokens for working paper files.
// Requires the BLOB_READ_WRITE_TOKEN env var (added automatically when a
// Vercel Blob store is connected to the project — see STORAGE.md).

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB, matches the app-side limit

const ALLOWED_CONTENT_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/zip',
  'application/x-zip-compressed',
  'application/octet-stream',
  'image/*',
  'text/csv',
];

// Public Firebase web API key (same one shipped to browsers in firebase.ts).
const FIREBASE_API_KEY = 'AIzaSyAorD9R4FiSq6M1MeJwFukkO3Leu7q6F7o';

// Verifies a Firebase Authentication ID token via the Identity Toolkit REST
// API — inlined here because Vercel's ESM function runtime does not resolve
// extensionless relative imports.
async function verifyFirebaseToken(idToken: string | undefined): Promise<{ uid: string }> {
  if (!idToken) throw new Error('Not signed in: missing Firebase ID token.');
  const resp = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    }
  );
  if (!resp.ok) throw new Error('Invalid or expired sign-in token. Please sign in again.');
  const data: any = await resp.json();
  const user = data?.users?.[0];
  if (!user?.localId) throw new Error('Invalid sign-in token. Please sign in again.');
  return { uid: user.localId };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return res.status(500).json({
      error: 'Blob storage is not configured. Connect a Vercel Blob store to this project (see STORAGE.md).',
    });
  }

  const body = req.body as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const payload = clientPayload ? JSON.parse(clientPayload) : {};
        const user = await verifyFirebaseToken(payload.idToken);

        if (!pathname.startsWith('engagements/')) {
          throw new Error('Invalid upload path.');
        }

        return {
          allowedContentTypes: ALLOWED_CONTENT_TYPES,
          maximumSizeInBytes: MAX_FILE_SIZE,
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({ uid: user.uid }),
        };
      },
      onUploadCompleted: async () => {
        // Metadata is written to the Realtime Database by the client after
        // upload; nothing to do server-side.
      },
    });

    return res.status(200).json(jsonResponse);
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message });
  }
}
