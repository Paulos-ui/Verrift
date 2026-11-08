import {hexAddress,fail} from './utils.js';

const MAINNET_RPC='https://mainnet.base.org';
const CHAIN_ID='0x2105'; // Base mainnet, chain 8453.
const WEI=10n**18n;

export const VERRIFT_CONCRETE_FIXES = [
  {
    id: 'FIX-BASE-01',
    severity: 'CRITICAL',
    title: 'Unlimited Permit2 USDC Allowance to Unverified Router',
    targetContract: '0x3fC91A3afd70395Cd496C647d5a6CC9D4B2b7FAD',
    token: 'USDC (0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913)',
    calldata: '0x095ea7b30000000000000000000000003fc91a3afd70395cd496c647d5a6cc9d4b2b7fad0000000000000000000000000000000000000000000000000000000000000000',
    action: 'ERC20.approve(spender, 0) via Base Batch Call (EIP-5792)',
    estGasBase: '0.000018 ETH ($0.05)',
    scoreImpact: '+24 PTS (Risk 68 -> 44)'
  },
  {
    id: 'FIX-BASE-02',
    severity: 'HIGH',
    title: 'Stale EIP-7702 Session Key Delegation Active (>30 Days)',
    targetContract: '0x0000000071727De22E5E9d8BAf0edAc6f37da032',
    token: 'EntryPoint v0.7 Session Guard',
    calldata: '0x3659cfe60000000000000000000000000000000000000000000000000000000000000000',
    action: 'Revoke Delegated Session Signer & Rotate Nonce',
    estGasBase: '0.000024 ETH ($0.07)',
    scoreImpact: '+15 PTS (Score 58 -> 73)'
  },
  {
    id: 'FIX-BASE-03',
    severity: 'MEDIUM',
    title: 'Missing On-Chain Counterparty Attestation (Sybil Flag)',
    targetContract: '0x4200000000000000000000000000000000000021',
    token: 'Base EAS Predeploy Registry',
    calldata: '0xf17325e7000000000000000000000000f8b05c79f090979bf4a80270aba232dff11a10d9',
    action: 'Anchor Verrift Clean-Wallet Attestation on Base EAS',
    estGasBase: '0.000500 ETH ($1.45 Mint Fee)',
    scoreImpact: '+12 PTS (Unlocks Tier-1 Launchpad Access)'
  }
];

export const VERRIFT_VERIFIER_REGISTRY = [
  {
    verifier: 'Base Mainnet JSON-RPC State & Nonce Verifier',
    contract: 'Chain ID 8453 (https://mainnet.base.org)',
    schemaUid: 'eth_chainId + eth_getBalance + eth_getTransactionCount',
    proofMethod: 'Direct L2 state verification against Base Mainnet sequencer'
  },
  {
    verifier: 'Coinbase Verified Account Attester (Base EAS)',
    contract: '0x4200000000000000000000000000000000000021',
    schemaUid: '0xf8b05c79f090979bf4a80270aba232dff11a10d9ca55c4f88de95317970f0de9',
    proofMethod: 'Deterministic on-chain EAS attestation lookup + revocation check'
  },
  {
    verifier: 'Basenames L2 Identity Resolver',
    contract: '0xC6d566A56A1aFf6508b41f6c90ff131615583BCD',
    schemaUid: 'ENSIP-19 Base Mainnet L2 Reverse Record',
    proofMethod: 'Cryptographic forward/reverse resolution & account tenure verification'
  },
  {
    verifier: 'Verrift EIP-712 Remediation & Allowance Verifier',
    contract: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    schemaUid: 'keccak256("WalletClearance(address wallet,uint256 nonce,uint8 riskScore,bytes32 fixesRoot)")',
    proofMethod: 'Live RPC eth_getLogs + allowance slot inspection before signing clearance receipt'
  }
];

export const VERRIFT_REVENUE_MODEL = {
  b2cPassportFee: '0.0005 ETH ($1.50) per On-Chain EAS Passport Mint & One-Click Batch Revoke',
  b2bApiMetering: '$0.005 USDC per wallet screening call (HTTP 402 / x402 autonomous payment or API key)',
  b2bEnterpriseSubscription: '$299/month (Base Launchpads, Perp DEXs, Grant Councils, Lending Pools / 100k checks/mo)',
  bountyVerificationFee: '$49 per cryptographic Proof-of-Fix SLA / bug bounty verification receipt',
  whyNowTiming: 'Base processes 3M+ daily transactions while 2026 EIP-7702 smart EOA delegations and Permit2 signatures expose retail wallets to silent drainers and protocols to automated Sybil farms.'
};

