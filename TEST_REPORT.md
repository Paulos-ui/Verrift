# VERRIFT Multi-user MVP | Verification

Local verification: `npm run verify`.

- 27 Node tests passed after the public/user refactor.
- Checks cover isolated sandbox states, per-wallet case and project authorization, passwordless guest access, signed challenge handling with mocked Supabase exchanger and REST provider adapters, cross-origin denial, controlled repair sequence, mock Base receipt verification, owner-limited exports and public report tokens.
- `npm run build` performs syntax and JSON validation only. It is not a TypeScript compilation.
- Supabase Auth token exchange, database RPC, live Anthropic messages and live Base Sepolia transactions are external integrations; real credentials are not present in the build environment. They still need deployment verification.

See `DEPLOYMENT.md` for acceptance checklist.

## November 7, 2026 Vercel hotfix

- Previous build completed but user saw 500 `FUNCTION_INVOCATION_FAILED` at runtime.
- Reproduced a server bootstrap exception when SESSION_SECRET was absent.
- Removed auto-detected root server.js and moved the local listener to scripts/dev-server.js.
- Added graceful initialization errors to api/index.js, new deployment architecture tests, and API rewrite adapter checks.
- 30/30 tests passed locally; see VERCEL_HOTFIX.md.
- Vercel cloud runtime was not exercised, and the exact error from Vercel Runtime Logs remains unknown.
