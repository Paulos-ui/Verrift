import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {createHandler} from '../lib/app.js';
import {Store} from '../lib/store.js';

const secret='supersecret-supersecret-supersecret-supersecret';
async function withServer(host, fn) {
 const store=new Store({file:null,redisUrl:null,redisToken:null,supabaseUrl:null,supabaseSecret:null});
 const server=http.createServer(createHandler({store,sessionSecret:secret,authExchanger:async()=>({id:'test_auth_1234567890'})}));
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const port=server.address().port;
 try {await fn((method,endpoint,origin)=>new Promise((resolve,reject)=>{
  const request=http.request({hostname:'127.0.0.1',port,path:endpoint,method,headers:{host,...(origin?{origin}:{})}},response=>{
   let raw='';response.on('data',chunk=>raw+=chunk);response.on('end',()=>{
    try{resolve({status:response.statusCode,payload:JSON.parse(raw)});}catch(error){reject(error);}
   });
  });
  request.on('error',reject);
  if(method==='POST')request.end('{}');else request.end();
 }));} finally {await new Promise(r=>server.close(r));}
}
const address='0x'+'1'.repeat(40);
test('recognized VERRIFT domains generate a SIWE challenge for the actual site',async()=>{
 const previous=process.env.PUBLIC_ORIGIN;process.env.PUBLIC_ORIGIN='https://verrift.vercel.app';
 try {
  await withServer('verrift.xyz',async call=>{
   const r=await call('GET','/api/auth/challenge?address='+address);
   assert.equal(r.status,200);
   assert.match(r.payload.message,/^verrift\.xyz wants you to sign in/);
   assert.match(r.payload.message,/URI: https:\/\/verrift\.xyz\//);
   assert.equal((await call('POST','/api/logout','https://verrift.xyz')).status,200);
   assert.equal((await call('POST','/api/logout','https://malicious.xyz')).status,403);
   assert.equal((await call('POST','/api/logout','https://verrift.vercel.app')).status,403);
  });
 }finally{if(previous===undefined)delete process.env.PUBLIC_ORIGIN;else process.env.PUBLIC_ORIGIN=previous;}
});
test('unknown hosts do not generate login challenges',async()=>{
 await withServer('evil.example',async call=>{
  assert.equal((await call('GET','/api/auth/challenge?address='+address)).status,403);
  assert.equal((await call('POST','/api/logout','https://evil.example')).status,403);
 });
});
test('wallet discovery deduplicates MetaMask while retaining OKX',async()=>{
 const oldWindow=globalThis.window;
 const fake=new EventTarget();
 const metaLegacy={request:async()=>[],isMetaMask:true};
 const metaAnnouncement={request:async()=>[],isMetaMask:true};
 const okx={request:async()=>[],isOkxWallet:true};
 fake.ethereum={providers:[metaLegacy,okx]};
 globalThis.window=fake;
 try{
  const wallets=await import('../public/wallet.js?wallet-hotfix-dedup');
  const announcement=new Event('eip6963:announceProvider');
  Object.defineProperty(announcement,'detail',{value:{info:{uuid:'metamask-test-id',name:'MetaMask',rdns:'io.metamask'},provider:metaAnnouncement}});
  fake.dispatchEvent(announcement);
  const choices=await wallets.availableWallets();
  assert.equal(choices.filter(w=>w.name==='MetaMask').length,1);
  assert.equal(choices.length,2);
  assert.ok(choices.some(w=>w.provider===okx));
  assert.ok(choices.some(w=>w.provider===metaAnnouncement));
 }finally{if(oldWindow===undefined)delete globalThis.window;else globalThis.window=oldWindow;}
});
