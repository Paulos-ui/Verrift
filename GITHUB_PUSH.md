# VERRIFT V9: update the existing paulos-ui/verrift repository

Save `verrift-mainnet-v9.zip` to your Windows Desktop. Use **WSL**, not Git Bash:

```bash
cd "/mnt/c/Users/MY PC/Desktop/verrift"
unzip -oq "/mnt/c/Users/MY PC/Desktop/verrift-mainnet-v9.zip" -d .
rm -f server.js
npm ci
npm run verify
git status --short
git add -A
git commit -m "Add VIBES swap quotes, mainnet proof and daily check-in cards"
git push origin HEAD
```

This preserves `.git`, supersedes matching files, and relies on your existing GitHub to Vercel integration. Do not upload a `.env` or any secret. A GitHub push is not proof of a live functional swap: verify Vercel environment settings and quote availability after deployment.


## V10 2026 update

Save the new ZIP to your Windows Desktop, then in WSL run:

```bash
cd "/mnt/c/Users/MY PC/Desktop/verrift"
unzip -oq "/mnt/c/Users/MY PC/Desktop/verrift-v10-2026.zip" -d .
rm -f server.js
npm ci
npm run verify
git status --short
git add -A
git commit -m "Explain why Base wallet clarity matters in 2026"
git push origin HEAD
```

This preserves the existing `.git` folder. Do not commit local `.env` files.

**Link note:** `https://github.com/verrift` was provided as a GitHub address, but it is not a conventional `owner/repository` path. The established repository is `https://github.com/paulos-ui/verrift`. Both are linked in the footer for review; verify the short link before a submission.
