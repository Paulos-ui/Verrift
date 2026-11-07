# VERRIFT | Vercel deployment hotfix

## What the screenshots prove

The deployment build succeeded, but the production website returned `500 FUNCTION_INVOCATION_FAILED`. This is a **runtime** failure, not an npm build failure.

Two deployment hazards were found in the previous source:

1. The root-level `server.js` was being automatically detected as the Vercel production entrypoint. It was written to start a local HTTP listener and initialized the API immediately. The new version moves this development-only server to `scripts/dev-server.js`, leaving `api/index.js` as the Vercel Function and `public/` as the static website.
2. `createHandler()` throws at initialization if `SESSION_SECRET` is missing or shorter than 32 characters, or if the production database variables are incomplete. We reproduced the missing-secret crash locally. The new API adapter returns HTTP 503 with a useful error while logging its cause, rather than crashing the function.

The **exact** production error message from Vercel Runtime Logs was not available in the screenshot, so we cannot certify which startup hazard caused that invocation. These changes address both likely issues.

## Replace the files in your existing Desktop project

Put `verrift-vercel-hotfix.zip` directly on your Windows Desktop. From WSL terminal:

```bash
cd "/mnt/c/Users/MY PC/Desktop/verrift"
unzip -oq "/mnt/c/Users/MY PC/Desktop/verrift-vercel-hotfix.zip" -d . && rm -f "/mnt/c/Users/MY PC/Desktop/verrift-vercel-hotfix.zip" server.js
npm ci
npm run verify
git status --short
git add -A
git commit -m "Fix VERRIFT Vercel function startup and static routing"
git push origin HEAD
```

`rm -f server.js` is **required** when updating from the previous ZIP. `unzip` overwrites files but does not delete files removed from the updated release. The obsolete root file would otherwise keep triggering Vercel's entrypoint auto-detection.

If you have not pushed the repo before, use the initial GitHub commands in `GITHUB_PUSH.md` instead.

## Vercel project settings

- Framework Preset: `Other` (also pinned by `vercel.json`)
- Root Directory: `./`
- Build Command: `npm run build`
- Output Directory: `public` (also pinned by `vercel.json`)
- Node.js Version: `22.x`

Do not configure `server.js` as a production entrypoint. The `public/` files should be served as static pages and requests for `/api/...` are forwarded to `api/index.js` by `vercel.json`.

## Required production environment variables

| Variable | Set to | Where |
| --- | --- | --- |
| `SESSION_SECRET` | Random string at least 32 characters (e.g. output of `openssl rand -hex 32`) | Vercel > Project > Settings > Environment Variables |
| `SUPABASE_URL` | Supabase project URL (or `NEXT_PUBLIC_SUPABASE_URL`) | Supabase integration |
| `SUPABASE_SECRET_KEY` | Server-only Supabase secret (or `SUPABASE_SERVICE_ROLE_KEY`) | Supabase integration |
| `SUPABASE_PUBLISHABLE_KEY` | Supabase publishable key (or `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`) | Supabase integration |
| `PUBLIC_ORIGIN` | Exact production origin `https://verrift.vercel.app` if that is still assigned | Vercel environment variables |
| `ANTHROPIC_API_KEY` | Your private Anthropic API key | Vercel environment variables |
| `CLAUDE_MODEL` | `claude-sonnet-4-6` | Vercel environment variables |
| `BASE_SEPOLIA_RPC` | `https://sepolia.base.org` | Vercel environment variables |
| `ADMIN_WALLET_ADDRESS` | Optional wallet address for separate operator dashboard | Vercel environment variables |

You do not need an `ADMIN_PASSWORD`, a wallet private key, or an OpenSSL installation on Vercel. You can generate `SESSION_SECRET` locally with `openssl rand -hex 32` and paste the output only into Vercel's secret value field. **Never send the value in chat or commit it to git.** Make sure variables apply to the **Production** environment, and redeploy after edits.

In Supabase, enable wallet (Ethereum/Web3) sign-in and execute `supabase/schema.sql` before using case persistence. Connecting Supabase to Vercel without creating VERRIFT's schema is not sufficient.

## Verify on the newly deployed URL

1. Go to **Vercel > verrift > Deployments**, open the latest deployment for `main`, and check that it is marked Ready.
2. Open `https://verrift.vercel.app/` and confirm the **public VERRIFT homepage** loads without login.
3. Visit `https://verrift.vercel.app/healthz`, expect JSON `{ "ok": true, "service": "verrift" }`.
4. Visit `https://verrift.vercel.app/api/status`, expect JSON that reports `"persistence":"supabase"` and guest or user actor details. If you receive 503, open **Vercel > verrift > Logs** and read the latest invocation error.
5. Try the guest sandbox. Then, after configuring Supabase Auth, try wallet login and user accounts.
6. Test Claude and Base transactions separately. A successful static load does not establish that these external services work.

If a `500 FUNCTION_INVOCATION_FAILED` persists **after** deployment, open Vercel > `verrift` > **Logs** (not Build Logs), filter Status Code `500`, click the failing request, and inspect the stack trace. Share the error message without secrets or API keys for further debugging.

## Verification performed in this environment

- Automated test suite: 30/30 passed.
- Syntax and JSON validation: passed.
- Serverless API initialization missing-secret case: returns 503 and logs cause, tested locally.
- Serverless rewrite handler: status and health routes returned 200 in local adapter tests.
- Deployment architecture and root-entrypoint absence: statically checked.
- True production Vercel build / browser / Supabase credentials: **not executed** here; requires GitHub push and Vercel redeploy.


## New public landing separation

The public `/` page is now static and does not require a database. The real user workspace is at `/app` and needs correctly configured Supabase. For the visible runtime error in the supplied logs, see `VERCEL_DATABASE_NEXT.md`.