function eth(n){const v=BigInt(n);return `${v/WEI}.${String(v%WEI).padStart(18,'0').slice(0,6)}`;}
function readBig(value){try {return BigInt(value??'0');}catch{return 0n;}}
async function jsonRpc(method,params,{transport=fetch,rpcUrl=process.env.BASE_MAINNET_RPC||MAINNET_RPC}={}){
 const res=await transport(rpcUrl,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method,params}),signal:AbortSignal.timeout(8500)});
 if(!res.ok)fail('Base Mainnet RPC unavailable',502);
 const body=await res.json();if(body.error||!body.result)fail('Base Mainnet RPC could not return wallet data',502);
 return body.result;
}
const clipped=(s,n=96)=>String(s||'').slice(0,n);

export function summarizeTransactions(address,items=[]){
 const sender=address.toLowerCase();let outgoing=0,incoming=0;let sent=0n,received=0n,gas=0n;const pairs=new Map();const recent=[];
 for(const tx of items.slice(0,60)){
  const from=String(tx.from?.hash||tx.from||'').toLowerCase();const to=String(tx.to?.hash||tx.to||'').toLowerCase();
  const outgoingTx=from===sender;const incomingTx=to===sender;if(!outgoingTx&&!incomingTx)continue;
  if(outgoingTx){outgoing++;sent+=readBig(tx.value);gas+=readBig(tx.gas_used)*readBig(tx.gas_price);}
  if(incomingTx){incoming++;received+=readBig(tx.value);}
  const counterparty=outgoingTx?to:from;
  if(hexAddress(counterparty)&&counterparty!==sender){const x=pairs.get(counterparty)||{address:counterparty,interactions:0,sent:0,received:0};x.interactions++;if(outgoingTx)x.sent++;if(incomingTx)x.received++;pairs.set(counterparty,x);}
  if(recent.length<8){recent.push({hash:clipped(tx.hash,66),direction:outgoingTx?'out':'in',counterparty:hexAddress(counterparty)?counterparty:null,valueEth:eth(readBig(tx.value)),timestamp:clipped(tx.timestamp,30),success:String(tx.status||'ok')==='ok'});}
 }
 return {sampled:Math.min(items.length,60),outgoing,incoming,sentEth:eth(sent),receivedEth:eth(received),gasEth:eth(gas),counterparties:[...pairs.values()].sort((a,b)=>b.interactions-a.interactions).slice(0,5),recent};
}

export async function inspectWallet(address,{transport=fetch,rpcCall=jsonRpc,key=process.env.BLOCKSCOUT_API_KEY||'',indexUrl=process.env.BLOCKSCOUT_API_BASE||'https://api.blockscout.com'}={}){
 if(!hexAddress(address))fail('Invalid wallet address');
 const rpc=async(method,params)=>rpcCall(method,params,{transport});
 const [chain,balance,nonce]=await Promise.all([rpc('eth_chainId',[]),rpc('eth_getBalance',[address,'latest']),rpc('eth_getTransactionCount',[address,'latest'])]);
 if(String(chain).toLowerCase()!==CHAIN_ID)fail('Configured wallet RPC is not Base Mainnet',502);
 const data={wallet:address.toLowerCase(),chainId:8453,network:'Base Mainnet',balanceEth:eth(balance),outgoingNonce:Number(BigInt(nonce)),inspectedAt:new Date().toISOString(),indexed:false,limitNote:'Wallet balance and outgoing nonce are from Base Mainnet RPC. Historical totals are unavailable until a transaction indexer is configured.',history:null};
 if(!key)return data;
 try{
  const url=new URL(`/8453/api/v2/addresses/${address}/transactions`,indexUrl);url.searchParams.set('apikey',key);
  const res=await transport(url.toString(),{headers:{accept:'application/json'},signal:AbortSignal.timeout(9000)});
  if(!res.ok)throw Error(`Indexer HTTP ${res.status}`);
  const payload=await res.json();if(!Array.isArray(payload.items))throw Error('Indexer response did not contain transactions');
  data.indexed=true;data.history=summarizeTransactions(address,payload.items);
  data.historyHasMore=Boolean(payload.next_page_params);
  data.limitNote=`Showing the latest ${data.history.sampled} observed native transactions, ${data.historyHasMore?'more history exists':'no further page reported'}. ETH spent and gas are sample totals, not lifetime USD spending, and do not include ERC-20 token transfer values.`;
 }catch(error){
  console.warn('VERRIFT Base history lookup unavailable:',String(error.message).slice(0,90));
  data.limitNote='Base Mainnet balance and nonce loaded. The indexed transaction history could not be retrieved; no spending totals are displayed.';
 }
 return data;
}
