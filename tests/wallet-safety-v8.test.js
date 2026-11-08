import test from 'node:test';
import assert from 'node:assert/strict';
import {readAllowance,readVibesBalance,discoverRecentApprovals,verifyRevocation,allowanceCalldata,revokeCalldata,APPROVAL_TOPIC,VIBES_TOKEN,USDC_TOKEN,PERMIT2} from '../lib/wallet-safety.js';
import {Store} from '../lib/store.js';
import {createHandler} from '../lib/app.js';
import {mkdtemp,rm} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
const A='0x'+'1'.repeat(40),B='0x'+'2'.repeat(40),C='0x'+'3'.repeat(40);
const txHash='0x'+'a'.repeat(64);
const topic=a=>'0x'+a.slice(2).padStart(64,'0');
const baseVibes={contract:VIBES_TOKEN,chainId:8453,raw:'2000000000000000000',balance:'2.0000',holder:true,checkedAt:'2026-11-08T00:00:00Z'};
test('ERC-20 calldata encodes exact owner, token, spender without arbitrary targets',()=>{
 assert.equal(allowanceCalldata(A,B),'0xdd62ed3e'+A.slice(2).repeat(1).padStart(64,'0')+B.slice(2).padStart(64,'0'));
 assert.equal(revokeCalldata(B),'0x095ea7b3'+B.slice(2).padStart(64,'0')+'0'.repeat(64));
 for(const x of ['0x123',null,'https://example.org',C.slice(0,30)])assert.throws(()=>revokeCalldata(x));
});
test('read actual allowance and VIBES token balance, no made-up score',async()=>{
 const call=async(method,params)=>{
  assert.equal(method,'eth_call');if(params[0].to.toLowerCase()===VIBES_TOKEN)return '0x1bc16d674ec80000';return '0xffff';
 };
 const a=await readAllowance(A,USDC_TOKEN,B,{call});assert.equal(a.allowanceRaw,'65535');assert.equal(a.active,true);assert.equal(a.unlimited,false);
 const v=await readVibesBalance(A,{call});assert.equal(v.holder,true);assert.equal(v.balance,'2.0000');
 assert.equal((await readAllowance(A,USDC_TOKEN,B,{call:async()=> '0x0'})).active,false);
});
test('recent Approval events distinguish ERC-20 and ERC-721 and check current allowance',async()=>{
 const call=async(method,params)=>{
  if(method==='eth_blockNumber')return '0x2710';
  if(method==='eth_getLogs'){
   assert.equal(params[0].topics[0],APPROVAL_TOPIC);assert.equal(params[0].topics[1],topic(A));
   return [
    {address:USDC_TOKEN,topics:[APPROVAL_TOPIC,topic(A),topic(B)],transactionHash:txHash},
    {address:USDC_TOKEN,topics:[APPROVAL_TOPIC,topic(A),topic(C),topic(C)],transactionHash:txHash},
   ];
  }
  if(method==='eth_call')return '0x10';throw Error(method);
 };
 const report=await discoverRecentApprovals(A,{call,blocks:100});
 assert.equal(report.fromBlock,9900);assert.equal(report.approvals.length,1);assert.equal(report.approvals[0].spender,B);
 assert.equal(report.completeHistory,false);assert.match(report.note,/not proof/);
});
test('revoke requires confirmed, matching mainnet transaction and zero current allowance',async()=>{
 const good=async(method)=>({eth_chainId:'0x2105',eth_getTransactionByHash:{from:A,to:USDC_TOKEN,input:revokeCalldata(B),value:'0x0'},eth_getTransactionReceipt:{status:'0x1',blockNumber:'0xff'},eth_call:'0x0'})[method];
 const proof=await verifyRevocation({owner:A,token:USDC_TOKEN,spender:B,hash:txHash},{call:good});assert.equal(proof.allowanceRaw,'0');
 await assert.rejects(verifyRevocation({owner:A,token:USDC_TOKEN,spender:B,hash:txHash},{call:async(method)=>method==='eth_call'?'0x1':good(method)}),/still nonzero/);
 await assert.rejects(verifyRevocation({owner:A,token:USDC_TOKEN,spender:B,hash:txHash},{call:async(method)=>method==='eth_getTransactionByHash'?{from:C,to:USDC_TOKEN,input:revokeCalldata(B),value:'0x0'}:good(method)}),/not a matching/);
 await assert.rejects(verifyRevocation({owner:A,token:USDC_TOKEN,spender:B,hash:txHash},{call:async(method)=>method==='eth_chainId'?'0x14a34':good(method)}),/Wrong chain/);
});
async function fixture(){
 const dir=await mkdtemp(path.join(os.tmpdir(),'v8-safety-'));
 const store=new Store({file:path.join(dir,'state.json'),supabaseUrl:null,supabaseSecret:null,redisUrl:null,redisToken:null});
 const handler=createHandler({store,sessionSecret:'test-secret-test-secret-test-secret-test-secret',walletInspector:async address=>({wallet:address,balanceEth:'1.000000',outgoingNonce:7,inspectedAt:'2026-11-08T00:00:00Z'}),vibesReader:async address=>({...baseVibes,holder:address.toLowerCase()===A.toLowerCase()}),allowanceReader:async(owner,token,spender)=>({token,spender,allowanceRaw:'9',active:true}),approvalsReader:async()=>({approvals:[],fromBlock:1,toBlock:2,note:'limited',unreadablePairs:0}),revokeVerifier:async ({owner,token,spender,hash})=>({owner,token,spender,hash,allowanceRaw:'0',explorer:'https://basescan.org/tx/'+hash,confirmedAt:new Date().toISOString()}),authExchanger:async({message})=>({id:'test_'+message.match(/\n(0x[a-f0-9]{40})\n/i)[1].slice(2).toLowerCase()})});
 const server=http.createServer(handler);await new Promise(ok=>server.listen(0,'127.0.0.1',ok));const base=`http://127.0.0.1:${server.address().port}`;
 function client(){const jar=new Map();async function call(route,method='GET',body){const res=await fetch(base+route,{method,headers:{...(body?{'content-type':'application/json'}:{}),...(jar.size?{cookie:[...jar].map(([k,v])=>k+'='+v).join('; ')}:{})},body:body?JSON.stringify(body):undefined});for(const line of res.headers.getSetCookie?.()||[]){const [k,v]=line.split(';')[0].split('=');if(v)jar.set(k,v);else jar.delete(k);}return {status:res.status,data:await res.json()};}async function login(wallet){await call('/api/status');const c=await call('/api/auth/challenge?address='+wallet);assert.equal(c.status,200);const v=await call('/api/auth/verify','POST',{message:c.data.message,signature:'0x'+'1'.repeat(130)});assert.equal(v.status,200);}return {call,login};}
 return {client,close:async()=>{await new Promise(ok=>server.close(ok));await rm(dir,{recursive:true,force:true});}};
}
test('guest can read public Base preview but cannot scan or revoke another user wallet',async()=>{
 const f=await fixture();try{const c=f.client();const g=await c.call('/api/public/scan?address='+A);assert.equal(g.status,200);assert.equal(g.data.vibes.holder,true);assert.equal((await c.call('/api/wallet/approvals')).status,401);assert.equal((await c.call('/api/profile/checkin','POST',{})).status,401);await c.login(A);assert.equal((await c.call('/api/wallet/approvals')).status,200);assert.equal((await c.call('/api/wallet/allowance?token='+USDC_TOKEN+'&spender='+B)).status,200);}
 finally{await f.close();}
});
test('daily UTC streak stored per owner and cannot be claimed twice on same day',async()=>{
 const f=await fixture();try{const alice=f.client(),bob=f.client();await alice.login(A);const first=await alice.call('/api/profile/checkin','POST',{});assert.equal(first.status,200);assert.equal(first.data.profile.streak,1);assert.equal(first.data.profile.points,15);assert.equal((await alice.call('/api/profile/checkin','POST',{})).status,409);await bob.login(B);const b=await bob.call('/api/profile');assert.equal(b.data.profile.points,0);const claim=await bob.call('/api/profile/checkin','POST',{});assert.equal(claim.data.profile.points,10);assert.equal((await alice.call('/api/profile')).data.profile.points,15);}
 finally{await f.close();}
});
test('receipt history is account-isolated and cannot be forged through body totals',async()=>{
 const f=await fixture();try{const alice=f.client(),bob=f.client();await alice.login(A);await bob.login(B);const p=await alice.call('/api/wallet/revoke/verify','POST',{hash:txHash,token:USDC_TOKEN,spender:C,fakeBalance:'9999999'});assert.equal(p.status,200);assert.equal(p.data.proof.allowanceRaw,'0');assert.equal((await alice.call('/api/profile')).data.revocations.length,1);assert.equal((await bob.call('/api/profile')).data.revocations.length,0);}
 finally{await f.close();}
});
