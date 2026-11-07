import {readFile} from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {cookie,newGuest,newSession,challenge,verifyChallenge,actorFor,requireUser,requireOwner,exchangeWeb3,signedCookie} from './auth.js';
import {Store} from './store.js';
import {uid,now,hash,safeEquals,fail,bounded,hexAddress,isHexHash,parseCookies} from './utils.js';
import {domainName,allowedPath,verifyDomain,probe,checkResponse} from './domain.js';
import {analyzeCase} from './ai.js';
import {verifyTransfer,verifyAnchor,BASE_CHAIN_ID} from './base.js';

const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.ico':'image/x-icon'};
function respond(res,status,data,extra={}){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',...extra});res.end(JSON.stringify(data));}
async function body(req){
 let payload='';for await(const chunk of req){payload+=chunk;if(payload.length>16000)fail('Request too large',413);}
 try{return JSON.parse(payload||'{}');}catch{fail('Invalid JSON body');}
}
function sameOrigin(req){
 const origin=req.headers.origin;if(!origin)return (req.headers['sec-fetch-site']||'same-origin')!=='cross-site';
 try{const url=new URL(origin);const allowed=process.env.PUBLIC_ORIGIN?new URL(process.env.PUBLIC_ORIGIN).host:req.headers.host;return url.host===allowed && (url.protocol==='https:'||allowed?.startsWith('localhost')||allowed?.startsWith('127.0.0.1'));}catch{return false;}
}
function validInt(x,min,max){const n=Number(x);if(!Number.isInteger(n)||n<min||n>max)fail(`Expected number from ${min} to ${max}`);return n;}
function makeCase(data,projects){
 const kind=data.kind==='sandbox'?'sandbox':'external';let projectId='sandbox';
 if(kind==='external'){const project=projects.find(p=>p.id===data.projectId && p.verifiedAt);if(!project)fail('Verify your domain before creating an external case',403);projectId=project.id;}
 const title=bounded(data.title,100,'Case title');const description=bounded(data.description,700,'Description');const steps=bounded(data.steps,900,'Reproduction steps');
 const requestPath=kind==='sandbox'?'/api/sandbox/widget':allowedPath(data.path||'/');
 const expectedStatus=validInt(data.expectedStatus||200,100,599);
 const expectedText=typeof data.expectedText==='string'?data.expectedText.trim():'';if(expectedText.length>120)fail('Expected text must be at most 120 characters');
 return {id:uid('cas_'),projectId,kind,title,description,steps,path:requestPath,expectedStatus,expectedText,createdAt:now(),status:'unverified',shareToken:null,reward:null};
}
async function runProbe(caseItem,project,sandbox,externalProbe){
 let response;
 if(caseItem.kind==='sandbox'){
  response={status:sandbox.broken?503:200,body:sandbox.broken?'SERVICE_UNAVAILABLE':'SERVICE_READY',durationMs:0,headers:{'content-type':'application/json'},checkedUrl:'internal:/api/sandbox/widget'};
 } else {
  if(!project?.verifiedAt)fail('Domain ownership is no longer verified',403);
  response=await externalProbe(project.domain,caseItem.path);
 }
 return checkResponse(response,caseItem.expectedStatus,caseItem.expectedText);
}
export function computeDigest(item,runs){
 if(item.status!=='verified')fail('Proof requires a passing rerun after a recorded failure',409);
 const passIndex=runs.findLastIndex(r=>r.passed);
 const latestPass=runs[passIndex];
 const precedingFailure=passIndex>0?runs.slice(0,passIndex).reverse().find(r=>!r.passed):null;
 if(!latestPass||!precedingFailure)fail('Missing failed-to-passing evidence',409);
 const record={protocol:'verrift-proof-v1',caseId:item.id,expectedStatus:item.expectedStatus,expectedText:item.expectedText,path:item.path,failed:{id:precedingFailure.id,checks:precedingFailure.checks},passed:{id:latestPass.id,checks:latestPass.checks}};
 return '0x'+hash(JSON.stringify(record));
}
export function createHandler({store=new Store(),sessionSecret=process.env.SESSION_SECRET,domainVerifier=verifyDomain,externalProbe=probe,caseAnalyzer=analyzeCase,transferVerifier=verifyTransfer,anchorVerifier=verifyAnchor,authExchanger=exchangeWeb3}={}){
 if(!sessionSecret||sessionSecret.length<32)throw Error('SESSION_SECRET must be set to at least 32 characters');
 const attempts=new Map();
 const defaultSandbox=()=>({broken:false,version:0,updatedAt:null});
 const getSandbox=(state,id)=>state.sandboxes?.[id]||defaultSandbox();
 function limit(key,max=20){const t=Date.now();const items=(attempts.get(key)||[]).filter(x=>t-x<60_000);items.push(t);attempts.set(key,items);if(items.length>max)fail('Too many requests, retry in one minute',429);if(attempts.size>4000)attempts.clear();}
 return async function handle(req,res){
  res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('X-Frame-Options','DENY');
  res.setHeader('Permissions-Policy','camera=(), microphone=(), geolocation=()');
  res.setHeader('Content-Security-Policy',"default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; font-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'");
  const url=new URL(req.url,'http://localhost'); const pathname=url.pathname;
  try{
   if(pathname==='/healthz')return respond(res,200,{ok:true,service:'verrift'});
   if(req.method==='GET'&&!pathname.startsWith('/api/')){
    const routes={'/':'index.html','/app':'workspace.html','/admin':'admin.html','/docs':'docs.html','/about':'docs.html','/sandbox':'sandbox.html','/favicon.svg':'mark.svg','/mark.svg':'mark.svg','/styles.css':'styles.css','/landing.css':'landing.css','/landing.js':'landing.js','/app.js':'app.js','/wallet.js':'wallet.js','/admin.js':'admin.js','/sandbox.js':'sandbox.js','/report.js':'report.js'};
    const target=routes[pathname]||(pathname.startsWith('/report/cas_')?'report.html':null);if(!target)return respond(res,404,{error:'Page not found'});
    const file=await readFile(path.join(process.cwd(),'public',target));res.writeHead(200,{'Content-Type':types[path.extname(target)]||'application/octet-stream','Cache-Control':target.endsWith('.html')?'no-cache':'public, max-age=3600'});return res.end(file);
   }
   if(req.method!=='GET'&&!sameOrigin(req))fail('Cross-origin requests are not allowed',403);
   const ip=req.socket?.remoteAddress||'local';
   let actor=actorFor(req,sessionSecret);
   if(!actor){const guestToken=newGuest(sessionSecret);actor={id:signedCookie({headers:{cookie:`verrift_guest=${guestToken}`}},'verrift_guest',sessionSecret).id,role:'guest',wallet:null};res.setHeader('Set-Cookie',cookie('verrift_guest',guestToken,req,24*3600));}
   if(req.method==='GET'&&pathname==='/api/status')return respond(res,200,{authenticated:actor.role==='user',actor:{role:actor.role,wallet:actor.wallet},isAdmin:actor.role==='user'&&Boolean(process.env.ADMIN_WALLET_ADDRESS)&&actor.wallet.toLowerCase()===process.env.ADMIN_WALLET_ADDRESS.toLowerCase(),aiEnabled:Boolean(process.env.ANTHROPIC_API_KEY),chainId:BASE_CHAIN_ID,baseNetwork:'Base Sepolia',persistence:store.supabaseUrl?'supabase':store.redisUrl?'upstash':'local'});
   if(req.method==='GET'&&pathname==='/api/sandbox/widget'){
    const state=await store.read();const sandbox=getSandbox(state,actor.id);return respond(res,sandbox.broken?503:200,{service:'VERRIFT sample check target',status:sandbox.broken?'SERVICE_UNAVAILABLE':'SERVICE_READY',version:sandbox.version});
   }
   if(pathname==='/api/auth/challenge'&&req.method==='GET'){
    limit(`challenge:${ip}`,10);const origin=process.env.PUBLIC_ORIGIN||`${req.headers['x-forwarded-proto']==='https'?'https':'http'}://${req.headers.host}`;
    const issued=challenge(url.searchParams.get('address')||'',origin,sessionSecret);
    return respond(res,200,{message:issued.message},{'Set-Cookie':cookie('verrift_challenge',issued.proof,req,300)});
   }
   if(pathname==='/api/auth/verify'&&req.method==='POST'){
    limit(`wallet-login:${ip}`,8);const data=await body(req);
    const proof=(req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith('verrift_challenge='))?.slice('verrift_challenge='.length);
    const address=verifyChallenge({...data,proof},sessionSecret);
    const identity=await authExchanger({message:data.message,signature:data.signature});
    if(actor.role==='guest'){await store.mutate(state=>{const userId=`user_${identity.id}`;for(const item of state.cases){if(item.ownerId===actor.id)item.ownerId=userId;}if(state.sandboxes?.[actor.id]){state.sandboxes[userId]=state.sandboxes[actor.id];delete state.sandboxes[actor.id];}return true;});}
    res.setHeader('Set-Cookie',[cookie('verrift_challenge','',req,0),cookie('verrift_auth',newSession(identity.id,address,sessionSecret),req,8*3600)]);
    return respond(res,200,{ok:true,actor:{role:'user',wallet:address}});
   }
   if(pathname==='/api/logout'&&req.method==='POST')return respond(res,200,{ok:true},{'Set-Cookie':cookie('verrift_auth','',req,0)});
   if(pathname==='/api/admin/summary'&&req.method==='GET'){
    requireUser(actor);
    if(!process.env.ADMIN_WALLET_ADDRESS||actor.wallet.toLowerCase()!==process.env.ADMIN_WALLET_ADDRESS.toLowerCase())fail('Administrator access required',403);
    const state=await store.read();return respond(res,200,{projects:state.projects.length,cases:state.cases.length,checks:state.runs.length,verified:state.cases.filter(c=>c.status==='verified').length,payments:state.payouts.length});
   }
   if(req.method==='GET'&&pathname.startsWith('/api/public/')){
    const id=pathname.slice('/api/public/'.length);const state=await store.read();const item=state.cases.find(c=>c.id===id);
    if(!item||!item.shareToken||!safeEquals(url.searchParams.get('token')||'',item.shareToken))fail('Report not found',404);
    const {shareToken,ownerId,...publicItem}=item;return respond(res,200,{case:publicItem,runs:state.runs.filter(r=>r.caseId===id),payout:state.payouts.find(p=>p.caseId===id)||null,anchor:state.anchors.find(a=>a.caseId===id)||null});
   }
   if(req.method==='GET'&&pathname==='/api/data'){
    const state=await store.read();const cases=state.cases.filter(c=>c.ownerId===actor.id);const ids=new Set(cases.map(c=>c.id));
    return respond(res,200,{projects:state.projects.filter(p=>p.ownerId===actor.id),cases,runs:state.runs.filter(r=>ids.has(r.caseId)),analyses:state.analyses.filter(a=>ids.has(a.caseId)),payouts:state.payouts.filter(p=>ids.has(p.caseId)),anchors:state.anchors.filter(a=>ids.has(a.caseId)),sandbox:getSandbox(state,actor.id)});
   }
   if(req.method==='POST'&&pathname==='/api/projects'){
    requireUser(actor);limit(`write:${ip}`,25);const data=await body(req);const domain=domainName(bounded(data.domain,260,'Domain'));
    const project=await store.mutate(state=>{
     if(state.projects.filter(p=>p.ownerId===actor.id).length>=15)fail('Account project limit reached',409);
     if(state.projects.some(p=>p.domain===domain && p.ownerId!==actor.id))fail('Domain already registered by another user',409);
     if(state.projects.some(p=>p.domain===domain && p.ownerId===actor.id))fail('Domain already registered',409);
     const project={id:uid('pro_'),ownerId:actor.id,domain,verificationToken:crypto.randomBytes(18).toString('hex'),verifiedAt:null,method:null,createdAt:now()};state.projects.unshift(project);return project;
    });return respond(res,201,{project});
   }
   const verifyMatch=pathname.match(/^\/api\/projects\/(pro_[a-z0-9]+)\/verify$/);
   if(req.method==='POST'&&verifyMatch){limit(`verification:${ip}`,8);requireUser(actor);const project=(await store.read()).projects.find(p=>p.id===verifyMatch[1]);requireOwner(actor,project);
    const method=await domainVerifier(project.domain,project.verificationToken);
    if(!method)fail('Verification proof not found yet. Check DNS TXT or HTTPS file and retry.',409);
    const updated=await store.mutate(state=>{const p=state.projects.find(x=>x.id===project.id);p.verifiedAt=now();p.method=method;return p;});return respond(res,200,{project:updated});
   }
   if(req.method==='POST'&&pathname==='/api/cases'){
    limit(`write:${ip}`,actor.role==='guest'?8:25);const data=await body(req);
    if(actor.role==='guest'&&data.kind!=='sandbox')requireUser(actor);
    const item=await store.mutate(state=>{
      const cutoff=Date.now()-24*3600000;const oldIds=new Set(state.cases.filter(c=>c.ownerId?.startsWith('guest_')&&Date.parse(c.createdAt)<cutoff).map(c=>c.id));
      if(oldIds.size){state.cases=state.cases.filter(c=>!oldIds.has(c.id));state.runs=state.runs.filter(r=>!oldIds.has(r.caseId));state.analyses=state.analyses.filter(a=>!oldIds.has(a.caseId));}
      const count=state.cases.filter(c=>c.ownerId===actor.id).length;
      if(count>=(actor.role==='guest'?2:50))fail('Account case limit reached',409);
      const c=makeCase(data,state.projects.filter(p=>p.ownerId===actor.id));c.ownerId=actor.id;state.cases.unshift(c);return c;
    });return respond(res,201,{case:item});
   }
   if(req.method==='POST'&&pathname==='/api/sandbox'){
    limit(`sandbox:${ip}`,15);const data=await body(req);if(typeof data.broken!=='boolean')fail('broken must be true or false');
    const sandbox=await store.mutate(state=>{
      state.sandboxes||={};const cutoff=Date.now()-24*3600000;
      for(const [key,value] of Object.entries(state.sandboxes)){if(key.startsWith('guest_')&&(!value.updatedAt||Date.parse(value.updatedAt)<cutoff))delete state.sandboxes[key];}
      const before=getSandbox(state,actor.id);state.sandboxes[actor.id]={broken:data.broken,version:before.version+1,updatedAt:now()};return state.sandboxes[actor.id];
    });return respond(res,200,{sandbox});
   }
   const caseMatch=pathname.match(/^\/api\/cases\/(cas_[a-z0-9]+)\/(run|analyze|share|reward|confirm-payment|anchor|proof|delete)$/);
   if(caseMatch){
    const [,id,action]=caseMatch;const state=await store.read();const item=state.cases.find(c=>c.id===id);requireOwner(actor,item);
    if(action==='proof' && req.method==='GET'){
     const digest=computeDigest(item,state.runs.filter(r=>r.caseId===id));
     return respond(res,200,{digest,network:'Base Sepolia',caseId:id});
    }
    if(req.method!=='POST')fail('Method not allowed',405);
    limit(`${action}:${ip}`,action==='run'?15:action==='analyze'?4:22);
    if(action==='run'){
     const project=state.projects.find(p=>p.id===item.projectId);
     let result;
     try{result=await runProbe(item,project,getSandbox(state,actor.id),externalProbe);}
     catch(err){result={passed:false,checks:[{label:'Target response',pass:false,detail:'Unable to complete authorized check'}],observation:{url:item.kind==='sandbox'?'internal:/api/sandbox/widget':`https://${project?.domain}${item.path}`,observedAt:now()},error:String(err.message).slice(0,180)};}
     const saved=await store.mutate(next=>{
       const current=next.cases.find(c=>c.id===id);requireOwner(actor,current);if(actor.role==='guest'&&next.runs.filter(r=>r.caseId===id).length>=20)fail('Guest demo run limit reached; try a fresh case',429);const previous=next.runs.filter(r=>r.caseId===id);const run={id:uid('run_'),caseId:id,createdAt:now(),...result};
       next.runs.push(run);if(next.runs.length>1000)next.runs.shift();
       if(run.passed&&previous.some(r=>!r.passed))current.status='verified';else if(!run.passed)current.status='failing';else current.status='passing';
       return {run,case:current};
     });return respond(res,200,saved);
    }
    if(action==='anchor'){
      requireUser(actor);const data=await body(req);if(data.from?.toLowerCase()!==actor.wallet)fail('Proof transaction must come from your signed-in wallet',403);if(item.status!=='verified')fail('A passing rerun after a failure is required',409);
      if(state.anchors.some(a=>a.caseId===id))fail('This case is already anchored',409);
      const digest=computeDigest(item,state.runs.filter(r=>r.caseId===id));
      const chainProof=await anchorVerifier({hash:data.hash,from:data.from,digest});
      const anchor=await store.mutate(s=>{if(s.anchors.some(a=>a.caseId===id))fail('This case is already anchored',409);const a={caseId:id,anchoredAt:now(),...chainProof};s.anchors.push(a);return a;});
      return respond(res,200,{anchor});
    }
    if(action==='analyze'){
     requireUser(actor);const recent=state.runs.filter(r=>r.caseId===id);if(!recent.length)fail('Run a verification first',409);
     const analysis=await caseAnalyzer(item,recent);
     const saved=await store.mutate(s=>{const value={id:uid('ai_'),caseId:id,createdAt:now(),...analysis};s.analyses.unshift(value);s.analyses=s.analyses.slice(0,100);return value;});return respond(res,200,{analysis:saved});
    }
    if(action==='share'){
     requireUser(actor);const share=await store.mutate(s=>{const c=s.cases.find(c=>c.id===id);c.shareToken=c.shareToken||crypto.randomBytes(18).toString('hex');return c.shareToken;});return respond(res,200,{url:`/api/public/${id}?token=${share}`,pageUrl:`/report/${id}?token=${share}`});
    }
    if(action==='reward'){
     requireUser(actor);const data=await body(req);if(!hexAddress(data.to))fail('Enter a valid developer wallet address');
     const {ethToWei}=await import('./base.js');const amount=String(data.amountEth||'');ethToWei(amount);
     const value=await store.mutate(s=>{const c=s.cases.find(c=>c.id===id);if(s.payouts.some(p=>p.caseId===id))fail('This case has already been paid',409);c.reward={to:data.to,amountEth:amount,createdAt:now()};return c.reward;});return respond(res,200,{reward:value});
    }
    if(action==='confirm-payment'){
     requireUser(actor);const data=await body(req);if(!isHexHash(data.hash)||!hexAddress(data.from))fail('Valid transaction hash and sender wallet required');
     if(data.from.toLowerCase()!==actor.wallet)fail('Payment sender must match your signed-in wallet',403);
     if(item.status!=='verified')fail('A failed check followed by a passing check is required before payment',409);
     if(!item.reward)fail('Configure the repair reward first',409);
     if(state.payouts.some(p=>p.caseId===id||p.hash.toLowerCase()===data.hash.toLowerCase()))fail('Reward already recorded',409);
     const verified=await transferVerifier({hash:data.hash,from:data.from,to:item.reward.to,amountEth:item.reward.amountEth});
     const payment=await store.mutate(s=>{if(s.payouts.some(p=>p.caseId===id||p.hash.toLowerCase()===data.hash.toLowerCase()))fail('Reward already recorded',409);const p={caseId:id,confirmedAt:now(),...verified};s.payouts.push(p);return p;});return respond(res,200,{payment});
    }
    if(action==='delete'){
     await store.mutate(s=>{if(s.payouts.some(p=>p.caseId===id))fail('Paid cases cannot be deleted',409);s.cases=s.cases.filter(c=>c.id!==id);s.runs=s.runs.filter(r=>r.caseId!==id);s.analyses=s.analyses.filter(a=>a.caseId!==id);return true;});return respond(res,200,{ok:true});
    }
   }
   if(req.method==='GET'&&pathname.startsWith('/api/export/')){
    const id=pathname.slice('/api/export/'.length);const state=await store.read();const item=state.cases.find(c=>c.id===id);requireOwner(actor,item);
    const {shareToken,ownerId,...cleanItem}=item;const result={case:cleanItem,project:state.projects.find(p=>p.id===item.projectId)?.domain||null,runs:state.runs.filter(r=>r.caseId===id),analyses:state.analyses.filter(a=>a.caseId===id),payouts:state.payouts.filter(p=>p.caseId===id),anchors:state.anchors.filter(a=>a.caseId===id),exportedAt:now()};
    return respond(res,200,result,{'Content-Disposition':`attachment; filename="verrift-${id}.json"`});
   }
   fail('Endpoint not found',404);
  }catch(err){const status=err.status||500; if(status>=500)console.error('VERRIFT server:',err.message);return respond(res,status,{error:status>=500&&status!==502&&status!==503?'Internal server error':err.message});}
 };
}
