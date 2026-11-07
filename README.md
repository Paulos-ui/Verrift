# VERRIFT | The Proof-of-Fix Network

**Vercel runtime hotfix:** This release separates the static website (`public/`) from the Vercel API (`api/index.js`). The local development server lives in `scripts/dev-server.js`. Before pushing over an older extraction, remove the obsolete root `server.js`. See `VERCEL_HOTFIX.md` for exact WSL instructions and environment settings.

**A public Base Sepolia repair-verification platform with private wallet workspaces and an open guest lab.**

Built by Jayking (`paulos-ui`, [@__official__1](https://x.com/__official__1)) for Vibeathon 02. AI coding assistance was used. Claude (Anthropic) is an optional server-side evidence analyst, not the source of test verdicts.

## Experience

- **Anyone can open VERRIFT** without a password, create a guest sandbox case, break a sample service and prove the repair by rerunning the same check. Guest cases and state are isolated by signed visitor cookies; guests have 2 cases and 20 runs per case. Guest demo records expire from storage after 24 hours when cleanup runs.
- **Wallet owners** sign an EIP-4361 message to Supabase Auth, which verifies the Ethereum signature and issues an identity. VERRIFT then issues a short-lived secure, HTTP-only session cookie. User workspaces have distinct case records, proof histories and domain registrations. A guest's cases are moved into that wallet account at first sign-in.
- **Domain owners** verify possession through DNS TXT or HTTPS file challenges before running narrowly scoped, read-only public HTTPS checks.
- **Claude** reads bounded observations (no private wallet keys) and offers hypotheses, never authoritative pass/fail status.
- **Base Sepolia** verifies self-addressed SHA-256 proof anchor transactions and non-custodial test ETH reward transfers using transaction receipts. No escrow or mainnet transfers are included.
- **Share links** are opt-in bearer URLs for public, read-only evidence reports. Without the URL token, private cases are not disclosed.
- **The operator view** at `/admin` only shows aggregate counts, restricted to the one authenticated wallet configured as `ADMIN_WALLET_ADDRESS`. The public user interface needs no administrator password.

## Requirements

- Node.js 22+
- A Supabase project with **Auth -> Web3 -> Ethereum enabled** and your deployment domain configured in the Auth redirect allowlist
- Supabase Postgres schema from [`supabase/schema.sql`](supabase/schema.sql)
- A compatible EVM wallet, connected to Base Sepolia (chain 84532) for signed-in functions
- Optional Anthropic API key for AI evidence analysis

## Local setup

```bash
npm ci
npm run setup
npm run dev
```

Visit http://localhost:3000. Guest lab works with local file persistence without Supabase. For full wallet sign-in, create a Supabase project and add `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY` to `.env`. Run `supabase/schema.sql` in Supabase SQL Editor and allowlist `http://localhost:3000/**` in Supabase Auth redirect URLs.

`npm run setup` generates a private `SESSION_SECRET`. It does **not** generate an administrator password because visitors do not use a shared admin login.

## Production setup: Supabase + Vercel

1. Push the complete repository to `https://github.com/paulos-ui/verrift`.
2. Import that repo in Vercel, Framework **Other**, root `./`, build `npm run build`, output directory `public`, Node 22.x.
3. Install the **Supabase** integration in your Vercel project, and ensure `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, and `SUPABASE_SECRET_KEY` are provisioned. Depending on the integration, `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` may be supplied instead. This backend recognizes those aliases. The secret stays server-only.
4. Open your Supabase dashboard -> SQL Editor. Run the full [`supabase/schema.sql`](supabase/schema.sql) once.
5. Supabase -> Authentication -> Providers -> enable **Web3 wallet / Ethereum**. In Authentication URL configuration, add `https://YOUR-VERCEL-DOMAIN/**` and set your canonical Site URL.
6. Add to Vercel manually: `SESSION_SECRET`, `ANTHROPIC_API_KEY` (optional but required for live Claude), `CLAUDE_MODEL=claude-sonnet-4-6`, `BASE_SEPOLIA_RPC=https://sepolia.base.org`, `PUBLIC_ORIGIN=https://YOUR-VERCEL-DOMAIN` and `ADMIN_WALLET_ADDRESS` (optional, your single operator wallet).
7. Redeploy after adding values. Check `/api/status` returns `persistence: "supabase"`. Test guest failure -> repair, then wallet sign-in, separate accounts, domain verification, Claude and real Base Sepolia transactions.

**You do not need Redis/Upstash once Supabase is installed.** Do not add `ADMIN_PASSWORD` or `DATABASE_URL` for this app. `SESSION_SECRET` is *not* a login password. It signs secure sessions. Never put Supabase secret keys, Anthropic keys, or wallet private keys in GitHub or browser code.

## API and trust boundaries

- `GET /api/status`, `GET /api/data` are public; `/api/data` is scoped to the visitor or signed-in user.
- `GET /api/auth/challenge?address=...`, `POST /api/auth/verify` perform challenge-response authentication via Supabase Web3.
- `POST /api/cases`, `POST /api/cases/:id/run`, `POST /api/sandbox` allow guest sandbox operations, and verify per-actor access.
- `POST /api/projects`, `/api/projects/:id/verify`, `/api/cases/:id/analyze`, `/api/cases/:id/anchor`, `/api/cases/:id/reward`, and `/api/cases/:id/confirm-payment` require a signed-in wallet.
- `GET /api/admin/summary` requires the authenticated operator wallet.
- `GET /api/public/:id?token=...` requires an explicit bearer token created by the owner.

The data store uses a server-only JSONB record in Supabase with an atomic Postgres compare-and-swap routine. This is sufficient for a constrained public MVP but is not a horizontally partitioned multi-tenant database. For a high-traffic production launch, migrate each entity to separate tables, implement per-table RLS, add durable edge-rate-limits and monitoring, conduct full security reviews, and audit any custody or escrow functionality before using real assets.

## Testing

```bash
npm run verify
```

Node tests cover domain safety, authenticated and guest sandbox evidence, wallet separation, replay-limited challenges, Base RPC evidence and payouts, and the serverless route adapter. External provider integrations are mocked in tests, so **a passing suite does not mean live Supabase, Anthropic, or Base transactions have succeeded**.

## Deployment and demo

- [`DEPLOYMENT.md`](DEPLOYMENT.md) contains an environment checklist and verification plan.
- [`GITHUB_PUSH.md`](GITHUB_PUSH.md) contains exact WSL unzip, commit and GitHub push commands.
- [`DEMO_SCRIPT.md`](DEMO_SCRIPT.md) contains a short walkthrough.
- [`SECURITY.md`](SECURITY.md) documents safety boundaries.

## License

MIT. See [`LICENSE`](LICENSE). Keep required contest disclosures accurate.
