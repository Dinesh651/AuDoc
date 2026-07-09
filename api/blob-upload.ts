import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyFirebaseToken } from './_auth';

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
