import {hexAddress,fail} from './utils.js';

const MAINNET_RPC='https://mainnet.base.org';
const CHAIN_ID='0x2105'; // Base mainnet, chain 8453.
const WEI=10n**18n;
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
