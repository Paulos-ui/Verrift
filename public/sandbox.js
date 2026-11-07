const title=document.querySelector('#sandbox-title');const status=document.querySelector('#sandbox-status');
fetch('/api/sandbox/widget',{cache:'no-store'}).then(async response=>{
 const body=await response.json();const broken=!response.ok;
 title.innerHTML=broken?'The sample service<br><em>is down.</em>':'The sample service<br><em>is ready.</em>';
 status.textContent=`HTTP ${response.status} / ${body.status} / VERSION ${body.version}`;status.classList.toggle('fail',broken);
}).catch(()=>{title.textContent='Unable to reach service';status.textContent='Network request failed';status.classList.add('fail');});
