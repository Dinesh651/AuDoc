# Securing the AuDoc Firebase Backend

The Firebase web config in `firebase.ts` (API key, project ID, etc.) is **public by design** — every Firebase web app ships it to the browser. The actual security boundary is the **Realtime Database rules** and **Storage rules**. If those are left open ("test mode"), anyone with the config can read or modify all engagement data.

This repo now contains recommended rules. They are **not deployed automatically** — apply them once in the Firebase Console:

## 1. Realtime Database rules

Copy the contents of [`database.rules.json`](database.rules.json) into:

> Firebase Console → Realtime Database → **Rules** → paste → Publish

What they enforce:

| Path | Access |
|---|---|
| `users/$uid` | Only that signed-in user (their profile + engagement list). |
| `engagements/$id` | Only the engagement owner, accepted team members (present in their own `users/$uid/engagements` tree), or users holding a pending invitation for that engagement (matched from their signed-in Google email). Anyone signed in may create a *new* engagement. |
| `invitations/*` | Any signed-in user (required for owners to invite by email before the invitee has ever logged in). |
| Everything else | Denied. |

Known tradeoff: the `invitations` node is writable by any signed-in user, because invites are keyed by the invitee's email before that person has an account. A malicious signed-in user could grant themselves an invitation **only if they know a valid engagement ID** (random push IDs, not guessable in practice). Eliminating this fully would require moving invitation writes to a Cloud Function.

## 2. Storage rules

> **Note:** new working paper uploads now use **Vercel Blob**, not Firebase Storage (the Spark-plan bucket ran out of quota) — see [STORAGE.md](STORAGE.md). Firebase Storage only serves files uploaded before that migration.

If legacy files remain in the Firebase bucket, copy the contents of [`storage.rules`](storage.rules) into:

> Firebase Console → Storage → **Rules** → paste → Publish

Working paper files under `engagements/{id}/workingPapers/**` are restricted to signed-in users with a 20 MB upload cap (matching the app-side limit). All other paths are denied.

## 3. Authentication hardening

- Firebase Console → Authentication → Settings → **Authorized domains**: keep only `audoc.in`, `www.audoc.in`, your `*.vercel.app` deployment domain, and `localhost`.
- Google Cloud Console → Credentials → the auto-created browser API key: add **HTTP referrer restrictions** for the same domains. This stops the config being reused from other websites.

## 4. Verify after publishing

1. Open the app in an incognito window **without signing in** — the landing page should load but no data.
2. Sign in with a Google account that owns no engagements — the dashboard should be empty (no permission errors in the console beyond your own tree).
3. Sign in as an invited team member — the invitation should still auto-accept and the shared engagement should open.
