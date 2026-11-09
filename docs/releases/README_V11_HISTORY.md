# VERRIFT V11 | Scan, Save, Recheck

**Public live scanner:** The landing page now has a read-only Base token contract input. It uses GoPlus, Honeypot.is, DEX Screener and a Base Mainnet RPC `eth_getCode` request. The optional example uses the actual Circle-issued Base USDC contract; all findings are requested live, not fabricated. The provider APIs can return incomplete or conflicting results.

**Evidence records:** On `/verify`, a visitor can save a newly observed scan to the existing Supabase `verrift_state` storage, receive a dated public link and SHA-256 JSON digest, then rescan the same contract and compare provider-reported changes. No wallet connection or transaction is involved. These records are **not immutable onchain attestations**, are retained in a bounded store of 250 scans, and must not be presented as a certificate of token safety or evidence that a warning was resolved. Serverless rate limiting is best effort only.

**New endpoints:** `GET /api/token/check?address=...`, `POST /api/token/scans` with `{ "address": "0x...", "compareTo": "scan_id" }` (the second field optional), and `GET /api/token/scans/:id`. Read-only actions use no account; creation is limited per source IP per function instance. No new Supabase SQL or Vercel environment variables are required. Optional `GOPLUS_ACCESS_TOKEN` and `BASE_MAINNET_RPC` continue to be supported.

**Design:** The high-contrast green and ivory identity and original landing are preserved. The scanner now sits in the public page, and the evidence desk lets users download the archived JSON. The old wallet, points, $VIBES, revocation and advanced repair workflows are unchanged.

**Testing:** `npm run verify` includes mocked provider and chain tests. Live provider availability, production storage, wallet authentication, and real Mainnet actions have not been verified by this archive.

---

# VERRIFT | Base Wallet Clarity (V9)

VERRIFT is an evidence-led Base Mainnet wallet safety application. Users sign in with their wallet, review token permissions, verify actual changes onchain, view their VIBES holdings, and claim free daily VERRIFT Points. The new Overview shows streak status and real VIBES balance side-by-side. A separate Get VIBES section supports optional quoted native ETH to VIBES swaps using the server-side 0x API key. Mainnet spending always requires explicit wallet confirmation. No private keys or custody are involved.

**IMPORTANT:** VERRIFT Points are NOT $VIBES tokens, have no promised conversion or cash value, and no funded real-token rewards exist in this release. The legacy repair laboratory and passport testnet anchoring remain optional features, not Mainnet payment flows. No platform guarantees risk-free token transactions.

**V9 source and setup:** See [V9_RELEASE.md](V9_RELEASE.md). Install `ZEROX_API_KEY` on Vercel only when enabling live mainnet swap quotations. Supabase schema is unchanged. Wallet ownership sign-in does not require switching to Base Sepolia; only legacy testnet proof flows do.

## Wallet Passport (V7 user-first flow)

The main workspace now opens with Base Mainnet wallet activity rather than requiring
visitors to create a developer repair case. After Supabase wallet authentication,
the app reads the connected wallet's ETH balance and outgoing transaction nonce
from Base Mainnet RPC (chain 8453). With `BLOCKSCOUT_API_KEY` configured, it
also reads a bounded page of indexed transactions, sample ETH/gas spending,
repeated counterparties and recent activity. **These are recent native
transaction samples, not all-time spending or USD valuations.**

Users can generate a server-computed Wallet Passport snapshot with its SHA-256
digest, optionally anchor that digest in a real zero-value self-transaction on
Base Sepolia (testnet gas is charged), and export or share a branded,
privacy-conscious receipt. Wallet-signature authentication proves account
control, not financial trustworthiness. Anchored receipts require independent
onchain confirmation and never happen automatically. The repair verification
module remains under Repair Lab for advanced use.

**New optional secret:** `BLOCKSCOUT_API_KEY`. No schema migration is required;
wallet passports are stored in the existing `verrift_state` JSON state.

# VERRIFT | The Proof-of-Fix Network

**Vercel runtime hotfix:** This release separates the static website (`public/`) from the Vercel API (`api/index.js`). The local development server lives in `scripts/dev-server.js`. Before pushing over an older extraction, remove the obsolete root `server.js`. See `VERCEL_HOTFIX.md` for exact WSL instructions and environment settings.

**A public Base Sepolia repair-verification platform with an animated editorial landing page, private wallet workspaces and a wallet-first evidence room.**

