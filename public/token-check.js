const query=(selector)=>document.querySelector(selector);
const tokenTab=query('#v10-tab-token'),receiptTab=query('#v10-tab-receipt');
const tokenPanel=query('#v10-token-panel'),receiptPanel=query('#v10-receipt-panel');
const form=query('#v10-token-form'),outcome=query('#v10-token-outcome');
const ADDRESS=/^0x[a-f0-9]{40}$/i;
function element(tag,text,className){const el=document.createElement(tag);if(text!==undefined)el.textContent=text;if(className)el.className=className;return el;}
function link(text,href){const a=element('a',text);a.href=href;a.rel='noopener noreferrer';a.target='_blank';return a;}
function selectTab(tab,update=true){const receipt=tab==='receipt';tokenTab.setAttribute('aria-selected',String(!receipt));receiptTab.setAttribute('aria-selected',String(receipt));tokenPanel.hidden=receipt;receiptPanel.hidden=!receipt;if(update)history.replaceState(null,'',location.pathname+location.search+(receipt?'#receipt':'#token'));}
tokenTab?.addEventListener('click',()=>selectTab('token'));receiptTab?.addEventListener('click',()=>selectTab('receipt'));
if(new URLSearchParams(location.search).has('hash')||location.hash==='#receipt')selectTab('receipt',false);
if(new URLSearchParams(location.search).has('address')){
 const v=new URLSearchParams(location.search).get('address');if(ADDRESS.test(v)){form.elements.address.value=v;selectTab('token',false);}
}
async function inspect(){
 const address=form.elements.address.value.trim();if(!ADDRESS.test(address)){form.reportValidity();return;}
 const button=form.querySelector('button');button.disabled=true;outcome.replaceChildren(element('p','Checking independent risk and liquidity sources. No wallet action required...'));
 try{
  const response=await fetch('/api/token/check?'+new URLSearchParams({address}),{headers:{accept:'application/json'}});
  const body=await response.json();if(!response.ok)throw Error(body.error||`HTTP ${response.status}`);
  const report=body.report;outcome.replaceChildren();
  outcome.append(element('span','ONCHAIN RESEARCH / BASE 8453','v10-kicker'),element('h4',report.label,`v10-verdict ${report.status}`));
  outcome.append(element('p',`Checked ${new Date(report.checkedAt).toLocaleString()}. Findings are not a buy recommendation.`));
  const summary=element('div',undefined,'v10-report-metrics');
  const metrics=[['Sell simulation',report.saleSimulation?.completed?(report.saleSimulation?.flaggedHoneypot===true?'Honeypot flag':report.saleSimulation?.flaggedHoneypot===false?'No honeypot detected':'No conclusive flag'):'Unavailable'],['Largest pool liquidity',report.market?.topPool?.liquidityUsd==null?'Unavailable':new Intl.NumberFormat(undefined,{style:'currency',currency:'USD',maximumFractionDigits:0}).format(report.market.topPool.liquidityUsd)],['Source code',report.contract?.sourceVerified===true?'Reported open source':report.contract?.sourceVerified===false?'Not verified':'Unknown']];
  for(const [label,value] of metrics){const item=element('div');item.append(element('small',label),element('strong',value));summary.append(item);}outcome.append(summary);
  const list=element('div',undefined,'v10-signal-list');
  if(!report.signals.length)list.append(element('p','No specific flags returned by the available providers. This does NOT prove the token is safe.'));
  for(const signal of report.signals){const item=element('article',undefined,`v10-signal ${signal.severity}`);item.append(element('strong',signal.label),element('p',signal.detail),element('small',signal.source+' · '+signal.severity.toUpperCase()));list.append(item);}outcome.append(list);
  const sources=element('div',undefined,'v10-sources');sources.append(element('strong','SOURCE COVERAGE'));
  for(const source of report.sources)sources.append(element('span',`${source.name}: ${source.status}`));outcome.append(sources);
  outcome.append(element('p',report.coverage,'v10-disclaimer'),element('p',report.disclaimer,'v10-disclaimer'));
  const actions=element('div',undefined,'v10-token-links');actions.append(link('BaseScan ↗','https://basescan.org/token/'+address),link('DEX Screener ↗','https://dexscreener.com/base/'+address));
  const copy=element('button','Copy report link','v10-copy');copy.type='button';copy.addEventListener('click',async()=>{const share=new URL('/verify',location.origin);share.searchParams.set('address',address);share.hash='token';try{await navigator.clipboard.writeText(share.href);copy.textContent='Link copied ✓';}catch{copy.textContent='Copy unavailable';}});actions.append(copy);outcome.append(actions);
 }catch(error){outcome.replaceChildren(element('p','Unable to inspect: '+error.message,'v10-error'));}
 finally{button.disabled=false;}
}
form?.addEventListener('submit',e=>{e.preventDefault();if(form.reportValidity())inspect();});
if(ADDRESS.test(form?.elements.address.value||''))inspect();
