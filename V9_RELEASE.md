# VERRIFT V9 | Mainnet Permission Studio and VIBES Corner

## What changed

**Primary identity:** VERRIFT is a Base Mainnet wallet permission-awareness and proof-of-change tool. The wallet passport and developer repair lab remain accessible as secondary features.

**Wallet Overview:** Added a high-visibility, two-column strip at the top of the page. The left card shows the UTC daily streak, recorded VERRIFT Points, check-in state, and a one-click claim button. The right card shows a fresh read of the actual VIBES token balance and provides a direct link to Get VIBES.

**Get VIBES (optional, real mainnet):** VERRIFT can request firm ETH-to-VIBES quotations from the 0x Swap API on Base chain 8453. The 0x API key remains server-side. Only native ETH sells are supported, avoiding third-party ERC-20 approval requests. The user chooses amount and slippage, sees estimated and minimum VIBES, deliberately confirms the swap, and separately approves the real transaction in their own wallet. VERRIFT records it only after Base Mainnet verifies the exact transaction and a VIBES Transfer event to the user for at least the quoted minimum.

**User safety:** A quote is not a transaction, a submitted transaction is not a verified receipt, and a VERRIFT Points claim is not a crypto reward. Quotes expire after 90 seconds. The launch-size cap is 0.05 ETH. Price movement, price impact and gas costs can cause losses. Do not present the swap as an investment recommendation.

**$VIBES identity:** Token address `0xeffc8815487084a97edfdff968b56ea123421acb` on Base. Independently corroborated on Coinbase, CoinPaprika and GeckoTerminal; users should re-check the contract before using real funds. It is not a VERRIFT-created token.

**Daily streaks:** Free offchain profile check-in once per UTC day, currently 10 VERRIFT Points plus 5 points for a wallet holding VIBES, a 7-point streak milestone every seventh consecutive day, and 30 bonus points on day 30. This is **not** real VIBES distribution. There is no funded reward treasury, deployed distribution smart contract, public eligibility commitment, or official Vibestarter partnership.

**Legacy Base Sepolia:** Prior case-repair reward payments and wallet-passport anchoring remain explicitly marked as testnet features. Main wallet security, VIBES balances and swaps are Base Mainnet. Do not flip legacy payment features into real-money mainnet flows without reviewed contracts and separate testing.

## One new environment variable

`ZEROX_API_KEY`: a 0x Swap API v2 key, created at https://dashboard.0x.org/apps. Set this **server-only** under Vercel -> Project Settings -> Environment Variables, Production, then redeploy. Without a key the swap panel displays configuration guidance and does not claim trades are available. No new Supabase SQL is needed.

## Deployment / push

```bash
cd "/mnt/c/Users/MY PC/Desktop/verrift"
unzip -oq "/mnt/c/Users/MY PC/Desktop/verrift-mainnet-v9.zip" -d .
rm -f server.js
npm ci
npm run verify
git add -A
git commit -m "Add Base Mainnet VIBES swaps and daily claim overview"
git push origin HEAD
```

## External checks still required

- Supabase real wallet sign-in on https://verrift.vercel.app/app
- Base Mainnet token read and check-in persistence on the deployed server
- 0x API quote with YOUR server-side key and the current VIBES liquidity
- **Only if deliberately chosen by the user**, a small mainnet test purchase with real ETH, inspected transaction request, and confirmed VIBES transfer. Never test with someone else's assets.
- Layout inspection and accessibility on the live deployed URL, mobile and desktop

## Future: genuine onchain VIBES daily distribution

Implement only after the operator obtains an independently audited, funded reward distributor with a capped per-user/per-day allocation, an immutable token address, signed claim authorization, claim replay protection, treasury reserves, an emergency pause, and explicit disclosures. Verify legal, tax and policy implications. Until then, VERRIFT only grants nontransferable Points. Confirmed VIBES holders can request an extended recent allowance scan up to 12,000 blocks (with fallback to 8,000 if a provider rejects the larger query); all users have free core scanning. This does not make the scan complete or certify wallet safety. **Never substitute a decorative claim button or automatically convert Points into VIBES.**
