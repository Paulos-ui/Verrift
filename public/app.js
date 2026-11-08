import {availableWallets,connectWallet,currentWallet,walletBalance,sendEth,anchorEvidence,signInMessage,watchWalletChanges,EXPLORER} from './wallet.js';
const $=s=>document.querySelector(s);
const state={view:'overview',data:null,selected:null,wallet:null,actor:{role:'guest',wallet:null},aiEnabled:false,pending:null,focus:null,insights:null,insightsAt:0,insightsError:null,passport:null,pendingPassport:null};
let walletChoices=[]; 
const escapeHTML=s=>String(s??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
const e=escapeHTML;
const dt=s=>new Date(s).toLocaleString(undefined,{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'});
const trimWallet=a=>a?`${a.slice(0,6)}…${a.slice(-4)}`:'Connect wallet';
function flash(text,kind='ok'){const t=$('#toast');t.hidden=false;t.className=`toast ${kind}`;t.textContent=text;clearTimeout(flash.timer);flash.timer=setTimeout(()=>t.hidden=true,5800);}
async function api(url,options={}){
 let response;try{response=await fetch(url,{credentials:'same-origin',...options,headers:{...(options.body?{'content-type':'application/json'}:{}),...(options.headers||{})}});}catch{throw new Error('Network unavailable. Check your connection.');}
 let value;try{value=await response.json();}catch{throw new Error(`Server returned HTTP ${response.status}`);}
 if(!response.ok)throw new Error(value.error||`HTTP ${response.status}`);return value;
}
const post=(url,value={})=>api(url,{method:'POST',body:JSON.stringify(value)});
const statusTag=(name)=>{const good=name==='verified'||name==='passing';return `<span class="status-tag ${good?'good':name==='failing'?'bad':'neutral'}"><span aria-hidden="true">●</span> ${e(name)}</span>`;};
async function refresh(){
 if(state.actor.role!=='user'){state.data=null;renderPublicHome();return;}
 const shouldRead=!state.insights||Date.now()-state.insightsAt>120000;
 const [data,insights,passport]=await Promise.allSettled([api('/api/data'),shouldRead?api('/api/wallet/insights'):Promise.resolve({insights:state.insights}),api('/api/wallet/passport')]);
 if(data.status!=='fulfilled')throw data.reason;
 state.data=data.value;
 if(insights.status==='fulfilled'){state.insights=insights.value.insights;state.insightsAt=Date.now();state.insightsError=null;}
 else state.insightsError=insights.reason.message;
 if(passport.status==='fulfilled')state.passport=passport.value.passport;
 render();
}
function menu(view){if(state.actor.role!=='user'){renderPublicHome();showWalletPicker();return;}state.view=view;document.querySelectorAll('[data-view]').forEach(button=>{button.classList.toggle('active',button.dataset.view===view)});$('#crumb-view').textContent=view.toUpperCase();render();}
function render(){if(!state.data)return;$('#crumb-view').textContent=state.view.toUpperCase();$('#case-counter').textContent=state.data.cases.length;const content=$('#content');if(state.view==='overview')content.innerHTML=walletPassportView();if(state.view==='cases')content.innerHTML=casesPage();if(state.view==='domains')content.innerHTML=domainsPage();}
function renderPublicHome(error='') {
 const content=$('#content');
 $('#case-counter').textContent='';
 $('#crumb-view').textContent='HOME';
 content.innerHTML=`<div class="welcome-gateway"><div class="gateway-topline"><span>WELCOME TO VERRIFT</span><span>01 / 04 · YOUR WORKSPACE</span></div>
  <div class="gateway-grid"><div class="gateway-copy"><p class="eyebrow">EVIDENCE-DRIVEN SOFTWARE REPAIR</p><h1>Your wallet.<br><em>Your story.</em></h1><p>VERRIFT helps teams document what broke, run a repeatable verification check, and preserve the outcome. Connect a wallet to discover your Base activity and create a shareable proof. Repair verification is an optional tool for builders.</p><button class="gateway-connect" type="button" data-action="connect-wallet">Connect wallet <span>↗</span></button><div class="gateway-footnote"><span class="gateway-signal"></span> NO PASSWORD REQUIRED · SIGNATURE-BASED ACCESS</div></div>
   <div class="gateway-visual" aria-label="How proof-of-fix works"><div class="gateway-visual-top">THE EVIDENCE FLOW <span>V / 001</span></div><div class="gateway-visual-steps"><div><span>01</span><strong>CAPTURE</strong><small>Record the failed check</small></div><div class="gateway-path">↓</div><div><span>02</span><strong>VERIFY</strong><small>Rerun unchanged criteria</small></div><div class="gateway-path">↓</div><div><span>03</span><strong>PROVE</strong><small>Preserve a Base receipt</small></div></div><div class="gateway-visual-bottom">BUILT ON BASE SEPOLIA · TESTNET</div></div></div>
  <div class="gateway-bottom"><div><span class="gateway-number">01 /</span><strong>Private evidence records</strong><p>Your cases are isolated to your authenticated wallet.</p></div><div><span class="gateway-number">02 /</span><strong>Authorized website checks</strong><p>Ownership verification keeps external testing in scope.</p></div><div><span class="gateway-number">03 /</span><strong>Claude + Base</strong><p>AI analysis and confirmed onchain proof are available after connection.</p></div></div>
  ${error?`<p class="gateway-service-error" role="alert">Workspace service unavailable: ${e(error)}. You can still explore the public website and documentation.</p>`:''}
 </div>`;
}
function walletPassportView(){
 const a=state.actor.wallet||'';const x=state.insights;const verified=Boolean(state.passport?.confirmedAt);
 const money=n=>n==null?'Not available':`${Number(n).toLocaleString(undefined,{maximumFractionDigits:5})} ETH`;
 const history=x?.history;const cp=history?.counterparties||[];
 const activity=history?.recent||[];
 const stats=[
  {num:x?money(x.balanceEth):'...',title:'BASE ETH BALANCE',detail:'Mainnet · live RPC value'},
  {num:x?Number(x.outgoingNonce).toLocaleString():'...',title:'TRANSACTIONS SENT',detail:'Account nonce, not total interactions'},
  {num:history?money(history.sentEth):'Unavailable',title:'ETH SENT (SAMPLE)',detail:history?'Recent indexed transactions':'Configure a history indexer'},
  {num:history?money(history.gasEth):'Unavailable',title:'GAS (SAMPLE)',detail:'Recent native outgoing transactions'}
 ];
 const footnote=x?.limitNote||state.insightsError||'Reading public Base Mainnet data. Wallet analysis cannot move your funds.';
 return `<div class="passport-page">
  <div class="passport-heading"><div><p class="eyebrow">VERRIFT / BASE WALLET INTELLIGENCE</p><h1>Your Base story.<br><em>Made verifiable.</em></h1><p>One connected wallet. Real Base data. A receipt you can choose to carry onchain and share.</p></div><button class="passport-refresh" data-action="wallet-refresh">↻ Refresh activity</button></div>
  <section class="passport-hero" aria-label="Wallet passport">
   <div class="passport-hero-copy"><div class="passport-meta">VERRIFT / WALLET PASSPORT <span>BASE · 8453</span></div><div class="passport-symbol">V<span>/</span></div><h2>Congratulations.<br><em>Your wallet is connected.</em></h2><p>Ownership was checked through your signed login. Explore public Base activity without granting spending permissions.</p><div class="passport-address"><span>YOUR WALLET</span><strong>${e(trimWallet(a))}</strong><button data-action="copy-wallet" type="button">Copy address ↗</button></div></div>
   <div class="passport-hero-right"><div class="passport-seal"><span>✓</span><strong>OWNERSHIP<br>VERIFIED</strong><small>By wallet signature</small></div><div class="passport-hero-actions"><button data-action="passport-generate" class="passport-primary">${state.passport?'View wallet receipt':'Generate my receipt'} <span>↗</span></button><button data-action="share-wallet-x" class="passport-secondary">Share to X <span>↗</span></button></div><small class="passport-chain-note">Optional Base Sepolia proof uses testnet gas and requires wallet approval.</small></div>
  </section>
  <section class="passport-metrics" aria-label="Wallet activity metrics">${stats.map((v,i)=>`<div class="passport-metric"><span class="passport-metric-index">0${i+1} / ${v.title}</span><strong>${e(v.num)}</strong><small>${e(v.detail)}</small></div>`).join('')}</section>
  <div class="passport-info-note"><span>DATA PROVENANCE</span><p>${e(footnote)}</p>${x?`<a href="https://basescan.org/address/${e(a)}" target="_blank" rel="noopener noreferrer">Verify on BaseScan ↗</a>`:''}</div>
  <div class="passport-lower"><section class="passport-panel"><div class="passport-panel-header"><div><span>01 / MOVEMENT</span><h2>Recent activity</h2></div><span class="passport-count">${activity.length} DISPLAYED</span></div>${activity.length?`<div class="passport-history">${activity.map(t=>`<a href="https://basescan.org/tx/${e(t.hash)}" target="_blank" rel="noopener noreferrer" class="passport-tx"><span class="passport-dir ${t.direction==='out'?'out':'in'}">${t.direction==='out'?'↗':'↙'}</span><div><strong>${t.direction==='out'?'Sent':'Received'} ${e(money(t.valueEth))}</strong><small>${e(t.counterparty?trimWallet(t.counterparty):'Contract / creation')} · ${e(t.timestamp?.slice(0,10)||'Onchain')}</small></div><span>View ↗</span></a>`).join('')}</div>`:`<div class="passport-empty"><strong>No indexed transfers shown.</strong><p>Live balance and transaction count are available now. Add a Blockscout API key for recent counterparties and native transfer history.</p></div>`}</section>
  <section class="passport-panel"><div class="passport-panel-header"><div><span>02 / CONNECTIONS</span><h2>Repeated counterparties</h2></div></div>${cp.length?`<div class="passport-counterparties">${cp.map((item,i)=>`<a href="https://basescan.org/address/${e(item.address)}" target="_blank" rel="noopener noreferrer"><b>0${i+1}</b><span>${e(trimWallet(item.address))}</span><strong>${item.interactions} touches ↗</strong></a>`).join('')}</div>`:`<div class="passport-empty"><strong>No counterparties to rank yet.</strong><p>We'll show wallet addresses you've interacted with repeatedly once indexed history is available.</p></div>`}
  <div class="passport-proof-status"><span>03 / YOUR RECEIPT</span><h3>${verified?'Anchored on Base Sepolia':state.passport?'Receipt generated':'Make your Base footprint portable.'}</h3><p>${verified?'This proof is confirmed by an onchain transaction.':state.passport?'Your snapshot exists. Anchoring is optional and requires a testnet transaction.':'Create a fingerprint of this wallet snapshot, then choose whether to record it on testnet.'}</p><button class="passport-inline-btn" data-action="passport-generate">${state.passport?'Open receipt':'Create receipt'} ↗</button></div></section></div>
  <section class="passport-dev"><div><span>ADVANCED / FOR BUILDERS</span><h2>Need to verify an actual software repair?</h2><p>Our original evidence lab is still here for developers. It is optional, not a condition of using VERRIFT.</p></div><button data-view="cases">Open repair lab ↗</button></section>
 </div>`;
}
const lens=()=>{
 const {cases,runs,payouts,projects}=state.data;
 return [{n:String(cases.length).padStart(2,'0'),label:'REPAIR CASES',note:'In the evidence register'}, {n:String(runs.length).padStart(2,'0'),label:'CHECKS EXECUTED',note:'Measured, not estimated'}, {n:String(cases.filter(c=>c.status==='verified').length).padStart(2,'0'),label:'REPAIRS VERIFIED',note:'Fail → pass sequence'}, {n:String(payouts.length).padStart(2,'0'),label:'CHAIN RECEIPTS',note:'Base Sepolia confirmations'}];
};
function overview(){
 const {cases,runs,sandbox,projects,payouts,anchors}=state.data;
 const recent=[...runs].slice(-4).reverse();

 const hasChecks=runs.length>0;
 const verifiedCases=cases.filter(c=>c.status==='verified');
 const untestedCase=cases.find(c=>!runs.some(r=>r.caseId===c.id));
 const failingCase=cases.find(c=>{const last=[...runs].reverse().find(r=>r.caseId===c.id);return last&&!last.passed;});
 const latestVerified=verifiedCases.find(c=>!anchors.some(a=>a.caseId===c.id));
 const proofSteps=[
  {name:'Capture a failure',detail:'Open a case and record a real failing check',done:runs.some(r=>!r.passed)},
  {name:'Verify the repair',detail:'Rerun the exact criteria after the fix',done:verifiedCases.length>0},
  {name:'Anchor the evidence',detail:'Submit a fingerprint on Base Sepolia',done:anchors.length>0},
  {name:'Confirm a reward',detail:'Verify the real testnet payment receipt',done:payouts.length>0}
 ];
 let next={index:'START HERE',title:'Start with a real check',body:'Create a case against the controlled test target, introduce a fault, then rerun the same criteria after restoring the service.',action:'quick-start-case',label:'Create your first case'};
 if(untestedCase)next={index:'YOUR NEXT STEP',title:'Capture your first observation',body:'Your case is ready. Run its locked acceptance criteria to start an evidence trail.',action:'run',id:untestedCase.id,label:'Run the case check'};
 else if(failingCase)next={index:'YOUR NEXT STEP',title:'Recheck the repair',body:'A failing observation is recorded. Restore the target and run the identical test to establish proof.',action:'run',id:failingCase.id,label:'Run the same check'};
 else if(latestVerified)next={index:'YOUR NEXT STEP',title:'Make this proof portable',body:'This case has a verified repair. Open its evidence to review the fingerprint and Base anchoring options.',action:'open',id:latestVerified.id,label:'Open verified case'};
 else if(cases.length)next={index:'KEEP GOING',title:'Explore the evidence register',body:'Your latest checks have been recorded. Open a case to inspect observations, share evidence, or begin another repair.',action:'cases',label:'Browse repair cases'};
 const actionHtml=next.action==='run'?`<button class="next-button" data-action="run" data-id="${e(next.id)}">${e(next.label)} <span>↗</span></button>`:next.action==='open'?`<button class="next-button" data-case="${e(next.id)}">${e(next.label)} <span>↗</span></button>`:next.action==='cases'?`<button class="next-button" data-view="cases">${e(next.label)} <span>↗</span></button>`:`<button class="next-button" data-action="quick-start-case">${e(next.label)} <span>↗</span></button>`;
 return `<div class="dashboard-intro">
  <div><p class="eyebrow">VERRIFT / WORKSPACE OVERVIEW</p><h1>Your proof, <em>all in one place.</em></h1><p class="dashboard-subtitle">Connected workspace ${e(trimWallet(state.actor.wallet))}. Your cases and their evidence stay separate from other users.</p></div>
  <div class="intro-actions"><span class="workspace-chip"><i></i> ${state.wallet?'WALLET CONNECTED':'ACCOUNT SESSION'}</span><button class="primary" data-action="new-case">+ New repair case</button></div>
 </div>
 <div class="dashboard-columns"><div class="dashboard-main-column">
 <section class="feature-panel" aria-label="Live repair lab">
  <div class="feature-copy"><span class="feature-index">THE LIVE REPAIR LAB <span>↗</span></span><h2>See the failure.<br><em>Prove the fix.</em></h2><p>A real, repeatable test. Record what broke, restore the sample service, and compare the evidence. No fabricated results.</p><div class="feature-actions"><button class="feature-cta" data-action="quick-start-case">Start a verification case <span>↗</span></button><a href="/docs">How verification works ↗</a></div></div>
  <div class="feature-diagram" aria-label="Illustrated failure-to-repair process"><div class="diagram-label">V/ EVIDENCE FLOW <span>01 / 03</span></div><div class="diagram-cards"><div class="diagram-fail"><span>01 / RECORD</span><strong>FAIL</strong><small>Observe the fault</small></div><span class="diagram-link" aria-hidden="true">→</span><div class="diagram-pass"><span>02 / RECHECK</span><strong>PASS</strong><small>Same test, new result</small></div></div><div class="diagram-caption">ILLUSTRATION ONLY · RUN THE SANDBOX FOR REAL PROOF</div></div>
 </section>
 <section class="metric-row" aria-label="Real workspace metrics">${lens().map((m,i)=>`<div class="metric"><div class="metric-label"><span class="metric-dot">${['◉','↗','✓','⌁'][i]}</span>${m.label}</div><div class="metric-value">${m.n}</div><p>${m.note}</p></div>`).join('')}</section>
 <div class="section-row"><div><div class="eyebrow">YOUR WORK / CASE REGISTER</div><h2>Recent repair cases<span class="accent-dot">.</span></h2><p class="section-description">Evidence from your connected wallet. No sample counts or fabricated history.</p></div><button class="line-button" data-view="cases">View all cases <span>↗</span></button></div>
 ${cases.length?`<div class="case-feed">${cases.slice(0,4).map(caseRow).join('')}</div>`:`<div class="empty-ledger"><div class="empty-icon" aria-hidden="true">⌁</div><div><h3>Your first proof starts here.</h3><p>Create your first case to capture an actual failure and repair.</p></div><button class="small-button" data-action="quick-start-case">Create first case ↗</button></div>`}
 <section class="sandbox-panel refined-sandbox"><div class="panel-top"><span>TEST ENVIRONMENT / LIVE STATE</span><span class="marker ${sandbox.broken?'marker-bad':'marker-good'}">${sandbox.broken?'● DEGRADED':'● OPERATIONAL'}</span></div><div class="sandbox-split"><div><h3>Control the<br><em>test target.</em></h3><p>These buttons change the sample service's actual state. Run the case check afterward to see a recorded result.</p></div><div class="sandbox-controls"><button class="pill-dark" data-action="set-sandbox" data-broken="true">Introduce fault <span>↗</span></button><button class="pill-light" data-action="set-sandbox" data-broken="false">Restore service <span>↗</span></button><a href="/sandbox" class="small-link" target="_blank" rel="noopener">Inspect live target ↗</a></div></div></section>
 </div>
 <aside class="dashboard-side" aria-label="Workspace guidance and activity">
  <section class="next-step-panel"><div class="side-kicker">${e(next.index)} <span class="side-status">PRIVATE WORKSPACE</span></div><div class="step-symbol" aria-hidden="true">↗</div><h2>${e(next.title)}</h2><p>${e(next.body)}</p>${actionHtml}</section>
  <section class="proof-guide"><div class="side-kicker">YOUR PROOF PATH <span>${proofSteps.filter(p=>p.done).length}/4 COMPLETE</span></div><h3>From discovery to evidence</h3><ol class="proof-step-list">${proofSteps.map((step,i)=>`<li class="${step.done?'complete':''}"><span class="proof-step-marker">${step.done?'✓':String(i+1).padStart(2,'0')}</span><div><strong>${e(step.name)}</strong><small>${e(step.detail)}</small></div></li>`).join('')}</ol><small class="proof-disclaimer">Progress reflects recorded evidence, not a simulated achievement.</small></section>
  <section class="activity-panel dashboard-activity"><div class="panel-top"><span>ACTIVITY / ACTUAL TEST RUNS</span><span>RECENT</span></div><h3>Latest observations</h3>${recent.length?recent.map(r=>{const c=cases.find(x=>x.id===r.caseId);return `<button class="activity-item" data-case="${e(r.caseId)}"><span class="activity-state ${r.passed?'good-ink':'bad-ink'}">${r.passed?'✓':'×'}</span><span><strong>${e(c?.title||'Archived case')}</strong><small>${r.passed?'Check passed':'Check failed'} · ${dt(r.createdAt)}</small></span><span>↗</span></button>`;}).join(''):`<p class="subtle-empty">Your test history will appear here after the first recorded check.</p>`}<button class="text-link" data-view="cases">See the evidence ledger ↗</button></section>
  <section class="network-note"><span class="network-indicator" aria-hidden="true">◎</span><div><strong>BASE SEPOLIA</strong><p>Proof anchors and rewards use testnet transactions, not mainnet funds.</p><a href="https://sepolia.basescan.org" target="_blank" rel="noopener noreferrer">Explore verified transactions ↗</a></div></section>
 </aside></div>
 <div class="footnote">SECURITY / OWNERSHIP-VERIFIED TARGETS ONLY <span>∗</span> VERIFY RESULTS BEFORE PUBLISHING OR PAYING REWARDS.</div>`;
}
function caseRow(c){const {runs}=state.data;const last=[...runs].reverse().find(r=>r.caseId===c.id);return `<button class="case-item" data-case="${e(c.id)}"><span class="case-mark">${c.kind==='sandbox'?'◇':'⌘'}</span><span class="case-title"><strong>${e(c.title)}</strong><small>${e(c.kind==='sandbox'?'Built-in sandbox':state.data.projects.find(p=>p.id===c.projectId)?.domain||'Verified property')} · ${dt(c.createdAt)}</small></span>${statusTag(c.status)}<span class="case-time">${last?`${dt(last.createdAt)}`:'NOT TESTED'}</span><span class="case-chevron">↗</span></button>`;}
function casesPage(){const cases=state.data.cases;const active=cases.find(c=>c.id===state.selected);return `<div class="page-head"><div class="eyebrow">02 / INCIDENT REGISTER</div><h1>Repair cases<span class="accent-dot">.</span></h1><p>Every case is immutable once its test criteria are recorded. Proof means rerunning those same assertions after a real change.</p><div class="head-actions"><button class="primary" data-action="new-case">Create case ↗</button><button class="ghost" data-action="quick-start-case">Use sample target ↗</button></div></div>${!cases.length?`<div class="blank-record"><div class="blank-symbol">V / Ø</div><h2>The register is empty.</h2><p>Open a case to begin a real evidence trail.</p></div>`:`<div class="cases-layout"><section class="case-list"><div class="ledger-head">CASE REGISTER <span>${cases.length} RECORDS</span></div>${cases.map(c=>`<button class="ledger-item ${active?.id===c.id?'selected':''}" data-case="${e(c.id)}"><span class="ledger-index">${c.kind==='sandbox'?'LAB':'WEB'}</span><strong>${e(c.title)}</strong>${statusTag(c.status)}<small>${dt(c.createdAt)}</small></button>`).join('')}</section><section class="case-detail">${active?detail(active):`<div class="no-selection"><div>⌗</div><h3>Select a case to view its evidence</h3><p>Checks, Claude analysis, reports and Base reward settlement live here.</p></div>`}</section></div>`}`;}
function detail(c){const {runs,analyses,payouts,anchors,projects}=state.data;const history=runs.filter(r=>r.caseId===c.id).reverse();const last=history[0];const analysesFor=analyses.filter(a=>a.caseId===c.id);const payout=payouts.find(p=>p.caseId===c.id);const anchor=anchors.find(a=>a.caseId===c.id);const domain=projects.find(p=>p.id===c.projectId)?.domain;const recentFailure=history.find(r=>!r.passed);const currentSuccess=history[0]?.passed?history[0]:null;
 return `<div class="detail-eyebrow">CASE FILE <span>${e(c.id.slice(-8).toUpperCase())}</span></div><div class="detail-title-row"><h2>${e(c.title)}</h2>${statusTag(c.status)}</div><p class="detail-description">${e(c.description)}</p><div class="detail-meta"><span>PROPERTY <strong>${e(domain||'INTERNAL SANDBOX')}</strong></span><span>ROUTE <strong>${e(c.path)}</strong></span></div>
 ${c.status==='verified'&&recentFailure&&currentSuccess?`<div class="proof-delta"><div><small>BEFORE / FAILURE</small><strong class="bad-ink">${e(recentFailure.observation?.status||'FAILED')} <span>✕</span></strong><p>${e(recentFailure.id)}</p></div><div class="delta-bridge">→</div><div><small>AFTER / RECHECK</small><strong class="good-ink">${e(currentSuccess.observation?.status||'PASSED')} <span>✓</span></strong><p>${e(currentSuccess.id)}</p></div><div class="delta-verdict">REPAIR VERIFIED<br><span>SAME TEST. NEW OUTCOME.</span></div></div>`:''}
 <div class="detail-section"><div class="detail-label">TEST / ACCEPTANCE CRITERIA</div><div class="criteria"><span>HTTP ${c.expectedStatus}</span>${c.expectedText?`<span>BODY INCLUDES: ${e(c.expectedText)}</span>`:''}</div><p class="steps">${e(c.steps)}</p><button class="primary" data-action="run" data-id="${e(c.id)}">Run the exact check <span>↗</span></button>${c.kind==='sandbox'?`<button class="tiny-under" data-view="overview">Fault controls are on Overview ↗</button>`:''}</div>
 <div class="detail-section"><div class="detail-label">OBSERVATIONS / ${history.length} RUNS</div>${history.length?history.map((r,i)=>`<div class="run-item"><span class="run-mark ${r.passed?'run-success':'run-fail'}">${r.passed?'✓':'×'}</span><div class="run-body"><strong>${r.passed?'All recorded criteria passed':'Verification did not pass'}</strong><small>${dt(r.createdAt)} · ${e(r.observation?.url||'Internal test')}</small>${r.error?`<p class="error-inline">${e(r.error)}</p>`:''}${r.checks?.map(x=>`<p class="test-line"><span>${x.pass?'✓':'×'}</span> ${e(x.label)} <small> | ${e(x.detail)}</small></p>`).join('')||''}</div></div>`).join(''):`<p class="quiet">No evidence captured yet. Run this case to record the first observation.</p>`}</div>
 <div class="detail-section"><div class="detail-label">AI / CLAUDE EVIDENCE ANALYST</div><p class="microcopy">Claude explains observed facts and possible repairs. It never marks tests as passed or changes code by itself.</p><button class="small-button" data-action="analyze" data-id="${e(c.id)}">Analyze current evidence ✳</button>${analysesFor.length?`<div class="ai-note"><div class="ai-title">✳ CLAUDE NOTE <span>${dt(analysesFor[0].createdAt)} · ${e(analysesFor[0].model)}</span></div><div>${e(analysesFor[0].text)}</div></div>`:''}</div>
 <div class="detail-section"><div class="detail-label">BASE / PROOF FINGERPRINT</div><p class="microcopy">Anchor the SHA-256 fingerprint of your failing check and successful rerun in a zero-value Base Sepolia transaction to your own address. This costs testnet gas and gives the evidence an onchain timestamp.</p>${anchor?`<div class="payout-receipt"><strong>✓ PROOF ANCHORED TO BASE</strong><div>SHA-256: ${e(anchor.digest)}</div><a href="${e(anchor.explorer)}" target="_blank" rel="noopener">Inspect onchain fingerprint ↗</a></div>`:`<button class="small-button" data-action="anchor" data-id="${e(c.id)}" ${c.status!=='verified'?'disabled title="A failed check followed by a passing one is required"':''}>${c.status==='verified'?'Anchor evidence on Base ↗':'Awaiting verified repair'}</button><button class="tiny-under" data-action="verify-anchor-existing" data-id="${e(c.id)}">Confirm a previously submitted anchor ↗</button>`}</div>
 <div class="detail-section"><div class="detail-label">BASE / VERIFIED REWARD</div><p class="microcopy">Only Base Sepolia test ETH. Payouts are direct wallet transfers after a failed-to-passing proof sequence; this MVP does not escrow funds.</p>${payout?`<div class="payout-receipt"><strong>✓ PAYMENT VERIFIED ONCHAIN</strong><div>${e(payout.amountEth)} TEST ETH → ${e(payout.to)}</div><a target="_blank" rel="noopener noreferrer" href="${e(payout.explorer)}">View Base transaction ↗</a></div>`:c.reward?`<div class="reward-card"><div>OFFERED REWARD <strong>${e(c.reward.amountEth)} TEST ETH</strong></div><div>TO <strong>${e(c.reward.to)}</strong></div></div><button class="small-button" data-action="pay" data-id="${e(c.id)}" ${c.status!=='verified'?'disabled title="A failed run followed by a passing run is required"':''}>${c.status==='verified'?'Send real testnet reward ↗':'Awaiting verified repair'}</button><button class="tiny-under" data-action="verify-existing" data-id="${e(c.id)}">Verify an existing transaction hash ↗</button>`:`<button class="small-button" data-action="configure-reward" data-id="${e(c.id)}">Specify testnet reward ↗</button>`}</div>
 <div class="detail-section detail-actions"><button class="line-button" data-action="export" data-id="${e(c.id)}">↓ Export JSON</button><button class="line-button" data-action="share" data-id="${e(c.id)}">↗ Share evidence link</button>${payout?'':`<button class="line-button danger" data-action="delete" data-id="${e(c.id)}">Delete case</button>`}</div>`;
}
function domainsPage(){const items=state.data.projects;return `<div class="page-head"><div class="eyebrow">03 / AUTHORIZED PROPERTIES</div><h1>Verified domains<span class="accent-dot">.</span></h1><p>VERRIFT refuses external checks until the website owner publishes a DNS TXT record or HTTPS proof file. No arbitrary target scanning.</p><div class="head-actions"><button class="primary" data-action="add-domain">Register property ↗</button></div></div><div class="domain-body">${items.length?items.map(p=>`<article class="domain-item"><div class="domain-icon">◎</div><div class="domain-main"><h3>${e(p.domain)}</h3><small>REGISTERED ${dt(p.createdAt)} · ${e(p.id)}</small><div class="proof-instructions"><strong>VERIFY WITH DNS</strong><code>_verrift-challenge.${e(p.domain)} TXT "verrift=${e(p.verificationToken)}"</code><strong>OR HTTPS FILE</strong><code>https://${e(p.domain)}/.well-known/verrift/${e(p.verificationToken)}.txt</code><small>File contents must equal: ${e(p.verificationToken)}</small></div></div><div class="domain-right">${p.verifiedAt?statusTag('verified'):`<button class="small-button" data-action="verify-domain" data-id="${e(p.id)}">Check proof ↗</button>`}</div></article>`).join(''):`<div class="blank-record"><div class="blank-symbol">◎ / Ø</div><h2>No external properties registered.</h2><p>Register a real public domain you control, or create a case against the controlled test target.</p></div>`}</div><div class="safety-note"><strong>AN AUTHORIZATION BOUNDARY, NOT A PENETRATION TEST.</strong><p>Checks are limited to same-domain, public HTTPS GET requests, with pinned DNS resolution, short timeouts and response size limits. They do not brute force, exploit or crawl.</p></div>`;}
function openDialog(title,html){$('#dialog-title').textContent=title;$('#dialog-body').innerHTML=html;$('#dialog').showModal();}
function closeDialog(){$('#dialog').close();}
const field=(label,name,extra='')=>`<label class="field">${label}<input name="${name}" ${extra}></label>`;
function newCase(){const projects=state.data.projects.filter(p=>p.verifiedAt);openDialog('New repair case',`<p class="dialog-note">Set fixed acceptance criteria. Every future run uses the same test.</p><form data-form="new-case"><label class="field">TEST TARGET<select name="projectId"><option value="sandbox">Built-in controlled sandbox</option>${projects.map(p=>`<option value="${e(p.id)}">${e(p.domain)}</option>`).join('')}</select></label>${field('CASE TITLE','title','required maxlength="100" placeholder="Checkout returns an error"') }<label class="field">WHAT IS BROKEN?<textarea name="description" required maxlength="700" placeholder="Describe the observed failure…"></textarea></label><label class="field">REPRODUCTION STEPS<textarea name="steps" required maxlength="900" placeholder="1. Open route… 2. Run check…"></textarea></label>${field('REQUEST PATH','path','value="/" maxlength="240" placeholder="/checkout"')}${field('EXPECTED HTTP STATUS','expectedStatus','type="number" min="100" max="599" value="200" required')}${field('EXPECTED RESPONSE TEXT (OPTIONAL)','expectedText','maxlength="120" placeholder="CHECKOUT_READY"')}<button class="primary wide" type="submit">Create evidence case ↗</button></form>`);}
function addDomain(){openDialog('Register a domain',`<p class="dialog-note">Only add a website you control or are authorized to test. A public HTTPS domain is required.</p><form data-form="new-domain">${field('PUBLIC WEBSITE DOMAIN','domain','required placeholder="yourproject.com"') }<button class="primary wide">Issue ownership challenge ↗</button></form>`);}
function configureReward(id){openDialog('Specify repair reward',`<p class="dialog-note">A Base Sepolia testnet transfer only. No escrow and no real-value assets in this MVP. The transaction is irreversible once signed.</p><form data-form="reward" data-id="${e(id)}">${field('DEVELOPER WALLET (0x…)','to','required pattern="0x[a-fA-F0-9]{40}" placeholder="0x…"')}${field('TEST ETH AMOUNT','amountEth','required placeholder="0.0001" value="0.0001"')}<button class="primary wide">Set testnet reward ↗</button></form>`);}
async function signIn(choice) {
 const address=await connectWallet(choice);
 state.wallet=address;
 const issued=await api(`/api/auth/challenge?address=${encodeURIComponent(address)}`);
 const signature=await signInMessage(issued.message);
 const verified=await post('/api/auth/verify',{message:issued.message,signature});
 state.actor=verified.actor;state.selected=null;state.view='overview';
 const operatorStatus=await api('/api/status');$('#admin-link').hidden=!operatorStatus.isAdmin;
 if($('#wallet-picker').open)$('#wallet-picker').close();
 await refresh();walletRender();flash('Wallet verified. Welcome to VERRIFT!');
  openDialog('Your Base identity is ready',`<div class="passport-congrats"><span class="passport-congrats-icon">✓</span><h3>Congratulations. Your wallet is verified.</h3><p>VERRIFT checked ownership by signature. Your Base activity is now on your dashboard, and you can choose to generate a receipt or share the moment with X.</p><div class="passport-congrats-actions"><button class="primary" type="button" data-action="open-passport">Explore my wallet ↗</button><button type="button" class="small-button" data-action="share-wallet-x">Share to X ↗</button></div></div>`);
 watchWalletChanges(handleWalletChange);
}
async function showWalletPicker() {
 const dialog=$('#wallet-picker');const options=$('#wallet-options');const error=$('#wallet-picker-error');
 if(!dialog.open)dialog.showModal();error.hidden=true;error.textContent='';
 options.innerHTML='<p class="wallet-searching">Finding wallets available in this browser...</p>';
 $('#wallet-picker-close').focus();
 try{
  walletChoices=await availableWallets();
  options.innerHTML=walletChoices.length?walletChoices.map((w,i)=>`<button type="button" class="wallet-option" data-wallet-choice="${i}"><span class="wallet-option-icon">${e((w.name||'W').trim().slice(0,1).toUpperCase())}</span><span><strong>${e(w.name)}</strong><small>Detected in your browser</small></span><span class="wallet-option-arrow">↗</span></button>`).join(''):`<div class="wallet-not-found"><strong>No wallet detected in this browser</strong><p>Install a supported EVM wallet, or open VERRIFT inside your wallet's in-app browser on mobile.</p><div class="wallet-install-links"><a href="https://metamask.io/download/" target="_blank" rel="noopener noreferrer">MetaMask ↗</a><a href="https://www.coinbase.com/wallet" target="_blank" rel="noopener noreferrer">Coinbase Wallet ↗</a><a href="https://rabby.io/" target="_blank" rel="noopener noreferrer">Rabby ↗</a></div></div>`;
 }catch(err){error.textContent=err.message;error.hidden=false;options.textContent='Unable to discover installed wallets.';}
}
function requireAccount(){if(state.actor.role!=='user'){void showWalletPicker();throw new Error('Connect a wallet to manage your repair cases.');}}
async function setWallet(){
 requireAccount();const next=await currentWallet(state.actor.wallet);
 if(!next){await showWalletPicker();throw Error('Choose the same wallet as your connected account.');}
 state.wallet=next;walletRender();
}
function walletRender(){const b=$('#wallet-button');b.innerHTML=state.actor.role==='user'?`${state.wallet?`${e(trimWallet(state.actor.wallet))} <span>✓</span>`:'Reconnect wallet <span>↗</span>'}`:'Connect wallet <span>↗</span>';b.title=state.actor.wallet||'Connect your wallet';$('#logout').hidden=state.actor.role!=='user';}
async function handleWalletChange(){
 if(state.actor.role==='user'){
  const current=await currentWallet(state.actor.wallet).catch(()=>null);
  if(!current||current.toLowerCase()!==state.actor.wallet.toLowerCase()){
   await post('/api/logout').catch(()=>{});
   state.actor={role:'guest',wallet:null};state.wallet=null;state.selected=null;state.data=null;
   $('#admin-link').hidden=true;renderPublicHome();walletRender();flash('Wallet changed. Reconnect your wallet to continue.','bad');
  }
 }
}
async function perform(action,id,node){
 if(action==='open-passport'){closeDialog();menu('overview');return;}
 if(action==='wallet-refresh'){state.insightsAt=0;await refresh();flash(state.insightsError||'Latest Base data loaded',state.insightsError?'bad':'ok');return;}
 if(action==='copy-wallet'){await navigator.clipboard.writeText(state.actor.wallet);flash('Wallet address copied');return;}
 if(action==='share-wallet-x'){
  const proof=state.passport?.confirmedAt?` I anchored my VERRIFT receipt on Base Sepolia: ${state.passport.explorer}`:'';
  const text=`My Base wallet is verified on VERRIFT. Exploring my onchain activity with a receipt I can independently check.${proof}\n\nExplore VERRIFT: https://verrift.vercel.app/`;
  window.open('https://twitter.com/intent/tweet?text='+encodeURIComponent(text),'_blank','noopener,noreferrer');return;
 }
 if(action==='passport-generate'){
  requireAccount();if(!state.passport)state.passport=(await post('/api/wallet/passport')).passport;
  const p=state.passport;const verified=Boolean(p.confirmedAt);
  openDialog('VERRIFT Wallet Passport',`<div class="passport-receipt"><div class="passport-receipt-brand">V / VERRIFT <span>BASE WALLET PASSPORT</span></div><h3>${verified?'Proof confirmed.':'Snapshot created.'}</h3><p>Your wallet was authenticated by signature. The recorded Base Mainnet snapshot is hashed so that an optional Base Sepolia transaction can reference it without publishing your balances.</p><div class="passport-receipt-meta"><span>WALLET</span><b>${e(trimWallet(p.wallet))}</b><span>ISSUED</span><b>${e(p.createdAt.slice(0,10))}</b><span>FINGERPRINT</span><code>${e(p.digest.slice(0,19))}…</code><span>CHAIN PROOF</span><b>${verified?'Confirmed on Base Sepolia':'Not anchored'}</b></div>${verified?`<a target="_blank" rel="noopener noreferrer" href="${e(p.explorer)}">View confirmed proof ↗</a>`:`<button type="button" class="primary wide" data-action="passport-anchor">Anchor on Base Sepolia ↗</button><button type="button" class="small-button" data-action="passport-verify-existing">Already sent a transaction? Verify its hash ↗</button>`}<div class="passport-receipt-actions"><button data-action="download-wallet-card" type="button">Download branded card</button><button data-action="download-wallet-json" type="button">Export proof JSON</button><button data-action="share-wallet-x" type="button">Share to X ↗</button></div><p class="passport-receipt-warning">This proves wallet control and a dated snapshot, not financial identity or safety. Anchoring is optional and costs testnet gas.</p></div>`);return;
 }
 if(action==='passport-anchor'){
  requireAccount();if(!state.passport||state.passport.confirmedAt)throw Error('Generate an unanchored receipt first');
  if(!state.wallet)await setWallet();
  if(!confirm('Anchor your wallet snapshot fingerprint to Base Sepolia? A zero-value transaction to yourself uses testnet gas. No financial details are published.'))return;
  const tx=await anchorEvidence({from:state.wallet,digest:state.passport.digest});state.pendingPassport=tx;
  openDialog('Wallet proof submitted',`<p class="dialog-note">Your zero-value testnet transaction has been submitted. Confirm it after it is mined. Do not submit another proof while waiting.</p><div class="tx-hash">${e(tx)}</div><a class="small-link" target="_blank" rel="noopener noreferrer" href="${EXPLORER+e(tx)}">See transaction on Base Sepolia ↗</a><button class="primary wide" type="button" data-action="passport-confirm">Confirm this proof ↗</button>`);return;
 }
 if(action==='passport-verify-existing'){
  requireAccount();if(!state.passport||state.passport.confirmedAt)throw Error('No unconfirmed wallet passport exists');
  openDialog('Verify a previous wallet proof',`<p class="dialog-note">Paste the Base Sepolia transaction hash from your wallet. VERRIFT verifies that it is your own zero-value self-transaction containing the exact passport digest.</p><form data-form="passport-verify-existing"><label for="passport-proof-hash">TRANSACTION HASH</label><input id="passport-proof-hash" name="hash" placeholder="0x..." required pattern="0x[0-9a-fA-F]{64}"><button class="primary wide" type="submit">Verify Base receipt ↗</button></form>`);return;
 }
 if(action==='passport-confirm'){
  requireAccount();if(!state.pendingPassport)throw Error('No pending wallet proof this session. Find the transaction hash in your wallet and try again.');
  const p=await post('/api/wallet/confirm',{hash:state.pendingPassport});state.passport=p.passport;state.pendingPassport=null;closeDialog();await refresh();flash('Your wallet proof is confirmed on Base Sepolia!');return;
 }
 if(action==='download-wallet-json'){
  if(!state.passport)throw Error('Create a receipt first');
  const p=state.passport;const receipt={protocol:p.protocol,wallet:p.wallet,chainId:p.chainId,balanceEth:p.balanceEth,outgoingNonce:p.outgoingNonce,inspectedAt:p.inspectedAt,digest:p.digest,createdAt:p.createdAt,anchor:p.txHash?{network:'Base Sepolia',transaction:p.txHash,blockNumber:p.blockNumber,explorer:p.explorer}:null};
  const blob=new Blob([JSON.stringify(receipt,null,2)],{type:'application/json'});const a=document.createElement('a');const url=URL.createObjectURL(blob);a.href=url;a.download='verrift-wallet-passport.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),600);flash('Wallet receipt exported');return;
 }
 if(action==='download-wallet-card'){
  const p=state.passport;if(!p)throw Error('Create a receipt first');
  const canvas=document.createElement('canvas');canvas.width=1200;canvas.height=630;
  const c=canvas.getContext('2d');c.fillStyle='#133d35';c.fillRect(0,0,1200,630);c.fillStyle='#b6efcf';c.fillRect(80,86,64,64);
  c.fillStyle='#143d34';c.font='bold 52px Georgia';c.fillText('V',95,135);c.fillStyle='#fff';c.font='bold 34px Arial';c.fillText('VERRIFT  /  BASE PASSPORT',176,128);
  c.font='68px Georgia';c.fillText('Your wallet. Your proof.',80,300);c.fillStyle='#c1e4d1';c.font='29px Arial';c.fillText(`Wallet: ${trimWallet(p.wallet)}`,80,390);c.fillText(p.confirmedAt?'BASE SEPOLIA / ANCHORED':'SIGNED WALLET / SNAPSHOT ISSUED',80,448);
  c.font='22px monospace';c.fillText(p.digest.slice(0,42)+'…',80,533);
  const a=document.createElement('a');a.download='verrift-wallet-passport.png';a.href=canvas.toDataURL('image/png');a.click();flash('Branded wallet passport downloaded');return;
 }
 if(action==='connect-wallet')return showWalletPicker();if(action==='new-case'){requireAccount();return newCase();}if(action==='add-domain'){requireAccount();return addDomain();}
 if(action==='quick-start-case'){requireAccount();
  const existing=state.data.cases.find(c=>c.kind==='sandbox');
  if(existing){state.selected=existing.id;menu('cases');return flash('Opened your controlled test case');}
  const result=await post('/api/cases',{kind:'sandbox',title:'Sample service recovery',description:'The controlled test service must return an HTTP 200 and a SERVICE_READY result.',steps:'Introduce a fault using the lab control, run the check, restore the service, then rerun the exact same check.',expectedStatus:200,expectedText:'SERVICE_READY'});
  state.selected=result.case.id;await refresh();menu('cases');flash('Case created. Introduce a fault on Overview, then record a failing check.');return;
 }
 if(action==='verify-domain'){requireAccount();await post(`/api/projects/${id}/verify`);await refresh();flash('Domain ownership verified');return;}
 if(action==='set-sandbox'){requireAccount();await post('/api/sandbox',{broken:node.dataset.broken==='true'});await refresh();return flash(node.dataset.broken==='true'?'Fault introduced. Run your test now.':'Sample service restored. Rerun the same test.');}
 if(action==='run'){requireAccount();const data=await post(`/api/cases/${id}/run`);await refresh();flash(data.run.passed?'Check passed and evidence saved':'Check failed; evidence captured',data.run.passed?'ok':'bad');return;}
 if(action==='analyze'){requireAccount();const data=await post(`/api/cases/${id}/analyze`);await refresh();flash(`Claude analysis recorded (${data.analysis.model})`);return;}
 if(action==='anchor'){requireAccount();
  if(!state.wallet)await setWallet();const {digest}=await api(`/api/cases/${id}/proof`);
  if(!confirm(`Anchor evidence digest ${digest} on Base Sepolia?\n\nThis sends a zero-value transaction to your own address. It uses testnet gas and records a public fingerprint.`))return;
  const tx=await anchorEvidence({from:state.wallet,digest});state.pendingAnchor={caseId:id,hash:tx,from:state.wallet};
  openDialog('Anchor sent to Base',`<p class="dialog-note">Your wallet submitted the transaction. When mined, confirm its receipt below. Do not submit a second anchor while waiting.</p><div class="tx-hash">${e(tx)}</div><a class="small-link" href="${EXPLORER+e(tx)}" target="_blank" rel="noopener">Inspect pending transaction ↗</a><button class="primary wide" data-action="confirm-anchor-pending">Confirm proof anchor ↗</button>`);return;
 }
 if(action==='confirm-anchor-pending'){requireAccount();if(!state.pendingAnchor)throw new Error('No pending proof anchor');const {caseId,hash,from}=state.pendingAnchor;await post(`/api/cases/${caseId}/anchor`,{hash,from});state.pendingAnchor=null;closeDialog();await refresh();flash('Proof anchored and verified on Base');return;}
 if(action==='verify-anchor-existing'){requireAccount();openDialog('Confirm an existing proof anchor',`<p class="dialog-note">Use the original self-transaction hash and its sender wallet. VERRIFT checks the embedded evidence digest on Base Sepolia.</p><form data-form="verify-anchor-existing" data-id="${e(id)}">${field('TRANSACTION HASH','hash','required placeholder="0x…"')}${field('SENDER WALLET','from','required placeholder="0x…"')}<button class="primary wide">Verify proof fingerprint ↗</button></form>`);return;}
 if(action==='configure-reward'){requireAccount();return configureReward(id);}
 if(action==='share'){requireAccount();const result=await post(`/api/cases/${id}/share`);const link=location.origin+result.pageUrl;openDialog('Share the evidence',`<p class="dialog-note">Anyone with this bearer link can read this case's observations. It does not give write access.</p><div class="copy-row"><input readonly value="${e(link)}" aria-label="Shareable report URL"><button class="small-button" data-action="copy-link" data-value="${e(link)}">Copy ↗</button></div>`);return;}
 if(action==='copy-link'){await navigator.clipboard.writeText(node.dataset.value);flash('Report link copied');return;}
 if(action==='export'){const result=await api(`/api/export/${id}`);const blob=new Blob([JSON.stringify(result,null,2)],{type:'application/json'});const u=URL.createObjectURL(blob);const a=document.createElement('a');a.href=u;a.download=`verrift-${id}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(u),500);flash('Case evidence exported');return;}
 if(action==='delete'){if(!confirm('Delete this unpaid case and its observations? This cannot be undone.'))return;await post(`/api/cases/${id}/delete`);state.selected=null;await refresh();flash('Case removed');return;}
 if(action==='pay'){requireAccount();const c=state.data.cases.find(x=>x.id===id);if(!c||c.status!=='verified'||!c.reward)throw new Error('This reward is not eligible');if(!state.wallet)await setWallet();
  if(!confirm(`Send ${c.reward.amountEth} BASE SEPOLIA TEST ETH to ${c.reward.to}?\n\nThere is no escrow, undo, or mainnet value. Confirm separately in your wallet.`))return;
  const tx=await sendEth({from:state.wallet,to:c.reward.to,amountEth:c.reward.amountEth});state.pending={caseId:id,hash:tx,from:state.wallet};
  flash('Wallet transaction submitted. Confirm it below when mined.');openDialog('Confirm the onchain transfer',`<p class="dialog-note">Transaction sent. Do not pay again if verification is delayed. You can retry with the same hash.</p><div class="tx-hash">${e(tx)}</div><a href="${EXPLORER+e(tx)}" rel="noopener" target="_blank" class="small-link">Inspect on Base Sepolia ↗</a><button class="primary wide" data-action="confirm-pending">Verify confirmed transaction ↗</button>`);return;
 }
 if(action==='confirm-pending'){requireAccount();if(!state.pending)throw new Error('No pending transaction in this session');await post(`/api/cases/${state.pending.caseId}/confirm-payment`,{hash:state.pending.hash,from:state.pending.from});state.pending=null;closeDialog();await refresh();flash('Onchain reward verified and recorded');return;}
 if(action==='verify-existing'){requireAccount();openDialog('Verify an existing transfer',`<p class="dialog-note">Use the same wallet address that sent the transaction. VERRIFT verifies the transaction directly from Base Sepolia, including sender, recipient and exact amount.</p><form data-form="verify-existing" data-id="${e(id)}">${field('TRANSACTION HASH','hash','required placeholder="0x…"')}${field('SENDER WALLET','from','required placeholder="0x…"')}<button class="primary wide" type="submit">Verify onchain receipt ↗</button></form>`);return;}
}
document.addEventListener('click',async event=>{
 const nav=event.target.closest('[data-view]');if(nav){menu(nav.dataset.view);return;}
 const caseButton=event.target.closest('[data-case]');if(caseButton){state.selected=caseButton.dataset.case;menu('cases');return;}
 const button=event.target.closest('[data-action]');if(!button)return;
 try{button.disabled=true;await perform(button.dataset.action,button.dataset.id,button);}catch(error){flash(error.message,'bad');}finally{button.disabled=false;}
});
document.addEventListener('submit',async event=>{

 const form=event.target.closest('[data-form]');if(!form)return;event.preventDefault();const b=form.querySelector('button[type=submit],button:not([type])');if(b)b.disabled=true;
 const input=Object.fromEntries(new FormData(form));
 try{
  if(form.dataset.form==='passport-verify-existing'){
   const result=await post('/api/wallet/confirm',{hash:input.hash});state.passport=result.passport;state.pendingPassport=null;closeDialog();await refresh();flash('Your Base proof was verified!');
  }
  if(form.dataset.form==='new-case'){const result=await post('/api/cases',{kind:input.projectId==='sandbox'?'sandbox':'external',...input});state.selected=result.case.id;closeDialog();await refresh();menu('cases');flash('Case opened with locked test criteria');}
  if(form.dataset.form==='new-domain'){await post('/api/projects',input);closeDialog();await refresh();menu('domains');flash('Ownership challenge issued');}
  if(form.dataset.form==='reward'){await post(`/api/cases/${form.dataset.id}/reward`,input);closeDialog();await refresh();flash('Testnet reward configured');}
  if(form.dataset.form==='verify-anchor-existing'){await post(`/api/cases/${form.dataset.id}/anchor`,input);closeDialog();await refresh();flash('Evidence anchor verified');}
  if(form.dataset.form==='verify-existing'){await post(`/api/cases/${form.dataset.id}/confirm-payment`,input);closeDialog();await refresh();flash('Base receipt verified');}
 }catch(err){flash(err.message,'bad');}finally{if(b)b.disabled=false;}
});
$('#wallet-button').addEventListener('click',async()=>{
 try {if(state.actor.role==='user'&&state.wallet)flash('Wallet connected: '+trimWallet(state.actor.wallet));else await showWalletPicker();}
 catch(err){flash(err.message,'bad');}
});
$('#wallet-picker-close').addEventListener('click',()=>$('#wallet-picker').close());
$('#wallet-options').addEventListener('click',async event=>{
 const item=event.target.closest('[data-wallet-choice]');if(!item)return;
 const choice=walletChoices[Number(item.dataset.walletChoice)];if(!choice)return;
 const message=$('#wallet-picker-error');message.hidden=true;message.textContent='';
 item.disabled=true;item.classList.add('is-connecting');
 try {
  if(state.actor.role==='user'){
   const address=await connectWallet(choice);
   if(address.toLowerCase()!==state.actor.wallet.toLowerCase())throw Error('Select the wallet linked to this account, or disconnect first.');
   state.wallet=address;walletRender();$('#wallet-picker').close();flash('Wallet ready.');
  }else await signIn(choice);
 }catch(err){message.textContent=err.message;message.hidden=false;}
 finally{item.disabled=false;item.classList.remove('is-connecting');}
});
$('#logout').addEventListener('click',async()=>{
 try{await post('/api/logout');state.actor={role:'guest',wallet:null};state.wallet=null;state.selected=null;state.data=null;$('#admin-link').hidden=true;renderPublicHome();walletRender();flash('Disconnected. Your evidence is saved to your account.');}
 catch(err){flash(err.message,'bad');}
});
$('#dialog-close').addEventListener('click',closeDialog);
$('#dialog').addEventListener('click',event=>{if(event.target===$('#dialog'))closeDialog();});
async function boot(){
 renderPublicHome();walletRender();
 try{
  const status=await api('/api/status');state.aiEnabled=status.aiEnabled;state.actor=status.actor||{role:'guest',wallet:null};
  state.wallet=state.actor.role==='user'?await currentWallet(state.actor.wallet):null;
  walletRender();$('#admin-link').hidden=!status.isAdmin;
  if(state.actor.role==='user')await refresh();else renderPublicHome();
  if(state.actor.role==='user')watchWalletChanges(handleWalletChange);
 }catch(err){renderPublicHome(err.message);}
}
boot();
