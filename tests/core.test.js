import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import {Store} from '../lib/store.js';
import {createHandler} from '../lib/app.js';
import {domainName,allowedPath,publicIp,verifyDomain,checkResponse} from '../lib/domain.js';
import {ethToWei,verifyTransfer,BASE_CHAIN_ID} from '../lib/base.js';
import {analyzeCase} from '../lib/ai.js';

const secret='secret-secret-secret-secret-secret-secret';
const wallet2='0x'+'2'.repeat(40);
const walletF='0x'+'f'.repeat(40);
async function fixture(overrides={}){
 const folder=await mkdtemp(path.join(os.tmpdir(),'verrift-'));
 const store=new Store({file:path.join(folder,'state.json'),redisUrl:null,redisToken:null,supabaseUrl:null,supabaseSecret:null});
 const authExchanger=async({message})=>({id:'test_'+(message.match(/\n(0x[a-f0-9]{40})\n/i)?.[1]||'').slice(2).toLowerCase()});
 const handle=createHandler({store,sessionSecret:secret,authExchanger,...overrides});
 const server=http.createServer(handle);await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
 const url=`http://127.0.0.1:${server.address().port}`;
 function client(){
  const jar=new Map();
  async function call(endpoint,method='GET',data,headers={}){
   const response=await fetch(url+endpoint,{method,headers:{...headers,...(jar.size?{cookie:[...jar].map(([k,v])=>`${k}=${v}`).join('; ')}:{}),...(data?{'content-type':'application/json'}:{})},body:data?JSON.stringify(data):undefined});
   const result=await response.json();
   for(const line of response.headers.getSetCookie?.()||[]){const pair=line.split(';')[0];const i=pair.indexOf('=');if(i>0){const k=pair.slice(0,i),v=pair.slice(i+1);if(v)jar.set(k,v);else jar.delete(k);}}
   return {status:response.status,result,headers:response.headers};
  }
  async function login(address=wallet2){
   await call('/api/status');
   const q=await call('/api/auth/challenge?address='+address);assert.equal(q.status,200);
   const x=await call('/api/auth/verify','POST',{message:q.result.message,signature:'0x'+'1'.repeat(130)});assert.equal(x.status,200);
  }
  return {call,login,jar};
 }
 const first=client();
 async function close(){await new Promise(ok=>server.close(ok));await rm(folder,{recursive:true,force:true});}
 return {url,store,...first,client,close};
}

