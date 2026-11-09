/* V12: read-only, same-block exposure lens. No wallet connection, signatures or trades. */
const form=document.querySelector('#v12-exposure-form');
const result=document.querySelector('#v12-exposure-result');
const valid=/^0x[a-f\d]{40}$/i;
const el=(tag,text,cls)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;if(cls)node.className=cls;return node;};
const line=(label,value)=>{const row=el('div',undefined,'v12-exposure-line');row.append(el('span',label),el('strong',String(value)));return row;};
form?.addEventListener('submit',async event=>{
 event.preventDefault();if(!form.reportValidity())return;
 const owner=form.elements.owner.value.trim(),token=form.elements.token.value.trim(),spender=form.elements.spender.value.trim();
 if(![owner,token,spender].every(value=>valid.test(value)))return;
 const btn=form.querySelector('button[type="submit"]');btn.disabled=true;result.replaceChildren(el('p','Reading Base Mainnet at a single block...'));
 try{
  const response=await fetch('/api/token/exposure?'+new URLSearchParams({owner,token,spender}));
  const data=await response.json();if(!response.ok)throw Error(data.error||`Base returned HTTP ${response.status}`);
  const e=data.exposure;
  const title=el('h4',e.activeAllowance?'Permission observed':'No allowance for this spender');
  const block=el('p',`Base block ${e.blockNumber.toLocaleString()} · ${new Date(e.checkedAt).toLocaleString()}`,'v12-exposure-meta');
  const grid=el('div',undefined,'v12-exposure-grid');
  grid.append(
   line('Wallet balance',e.balanceFormatted===null?`${e.balanceRaw} raw units`:`${e.balanceFormatted} tokens`),
   line('Spender allowance',e.unlimitedAllowance?'Unlimited or effectively unlimited':e.allowanceFormatted===null?`${e.allowanceRaw} raw units`:`${e.allowanceFormatted} tokens`),
   line('Potentially exposed holdings',e.potentiallyExposedFormatted===null?`${e.potentiallyExposedRaw} raw units`:`${e.potentiallyExposedFormatted} tokens`),
   line('Wallet code',e.ownerCode?.kind==='eip7702'?'EIP-7702 delegation found':e.ownerCode?.kind==='contract_code'?'Contract wallet code':e.ownerCode?.kind==='no_code'?'No code observed':'Unclear')
  );
  const interpretation=el('p',e.interpretation,'v12-exposure-description');
  const detail=el('div',undefined,'v12-exposure-source');
  detail.append(el('strong','INDEPENDENT CHAIN EVIDENCE'),el('code',`Block: ${e.blockHash}`),el('code',`Token: ${e.token}`),el('code',`Spender: ${e.spender}`));
  if(e.ownerCode?.kind==='eip7702')detail.append(el('code',`EIP-7702 delegate: ${e.ownerCode.delegate}`));
  const caution=el('p',e.limits,'v12-exposure-caution');
  const action=el('a','See wallet on BaseScan ↗');action.href=e.explorer;action.target='_blank';action.rel='noopener noreferrer';
  result.replaceChildren(title,block,grid,interpretation,detail,caution,action);
 }catch(err){result.replaceChildren(el('p','Unable to check exposure: '+String(err.message||err),'v12-exposure-error'));}
 finally{btn.disabled=false;}
});
const params=new URLSearchParams(location.search);
if(params.has('token')&&valid.test(params.get('token')))form.elements.token.value=params.get('token');
if(params.has('owner')&&params.has('spender')&&params.has('token')){
 const owner=params.get('owner'),spender=params.get('spender'),token=params.get('token');
 if([owner,spender,token].every(v=>valid.test(v))){form.elements.owner.value=owner;form.elements.spender.value=spender;form.elements.token.value=token;}
}
