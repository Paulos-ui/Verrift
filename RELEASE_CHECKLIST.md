# VERRIFT release checklist

- [x] Selected concept aligns with published judging weights and user approval
- [x] Responsive premium visual identity implemented with actual state-based counters
- [x] Real local sandbox failure → repair → passing rerun
- [x] Domain ownership gate and bounded external HTTPS checks
- [x] Anthropic Messages API adapter; error when unconfigured
- [x] Base Sepolia wallet + SHA-256 anchor + direct test ETH transfer code
- [x] Server verification for real onchain receipts, with tests using controlled RPC responses
- [x] Auth, validation, CSRF protection and report sharing
- [x] `npm ci --offline`, `npm run verify`: 20 tests passed
- [x] Desktop, tablet and mobile layout-only renders with stubbed API; no horizontal overflow observed
- [x] Source ZIP excludes secrets/runtime data and node_modules
- [x] README, deployment, demo script, docs, security and limitation notes
- [ ] Live Anthropic API request with owner's key
- [ ] Live Base Sepolia wallet signatures, anchor and payout receipts
- [ ] Real owner-domain DNS/file verification and public HTTPS probe
- [ ] Live managed Upstash Redis and Vercel URL smoke test
- [ ] Full browser-based end-to-end session on actual localhost/public URL
- [ ] Real screenshots/video of functional deployment for judges
- [ ] Official hackathon submission finalized before deadline

**Do not mark the remaining entries complete from mocks or screenshots alone.**
