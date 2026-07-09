import { del } from '@vercel/blob';
import type { VercelRequest, VercelResponse } from '@vercel/node';

// Deletes a working paper file from the Vercel Blob store.
// Only signed-in Firebase users may delete, and only blob URLs are accepted.

// Public Firebase web API key (same one shipped to browsers in firebase.ts).
const FIREBASE_API_KEY = 'AIzaSyAorD9R4FiSq6M1MeJwFukkO3Leu7q6F7o';

// Finds the Blob read-write token even when the store was connected with a
// custom environment-variable prefix (e.g. AUDOCFILES_READ_WRITE_TOKEN).
function resolveBlobToken(): string | undefined {
  if (process.env.BLOB_READ_WRITE_TOKEN) return process.env.BLOB_READ_WRITE_TOKEN;
  const key = Object.keys(process.env).find(
    (k) => k.endsWith('_READ_WRITE_TOKEN') && process.env[k]?.startsWith('vercel_blob')
  );
  return key ? process.env[key] : undefined;
}

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

  try {
    const { url, idToken } = (req.body ?? {}) as { url?: string; idToken?: string };
    await verifyFirebaseToken(idToken);

    if (!url || !/^https:\/\/[^/]+\.blob\.vercel-storage\.com\//.test(url)) {
      return res.status(400).json({ error: 'Invalid blob URL.' });
    }

    await del(url, { token: resolveBlobToken() });
    return res.status(200).json({ ok: true });
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message });
  }
}
