# VERRIFT V12 | Local verification report

**Project:** `VERRIFT-V12-PROOF-AND-BACKER`  
**Network intent:** Base Mainnet (8453) for public research, same-block permission check and standard ERC-20 revocation.  
**Verification:** `npm run verify` from source folder.

## Automated tests

**82/82 passing** after V12 changes. JavaScript syntax checks and Vercel config validation pass. New checks include:

- Every state read in the exposure measurement is pinned to the same captured block tag.
- Base chain ID and returned block/hash are checked, and invalid addresses or malformed ERC-20 responses fail safely.
- The standard raw-units exposure bound is computed deterministically; an active unlimited allowance remains important with zero current token balance.
- EIP-7702 delegation code marker is identified without pretending to evaluate delegate code security.
- The public HTTP endpoint succeeds without an authenticated wallet and rejects invalid inputs.
- Public interface, responsive stylesheet and dated scan functionality are present.
- Existing identity, token research, saved scan comparison, wallet safety and optional 0x swap tests remain passing.

## Local HTTP smoke

- `GET /` -> HTTP 200
- `GET /verify` -> HTTP 200
- `GET /docs` -> HTTP 200
- `GET /exposure.js` -> HTTP 200
- `GET /ui-v12.css` -> HTTP 200
- `GET /healthz` -> HTTP 200
- `GET /api/token/exposure` with invalid addresses -> HTTP 400

## Browser static preview

Chromium renders desktop (1440 px), tablet (768 px) and mobile (390 px) HTML/CSS without horizontal overflow. This is **static HTML/CSS preview**, not live JavaScript, authenticated wallets or a public deployment. No claim of successful onchain execution follows from these previews.

## Not verified

Live Base RPC `eth_call` responses against your real production infrastructure, actual EIP-7702 delegated wallet, production Supabase state, external security source availability, Vercel deployment, genuine wallet revoke, live token swap, financial revenue, funding and any partnership. Mocked unit tests cannot replace these checks.

The V12 product release should not be described as audited, fully trusted, continuously monitoring all wallet permissions, or having guaranteed Fundable 90+.
