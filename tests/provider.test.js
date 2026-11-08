import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {Store} from '../lib/store.js';
import {exchangeWeb3,challenge,verifyChallenge} from '../lib/auth.js';

const secret='abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const address='0x'+'a'.repeat(40);

test('wallet challenge requires exact signed message and short-lived proof',()=>{
 const issued=challenge(address,'https://verrift.example',secret);
 const sig='0x'+'1'.repeat(130);
 assert.equal(verifyChallenge({...issued,signature:sig},secret),address);
 assert.throws(()=>verifyChallenge({message:issued.message+'extra',signature:sig,proof:issued.proof},secret));
 assert.throws(()=>verifyChallenge({message:issued.message,signature:'invalid',proof:issued.proof},secret));
});

test('Supabase Web3 token exchange uses publishable key and verified identity',async()=>{
 const responses=[];
 const server=http.createServer(async(req,res)=>{
  let text='';for await(const chunk of req)text+=chunk;
  responses.push({url:req.url,headers:req.headers,body:JSON.parse(text)});
  res.setHeader('Content-Type','application/json');
  res.end(JSON.stringify({user:{id:'12345678-1234-1234-1234-123456789abc'},access_token:'test-only'}));
 });
 await new Promise(done=>server.listen(0,'127.0.0.1',done));
 try{
  const url=`http://127.0.0.1:${server.address().port}`;
  const result=await exchangeWeb3({message:'test message',signature:'0xabc'}, {url,key:'sb_publishable_for_test'});
  assert.equal(result.id,'12345678-1234-1234-1234-123456789abc');
  assert.equal(responses[0].url,'/auth/v1/token?grant_type=web3');
  assert.equal(responses[0].headers.apikey,'sb_publishable_for_test');
  assert.deepEqual(responses[0].body,{chain:'ethereum',message:'test message',signature:'0xabc'});
 }finally{await new Promise(done=>server.close(done));}
});

test('Supabase database adapter performs read and atomic compare-swap via REST',async()=>{
 let state=null;const operations=[];
 const server=http.createServer(async(req,res)=>{
  operations.push({method:req.method,path:req.url,apiKey:req.headers.apikey,auth:req.headers.authorization});
  res.setHeader('Content-Type','application/json');
  if(req.method==='GET')return res.end(JSON.stringify(state?[{state}]:[]));
  let data='';for await(const chunk of req)data+=chunk;
  const incoming=JSON.parse(data);
  if(state&&state.revision!==incoming.expected_revision)return res.end('false');
  if(!state&&incoming.expected_revision&&!incoming.expected_revision.startsWith('rev_'))return res.end('false');
  state=incoming.next_state;return res.end('true');
 });
 await new Promise(done=>server.listen(0,'127.0.0.1',done));
 try{
  const store=new Store({file:'/nonexistent',redisUrl:null,redisToken:null,supabaseUrl:`http://127.0.0.1:${server.address().port}`,supabaseSecret:'sb_secret_test'});
  const result=await store.mutate(s=>{s.projects.push({id:'test-project'});return 'updated';});
  assert.equal(result,'updated');assert.equal((await store.read()).projects[0].id,'test-project');
  assert.equal(operations.filter(x=>x.method==='POST')[0].path,'/rest/v1/rpc/verrift_cas_state');
  assert.equal(operations[0].apiKey,'sb_secret_test');
  assert.equal(operations[0].auth,undefined); // Opaque secret key is sent as apikey, never as Bearer JWT.
 }finally{await new Promise(done=>server.close(done));}
});

test('Supabase Web3 error diagnostics identify disabled Ethereum provider without leaking credentials',async()=>{
 const server=http.createServer(async(req,res)=>{
  for await(const chunk of req){};
  res.writeHead(422,{'content-type':'application/json'});
  res.end(JSON.stringify({code:'web3_provider_disabled',message:'Ethereum Web3 provider is disabled'}));
 });
 await new Promise(done=>server.listen(0,'127.0.0.1',done));
 const oldWarn=console.warn;
 let warning;
 console.warn=(...args)=>{warning=args};
 try{
  const url=`http://127.0.0.1:${server.address().port}`;
  await assert.rejects(
   exchangeWeb3({message:'secret example login challenge',signature:'secret test signature'}, {url,key:'sb_publishable_test'}),
   err=>err.status===503&&/Enable Authentication/.test(err.message)&&!/secret example login challenge/.test(err.message)
  );
  assert.equal(warning[1].httpStatus,422);
  assert.equal(warning[1].errorCode,'web3_provider_disabled');
  assert.equal(JSON.stringify(warning).includes('secret'),false);
 }finally{console.warn=oldWarn;await new Promise(done=>server.close(done));}
});

test('Supabase Web3 reports unapproved site URL and preserves useful 422 error codes',async()=>{
 let code='';
 const server=http.createServer(async(req,res)=>{
  for await(const chunk of req){};
  res.writeHead(422,{'content-type':'application/json'});
  res.end(JSON.stringify(code==='origin'?{code:'invalid_grant',message:'Signed Ethereum message is using URI which is not allowed on this server'}:{code:'validation_failed',message:'Could not validate login message'}));
 });
 await new Promise(done=>server.listen(0,'127.0.0.1',done));
 const oldWarn=console.warn;
 console.warn=()=>{};
 try{
  const url=`http://127.0.0.1:${server.address().port}`;
  code='origin';
  await assert.rejects(exchangeWeb3({message:'message',signature:'signature'}, {url,key:'test'}),/Redirect URLs/);
  code='validation';
  await assert.rejects(exchangeWeb3({message:'message',signature:'signature'}, {url,key:'test'}),/code: validation_failed/);
 }finally{console.warn=oldWarn;await new Promise(done=>server.close(done));}
});
