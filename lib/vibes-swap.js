/** VERRIFT V9, Base Mainnet ETH -> VIBES. No custodial funds, no ERC-20 approvals.
 * Firm quotes are fetched server-side from 0x API v2 and must be explicitly signed
 * by the owner's wallet. No trade is considered completed without matching chain evidence.
 */
import crypto from 'node:crypto';
import {VIBES_TOKEN,mainnetCall} from './wallet-safety.js';
import {hexAddress,isHexHash,fail} from './utils.js';

export const NATIVE_ETH='0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';
export const BASE_CHAIN=8453;
export const TRANSFER_TOPIC='0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
const HEX_BYTES=/^0x(?:[0-9a-f]{2})+$/i;
const signed=(text,secret)=>crypto.createHmac('sha256',secret).update(text).digest('base64url');
export function ethToWei(amount){
 if(typeof amount!=='string'||!/^(?:0|[1-9]\d{0,1})(?:\.\d{1,18})?$/.test(amount))fail('Enter a valid ETH amount with at most 18 decimals');
 const [whole,part='']=amount.split('.');const n=BigInt(whole)*10n**18n+BigInt((part+'0'.repeat(18)).slice(0,18));
 if(n<10n**13n||n>5n*10n**16n)fail('For this launch, use 0.00001 to 0.05 ETH per swap');
 return n;
}
export function format18(wei,places=5){
 const raw=BigInt(wei);return (raw/10n**18n).toString()+'.'+(raw%10n**18n).toString().padStart(18,'0').slice(0,places);
}
export function validateQuote(value,{owner,sellWei}={}){
 if(!value?.liquidityAvailable)fail('No executable VIBES route is available at this amount. Nothing was sent.',422);
 if(String(value.buyToken).toLowerCase()!==VIBES_TOKEN||String(value.sellToken).toLowerCase()!==NATIVE_ETH.toLowerCase())fail('Unexpected token pair returned by swap provider',502);
 if(BigInt(value.sellAmount||0)!==sellWei||BigInt(value.buyAmount||0)<=0n||BigInt(value.minBuyAmount||0)<=0n)fail('Swap quote amount mismatch',502);
 if(BigInt(value.minBuyAmount)>BigInt(value.buyAmount))fail('Provider returned an invalid minimum received amount',502);
 if(value.issues?.allowance)fail('Unexpected token approval requested for native ETH swap',502);
 if(value.issues?.balance&&BigInt(value.issues.balance.actual||0)<BigInt(value.issues.balance.expected||0))fail('Insufficient ETH for the quoted swap',422);
 if(value.issues?.simulationIncomplete)fail('Swap provider could not finish simulation. Try again later.',422);
 const t=value.transaction;
 if(!hexAddress(t?.to)||!HEX_BYTES.test(t?.data||'')||t.data.length>50000||BigInt(t.value||0)!==sellWei)fail('Swap quote returned an unexpected transaction',502);
 if(t.from&&t.from.toLowerCase()!==owner.toLowerCase())fail('Quote wallet does not match connected account',502);
 if((value.tokenMetadata?.buyToken?.buyTaxBps||0)>500)fail('Quote indicates token buy taxes above 5%. Trade disabled.',422);
 return {to:t.to.toLowerCase(),data:t.data.toLowerCase(),value:'0x'+sellWei.toString(16),minBuyAmount:String(value.minBuyAmount),buyAmount:String(value.buyAmount),sellAmount:String(sellWei)};
}
export async function requestVibesQuote({owner,amountEth,slippageBps=100},{apiKey=process.env.ZEROX_API_KEY,transport=fetch,now=Date.now(),secret=process.env.SESSION_SECRET}={}){
 if(!hexAddress(owner))fail('Connect a valid Base wallet first',401);
 if(!apiKey||apiKey.includes('REPLACE'))fail('Swap quotes unavailable until ZEROX_API_KEY is configured on the server',503);
 if(!secret||secret.length<32)fail('Swap service not configured',503);
 if(!Number.isInteger(slippageBps)||slippageBps<30||slippageBps>300)fail('Slippage must be between 0.3% and 3%');
 const amount=ethToWei(amountEth);
 const qs=new URLSearchParams({chainId:String(BASE_CHAIN),sellToken:NATIVE_ETH,buyToken:VIBES_TOKEN,sellAmount:amount.toString(),taker:owner,slippageBps:String(slippageBps)});
 const url='https://api.0x.org/swap/allowance-holder/quote?'+qs;
 let response;
 try{response=await transport(url,{headers:{'0x-api-key':apiKey,'0x-version':'v2','accept':'application/json'},signal:AbortSignal.timeout(11000)});}
 catch{fail('The swap quote provider is unavailable. No funds were moved.',502);}
 if(!response.ok){if(response.status===400||response.status===422)return fail('No executable ETH to VIBES quote. Try a smaller amount.',422);fail('The swap provider returned HTTP '+response.status,502);}
 let value;try{value=await response.json();}catch{fail('Swap provider returned invalid JSON',502);}
 const tx=validateQuote(value,{owner,sellWei:amount});
 const issuedAt=now;
 const payload={v:1,chainId:BASE_CHAIN,owner:owner.toLowerCase(),sellWei:amount.toString(),minBuyAmount:tx.minBuyAmount,to:tx.to,data:tx.data,issuedAt,expiresAt:issuedAt+90_000};
 const raw=Buffer.from(JSON.stringify(payload)).toString('base64url');
 return {buyToken:VIBES_TOKEN,sellToken:'ETH',chainId:BASE_CHAIN,expectedVibes:format18(value.buyAmount),minimumVibes:format18(value.minBuyAmount),sellEth:amountEth,slippageBps,source:'0x Swap API v2',quoteExpiresAt:new Date(payload.expiresAt).toISOString(),liquidityAvailable:true,tx:{to:tx.to,data:tx.data,value:tx.value},quoteProof:raw+'.'+signed(raw,secret)};
}
export function parseQuoteProof(proof,{secret=process.env.SESSION_SECRET}={}){
 const [raw,mac,...extra]=String(proof||'').split('.');if(!raw||!mac||extra.length||raw.length>40000||!secret)fail('Invalid swap quote proof',400);
 const expected=signed(raw,secret);if(!/^[A-Za-z0-9_-]{43}$/.test(mac)||mac.length!==expected.length||!crypto.timingSafeEqual(Buffer.from(expected),Buffer.from(mac)))fail('Swap quote was modified',400);
 let data;try{data=JSON.parse(Buffer.from(raw,'base64url').toString('utf8'));}catch{fail('Invalid quote encoding',400);}
 if(data.v!==1||data.chainId!==8453||!hexAddress(data.owner)||!hexAddress(data.to)||!HEX_BYTES.test(data.data||''))fail('Invalid swap quote contents',400);
 return data;
}
export async function verifyVibesSwap({owner,hash,quoteProof},{call=mainnetCall,secret=process.env.SESSION_SECRET}={}){
 if(!hexAddress(owner)||!isHexHash(hash))fail('Provide the Base transaction hash and connected wallet',400);
 const q=parseQuoteProof(quoteProof,{secret});if(q.owner!==owner.toLowerCase())fail('Swap quote belongs to a different wallet',403);
 if(Date.now()-q.issuedAt>72*3600*1000)fail('Quote too old to verify',410);
 const [chain,tx,receipt]=await Promise.all([call('eth_chainId',[]),call('eth_getTransactionByHash',[hash]),call('eth_getTransactionReceipt',[hash])]);
 if(String(chain).toLowerCase()!=='0x2105')fail('Proof must be from Base Mainnet',502);
 if(!tx||!receipt?.blockNumber)fail('Swap transaction is still pending or unavailable',409);
 if(String(receipt.status).toLowerCase()!=='0x1'||String(tx.from).toLowerCase()!==q.owner||String(tx.to).toLowerCase()!==q.to||String(tx.input||tx.data).toLowerCase()!==q.data||BigInt(tx.value||0)!==BigInt(q.sellWei))fail('This receipt does not match a successful VERRIFT swap quote',409);
 const transferLogs=(receipt.logs||[]).filter(l=>String(l.address).toLowerCase()===VIBES_TOKEN&&String(l.topics?.[0]).toLowerCase()===TRANSFER_TOPIC&&String(l.topics?.[2]).toLowerCase()==='0x'+owner.toLowerCase().slice(2).padStart(64,'0'));
 const received=transferLogs.reduce((total,l)=>total+BigInt(l.data||0),0n);
 if(received<BigInt(q.minBuyAmount))fail('Transaction confirmed, but the expected VIBES token transfer could not be verified',409);
 return {hash,owner:owner.toLowerCase(),receivedVibes:format18(received),receivedRaw:received.toString(),spentEth:format18(q.sellWei),blockNumber:Number(BigInt(receipt.blockNumber)),chainId:BASE_CHAIN,explorer:'https://basescan.org/tx/'+hash,verifiedAt:new Date().toISOString(),method:'Successful Base Mainnet transaction and VIBES Transfer logs'};
}
