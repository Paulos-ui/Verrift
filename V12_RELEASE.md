# VERRIFT V12 | Evidence you can reproduce

**Date:** November 9, 2026. Base Mainnet only for token/permission checks.

## Shipped

1. `GET /api/token/exposure?owner=...&token=...&spender=...`: chain ID validation, one-block-pinned ERC-20 token balance and allowance reads, block hash and wallet code inspection, EIP-7702 delegation marker if present. No wallet connection and no write path.
2. A new public exposure form inside `/verify`, beneath the token inspector and beside the existing verified revoke workflow. Visible raw-units fallback and unknown-state handling.
3. Direct navigation from a scanned Base token to its exposure check.
4. A landing explanation of the real 2026 changes: native 200ms Base blocks (Denim, Nov 5) and EIP-7702 delegation support. No assertion that ordinary allowances were impossible to check in 2023.
5. Completely rewritten structured README, honest backer hypothesis, milestone acceptance gates and technical method documentation. Older README preserved as `docs/releases/README_V11_HISTORY.md`.
6. Tests added for pinned reads, EIP-7702 detection, empty balance with active allowance, invalid inputs, wrong network, and public endpoint wiring.

## Not shipped / not implied

No smart account permission audit, no all-time spender enumeration, no partner launch, no Base endorsement, no SolNeutral integration, no token issuance, no automatic watch alerts, no guarantee of higher external Fundable score. Fundable's most recent screenshot is 72/100.

## Try it

`npm ci && npm run verify`. On a connected Base RPC: open `/verify#exposure`, supply a *known real* wallet/ERC-20/spender triple and see the block-pinned chain response. For an authentic comparison, verify the same block with another RPC or BaseScan. For a token research sample, use the exact officially published Base USDC address.

See [METHOD_AND_LIMITS.md](METHOD_AND_LIMITS.md), [BACKER_CASE.md](BACKER_CASE.md), [README.md](README.md).
