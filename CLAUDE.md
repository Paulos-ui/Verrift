# VERRIFT | Project-specific engineering instructions

This project was created under Jayking Build Lab v2. Treat the original global charter and official hackathon rules as the governing working standards. Owner: Jayking, GitHub `paulos-ui`, X `@__official__1`.

**Project thesis:** A fix is not verified until an identical test that previously failed now passes. The test criteria must remain unchanged; all observations must be real. The Base onchain proof is a hash of real evidence and does not guarantee code quality.

**Current implementation:** Node.js 22 (dependency-free ESM) / HTML CSS JS / Anthropic Messages API / Base Sepolia EIP-1193 and JSON-RPC, local JSON or Upstash. Build Lab's default Next.js + strict TypeScript preference is not met by this version; if upgrading, preserve tested behavior and do not pretend a syntax check is typechecking.

## Non-negotiable rules

- No fake security checks, fake AI output, fake transaction hashes, fake wallet success or placeholders disguised as working flows.
- Never expose admin, Anthropic, Upstash, wallet or session secrets. `.env` is ignored. Never ask for a seed phrase.
- Only run approved, owner-verified read-only public HTTPS checks. Keep DNS pinning, private-network guards, bounded resources and no-redirect policy intact.
- Claude is advisory only. Never let generated prose or prompts change pass/fail results or execute shell commands.
- Base Sepolia only, test ETH only, no custody/escrow claim, explicit wallet confirmation and independent receipt verification.
- Keep the editorial Evidence Room design: warm paper, charcoal, restrained rust, meaningful motion, accessible controls and mobile layouts. Do not replace with generic gradient/glass crypto templates.
- Keep `/docs`, README, honest capability list and deployment instructions current.
- Before changes, inspect actual files; prioritize `npm run verify`; record real outcomes; add regression tests for every important code path.
- Deliver ZIP excluding `.env`, data, `.git`, node_modules, build output and secrets.

## Quick commands

`npm ci && npm run setup && npm run dev`

`npm run verify` runs JavaScript syntax checks and the Node integration tests. This is NOT an ESLint or TypeScript compilation.

## Project landmarks

- `lib/app.js` | auth and HTTP API, state transitions, write rules
- `lib/domain.js` | public-domain gate and bounded probes
- `lib/base.js` | network, real receipt verification, proof input
- `lib/ai.js` | Anthropic private request
- `lib/store.js` | atomic persistence/CAS
- `public/` | wallet controller and evidence UI
- `tests/` | HTTP integration and security tests
- `HACKATHON_BRIEF.md`, `DECISIONS.md`, `RELEASE_CHECKLIST.md` | submission guidance
