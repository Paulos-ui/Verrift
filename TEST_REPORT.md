# VERRIFT | Verification report

**Environment:** Node.js 22.16.0 / npm 10.9.2 / Chromium installed. Execution date: November 7, 2026.

## Executed checks

- `npm install --offline --ignore-scripts --no-audit --no-fund` | passed; no third-party dependencies.
- `npm run lint` | passed Node syntax/JSON validity. This script is **not ESLint**.
- `npm test` | **20/20 passing**, using Node test runner. All actual tests are in `tests/core.test.js`.
- `npm run build` | passed JavaScript syntax and JSON validity, not a framework bundle or TypeScript compilation.
- Local HTTP root `GET /` | **HTTP 200**, tested with curl. Local REST endpoints exercised in integration tests.
- Chromium `set_content` layout rendering with real HTML/CSS/app JS, stubbed API data | passed desktop 1440px, tablet 768px, mobile 390px. No JS page errors or horizontal overflow; case detail and creation dialog rendered correctly in all three layouts.

## Tested API/security behaviors

Domain/path validation, blocked private addresses, exact DNS TXT/HTTPS proof requirements, HTTP assertion truthfulness, admin session and Origin checks, sandbox state/repair progression, owner verification gate, confirmed external GET checks using injected controlled probe, read-only share tokens, JSON exports, reward approval gate and idempotency, Base RPC transfer receipt verification, Anthropic request schema and bounded response, proof digest stability and evidence binding, onchain proof calldata checks, duplicate anchor prevention.

## Unverified integrations

- Real browser navigation to localhost was blocked by Chromium's administrator policy (`ERR_BLOCKED_BY_ADMINISTRATOR`); the layout checks are not a live end-to-end browser session.
- No real Anthropic API key was supplied; the adapter was unit-tested with a controlled fake HTTP response only.
- No real wallet, Base Sepolia test ETH, onchain broadcast or independent live Base RPC receipt has been tested.
- No real third-party DNS challenge/public domain verified in this environment; test uses controlled proof resolver and probe results.
- No live Upstash or Vercel project configured or tested.
- Upstash optimistic concurrency and Vercel rewrite behavior are code-reviewed, but require live deployment tests.

## Risks before hackathon submission

The current code is a working local MVP with deterministic test flows, rather than a fully launched production service. Judge-critical external integration must be demonstrated with a live deployment, actual Base hashes, a genuine Claude analysis and real domain ownership proof if those features are claimed. The network and billing limitations are not represented as completed work.
