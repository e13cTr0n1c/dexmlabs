/* Shared utilities for VECTOR and ORBIT. No framework or network dependency. */
export const clamp = (n,a,b) => Math.max(a,Math.min(b,n));
export const wrap = (n,m=360) => ((n % m) + m) % m;
export const angleDiff = (a,b) => wrap(a-b+180)-180;
export function rng(seed) {
  let h=2166136261;
  for (const c of String(seed)) h=Math.imul(h ^ c.charCodeAt(0),16777619);
  return () => {h=(h+0x6D2B79F5)|0;let t=h;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};
}
export const utcDay = () => new Date().toISOString().slice(0,10);
export const clock = seconds => {seconds=Math.max(0,Math.floor(seconds));return `${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`;};
export const fmt = n => Math.round(n).toLocaleString('en-GB');
export const $ = id => document.getElementById(id);
export function readStore(key,fallback) {try {const s=JSON.parse(localStorage.getItem(key));return s&&typeof s==='object'&&!Array.isArray(s)?s:fallback;}catch{return fallback;}}
export function writeStore(key,value) {try {localStorage.setItem(key,JSON.stringify(value));return true;}catch{return false;}}
export function storageAvailable() {try {const key='dexm:flight-storage-test';localStorage.setItem(key,'1');localStorage.removeItem(key);return true;}catch{return false;}}
export function newSeed(game) {const a=new Uint32Array(2);try{crypto.getRandomValues(a);}catch{a[0]=Date.now();a[1]=Math.random()*4294967296;}return `${game}:${a[0]}:${a[1]}`;}
export function setupCanvas(canvas) {
  const ctx=canvas.getContext('2d',{alpha:false});
  if (!ctx) throw new Error('A Canvas 2D display is required.');
  const view={ctx,width:1,height:1,dpr:1};
  function resize(){const r=canvas.getBoundingClientRect();view.width=Math.max(1,r.width);view.height=Math.max(1,r.height);view.dpr=Math.min(window.devicePixelRatio||1,2);canvas.width=Math.round(view.width*view.dpr);canvas.height=Math.round(view.height*view.dpr);ctx.setTransform(view.dpr,0,0,view.dpr,0,0);}
  const observer=new ResizeObserver(resize);observer.observe(canvas);resize();return view;
}
export function fixedLoop(update,draw,isActive) {
  let previous=0,acc=0;
  function frame(now){let dt=previous?Math.min((now-previous)/1000,.15):0;previous=now;if(isActive()){acc+=dt;while(acc>=1/30){update(1/30);acc-=1/30;if(!isActive()){acc=0;break;}}}else acc=0;draw(now/1000);requestAnimationFrame(frame);}
  requestAnimationFrame(frame);
}
class AudioBeeper {
  constructor(enabled){this.enabled=enabled;this.ctx=null;}
  unlock(){if(!this.enabled)return;try{this.ctx ||= new (window.AudioContext||window.webkitAudioContext)();this.ctx.resume().catch(()=>{});}catch{}}
  beep(kind='select'){if(!this.enabled||!this.ctx||this.ctx.state!=='running')return;try{const c=this.ctx,o=c.createOscillator(),g=c.createGain(),t=c.currentTime;o.type='sine';o.frequency.setValueAtTime(kind==='warn'?230:kind==='good'?830:520,t);o.frequency.exponentialRampToValueAtTime(kind==='good'?1250:340,t+.12);g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.05,t+.012);g.gain.exponentialRampToValueAtTime(.0001,t+.14);o.connect(g);g.connect(c.destination);o.start(t);o.stop(t+.15);}catch{}}
}
/** The same run, pause, help, records and rewards contract for both games. */
export class FlightShell {
  constructor({game,title,countName,threshold,onStart,onStopInput}) {
    Object.assign(this,{game,title,countName,threshold,onStart,onStopInput});
    this.settings=readStore(`${game}:settings`,{});this.mode=['endless','daily','sandbox'].includes(this.settings.mode)?this.settings.mode:'endless';
    this.running=false;this.paused=false;this.ended=false;this.awarded=false;this.rewardText='';this.day=utcDay();
    this.audio=new AudioBeeper(this.settings.sound===true);this.stats=readStore(`${game}:stats`,{});
    if(!storageAvailable())$('storage-warning').hidden=false;
    document.querySelectorAll('[name=mode]').forEach(r=>{r.checked=r.value===this.mode;r.addEventListener('change',()=>{this.mode=r.value;this.saveSettings();this.describeMode();});});
    $('start-run').addEventListener('click',()=>this.start());
    $('pause-run').addEventListener('click',()=>this.pause(!this.paused));
    $('resume-run').addEventListener('click',()=>this.pause(false));
    $('new-run').addEventListener('click',()=>this.newRun());
    $('play-again').addEventListener('click',()=>this.start());
    $('change-mode').addEventListener('click',()=>this.lobby());
    $('share-run').addEventListener('click',()=>this.share());
    $('sound-toggle').addEventListener('click',()=>{this.audio.enabled=!this.audio.enabled;this.audio.unlock();this.saveSettings();this.soundLabel();this.audio.beep();});
    document.querySelectorAll('[data-help]').forEach(b=>b.addEventListener('click',()=>this.openDialog($('help-dialog'))));
    document.querySelectorAll('[data-close-dialog]').forEach(b=>b.addEventListener('click',()=>b.closest('dialog').close()));
    document.querySelectorAll('dialog').forEach(d=>d.addEventListener('close',()=>{if(this.dialogResume&&this.running&&!this.ended)this.pause(false);this.dialogResume=false;}));
    $('confirm-new').addEventListener('click',()=>{this.dialogResume=false;$('restart-dialog').close();this.lobby();});
    $('fullscreen-toggle').hidden=!document.documentElement.requestFullscreen||!document.fullscreenEnabled;
    $('fullscreen-toggle').addEventListener('click',()=>{const task=document.fullscreenElement?document.exitFullscreen():document.documentElement.requestFullscreen();Promise.resolve(task).catch(()=>this.toast('Fullscreen is not available in this browser.'));});
    document.addEventListener('visibilitychange',()=>{if(document.hidden)this.pause(true);});
    window.addEventListener('blur',()=>this.pause(true));
    document.addEventListener('keydown',e=>{if(e.target.matches('input,textarea,select')||document.querySelector('dialog[open]'))return;if(e.code==='KeyP'&&!e.repeat){e.preventDefault();this.pause(!this.paused);}if(e.code==='Escape'&&this.running&&!this.paused){e.preventDefault();this.pause(true);}});
    this.soundLabel();this.describeMode();this.lobby();
  }
  active(){return this.running&&!this.paused&&!this.ended;}
  saveSettings(){this.settings.mode=this.mode;this.settings.sound=this.audio.enabled;writeStore(`${this.game}:settings`,this.settings);}
  soundLabel(){$('sound-toggle').textContent=this.audio.enabled?'Sound on':'Sound off';$('sound-toggle').setAttribute('aria-pressed',String(this.audio.enabled));}
  describeMode(){const desc={endless:'A fresh run every time. Keep going until the mission fails.',daily:'One shared seed for today. A five-minute shift. Resets at 00:00 UTC.',sandbox:this.game==='orbit'?'Unlimited fuel and resets. Learn the manoeuvres without a score.':'Add your own traffic. No strike limit and no points.'};$('mode-description').textContent=desc[this.mode];this.showBest();}
  start(){this.day=utcDay();this.running=true;this.paused=false;this.ended=false;this.awarded=false;this.rewardText='';this.audio.unlock();this.saveSettings();$('lobby').hidden=true;$('pause-overlay').hidden=true;$('result-overlay').hidden=true;$('share-text').hidden=true;$('pause-run').disabled=false;$('pause-run').textContent='Pause [P]';$('flight-controls').inert=false;this.seed=this.mode==='daily'?`${this.game}:daily:v1:${this.day}`:newSeed(this.game);$('instrument-mode').textContent=this.mode==='daily'?`DAILY / ${this.day}`:this.mode.toUpperCase();this.onStart({seed:this.seed,mode:this.mode});this.showBest();$('scope').focus({preventScroll:true});if(matchMedia('(max-width: 760px)').matches)document.querySelector('.scorebar').scrollIntoView({block:'start'});}
  lobby(){this.onStopInput?.();this.running=false;this.paused=false;this.ended=false;$('lobby').hidden=false;$('pause-overlay').hidden=true;$('result-overlay').hidden=true;$('flight-controls').inert=true;$('pause-run').disabled=true;$('instrument-mode').textContent='STANDBY';this.describeMode();$('start-run').focus({preventScroll:true});}
  pause(value){this.onStopInput?.();if(!this.running||this.ended)return;this.paused=value;$('pause-overlay').hidden=!value;$('pause-run').textContent=value?'Resume [P]':'Pause [P]';$('flight-controls').inert=value;if(value)$('resume-run').focus({preventScroll:true});else $('scope').focus({preventScroll:true});}
  openDialog(dialog){this.dialogResume=this.active();this.pause(true);dialog.showModal();}
  newRun(){if(this.running&&!this.ended){this.openDialog($('restart-dialog'));}else this.lobby();}
  toast(text){$('toast').textContent=text;}
  best(){const s=this.stats[this.mode];if(this.mode==='daily'&&s?.date!==((this.running||this.ended)?this.day:utcDay()))return 0;return Number.isFinite(s?.score)&&s.score>0?Math.floor(s.score):0;}
  showBest(){$('metric-best').textContent=fmt(this.best());}
  milestone(count){if(this.mode!=='endless'||this.awarded||count<this.threshold)return;this.awarded=true;const result=window.DexmPoints?.earnPractice(this.game,this.day);if(result?.ok){this.rewardText='+20 DEXM points';this.toast(`${this.threshold} ${this.countName}. +20 DEXM points added.`);}else if(result?.reason==='limit')this.rewardText='Daily endless points limit reached.';}
  finish({score,count,seconds,reason,complete=false}){if(this.ended)return;this.onStopInput?.();this.ended=true;this.running=false;this.paused=false;$('pause-overlay').hidden=true;$('flight-controls').inert=true;$('pause-run').disabled=true;
    if(this.mode!=='sandbox'){const old=this.best();const plays=Number.isSafeInteger(this.stats.plays)&&this.stats.plays>=0?this.stats.plays:0;this.stats.plays=plays+1;this.stats[this.mode]={score:Math.max(old,Math.round(score)),date:this.day};if(!writeStore(`${this.game}:stats`,this.stats))$('storage-warning').hidden=false;}
    if(this.mode==='daily'&&complete&&count>=this.threshold){const r=window.DexmPoints?.earn(this.game,window.DexmPoints?.EARN?.[this.game]||100,`${this.game}:daily:${this.day}`);this.rewardText=r?.ok?'+100 DEXM points':r?.reason==='duplicate'?'Today\'s DEXM points have already been awarded.':'';}
    $('result-title').textContent=reason;$('result-score').textContent=fmt(score);$('result-detail').textContent=`${count} ${this.countName} in ${clock(seconds)}. ${this.mode==='sandbox'?'Sandbox is not scored.':this.rewardText||'Personal bests are saved in this browser.'}`;$('result-overlay').hidden=false;this.summary=`${this.title} / ${this.mode==='daily'?this.day:this.mode==='sandbox'?'Sandbox':'Endless'}\n${fmt(score)} score | ${count} ${this.countName} | ${clock(seconds)}\nhttps://dexmlabs.app/${this.game}/`;this.showBest();$('result-title').focus({preventScroll:true});}
  async share(){try{if(!navigator.clipboard?.writeText)throw new Error();await navigator.clipboard.writeText(this.summary);$('share-run').textContent='Copied';setTimeout(()=>{$('share-run').textContent='Copy result';},1800);}catch{$('share-text').value=this.summary;$('share-text').hidden=false;$('share-text').focus();$('share-text').select();this.toast('Copy the selected result text.');}}
}