Built by Jayking (`paulos-ui`, [@__official__1](https://x.com/__official__1)) for Vibeathon 02. AI coding assistance was used. Claude (Anthropic) is an optional server-side evidence analyst, not the source of test verdicts.

## Public landing and workspace

- `/`: premium public introduction with scroll-revealed product narrative, case-file artwork, interactive three-stage **illustration** and a final CTA. It is static, loads without Supabase, and uses no fake data or artificial transaction IDs.
- `/app`: the wallet-first evidence room, private cases, verified test target, wallet authentication and onchain workflows. This is where the live backend is required.
- `/docs`: full methodology and limitations. `/sandbox`: observable sample service. `/admin`: wallet-gated operator view.
- `DESIGN_SYSTEM.md`: visual territories, motion storyboard, and accessibility/performance tradeoffs.

## Experience

- **Anyone can explore VERRIFT without signing in.** At `/app`, visitors see a public introduction and can choose an installed wallet. Case creation, controlled test-target changes, private reports, domain registration and Base operations require a wallet-authenticated session. Users must sign an authentication message, not transfer funds, before opening their personal workspace.
- **Wallet owners** sign an EIP-4361 message to Supabase Auth, which verifies the Ethereum signature and issues an identity. VERRIFT then issues a short-lived secure, HTTP-only session cookie. User workspaces have distinct case records, proof histories and domain registrations. Anonymous visitors cannot create or modify cases. Private records are accessible only through an authenticated wallet session.
- **Domain owners** verify possession through DNS TXT or HTTPS file challenges before running narrowly scoped, read-only public HTTPS checks.
- **Claude** reads bounded observations (no private wallet keys) and offers hypotheses, never authoritative pass/fail status.
- **Base Sepolia** verifies self-addressed SHA-256 proof anchor transactions and non-custodial test ETH reward transfers using transaction receipts. No escrow or mainnet transfers are included.
- **Share links** are opt-in bearer URLs for public, read-only evidence reports. Without the URL token, private cases are not disclosed.
- **The operator view** at `/admin` only shows aggregate counts, restricted to the one authenticated wallet configured as `ADMIN_WALLET_ADDRESS`. The public user interface needs no administrator password.

## Requirements

- Node.js 22+
- A Supabase project with **Auth -> Web3 -> Ethereum enabled** and your deployment domain configured in the Auth redirect allowlist
- Supabase Postgres schema from [`supabase/schema.sql`](supabase/schema.sql)
- A compatible EVM wallet; Base Mainnet (chain 8453) for allowance and optional swap transactions
- Optional Anthropic API key for AI evidence analysis

## Local setup

```bash
npm ci
npm run setup
npm run dev
```

Visit http://localhost:3000 for the public landing and http://localhost:3000/app for the workspace. The public site and workspace introduction do not require a wallet. Creating cases, changing the test target and opening private records require one. For wallet authentication, create a Supabase project and add `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY` to `.env`. Run `supabase/schema.sql` in Supabase SQL Editor and allowlist `http://localhost:3000/**` in Supabase Auth redirect URLs.

`npm run setup` generates a private `SESSION_SECRET`. It does **not** generate an administrator password because visitors do not use a shared admin login.

## Production setup: Supabase + Vercel

1. Push the complete repository to `https://github.com/paulos-ui/verrift`.
2. Import that repo in Vercel, Framework **Other**, root `./`, build `npm run build`, output directory `public`, Node 22.x.
3. Install the **Supabase** integration in your Vercel project, and ensure `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, and `SUPABASE_SECRET_KEY` are provisioned. Depending on the integration, `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` may be supplied instead. This backend recognizes those aliases. The secret stays server-only.
4. Open your Supabase dashboard -> SQL Editor. Run the full [`supabase/schema.sql`](supabase/schema.sql) once.
5. Supabase -> Authentication -> Providers -> enable **Web3 wallet / Ethereum**. In Authentication URL configuration, add `https://YOUR-VERCEL-DOMAIN/**` and set your canonical Site URL.
6. Add to Vercel manually: `SESSION_SECRET`, `ANTHROPIC_API_KEY` (optional but required for live Claude), `CLAUDE_MODEL=claude-sonnet-4-6`, `BASE_SEPOLIA_RPC=https://sepolia.base.org`, `PUBLIC_ORIGIN=https://YOUR-VERCEL-DOMAIN` and `ADMIN_WALLET_ADDRESS` (optional, your single operator wallet).
7. Redeploy after adding values. Check `/api/status` returns `persistence: "supabase"`. Test the public entry, wallet selection, authenticated failure-to-repair flow, separate accounts, domain verification, Claude and actual Base Sepolia transactions.

**You do not need Redis/Upstash once Supabase is installed.** Do not add `ADMIN_PASSWORD` or `DATABASE_URL` for this app. `SESSION_SECRET` is *not* a login password. It signs secure sessions. Never put Supabase secret keys, Anthropic keys, or wallet private keys in GitHub or browser code.

## API and trust boundaries

- `GET /api/status`, `GET /api/data` are public; `/api/data` is scoped to the visitor or signed-in user.
- `GET /api/auth/challenge?address=...`, `POST /api/auth/verify` perform challenge-response authentication via Supabase Web3.
- `GET /api/data`, `POST /api/cases`, `POST /api/cases/:id/run` and `POST /api/sandbox` require authenticated wallet sessions and enforce per-account ownership.
- `POST /api/projects`, `/api/projects/:id/verify`, `/api/cases/:id/analyze`, `/api/cases/:id/anchor`, `/api/cases/:id/reward`, and `/api/cases/:id/confirm-payment` require a signed-in wallet.
- `GET /api/admin/summary` requires the authenticated operator wallet.
- `GET /api/public/:id?token=...` requires an explicit bearer token created by the owner.

The data store uses a server-only JSONB record in Supabase with an atomic Postgres compare-and-swap routine. This is sufficient for a constrained public MVP but is not a horizontally partitioned multi-tenant database. For a high-traffic production launch, migrate each entity to separate tables, implement per-table RLS, add durable edge-rate-limits and monitoring, conduct full security reviews, and audit any custody or escrow functionality before using real assets.

## Testing

```bash
npm run verify
```

Node tests cover domain safety, authenticated case evidence, wallet separation, replay-limited challenges, Base RPC evidence and payouts, and the serverless route adapter. External provider integrations are mocked in tests, so **a passing suite does not mean live Supabase, Anthropic, or Base transactions have succeeded**.

## Deployment and demo

- [`DEPLOYMENT.md`](DEPLOYMENT.md) contains an environment checklist and verification plan.
- [`GITHUB_PUSH.md`](GITHUB_PUSH.md) contains exact WSL unzip, commit and GitHub push commands.
- [`DEMO_SCRIPT.md`](DEMO_SCRIPT.md) contains a short walkthrough.
- [`SECURITY.md`](SECURITY.md) documents safety boundaries.
- [`VERCEL_DATABASE_NEXT.md`](VERCEL_DATABASE_NEXT.md) explains the exact Supabase/Vercel repair steps for the runtime error shown in the user screenshots.

## License

MIT. See [`LICENSE`](LICENSE). Keep required contest disclosures accurate.


## White Room interface refinement (V5)

The public homepage (`/`) now uses a pure-white editorial canvas while retaining its original scroll animation, protocol demonstration, Base proof explanation and enter-app CTA. The user workspace (`/app`) adds a cleaner white navigation rail, a richer but real-data-only overview, clear live sandbox controls, four evidence journey stages and separate contextual activity panels. This describes the historical V5 look. V6 supersedes its white navigation rail and rust accents with pine-green navigation and ocean-blue highlights.

No Supabase schema change or new environment variable is needed for this design update. If `/app` still displays an API configuration warning, finish the database and environment setup described in `VERCEL_DATABASE_NEXT.md`.

## V6 wallet-first flow and visual identity

The public landing at `/` introduces the concept. `/app` opens a public workspace home with a **Connect wallet** action. The wallet picker lists EIP-6963 or legacy EIP-1193 providers actually detected in the browser, and provides installation links if none are available. After a user chooses a wallet, the app requests Base Sepolia, a login challenge, and a wallet signature verified through Supabase Web3 Auth. Each user's saved cases remain isolated. The account operator route `/admin` is separate.

V6 uses a deep forest-green navigation rail, white workspace surfaces, ocean-blue typographic accents, and restrained mint highlights. It does not contain an anonymous demo-mode dashboard. The authenticated controlled test target remains available for repeatable failure-to-repair evidence. No real funds or mainnet contracts are involved.

For production, Supabase persistence and Ethereum authentication still must be configured, including the bundled SQL schema. A Vercel build alone cannot confirm this works.

## Wallet sign-in troubleshooting

If wallet selection works but Supabase returns HTTP 422 on `/auth/v1/token?grant_type=web3`, see [`WALLET_SIGNIN_FIX.md`](WALLET_SIGNIN_FIX.md). This release distinguishes a disabled Ethereum Web3 provider, an unapproved site URL, and generic authentication rejection.


## Why 2026: public thesis (landing page)

The landing page links to Base's March 31, 2026 published network strategy and its May 29, 2026 agentic-economy discussion. Base reported over $17 trillion in stablecoin volume for 2025 and identifies markets, payments, and builders as 2026 priorities. VERRIFT's position is an **inference**, not a claim by Base: as more tokens and applications appear, users need accessible, independent research before interacting and verifiable receipts after permission changes.

Sources: https://blog.base.org/2026-mission-vision-and-strategy and https://www.base.org/blog/the-agentic-economy-is-here. These are external references, not VERRIFT usage or revenue metrics.

The landing page links to the project source at https://github.com/paulos-ui/verrift and also preserves the requested GitHub hub address https://github.com/verrift. The latter is a GitHub user/organization-style address and should be confirmed by the owner before submission.

The token investigator is a **screening tool**, not a security audit or trading recommendation. A missing flag does not prove safety. Any real wallet action requires explicit wallet approval. Daily VERRIFT Points do not represent transferable $VIBES.
