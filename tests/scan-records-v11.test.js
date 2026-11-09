import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import {mkdtemp,rm,readFile} from 'node:fs/promises';
import {inspectBaseToken,createTokenScanRecord,compareTokenScans} from '../lib/token-intel.js';
import {createHandler} from '../lib/app.js';
import {Store} from '../lib/store.js';
const ADDRESS='0x'+'a'.repeat(40);
const makeReport=(signals=[],status='review_indicators')=>({address:ADDRESS,chainId:8453,checkedAt:new Date().toISOString(),status,label:'Review indicators',signals,sources:[{name:'GoPlus',status:'available'}],market:{topPool:{liquidityUsd:10000}},coverage:'Incomplete',disclaimer:'Not a safety certificate'});
function fakeTransport({goplus=true,rpc='0x12345',honey=false}={}){
 return async (url,options={})=>{
  const payload=url.includes('gopluslabs')?{code:1,result:{[ADDRESS]:{is_mintable:'1'}}}:
   url.includes('honeypot.is')?{simulationSuccess:honey,honeypotResult:{isHoneypot:false}}:
   url.includes('dexscreener')?[]:{jsonrpc:'2.0',id:1,result:rpc};
  return {ok:true,json:async()=>payload};
 };
}
test('scan includes observed Base contract bytecode and does not confuse missing data with clean safety',async()=>{
 const scanned=await inspectBaseToken(ADDRESS,{transport:fakeTransport()});
 assert.equal(scanned.onchain.status,'contract_deployed');
 assert.equal(scanned.status,'review_indicators');
 const noncontract=await inspectBaseToken(ADDRESS,{transport:fakeTransport({goplus:false,rpc:'0x'})});
 assert.equal(noncontract.onchain.status,'no_contract');
 assert.equal(noncontract.status,'elevated_risk');
 assert.ok(noncontract.signals.some(s=>s.label==='No deployed contract'));
});
test('DEX liquidity alone does not imply absence of risks',async()=>{
 const scanned=await inspectBaseToken(ADDRESS,{transport:async url=>({ok:true,json:async()=>url.includes('dexscreener')?[{chainId:'base',baseToken:{address:ADDRESS},liquidity:{usd:70000}}]:{result:{}}})});
 assert.equal(scanned.status,'insufficient_evidence');
});
test('dated scan digest and difference tracking do not mark a disappearing signal as resolved',()=>{
 const before=createTokenScanRecord(makeReport([{source:'GoPlus',severity:'high',label:'Blacklist controls',detail:'Observed'}],'elevated_risk'));
 const after=createTokenScanRecord(makeReport([{source:'GoPlus',severity:'review',label:'Supply can be increased',detail:'Observed'}]));
 assert.match(before.digest,/^0x[a-f0-9]{64}$/);assert.match(before.id,/^scan_[a-z0-9]{20}$/);
 const changes=compareTokenScans(before,after);
 assert.equal(changes.noLongerReported[0].label,'Blacklist controls');
 assert.equal(changes.introduced[0].label,'Supply can be increased');
 assert.match(changes.notice,/missing flag.*unavailable provider/i);
 assert.throws(()=>compareTokenScans(before,{...after,address:'0x'+'b'.repeat(40)}),/same contract/);
});
test('public saved scan can be retrieved, rechecked, and shared without authentication',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'verrift-scan-record-'));
 let scanNo=0;const inspector=async address=>{
  scanNo++;return {...makeReport(scanNo===1?[]:[{source:'GoPlus',label:'Blacklist controls',severity:'high',detail:'Changed'}],scanNo===1?'no_critical_flags_observed':'elevated_risk'),address:address.toLowerCase()};
 };
 const store=new Store({file:path.join(dir,'state.json'),redisUrl:null,redisToken:null,supabaseUrl:null,supabaseSecret:null});
 const handler=createHandler({store,sessionSecret:'0123456789012345678901234567890123456789',tokenInspector:inspector});
 const server=http.createServer(handler);await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const origin=`http://127.0.0.1:${server.address().port}`;
 async function send(method,route,data){return fetch(origin+route,{method,...(data?{headers:{'content-type':'application/json'},body:JSON.stringify(data)}:{})});}
 try{
  const first=await send('POST','/api/token/scans',{address:ADDRESS});assert.equal(first.status,201);
  const {record}=await first.json();assert.match(record.digest,/^0x[a-f0-9]{64}$/);
  const get=await send('GET','/api/token/scans/'+record.id);assert.equal(get.status,200);
  assert.equal((await get.json()).record.report.address,ADDRESS);
  const second=await send('POST','/api/token/scans',{address:ADDRESS,compareTo:record.id});assert.equal(second.status,201);
  const compared=await second.json();assert.equal(compared.comparison.introduced.length,1);
  assert.equal(compared.comparison.introduced[0].label,'Blacklist controls');
  const invalid=await send('POST','/api/token/scans',{address:ADDRESS,compareTo:'scan_bogus'});assert.equal(invalid.status,400);
  const invalidAddress=await send('POST','/api/token/scans',{address:'xxx'});assert.equal(invalidAddress.status,400);
  const missing=await send('GET','/api/token/scans/scan_'+'a'.repeat(20));assert.equal(missing.status,404);
  const csrf=await fetch(origin+'/api/token/scans',{method:'POST',headers:{origin:'https://evil.example','content-type':'application/json'},body:JSON.stringify({address:ADDRESS})});
  assert.equal(csrf.status,403);
 }finally{await new Promise(resolve=>server.close(resolve));await rm(dir,{recursive:true,force:true});}
});
test('landing and verify pages provide actual scanner and saved report client',async()=>{
 const base=new URL('../',import.meta.url);
 const home=await readFile(new URL('public/index.html',base),'utf8');
 const verify=await readFile(new URL('public/verify.html',base),'utf8');
 const js=await readFile(new URL('public/token-check.js',base),'utf8');
 assert.match(home,/id="v11-landing-form"/);assert.match(home,/landing-scan\.js/);assert.match(home,/v11-example-contract/);
 assert.match(verify,/ui-v11\.css/);assert.match(js,/api\/token\/scans/);
 assert.match(js,/Rescan and compare/);assert.match(js,/dated evidence record/);
 assert.doesNotMatch(home,/—/);
});
