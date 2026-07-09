// Verifies a Firebase Authentication ID token using the Identity Toolkit REST API.
// Runs inside Vercel Functions — no Firebase Admin SDK needed.

// Public Firebase web API key (same one shipped to browsers in firebase.ts).
const FIREBASE_API_KEY = 'AIzaSyAorD9R4FiSq6M1MeJwFukkO3Leu7q6F7o';

export interface VerifiedUser {
  uid: string;
  email?: string;
}

export async function verifyFirebaseToken(idToken: string | undefined): Promise<VerifiedUser> {
  if (!idToken) {
    throw new Error('Not signed in: missing Firebase ID token.');
  }
  const resp = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    }
  );
  if (!resp.ok) {
    throw new Error('Invalid or expired sign-in token. Please sign in again.');
  }
  const data: any = await resp.json();
  const user = data?.users?.[0];
  if (!user?.localId) {
    throw new Error('Invalid sign-in token. Please sign in again.');
  }
  return { uid: user.localId, email: user.email };
}
