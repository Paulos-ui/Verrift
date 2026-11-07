# VERRIFT | Deployment and submission guide

## 1. Prepare on Windows

Extract `verrift-github-ready.zip` into a **dedicated folder on your Desktop** (not inside Nightwatch or a previous hackathon repo). The name should be `verrift`.

Git Bash example (adjust `MY PC` to your actual Windows account directory):

```bash
cd "/c/Users/MY PC/Desktop/verrift"
npm ci
npm run setup
npm run verify
npm run dev
```

Open http://localhost:3000. The setup command prints the generated admin password; save it in a password manager. Keep the `.env` out of Git. Sign in and run the break → fail → restore → pass sandbox sequence. Make sure your computer uses Node 22 or later.

## 2. Configure Claude

Sign in to the official Anthropic Console and create an API key. Add it **only** in `.env` locally and as `ANTHROPIC_API_KEY` in Vercel project Environment Variables. Choose a currently available Claude model such as `claude-sonnet-4-6` via `CLAUDE_MODEL`. In a case with evidence, click **Analyze current evidence**. Real API usage may incur charges. Never expose the key on a frontend or in a screenshot.

## 3. Configure Base Sepolia testnet

Install or open a compatible EIP-1193 wallet (Coinbase Wallet or MetaMask). Use a **test wallet**, not a wallet holding valuable assets. VERRIFT asks the wallet to switch to Base Sepolia (84532). Fund the test wallet with **testnet ETH from a legitimate faucet** and never send mainnet ETH to a testnet address expecting it to appear on testnet.

1. Connect using the header button.
2. Record a failed run, fix, rerun and see the case status **verified**.
3. Select **Anchor evidence on Base**. Approve a zero-value transaction to your own test wallet containing the evidence SHA-256 fingerprint. Gas is still required.
4. Wait for confirmation. Click **Confirm proof anchor**; VERRIFT verifies the actual receipt and input using Base Sepolia RPC. If pending, retry confirmation using the same hash | do not send twice.
5. Set recipient + test ETH reward. Approve the direct transfer in your wallet; once confirmed, verify the receipt. No escrow contract is deployed.

Check the exact hash on https://sepolia.basescan.org. All actual transaction hashes must come from your wallet and be independently verifiable.

## 4. Persistent storage for Vercel

Use a managed Upstash Redis instance with REST API. Create a database, obtain the **REST URL** and **REST TOKEN**, and add these two values to Vercel's server-side environment variables. The application stores one JSON state object under `verrift:state:v1` using compare-and-set to reduce concurrent update conflicts. This connector has not been live-tested here.

Local development uses a JSON file under `data/`, which is correctly excluded from Git. **Do not rely on local file persistence on Vercel.** The database will be empty on initial deployment, which is expected; create your cases after deploying.

## 5. GitHub

For a copy-paste guide with author identity checks, first-push commands and in-place updates, see [GITHUB_PUSH.md](GITHUB_PUSH.md).


Create an empty repository named `verrift` under your `paulos-ui` GitHub account, then inside your **existing VERRIFT folder**:

```bash
git init
git branch -M main
git add -A
git commit -m "Build VERRIFT evidence and Base testnet MVP"
git remote add origin https://github.com/paulos-ui/verrift.git
git push -u origin main
```

If you already created a repo or added a remote, preserve `.git` and run `git remote -v` before making any remote changes. Do not overwrite previous Git history.

## 6. Vercel

1. Open https://vercel.com/new and import the `paulos-ui/verrift` repository.
2. Choose **Other** as the framework preset if Vercel asks. Root directory is the project root. The project has no bundler and uses `public/` for static files and `api/index.js` for its serverless API. Build command can be empty; it is not a Next.js project.
3. Configure `ADMIN_PASSWORD` (long random), `SESSION_SECRET` (long random), `PUBLIC_ORIGIN` (your final `https://...vercel.app` URL), `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `ANTHROPIC_API_KEY` (optional but strongly recommended for the demo), `CLAUDE_MODEL=claude-sonnet-4-6`, and `BASE_SEPOLIA_RPC=https://sepolia.base.org`.
4. Set those for Production, and Preview too if you will test previews. Never set API keys as `NEXT_PUBLIC_` variables.
5. Deploy. If Vercel gives a different URL than expected, update `PUBLIC_ORIGIN` and redeploy.
6. Verify these pages on the actual URL: `/`, `/docs`, `/sandbox`, `/healthz`, and `/api/status`.
7. Sign in and perform the sandbox failing/passing sequence, open a shareable `/report/...` link in a private browser window, run Claude with a real API key, and check Base receipts with a connected test wallet.
8. Run an owner-verified external check of a domain you control. Check Vercel function logs for any errors, especially Upstash REST, DNS and routing.

**Vercel integration has not been deployed or smoke-tested in this environment.** If your Vercel plan/framework preset does not recognize the combined static files + serverless entry, adapt the route configuration after inspecting the deployment log; do not announce a working live link before verifying it.

## 7. Final hackathon submission

Submit before **Monday, November 9, 2026 at 22:00 UTC (23:00 Nigeria time)**, as shown in the provided Vibeathon 02 rules. The entrant needs a genuinely working MVP and a live URL. Emphasize the end-to-end proof workflow and provide a direct live report link only after you create a real report and verify its URL.

Keep the demo truthful: the controlled example is a deterministic HTTP/API-contract demonstration; Base anchoring and rewards must be real testnet transactions to claim onchain execution. If a connector is unavailable, explain that it is configured but not yet proven instead of editing screenshots or inventing test data.

## 8. Source update / ZIP overwrite

To replace source in a preexisting desktop VERRIFT folder **without touching `.git`**, first inspect the ZIP and back up any locally modified source you want to retain. Then use the user's preferred overwrite pattern:

```bash
cd "/c/Users/MY PC/Desktop/verrift"
unzip -oq "/c/Users/MY PC/Desktop/verrift-github-ready.zip" -d . && rm -f "/c/Users/MY PC/Desktop/verrift-github-ready.zip"
npm ci
npm run verify
git add -A
git commit -m "Ship VERRIFT proof-of-fix MVP"
git push origin HEAD
```

The downloaded archive contains source only: `.env` and `.git` are never included.
