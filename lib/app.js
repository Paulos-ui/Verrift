import {readFile} from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {cookie,newGuest,newSession,challenge,verifyChallenge,actorFor,requireUser,requireOwner,exchangeWeb3,signedCookie} from './auth.js';
import {Store} from './store.js';
import {uid,now,hash,safeEquals,fail,bounded,hexAddress,isHexHash,parseCookies} from './utils.js';
import {domainName,allowedPath,verifyDomain,probe,checkResponse} from './domain.js';
import {analyzeCase,explainAllowance} from './ai.js';
import {verifyTransfer,verifyAnchor,BASE_CHAIN_ID} from './base.js';
import {inspectWallet} from './wallet-insights.js';
import {readVibesBalance,readAllowance,discoverRecentApprovals,verifyRevocation} from './wallet-safety.js';
import {requestVibesQuote,verifyVibesSwap} from './vibes-swap.js';
import {inspectBaseToken,createTokenScanRecord,compareTokenScans} from './token-intel.js';
import {inspectPermissionExposure} from './exposure.js';

const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.ico':'image/x-icon','.png':'image/png'};
function respond(res,status,data,extra={}){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',...extra});res.end(JSON.stringify(data));}
async function body(req){
 let payload='';for await(const chunk of req){payload+=chunk;if(payload.length>96000)fail('Request too large',413);}
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
export function createHandler({store=new Store(),sessionSecret=process.env.SESSION_SECRET,domainVerifier=verifyDomain,externalProbe=probe,caseAnalyzer=analyzeCase,transferVerifier=verifyTransfer,anchorVerifier=verifyAnchor,authExchanger=exchangeWeb3,walletInspector=inspectWallet,vibesReader=readVibesBalance,allowanceReader=readAllowance,approvalsReader=discoverRecentApprovals,revokeVerifier=verifyRevocation,allowanceExplainer=explainAllowance,swapQuoter=requestVibesQuote,swapVerifier=verifyVibesSwap,tokenInspector=inspectBaseToken,exposureReader=inspectPermissionExposure}={}){
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
    const routes={'/':'index.html','/app':'workspace.html','/admin':'admin.html','/docs':'docs.html','/about':'docs.html','/verify':'verify.html','/sandbox':'sandbox.html','/favicon.svg':'mark.svg','/mark.svg':'mark.svg','/og-wallet.png':'og-wallet.png','/styles.css':'styles.css','/ui-v5.css':'ui-v5.css','/ui-v6.css':'ui-v6.css','/passport.css':'passport.css','/landing.css':'landing.css','/landing.js':'landing.js','/public-inspector.js':'public-inspector.js','/ui-v8.css':'ui-v8.css','/ui-v9.css':'ui-v9.css','/ui-v10.css':'ui-v10.css','/ui-2026.css':'ui-2026.css','/token-check.js':'token-check.js','/landing-scan.js':'landing-scan.js','/ui-v11.css':'ui-v11.css','/ui-v12.css':'ui-v12.css','/exposure.js':'exposure.js','/verify.js':'verify.js','/app.js':'app.js','/wallet.js':'wallet.js','/admin.js':'admin.js','/sandbox.js':'sandbox.js','/report.js':'report.js'};
    const target=routes[pathname]||(pathname.startsWith('/report/cas_')?'report.html':null);if(!target)return respond(res,404,{error:'Page not found'});
    const file=await readFile(path.join(process.cwd(),'public',target));res.writeHead(200,{'Content-Type':types[path.extname(target)]||'application/octet-stream','Cache-Control':target.endsWith('.html')?'no-cache':'public, max-age=3600'});return res.end(file);
   }
   if(req.method!=='GET'&&!sameOrigin(req))fail('Cross-origin requests are not allowed',403);
   const ip=req.socket?.remoteAddress||'local';
   let actor=actorFor(req,sessionSecret);
   if(!actor){const guestToken=newGuest(sessionSecret);actor={id:signedCookie({headers:{cookie:`verrift_guest=${guestToken}`}},'verrift_guest',sessionSecret).id,role:'guest',wallet:null};res.setHeader('Set-Cookie',cookie('verrift_guest',guestToken,req,24*3600));}
   if(req.method==='GET'&&pathname==='/api/status')return respond(res,200,{authenticated:actor.role==='user',actor:{role:actor.role,wallet:actor.wallet},isAdmin:actor.role==='user'&&Boolean(process.env.ADMIN_WALLET_ADDRESS)&&actor.wallet.toLowerCase()===process.env.ADMIN_WALLET_ADDRESS.toLowerCase(),aiEnabled:Boolean(process.env.ANTHROPIC_API_KEY),chainId:BASE_CHAIN_ID,baseNetwork:'Base Mainnet (wallet tools)',swapEnabled:Boolean(process.env.ZEROX_API_KEY),tokenRewardsFunded:false,persistence:store.supabaseUrl?'supabase':store.redisUrl?'upstash':'local'});
   // Public read-only contract research. Rate limited; never performs transactions.
   if(req.method==='GET'&&pathname==='/api/token/check'){
     limit(`public-token:${ip}`,6);
     const token=url.searchParams.get('address')||'';
     if(!hexAddress(token))fail('Enter a valid Base token contract address');
     return respond(res,200,{report:await tokenInspector(token)});
   }
   // Public per-pair exposure: all ERC-20 reads pinned to one Base block. No wallet required.
   if(req.method==='GET'&&pathname==='/api/token/exposure'){
     limit(`public-exposure:${ip}`,8);
     const owner=url.searchParams.get('owner')||'';
     const token=url.searchParams.get('token')||'';
     const spender=url.searchParams.get('spender')||'';
     if(!hexAddress(owner)||!hexAddress(token)||!hexAddress(spender))fail('Use valid 0x addresses for owner, token and spender',400);
     return respond(res,200,{exposure:await exposureReader({owner,token,spender})});
   }
   // Public research records, bounded and intentionally shareable. No wallet login or trades.
   if(pathname==='/api/token/scans'&&req.method==='POST'){
     const input=await body(req);
     if(!hexAddress(input.address))fail('Enter a valid Base token contract address',400);
     limit(`save-scan:${ip}`,6);
     let earlier=null;
     if(input.compareTo!==undefined){
       if(typeof input.compareTo!=='string'||!/^scan_[a-z0-9]{20}$/.test(input.compareTo))fail('Invalid previous scan ID',400);
       earlier=(await store.read()).tokenScans?.find(s=>s.id===input.compareTo);
       if(!earlier||earlier.address!==input.address.toLowerCase())fail('Earlier scan not found for this contract',404);
     }
     const report=await tokenInspector(input.address);
     if(report.address!==input.address.toLowerCase()||report.chainId!==8453)throw Error('Scan provider returned mismatched contract');
     const record=createTokenScanRecord(report);
     // Never present an unavailable scan as a successful archived report.
     if(report.status==='insufficient_evidence'&&report.sources.every(s=>s.status==='unavailable'))fail('All research providers are unavailable. Try again later.',503);
     await store.mutate(state=>{state.tokenScans||=[];state.tokenScans.unshift(record);state.tokenScans=state.tokenScans.slice(0,250);});
     return respond(res,201,{record,comparison:earlier?compareTokenScans(earlier,record):null,
      publicUrl:`/verify?scan=${encodeURIComponent(record.id)}#token`});
   }
   const scanId=pathname.match(/^\/api\/token\/scans\/(scan_[a-z0-9]{20})$/);
   if(scanId&&req.method==='GET'){
     limit(`read-scan:${ip}`,20);
     const record=(await store.read()).tokenScans?.find(s=>s.id===scanId[1]);
     if(!record)fail('Scan record not found or no longer retained',404);
     return respond(res,200,{record});
   }
   // Anonymous, strictly read-only preview, limited to balance/nonce and VIBES holding.
   if(pathname==='/api/verify/revocation'&&req.method==='GET'){
     limit(`public-verify:${ip}`,10);
     const proof=await revokeVerifier({owner:url.searchParams.get('owner'),token:url.searchParams.get('token'),spender:url.searchParams.get('spender'),hash:url.searchParams.get('hash')});
     return respond(res,200,{verified:true,proof,source:'Base Mainnet RPC transaction receipt + current ERC-20 allowance'});
   }
   if(pathname==='/api/public/scan'&&req.method==='GET'){
     limit(`public-scan:${ip}`,6);const address=url.searchParams.get('address')||'';
     if(!hexAddress(address))fail('Enter a valid 0x Base wallet address');
     const [scan,vibes]=await Promise.allSettled([walletInspector(address,{key:''}),vibesReader(address)]);
     if(scan.status!=='fulfilled')throw scan.reason;
     return respond(res,200,{wallet:scan.value.wallet,chainId:8453,balanceEth:scan.value.balanceEth,outgoingNonce:scan.value.outgoingNonce,inspectedAt:scan.value.inspectedAt,vibes:vibes.status==='fulfilled'?vibes.value:null,source:'Base Mainnet RPC',limitations:'Read-only public address inspection. Ownership has not been verified. Balance and nonce do not measure wallet safety.'});
   }
   if(pathname==='/api/wallet/vibes'&&req.method==='GET'){
     requireUser(actor);limit(`vibes:${actor.id}`,15);return respond(res,200,{vibes:await vibesReader(actor.wallet)});
   }
   if(pathname==='/api/wallet/approvals'&&req.method==='GET'){
     requireUser(actor);limit(`approvals:${actor.id}`,8);
     // VIBES holders can request an extended recent-block sample, never an all-time safety claim.
     let holder=false;try{holder=Boolean((await vibesReader(actor.wallet)).holder);}catch{ /* base scan still works without holder RPC */ }
     let scan;let holderWindowUsed=false;
     try{scan=await approvalsReader(actor.wallet,{blocks:holder?12000:8000});holderWindowUsed=holder;}
     catch(error){if(!holder)throw error;scan=await approvalsReader(actor.wallet,{blocks:8000});}
     return respond(res,200,{scan,holderWindowUsed,note:holderWindowUsed?'VIBES holder benefit: up to 12,000 recent blocks were requested. Not a complete historical audit.':'Free recent Base allowance sample, no token purchase needed.'});
   }
   if(pathname==='/api/wallet/allowance'&&req.method==='GET'){
     requireUser(actor);limit(`allowance:${actor.id}`,15);
     return respond(res,200,{allowance:await allowanceReader(actor.wallet,url.searchParams.get('token')||'',url.searchParams.get('spender')||'')});
   }
   if(pathname==='/api/wallet/explain'&&req.method==='POST'){
     requireUser(actor);limit(`wallet-explain:${actor.id}`,3);
     const data=await body(req);
     // Read the allowance on the server, never allow fabricated token values in prompts.
     const live=await allowanceReader(actor.wallet,data.token,data.spender);
     return respond(res,200,{explanation:await allowanceExplainer(live)});
   }
   if(pathname==='/api/wallet/revoke/verify'&&req.method==='POST'){
     requireUser(actor);limit(`revoke-verify:${actor.id}`,9);
     const data=await body(req);const proof=await revokeVerifier({owner:actor.wallet,token:data.token,spender:data.spender,hash:data.hash});
     const saved=await store.mutate(next=>{
       next.revocations||={};next.revocations[actor.id]||=[];
       if(!next.revocations[actor.id].some(r=>r.hash.toLowerCase()===proof.hash.toLowerCase()))next.revocations[actor.id].unshift(proof);
       next.revocations[actor.id]=next.revocations[actor.id].slice(0,25);return proof;
     });return respond(res,200,{proof:saved});
   }
   // ETH -> VIBES on Base Mainnet, via 0x firm quotes. No automatic trades.
   if(pathname==='/api/wallet/swap/quote'&&req.method==='POST'){
     requireUser(actor);limit(`swap-quote:${actor.id}`,5);
     const data=await body(req);
     const quote=await swapQuoter({owner:actor.wallet,amountEth:data.amountEth,slippageBps:Number(data.slippageBps||100)},{secret:sessionSecret});
     return respond(res,200,{quote,notice:'A quote is not an executed swap. Always inspect your wallet transaction before approving.'});
   }
   if(pathname==='/api/wallet/swap/verify'&&req.method==='POST'){
     requireUser(actor);limit(`swap-verify:${actor.id}`,8);const data=await body(req);
     const proof=await swapVerifier({owner:actor.wallet,hash:data.hash,quoteProof:data.quoteProof},{secret:sessionSecret});
     const saved=await store.mutate(next=>{
       next.swaps||={};next.swaps[actor.id]||=[];
       if(!next.swaps[actor.id].some(x=>x.hash.toLowerCase()===proof.hash.toLowerCase()))next.swaps[actor.id].unshift(proof);
       next.swaps[actor.id]=next.swaps[actor.id].slice(0,25);return proof;
     });return respond(res,200,{verified:true,swap:saved});
   }
   if(pathname==='/api/profile'&&req.method==='GET'){
     requireUser(actor);const stored=await store.read();
     return respond(res,200,{wallet:actor.wallet,profile:stored.profiles?.[actor.id]||{streak:0,days:0,points:0,lastClaimDate:null,holderOnLastClaim:false},revocations:stored.revocations?.[actor.id]||[],swaps:stored.swaps?.[actor.id]||[],projects:stored.projects.filter(p=>p.ownerId===actor.id).length,verifiedDomains:stored.projects.filter(p=>p.ownerId===actor.id&&p.verifiedAt).length});
   }
   if(pathname==='/api/profile/checkin'&&req.method==='POST'){
     requireUser(actor);limit(`checkin:${actor.id}`,5);
     const today=new Date().toISOString().slice(0,10);
     if((await store.read()).profiles?.[actor.id]?.lastClaimDate===today)fail('You already checked in today (UTC). Come back tomorrow.',409);
     let vibes=null;try{vibes=await vibesReader(actor.wallet);}catch(error){console.warn('VIBES reading unavailable during check-in:',error.message);}
     const profile=await store.mutate(next=>{
       next.profiles||={};const old=next.profiles[actor.id]||{streak:0,days:0,points:0};
       if(old.lastClaimDate===today)fail('Daily check-in already claimed',409);
       const yesterday=new Date(Date.parse(today+'T00:00:00Z')-86400000).toISOString().slice(0,10);
       const streak=old.lastClaimDate===yesterday?old.streak+1:1;
       const bonus=vibes?.holder?5:0;
       const milestoneBonus=streak%30===0?30:streak%7===0?7:0;
       next.profiles[actor.id]={streak,days:(old.days||0)+1,points:(old.points||0)+10+bonus+milestoneBonus,lastClaimDate:today,holderOnLastClaim:Boolean(vibes?.holder),lastClaimBonus:bonus,milestoneBonus};
       return next.profiles[actor.id];
     });return respond(res,200,{profile,tokenCheck:vibes?'confirmed':'unavailable',notice:'VERRIFT Points are nontransferable profile indicators only, not $VIBES, cryptocurrency, or financial rewards.'});
   }
   // Wallet Passport: wallet ownership is proven through Supabase Web3 sign-in.
   // History is read from Base Mainnet, while optional proof anchors use Base Sepolia.
   if(pathname==='/api/wallet/insights'&&req.method==='GET'){
     requireUser(actor);limit(`wallet-insights:${actor.id}`,12);
     return respond(res,200,{insights:await walletInspector(actor.wallet)});
   }
   if(pathname==='/api/wallet/passport'&&req.method==='GET'){
     requireUser(actor);const state=await store.read();return respond(res,200,{passport:state.walletPassports?.[actor.id]||null});
   }
   if(pathname==='/api/wallet/passport'&&req.method==='POST'){
     requireUser(actor);limit(`wallet-passport:${actor.id}`,5);
     // Never let callers submit invented balances or fabricated historical transactions.
     const existing=(await store.read()).walletPassports?.[actor.id];
     if(existing&&(existing.confirmedAt||Date.now()-Date.parse(existing.createdAt)<30*60*1000))return respond(res,200,{passport:existing});
     const insights=await walletInspector(actor.wallet);
     const passport=await store.mutate(state=>{
       state.walletPassports||={};const current=state.walletPassports[actor.id];
       if(current?.confirmedAt)return current;
       if(current&&Date.now()-Date.parse(current.createdAt)<30*60*1000)return current;
       const snapshot={protocol:'verrift-wallet-passport-v1',wallet:actor.wallet,chainId:8453,balanceEth:insights.balanceEth,outgoingNonce:insights.outgoingNonce,inspectedAt:insights.inspectedAt,nonce:uid('snap_')};
       const passport={...snapshot,digest:'0x'+hash(JSON.stringify(snapshot)),createdAt:now(),confirmedAt:null,txHash:null};
       state.walletPassports[actor.id]=passport;return passport;
     });return respond(res,200,{passport});
   }
   if(pathname==='/api/wallet/confirm'&&req.method==='POST'){
     requireUser(actor);limit(`wallet-confirm:${actor.id}`,8);
     const data=await body(req);if(!isHexHash(data.hash))fail('Valid Base Sepolia transaction hash required');
     const state=await store.read();const passport=state.walletPassports?.[actor.id];
     if(!passport)fail('Create a wallet passport before anchoring',409);
     if(passport.confirmedAt)fail('This wallet passport is already anchored',409);
     const verified=await anchorVerifier({hash:data.hash,from:actor.wallet,digest:passport.digest});
     const saved=await store.mutate(next=>{
       const current=next.walletPassports?.[actor.id];
       if(!current||current.digest!==passport.digest||current.confirmedAt)fail('Passport changed or already confirmed',409);
       if(Object.values(next.walletPassports).some(x=>x.txHash?.toLowerCase()===data.hash.toLowerCase()))fail('This transaction was already used',409);
       current.confirmedAt=now();current.txHash=verified.hash;current.explorer=verified.explorer;current.blockNumber=verified.blockNumber;return current;
     });return respond(res,200,{passport:saved});
   }
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
    requireUser(actor);const state=await store.read();const cases=state.cases.filter(c=>c.ownerId===actor.id);const ids=new Set(cases.map(c=>c.id));
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
    requireUser(actor);limit(`write:${ip}`,25);const data=await body(req);
    const item=await store.mutate(state=>{
      const cutoff=Date.now()-24*3600000;const oldIds=new Set(state.cases.filter(c=>c.ownerId?.startsWith('guest_')&&Date.parse(c.createdAt)<cutoff).map(c=>c.id));
      if(oldIds.size){state.cases=state.cases.filter(c=>!oldIds.has(c.id));state.runs=state.runs.filter(r=>!oldIds.has(r.caseId));state.analyses=state.analyses.filter(a=>!oldIds.has(a.caseId));}
      const count=state.cases.filter(c=>c.ownerId===actor.id).length;
      if(count>=50)fail('Account case limit reached',409);
      const c=makeCase(data,state.projects.filter(p=>p.ownerId===actor.id));c.ownerId=actor.id;state.cases.unshift(c);return c;
    });return respond(res,201,{case:item});
   }
   if(req.method==='POST'&&pathname==='/api/sandbox'){
    requireUser(actor);limit(`sandbox:${ip}`,15);const data=await body(req);if(typeof data.broken!=='boolean')fail('broken must be true or false');
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
       const current=next.cases.find(c=>c.id===id);requireOwner(actor,current);const previous=next.runs.filter(r=>r.caseId===id);const run={id:uid('run_'),caseId:id,createdAt:now(),...result};
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
