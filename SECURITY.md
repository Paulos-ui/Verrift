# VERRIFT | Security notes

## Identity and access

- Public visitors use signed, expiring guest cookies, not shared administrator credentials. Guest sandbox state and cases are scoped to an isolated guest ID and have tight per-session limits.
- Wallet users authenticate with a server-issued EIP-4361 challenge, a signed message, and Supabase Web3 Auth. Supabase validates the signature and issues a user identity. The server issues its own `HttpOnly`, `SameSite=Lax`, `Secure` (when HTTPS) 8-hour session cookie.
- The challenge is short lived, tied to an HTTP-only cookie, and its exact message digest must match the submitted message. The challenge cookie is deleted after successful use. Configure the Supabase authentication domain allowlist and Web3 rate limits.
- Projects, cases, histories, proof anchors, and payments are filtered and checked against the authenticated actor. Server-side mutations enforce owner authorization. Public reports are opt-in bearer links, not a global data feed.
- Only an authenticated wallet matching `ADMIN_WALLET_ADDRESS` can access the `/api/admin/summary` operator endpoint. No public administrator password exists.
- Payment transaction senders must match the authenticated user's wallet; transfers are independently checked against network, value, recipient and receipt status.

## Infrastructure and secrets

- Keep `SESSION_SECRET`, `SUPABASE_SECRET_KEY` and `ANTHROPIC_API_KEY` server-only. Supabase secret keys bypass RLS. Never embed one in frontend files.
- `supabase/schema.sql` revokes direct access to the server-managed state table from `anon` and `authenticated`; only the secret/service role may read/write through the trusted server. This schema is a constrained MVP, not a scalable multi-tenant relational design.
- Guest and wallet cookies are bound to the application origin; unsafe cross-origin requests are rejected. The app uses a restrictive Content Security Policy, HTML escaping, input length limits, and no third-party client scripts.
- Rate-limit counters are process-local; on Vercel they are not durable. Enable Supabase Web3 login rate limits, CAPTCHA for high-volume launches, WAF protection and application-level durable quotas before scaling.
- Login sessions remain valid until expiry even if Supabase Auth immediately revokes the upstream token. Shorter lifetimes or server-backed revocation would be needed for high-security or regulated use.

## Scope of verification

- External sites require published domain ownership proof, checked before any read-only GET request.
- SSRF defenses restrict local IPs, redirects, private ranges, custom ports and excessive response/time budgets. This is not an intrusive penetration test.
- Claude suggestions are explanatory and cannot override deterministic test results.
- Base Sepolia is testnet only. Transfers are direct/non-custodial; there is no escrow contract or mainnet release.
- Audit and instrument all third-party provider interactions and the data store before production financial use.

## Known limitations

- No external security review or audited custody contracts.
- Credentialless environment does not verify live Supabase Auth, Anthropic, Base or Vercel deployments.
- Per-instance throttles, JSONB single-record persistence, and guest storage are intentionally limited MVP architecture.
