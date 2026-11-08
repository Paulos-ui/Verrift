# VERRIFT V8 | Update paulos-ui/verrift from WSL

Download `verrift-signal-room-v8.zip` to the Windows Desktop. From WSL Ubuntu run:

```bash
cd "/mnt/c/Users/MY PC/Desktop/verrift"
unzip -oq "/mnt/c/Users/MY PC/Desktop/verrift-signal-room-v8.zip" -d .
rm -f server.js
npm ci
npm run verify
git status --short
git add -A
git commit -m "Upgrade VERRIFT wallet safety and VIBES utility"
git push origin HEAD
```

The `-d .` target overwrites into the **existing** folder without replacing `.git`. Do not run `git init` again. Do not add `.env` or keys to GitHub. Once pushed, confirm Vercel is using the newest commit and production environment variables are saved. Full instructions in `DEPLOYMENT.md`.
