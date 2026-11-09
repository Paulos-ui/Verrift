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
