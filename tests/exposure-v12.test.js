import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {createHandler} from '../lib/app.js';
import {inspectPermissionExposure,delegationFromCode} from '../lib/exposure.js';

const OWNER='0x'+'a'.repeat(40),TOKEN='0x'+'b'.repeat(40),SPENDER='0x'+'c'.repeat(40),DELEGATE='0x'+'d'.repeat(40);
const hash='0x'+'e'.repeat(64);
function fakeCall({amount=100000000n,allowance=25000000n,walletCode='0x',chain='0x2105',tokenDecimals=6n}={}){
 const calls=[];
 const call=async(method,params=[])=>{
  calls.push([method,params]);
  if(method==='eth_chainId')return chain;
  if(method==='eth_blockNumber')return '0x42';
  if(method==='eth_getBlockByNumber')return {number:'0x42',hash};
  if(method==='eth_getCode')return params[0].toLowerCase()===OWNER.toLowerCase()?walletCode:'0x60016001';
  if(method==='eth_call'){
   const selector=params[0].data.slice(0,10);
   return '0x'+(selector==='0x70a08231'?amount:selector==='0xdd62ed3e'?allowance:tokenDecimals).toString(16).padStart(64,'0');
  }
  throw Error('Unexpected call '+method);
 };
 return {call,calls};
}
test('same-block Base ERC-20 evidence is internally consistent and non-custodial',async()=>{
 const spy=fakeCall();const report=await inspectPermissionExposure({owner:OWNER,token:TOKEN,spender:SPENDER},{call:spy.call});
 assert.equal(report.chainId,8453);assert.equal(report.blockNumber,66);assert.equal(report.blockHash,hash);
 assert.equal(report.balanceRaw,'100000000');assert.equal(report.allowanceRaw,'25000000');assert.equal(report.potentiallyExposedRaw,'25000000');
 assert.equal(report.balanceFormatted,'100');assert.equal(report.allowanceFormatted,'25');assert.equal(report.activeAllowance,true);
 for(const [name,args] of spy.calls.filter(([name])=>['eth_call','eth_getCode'].includes(name)))assert.equal(args.at(-1),'0x42',name+' must be pinned to exact block');
 assert.ok(!spy.calls.some(([name])=>['eth_sendTransaction','eth_sendRawTransaction','personal_sign'].includes(name)));
});
test('wallet EIP-7702 code marker identifies delegate without trusting the delegate',async()=>{
 const spy=fakeCall({walletCode:'0xef0100'+DELEGATE.slice(2)});const r=await inspectPermissionExposure({owner:OWNER,token:TOKEN,spender:SPENDER},{call:spy.call});
 assert.deepEqual(r.ownerCode,{kind:'eip7702',delegate:DELEGATE});
 assert.deepEqual(delegationFromCode('0x'),{kind:'no_code',delegate:null});
 assert.equal(delegationFromCode('0xef0100'+'0'.repeat(40)).kind,'eip7702');
 assert.equal(delegationFromCode('not-hex').kind,'unknown');
});
test('zero token balance does not remove future allowance exposure',async()=>{
 const spy=fakeCall({amount:0n,allowance:2n**256n-1n});const r=await inspectPermissionExposure({owner:OWNER,token:TOKEN,spender:SPENDER},{call:spy.call});
 assert.equal(r.activeAllowance,true);assert.equal(r.unlimitedAllowance,true);assert.equal(r.potentiallyExposedRaw,'0');
 assert.match(r.interpretation,/Future receipts of the token could be exposed/);
});
test('zero allowance must never be shown as risk-free wallet certification',async()=>{
 const spy=fakeCall({amount:100n,allowance:0n});const r=await inspectPermissionExposure({owner:OWNER,token:TOKEN,spender:SPENDER},{call:spy.call});
 assert.equal(r.activeAllowance,false);assert.match(r.interpretation,/for this exact spender/);assert.match(r.limits,/Permit2/);
});
test('reject invalid/wrong-chain/unreadable token responses safely',async()=>{
 await assert.rejects(()=>inspectPermissionExposure({owner:'no',token:TOKEN,spender:SPENDER},{call:fakeCall().call}),/valid nonzero owner/);
 await assert.rejects(()=>inspectPermissionExposure({owner:OWNER,token:TOKEN,spender:SPENDER},{call:fakeCall({chain:'0x1'}).call}),/not connected to Base Mainnet/);
 const spy=fakeCall();await assert.rejects(()=>inspectPermissionExposure({owner:OWNER,token:TOKEN,spender:SPENDER},{call:async(method,params)=>method==='eth_call'&&params[0].data.startsWith('0xdd62ed3e')?'0x':spy.call(method,params)}),/not a standard uint256/);
});
test('public HTTP exposure endpoint accepts valid addresses and blocks malformed ones',async()=>{
 const handler=createHandler({sessionSecret:'this-is-a-long-session-secret-for-tests-123456',exposureReader:async input=>({chainId:8453,blockNumber:66,...input})});
 const srv=http.createServer(handler);await new Promise(ok=>srv.listen(0,'127.0.0.1',ok));
 try{
  const port=srv.address().port,origin=`http://127.0.0.1:${port}`;
  const good=await fetch(origin+'/api/token/exposure?'+new URLSearchParams({owner:OWNER,token:TOKEN,spender:SPENDER}));
  assert.equal(good.status,200);assert.equal((await good.json()).exposure.blockNumber,66);
  const bad=await fetch(origin+'/api/token/exposure?'+new URLSearchParams({owner:OWNER,token:'invalid',spender:SPENDER}));assert.equal(bad.status,400);
 }finally{await new Promise(ok=>srv.close(ok));}
});
test('interface exposes the chain-backed workflow with evidence caveats and responsive styles',async()=>{
 const html=await readFile(new URL('../public/verify.html',import.meta.url),'utf8');
 const js=await readFile(new URL('../public/exposure.js',import.meta.url),'utf8');
 const landing=await readFile(new URL('../public/index.html',import.meta.url),'utf8');
 const css=await readFile(new URL('../public/ui-v12.css',import.meta.url),'utf8');
 const workspace=await readFile(new URL('../public/app.js',import.meta.url),'utf8');
 assert.match(html,/id="v12-exposure-form"/);assert.match(html,/id="v12-exposure-result"/);
 assert.match(js,/api\/token\/exposure/);assert.match(landing,/November 2026 Denim upgrade/);assert.match(landing,/href="\/verify#exposure"/);
 assert.match(css,/@media\(max-width:700px\)/);assert.match(workspace,/Cross-check balance and allowance at one Base block/);assert.doesNotMatch(landing,/—/);
});
