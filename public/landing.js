document.documentElement.classList.add('js-motion');
const $=(selector)=>document.querySelector(selector);
const $$=(selector)=>[...document.querySelectorAll(selector)];
const progress=$('#scroll-progress');
const stage=$('#stage-plate');
const reduce=matchMedia('(prefers-reduced-motion: reduce)');
let ticking=false;
function updateScroll(){
  const available=Math.max(1,document.documentElement.scrollHeight-innerHeight);
  progress.style.transform=`scaleX(${Math.min(1,Math.max(0,scrollY/available))})`;
  document.body.classList.toggle('has-scrolled',scrollY>24);
  ticking=false;
}
addEventListener('scroll',()=>{if(!ticking){requestAnimationFrame(updateScroll);ticking=true;}},{passive:true});
updateScroll();
if('IntersectionObserver' in window){
  const observer=new IntersectionObserver(entries=>{
    entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('is-revealed');observer.unobserve(entry.target);}});
  },{threshold:0.12,rootMargin:'0px 0px -30px 0px'});
  $$('.reveal').forEach(element=>observer.observe(element));
}else{$$('.reveal').forEach(element=>element.classList.add('is-revealed'));}
const phases=[
  {value:'503',label:'FAILURE OBSERVED',description:'The expected HTTP 200 returned 503. The run is preserved as a failed observation.',caption:'HTTP 503 / ASSERTION FAILED',pill:'EVIDENCE / FAILED',chart:'M0 47L65 47L95 47L130 104L195 104L260 104L330 104L390 104L500 104',kind:'failed'},
  {value:'200',label:'RECHECK PASSED',description:'After the repair, the original assertion returns HTTP 200. A later pass completes the fail-to-pass evidence sequence.',caption:'HTTP 200 / ASSERTION PASSED',pill:'EVIDENCE / VERIFIED',chart:'M0 104L65 104L95 104L130 104L195 104L250 58L305 36L390 36L500 36',kind:'passing'},
  {value:'0x',label:'PROOF FINGERPRINT',description:'The verified sequence is hashed. A connected user can anchor that fingerprint through an actual Base Sepolia wallet transaction.',caption:'BASE SEPOLIA / TRANSACTION VERIFICATION',pill:'ONCHAIN / OPTIONAL',chart:'M0 93L65 93L118 69L171 69L224 46L286 46L359 27L419 27L500 27',kind:'anchored'}
];
function selectPhase(index){
  const phase=phases[index];
  if(!phase)return;
  $$('.step-button').forEach((button,i)=>{const active=i===index;button.classList.toggle('is-active',active);button.setAttribute('aria-pressed',String(active));});
  const display=$('#case-display');display.dataset.kind=phase.kind;
  $('#case-index').textContent=`0${index+1} / 03`;
  $('#case-state').innerHTML=phase.value+'<span>/</span>';
  $('#case-label').textContent=phase.label;
  $('#case-description').textContent=phase.description;
  $('#graph-y').textContent=phase.caption;
  $('#case-pill').textContent=phase.pill;
  $('#chart-path').setAttribute('d',phase.chart);
}
$$('.step-button').forEach(button=>button.addEventListener('click',()=>selectPhase(Number(button.dataset.phase))));
selectPhase(0);
if(stage&&!reduce.matches&&matchMedia('(pointer:fine)').matches){
  let frame=0;
  stage.addEventListener('pointermove',event=>{
    const rect=stage.getBoundingClientRect();
    const x=(event.clientX-rect.left)/rect.width-.5;
    const y=(event.clientY-rect.top)/rect.height-.5;
    cancelAnimationFrame(frame);
    frame=requestAnimationFrame(()=>{stage.style.setProperty('--lean-x',`${-y*2.3}deg`);stage.style.setProperty('--lean-y',`${x*2.3}deg`);});
  });
  stage.addEventListener('pointerleave',()=>{stage.style.setProperty('--lean-x','0deg');stage.style.setProperty('--lean-y','0deg');});
}
