import test from 'node:test';
import assert from 'node:assert/strict';
import {requestVibesQuote,verifyVibesSwap,ethToWei,format18,TRANSFER_TOPIC,parseQuoteProof,NATIVE_ETH} from '../lib/vibes-swap.js';
import {VIBES_TOKEN} from '../lib/wallet-safety.js';
import {mkdtemp,rm} from 'node:fs/promises';
import os from 'node:os';import path from 'node:path';import http from 'node:http';
import {Store} from '../lib/store.js';import {createHandler} from '../lib/app.js';
const A='0x'+'a'.repeat(40),B='0x'+'b'.repeat(40),router='0x'+'c'.repeat(40),hash='0x'+'d'.repeat(64),secret='test-swap-secret-test-swap-secret-test-swap-secret';
const wei='1000000000000000';
const txData='0x12345678abcdef99';
const goodReply={liquidityAvailable:true,buyToken:VIBES_TOKEN,sellToken:NATIVE_ETH,sellAmount:wei,buyAmount:'3000000000000000000',minBuyAmount:'2940000000000000000',issues:{allowance:null,simulationIncomplete:false},transaction:{to:router,data:txData,value:wei,from:A}};
const mockTransport=async(url,opts)=>{assert.match(url,/api\.0x\.org\/swap\/allowance-holder\/quote/);const u=new URL(url);assert.equal(u.searchParams.get('chainId'),'8453');assert.equal(u.searchParams.get('taker'),A);assert.equal(u.searchParams.get('buyToken'),VIBES_TOKEN);assert.equal(u.searchParams.get('sellToken').toLowerCase(),NATIVE_ETH.toLowerCase());assert.equal(opts.headers['0x-version'],'v2');return {ok:true,json:async()=>goodReply};};
test('ETH conversion rejects negative, zero, dust, oversized and malformed amounts',()=>{
 assert.equal(ethToWei('0.001').toString(),wei);
 for(const value of ['0','0.0','0.00000000001','0.5','100','-0.001','0.001eth','1e-3','0.0000000000000000001',0.001])assert.throws(()=>ethToWei(value));
 assert.equal(format18('3200000000000000000'),'3.20000');
});
test('0x quoted Base VIBES swap has exactly matched wallet, tokens, ETH and route, not a simulated transfer',async()=>{
 const quote=await requestVibesQuote({owner:A,amountEth:'0.001',slippageBps:100},{apiKey:'test-0x-key',transport:mockTransport,secret});
 assert.equal(quote.expectedVibes,'3.00000');assert.equal(quote.minimumVibes,'2.94000');assert.equal(quote.tx.value,'0x38d7ea4c68000');
 const decoded=parseQuoteProof(quote.quoteProof,{secret});assert.equal(decoded.owner,A);assert.equal(decoded.to,router);
 assert.throws(()=>parseQuoteProof(quote.quoteProof.slice(0,-5)+'zzzzz',{secret}),/modified/);
});
test('quote refuses missing 0x key, no liquidity, injected token and unrequested ETH',async()=>{
 await assert.rejects(requestVibesQuote({owner:A,amountEth:'0.001'},{apiKey:null,secret}),/ZEROX_API_KEY/);
 const make=reply=>async()=>({ok:true,json:async()=>reply});
 await assert.rejects(requestVibesQuote({owner:A,amountEth:'0.001'},{apiKey:'x',secret,transport:make({...goodReply,liquidityAvailable:false})}),/No executable/);
 await assert.rejects(requestVibesQuote({owner:A,amountEth:'0.001'},{apiKey:'x',secret,transport:make({...goodReply,buyToken:B})}),/Unexpected token/);
 await assert.rejects(requestVibesQuote({owner:A,amountEth:'0.001'},{apiKey:'x',secret,transport:make({...goodReply,transaction:{...goodReply.transaction,value:'1000000000000000000'}})}),/unexpected transaction/);
});
const log={address:VIBES_TOKEN,topics:[TRANSFER_TOPIC,'0x'+'0'.repeat(64),'0x'+A.slice(2).padStart(64,'0')],data:'0x'+(3n*10n**18n).toString(16)};
const response={eth_chainId:'0x2105',eth_getTransactionByHash:{from:A,to:router,input:txData,value:'0x38d7ea4c68000'},eth_getTransactionReceipt:{status:'0x1',blockNumber:'0x20',logs:[log]}};
test('verified swap requires confirmed matching Base mainnet transaction and actual VIBES transfer log',async()=>{
 const quote=await requestVibesQuote({owner:A,amountEth:'0.001'},{apiKey:'x',secret,transport:mockTransport});
 const input={owner:A,hash,quoteProof:quote.quoteProof};const call=async method=>response[method];
 const result=await verifyVibesSwap(input,{secret,call});assert.equal(result.receivedVibes,'3.00000');assert.equal(result.blockNumber,32);
 await assert.rejects(verifyVibesSwap(input,{secret,call:async method=>method==='eth_getTransactionReceipt'?{...response[method],logs:[]}:response[method]}),/VIBES token transfer/);
 await assert.rejects(verifyVibesSwap(input,{secret,call:async method=>method==='eth_getTransactionByHash'?{...response[method],from:B}:response[method]}),/does not match/);
 await assert.rejects(verifyVibesSwap(input,{secret,call:async method=>method==='eth_chainId'?'0x14a34':response[method]}),/Base Mainnet/);
});
test('swap endpoints require signed-in wallet, isolate receipts and do not auto-pay token rewards',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'v9-swap-'));
 const store=new Store({file:path.join(dir,'state.json'),supabaseUrl:null,supabaseSecret:null,redisUrl:null,redisToken:null});
 const fakeQuote={tx:{to:router,data:txData,value:'0x1'},expectedVibes:'3.00000',minimumVibes:'2.94000',quoteProof:'mock',chainId:8453};
 const handler=createHandler({store,sessionSecret:secret,swapQuoter:async({owner})=>({...fakeQuote,owner}),swapVerifier:async({owner,hash:tx})=>({owner,hash:tx,spentEth:'0.00100',receivedVibes:'3.00000',blockNumber:32,explorer:'https://basescan.org/tx/'+tx}),authExchanger:async({message})=>({id:'id_'+message.match(/\n(0x[a-f0-9]{40})\n/i)[1].slice(2)})});
 const server=http.createServer(handler);await new Promise(r=>server.listen(0,'127.0.0.1',r));const url='http://127.0.0.1:'+server.address().port;
 function client(){let cookies='';return {async request(route,method='GET',payload){const res=await fetch(url+route,{method,headers:{...(payload?{'content-type':'application/json'}:{}),...(cookies?{cookie:cookies}:{})},body:payload?JSON.stringify(payload):undefined});for(const line of res.headers.getSetCookie?.()||[]){const [k,v]=line.split(';')[0].split('=');const all=new Map(cookies?cookies.split('; ').map(x=>x.split('=')):[]);if(v)all.set(k,v);else all.delete(k);cookies=[...all].map(([a,b])=>a+'='+b).join('; ');}return {status:res.status,data:await res.json()};},async login(wallet){await this.request('/api/status');const ch=await this.request('/api/auth/challenge?address='+wallet);assert.equal(ch.status,200);const ok=await this.request('/api/auth/verify','POST',{message:ch.data.message,signature:'0x'+'1'.repeat(130)});assert.equal(ok.status,200);}}}
 try{
  const guest=client();assert.equal((await guest.request('/api/wallet/swap/quote','POST',{amountEth:'0.001'})).status,401);
  const alice=client(),bob=client();await alice.login(A);await bob.login(B);
  assert.equal((await alice.request('/api/status')).data.tokenRewardsFunded,false);
  const q=await alice.request('/api/wallet/swap/quote','POST',{amountEth:'0.001'});assert.equal(q.status,200);assert.equal(q.data.quote.owner,A);
  const v=await alice.request('/api/wallet/swap/verify','POST',{hash,quoteProof:'mock'});assert.equal(v.status,200);assert.equal((await alice.request('/api/profile')).data.swaps.length,1);assert.equal((await bob.request('/api/profile')).data.swaps.length,0);
 }finally{await new Promise(ok=>server.close(ok));await rm(dir,{recursive:true,force:true});}
});
