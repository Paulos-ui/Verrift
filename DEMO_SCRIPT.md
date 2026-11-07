# VERRIFT | Judge demo (75-95 seconds)

**Before recording:** Configure Anthropic, connect a real Base Sepolia wallet, and have an actual proof/payout receipt available. If not yet completed, omit those live claims. Prepare a sandbox case with no fake evidence.

**00:00 | Hook**
"AI made shipping software faster. But here's the part no one celebrates: proving that a broken product was actually fixed. This is VERRIFT | the proof-of-fix network."

**00:12 | Real failure**
"I'll deliberately break our sample service. This is its real API state, not a mocked score. I rerun the exact HTTP and content assertion: the result fails, and VERRIFT records the observation."

**00:29 | Real repair**
"Now I restore the service. Same case, same acceptance criteria. This time the response passes, and the case becomes verified because we have both a recorded failure and a successful rerun."

**00:46 | AI**
"Claude interprets the observed evidence and suggests remediation steps. But the model cannot declare victory | only a real rerun can do that." [Show only if your configured Anthropic call actually succeeds.]

**01:00 | Base**
"Now I can anchor the exact evidence fingerprint on Base Sepolia and inspect its transaction onchain. A developer reward can also be sent as test ETH, with the recipient and amount independently verified by VERRIFT." [Show only actual confirmed testnet hashes.]

**01:18 | End**
"VERRIFT is about the part that comes after 'ship it': capture the failure, prove the fix, and make the result accountable. Broken is a claim. Fixed is a proof."

## What to show in a three-minute walkthrough

Show the public report URL, export evidence JSON, authentication, one verified external-domain proof if configured, before/after checks, Base explorer receipt, and a real (or clearly unavailable) Claude analysis. Give the judges the chance to rerun the sample themselves.
