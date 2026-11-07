# VERRIFT | engineering decisions

- **Project approval:** User explicitly approved building VERRIFT after selecting it from three ideation options in this conversation.
- **Product angle:** evidence-first repairs, not generic vulnerability scanning or a bug-board clone. The differentiator is same-test failure/pass proof and optional onchain evidence/settlement.
- **Working stack:** Modern Node.js 22 ESM backend + accessible HTML/CSS + browser EIP-1193 JavaScript. No external npm dependencies. The preferred Build Lab Next.js/TypeScript stack was intentionally not used because this execution environment cannot download npm packages; prioritize a genuinely tested working MVP over an untestable scaffold. A future migration to typed Next.js can preserve the domain/verification logic.
- **UI:** Editorial 'Evidence Room' art direction: warm ivory paper, charcoal/slate, restrained burnt orange, measured serif hierarchy, real counters and no invented metrics. Mobile/tablet/desktop layout was rendered in Chromium with API stubs.
- **Safety:** Admin authorization + proof of external domain ownership; pinned, bounded GET-only HTTPS checks; read-only sample API sandbox. No arbitrary crawling, shell commands, exploit execution or unsandboxed browser navigation.
- **AI:** Anthropic Messages API server-side, configurable model, short bounded input/output, errors surfaced. AI is explanatory only and cannot decide test status.
- **Web3:** Base Sepolia 84532 only. Evidence anchor uses SHA-256 digest in a zero-value self-transaction; payout uses direct test ETH transfer verified from chain. No mainnet, no escrow or deployed custom contract, no pretend hashes.
- **Persistence:** atomic JSON writes for local single-process use, optional optimistic CAS Upstash Redis for serverless. Cloud path requires live validation.
- **Claim discipline:** Unit/integration tests for domain behavior, sandbox, mocked provider adapters, and auth; not claiming live Anthropic, wallet transfer, Redis or Vercel has passed until independently tested.
