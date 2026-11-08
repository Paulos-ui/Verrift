/** VERRIFT V8: read-only Base Mainnet allowance observations and receipt-verified revocations.
 * Supports standard ERC-20 allowance only. Permit2 downstream signatures, NFT operator
 * approvals, EIP-7702 delegations, and all-time approval enumeration are NOT covered. */
import {hexAddress,isHexHash,fail} from './utils.js';

export const BASE_MAINNET_CHAIN='0x2105';
export const VIBES_TOKEN='0xeffc8815487084a97edfdff968b56ea123421acb';
export const USDC_TOKEN='0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
export const PERMIT2='0x000000000022d473030f116ddee9f6b43ac78ba3';
export const APPROVAL_TOPIC='0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925';
const ZERO='0x'+'0'.repeat(40);
const RPC=process.env.BASE_MAINNET_RPC||'https://mainnet.base.org';
const pad=a=>a.slice(2).toLowerCase().padStart(64,'0');

export async function mainnetCall(method,params=[],{transport=fetch,rpcUrl=RPC}={}){
 const response=await transport(rpcUrl,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method,params}),signal:AbortSignal.timeout(8500)});
 if(!response.ok)fail('Base Mainnet RPC returned HTTP '+response.status,502);
 const data=await response.json();if(data.error||data.result===undefined||data.result===null)fail('Base RPC: '+String(data.error?.message||'No result').slice(0,100),502);
 return data.result;
}
export const allowanceCalldata=(owner,spender)=>{
 if(!hexAddress(owner)||!hexAddress(spender))fail('Invalid token allowance addresses');
 return '0xdd62ed3e'+pad(owner)+pad(spender);
};
export const revokeCalldata=(spender)=>{
 if(!hexAddress(spender)||spender.toLowerCase()===ZERO)fail('Enter a valid nonzero spender address');
 return '0x095ea7b3'+pad(spender)+'0'.repeat(64);
};
export async function readAllowance(owner,token,spender,{call=mainnetCall}={}){
 if(!hexAddress(owner)||!hexAddress(token)||!hexAddress(spender)||spender.toLowerCase()===ZERO)fail('Invalid token or spender address');
 const raw=await call('eth_call',[{to:token,data:allowanceCalldata(owner,spender)},'latest']);
 if(typeof raw!=='string'||!/^0x[0-9a-f]+$/i.test(raw))fail('Token did not return a standard ERC-20 allowance',422);
 return {token:token.toLowerCase(),spender:spender.toLowerCase(),allowanceRaw:BigInt(raw).toString(),active:BigInt(raw)>0n,unlimited:BigInt(raw)>=2n**255n,tokenSymbol:token.toLowerCase()===USDC_TOKEN?'USDC':token.toLowerCase()===VIBES_TOKEN?'VIBES':null,asOf:new Date().toISOString()};
}
export async function readVibesBalance(owner,{call=mainnetCall}={}){
 if(!hexAddress(owner))fail('Invalid wallet address');
 const raw=await call('eth_call',[{to:VIBES_TOKEN,data:'0x70a08231'+pad(owner)},'latest']);
 if(typeof raw!=='string'||!/^0x[0-9a-f]+$/i.test(raw))fail('VIBES contract balance could not be read',502);
 const n=BigInt(raw);const decimals=18n;return {contract:VIBES_TOKEN,chainId:8453,raw:n.toString(),balance:(n/10n**decimals).toString()+'.'+(n%10n**decimals).toString().padStart(18,'0').slice(0,4),holder:n>0n,checkedAt:new Date().toISOString()};
}
export async function discoverRecentApprovals(owner,{call=mainnetCall,blocks=8000}={}){
 if(!hexAddress(owner))fail('Invalid wallet address');
 if(!Number.isInteger(blocks)||blocks<1||blocks>12000)fail('Invalid scan range');
 const latest=BigInt(await call('eth_blockNumber',[]));const from=latest>BigInt(blocks)?latest-BigInt(blocks):0n;
 const logs=await call('eth_getLogs',[{fromBlock:'0x'+from.toString(16),toBlock:'0x'+latest.toString(16),topics:[APPROVAL_TOPIC,'0x'+pad(owner)]}]);
 if(!Array.isArray(logs))fail('Approval event scan returned unexpected data',502);
 const unique=new Map();
 for(const log of [...logs].reverse()){
  // ERC-721 Approval has four topics. Do not interpret it as ERC-20.
  if(log.topics?.length!==3||!hexAddress(log.address)||!/^0x[\da-f]{64}$/i.test(log.topics[2]||''))continue;
  const spender='0x'+log.topics[2].slice(-40);const token=log.address.toLowerCase();
  if(spender.toLowerCase()===ZERO)continue;
  const key=token+':'+spender.toLowerCase();if(!unique.has(key))unique.set(key,{token,spender,transaction:log.transactionHash});
  if(unique.size>=12)break;
 }
 const approvals=[];const failed=[];
 for(const item of unique.values()){
  try{approvals.push({...await readAllowance(owner,item.token,item.spender,{call}),lastObservedTransaction:item.transaction});}
  catch{failed.push(item.token);}
 }
 return {approvals:approvals.filter(item=>item.active),observedPairs:unique.size,unreadablePairs:failed.length,fromBlock:Number(from),toBlock:Number(latest),completeHistory:false,note:'Only ERC-20 Approval events in this recent block window were sampled. Zero findings is not proof that a wallet has no older allowances, Permit2 subapprovals, NFT operators, or smart account delegations.'};
}
export async function verifyRevocation({owner,token,spender,hash},{call=mainnetCall}={}){
 if(!hexAddress(owner)||!hexAddress(token)||!hexAddress(spender)||!isHexHash(hash))fail('Invalid revocation verification parameters');
 if(String(await call('eth_chainId',[])).toLowerCase()!==BASE_MAINNET_CHAIN)fail('Wrong chain for revocation verification',502);
 const [tx,receipt]=await Promise.all([call('eth_getTransactionByHash',[hash]),call('eth_getTransactionReceipt',[hash])]);
 if(!tx||!receipt?.blockNumber)fail('Transaction not yet confirmed on Base Mainnet',409);
 const calldata=revokeCalldata(spender);
 if(String(receipt.status).toLowerCase()!=='0x1'||String(tx.from).toLowerCase()!==owner.toLowerCase()||String(tx.to).toLowerCase()!==token.toLowerCase()||String(tx.input||tx.data).toLowerCase()!==calldata.toLowerCase()||BigInt(tx.value||'0x0')!==0n)fail('Transaction is not a matching confirmed ERC-20 revoke',409);
 const observed=await readAllowance(owner,token,spender,{call});
 if(observed.active)fail('Transaction confirmed but current allowance is still nonzero. Recheck token state.',409);
 return {owner:owner.toLowerCase(),token:token.toLowerCase(),spender:spender.toLowerCase(),hash,confirmedAt:new Date().toISOString(),blockNumber:Number(BigInt(receipt.blockNumber)),allowanceRaw:'0',network:'Base Mainnet',explorer:`https://basescan.org/tx/${hash}`};
}
