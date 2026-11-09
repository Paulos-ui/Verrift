// Real public research, no wallet connection. Only browser-generated DOM text nodes.
const form=document.querySelector('#v11-landing-form');const result=document.querySelector('#v11-landing-result');
const valid=a=>/^0x[a-f0-9]{40}$/i.test(a);
function el(tag,text){const x=document.createElement(tag);x.textContent=text;return x;}
form?.addEventListener('submit',async event=>{
 event.preventDefault();const address=form.elements.address.value.trim();if(!valid(address)){form.reportValidity();return;}
 const button=form.querySelector('button');button.disabled=true;result.replaceChildren(el('p','Contacting Base and independent token research sources...'));
 try{
  const response=await fetch('/api/token/check?'+new URLSearchParams({address}),{headers:{accept:'application/json'}});
  const data=await response.json();if(!response.ok)throw Error(data.error||'Research unavailable');
  const report=data.report;result.replaceChildren();const badge=el('small','OBSERVED / '+new Date(report.checkedAt).toLocaleString());
  const heading=el('h3',report.label);heading.className=report.status;result.append(badge,heading);
  const chips=document.createElement('div');chips.className='v11-report-chips';
  chips.append(el('span',report.onchain?.status==='contract_deployed'?'Contract deployed':report.onchain?.status==='no_contract'?'No contract code':'RPC evidence unavailable'));
  for(const source of report.sources)chips.append(el('span',source.name+': '+source.status));result.append(chips);
  const summary=el('p',report.signals.length?`${report.signals.length} provider-reported indicators for review. Scan results are not a safety certificate.`:'No specific risk indicators returned. This does not prove the token is safe.');result.append(summary);
  const links=document.createElement('div');links.className='v11-report-controls';const full=document.createElement('a');
  full.href='/verify?'+new URLSearchParams({address})+'#token';full.textContent='Inspect full evidence ↗';links.append(full);result.append(links);
 }catch(error){result.replaceChildren(el('p','Research unavailable: '+error.message));}
 finally{button.disabled=false;}
});

// Canonical Base USDC contract published by Circle. The example invokes a live scan;
// it never inserts precomputed or fake findings.
document.querySelector('#v11-example-contract')?.addEventListener('click',()=>{
 form.elements.address.value='0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
 form.requestSubmit();
});
