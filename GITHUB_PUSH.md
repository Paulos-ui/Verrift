# Push VERRIFT updates to `paulos-ui/verrift`

## Extract without mkdir (WSL)

Download `verrift-landing-v4.zip` to your Windows Desktop. This command creates the `verrift` directory automatically when needed and preserves its `.git` folder when one exists:

```bash
cd "/mnt/c/Users/MY PC/Desktop" && unzip -oq "verrift-landing-v4.zip" -d "verrift" && cd "verrift"
```

Check the code:

```bash
rm -f server.js  # Remove legacy Vercel auto-detected server entrypoint
npm ci
npm run verify
git status --short
```

If you already pushed the repo to GitHub, **do not run `git init` again**:

```bash
git add -A
git commit -m "Add interactive VERRIFT landing page and app route"
git push origin HEAD
```

If this is the first time, create an empty `paulos-ui/verrift` GitHub repository and run:

```bash
git init
git branch -M main
git remote add origin https://github.com/paulos-ui/verrift.git
git add -A
git commit -m "Launch VERRIFT public wallet platform"
git push -u origin main
```

Always confirm the `.env` file remains excluded. For Vercel deployment, see `DEPLOYMENT.md`.


### What changed in this ZIP

The real application dashboard is now at `/app`, and a separate public interactive landing page is at `/`. The old `server.js` must still be removed after unzipping if present locally. For the existing database startup error, see `VERCEL_DATABASE_NEXT.md`.
