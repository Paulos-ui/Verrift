# VERRIFT V12.1 | Wallet Login Hotfix

## Fixed

1. **Cross-origin login rejection**: VERRIFT accepts same-site requests from its three verified deployment origins and optional explicitly configured HTTPS origins. Malicious `Origin` values remain blocked.
2. **Wallet sign-in message**: the signed SIWE URI and host now match the actual trusted page, rather than a possibly outdated `PUBLIC_ORIGIN` value.
3. **Duplicate MetaMask**: the wallet selector prefers EIP-6963 discovery and ignores repeated legacy providers of the same wallet name. Distinct wallet brands remain selectable.

## Required production settings

- Vercel: `PUBLIC_ORIGIN=https://verrift.xyz` (redeploy after saving).
- Supabase: Authentication > URL Configuration > Site URL `https://verrift.xyz`. Add your actual production domains to allowed redirect URLs.
- Supabase: Authentication > Providers > Web3 > Ethereum enabled.
- Optional: `ALLOWED_ORIGINS` for additional owned HTTPS domains, comma-separated, never a wildcard.

## Smoke test

Open `https://verrift.xyz/app` in a new browser tab, refresh, select a wallet once, accept the sign-in message and confirm the Wallet Passport loads. Test both MetaMask and OKX if installed. If login fails, inspect `/api/auth/verify` in browser Network and your Supabase Auth logs.

No real Mainnet transfers or swaps are necessary to test login.
