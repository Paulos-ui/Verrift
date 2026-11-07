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

test('Public landing lives at root and the full user workspace lives at /app', async()=>{
  const config=JSON.parse(await readFile('vercel.json','utf8'));
  assert.ok(config.rewrites.some(r=>r.source==='/app'&&r.destination==='/workspace.html'));
  const landing=await readFile('public/index.html','utf8');
  const workspace=await readFile('public/workspace.html','utf8');
  assert.match(landing,/id="intro-title"/);
  assert.match(landing,/href="\/app"/);
  assert.match(landing,/INTERACTIVE PROCESS ILLUSTRATION/);
  assert.match(workspace,/id="wallet-button"/);
  assert.match(workspace,/id="content"/);
  assert.doesNotMatch(landing,/src="\/app\.js"/);
  assert.doesNotMatch(workspace,/src="\/landing\.js"/);
  assert.ok((await readFile('lib/app.js','utf8')).includes("'/app':'workspace.html'"));
});

test('Landing motion is purposeful and respects reduced-motion settings',async()=>{
  const html=await readFile('public/index.html','utf8');
  const css=await readFile('public/landing.css','utf8');
  const js=await readFile('public/landing.js','utf8');
  assert.match(css,/prefers-reduced-motion:reduce/);
  assert.match(js,/IntersectionObserver/);
  assert.match(js,/requestAnimationFrame/);
  assert.match(js,/aria-pressed/);
  assert.ok(html.includes('Skip to content'));
  assert.ok(html.includes('NOT A LIVE WEBSITE SCAN'));
  assert.ok(html.includes('Base Sepolia'));
  assert.doesNotMatch(html+css+js,/\u2014/);
});

test('Local server delivers static landing and workspace independent of the data provider',async()=>{
  const {createHandler}=await import('../lib/app.js');
  const {Store}=await import('../lib/store.js');
  const routeHandler=createHandler({sessionSecret:secret,store:new Store({file:'/tmp/verrift-layout-route-no-real-data.json',redisUrl:null,redisToken:null,supabaseUrl:null,supabaseSecret:null})});
  const server=http.createServer(routeHandler);
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const origin=`http://127.0.0.1:${server.address().port}`;
  try{
    const home=await fetch(origin+'/');assert.equal(home.status,200);assert.match(await home.text(),/Broken is/);
    const app=await fetch(origin+'/app');assert.equal(app.status,200);assert.match(await app.text(),/id="wallet-button"/);
    const stylesheet=await fetch(origin+'/landing.css');assert.equal(stylesheet.status,200);assert.match(stylesheet.headers.get('content-type'),/text\/css/);
    const script=await fetch(origin+'/landing.js');assert.equal(script.status,200);assert.match(script.headers.get('content-type'),/javascript/);
  }finally{await new Promise(resolve=>server.close(resolve));}
});
