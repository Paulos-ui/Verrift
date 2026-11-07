# VERRIFT | GitHub publishing guide

Repository: **https://github.com/paulos-ui/verrift**

This repository is intended to contain VERRIFT only. Do not include Nightwatch or another project in this Git repository.

## One-time GitHub setup

1. Sign in at https://github.com/paulos-ui and choose **New repository**.
2. Repository name: **verrift**. Choose **Public** if appropriate for your hackathon submission.
3. **Do not** initialize it with a README, a .gitignore or a license. Those files already exist in the ZIP.
4. On Windows, extract the updated project ZIP directly into `Desktop/verrift`, with `package.json` at the root of that folder.
5. Open Git Bash. Replace the sample Windows username in the following command if necessary.

```bash
cd "/c/Users/MY PC/Desktop/verrift"
npm ci
npm run verify
```

Before committing, check the author identity. Set the email to your own email verified on GitHub or your GitHub noreply email. Do not use someone else's identity.

```bash
git config user.name "Jayking"
git config user.email "YOUR_VERIFIED_GITHUB_EMAIL"
```

**First push, if this folder does not already have a `.git` directory:**

```bash
git init
git branch -M main
git add -A
git status --short
git commit -m "Build VERRIFT proof-of-fix platform"
git remote add origin https://github.com/paulos-ui/verrift.git
git push -u origin main
```

Before committing, `git status --short` must not show `.env`, `node_modules/`, or private secrets. The ZIP already has a `.gitignore` for these files.

When GitHub requests authentication for an HTTPS push, sign in through Git Credential Manager or use an authorized personal access token. Your ordinary account password cannot be used as an HTTPS Git password.

## Update an existing VERRIFT folder

Preserve `.git`, your personal `.env`, and any work you have already committed. Place the latest ZIP on the Desktop, then run:

```bash
cd "/c/Users/MY PC/Desktop/verrift"
unzip -oq "/c/Users/MY PC/Desktop/verrift-github-ready.zip" -d . && rm -f "/c/Users/MY PC/Desktop/verrift-github-ready.zip"
npm ci
npm run verify
git status --short
git add -A
git commit -m "Polish VERRIFT branding and GitHub release"
git push origin HEAD
```

If `git commit` says there is nothing to commit, skip the commit and push. If the GitHub remote already exists, do not run `git remote add origin` again. Check it with `git remote -v`. If it points to the wrong repository, update it deliberately with `git remote set-url origin https://github.com/paulos-ui/verrift.git`.

## Verify the result

Open https://github.com/paulos-ui/verrift and check that the latest commit, `public/mark.svg`, `public/index.html`, `README.md` and `.env.example` are present, but `.env` is not. The browser tab on the app should display the VERRIFT mark and **VERRIFT | The Proof-of-Fix Network**. The public site requires a separate Vercel deployment; pushing to GitHub does not deploy the app automatically unless Vercel is already connected to the repository.

See `DEPLOYMENT.md` for Vercel configuration and the required production environment variables.
