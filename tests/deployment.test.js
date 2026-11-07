import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
import http from 'node:http';
import handler from '../api/index.js';

const secret='deployment-test-session-secret-32-characters-minimum';

async function localFunction(callback){
  const srv=http.createServer(handler);
  await new Promise(resolve=>srv.listen(0,'127.0.0.1',resolve));
  try{return await callback(`http://127.0.0.1:${srv.address().port}`);}
  finally{await new Promise(resolve=>srv.close(resolve));}
}

test('Vercel uses static public pages plus isolated API function, no root server auto-discovery',async()=>{
  const config=JSON.parse(await readFile('vercel.json','utf8'));
  assert.equal(config.framework,null);
  assert.equal(config.outputDirectory,'public');
  assert.ok(config.functions['api/index.js']);
  assert.ok(config.rewrites.find(r=>r.source==='/api/:path*'));
  await assert.rejects(()=>access('server.js'),{code:'ENOENT'});
  assert.ok((await readFile('scripts/dev-server.js','utf8')).includes('http.createServer'));
});

test('Vercel API returns a clear 503 instead of crashing without session secret',async()=>{
  const previous=process.env.SESSION_SECRET;
  delete process.env.SESSION_SECRET;
  try {await localFunction(async(url)=>{
    const response=await fetch(url+'/api/index.js?__route=status');
    assert.equal(response.status,503);
    assert.match((await response.json()).error,/not configured/);
  });}
  finally { if(previous===undefined)delete process.env.SESSION_SECRET; else process.env.SESSION_SECRET=previous; }
});

test('Vercel API rewrite adapter serves status and health when configured',async()=>{
  const previous=process.env.SESSION_SECRET;
  process.env.SESSION_SECRET=secret;
  try {await localFunction(async(url)=>{
    const status=await fetch(url+'/api/index.js?__route=status');
    assert.equal(status.status,200);
    const payload=await status.json();
    assert.equal(payload.chainId,'0x14a34');
    const health=await fetch(url+'/api/index.js?__route=__healthz');
    assert.equal(health.status,200);
    assert.equal((await health.json()).ok,true);
  });}
  finally { if(previous===undefined)delete process.env.SESSION_SECRET; else process.env.SESSION_SECRET=previous; }
});
