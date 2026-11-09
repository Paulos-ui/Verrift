# VERRIFT | Public evidence method and threat boundaries

## Evidence sources and hierarchy

**Independent chain state:** Base RPC `eth_chainId`, pinned `eth_blockNumber`, `eth_getBlockByNumber`, `eth_call` (`balanceOf`, `allowance`, optional `decimals`) and `eth_getCode`. These are observations by a particular RPC provider and block hash. No distributed consensus or proof of RPC integrity is implemented in the browser; users can check the block hash and re-run calls against their own trusted provider.

**External provider claims:** GoPlus, Honeypot.is and DEX Screener provide independent screening and market observations. Responses must be attributed to each provider. Data can be delayed, missing or contradictory. An absent provider is `unavailable`, not an implicit pass.

**Saved record:** a dated copy of a research response and a JSON SHA-256 digest. This is useful for comparisons and integrity checks against a separately retained copy, but cannot certify the truth of providers or survive arbitrary server record pruning. The store retains a bounded 250 reports.

**Verified action:** Standard ERC-20 `approve(spender, 0)` transaction identified by exact sender, token contract, calldata, zero ETH value and a successful Base receipt, followed by a current onchain allowance read of zero. A third party can reproduce the check. It does not mean the token is safe, other spenders are cleared, or the allowance cannot become nonzero later.

## What the Exposure Lens actually reports

- User supplies one `owner`, `token` and `spender` Base address triple; no wallet connection required.
- Server requires chain ID 8453, pins a block number, and reads balance/allowance/account code at that block. It records the block hash.
- `potentiallyExposedRaw = min(balanceOf(owner), allowance(owner, spender))`. This is only a comparison of ERC-20 units for the **specific spender**. Never label it a direct dollar-loss forecast. Token transfer mechanics may restrict actual transferability.
- Extremely large allowances are described as *effectively unlimited*; a wallet holding zero tokens can still retain an active allowance that might matter later.
- If bytecode starts with the exact EIP-7702 delegation designation, report the delegate address. No legitimacy, control, compliance or smart-account safety conclusion follows from that pattern.
- If `decimals()` fails or returns an unsupported value, provide raw units and mark decimals unknown; do not guess token decimals.
- If an essential read fails or chain/block data is inconsistent, return an error rather than a guessed exposure.

## Exclusions

1. Permit2 suballowances and offchain Permit signatures.
2. ERC-721 and ERC-1155 operator approvals.
3. All spender discovery: the `GET /api/token/exposure` endpoint does **not** enumerate past logs. Use existing recent sampling or direct known pairs.
4. Smart-account owners, delegates, session keys and EIP-7702 authorization trust graph beyond code-marker detection.
5. Arbitrary contract proxy evaluation, malicious-transfer simulation, wallet compromise detection and transaction simulation.
6. Mainnet transaction finality guarantees: a newly observed native 200 ms Base block is not automatically finalized on Ethereum.
7. Reliable long-term retention, continuous alerts, commercial API SLAs, token issuance, VERRIFT token distribution, or an investment recommendation.

## Reproduction protocol

Given `blockNumber`, `blockHash`, `owner`, `token`, `spender`, and the returned raw units, independently query another trusted Base endpoint for the same block, verify its hash, then call `balanceOf(owner)` and `allowance(owner,spender)` using the ABI selectors at that numeric block. If the block is unavailable or differs across providers, flag the discrepancy rather than merging incompatible states. Recheck later only with an explicitly new observation time.

## Why a user should trust this less than a real audit

The product offers bounded observations, not certified smart contract assurance. Source code visibility is not an audit; simulation success is not future sellability; decentralized code is not automatically reliable; and very rapid blocks do not remove race conditions around a trade, approval or reorg. Users should treat warnings as prompts for due diligence and never as directions to buy or sell.

References: [Base Denim, Nov 5 2026](https://www.base.org/blog/denim), [EIP-7702](https://eips.ethereum.org/EIPS/eip-7702), [Base's EIP-7702 security note](https://www.base.org/blog/securing-eip-7702-upgrades), [Base's 2026 strategy](https://www.base.org/blog/2026-mission-vision-and-strategy).
