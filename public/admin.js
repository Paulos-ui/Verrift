const region=document.querySelector('#admin-stats');
const e=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
(async()=>{try{
 const r=await fetch('/api/admin/summary',{credentials:'same-origin',cache:'no-store'});
 const data=await r.json();if(!r.ok)throw Error(data.error||'Operator access denied');
 region.innerHTML=Object.entries(data).map(([name,count])=>`<div class="metric"><div class="metric-label">${e(name.toUpperCase())}</div><div class="metric-value">${Number(count)}</div></div>`).join('');
}catch(error){region.innerHTML=`<p class="fatal">${e(error.message)}. Connect your configured operator wallet on the main site.</p>`;}})();
