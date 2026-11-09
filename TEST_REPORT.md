# VERRIFT V9 | Test results

**Local automated suite:** 62/62 tests passed (`npm run verify`).

**Static/browser visualization:** Chromium rendered V9 wallet overview and Get VIBES screens with mock account data at 390, 768 and 1440 px. No horizontal overflow or uncaught JavaScript errors were observed. Browser captures were made from static preview HTML, not from your deployed production server or an authenticated real wallet.

**Local HTTP smoke:** GET `/`, `/app`, `/ui-v9.css`, `/healthz`, and `/api/status` each returned HTTP 200. An unauthenticated swap POST returned HTTP 401. This is the correct access boundary.

**New test coverage:** strict ETH amount parsing, Base 8453/token pair checks, real quote response validation using mocked 0x, missing API key handling, failed liquidity and mismatched amount rejection, signed quote proof tampering, confirmed receipt and token transfer verification, user isolation and auth gating, UI/wording checks. Earlier owner/domain/sandbox/receipt/Supabase unit tests continue to pass.

**Not verified:** a real quote fetched with your production `ZEROX_API_KEY`; live Base Mainnet swap from an actual wallet; real Blockscout, Supabase, or Anthropic calls in this container; Vercel deployment; performance audit on the real public domain. There is NO funded real VIBES daily reward mechanism.

**Tooling note:** `npm run build` checks JavaScript syntax and JSON. It is not a TypeScript compilation. No claims of independently audited smart contracts are made.
