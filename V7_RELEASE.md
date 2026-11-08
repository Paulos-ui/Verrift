# VERRIFT V7 | Base Wallet Passport

## Why the product changed

The V6 release made every user create a developer repair case. V7 makes the main flow relevant to an everyday Base wallet holder. The repair lab remains available but is no longer the primary user journey.

## First-time user journey

1. Read the public landing page at `/` and enter `/app`.
2. Choose a browser-detected wallet, approve the account connection, then sign a Web3 authentication message using Supabase. No ETH transfer is involved.
3. See a congratulations dialog, a read-only Base Mainnet dashboard with ETH balance and outgoing account nonce, and (when indexed history is configured) recent native transfers, native ETH/gas totals across the returned sample, and repeated counterparties.
4. Select **Generate my receipt** to persist a dated, server-computed wallet snapshot with a SHA-256 fingerprint.
5. Optionally submit a zero-value self-transaction with the fingerprint on **Base Sepolia**. Network switching happens here, not during wallet sign-in. VERRIFT confirms the receipt by checking the real RPC transaction input, sender, recipient, value, block, and status.
6. Download a branded PNG passport. Or open an X share draft. The shared URL can display a generic VERRIFT logo image; users manually attach the personalized PNG if they wish.

## What this does NOT claim

- Signature-based login verifies **control of the address**, not that a person is financially trustworthy, identity-verified, or safe.
- Balances are real-time native ETH readings. Nonce is the number of transactions sent by the account, not a complete count of all interactions.
- Indexed history is optional and limited. **"ETH sent (sample)" is not all-time spending or USD spending**, and token transfers are not included in that aggregate.
- Sharing to X requires a deliberate click and user confirmation. No account tweets automatically.
- Base Sepolia test ETH and testnet transaction receipts have no mainnet financial value. Nothing is charged until the user explicitly confirms an optional proof transaction in their wallet.
- The user interface does not receive your Blockscout API key or Supabase server secret.
- The product still includes the original repair module, which requires ownership verification for external website checks.

## Production environment

Existing V6 variables remain:

```
SESSION_SECRET=<random 64-character secret>
SUPABASE_URL=<project URL>
SUPABASE_PUBLISHABLE_KEY=<publishable key>
SUPABASE_SECRET_KEY=<server-only secret key>
PUBLIC_ORIGIN=https://verrift.vercel.app
ANTHROPIC_API_KEY=<optional real key>
CLAUDE_MODEL=claude-sonnet-4-6
BASE_SEPOLIA_RPC=https://sepolia.base.org
```

V7 optional additions:

```
BASE_MAINNET_RPC=https://mainnet.base.org
BLOCKSCOUT_API_KEY=<key from https://dev.blockscout.com/>
```

Blockscout's indexer unlocks transaction lists and counterparties. Without it, Base Mainnet RPC still supplies native ETH balance and outgoing account nonce. Indexer access and rate limits depend on your developer account. Do not expose any API key in client JavaScript.

## Database

Keep the existing Supabase project and `supabase/schema.sql` table. V7 stores passport snapshots within the existing JSON `verrift_state` record; no migration is necessary. Verify reads/writes in production and do not reset or delete database state.

## Deployment procedure

1. Download `verrift-wallet-passport-v7.zip` to your Windows Desktop.
2. In WSL: `cd "/mnt/c/Users/MY PC/Desktop/verrift"`.
3. Update in place: `unzip -oq "/mnt/c/Users/MY PC/Desktop/verrift-wallet-passport-v7.zip" -d . && rm -f "/mnt/c/Users/MY PC/Desktop/verrift-wallet-passport-v7.zip" server.js`.
4. Run `npm ci && npm run verify`.
5. Inspect `git status`, then `git add -A && git commit -m "Make VERRIFT wallet-first with Base Passport" && git push origin HEAD`.
6. In Vercel, add `BLOCKSCOUT_API_KEY` only if you want indexed history. Set `PUBLIC_ORIGIN` to your exact deployed URL. Redeploy after environment changes.
7. Check `/api/status`, wallet sign-in, read-only wallet analytics, receipt generation, and optional Sepolia anchoring with a funded test wallet.

## Testing limits

Unit and mocked integration tests plus static Chromium page rendering are executable locally. The current build has not been verified with your real Supabase project, authenticated browser wallet, Base Sepolia transaction, or Blockscout API key. The local `npm run build` checks JS syntax/JSON; it is not a TypeScript compilation.