test('domain constraints reject unsafe or surprising targets',()=>{
 for(const input of ['http://google.com','localhost','127.0.0.1','10.0.0.5','foo.local','https://example.com:8080','https://user:pass@example.com','https://example.com/path','https://example.com/#top'])assert.throws(()=>domainName(input));
 assert.equal(domainName('https://verrift.app'),'verrift.app');
 assert.equal(allowedPath('/health?version=2'),'/health?version=2');
 for(const p of ['http://evil.com','//evil.com','/x#foo','/x\\evil',''])assert.throws(()=>allowedPath(p));
});
test('private, loopback and reserved IPs are denied',()=>{
 for(const ip of ['127.0.0.1','10.1.2.3','172.20.1.1','192.168.2.1','169.254.169.254','0.0.0.0','::1','fc00::1','fe80::1','::ffff:127.0.0.1'])assert.equal(publicIp(ip),false,ip);
 assert.equal(publicIp('8.8.8.8'),true);
});
test('owner verification needs exact proof; DNS proof accepted',async()=>{
 const resolver={resolveTxt:async()=>[['verrift=abc']]};
 assert.equal(await verifyDomain('example.org','abc',{resolver,fetchText:async()=>({status:404,body:''})}),'dns-txt');
 assert.equal(await verifyDomain('example.org','wrong',{resolver,fetchText:async()=>({status:404,body:''})}),null);
 assert.equal(await verifyDomain('example.org','abc',{resolver:{resolveTxt:async()=>[]},fetchText:async()=>({status:200,body:'abc'})}),'https-file');
});
test('response checks represent observed evidence, not simulated pass',()=>{
 const base={status:503,body:'SERVICE_UNAVAILABLE',headers:{},durationMs:13,checkedUrl:'https://example.com/'};
 assert.equal(checkResponse(base,200,'SERVICE_READY').passed,false);
 assert.equal(checkResponse({...base,status:200,body:'SERVICE_READY'},200,'SERVICE_READY').passed,true);
});
test('public entry, wallet authentication, protected workspace, and cross-origin protection',async()=>{
 const f=await fixture();try{
 assert.equal((await f.call('/api/data')).status,401);
 assert.equal((await f.call('/api/login','POST',{password:'legacy'})).status,404);
 const noSig=await f.call('/api/auth/verify','POST',{message:'not a challenge',signature:'0x'+'1'.repeat(130)});
 assert.equal(noSig.status,401);
 await f.login();assert.equal((await f.call('/api/status')).result.actor.role,'user');
 const attack=await f.call('/api/sandbox','POST',{broken:true},{origin:'https://attacker.example'});
 assert.equal(attack.status,403);
 assert.equal((await f.call('/api/logout','POST')).status,200);
 assert.equal((await f.call('/api/data')).status,401);
 assert.equal((await f.call('/api/status')).result.actor.role,'guest');
 }finally{await f.close();}
});
test('controlled sandbox fails, then passes with same criteria, yielding verified repair',async()=>{
 const f=await fixture();try{await f.login();
 const newCase=await f.call('/api/cases','POST',{kind:'sandbox',title:'Sample service recovery',description:'Must return ready',steps:'Break, test, restore, test',expectedStatus:200,expectedText:'SERVICE_READY'});
 assert.equal(newCase.status,201);const id=newCase.result.case.id;
 assert.equal((await f.call(`/api/cases/${id}/run`,'POST',{})).result.case.status,'passing');
 await f.call('/api/sandbox','POST',{broken:true});
 const bad=await f.call(`/api/cases/${id}/run`,'POST',{});assert.equal(bad.result.run.passed,false);assert.equal(bad.result.case.status,'failing');
 const target=await f.call('/api/sandbox/widget');assert.equal(target.status,503);
 await f.call('/api/sandbox','POST',{broken:false});
 const good=await f.call(`/api/cases/${id}/run`,'POST',{});assert.equal(good.result.run.passed,true);assert.equal(good.result.case.status,'verified');
 const data=await f.call('/api/data');assert.equal(data.result.runs.length,3);
 const exportReport=await f.call(`/api/export/${id}`);assert.equal(exportReport.result.runs.length,3);
 }finally{await f.close();}
});
test('external target cannot be checked before actual domain ownership proof',async()=>{
 const f=await fixture({domainVerifier:async()=>null,externalProbe:async()=>{throw Error('must never be called');}});try{await f.login();
 const p=await f.call('/api/projects','POST',{domain:'verifiedwebsite.com'});assert.equal(p.status,201);
 const x=await f.call('/api/projects/'+p.result.project.id+'/verify','POST',{});assert.equal(x.status,409);
 const c=await f.call('/api/cases','POST',{kind:'external',projectId:p.result.project.id,title:'External health',description:'Check route',steps:'Open route',expectedStatus:200,path:'/'});assert.equal(c.status,403);
 }finally{await f.close();}
});
test('verified external property gets read-only status/text response evidence',async()=>{
 const f=await fixture({domainVerifier:async()=> 'dns-txt',externalProbe:async(host,path)=>({status:200,body:'SERVICE_UP',headers:{'content-type':'text/html'},durationMs:42,checkedUrl:`https://${host}${path}`})});try{await f.login();
 const p=(await f.call('/api/projects','POST',{domain:'example.org'})).result.project;
 assert.equal((await f.call(`/api/projects/${p.id}/verify`,'POST',{})).status,200);
 const c=(await f.call('/api/cases','POST',{kind:'external',projectId:p.id,title:'External health',description:'Check route',steps:'Open route',expectedStatus:200,expectedText:'SERVICE_UP',path:'/health'})).result.case;
 const r=(await f.call(`/api/cases/${c.id}/run`,'POST',{})).result.run;
 assert.equal(r.passed,true);assert.equal(r.observation.url,'https://example.org/health');assert.equal(r.observation.durationMs,42);
 }finally{await f.close();}
});
test('shareable read-only report requires randomized share token',async()=>{
 const f=await fixture();try{await f.login();const c=(await f.call('/api/cases','POST',{kind:'sandbox',title:'Shareable issue',description:'Something failed',steps:'Break and rerun',expectedStatus:200})).result.case;
 const s=await f.call(`/api/cases/${c.id}/share`,'POST',{});assert.equal(s.status,200);
 assert.equal((await f.call(`/api/public/${c.id}`)).status,404);
 const good=await f.call(s.result.url);assert.equal(good.status,200);assert.equal(good.result.case.id,c.id);assert.equal(good.result.case.shareToken,undefined);
 }finally{await f.close();}
});
test('testnet payment cannot be recorded before failed→passed proof',async()=>{
 const f=await fixture({transferVerifier:async()=>({hash:'0x'+'a'.repeat(64)})});try{await f.login();
 const c=(await f.call('/api/cases','POST',{kind:'sandbox',title:'Rewardable check',description:'Reward this fix',steps:'First fail then pass',expectedStatus:200})).result.case;
 const configured=await f.call(`/api/cases/${c.id}/reward`,'POST',{to:'0x'+'1'.repeat(40),amountEth:'0.0001'});assert.equal(configured.status,200);
 assert.equal((await f.call(`/api/cases/${c.id}/confirm-payment`,'POST',{hash:'0x'+'a'.repeat(64),from:'0x'+'2'.repeat(40)})).status,409);
 }finally{await f.close();}
});
test('testnet payment is recorded once after verified proof',async()=>{
 const h='0x'+'a'.repeat(64);const from='0x'+'2'.repeat(40);const to='0x'+'1'.repeat(40);
 const f=await fixture({transferVerifier:async()=>({hash:h,from,to,amountEth:'0.0001',blockNumber:1,explorer:'https://sepolia.basescan.org/tx/'+h})});try{await f.login();
 const c=(await f.call('/api/cases','POST',{kind:'sandbox',title:'Rewardable check',description:'Reward this fix',steps:'First fail then pass',expectedStatus:200})).result.case;
 await f.call('/api/sandbox','POST',{broken:true});await f.call(`/api/cases/${c.id}/run`,'POST',{});await f.call('/api/sandbox','POST',{broken:false});await f.call(`/api/cases/${c.id}/run`,'POST',{});
 await f.call(`/api/cases/${c.id}/reward`,'POST',{to,amountEth:'0.0001'});
 const paid=await f.call(`/api/cases/${c.id}/confirm-payment`,'POST',{hash:h,from});assert.equal(paid.status,200);
 assert.equal((await f.call(`/api/cases/${c.id}/confirm-payment`,'POST',{hash:h,from})).status,409);
 assert.equal((await f.call(`/api/cases/${c.id}/delete`,'POST',{})).status,409);
 }finally{await f.close();}
});
test('RPC receipt verifies chain, amount, from, recipient and status',async()=>{
 const h='0x'+'b'.repeat(64);const from='0x'+'a'.repeat(40);const to='0x'+'c'.repeat(40);
 const fn=async method=>({eth_chainId:BASE_CHAIN_ID,eth_getTransactionReceipt:{status:'0x1',blockNumber:'0xa'},eth_getTransactionByHash:{from,to,value:'0x'+ethToWei('0.0001').toString(16)}})[method];
 const result=await verifyTransfer({hash:h,from,to,amountEth:'0.0001'},{call:fn});assert.equal(result.blockNumber,10);
 await assert.rejects(verifyTransfer({hash:h,from,to,amountEth:'0.001'},{call:fn}));
});
test('Anthropic analysis submits bounded evidence and preserves model output',async()=>{
 let requests=0;const mock=async(url,init)=>{requests++;assert.equal(url,'https://api.anthropic.com/v1/messages');assert.equal(init.headers['x-api-key'],'example-key');return {ok:true,json:async()=>({model:'claude-test',content:[{type:'text',text:'Observed failure; repair suggestion'}],usage:{input_tokens:100,output_tokens:25}})};};
 const r=await analyzeCase({title:'Case',steps:'Retest',expectedStatus:200,expectedText:''},[{passed:false,checks:[],observation:{status:503}}],{key:'example-key',model:'claude-test',transport:mock});
 assert.equal(requests,1);assert.equal(r.model,'claude-test');assert.match(r.text,/repair suggestion/);
 await assert.rejects(analyzeCase({title:'Case'},[],{key:null}));
});
test('no default credentials required: weak secrets reject startup',()=>{
 assert.throws(()=>createHandler({sessionSecret:'short'}));
 assert.doesNotThrow(()=>createHandler({sessionSecret:secret,store:new Store({file:'/tmp/verrift-fixture.json',redisUrl:null,redisToken:null,supabaseUrl:null,supabaseSecret:null})}));
});

