# Security boundaries

VERRIFT is **not** a penetration testing tool and does not make external requests before domain control is demonstrated. The external checker performs only same-host HTTPS GET requests. It refuses local/private IP addresses and non-public hostnames, validates DNS, pins the resolved address to prevent late DNS re-resolution, rejects redirects by not following them, validates TLS and limits bytes/time. Domain verification uses a unique randomly generated TXT/file challenge.

A signed, HttpOnly, SameSite=Strict admin session protects mutations; cross-origin POSTs are rejected using Origin/Fetch Metadata checks, and there are bounded per-process request counters. This is a single-operator MVP, not hardened identity management for a public multi-tenant SaaS. Rate counters reset in fresh serverless instances and should be replaced by durable edge-rate limits before scale.

The Anthropic API key is server-only. The model receives bounded case evidence, not credentials or hidden wallet information. All analysis is untrusted advice and no arbitrary code execution is provided.

Base features are explicitly restricted to **Base Sepolia**. Rewards are direct, non-custodial test ETH transfers (not escrow, not a sale, not mainnet). Onchain proofs are zero-value self-transactions with public calldata. All transaction hashes, wallet addresses, chain IDs, amount and calldata are checked server-side before a receipt is recorded. A matching transaction proves a wallet sent that onchain data; it does not prove software quality.

A person who knows the admin password controls case records. Public report bearer links grant read access to observations; share carefully. The client HTML escapes untrusted input and never renders Claude output as trusted HTML. `public/` has a restrictive CSP and no third-party scripts.

Before commercial use, add stronger authentication/SIWE, security monitoring, dedicated SSRF review and browser worker isolation, production rate limiting, backup/recovery, observability and professional assessment of any payment or escrow architecture.

Report vulnerabilities privately to the repository owner rather than exploiting other websites.
