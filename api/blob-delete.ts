import { del } from '@vercel/blob';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyFirebaseToken } from './_auth';

// Deletes a working paper file from the Vercel Blob store.
// Only signed-in Firebase users may delete, and only blob URLs are accepted.

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

    await del(url);
    return res.status(200).json({ ok: true });
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message });
  }
}
