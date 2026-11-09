import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectBaseToken} from '../lib/token-intel.js';
import {createHandler} from '../lib/app.js';
import {Store} from '../lib/store.js';
import http from 'node:http';
import {mkdtemp,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
const ADDRESS='0x'+'1'.repeat(40);
const good={
  go:{code:1,result:{[ADDRESS.toLowerCase()]:{is_open_source:'0',is_mintable:'1',sell_tax:'0.12',holder_count:'20'}}},
  honey:{simulationSuccess:true,honeypotResult:{isHoneypot:true,honeypotReason:'Example simulated sell restriction'},summary:{risk:'high'},simulationResult:{sellTax:12}},
  pools:[{chainId:'base',baseToken:{address:ADDRESS},quoteToken:{address:'0x'+'2'.repeat(40)},dexId:'uniswap',liquidity:{usd:5500},volume:{h24:1000},pairAddress:'0x'+'3'.repeat(40)}]
};
function mockedTransport(url){const payload=url.includes('gopluslabs')?good.go:url.includes('honeypot.is')?good.honey:good.pools;return Promise.resolve({ok:true,json:async()=>payload});}
test('token report includes source coverage, supported risk observations and no buy verdict',async()=>{
 const report=await inspectBaseToken(ADDRESS,{transport:mockedTransport});
 assert.equal(report.chainId,8453);assert.equal(report.status,'elevated_risk');
 assert.deepEqual(report.sources.map(s=>s.status),['available','available','available']);
 assert.ok(report.signals.find(s=>s.label==='Honeypot sell restriction'));
 assert.ok(report.signals.find(s=>s.label==='Limited reported liquidity'));
 assert.equal(report.market.topPool.liquidityUsd,5500);
 assert.match(report.disclaimer,/not a safety certificate/);
});
test('missing third-party providers lead to insufficient evidence, never a safe result',async()=>{
 const report=await inspectBaseToken(ADDRESS,{transport:async()=>{throw Error('upstream unavailable');}});
 assert.equal(report.status,'insufficient_evidence');
 assert.equal(report.signals.length,0);assert.equal(report.sources.every(s=>s.status==='unavailable'),true);
});
test('contract research rejects malformed or non-address requests',async()=>{
 for(const bad of ['ETH','0x123','https://example.com','0x'+'g'.repeat(40)])await assert.rejects(inspectBaseToken(bad,{transport:mockedTransport}),/valid Base token contract address/);
});
test('public token research GET is read-only and returns a sourced report',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'verrift-token-'));
 const handler=createHandler({store:new Store({file:path.join(dir,'state.json'),redisUrl:null,redisToken:null,supabaseUrl:null,supabaseSecret:null}),sessionSecret:'long-development-secret-for-token-tests-2026',tokenInspector:address=>inspectBaseToken(address,{transport:mockedTransport})});
 const server=http.createServer(handler);await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
 try{
  const host=`http://127.0.0.1:${server.address().port}`;
  const ok=await fetch(host+'/api/token/check?address='+ADDRESS);
  assert.equal(ok.status,200);const data=await ok.json();assert.equal(data.report.status,'elevated_risk');
  const invalid=await fetch(host+'/api/token/check?address=not-a-token');assert.equal(invalid.status,400);
 }finally{await new Promise(ok=>server.close(ok));await rm(dir,{recursive:true,force:true});}
});
