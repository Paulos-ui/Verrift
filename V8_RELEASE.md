# VERRIFT V8 | Signal Room: Release notes and evidence

## Originality hypothesis

Wallet dashboards answer “what happened?” VERRIFT adds a smaller actionable loop: **observe a Base Mainnet allowance → understand what it means → explicitly approve a revoke → independently verify the transaction and current onchain state → share the public receipt**. This is a focused UX and evidence proposition, not a claim that allowance revocation itself is new. Existing specialist tools already support approval scanning and revocation.

## What was changed in this upgrade

- Preserved and reorganized the source uploaded as `verrift-latest.zip`.
- Removed the hardcoded V8/V9 landing and workspace dossier that asserted risk, malicious routers, EIP-7702 revocation and fixed score improvements without checking the user's wallet. Removed its misleading browser-side transaction button.
- Retained the white/forest/mint editorial design and custom mark. Placed a real read-only Base inspector on the landing, then a clear safety-action explanation, then optional product background and the final CTA. Removed duplicated marketing sections.
- Implemented standard ERC-20 allowance checks, recent windowed Approval event discovery, user-initiated Base Mainnet revoke calldata, receipt + current allowance verification, and account-scoped verified revocation history.
- Added a Base Mainnet VIBES `balanceOf` read against the independently sourced contract; nontransferable 10-point daily check-ins with optional 5-point VIBES holder bonus, once per UTC date.
- Added optional Anthropic explanations using fresh onchain allowance observations. No private wallet keys are sent.
- Added `/verify` for anyone to validate a shared Base Mainnet revoke proof without signing in.
- Preserved optional Wallet Passport, Base Sepolia proof anchoring, and developer Repair Lab + ownership-verified domain checks.

## Honest boundaries

The scanner is not exhaustive and cannot prove a wallet is safe; `eth_getLogs` scans 8,000 recent blocks. Standard ERC-20 allowance reads are direct RPC. Permit2 internal permits, NFT operators, EIP-7702 account delegation, arbitrary smart account authorization and malicious-spender classification are out of scope. A revoked allowance can be re-granted later. The public proof page checks current state at visit time.

The VIBES holder bonus is VERRIFT Points, not an onchain claim, financial payout, staking return or official token utility. A wallet only gets the holder bonus following a real balance read. Every transaction is explicitly approved by the user, with gas paid on Base Mainnet.

## Verification evidence

- `npm run verify` = source syntax + JSON validation and Node integration suite. Inspect `TEST_REPORT.md` for the exact run.
- Chromium static previews exercise real page template markup/CSS at 390px, 768px, 1440px and show no horizontal overflow. Full navigation to localhost is blocked by this environment.
- Live Supabase Web3 login, Base RPC provider rate limits, real mainnet revoke receipts, live Anthropic, and deployed Vercel functionality must still be confirmed separately.

## Source and deployment

The ZIP has no `.git`, node_modules, `.env`, wallet keys, deployment cache or recorded local wallet data. Follow `GITHUB_PUSH.md` to overwrite into the existing Desktop/verrift folder and push to paulos-ui/verrift. No new database schema is required if you ran `supabase/schema.sql` for V7. Keep existing Vercel keys and configure optional BLOCKSCOUT_API_KEY for activity history and ANTHROPIC_API_KEY for Claude explanations.
