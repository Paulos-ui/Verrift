# Push VERRIFT V6 to `paulos-ui/verrift`

Download `verrift-pine-tide-v6.zip` to your Windows Desktop. The existing project is under `Desktop/verrift`. Run this in WSL; it updates the same folder and preserves `.git`:

```bash
cd "/mnt/c/Users/MY PC/Desktop/verrift"
unzip -oq "/mnt/c/Users/MY PC/Desktop/verrift-pine-tide-v6.zip" -d . && rm -f "/mnt/c/Users/MY PC/Desktop/verrift-pine-tide-v6.zip" server.js
npm ci
npm run verify
git status --short
git add -A
git commit -m "Launch VERRIFT Pine and Tide wallet-first workspace"
git push origin HEAD
```

If Git reports no changes, do not create an empty commit. If `origin` is not configured, create a repository at `https://github.com/paulos-ui/verrift` first and set the remote. If your existing repo is not `Desktop/verrift`, change only the folder path.

**Vercel:** Pushes to the connected production branch normally trigger a deployment. The deployment settings and variables do not need changes solely for this visual/wallet-choice update. Confirm Supabase (including `supabase/schema.sql`, Ethereum/Web3 Auth) and `SESSION_SECRET`, `PUBLIC_ORIGIN`, and Anthropic variables are configured. Check `/api/status`, then perform a full live wallet and test flow.

The ZIP excludes `.env`, private credentials, local runtime state, browser test mocks and generated screenshots.