test('proof fingerprint binds one failed and subsequent passing evidence; changes with evidence',async()=>{
 const {computeDigest}=await import('../lib/app.js');
 const item={id:'cas_example',status:'verified',expectedStatus:200,expectedText:'OK',path:'/'};
 const runs=[{id:'run_a',passed:false,createdAt:'2026-11-07T10:00:00.000Z',checks:[{pass:false,label:'HTTP 200',detail:'HTTP 503'}]},{id:'run_b',passed:true,createdAt:'2026-11-07T10:01:00.000Z',checks:[{pass:true,label:'HTTP 200',detail:'HTTP 200'}]}];
 const one=computeDigest(item,runs);assert.match(one,/^0x[a-f0-9]{64}$/);
 assert.equal(computeDigest(item,runs),one);
 assert.notEqual(computeDigest(item,[...runs.slice(0,1),{...runs[1],id:'run_changed'}]),one);
 assert.throws(()=>computeDigest({...item,status:'failing'},runs));
});
test('Base proof anchor validates self-recipient, zero value and exact onchain input',async()=>{
 const {verifyAnchor,proofData}=await import('../lib/base.js');
 const from='0x'+'f'.repeat(40),hash='0x'+'a'.repeat(64),digest='0x'+'b'.repeat(64);
 const call=async method=>({eth_chainId:BASE_CHAIN_ID,eth_getTransactionReceipt:{status:'0x1',blockNumber:'0x21'},eth_getTransactionByHash:{from,to:from,value:'0x0',input:proofData(digest)}})[method];
 const valid=await verifyAnchor({hash,from,digest},{call});assert.equal(valid.blockNumber,33);
 await assert.rejects(verifyAnchor({hash,from,digest:'0x'+'c'.repeat(64)},{call}));
});
test('no anchor can be created without a prior failed and passing check',async()=>{
 const f=await fixture({anchorVerifier:async()=>({hash:'0x'+'a'.repeat(64)})});
 try{await f.login(walletF);const c=(await f.call('/api/cases','POST',{kind:'sandbox',title:'Anchorable case',description:'Check proof',steps:'Run twice',expectedStatus:200,expectedText:'SERVICE_READY'})).result.case;
 assert.equal((await f.call(`/api/cases/${c.id}/proof`)).status,409);
 assert.equal((await f.call(`/api/cases/${c.id}/anchor`,'POST',{hash:'0x'+'a'.repeat(64),from:'0x'+'f'.repeat(40)})).status,409);
 }finally{await f.close();}
});
test('anchored proof can only be recorded once and appears in public report',async()=>{
 const f=await fixture({anchorVerifier:async({hash,from,digest})=>({hash,from,digest,blockNumber:19,explorer:'https://sepolia.basescan.org/tx/'+hash})});
 try{await f.login(walletF);const c=(await f.call('/api/cases','POST',{kind:'sandbox',title:'Anchorable case',description:'Check proof',steps:'Break and restore',expectedStatus:200,expectedText:'SERVICE_READY'})).result.case;
 await f.call('/api/sandbox','POST',{broken:true});await f.call(`/api/cases/${c.id}/run`,'POST',{});await f.call('/api/sandbox','POST',{broken:false});await f.call(`/api/cases/${c.id}/run`,'POST',{});
 const proof=(await f.call(`/api/cases/${c.id}/proof`)).result;assert.equal(proof.caseId,c.id);
 const record=await f.call(`/api/cases/${c.id}/anchor`,'POST',{hash:'0x'+'a'.repeat(64),from:'0x'+'f'.repeat(40)});assert.equal(record.status,200);assert.equal(record.result.anchor.digest,proof.digest);
 assert.equal((await f.call(`/api/cases/${c.id}/anchor`,'POST',{hash:'0x'+'a'.repeat(64),from:'0x'+'f'.repeat(40)})).status,409);
 const share=await f.call(`/api/cases/${c.id}/share`,'POST');const report=await f.call(share.result.url);assert.equal(report.result.anchor.digest,proof.digest);
 }finally{await f.close();}
});

