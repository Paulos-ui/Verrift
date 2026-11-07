# VERRIFT

**Broken is a claim. Fixed is a proof.**

VERRIFT is an evidence-first repair workspace built for Vibeathon 02: Night Shift. Record a reproducible failure, rerun the same acceptance criteria after a fix, optionally ask Claude to interpret the observations, anchor a SHA-256 proof fingerprint on **Base Sepolia**, and verify a direct testnet developer reward.

> **Status:** functional local MVP, not an audited production platform. There is no public deployment URL or live wallet/API credential included. The 20 automated tests were executed locally with controlled external-service responses. Vercel and live Base/Anthropic functionality require setup and independent verification.

## What works

- Private workspace sign-in (12-hour signed HttpOnly, SameSite=Strict session cookies).
- Actual persisted case records, locked test criteria and test history.
- Controlled live sandbox with service states `HTTP 503 / SERVICE_UNAVAILABLE` and `HTTP 200 / SERVICE_READY` and an unchanged rerun after repair.
- Registered public domains with DNS TXT or HTTPS well-known-file ownership proof. Requests use pinned DNS and bounded, read-only HTTPS GET checks. No arbitrary scanning, redirects, custom ports or local/private targets.
- Evidence compare view, timestamped results and pass/fail assertions. `verified` means the recorded check failed and later passed under the same criteria; it does not certify a whole application's safety.
- Optional **Anthropic Claude API** analysis of real, bounded observation data. No autonomous patching or invented fixes.
- Base Sepolia injected EVM wallet connection, network switching and explicit transaction signing.
- **Proof anchor:** hash a failed/passing evidence pair with SHA-256, send a zero-value wallet self-transaction containing the digest, then verify the actual Base Sepolia receipt and calldata.
- **Direct repair reward:** configure a recipient wallet and test ETH amount, send from the connected wallet after verified repair, then verify receipt status, amount, sender and recipient from Base RPC. No escrow and no mainnet custody.
- Read-only shareable reports, JSON export, responsive dashboard, About/Docs, and local + optional Upstash REST persistence.

## Quick start (Node.js 22+)

```bash
npm ci
npm run setup
npm run dev
```

The setup command creates an ignored `.env` and **prints a fresh admin password once**. Store the password securely and open `http://localhost:3000` in a browser. You can use this application without Anthropic or a wallet to try the full sandbox testing sequence.

### Demo workflow

1. Sign in with the generated admin password.
2. On Overview, select **Run the live sandbox** to open its real case record.
3. Select **Introduce fault**, then return to the case and **Run the exact check**. The assertion fails because the sample service actually reports 503.
4. Return to Overview, select **Restore service**, then rerun the unchanged case. The status becomes **Verified**.
5. With an Anthropic key, select **Analyze current evidence** to request an actual Claude explanation.
6. With a wallet that has **Base Sepolia test ETH**, connect, choose **Anchor evidence on Base** and sign the zero-value self-transaction. After it mines, confirm the receipt.
7. Specify a recipient wallet and reward amount, send test ETH from your wallet and confirm its real onchain receipt.
8. Export the evidence JSON or share the read-only public case link.

## Required and optional environment variables

Copy `.env.example` to `.env`, or let `npm run setup` generate local secrets.

| Name | Required | Description |
|---|---|---|
| `ADMIN_PASSWORD` | Yes | Long unique administrator password; at least 12 characters |
| `SESSION_SECRET` | Yes | Random session-signing secret; at least 32 characters |
| `ANTHROPIC_API_KEY` | For Claude | Anthropic API key, server-side only |
| `CLAUDE_MODEL` | No | Defaults to `claude-sonnet-4-6`; use a model available to your API account |
| `BASE_SEPOLIA_RPC` | For proof/transfer verification | Base Sepolia JSON-RPC URL; default `https://sepolia.base.org` |
| `UPSTASH_REDIS_REST_URL` | Production | Managed Redis REST endpoint. Use both Upstash settings together |
| `UPSTASH_REDIS_REST_TOKEN` | Production | Private Redis REST token |
| `PUBLIC_ORIGIN` | Production | Exact deployed HTTPS origin, e.g. `https://verrift.example` |
| `PORT` | No | Local port (default `3000`) |

**Never put secrets in `NEXT_PUBLIC_*` variables, browser code, Git or the submission ZIP.** The `.env.example` includes no live credentials.

