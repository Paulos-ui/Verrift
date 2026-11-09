# V9 Mainnet feature setup

V9 adds `ZEROX_API_KEY` (server-only) for optional 0x Swap API v2 ETH-to-VIBES quotes on Base Mainnet. Deploy the V9 ZIP first and confirm live wallet login, token balance and free daily claim. Only then create an API key at https://dashboard.0x.org/apps and add it to the Vercel Production environment. Redeploy after changes. No new database schema is needed.

No trading will be advertised as available when the API key is absent. No onchain $VIBES claim/reward service is implemented. VERRIFT Points remain nontransferable. Review `V9_RELEASE.md` before live swaps.

# V7 quick update

This release adds wallet-first Base Mainnet analytics and optional Blockscout indexed history. See `V7_RELEASE.md` for the actual user journey and the Vercel environment variables. No new Supabase tables are needed. Wallet proof anchoring remains an optional Base Sepolia action, not a condition of sign-in.

# VERRIFT | GitHub, Supabase and Vercel deployment

> **Updated deployment layout:** For fixes to the November 7 Vercel `FUNCTION_INVOCATION_FAILED`, follow `VERCEL_HOTFIX.md` first. The old root-level `server.js` must be removed from already-extracted repositories, because unzip does not remove old files. The local server now lives at `scripts/dev-server.js`; production uses `api/index.js` and `public/`.

## 1. Source on your Windows Desktop

The project is extracted into `/mnt/c/Users/MY PC/Desktop/verrift` in WSL Ubuntu. The ZIP below is source-only and does not include `.env`, databases, wallets, or generated artifacts.

```bash
cd "/mnt/c/Users/MY PC/Desktop"
unzip -oq "verrift-vercel-hotfix.zip" -d "verrift"
rm -f "verrift/server.js"
cd "verrift"
npm ci
npm run verify
```

## 2. Push to paulos-ui

Create an empty PUBLIC repo called `verrift` at https://github.com/new under your GitHub account, unless it already exists.

If the directory is already a Git repo linked to `paulos-ui/verrift`:

```bash
cd "/mnt/c/Users/MY PC/Desktop/verrift"
git status --short
# Confirm .env is not tracked
git add -A
git commit -m "Add public wallet accounts and Supabase storage"
git push origin HEAD
```

For a new repo only:

```bash
git init
git branch -M main
git remote add origin https://github.com/paulos-ui/verrift.git
git add -A
git commit -m "Launch public VERRIFT with wallet workspaces"
git push -u origin main
```

Do not overwrite `.git`, force-push or share API secrets.

## 3. Add Supabase on Vercel

**Read `VERCEL_DATABASE_NEXT.md` for the current API error and SQL Editor steps.**

**Yes. Choose Supabase, not Redis, to power individual user accounts and their persisted cases.**

- Open Vercel > `verrift` > Storage/Marketplace/Integrations > Add Supabase.
- Connect a Supabase project to the Vercel project.
- In Supabase SQL Editor run `supabase/schema.sql` once.
- Supabase Authentication > Providers > Web3 (Ethereum): Enable.
- Supabase Authentication > URL configuration: set Site URL to your Vercel domain; add `https://YOUR-URL/**` redirect allowlist. For local development, also allow `http://localhost:3000/**`.

Make sure Vercel Environment Variables includes the following database variables. These will generally be created by the integration:

| Env name | Value | Required |
| --- | --- | --- |
| `SUPABASE_URL` | Supabase project URL | Yes (or `NEXT_PUBLIC_SUPABASE_URL`) |
| `SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_...` API key | Yes (or `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`) |
| `SUPABASE_SECRET_KEY` | Server-only `sb_secret_...` key | Yes (legacy: `SUPABASE_SERVICE_ROLE_KEY`) |

These three are consumed on the **server**, even if the URL and publishable key have `NEXT_PUBLIC` prefixes supplied by the integration. The secret must NEVER be public.

## 4. Add the remaining Vercel variables manually

| Env name | Value |
| --- | --- |
| `SESSION_SECRET` | Long randomly generated secret from `npm run setup`, at least 32 characters |
| `ANTHROPIC_API_KEY` | Your private Anthropic API key, required to use Claude analysis |
| `CLAUDE_MODEL` | `claude-sonnet-4-6` |
| `BASE_SEPOLIA_RPC` | `https://sepolia.base.org` |
| `PUBLIC_ORIGIN` | Your exact Vercel origin, e.g. `https://verrift.vercel.app` if assigned |
| `ADMIN_WALLET_ADDRESS` | Optional: **your own wallet address** for `/admin`, not a password |

You do **not** need `ADMIN_PASSWORD`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `DATABASE_URL`, wallet private keys or browser-exposed Anthropic keys.

## 5. Vercel project configuration

- Framework preset: **Other**
- Root Directory: `./`
- Build: `npm run build`
- Output Directory: `public`
- Node: `22.x`
- The static site is served from `public/` and Vercel uses the `api/index.js` serverless function. `vercel.json` routes `/api/*`, `/docs`, `/sandbox`, `/admin`, and `/report/*`. Root `server.js` must **not** exist.

Save, deploy, then open the actual Vercel URL. The static landing is at `/` and the user dashboard is at `/app`. If you need to set `PUBLIC_ORIGIN` after deployment assigns the URL, set the variable and redeploy.

## 6. Validate the REAL deployed product

1. Open `/` in a private browser: public animated landing loads without an admin password; CTA goes to `/app`.
2. On `/app`, choose Connect wallet and select an installed provider. Approve the Base Sepolia switch and wallet ownership signature.
3. As Wallet A, create a controlled test case, introduce a fault, record failure, restore, and verify. As Wallet B, confirm Wallet A's private records are not visible.
4. From `/app`, choose **Connect wallet**, select a detected provider, approve the Base Sepolia network and the sign-in signature (not a transaction). Verify that the private dashboard loads.
5. Open the app with a different wallet. Confirm it does not show the first account's projects/cases.
6. Register a public domain you own, publish DNS TXT or HTTPS file proof, then verify ownership.
7. Configure Anthropic and record a **live** Claude analysis on a case with observations.
8. From your signed-in Base Sepolia wallet, anchor proof in a real transaction; verify its explorer receipt.
9. Configure and verify a non-custodial test ETH payout after a failed-to-passed repair.
10. If your wallet is configured as `ADMIN_WALLET_ADDRESS`, open `/admin` for operator counts. Other users receive 403 for its private API.

## Limitations

Supabase is a live provider and this development container has no project credentials. Supabase Auth, real onchain transactions, and Vercel deployment MUST be verified by you after connection. Existing records from the single shared admin workspace are not migrated automatically. This MVP uses a single locked JSONB state document and an atomic CAS RPC; high-traffic scale needs relational tables and durable rate limiting.
