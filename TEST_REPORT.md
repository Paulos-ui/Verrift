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

## Landing update QA, November 7, 2026

- New public `/` is a standalone static landing. The existing workspace moves to `/app`.
- Build and tests: 33/33 Node tests passed after route, motion, and static-response assertions were added.
- Static Chromium rendering with injected HTML/CSS/JS at 1440x900, 768x1000 and 390x844: no document horizontal overflow or JavaScript exceptions; the repair-phase buttons updated state.
- Browser navigation to localhost was blocked by administrator policy. This prevented full live-nav, network and mobile-interaction audits.
- Vercel database still requires Supabase resource linkage, environment variables, SQL schema and redeploy. No actual production database, Anthropic API or Base transactions tested here.


## V5 UI refinement verification (November 2026)

- `npm run verify` executed successfully with **37/37 passing tests**. Four new tests cover white branding, data-derived overview content, stable navigation/title, and no em dashes in public source.
- Static Chromium previews of the actual workspace template with an empty guest-state fixture at 390, 768 and 1440 CSS pixels: no horizontal overflow, no page JavaScript exceptions, correct operator/logout visibility.
- Static Chromium landing-page previews at the same widths: computed pure-white body background, no horizontal overflow or page JavaScript exceptions.
- `npm run build` is syntax and JSON validation only, not a TypeScript compiler.
- Full browser navigation to localhost remained blocked by the test environment; external Supabase Auth, Base Sepolia settlement and real Anthropic responses were not live-tested for this UI release.
- No production Vercel deployment or GitHub push was executed from this workspace.
