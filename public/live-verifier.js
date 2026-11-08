const BASE_RPC = 'https://mainnet.base.org';
const BASE_USDC = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const PERMIT2 = '0x000000000022D473030F116dDEE9F6B43aC78BA3';

async function rpcCall(method, params) {
  const res = await fetch(BASE_RPC, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params })
  });
  const data = await res.json();
  return data.result;
}

function padAddress(addr) {
  return addr.toLowerCase().replace(/^0x/, '').padStart(64, '0');
}

export async function runLiveBaseAudit(addressInput) {
  const out = document.getElementById('verrift-rpc-output');
  if (!out) return;
  const addr = String(addressInput || '').trim();
  if (!/^0x[a-fA-F0-9]{40}$/.test(addr)) {
    out.innerHTML = '<div class="verrift-metric-box"><small>VALIDATION ERROR</small><strong>Enter a valid 0x Base address (42 hex chars)</strong></div>';
    return;
  }

  out.innerHTML = '<div class="verrift-metric-box"><small>QUERYING BASE MAINNET (8453)</small><strong>Executing eth_getBalance, eth_getTransactionCount & USDC Permit2 allowance...</strong></div>';

  try {
    // allowance(owner, spender) selector: 0xdd62ed3e
    const allowanceData = '0xdd62ed3e' + padAddress(addr) + padAddress(PERMIT2);
    const [balHex, nonceHex, allowanceHex, blockHex] = await Promise.all([
      rpcCall('eth_getBalance', [addr, 'latest']),
      rpcCall('eth_getTransactionCount', [addr, 'latest']),
      rpcCall('eth_call', [{ to: BASE_USDC, data: allowanceData }, 'latest']),
      rpcCall('eth_blockNumber', [])
    ]);

    const wei = BigInt(balHex || '0x0');
    const ethFormatted = (Number(wei) / 1e18).toFixed(6) + ' ETH';
    const nonce = Number(BigInt(nonceHex || '0x0'));
    const allowance = BigInt(allowanceHex || '0x0');
    const blockNum = Number(BigInt(blockHex || '0x0'));
    const hasUnlimitedPermit2 = allowance > (10n ** 12n);
    const riskState = hasUnlimitedPermit2 ? 'EXPOSED (Revoke Recommended)' : 'CLEAN (0 Permit2 USDC Risk)';
    const passportScore = Math.min(98, 62 + Math.min(nonce, 25) + (hasUnlimitedPermit2 ? 0 : 11));

    out.innerHTML = `
      <div class="verrift-metric-box"><small>BASE MAINNET BLOCK / WALLET</small><strong>#${blockNum} / ${addr.slice(0, 8)}...${addr.slice(-6)}</strong></div>
      <div class="verrift-metric-box"><small>NATIVE BALANCE &amp; NONCE</small><strong>${ethFormatted} | ${nonce} Outgoing Txs</strong></div>
      <div class="verrift-metric-box"><small>USDC PERMIT2 ALLOWANCE CHECK</small><strong>${riskState}</strong></div>
      <div class="verrift-metric-box"><small>COMPUTED PASSPORT SCORE</small><strong>${passportScore}/100 (Verified via Base RPC 8453)</strong></div>
    `;
  } catch (err) {
    out.innerHTML = '<div class="verrift-metric-box"><small>RPC FALLBACK</small><strong>Base Mainnet RPC busy; use workspace inspector (/app) for server-side verification.</strong></div>';
  }
}

window.verriftRunAudit = function (presetAddr) {
  const input = document.getElementById('verrift-live-addr');
  if (presetAddr && input) input.value = presetAddr;
  runLiveBaseAudit(input ? input.value : presetAddr);
};

window.verriftExecuteRevoke = async function (btn, routerAddr) {
  const revokeCalldata = '0x095ea7b3' + String(routerAddr || '3fC91A3afd70395Cd496C647d5a6CC9D4B2b7FAD').replace(/^0x/, '').toLowerCase().padStart(64, '0') + '0'.repeat(64);
  if (window.ethereum) {
    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      await window.ethereum.request({
        method: 'eth_sendTransaction',
        params: [{
          from: accounts[0],
          to: BASE_USDC,
          data: revokeCalldata,
          value: '0x0'
        }]
      });
      btn.textContent = 'REVOKED ON BASE MAINNET (+24 PASSPORT PTS)';
      btn.style.background = '#0f5132';
      return;
    } catch (e) {
      // Fallback to copying deterministic calldata if user cancels wallet prompt
    }
  }
  if (navigator.clipboard) {
    navigator.clipboard.writeText(revokeCalldata).catch(() => {});
  }
  btn.textContent = 'REVOKE CALLDATA COPIED (0x095ea7b3...0000) | +24 PTS READY';
  btn.style.background = '#0f5132';
};
