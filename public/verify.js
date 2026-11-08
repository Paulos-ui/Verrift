const form=document.getElementById('v8-verify-form');const outcome=document.getElementById('v8-verify-outcome');
const params=new URLSearchParams(location.search);
for(const name of ['hash','owner','token','spender']){if(form?.elements[name]&&params.has(name))form.elements[name].value=params.get(name).slice(0,80);}
async function check(){const values=Object.fromEntries(new FormData(form));const button=form.querySelector('button');button.disabled=true;outcome.replaceChildren();const note=document.createElement('p');note.textContent='Checking confirmed transaction and current ERC-20 allowance…';outcome.append(note);
 try{const response=await fetch('/api/verify/revocation?'+new URLSearchParams(values),{headers:{accept:'application/json'}});const data=await response.json();if(!response.ok)throw Error(data.error||'Cannot verify this transaction right now.');if(!data.verified)throw Error('Not verified');
  outcome.replaceChildren();const title=document.createElement('h3');title.textContent='Confirmed on Base Mainnet';const detail=document.createElement('p');detail.textContent='Transaction included in block '+data.proof.blockNumber+'. The transaction matched this wallet, token and spender, and the current ERC-20 allowance returned zero.';
  const link=document.createElement('a');link.href=data.proof.explorer;link.textContent='Inspect transaction on BaseScan ↗';link.target='_blank';link.rel='noopener noreferrer';outcome.append(title,detail,link);
 }catch(error){note.textContent='Not verified: '+error.message;}
 finally{button.disabled=false;}}
form?.addEventListener('submit',ev=>{ev.preventDefault();if(form.reportValidity())check();});
if(['hash','owner','token','spender'].every(n=>params.has(n)))check();
