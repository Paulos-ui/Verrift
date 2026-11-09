/* VERRIFT V11: public read-only Base research and dated evidence records. */
const query=selector=>document.querySelector(selector);
const tokenTab=query('#v10-tab-token'),receiptTab=query('#v10-tab-receipt');
const tokenPanel=query('#v10-token-panel'),receiptPanel=query('#v10-receipt-panel');
const form=query('#v10-token-form'),outcome=query('#v10-token-outcome');
const ADDRESS=/^0x[a-f0-9]{40}$/i;
function element(tag,text,className){const el=document.createElement(tag);if(text!==undefined)el.textContent=text;if(className)el.className=className;return el;}
function link(text,href){const a=element('a',text);a.href=href;a.rel='noopener noreferrer';a.target='_blank';return a;}
function selectTab(tab,update=true){const receipt=tab==='receipt';tokenTab.setAttribute('aria-selected',String(!receipt));receiptTab.setAttribute('aria-selected',String(receipt));tokenPanel.hidden=receipt;receiptPanel.hidden=!receipt;if(update)history.replaceState(null,'',location.pathname+location.search+(receipt?'#receipt':'#token'));}
tokenTab?.addEventListener('click',()=>selectTab('token'));receiptTab?.addEventListener('click',()=>selectTab('receipt'));
const params=new URLSearchParams(location.search);
if(params.has('hash')||location.hash==='#receipt')selectTab('receipt',false);
let currentRecord=null;
function controls(...items){const wrap=element('div',undefined,'v11-report-controls');wrap.append(...items);return wrap;}
function button(label,fn){const x=element('button',label);x.type='button';x.addEventListener('click',()=>fn(x));return x;}
function reportView(report,{record=null,comparison=null}={}){
 outcome.replaceChildren();
 outcome.append(element('span','BASE MAINNET / RESEARCH EVIDENCE','v10-kicker'),element('h4',report.label,`v10-verdict ${report.status}`));
 outcome.append(element('p',`Observed ${new Date(report.checkedAt).toLocaleString()}. This is not a recommendation to buy or sell.`));
 const summary=element('div',undefined,'v10-report-metrics');
 const usd=n=>new Intl.NumberFormat(undefined,{style:'currency',currency:'USD',maximumFractionDigits:0}).format(n);
 const metrics=[
  ['Base contract',report.onchain?.status==='contract_deployed'?'Deployed code observed':report.onchain?.status==='no_contract'?'No deployed code':'RPC status unavailable'],
  ['Sell simulation',report.saleSimulation?.completed?(report.saleSimulation?.flaggedHoneypot===true?'Sell restriction flagged':report.saleSimulation?.flaggedHoneypot===false?'No honeypot detected':'Inconclusive'):'Unavailable'],
  ['Largest pool liquidity',report.market?.topPool?.liquidityUsd==null?'Unavailable':usd(report.market.topPool.liquidityUsd)],
  ['Source verification',report.contract?.sourceVerified===true?'Reported open source':report.contract?.sourceVerified===false?'Not reported verified':'Unknown']
 ];
 for(const [name,value] of metrics){const item=element('div');item.append(element('small',name),element('strong',value));summary.append(item);}outcome.append(summary);
 const list=element('div',undefined,'v10-signal-list');
 if(!report.signals?.length)list.append(element('p','No specific flags were returned. A missing warning does not prove that a token is safe.'));
 for(const signal of report.signals||[]){const item=element('article',undefined,`v10-signal ${signal.severity}`);item.append(element('strong',signal.label),element('p',signal.detail),element('small',`${signal.source} / ${signal.severity}`));list.append(item);}outcome.append(list);
 const sources=element('div',undefined,'v10-sources');sources.append(element('strong','SOURCE COVERAGE'));
 for(const source of report.sources||[])sources.append(element('span',`${source.name}: ${source.status}`));outcome.append(sources);
 outcome.append(element('p',report.coverage,'v10-disclaimer'),element('p',report.disclaimer,'v10-disclaimer'));
 const actions=controls(link('BaseScan ↗','https://basescan.org/token/'+report.address),link('DEX Screener ↗','https://dexscreener.com/base/'+report.address),link('Check spender exposure ↗','/verify?token='+encodeURIComponent(report.address)+'#exposure'));
 const save=button(record?'Rescan and compare ↻':'Save dated evidence record ↗',async self=>{
  self.disabled=true;self.textContent='Checking and recording...';
  try{
   const response=await fetch('/api/token/scans',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({address:report.address,...(record?{compareTo:record.id}:{})})});
   const data=await response.json();if(!response.ok)throw Error(data.error||'Unable to save research');
   currentRecord=data.record;reportView(data.record.report,{record:data.record,comparison:data.comparison});
   history.replaceState(null,'','/verify?scan='+encodeURIComponent(data.record.id)+'#token');
  }catch(error){self.textContent=error.message;self.disabled=false;}
 });actions.append(save);
 if(record){
  const copy=button('Copy dated report link',async self=>{const share=location.origin+'/verify?scan='+encodeURIComponent(record.id)+'#token';try{await navigator.clipboard.writeText(share);self.textContent='Link copied';}catch{self.textContent='Copy unavailable';}});
  const download=button('Export JSON',()=>{
   const blob=new Blob([JSON.stringify({record,comparison},null,2)],{type:'application/json'});
   const url=URL.createObjectURL(blob);const a=element('a');a.href=url;a.download=`verrift-${record.id}.json`;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
  });actions.append(copy,download);
  const note=element('div',undefined,'v11-snapshot-head');
  note.append(element('strong','DATED RESEARCH RECORD'),element('p',`Record ${record.id} · ${new Date(record.createdAt).toLocaleString()}`),element('code',`SHA-256 digest of stored JSON: ${record.digest}`),element('p','The digest identifies this stored snapshot. It is not an onchain attestation, audit or guarantee. Old records may eventually be pruned.'));
  outcome.prepend(note);
 }
 outcome.append(actions);
 if(comparison){
  const comp=element('section',undefined,'v11-scan-changes');comp.append(element('h5','WHAT CHANGED SINCE THE PREVIOUS CHECK'));
  const intro=element('p',`Prior: ${comparison.beforeStatus.replaceAll('_',' ')}. Now: ${comparison.afterStatus.replaceAll('_',' ')}.`);comp.append(intro);
  const changes=[['Newly reported indicators',comparison.introduced],['No longer reported',comparison.noLongerReported]];
  for(const [name,signals] of changes){comp.append(element('strong',`${name}: ${signals.length}`));const ul=element('ul');for(const item of signals)ul.append(element('li',item.label+' ('+item.source+')'));if(signals.length)comp.append(ul);}
  if(comparison.liquidityUsdBefore!=null&&comparison.liquidityUsdAfter!=null)comp.append(element('p',`Largest reported pool: ${usd(comparison.liquidityUsdBefore)} → ${usd(comparison.liquidityUsdAfter)}.`));
  comp.append(element('p',comparison.notice));outcome.prepend(comp);
 }
}
async function requestJSON(url,options){const response=await fetch(url,options);const data=await response.json();if(!response.ok)throw Error(data.error||`HTTP ${response.status}`);return data;}
async function inspect(){
 const address=form.elements.address.value.trim();if(!ADDRESS.test(address)){form.reportValidity();return;}
 const submit=form.querySelector('button');submit.disabled=true;outcome.replaceChildren(element('p','Checking independent sources and Base Mainnet RPC...'));
 try{const body=await requestJSON('/api/token/check?'+new URLSearchParams({address}));currentRecord=null;reportView(body.report);}
 catch(error){outcome.replaceChildren(element('p','Unable to inspect: '+error.message,'v10-error'));}
 finally{submit.disabled=false;}
}
form?.addEventListener('submit',e=>{e.preventDefault();if(form.reportValidity())inspect();});
async function loadSaved(id){
 outcome.replaceChildren(element('p','Loading dated evidence record...'));
 try{const body=await requestJSON('/api/token/scans/'+encodeURIComponent(id));currentRecord=body.record;form.elements.address.value=body.record.address;selectTab('token',false);reportView(body.record.report,{record:body.record});}
 catch(error){outcome.replaceChildren(element('p','Unable to load record: '+error.message,'v10-error'));}
}
if(params.has('scan'))loadSaved(params.get('scan'));
else if(params.has('address')){const address=params.get('address');if(ADDRESS.test(address)){form.elements.address.value=address;selectTab('token',false);inspect();}}
