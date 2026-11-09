# VERRIFT V12 | Deploy the source without losing Git history

Save `VERRIFT-V12-PROOF-AND-BACKER.zip` to your Windows Desktop.

Run in WSL Ubuntu (the existing repository remains at `C:\Users\MY PC\Desktop\verrift`):

```bash
cd "/mnt/c/Users/MY PC/Desktop/verrift"
unzip -oq "/mnt/c/Users/MY PC/Desktop/VERRIFT-V12-PROOF-AND-BACKER.zip" -d .
rm -f server.js
npm ci
npm run verify
git status --short
git add -A
git commit -m "Add same-block Base permission evidence and product strategy"
git push origin HEAD
```

The ZIP is source-only and does **not** contain `.git` or `.env`. It overwrites matching source files **in place** without changing remotes or existing Git history. The `rm -f server.js` command removes a legacy server entry that otherwise conflicts with the current Vercel layout. Never force push, delete `.git`, or commit API credentials.

Your established source path is `https://github.com/paulos-ui/verrift`. The supplied `https://github.com/verrift` link is an account or organization-style URL, not itself a repo URL. Confirm ownership before using it as your submission's GitHub source field.

After push, check the real Vercel deployment. A successful push or 82 passing mocked tests **does not establish** that live token providers, the new permission endpoint, Supabase, wallet signing, or swaps actually work in production.
