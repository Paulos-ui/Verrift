# VERRIFT

### Check before you interact. Know what a spender can access. Verify what changed.

[Live application](https://verrift.xyz) · [Public evidence desk](https://verrift.xyz/verify) · [Source repository](https://github.com/paulos-ui/verrift) · [Product manual](https://verrift.xyz/docs)

**Status:** working Base Mainnet MVP | **Network:** Base (chain ID `8453`) | **Release:** V12, November 9, 2026 | **License:** MIT

VERRIFT is an evidence-focused toolkit for users and builders who interact with ERC-20 tokens on Base. It combines **pre-interaction token research**, **one-block permission exposure measurements**, and **post-transaction allowance verification**. The point is not to produce one more arbitrary “safe to buy” score. It is to let someone inspect *what was observed, by which source, at which time or block*, and independently check the effect of a specific wallet-approved action.

> **Important:** VERRIFT is an independent builder project. It uses Base network infrastructure; it is **not sponsored, endorsed, audited, funded or otherwise officially backed by Base**. SolNeutral is discussed below only as separate builder experience and a prospective integration use case; there is no confirmed partnership, customer relationship or deployed integration. No source or screenshot claims that VERRIFT has earned revenue or that token holders receive cash rewards.

## 60-second demo

1. Open the homepage. Paste the exact Base token contract, or choose the published Circle USDC example. Read the live provider findings and missing-data notices **without connecting a wallet**.
2. Open **Evidence Desk**. Save a dated scan; copy its public link. Return and run a new scan to see *newly reported* and *no longer reported* flags. A disappearing flag is **not** proof of a security fix.
3. In **Permission Exposure Lens**, enter a wallet, a token contract and a spender. The server pins all standard ERC-20 balance/allowance and code reads to **one Base block**, and returns the block number/hash, active allowance, a bound on currently held units accessible under that allowance, and an EIP-7702 delegation marker if the wallet bytecode carries one.
4. In the wallet workspace, optionally connect and sign a login challenge, review observed approvals, prepare an explicit wallet-approved `approve(spender, 0)` transaction, and independently recheck the confirmed transaction on `/verify`. **No funds move without wallet approval.**

**Live evidence, not seeded demo data:** GoPlus, Honeypot.is, DEX Screener, and Base RPC are read at request time. Individual providers can be down, delayed or wrong. The automated test suite uses mocks, not live money transactions.

## The concrete problem

Three questions appear at different points in a Base user's journey:

| When | Question the user actually needs answered | VERRIFT's observed answer |
| --- | --- | --- |
| Before | What should I review before interacting with this exact token contract? | Multiple provider claims, source coverage, liquidity indicators and deployed bytecode observations |
| During | Has this wallet approved this exact spender, and how much might that approval cover? | Same-block onchain `allowance()` plus `balanceOf()` and account-code observations |
| After | Did the stated revoke really occur, and is the allowance zero now? | Match the confirmed transaction input and receipt, then independently read the current ERC-20 allowance |

**Why this is different from a conventional scanner:** We do not claim to outperform specialized detection engines at their own job. Instead, VERRIFT connects **provider-reported research**, **direct chain measurements**, **dated evidence records**, **a specific controlled action**, and **a public check of the resulting chain state**. The distinctions are visible in the response formats and can be reproduced without trusting a branded badge.

This is a product **positioning and technical architecture** advantage, not a proven exclusive moat. Revoke.cash, wallet-native warnings and token screening sites are real alternatives. A long-term competitive advantage would need superior repeat-use workflows, validated user demand and independent adoption, not simply more features.

## Why 2026 is a technical inflection point

VERRIFT does **not** claim that token approvals or security scanners were impossible in 2023. They were not. The technical environment and the permission problem have evolved:

1. **New native chain cadence.** Base's [November 5, 2026 Denim upgrade](https://www.base.org/blog/denim) introduced five native canonical blocks per second (200 ms blocks), replacing Flashblocks preview streams. A UI stitching together unrelated `latest` reads can accidentally describe different states on a fast chain. VERRIFT's new exposure lens pins contract calls and code checks to the **same specific block** and includes a block hash. That is a reproducibility choice, **not** a claim that a freshly included block is Ethereum-finalized.
2. **Delegated wallet code.** [EIP-7702](https://eips.ethereum.org/EIPS/eip-7702) enables some externally owned accounts to delegate execution to another contract. That mechanism postdates 2023, and Base [published guidance about its new security considerations in 2025](https://www.base.org/blog/securing-eip-7702-upgrades). VERRIFT now recognizes the `0xef0100 + 20-byte address` delegation-code marker in a direct `eth_getCode` read. It **does not** audit delegate logic, session keys or full smart-account permissions.
3. **Evolving account abstraction and agent use.** Base [described its Native Account Abstraction work in July 2026](https://www.base.org/blog/native-account-abstraction) and [agent wallet needs in May 2026](https://www.base.org/blog/the-agentic-economy-is-here). More advanced permissions and automated interactions increase the need for an inspectable evidence layer. VERRIFT does **not** claim to support every emerging smart account or agent permission model today.
4. **Broader adoption, explicitly sourced.** [Base's 2026 strategy](https://www.base.org/blog/2026-mission-vision-and-strategy) reported over $17 trillion of stablecoin volume in 2025 across its ecosystem. This is **a network claim from Base**, not VERRIFT revenue, customer traction or endorsement.

**The actual unlock shipped in V12:** at a particular Base block, VERRIFT can compare token balance and standard spender allowance and look for a delegated wallet code marker. The response is linked to a specific block hash. The broader 2026 roadmap is **context**, not a list of implemented features.

## Product capability matrix

| Capability | Availability | Trust boundary / limitation |
| --- | --- | --- |
| Token contract research | **Shipped**: public, no wallet | Provider-derived flags can be incomplete or contradictory. A successful scan is not an audit. |
| Save and compare scan reports | **Shipped**: public link and JSON digest | Snapshots live in a bounded server store (up to 250); SHA-256 is not an onchain attestation or durable archive. |
| Permission Exposure Lens | **Shipped V12**: public, no wallet | Checks **one** owner/token/spender triple at a pinned Base block; `balanceOf`/`allowance` do not guarantee transferability. |
| EIP-7702 delegation marker | **Shipped V12**: read-only code pattern | Detects a marker, **not** the security of its delegate, session keys or other wallet policies. |
| ERC-20 allowance sampling | **Shipped**: authenticated workspace | Recent event window only; not a complete history and not Permit2 subpermission enumeration. |
| Revoke preparation and verification | **Shipped**: wallet-approved action, public receipt check | Gas and user consent required; receipt verification checks exact calldata and current standard allowance. |
| Wallet Passport and activity | **Shipped**: authenticated wallet workspace | Public balance/nonce; history depends on Blockscout access. Legacy optional Sepolia anchor is not Mainnet token issuance. |
| Daily streak / VERRIFT Points | **Shipped**: header-level engagement | Points are nontransferable, have no cash value, and are not redeemable for $VIBES. |
| $VIBES holdings | **Shipped**: real Base contract read | Holdings do not imply VERRIFT is sponsored by the token issuer. |
| ETH to $VIBES swap | **Conditional**: uses 0x when `ZEROX_API_KEY` is configured | Quotes depend on route/liquidity, real swaps always require the user's wallet and may fail or incur losses. |
| User alerts / monitoring / enterprise API / SolNeutral integration | **Not shipped** | Planned or possible uses only. No background monitoring, paid plans or partner integrations are live. |

### How the exposure measurement works

This is a deliberately narrow standard ERC-20 measurement. All relevant calls are read-only:

```text
GET /api/token/exposure?owner=<WALLET>&token=<ERC20>&spender=<SPENDER>
  | 1. eth_chainId => require Base Mainnet (8453)
  | 2. eth_blockNumber => choose B
  | 3. eth_getBlockByNumber(B) => record B and block hash
  | 4. eth_call balanceOf(owner) at B
  | 5. eth_call allowance(owner,spender) at B
  | 6. eth_getCode(owner) and eth_getCode(spender) at B
  | 7. optional eth_call decimals() at B
  v
  { blockNumber, blockHash, owner, token, spender,
    balanceRaw, allowanceRaw, potentiallyExposedRaw,
    activeAllowance, unlimitedAllowance, ownerCode, limits }
```

For a standard token, `potentiallyExposedRaw = min(balanceRaw, allowanceRaw)`. This represents **a bounded comparison of reported ERC-20 units**, not an expected loss or maximum value at risk in dollars. With a zero current balance, an existing unlimited allowance still matters for future incoming tokens. Values are shown in raw units if token decimals are unavailable or nonstandard.

A returned Base block hash is evidence of what one configured RPC reported. It is **not a cryptographic proof to the user that the server told the truth**; independent clients can verify the block and calls themselves. Onchain finality and token transfer conditions are separate issues.

## Architecture and APIs

```text
public/                 Accessible landing, /verify, /app, styles and browser clients
lib/token-intel.js      Provider scanning, bounded evidence record and report comparison
lib/exposure.js         Same-block RPC reads + EIP-7702 bytecode marker detection
lib/wallet-safety.js    Base Mainnet ERC-20 allowance/revoke verification
lib/vibes-swap.js       Optional wallet-approved 0x ETH -> VIBES quotes and verification
lib/auth.js             Supabase wallet sign-in and secure session cookies
lib/store.js            Supabase-backed state, local development fallback
lib/app.js              HTTP routes, authorization, validation and rate limits
api/index.js            Vercel function
supabase/schema.sql     Database initialization
scripts/, tests/        Local checks and deterministic tests
```

Public JSON endpoints:

| Endpoint | Purpose | Wallet required? |
| --- | --- | --- |
| `GET /api/token/check?address=0x...` | Current provider-backed Base contract check | No |
| `POST /api/token/scans` | Save fresh research, optionally `compareTo` an earlier `scan_...` | No |
| `GET /api/token/scans/:id` | Read a retained timestamped scan record | No |
| `GET /api/token/exposure?owner=...&token=...&spender=...` | Current block-pinned ERC-20 permission exposure | No |
| `GET /api/verify/revocation?...` | Check exact confirmed revoke and zero current allowance | No |
| `GET /api/public/scan?address=0x...` | Basic live public wallet overview | No |
| `GET /api/wallet/approvals` | Sample recent ERC-20 approval events | Yes |
| `GET /api/wallet/allowance?token=...&spender=...` | Read wallet allowance | Yes |
| `POST /api/wallet/revoke/verify` | Save a verified signed-in wallet action | Yes |

The public research endpoints are designed for inspection and possible **server-to-server builder pilots**. They are **not a production paid API**: current per-instance rate limiting is best effort and there is no public service-level agreement, partner key issuance or metering. Refer to [BACKER_CASE.md](BACKER_CASE.md) for the business hypothesis and [METHOD_AND_LIMITS.md](METHOD_AND_LIMITS.md) for evidence semantics.

### Integrating with another project

A Base application can call the public endpoint from its own backend to show an allowance preflight and present the limitations verbatim:

```js
const params = new URLSearchParams({ owner, token, spender });
const response = await fetch(`https://verrift.xyz/api/token/exposure?${params}`);
if (!response.ok) throw new Error(`VERRIFT research unavailable: ${response.status}`);
const { exposure } = await response.json();
console.log(exposure.blockNumber, exposure.allowanceRaw, exposure.ownerCode);
```

All inputs are addresses, not passwords or private keys. The endpoint **does not know which permissions are safe**. Never treat `activeAllowance=false` as proof the wallet has no other exposures. Do not retry indefinitely or scrape an unbounded number of addresses. A partner offering automatic scans will need consent, durable rate limits and an explicit data-use policy.

## Developer setup

Requires **Node.js 22+**, a compatible EVM wallet for authenticated features, and **Supabase** for production persistence. There are no npm runtime packages; the project is vanilla JavaScript using Node built-ins and browser APIs.

```bash
npm ci
npm run setup
npm run dev
# Visit http://localhost:3000
# Public research: http://localhost:3000/verify
npm run verify
```

Copy `.env.example` and provide `SESSION_SECRET` (at least 32 characters), `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`. To enable real wallet login, enable **Supabase Auth > Web3 > Ethereum** and allow your deployment domain. Apply [`supabase/schema.sql`](supabase/schema.sql). The following are optional and must remain server-side: `ANTHROPIC_API_KEY`, `BLOCKSCOUT_API_KEY`, `ZEROX_API_KEY`, `GOPLUS_ACCESS_TOKEN` and `ADMIN_WALLET_ADDRESS`. `BASE_MAINNET_RPC` defaults to the public `https://mainnet.base.org`, which may have availability or rate-limit constraints. `PUBLIC_ORIGIN` should be set to the production hostname.

### Deploying

1. Push the repository to [paulos-ui/verrift](https://github.com/paulos-ui/verrift) or your confirmed owner-controlled repository. The supplied `github.com/verrift` URL is an account/organization-style address and **is not itself a repository clone URL**.
2. In Vercel select Framework **Other**, root `./`, build command `npm run build`, output directory `public`, Node.js 22+.
3. Set the required environment variables in Vercel. **Never** put Supabase secret keys or API secrets in the browser, README or Git history.
4. Connect Supabase and apply the schema. In Supabase enable Ethereum Web3 auth and allow the deployed domain.
5. Redeploy. Verify `/healthz`, `/api/status`, `/verify`, the new `/api/token/exposure` on a real Base owner/token/spender, and public research scans. Check logged-in workspace separately.
6. Only if you intend to allow real wallet swaps, configure 0x and deliberately test the quote, approval, confirmation and receipt flows with full understanding of fees and risk.

Detailed setup and recovery commands: [DEPLOYMENT.md](DEPLOYMENT.md) · [GITHUB_PUSH.md](GITHUB_PUSH.md) · [RELEASE_CHECKLIST.md](RELEASE_CHECKLIST.md).

## Why a backer or developer would care

**The proposed business is the evidence infrastructure, not a new reward token.** The public scanner demonstrates the data model and helps acquire users. Repeated permission checks and verifiable records could serve wallet applications, dashboards and treasury operations that want explainable, chain-pinned preflight results. The **developer API and monitored report history** are the most plausible future paid capabilities, contingent on user validation, reliability and consent.

- **Users** get free inspectable warnings and targeted allowance checks rather than a paid safety promise.
- **Builders** could integrate a read-only check before a risky action and provide customers a source-linked audit trail of the check they saw.
- **Teams/treasuries** could eventually purchase rate-limited API access, monitoring and controlled retention, but **no paid product is live today**.
- **SolNeutral** is a *separate* Solana-focused builder project discussed as a possible future workflow where research and verification principles might be reusable. VERRIFT currently covers **Base**, not Solana. No actual SolNeutral integration or business backing is claimed.
- **Base** supplies the public chain, standards and developer ecosystem that VERRIFT uses. That is technical alignment, **not funding, partnership, certification or promotion by Base**.

The exact milestones, costs, revenue assumptions, honest current stage and testable adoption criteria are described in [BACKER_CASE.md](BACKER_CASE.md). There are **no verified paying customers or funding commitments** in this release.

## Milestones with acceptance criteria

| Window | Output | Measurable release gate |
| --- | --- | --- |
| **Shipped by Nov 9, 2026** | Read-only Base scanner, dated scan records, same-block exposure reads, EIP-7702 marker, wallet-approved revocation + receipt checks | `npm run verify` passes; public endpoints return real Base data when providers are available |
| **Days 1–30 (Nov 10–Dec 9)** | Reliable storage/rate limiting, provider uptime dashboard and stronger independent chain verification | Sustained production monitoring with error metrics; no unknown provider failures marked “safe” |
| **Days 31–60 (Dec 10–Jan 8)** | Opt-in token/permission watchlists and user-requested rechecks; documented integration beta | 5 invited pilot builders **target**, no implied commitments; retention/usage baselines published |
| **Days 61–90 (Jan 9–Feb 7)** | API key management, metering, billing feasibility and independent security review | Security review findings published, at least 2 paying pilots **target**, otherwise report zero honestly |

These are **future targets, not promises of releases, grants, users or revenue**. No ongoing automatic watch job is running in this version. VERRIFT will only claim milestones that can be reproduced from deployments, code, receipts, support logs and user consent.

## Method, security and honest limitations

- A SHA-256 digest of a saved JSON report helps detect changes in a downloaded document but is **not** a signature, immutable record or finalized onchain proof.
- Research services may disagree. GoPlus and Honeypot.is can report stale or unsupported data; DEX Screener liquidity can change immediately; Base RPC can rate-limit or be unavailable.
- A read-only exposure measurement is **not** a token audit, prediction of fraud or proof of ability to sell. A deployed contract might include nonstandard transfer conditions. A spender with allowance cannot necessarily spend the calculated units. An EIP-7702 marker may be legitimate, and its absence does not exclude other delegated or smart-wallet control planes.
- Revocation verification confirms specific calldata, sender, token, successful receipt and a zero **current** allowance. It does not mean every permission, Permit2 grant, NFT approval or session key has been removed.
- Saved scan records have bounded retention and may be pruned. Stateless Vercel rate-limit attempts are best effort. Do not treat this as high-assurance public monitoring infrastructure without production hardening.
- The older repair-lab and optional Base Sepolia passport anchor remain available for their original use case. These are **not** a promise of Mainnet token rewards.
- Daily VERRIFT Points have **no conversion, redemption or monetary value**. `$VIBES` is a separate third-party token; checking or buying it is not required for the public safety features.
- Wallet auth uses signed challenges and Supabase Auth; VERRIFT does not ask for seed phrases. Never paste secrets or private keys into token/allowance fields.

Security details: [SECURITY.md](SECURITY.md) · [METHOD_AND_LIMITS.md](METHOD_AND_LIMITS.md).

## Evidence and validation

- Unit and HTTP endpoint tests cover deterministic token provider normalization, scan records, simulated wallet ownership, revocation verification, optional swap proof, and same-block exposure calls. Run `npm run verify` locally.
- Test fixtures deliberately simulate chain providers. A passing suite **does not prove the deployed application, live third-party services, Supabase, authenticated wallets or real transactions all work**.
- Judge demo: start with a **real contract**, perform a public scan, save a dated report, inspect a specific allowance pair, and independently verify a real revoke only if a confirmed transaction exists. Do not invent user counts or demonstrate a successful swap that did not happen.
- The public interface deliberately leaves coverage and limitations visible. Real-world screenshots and receipts should be collected only after live verification.

See [TEST_REPORT.md](TEST_REPORT.md), [DEMO_SCRIPT.md](DEMO_SCRIPT.md), and [V12_RELEASE.md](V12_RELEASE.md) for release-specific details.

## Source, project history and disclosure

Canonical source repository: **https://github.com/paulos-ui/verrift**. The additional supplied account-style address **https://github.com/verrift** needs repository ownership and destination verification before treating it as a clone link. Older V5–V11 release logs remain in `docs/releases/` and the project root for transparency; they are **history**, not current operational documentation.

Created as an independent hackathon project. Open-source under the [MIT License](LICENSE). Development and feature claims should accurately follow the hackathon rules. No affiliation, investment return, safety guarantee or official ecosystem endorsement is implied.