test('public report is readable without an admin session only with its exact token',async()=>{
 const f=await fixture();try{
 await f.login();const c=(await f.call('/api/cases','POST',{kind:'sandbox',title:'Published evidence',description:'Read-only report',steps:'Read tests',expectedStatus:200})).result.case;
 const s=(await f.call(`/api/cases/${c.id}/share`,'POST')).result;const raw=s.url;
 await f.call('/api/logout','POST');assert.equal((await f.call('/api/data')).status,401);
 const publicResult=await f.call(raw);assert.equal(publicResult.status,200);assert.equal(publicResult.result.case.title,'Published evidence');
 assert.equal((await f.call(`/api/public/${c.id}?token=invalid`)).status,404);
 assert.equal((await fetch(f.url+`/report/${c.id}?token=invalid`)).status,200); // static report is public; its API enforces token
 }finally{await f.close();}
});

test('two signed-in wallets cannot see or mutate each others projects and cases',async()=>{
 const f=await fixture({domainVerifier:async()=> 'dns-txt'});try{
 const other=f.client();await f.login(wallet2);await other.login(walletF);
 const p=(await f.call('/api/projects','POST',{domain:'team-owned.example.com'})).result.project;
 const c=(await f.call('/api/cases','POST',{kind:'sandbox',title:'Private case',description:'Only one owner',steps:'Run check',expectedStatus:200})).result.case;
 assert.equal((await other.call('/api/data')).result.cases.length,0);
 assert.equal((await other.call('/api/data')).result.projects.length,0);
 assert.equal((await other.call(`/api/projects/${p.id}/verify`,'POST',{})).status,404);
 assert.equal((await other.call(`/api/cases/${c.id}/run`,'POST',{})).status,404);
 assert.equal((await other.call(`/api/export/${c.id}`)).status,404);
 assert.equal((await f.call(`/api/cases/${c.id}/run`,'POST',{})).status,200);
 }finally{await f.close();}
});
test('anonymous visitors cannot create cases, change test state, or read private records',async()=>{
 const f=await fixture();try{
  const visitorB=f.client();
  assert.equal((await f.call('/api/status')).status,200);
  assert.equal((await visitorB.call('/api/status')).status,200);
  assert.equal((await f.call('/api/data')).status,401);
  assert.equal((await f.call('/api/sandbox','POST',{broken:true})).status,401);
  assert.equal((await f.call('/api/sandbox/widget')).status,200);
  assert.equal((await f.call('/api/projects','POST',{domain:'otherdomain.example.com'})).status,401);
  const a=await f.call('/api/cases','POST',{kind:'sandbox',title:'Anonymous attempt',description:'Not allowed',steps:'Test state',expectedStatus:200});
  assert.equal(a.status,401);
  assert.equal((await visitorB.call('/api/data')).status,401);
  await f.login();
  assert.equal((await f.call('/api/data')).status,200);
  assert.equal((await f.call('/api/sandbox','POST',{broken:true})).status,200);
  assert.equal((await f.call('/api/sandbox/widget')).status,503);
  assert.equal((await visitorB.call('/api/sandbox/widget')).status,200);
 }finally{await f.close();}
});
test('unsigned or mismatched wallet cannot record another wallet payment',async()=>{
 const h='0x'+'c'.repeat(64);const to='0x'+'d'.repeat(40);
 const f=await fixture({transferVerifier:async()=>({hash:h})});try{
 await f.login(wallet2);
 const c=(await f.call('/api/cases','POST',{kind:'sandbox',title:'Protected reward',description:'Wallet binding',steps:'Fail, fix',expectedStatus:200})).result.case;
 await f.call('/api/sandbox','POST',{broken:true});await f.call(`/api/cases/${c.id}/run`,'POST',{});await f.call('/api/sandbox','POST',{broken:false});await f.call(`/api/cases/${c.id}/run`,'POST',{});
 await f.call(`/api/cases/${c.id}/reward`,'POST',{to,amountEth:'0.0001'});
 assert.equal((await f.call(`/api/cases/${c.id}/confirm-payment`,'POST',{hash:h,from:walletF})).status,403);
 }finally{await f.close();}
});
test('operator summary is restricted to the configured signed-in wallet',async()=>{
 const saved=process.env.ADMIN_WALLET_ADDRESS;process.env.ADMIN_WALLET_ADDRESS=wallet2;
 const f=await fixture();try{
  const other=f.client();await f.login(wallet2);await other.login(walletF);
  const result=await f.call('/api/admin/summary');assert.equal(result.status,200);assert.equal(result.result.cases,0);
  assert.equal((await other.call('/api/admin/summary')).status,403);
  assert.equal((await fetch(f.url+'/admin')).status,200);
 }finally{await f.close();if(saved===undefined)delete process.env.ADMIN_WALLET_ADDRESS;else process.env.ADMIN_WALLET_ADDRESS=saved;}
});
test('serverless rewrite adapter preserves declared API routes',async()=>{
 const prev2=process.env.SESSION_SECRET;
 process.env.SESSION_SECRET=secret;
 let server;
 try{
  const api=(await import(`../api/index.js?run=${Date.now()}`)).default;
  server=http.createServer((req,res)=>api(req,res));await new Promise(done=>server.listen(0,'127.0.0.1',done));
  const root=`http://127.0.0.1:${server.address().port}`;
  const a=await (await fetch(root+'/api/index.js?__route=status')).json();assert.equal(a.chainId,BASE_CHAIN_ID);
  const h=await (await fetch(root+'/api/index.js?__route=__healthz')).json();assert.equal(h.ok,true);
 }finally{
  if(server)await new Promise(done=>server.close(done));
  if(prev2===undefined)delete process.env.SESSION_SECRET;else process.env.SESSION_SECRET=prev2;
 }
});
