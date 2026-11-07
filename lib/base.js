import {hexAddress,isHexHash,fail} from './utils.js';
export const BASE_CHAIN_ID='0x14a34';
export const BASE_SEPOLIA_EXPLORER='https://sepolia.basescan.org/tx/';
export function ethToWei(value){
 if(typeof value!=='string'||!/^\d+(\.\d{1,18})?$/.test(value))fail('Enter an ETH amount with at most 18 decimal places');
 const [whole,frac='']=value.split('.'); const n=BigInt(whole)*10n**18n+BigInt((frac+'0'.repeat(18)).slice(0,18));
 if(n<1000000000000n||n>100000000000000000n)fail('Use 0.000001 to 0.1 test ETH');return n;
}
export async function rpc(method,params=[],{rpcUrl=process.env.BASE_SEPOLIA_RPC||'https://sepolia.base.org',transport=fetch}={}){
 const response=await transport(rpcUrl,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method,params}),signal:AbortSignal.timeout(10000)});
 if(!response.ok)fail('Base RPC temporarily unavailable',502);
 const body=await response.json();if(body.error)fail(`Base RPC error: ${String(body.error.message||'unknown').slice(0,130)}`,502);return body.result;
}
export async function verifyTransfer({hash,from,to,amountEth},{call=rpc}={}){
 if(!isHexHash(hash)||!hexAddress(from)||!hexAddress(to))fail('Invalid transaction or wallet address');
 const chain=await call('eth_chainId');if(chain?.toLowerCase()!==BASE_CHAIN_ID)fail('RPC endpoint is not Base Sepolia',502);
 const [receipt,tx]=await Promise.all([call('eth_getTransactionReceipt',[hash]),call('eth_getTransactionByHash',[hash])]);
 if(!receipt||!tx)fail('Transaction is not yet confirmed; retry verification',409);
 if(receipt.status!=='0x1')fail('Transaction reverted; reward not recorded',409);
 if(String(tx.from).toLowerCase()!==from.toLowerCase()||String(tx.to).toLowerCase()!==to.toLowerCase()||BigInt(tx.value)!==ethToWei(amountEth))fail('Transaction does not match this repair reward',409);
 if(!receipt.blockNumber)fail('Transaction not included in a block',409);
 return {hash,from:tx.from,to:tx.to,amountEth,blockNumber:parseInt(receipt.blockNumber,16),explorer:BASE_SEPOLIA_EXPLORER+hash};
}

// The data is recorded in transaction input, not a token or deployed contract.
// Prefix ASCII "VERRIFT" (7 bytes) followed by a 32-byte SHA-256 evidence digest.
export function proofData(digest){
 if(typeof digest!=='string'||!/^0x[a-f0-9]{64}$/i.test(digest))fail('Invalid evidence digest');
 return '0x56455252494654'+digest.slice(2).toLowerCase();
}
export async function verifyAnchor({hash,from,digest},{call=rpc}={}){
 if(!isHexHash(hash)||!hexAddress(from))fail('Invalid anchor hash or signer');
 const chain=await call('eth_chainId');if(String(chain).toLowerCase()!==BASE_CHAIN_ID)fail('Not connected to Base Sepolia',502);
 const [receipt,tx]=await Promise.all([call('eth_getTransactionReceipt',[hash]),call('eth_getTransactionByHash',[hash])]);
 if(!tx||!receipt||!receipt.blockNumber)fail('Anchor is not confirmed',409);
 if(receipt.status!=='0x1'||String(tx.from).toLowerCase()!==from.toLowerCase()||String(tx.to).toLowerCase()!==from.toLowerCase()||BigInt(tx.value)!==0n||String(tx.input||tx.data).toLowerCase()!==proofData(digest))fail('Onchain transaction does not match this exact evidence proof',409);
 return {hash,from,digest,blockNumber:parseInt(receipt.blockNumber,16),explorer:BASE_SEPOLIA_EXPLORER+hash};
}
