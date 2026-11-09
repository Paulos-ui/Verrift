# VERRIFT V12 | Vercel + Supabase deployment

This is the current deployment guide. Historical fixes are archived under `docs/releases/`.

## Requirements

- Node.js 22+, a GitHub repository under a confirmed account you control, and a Vercel project.
- Supabase project for authenticated wallet state and retained research reports.
- Base Mainnet RPC; defaults to `https://mainnet.base.org` for the same-block permission tool.
- Optional `ZEROX_API_KEY` for real ETH-to-VIBES quotes, `BLOCKSCOUT_API_KEY` for indexed activity, `ANTHROPIC_API_KEY` for bounded AI analysis, `GOPLUS_ACCESS_TOKEN` for authenticated GoPlus access.

## Local validation

```bash
npm ci
npm run setup
npm run verify
npm run dev
```

Configure values in a local `.env` copied from `.env.example`. Do not commit `.env` or any API secrets. `npm run setup` can generate a random `SESSION_SECRET`. Basic public token reads can function without wallet login; authenticated user paths require Supabase configuration. For development, local state is not production persistence.

## Supabase configuration

1. Open SQL Editor and apply `supabase/schema.sql` (server-managed state table and atomic update routine).
2. Enable **Authentication > Providers > Web3 > Ethereum** for signed wallet login.
3. Allow the exact Vercel domain in Supabase URL configuration and redirect allowlist. Include localhost while developing.
4. Provision `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY` on the **server**. The secret must never appear in `public/` or a browser response.

## Vercel settings

- Framework preset: **Other**
- Root: `./`
- Build: `npm run build`
- Output: `public`
- Node: **22.x**
- Serverless function: `api/index.js` defined in `vercel.json`
- Environment: `SESSION_SECRET` (at least 32 characters), `PUBLIC_ORIGIN=https://verrift.xyz` (your canonical domain), Supabase variables above.
- Optional provider env vars as in `.env.example`. No additional V12 SQL table is required.

## Post-deployment verification

1. `GET /healthz` returns `ok: true`.
2. `GET /api/status` shows correct configured persistence and no false token-reward entitlement.
3. `GET /api/token/check?address=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` returns a live report or explicit provider-unavailable error; never a canned “safe” rating.
4. Use `/verify#exposure` with known, legitimate public owner/token/spender addresses. Record the block/hash and cross-check against an independent Base RPC or explorer.
5. Save a research snapshot, copy the public link, reload, rescan and compare. This proves whether production storage is configured.
6. Test wallet authentication and state isolation independently. Do not attempt spending or revocation unless intentionally approved by the wallet owner.
7. If 0x is enabled, test quote/error states, slippage, confirmation, and final verification with risk controls; there is no automatically funded token rewards mechanism.

## Rollback, limits and safety

Keep the previous working Git commit before deployment. If V12 regresses, redeploy the previous known-good commit rather than hiding broken scanner states. Public RPC and free providers have quotas, and the current per-instance throttling is not sufficient for abuse-resistant scale. For a future paid API, first deploy durable rate limits, key quotas, privacy terms and stronger monitoring. The new exposure tool is read-only and never calls a transaction sender.

See [README.md](README.md), [METHOD_AND_LIMITS.md](METHOD_AND_LIMITS.md), [BACKER_CASE.md](BACKER_CASE.md), [GITHUB_PUSH.md](GITHUB_PUSH.md).


### Wallet sign-in domain fix (V12.1)

The backend now recognizes the verified VERRIFT domains `https://verrift.xyz`, `https://www.verrift.xyz`, and `https://verrift.vercel.app`, while rejecting cross-site write requests. Sign-in challenge messages use the **current trusted domain** instead of using an unrelated hostname from `PUBLIC_ORIGIN`. For any other domain you control, add its exact HTTPS origin to `ALLOWED_ORIGINS` in Vercel. Do not use `*` or disable the origin check.

In Vercel Production environment variables set `PUBLIC_ORIGIN=https://verrift.xyz` and redeploy. In Supabase Authentication > URL Configuration, set the Site URL to `https://verrift.xyz` and authorize the exact domains used by your deployment. Keep Authentication > Web3 > Ethereum enabled. If a wallet shows a different domain in its signature request, close the dialog and confirm the browser address.

The wallet picker also removes duplicate MetaMask announcements when EIP-6963 and legacy wallet injection both report the same wallet. A read-only token scan does not require wallet sign-in.