## Architecture

```text
public/                 Responsive editorial UI, wallet controller, docs, report and sample service
server.js               Local Node.js HTTP server
api/index.js            Vercel serverless entry, including rewritten route normalization
lib/app.js              Session auth, validation, routes, case/run lifecycle, export and rewards
lib/domain.js           Public domain validation, proof and pinned HTTPS assessment
lib/ai.js               Bounded server-side Anthropic Messages API adapter
lib/base.js             Base Sepolia JSON-RPC receipt verification and proof calldata
lib/store.js            Atomic local JSON persistence or Upstash Redis compare-and-set
lib/utils.js            Shared validation, hashing and identifier helpers
tests/                  Node built-in test runner, API integration and mocked remote providers
```

Runtime dependencies: **zero third-party packages**. This was intentional to enable offline installation and a locally executable, tested MVP. It does **not** use Next.js, React, wagmi or a TypeScript build; the current implementation is plain modern JavaScript with a Node HTTP backend. Do not describe its syntax check as a TypeScript check.

### Real external-site scope

An external case checks **one owner-verified public HTTPS URL** with a GET request, expected status and optional response text. The checker verifies the hostname resolves to public addresses and pins the HTTPS request to a validated address; it does not follow redirects. Body reading is limited to 120 KB, timeout to 8s, and TLS verification remains enabled. This is not general browser automation or a security pentest.

The sandbox evaluates **actual persisted API service state** for a deterministic contract test. It is a useful, real before/after demonstration but is not a screenshot-driven website test and should be described accordingly.

## Deployment

See [GITHUB_PUSH.md](GITHUB_PUSH.md) for the exact `paulos-ui/verrift` push commands and [DEPLOYMENT.md](DEPLOYMENT.md) for Vercel + Upstash setup and live smoke checks. **Do not deploy without production secrets and durable storage.** Mainnet deployment, custody and paid escrow are intentionally out of scope.

## Quality checks

```bash
npm ci --offline
npm run lint        # JS syntax and JSON validation, not ESLint
npm test            # Node built-in tests
npm run build       # JS syntax and JSON validation, not a bundled compilation
npm run verify      # syntax + tests + syntax
```

The automated suite covers session authorization, cross-origin blocking, domain validation, ownership gating, deterministic failures and repairs, sharing, reward eligibility and uniqueness, Base receipt validation, proof fingerprint integrity and Claude request construction.

Browser layout was rendered at 390, 768 and 1440 px widths using the real HTML/CSS/JS with stubbed API responses. No overflow or page errors were found in those layout-only checks; **real localhost browser navigation was blocked by the container's browser administrator policy**, so a full live interaction flow in Chromium remains unverified.

## Known limitations / safety

- **No escrow:** direct EOA-to-EOA test ETH only. Don't use real funds or mainnet addresses in the MVP.
- Onchain transfers are irreversible and incur network gas, even if testnet tokens have no market value.
- Claude can be wrong; its analysis is advisory and separated from deterministic pass/fail evidence.
- The application uses a single administrator password, not multi-user authentication or SIWE.
- Vercel/Upstash, wallet signatures, real public domain verification and live Claude calls have not been exercised in this container.
- One HTTP status/text assertion per case; no isolated Playwright worker, automatic PR patch, production monitoring or penetration testing.
- The Upstash adapter uses an atomic compare-and-set loop but hasn't been tested against a live account.
- Evidence records can be deleted by the workspace administrator before reward payment. Onchain anchors include a hash, not raw evidence or a proof that a repair is correct.
- This is a hackathon MVP requiring a real deployment and external integration checks before public submission.

## Credits, disclosures and licenses

Created by **Jayking** (GitHub: [paulos-ui](https://github.com/paulos-ui), X: [@__official__1](https://x.com/__official__1)). Developed with AI coding assistance. Optional runtime model analysis uses the Anthropic API when the owner configures a key. The application is independently authored source code, with no copied stock imagery. Licensed under MIT (see LICENSE).

Base docs: https://docs.base.org/base-chain/api-reference/ethereum-json-rpc-api/eth_chainId  
Anthropic docs: https://docs.anthropic.com/en/api/messages  
Vibeathon rules: https://blog.vibestarter.xyz/vibeathon-02
