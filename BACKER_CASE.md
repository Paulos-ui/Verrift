# VERRIFT | A backable evidence product, not a points economy

*Independent product thesis, as of November 9, 2026. Not a financial projection, offer to sell securities, partnership announcement or investment recommendation.*

## The investable wedge

The existing market already has wallet approval managers and token scanners. VERRIFT should not expect funding for duplicating a generic risk verdict. Its wedge is a **reusable evidence trail** that connects what a user was told before interacting, what a wallet actually allowed at a known chain block, and what a confirmed transaction changed afterward.

The paid customer hypothesis is **Base application developers and treasury operators**, not casual users buying $VIBES. If a builder can show an explainable permission preflight and publicly verifiable post-action receipt inside their own workflow, their support, security and trust burden may improve. This hypothesis still needs interviews and measurable pilots.

## Shipped product evidence

- Public contract inspector using GoPlus, Honeypot.is, DEX Screener and direct Base `eth_getCode`.
- Dated research records with JSON digest and repeat-scan comparison.
- Public, same-block permission exposure check using `allowance`, `balanceOf`, `eth_getCode`, block hash, and an EIP-7702 marker check.
- Authenticated, user-approved ERC-20 revoke workflow and a public receipt/state verifier.
- Optional wallet passport, nontransferable points and VIBES holdings; these are engagement layers, **not** the revenue strategy or defensible technology.

## Potential customers and economic value

| Segment | Pain and decision point | VERRIFT integration hypothesis | Buyer evidence |
| --- | --- | --- | --- |
| Base wallets and web apps | Users cannot interpret approval prompts or reassess a connection | Embedded same-block permission preflight + links to evidence | **Not validated** |
| Onchain treasuries | Hard to record which specific authority was checked at which time | Scheduled permission report and change review under explicit consent | **Not validated** |
| Base developers / support teams | Customer claims about approval failures are difficult to reproduce | Read-only, block-pinned JSON response and verified revoke receipt | **Not validated** |
| Security educators / researchers | Scanner claims without observed source coverage cannot be trusted | Shareable research snapshot with source availability history | **Not validated** |

### Sustainability without token speculation

1. Keep low-volume research and receipt verification free so anyone can inspect evidence.
2. Offer a future **metered developer API** for high-volume integrations, structured reports and support, only after durable rate limiting and access keys exist.
3. Offer future **opt-in monitoring and retention** to teams requiring historical records, permission-change notifications and auditable export. No automatic watch is running in the MVP.
4. Test a paid service model against provider pricing, infrastructure usage, potential legal duties and security maintenance before setting prices. **No active subscriptions or revenue are claimed.**

**Cost centers** include Base RPC/data indexing, GoPlus and other provider quotas, Supabase persistence and retention, Vercel compute, security review, enterprise support, and legal/privacy compliance. If this becomes a money-facing tool, it also needs external security assessment and robust incident handling. An extension across EVM chains raises additional costs.

## Credibility of the ecosystem relationships

- **Base**: VERRIFT is a Base Mainnet application using public RPC and ERC-20 standards. That is real infrastructure dependence. **No official Base grant, backing, endorsement, certification or partnership has been established in this release.**
- **SolNeutral**: the builder has described a separate Solana-focused vault/engineering project. It is a plausible source of cross-project workflow lessons, not a live VERRIFT customer or integration. VERRIFT cannot directly inspect Solana permissions with its Base-only endpoint. **No SolNeutral endorsement, financial commitment or integration is claimed.**
- **$VIBES**: the Base token can be read or swapped using third-party tooling if configured. This is not VERRIFT fundraising or an entitlement to third-party token rewards. VERRIFT Points have no monetary value.

When a pilot, grant, partner or investment is actually confirmed, publish its name, scope, date and evidence before adding a logo or numerical claim.

## 30 / 60 / 90-day milestones

**Day 0, November 9:** Publish a stable source archive with tests, public token research, saved snapshots, read-only same-block exposure, EIP-7702 marker detection, receipt verification, and limitations. Show all states in a judge walkthrough without wallet connection until an intentional action is needed.

**By December 9 (30 days):** Instrument request success/error rates and provider coverage by endpoint; deploy durable rate limiting and persistent bounded report storage; publish a reliability dashboard and a short independent security/threat-model review. Acceptance: 7 days of measured uptime and an error budget, not guessed performance. Costs from actual logs.

**By January 8 (60 days):** Trial opt-in watchlists with explicit consent, user-controlled recheck frequency, quiet defaults, and clear deletion. Target 5 developer pilot conversations or invited integrations; distinguish invitations from completed pilots. Acceptance: a versioned JSON API contract and at least one independently reproduced partner-side read. If no pilots exist, say so.

**By February 7 (90 days):** Decide whether paid API + monitoring has a viable margin and privacy model. Target two verified paying pilots, conditional on legal/security/commercial validation; **zero is the current documented count**. Acceptance: external security notes, measured per-check COGS, and an integration used in a real workflow rather than a marketing screenshot.

## Scorecard to publish (targets, not achievements)

Track: public checks per week, percentage with two or more usable independent sources, report recheck rate, completed user-verified revocations, median RPC error rate, developer API latency, opt-in pilot users, and support requests resolved with reproducible evidence. When publishing, include date window and methodology. Do not inflate chain activity by counting repeated internal tests as customers.

## Fundable scoring strategy

The November 9 screenshot scored 72/100: problem 13/20, differentiation 7/15, timing 6/10, backer fit 10/15, craft 10/10, reliability 10/10, evidence 16/20. The largest available increases come from actual **product differentiation, technical timing and buyer validation**. Polished copy alone is not a defensible business; the next external score may go down, remain flat or improve depending on what is deployed and visible. A score above 90 is a goal, not an output guarantee.
