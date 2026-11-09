import {availableWallets,connectWallet,currentWallet,walletBalance,sendEth,anchorEvidence,signInMessage,watchWalletChanges,sendERC20Revoke,executeVibesSwap,EXPLORER} from './wallet.js';
const $=s=>document.querySelector(s);
const state={view:'overview',data:null,selected:null,wallet:null,actor:{role:'guest',wallet:null},aiEnabled:false,pending:null,focus:null,insights:null,insightsAt:0,insightsError:null,passport:null,pendingPassport:null,vibes:null,profile:null,safety:null,selectedAllowance:null,pendingRevoke:null,explanation:null,swapQuote:null,pendingSwap:null,swapEnabled:false};
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
 const [data,insights,passport,profile,vibes]=await Promise.allSettled([api('/api/data'),shouldRead?api('/api/wallet/insights'):Promise.resolve({insights:state.insights}),api('/api/wallet/passport'),api('/api/profile'),api('/api/wallet/vibes')]);
 if(data.status!=='fulfilled')throw data.reason;
 state.data=data.value;
 if(insights.status==='fulfilled'){state.insights=insights.value.insights;state.insightsAt=Date.now();state.insightsError=null;}
 else state.insightsError=insights.reason.message;
 if(passport.status==='fulfilled')state.passport=passport.value.passport;
 if(profile.status==='fulfilled')state.profile=profile.value;
 if(vibes.status==='fulfilled')state.vibes=vibes.value.vibes;else state.vibes=null;
 render();
}
function menu(view){if(state.actor.role!=='user'){renderPublicHome();showWalletPicker();return;}state.view=view;document.querySelectorAll('[data-view]').forEach(button=>{button.classList.toggle('active',button.dataset.view===view)});$('#crumb-view').textContent=view.toUpperCase();render();}
function render(){if(!state.data)return;$('#crumb-view').textContent=state.view.toUpperCase();$('#case-counter').textContent=state.data.cases.length;const content=$('#content');if(state.view==='overview')content.innerHTML=walletPassportView();if(state.view==='cases')content.innerHTML=casesPage();if(state.view==='domains')content.innerHTML=domainsPage();if(state.view==='safety')content.innerHTML=safetyDesk();if(state.view==='profile')content.innerHTML=profilePage();if(state.view==='swap')content.innerHTML=swapPage();}
function renderPublicHome(error='') {
 const content=$('#content');
 $('#case-counter').textContent='';
 $('#crumb-view').textContent='HOME';
 content.innerHTML=`<div class="welcome-gateway"><div class="gateway-topline"><span>WELCOME TO VERRIFT</span><span>01 / 04 · YOUR WORKSPACE</span></div>
  <div class="gateway-grid"><div class="gateway-copy"><p class="eyebrow">BASE MAINNET / PERMISSION INTELLIGENCE</p><h1>Your wallet.<br><em>Your story.</em></h1><p>Connect a wallet to understand Base token permissions, manage unwanted access, check VIBES holdings, and track your daily check-ins. Every real onchain action is yours to approve.</p><button class="gateway-connect" type="button" data-action="connect-wallet">Connect wallet <span>↗</span></button><div class="gateway-footnote"><span class="gateway-signal"></span> NO PASSWORD REQUIRED · SIGNATURE-BASED ACCESS</div></div>
   <div class="gateway-visual" aria-label="How proof-of-fix works"><div class="gateway-visual-top">THE EVIDENCE FLOW <span>V / 001</span></div><div class="gateway-visual-steps"><div><span>01</span><strong>CAPTURE</strong><small>Record the failed check</small></div><div class="gateway-path">↓</div><div><span>02</span><strong>VERIFY</strong><small>Rerun unchanged criteria</small></div><div class="gateway-path">↓</div><div><span>03</span><strong>PROVE</strong><small>Preserve a Base receipt</small></div></div><div class="gateway-visual-bottom">BASE MAINNET · USER-APPROVED ACTIONS</div></div></div>
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
 const p=state.profile?.profile||{};const checked=p.lastClaimDate===new Date().toISOString().slice(0,10);
 const holder=Boolean(state.vibes?.holder);
 const streakRibbon=`<section class="v9-daily-ribbon" aria-label="Daily streak and VIBES holdings">
  <div class="v9-ribbon-claim"><div><span class="v9-micro">DAILY CHECK-IN · UTC</span><strong>${Number(p.streak)||0} <small>day streak</small></strong><p>${Number(p.points)||0} VERRIFT Points earned. Seven-day milestones give bonus points. ${holder?'Verified $VIBES holding earns a +5 point bonus.':'All wallets can check in for free.'}</p></div><button class="v9-claim-btn" type="button" data-action="daily-checkin" ${checked?'disabled':''}>${checked?'✓ Claimed today':'Claim daily points ↗'}</button></div>
  <div class="v9-ribbon-token"><div><span class="v9-micro">YOUR $VIBES · BASE MAINNET</span><strong>${state.vibes?e(state.vibes.balance):'Unavailable'} <small>VIBES</small></strong><p>${holder?'Holder verified directly on Base.':'No holdings detected or token read unavailable.'}</p></div><button type="button" data-view="swap" class="v9-token-action">Get $VIBES ↗</button></div>
 </section>`;
 return `<div class="passport-page">${streakRibbon}
  <div class="passport-heading"><div><p class="eyebrow">VERRIFT / BASE WALLET INTELLIGENCE</p><h1>Your Base story.<br><em>Made verifiable.</em></h1><p>One connected wallet. Real Base data. A receipt you can choose to carry onchain and share.</p></div><button class="passport-refresh" data-action="wallet-refresh">↻ Refresh activity</button></div>
  <section class="passport-hero" aria-label="Wallet passport">
   <div class="passport-hero-copy"><div class="passport-meta">VERRIFT / WALLET PASSPORT <span>BASE · 8453</span></div><div class="passport-symbol">V<span>/</span></div><h2>Congratulations.<br><em>Your wallet is connected.</em></h2><p>Ownership was checked through your signed login. Explore public Base activity without granting spending permissions.</p><div class="passport-address"><span>YOUR WALLET</span><strong>${e(trimWallet(a))}</strong><button data-action="copy-wallet" type="button">Copy address ↗</button></div></div>
   <div class="passport-hero-right"><div class="passport-seal"><span>✓</span><strong>OWNERSHIP<br>VERIFIED</strong><small>By wallet signature</small></div><div class="passport-hero-actions"><button data-action="passport-generate" class="passport-primary">${state.passport?'View wallet receipt':'Generate my receipt'} <span>↗</span></button><button data-action="share-wallet-x" class="passport-secondary">Share to X <span>↗</span></button></div><small class="passport-chain-note">Base Mainnet for wallet actions and swaps. Optional legacy proof anchoring still uses Base Sepolia.</small></div>
  </section>
  <section class="v8-wallet-actions" aria-label="Actionable wallet tools"><div class="v8-wallet-action-major"><span>YOUR BASE SECURITY DESK</span><h2>Know what can move<br><em>your tokens.</em></h2><p>Inspect live ERC-20 permissions, choose whether to revoke, and verify the exact onchain outcome. No automatic transactions.</p><button type="button" data-view="safety">Inspect token permissions ↗</button></div><div class="v8-wallet-action-side"><span>VIBESTARTER / COMMUNITY</span><h3>${state.vibes?(state.vibes.holder?'$VIBES holder detected':'Your $VIBES balance'):'Token balance unavailable'}</h3><strong>${state.vibes?e(state.vibes.balance)+' VIBES':'Not verified'}</strong><p>Read from the Base token contract. VERRIFT holder perks include bonus profile points and an extended recent permission scan where supported. No real token rewards are distributed.</p><button type="button" data-view="swap">View ETH to VIBES swap ↗</button></div></section>
  <section class="passport-metrics" aria-label="Wallet activity metrics">${stats.map((v,i)=>`<div class="passport-metric"><span class="passport-metric-index">0${i+1} / ${v.title}</span><strong>${e(v.num)}</strong><small>${e(v.detail)}</small></div>`).join('')}</section>
  <div class="passport-info-note"><span>DATA PROVENANCE</span><p>${e(footnote)}</p>${x?`<a href="https://basescan.org/address/${e(a)}" target="_blank" rel="noopener noreferrer">Verify on BaseScan ↗</a>`:''}</div>
  <div class="passport-lower"><section class="passport-panel"><div class="passport-panel-header"><div><span>01 / MOVEMENT</span><h2>Recent activity</h2></div><span class="passport-count">${activity.length} DISPLAYED</span></div>${activity.length?`<div class="passport-history">${activity.map(t=>`<a href="https://basescan.org/tx/${e(t.hash)}" target="_blank" rel="noopener noreferrer" class="passport-tx"><span class="passport-dir ${t.direction==='out'?'out':'in'}">${t.direction==='out'?'↗':'↙'}</span><div><strong>${t.direction==='out'?'Sent':'Received'} ${e(money(t.valueEth))}</strong><small>${e(t.counterparty?trimWallet(t.counterparty):'Contract / creation')} · ${e(t.timestamp?.slice(0,10)||'Onchain')}</small></div><span>View ↗</span></a>`).join('')}</div>`:`<div class="passport-empty"><strong>No indexed transfers shown.</strong><p>Live balance and transaction count are available now. Add a Blockscout API key for recent counterparties and native transfer history.</p></div>`}</section>
  <section class="passport-panel"><div class="passport-panel-header"><div><span>02 / CONNECTIONS</span><h2>Repeated counterparties</h2></div></div>${cp.length?`<div class="passport-counterparties">${cp.map((item,i)=>`<a href="https://basescan.org/address/${e(item.address)}" target="_blank" rel="noopener noreferrer"><b>0${i+1}</b><span>${e(trimWallet(item.address))}</span><strong>${item.interactions} touches ↗</strong></a>`).join('')}</div>`:`<div class="passport-empty"><strong>No counterparties to rank yet.</strong><p>We'll show wallet addresses you've interacted with repeatedly once indexed history is available.</p></div>`}
  <div class="passport-proof-status"><span>03 / YOUR RECEIPT</span><h3>${verified?'Anchored on Base Sepolia':state.passport?'Receipt generated':'Make your Base footprint portable.'}</h3><p>${verified?'This proof is confirmed by an onchain transaction.':state.passport?'Your snapshot exists. Anchoring is optional and requires a testnet transaction.':'Create a fingerprint of this wallet snapshot, then choose whether to record it on testnet.'}</p><button class="passport-inline-btn" data-action="passport-generate">${state.passport?'Open receipt':'Create receipt'} ↗</button></div></section></div>
  <section class="passport-dev"><div><span>ADVANCED / FOR BUILDERS</span><h2>Need to verify an actual software repair?</h2><p>Our original evidence lab is still here for developers. It is optional, not a condition of using VERRIFT.</p></div><button data-view="cases">Open repair lab ↗</button></section>
 </div>`;
}
function safetyDesk(){
 const scan=state.safety;const chosen=state.selectedAllowance;const allow=chosen?.allowance;
 const address=state.actor.wallet||'';
 const row=item=>`<div class="v8-allow-row"><div><strong>${e(item.tokenSymbol||trimWallet(item.token))}</strong><small>Token: ${e(trimWallet(item.token))}<br>Spender: ${e(trimWallet(item.spender))}</small></div><div><b>${item.unlimited?'UNLIMITED':item.allowanceRaw==='0'?'ZERO':'ACTIVE'}</b><small>Raw units: ${e(item.allowanceRaw.slice(0,24))}${item.allowanceRaw.length>24?'…':''}</small></div><button type="button" data-action="select-approval" data-token="${e(item.token)}" data-spender="${e(item.spender)}">Inspect ↗</button></div>`;
 return `<div class="v8-page"><div class="v8-page-intro"><p class="eyebrow">VERRIFT / BASE MAINNET SAFETY DESK</p><h1>Permissions,<br><em>not promises.</em></h1><p>Every number below is read from a Base Mainnet contract. A nonzero approval is not automatically malicious. You decide whether to revoke it.</p></div>
 <div class="v8-work-grid"><section class="v8-work-card"><span class="v8-label">01 / FAST CHECK</span><h2>Check a known allowance</h2><p>Start with USDC → Permit2, or enter a token contract and spender address you recognize from a dapp or explorer.</p>
 <form data-form="check-allowance" class="v8-allow-form"><label>ERC-20 TOKEN CONTRACT<input name="token" id="v8-token" required pattern="0x[0-9a-fA-F]{40}" value="0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"></label><label>APPROVED SPENDER<input name="spender" id="v8-spender" required pattern="0x[0-9a-fA-F]{40}" value="0x000000000022D473030F116dDEE9F6B43aC78BA3"></label><button class="v8-primary" type="submit">Read live allowance ↗</button></form>
 ${allow?`<div class="v8-check-result"><span>LIVE RESULT / ${e(allow.asOf)}</span><h3>${allow.active?(allow.unlimited?'Unlimited allowance':'Active allowance'):'No remaining allowance'}</h3><p>Token ${e(trimWallet(allow.token))} · Spender ${e(trimWallet(allow.spender))}</p><code>${e(allow.allowanceRaw)} raw units</code>${state.aiEnabled?`<button class="v8-secondary" type="button" data-action="explain-allowance">Explain with Claude ↗</button>`:''}${state.explanation?`<p class="v8-ai-explain"><strong>CLAUDE / EXPLANATION</strong><br>${e(state.explanation)}</p>`:''}${allow.active?`<button class="v8-danger-action" type="button" data-action="revoke-start">Review revoke transaction ↗</button>`:'<p>No ERC-20 allowance to revoke for this pair. This is not a complete wallet safety audit.</p>'}</div>`:''}
 </section><section class="v8-work-card"><span class="v8-label">02 / DISCOVERY</span><h2>Find recently approved spenders</h2><p>Scan an explicitly limited recent Base block window for standard ERC-20 Approval events. This is a partial discovery tool, not an all-time risk guarantee.</p><button class="v8-secondary" type="button" data-action="scan-approvals">Scan recent approvals ↗</button>
 ${scan?`<div class="v8-scan-meta"><b>${scan.approvals.length} active permissions observed</b><small>Blocks ${scan.fromBlock} to ${scan.toBlock} · ${scan.unreadablePairs} unreadable pairs</small></div>${scan.approvals.length?scan.approvals.map(row).join(''):'<p class="v8-muted">No active standard allowances were found in this sample. Older or other token permissions may still exist.</p>'}<p class="v8-muted">${e(scan.note)}</p>`:'<div class="v8-explainer">The sample stays empty until you request a scan. This avoids unnecessary blockchain queries at login.</div>'}
 </section></div>
 <section class="v8-proof-list"><div><span>03 / CONFIRMATION</span><h2>Verify a previous revoke</h2><p>Already sent an approve(spender, 0) transaction? Enter its transaction hash alongside the same token and spender above.</p></div><form data-form="verify-revoke" class="v8-verify-form"><input name="hash" aria-label="Base Mainnet transaction hash" pattern="0x[0-9a-fA-F]{64}" placeholder="0x transaction hash" required><button class="v8-primary">Verify confirmed result ↗</button></form></section>
 <p class="v8-safety-footnote">VERRIFT only evaluates standard ERC-20 allowances. Permit2 internal permits, NFT operators and smart-account delegations are outside this scanner. Revocation is an onchain Base Mainnet operation requiring gas and explicit wallet approval. Some dapps may stop working until approved again.</p></div>`;
}
function swapPage(){
 const receipts=state.profile?.swaps||[];
 return `<div class="v9-swap-page"><div class="v9-swap-intro"><span>BASE MAINNET / OPTIONAL COMMUNITY UTILITY</span><h1>Get $VIBES.<br><em>On your terms.</em></h1><p>Request a real ETH to VIBES quote from 0x. Compare the guaranteed minimum, read the risk note, and approve the transaction in your own wallet. VERRIFT never takes custody.</p></div>
 <div class="v9-swap-grid"><section class="v9-swap-card"><div class="v9-block-head"><span>01 / REQUEST A LIVE QUOTE</span><span>CHAIN 8453</span></div><form data-form="vibes-quote" class="v9-quote-form"><label>YOU PAY <span>ETH · BASE</span><input type="text" name="amountEth" required inputmode="decimal" pattern="[0-9]+(\.[0-9]{1,18})?" placeholder="0.001" value="0.001" aria-label="ETH amount to swap"></label><label>MAXIMUM SLIPPAGE <span>INCLUDING PRICE MOVEMENT</span><select name="slippageBps"><option value="50">0.5%</option><option selected value="100">1.0%</option><option value="200">2.0%</option><option value="300">3.0%</option></select></label><div class="v9-pair"><span>ETH</span><span>↓</span><strong>VIBES</strong></div><button type="submit" class="v9-solid">Get a live quote ↗</button></form>
 ${!state.swapEnabled?'<p class="v9-alert" role="status">Live quotes require a server-side 0x API key. The swap will not send a transaction until the provider is configured.</p>':''}
 <p class="v9-small">Maximum launch-size swap: 0.05 ETH. Routing depends on live liquidity. This is not financial advice or an invitation to buy a token.</p></section>
 <section class="v9-swap-card v9-quote-result"><div class="v9-block-head"><span>02 / REVIEW BEFORE SIGNING</span></div>
 ${state.swapQuote?`<div class="v9-amount-out"><span>ESTIMATED OUTPUT</span><strong>${e(state.swapQuote.expectedVibes)} VIBES</strong><p>Minimum quoted: ${e(state.swapQuote.minimumVibes)} VIBES</p></div><dl><dt>Pay</dt><dd>${e(state.swapQuote.sellEth)} Base ETH</dd><dt>Max slippage</dt><dd>${Number(state.swapQuote.slippageBps)/100}%</dd><dt>Provider</dt><dd>0x Swap API v2</dd><dt>Quote valid until</dt><dd>${e(new Date(state.swapQuote.quoteExpiresAt).toLocaleTimeString())}</dd><dt>Route contract</dt><dd><code>${e(state.swapQuote.tx.to.slice(0,10))}…${e(state.swapQuote.tx.to.slice(-6))}</code></dd></dl><button class="v9-solid" type="button" data-action="vibes-swap-send">Review transaction in wallet ↗</button><p class="v9-small">Sending requires Base Mainnet ETH, network fees and explicit wallet approval. A quote can expire or fail.</p>`:
 `<div class="v9-quote-empty"><span class="v9-quote-symbol">↔</span><h2>Nothing moves without your approval.</h2><p>Request a quote to see the estimated output and minimum before your wallet is asked to sign anything.</p></div>`}</section></div>
 <section class="v9-rewards-explainer"><div><span>03 / COMMUNITY ACTIVITY</span><h2>Hold VIBES. Keep your streak.</h2><p>Your $VIBES balance is independently read on Base. Daily check-ins grant VERRIFT Points, including a holder bonus. These points are NOT real VIBES or a claim on treasury funds. No VIBES reward distribution is currently funded or enabled.</p></div><button type="button" data-view="overview">Return to your daily claim ↗</button></section>
 <section class="v9-swap-history"><h2>Your verified trades</h2>${receipts.length?receipts.map(r=>`<a href="${e(r.explorer)}" target="_blank" rel="noopener noreferrer">${e(r.spentEth)} ETH → ${e(r.receivedVibes)} VIBES <small>Block ${Number(r.blockNumber)} · Verified ↗</small></a>`).join(''):'<p>No verified VERRIFT swap receipts yet. A submitted transaction is not counted until the actual VIBES transfer is confirmed.</p>'}</section>
 <p class="v9-small">Token contract: <a href="https://basescan.org/token/0xeffc8815487084a97edfdff968b56ea123421acb" rel="noopener noreferrer" target="_blank">0xeffc…421acb ↗</a>. Thin liquidity can cause price impact and losses. Always review the wallet request.</p>
 </div>`;
}
function profilePage(){const p=state.profile?.profile||{streak:0,days:0,points:0,lastClaimDate:null};const today=new Date().toISOString().slice(0,10);const claimed=p.lastClaimDate===today;const wallet=state.actor.wallet||'';const revokes=state.profile?.revocations||[];
 return `<div class="v8-page"><div class="v8-page-intro"><p class="eyebrow">VERRIFT / YOUR ONCHAIN IDENTITY</p><h1>Show up.<br><em>Leave proof.</em></h1><p>A private profile linked to your signed wallet. Your daily activity streak is tracked by UTC dates. No gas, staking or token transfer is required.</p></div><div class="v8-profile-grid"><section class="v8-profile-main"><span class="v8-label">01 / WALLET OWNER</span><h2>${e(trimWallet(wallet))}</h2><a href="https://basescan.org/address/${e(wallet)}" rel="noopener noreferrer" target="_blank">View on BaseScan ↗</a><div class="v8-profile-badge">${state.vibes?.holder?'✳ VERIFIED VIBES HOLDER':'VIBES HOLDER BADGE: NOT ACTIVE'}</div><p>Contract <a href="https://basescan.org/token/0xeffc8815487084a97edfdff968b56ea123421acb" rel="noopener noreferrer" target="_blank">0xeffc…421acb ↗</a></p><strong>${state.vibes?e(state.vibes.balance)+' VIBES':'Balance unavailable'}</strong><p>Holder status is read from Base Mainnet and is not a partnership, endorsement or investment recommendation.</p></section>
 <section class="v8-profile-streak"><span class="v8-label">02 / DAILY PRESENCE</span><h2>${Number(p.streak)||0}<small>DAY STREAK</small></h2><div class="v8-streak-nums"><div><b>${Number(p.days)||0}</b><span>TOTAL DAYS</span></div><div><b>${Number(p.points)||0}</b><span>VERRIFT POINTS</span></div></div><p>Check in once per UTC day. Earn 10 nontransferable VERRIFT Points, 5 extra when holding $VIBES, and 7 milestone points on every seventh consecutive day (30 on day 30). Never real token rewards.</p><button class="v8-primary" type="button" data-action="daily-checkin" ${claimed?'disabled':''}>${claimed?'✓ Checked in today':'Claim today’s check-in ↗'}</button><small>${claimed?'Next check-in after 00:00 UTC.':'You may miss a day and reset the consecutive-day count; total points remain.'}</small></section></div>
 <section class="v8-proof-list"><div><span>03 / PROVEN REPAIRS</span><h2>${revokes.length} confirmed allowance revocations</h2><p>Only records with confirmed Base Mainnet transactions and a subsequently observed zero allowance appear here.</p></div><div class="v8-proof-links">${revokes.length?revokes.map(r=>`<div class="v8-proof-entry"><a href="/verify?${new URLSearchParams({hash:r.hash,owner:r.owner,token:r.token,spender:r.spender}).toString()}" target="_blank" rel="noopener noreferrer">${e(trimWallet(r.token))} → ${e(trimWallet(r.spender))} · ${e(r.confirmedAt.slice(0,10))} · Public proof ↗</a><button type="button" data-action="share-revoke" data-hash="${e(r.hash)}">Share proof on X ↗</button></div>`).join(''):'<p class="v8-muted">No confirmed revocation receipts yet.</p>'}</div></section></div>`;
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
function domainsPage(){const items=state.data.projects;return `<div class="page-head"><div class="eyebrow">03 / VERIFY YOUR SITE</div><h1>Verified domains<span class="accent-dot">.</span></h1><p>Two steps: add the domain you own, then publish one small ownership record. VERRIFT checks that the proof is real before any website tests are allowed.</p><div class="head-actions"><button class="primary" data-action="add-domain">Add my website ↗</button></div></div><div class="domain-body">${items.length?items.map(p=>`<article class="domain-item"><div class="domain-icon">◎</div><div class="domain-main"><h3>${e(p.domain)}</h3><small>REGISTERED ${dt(p.createdAt)} · ${e(p.id)}</small><div class="proof-instructions"><strong>STEP 1 / ADD A DNS TXT RECORD</strong><code>_verrift-challenge.${e(p.domain)} TXT "verrift=${e(p.verificationToken)}"</code><button type="button" class="tiny-under" data-action="copy-text" data-value="verrift=${e(p.verificationToken)}">Copy TXT value ↗</button><strong>OR USE AN HTTPS PROOF FILE</strong><code>https://${e(p.domain)}/.well-known/verrift/${e(p.verificationToken)}.txt</code><small>File contents must equal: ${e(p.verificationToken)}</small></div></div><div class="domain-right">${p.verifiedAt?statusTag('verified'):`<button class="small-button" data-action="verify-domain" data-id="${e(p.id)}">I published proof, verify ↗</button>`}</div></article>`).join(''):`<div class="blank-record"><div class="blank-symbol">◎ / Ø</div><h2>No external properties registered.</h2><p>Register a real public domain you control, or create a case against the controlled test target.</p></div>`}</div><div class="safety-note"><strong>AN AUTHORIZATION BOUNDARY, NOT A PENETRATION TEST.</strong><p>Checks are limited to same-domain, public HTTPS GET requests, with pinned DNS resolution, short timeouts and response size limits. They do not brute force, exploit or crawl.</p></div>`;}
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
 if(action==='explain-allowance'){requireAccount();if(!state.selectedAllowance)throw Error('Check a token allowance first.');const a=state.selectedAllowance;const info=await post('/api/wallet/explain',{token:a.token,spender:a.spender});state.explanation=info.explanation.text;menu('safety');return;}
 if(action==='scan-approvals'){
  requireAccount();const result=await api('/api/wallet/approvals');state.safety=result.scan;menu('safety');return flash(result.holderWindowUsed?'Extended VIBES holder sample requested. Results remain partial.':'Recent Base ERC-20 approval events inspected');
 }
 if(action==='select-approval'){
  requireAccount();const token=node.dataset.token,spender=node.dataset.spender;
  state.explanation=null;state.selectedAllowance={token,spender,allowance:(await api('/api/wallet/allowance?token='+encodeURIComponent(token)+'&spender='+encodeURIComponent(spender))).allowance};
  menu('safety');return;
 }
 if(action==='revoke-start'){
  requireAccount();const a=state.selectedAllowance?.allowance;if(!a?.active)throw Error('No active allowance selected.');
  if(!state.wallet)await setWallet();
  if(!confirm(`Revoke this specific Base Mainnet ERC-20 permission?\n\nToken: ${a.token}\nSpender: ${a.spender}\nCurrent raw allowance: ${a.allowanceRaw}\n\nYour wallet will show a REAL MAINNET transaction requiring gas. Revoking may interrupt a dapp's use of this token. VERRIFT will not record success until the transaction is mined and the remaining allowance reads zero.`))return;
  const tx=await sendERC20Revoke({owner:state.actor.wallet,token:a.token,spender:a.spender});state.pendingRevoke={hash:tx,token:a.token,spender:a.spender};
  openDialog('Base Mainnet transaction submitted',`<p>Your wallet submitted a revoke transaction, but it is NOT yet verified. Inspect the transaction before recording a completed fix.</p><p class="tx-hash">${e(tx)}</p><a href="https://basescan.org/tx/${e(tx)}" target="_blank" rel="noopener noreferrer">Inspect Base Mainnet transaction ↗</a><button type="button" class="primary wide" data-action="revoke-confirm">Verify confirmed transaction ↗</button><p>Keep this hash if confirmation takes time. You can verify it later in the Safety Desk.</p>`);return;
 }
 if(action==='revoke-confirm'){
  requireAccount();if(!state.pendingRevoke)throw Error('No pending revoke in this session. Use Verify a previous revoke in the Safety Desk.');
  const x=state.pendingRevoke;await post('/api/wallet/revoke/verify',x);state.pendingRevoke=null;state.selectedAllowance=null;state.safety=null;closeDialog();await refresh();menu('profile');flash('Confirmed: onchain revoke and zero allowance verified');return;
 }
 if(action==='share-revoke'){requireAccount();const proof=state.profile?.revocations?.find(r=>r.hash===node.dataset.hash);if(!proof)throw Error('Verified record not found');const link=location.origin+'/verify?'+new URLSearchParams({hash:proof.hash,owner:proof.owner,token:proof.token,spender:proof.spender});const text='I revoked an ERC-20 allowance on Base Mainnet. VERRIFT verified the transaction and rechecked the current allowance. Inspect the public evidence: '+link;window.open('https://x.com/intent/tweet?text='+encodeURIComponent(text),'_blank','noopener,noreferrer');return;}
 if(action==='vibes-swap-send'){
  requireAccount();if(!state.wallet)await setWallet();
  const quote=state.swapQuote;if(!quote)throw Error('Request a live quote first.');
  if(Date.now()>Date.parse(quote.quoteExpiresAt))throw Error('Quote expired. Request a new price.');
  const yes=confirm(`Base Mainnet ETH to VIBES swap\n\nPay: ${quote.sellEth} ETH + gas\nEstimated output: ${quote.expectedVibes} VIBES\nMinimum output: ${quote.minimumVibes} VIBES\nSlippage: ${quote.slippageBps/100}%\nTo contract: ${quote.tx.to}\n\nThis is a real mainnet transaction. Token prices can fall, and there is no guaranteed VIBES reward for buying.\n\nContinue to your wallet for a separate approval?`);
  if(!yes)return;
  const txHash=await executeVibesSwap({owner:state.actor.wallet,quote});state.pendingSwap={hash:txHash,quoteProof:quote.quoteProof};
  openDialog('Swap submitted, not yet verified',`<p class="dialog-note">Your wallet broadcast a real Base Mainnet transaction. Wait for confirmation. VERRIFT will verify the transaction and actual VIBES transfer before recording a trade.</p><div class="tx-hash">${e(txHash)}</div><a href="https://basescan.org/tx/${e(txHash)}" target="_blank" rel="noopener noreferrer">Inspect on BaseScan ↗</a><button type="button" class="primary wide" data-action="vibes-swap-verify">Verify confirmed VIBES transfer ↗</button>`);return;
 }
 if(action==='vibes-swap-verify'){
  requireAccount();if(!state.pendingSwap)throw Error('No pending VIBES swap in this session.');
  const result=await post('/api/wallet/swap/verify',state.pendingSwap);
  state.pendingSwap=null;state.swapQuote=null;closeDialog();await refresh();menu('swap');flash(`Confirmed: ${result.swap.receivedVibes} VIBES received on Base Mainnet.`);return;
 }
 if(action==='daily-checkin'){
  requireAccount();const result=await post('/api/profile/checkin');state.profile={...state.profile,profile:result.profile};menu('overview');flash(`Check-in recorded. ${result.profile.streak}-day streak. ${result.profile.points} VERRIFT points.`);return;
 }

 if(action==='open-passport'){closeDialog();menu('overview');return;}
 if(action==='wallet-refresh'){state.insightsAt=0;await refresh();flash(state.insightsError||'Latest Base data loaded',state.insightsError?'bad':'ok');return;}
 if(action==='copy-text'){await navigator.clipboard.writeText(node.dataset.value);flash('Verification record copied');return;}
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
  if(form.dataset.form==='vibes-quote'){
   requireAccount();state.swapQuote=null;
   const result=await post('/api/wallet/swap/quote',{amountEth:String(input.amountEth),slippageBps:Number(input.slippageBps)});
   state.swapQuote=result.quote;menu('swap');flash('Live quote received. Nothing was sent to the blockchain.');
  }
  if(form.dataset.form==='check-allowance'){
   requireAccount();state.explanation=null;state.selectedAllowance={token:input.token,spender:input.spender,allowance:(await api('/api/wallet/allowance?token='+encodeURIComponent(input.token)+'&spender='+encodeURIComponent(input.spender))).allowance};menu('safety');flash('Allowance read directly from Base Mainnet.');
  }
  if(form.dataset.form==='verify-revoke'){
   requireAccount();const token=state.selectedAllowance?.token||document.querySelector('#v8-token')?.value;const spender=state.selectedAllowance?.spender||document.querySelector('#v8-spender')?.value;
   await post('/api/wallet/revoke/verify',{token,spender,hash:input.hash});state.selectedAllowance=null;state.safety=null;await refresh();menu('profile');flash('Base Mainnet revoke and current zero allowance verified.');
  }
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
  const status=await api('/api/status');state.aiEnabled=status.aiEnabled;state.swapEnabled=Boolean(status.swapEnabled);state.actor=status.actor||{role:'guest',wallet:null};
  state.wallet=state.actor.role==='user'?await currentWallet(state.actor.wallet):null;
  walletRender();$('#admin-link').hidden=!status.isAdmin;
  if(state.actor.role==='user')await refresh();else renderPublicHome();
  if(state.actor.role==='user')watchWalletChanges(handleWalletChange);
 }catch(err){renderPublicHome(err.message);}
}
boot();
