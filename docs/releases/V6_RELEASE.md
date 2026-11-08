# VERRIFT V6 | Pine & Tide

## Changes delivered

- Forest-green workspace navigation, pure white content surfaces, ocean-blue accents and soft mint contrast. Former copper/orange theme has been replaced throughout the customer-facing pages, including the favicon and closing landing section.
- Public `/app` workspace home with **Connect wallet**. The previous guest/demo-mode workspace and sign-in splash have been removed. Landing page still navigates to `/app` without requiring a wallet to read the public content.
- Native dialog lists **detected injected wallets only** through EIP-6963 and legacy EIP-1193. Unsupported wallets are not represented as connected. If none are detected, show direct official download links. No WalletConnect SDK or universal mobile wallet selector is claimed.
- Wallet signature flow still uses the existing Supabase Web3 authentication adapter. The server never requests private keys or custody funds.
- Anonymous requests to read private `/api/data`, create cases or change test-target state now return 401. The controlled service remains available to authenticated users.
- Original repair, ownership verification, Anthropic analysis and Base Sepolia proof/payment logic preserved.
- Existing tests adapted to wallet-required behavior, plus new UI and access regression coverage.

## Verification and scope

- `npm run verify` covers syntax, mock-backed backend routes and source structure.
- Static Chromium previews at 390px, 768px and 1440px cover initial public home and wallet picker, with no overflow or page errors. Mock-provider browser exercise verifies picker selection leads to the authenticated dashboard and that case dialog opens. These are **not live wallet or Supabase results**.
- Direct localhost browser navigation is blocked by the browser environment; local HTTP GET checks were executed separately.
- Live deployment on Vercel, authentication with an installed real wallet, Anthropic requests, Supabase writes and Base transactions remain user-side acceptance checks.

## Production checklist

1. Verify the Vercel project has the latest commit, correct Output Directory (`public`) and existing rewrite configuration (`vercel.json`).
2. Confirm `SESSION_SECRET`, `PUBLIC_ORIGIN`, `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `ANTHROPIC_API_KEY`, and `BASE_SEPOLIA_RPC` are set as appropriate. Do not expose secret values in GitHub or in screenshots.
3. Run `supabase/schema.sql` in Supabase SQL Editor; enable Ethereum/Web3 wallet authentication in Supabase Auth.
4. Verify `/api/status` reports `persistence: supabase`, and complete a real wallet login, create a case, run a failure and a passing rerun.
5. Verify the site at `/`, `/app`, `/docs`, and `/sandbox` on desktop and mobile before submitting.
