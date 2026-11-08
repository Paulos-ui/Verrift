const form=document.querySelector('#v8-public-form');
const area=document.querySelector('#v8-public-results');
if(form&&area){
 form.addEventListener('submit',async ev=>{
  ev.preventDefault();const address=String(new FormData(form).get('address')||'').trim();
  if(!/^0x[\da-f]{40}$/i.test(address)){area.textContent='Enter a 42-character 0x wallet address.';return;}
  const button=form.querySelector('button');button.disabled=true;area.replaceChildren();
  const status=document.createElement('p');status.textContent='Reading public Base Mainnet data…';area.append(status);
  try{
   const res=await fetch('/api/public/scan?address='+encodeURIComponent(address),{headers:{accept:'application/json'}});
   const data=await res.json();if(!res.ok)throw Error(data.error||'Unable to read this address right now.');
   area.replaceChildren();
   const grid=document.createElement('div');grid.className='v8-result-grid';
   const fields=[['WALLET',data.wallet.slice(0,9)+'…'+data.wallet.slice(-6)],['BASE ETH',data.balanceEth+' ETH'],['OUTGOING NONCE',String(data.outgoingNonce)],['$VIBES',data.vibes?data.vibes.balance+' VIBES':'Unavailable']];
   for(const [label,value] of fields){const item=document.createElement('div');const k=document.createElement('small');k.textContent=label;const v=document.createElement('strong');v.textContent=value;item.append(k,v);grid.append(item);}
   area.append(grid);
   const note=document.createElement('p');note.className='v8-output-note';note.textContent='Source: Base Mainnet RPC, chain 8453. This is a public-address preview, not ownership or safety verification.';area.append(note);
   const link=document.createElement('a');link.href='https://basescan.org/address/'+data.wallet;link.target='_blank';link.rel='noopener noreferrer';link.textContent='View source on BaseScan ↗';area.append(link);
  }catch(err){status.textContent=err.message;}
  finally{button.disabled=false;}
 });
}
