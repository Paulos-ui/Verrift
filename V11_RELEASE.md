# VERRIFT V11 | Evidence, not another static score

## What changed

1. Public scanner embedded directly in the animated landing page. Real contract checks, no wallet required. The Circle-issued Base USDC address is offered only as a live example, not a guarantee.
2. Base `eth_getCode` verifies whether contract code is actually deployed at the address. RPC outages are reported as unknown.
3. Third-party response validation no longer treats incomplete Honeypot.is responses as coverage. DEX-only market data never becomes an all-clear security result.
4. Dated public scan records are stored in existing Supabase/Upstash/local state using `POST /api/token/scans` and retrieved through `GET /api/token/scans/:id`.
5. Saved report links support on-demand rescan and delta comparison. Vanishing signals are not claimed to have been fixed, because providers may simply be unavailable.
6. Reports can be exported as JSON with their server-computed SHA-256 digest, sources and timestamps. SHA-256 is not an independent onchain proof.
7. Mobile and desktop render checks, accessibility support and security tests for malformed requests, cross-origin writes and per-source read limits.

## Verify after deployment

- Open `/` and try the actual Circle USDC example. A provider outage should show unavailable coverage, not a passing token.
- Open `/verify?address=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913#token` and inspect the full report.
- Click `Save dated evidence record`. Verify the `/verify?scan=...#token` URL opens in another browser without signing in.
- Click `Rescan and compare`. Verify the report changes panel appears and never says a risk is definitively fixed.
- Check `/api/status`, connected wallet login, $VIBES holder balance, top-bar streak, Safety Desk and original site/repair tools.
- Run `npm run verify` and examine the production Vercel Runtime Logs. None of these checks prove a token is safe.

## Deployment

Use the existing `paulos-ui/verrift` GitHub repository and Vercel project. No new SQL schema, API keys, or wallet permissions are necessary for this release. Existing Supabase database persistence must be configured. Keep `.env` private. The platform does not custody funds, execute trades through the scanner, or distribute actual $VIBES for streaks.

## Fundable

Re-run Fundable only after live deployment. The score is subjective and a higher score is not guaranteed. The unique measurable feature is a **public scan -> dated observation -> share -> rescan comparison** workflow rather than a generic third-party risk grade.
