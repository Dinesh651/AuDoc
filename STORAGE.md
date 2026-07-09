# Working Paper File Storage (Vercel Blob)

Firebase Storage on the free (Spark) plan hit its quota (`storage/quota-exceeded`), so working paper uploads now go to **Vercel Blob** — storage on the same platform that hosts the site. Uploads are authorized through a serverless function (`api/blob-upload.ts`) that verifies the user's Firebase sign-in token before issuing an upload token, and enforces the 20 MB / allowed-file-type limits server-side.

## One-time setup (required — uploads fail until this is done)

1. Open the **Vercel dashboard** → your `au-doc` project.
2. Go to the **Storage** tab → **Create Database** → choose **Blob** → give it any name (e.g. `audoc-files`).
3. When prompted, **connect it to the `au-doc` project** for the Production (and Preview) environments. This automatically adds the `BLOB_READ_WRITE_TOKEN` environment variable — you never handle the token yourself.
4. **Redeploy** the project (Deployments → ⋯ on the latest deployment → Redeploy) so the running functions pick up the new variable.
5. Test: open an engagement → Working Papers → upload a file.

Free (Hobby) plan includes 1 GB of Blob storage. If the audit practice outgrows that, the Pro plan raises it, or the upload API can be pointed at Cloudflare R2 (10 GB free) later without changing the UI.

## What happens to the old files?

- Files uploaded **before** this change still live in Firebase Storage and keep their original links. They stay viewable/downloadable whenever the Firebase daily quota allows (bandwidth quotas reset daily); deleting them still goes through Firebase.
- All **new** uploads go to Vercel Blob (URLs on `*.public.blob.vercel-storage.com`).
- If you want the old files moved over permanently: download them from an engagement's Working Papers list and re-upload — they'll land in Blob.

## Notes for developers

- `npm run dev` (plain Vite) does **not** serve the `/api` routes — use `npx vercel dev` to test uploads locally (requires `vercel link` once and `vercel env pull`).
- Blob URLs are public but unguessable (random suffix) — the same model as Firebase's tokenized download URLs. Deletion requires a signed-in Firebase user (`api/blob-delete.ts`).
- Upload limits (20 MB, allowed content types) are enforced in `api/blob-upload.ts`, mirroring the client-side checks.
