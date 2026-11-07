# VERRIFT Multi-user MVP | Verification

Local verification: `npm run verify`.

- 27 Node tests passed after the public/user refactor.
- Checks cover isolated sandbox states, per-wallet case and project authorization, passwordless guest access, signed challenge handling with mocked Supabase exchanger and REST provider adapters, cross-origin denial, controlled repair sequence, mock Base receipt verification, owner-limited exports and public report tokens.
- `npm run build` performs syntax and JSON validation only. It is not a TypeScript compilation.
- Supabase Auth token exchange, database RPC, live Anthropic messages and live Base Sepolia transactions are external integrations; real credentials are not present in the build environment. They still need deployment verification.

See `DEPLOYMENT.md` for acceptance checklist.
