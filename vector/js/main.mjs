import {$,FlightShell,setupCanvas,fixedLoop,clock,fmt,clamp} from '../../assets/flight-core.mjs';
import {VectorSim,distance} from './sim.mjs';
import {drawVector,toWorld,mapView} from './draw.mjs';
const canvas=$('scope');
let view;
try{view=setupCanvas(canvas);}catch(e){$('mode-description').textContent=e.message;$('start-run').disabled=true;throw e;}
let sim=new VectorSim({seed:'vector:preview:v1'}),selected=sim.aircraft[0].id,draft=[],pointer=null,lastUI=0,lastEvent=null;
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const shell=new FlightShell({game:'vector',title:'VECTOR',countName:'aircraft cleared',threshold:5,onStart:opts=>{sim=new VectorSim(opts);selected=sim.aircraft[0].id;draft=[];pointer=null;lastEvent=null;$('sandbox-controls').hidden=opts.mode!=='sandbox';$('label-time').textContent=opts.mode==='daily'?'Time left':'Elapsed';$('heading-input').value=Math.round(sim.aircraft[0].targetHeading);shell.toast('First arrival selected. Route to gate, set 2,000 ft and 180 kt, then arm approach.');refresh();},onStopInput:()=>{draft=[];pointer=null;}});
function select(id,focus=false){if(!shell.active())return;const a=sim.aircraft.find(a=>a.id===id);if(!a)return;selected=id;$('heading-input').value=Math.round(a.targetHeading);if(focus)canvas.focus({preventScroll:true});refresh();shell.audio.beep();}
function command(type,value){if(!shell.active())return;if(sim.command(selected,type,value)){shell.audio.beep();refresh();}}
$('heading-form').addEventListener('submit',e=>{e.preventDefault();const n=$('heading-input').valueAsNumber;if(Number.isFinite(n))command('heading',n);});
document.querySelectorAll('[data-alt]').forEach(b=>b.addEventListener('click',()=>command('altitude',Number(b.dataset.alt))));
document.querySelectorAll('[data-speed]').forEach(b=>b.addEventListener('click',()=>command('speed',Number(b.dataset.speed))));
$('route-gate').addEventListener('click',()=>{command('gate');shell.toast('Route set via the eastern approach marker. Set 2,000 ft and 180 kt, then arm approach.');});
$('route-exit').addEventListener('click',()=>command('exit'));
$('approach-btn').addEventListener('click',()=>command('arm'));
$('traffic-list').addEventListener('click',e=>{const b=e.target.closest('[data-plane]');if(b)select(b.dataset.plane);});
$('add-traffic').addEventListener('click',()=>{if(!shell.active()||sim.mode!=='sandbox')return;const a=sim.addAircraft();if(a)select(a.id);else shell.toast('No safe entry slot right now. Clear some space and try again.');});
$('mobile-plane').addEventListener('change',()=>select($('mobile-plane').value));
$('mobile-alt').addEventListener('change',()=>command('altitude',Number($('mobile-alt').value)));
$('mobile-gate').addEventListener('click',()=>{const a=sim.aircraft.find(a=>a.id===selected);command(a?.exit?'exit':'gate');});
$('mobile-speed').addEventListener('click',()=>{const a=sim.aircraft.find(a=>a.id===selected);command('speed',a?.targetSpeed===180?220:180);});
$('mobile-arm').addEventListener('click',()=>command('arm'));
function xy(e){const r=canvas.getBoundingClientRect();return {x:e.clientX-r.left,y:e.clientY-r.top};}
canvas.addEventListener('pointerdown',e=>{if(!shell.active()||!e.isPrimary||e.button!==0)return;e.preventDefault();const pos=xy(e),p=toWorld(view,pos.x,pos.y),m=mapView(view),hit=sim.aircraft.map(a=>({a,d:distance(a,p)*m.scale})).sort((a,b)=>a.d-b.d)[0];const found=hit&&hit.d<26;
  if(found)select(hit.a.id,true);else canvas.focus({preventScroll:true});
  pointer={id:e.pointerId,start:pos,hit:found,drag:false};draft=[];canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointermove',e=>{if(!pointer||pointer.id!==e.pointerId||!shell.active())return;const a=sim.aircraft.find(a=>a.id===selected);if(!a||a.final||!pointer.hit)return;const pos=xy(e),world=toWorld(view,pos.x,pos.y);if(Math.hypot(pos.x-pointer.start.x,pos.y-pointer.start.y)>8)pointer.drag=true;if(pointer.drag){if(!draft.length)draft.push({x:a.x,y:a.y});const p={x:clamp(world.x,1,99),y:clamp(world.y,1,99)};if(distance(p,draft[draft.length-1])>2&&draft.length<21)draft.push(p);}});
canvas.addEventListener('pointerup',e=>{if(!pointer||pointer.id!==e.pointerId)return;const drag=pointer;pointer=null;if(shell.active()){if(drag.drag&&draft.length>1){command('route',draft.slice(1));shell.toast('Route assigned. Aircraft will follow it, then hold their final heading.');}else if(!drag.hit){const pos=xy(e),p=toWorld(view,pos.x,pos.y);if(p.x>=0&&p.x<=100&&p.y>=0&&p.y<=100)command('route',[p]);}}draft=[];if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);});
canvas.addEventListener('pointercancel',()=>{pointer=null;draft=[];});canvas.addEventListener('lostpointercapture',()=>{pointer=null;draft=[];});
canvas.addEventListener('keydown',e=>{if(!shell.active()||e.altKey||e.ctrlKey||e.metaKey)return;const a=sim.aircraft.find(a=>a.id===selected);if(!a)return;const keys=['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'];if(!keys.includes(e.key))return;e.preventDefault();if(e.key==='ArrowLeft')command('heading',a.targetHeading-15);if(e.key==='ArrowRight')command('heading',a.targetHeading+15);if(e.key==='ArrowUp')command('altitude',a.targetAlt+1000);if(e.key==='ArrowDown')command('altitude',a.targetAlt-1000);});
function refresh(){
  if(!sim.aircraft.some(a=>a.id===selected))selected=sim.aircraft[0]?.id||null;
  $('metric-score').textContent=fmt(sim.score);$('metric-cleared').textContent=sim.cleared;$('metric-risk').textContent=`${sim.strikes} / ${sim.mode==='sandbox'?'--':'3'}`;$('metric-time').textContent=clock(sim.mode==='daily'?300-sim.time:sim.time);$('instrument-status').textContent=sim.aircraft.some(a=>a.alert)?'SEPARATION ALERT':`RADAR ONLINE / SECTOR ${sim.level}`;$('traffic-count').textContent=`${String(sim.aircraft.length).padStart(2,'0')} ACTIVE`;
  const list=$('traffic-list'),existing=new Map([...list.children].map(b=>[b.dataset.plane,b]));
  for(const a of sim.aircraft){let b=existing.get(a.id);if(!b){b=document.createElement('button');b.type='button';b.className='flight-strip';b.dataset.plane=a.id;for(let i=0;i<4;i++)b.appendChild(document.createElement(i<2?'strong':'small'));list.appendChild(b);}existing.delete(a.id);b.setAttribute('aria-pressed',String(a.id===selected));b.dataset.alert=String(a.alert);b.children[0].textContent=a.callsign+(a.priority?' !':'');b.children[1].textContent=a.final?'FINAL':a.exit||'RWY 27';b.children[2].textContent=`${fmt(a.alt)} ft / ${Math.round(a.speed)} kt`;b.children[3].textContent=a.priority&&!a.final?clock(a.fuel)+' FUEL':a.alert?'CONFLICT':a.armed?'ARMED':a.type;}
  for(const b of existing.values())b.remove();
  const mobileSelect=$('mobile-plane'),savedFocus=document.activeElement===mobileSelect;
  const signature=sim.aircraft.map(a=>a.id).join(',');
  if(mobileSelect.dataset.signature!==signature){mobileSelect.dataset.signature=signature;mobileSelect.replaceChildren(...sim.aircraft.map(a=>{const o=document.createElement('option');o.value=a.id;o.textContent=a.callsign;return o;}));}
  for(const o of mobileSelect.options){const a=sim.aircraft.find(a=>a.id===o.value);if(a)o.textContent=`${a.callsign} / ${fmt(a.alt)} ft / ${Math.round(a.speed)} kt${a.alert?' / ALERT':''}`;}
  if(!savedFocus&&sim.aircraft.some(a=>a.id===selected))mobileSelect.value=selected;
  $('mobile-flightbar').hidden=!shell.active();
  const a=sim.aircraft.find(a=>a.id===selected);$('mobile-flightbar').querySelectorAll('button,select:not(#mobile-plane)').forEach(b=>b.disabled=!a||a.final);
  if(a){$('mobile-alt').value=String(a.targetAlt);$('mobile-speed').textContent=`${a.targetSpeed} kt`;$('mobile-gate').textContent=a.exit?'Exit':'Gate';$('mobile-arm').disabled=a.final||a.kind==='transit';$('mobile-arm').textContent=a.final?'Final':a.armed?'Armed':'Arm';$('mobile-arm').setAttribute('aria-pressed',String(a.armed));}
  $('no-selection').hidden=!!a;$('selected-panel').hidden=!a;
  if(a){$('selected-name').textContent=a.callsign;$('selected-type').textContent=a.final?'ON FINAL':a.priority?'PRIORITY':a.kind.toUpperCase();$('selected-destination').textContent=a.exit?`OVERFLIGHT / EXIT ${a.exit}`:`ARRIVAL / RWY 27${a.priority?' / '+clock(a.fuel)+' FUEL':''}`;$('actual-heading').textContent=`${String(Math.round(a.heading)%360).padStart(3,'0')}\u00b0`;$('actual-altitude').textContent=fmt(a.alt)+' ft';
    if(document.activeElement!==$('heading-input'))$('heading-input').value=Math.round(a.targetHeading)%360;
    $('selected-panel').querySelectorAll('button,input').forEach(b=>b.disabled=a.final);
    document.querySelectorAll('[data-alt]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.alt)===a.targetAlt)));
    document.querySelectorAll('[data-speed]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.speed)===a.targetSpeed)));
    $('route-gate').hidden=a.kind==='transit';$('route-exit').hidden=a.kind!=='transit';$('approach-controls').hidden=a.kind==='transit';
    const checks=sim.captureStatus(a);for(const k of Object.keys(checks))$('check-'+k).classList.toggle('done',checks[k]||a.final);
    $('approach-btn').setAttribute('aria-pressed',String(a.armed));$('approach-btn').textContent=a.final?'Established on final':a.armed?'Armed. Cancel approach':'Arm approach';
    $('flight-advice').textContent=a.final?'Landing automatically. Watch the next arrival.':a.alert?'Separation alert. Turn away or change altitude now.':a.exit?`Reach the ${a.exit} diamond to hand over this flight.`:a.armed?'Armed. Capture needs all four conditions above.':'Send this flight to the gate, slow down, descend, then arm.';$('flight-advice').classList.toggle('traffic-warning',a.alert);
  }else $('selected-type').textContent='SELECT A FLIGHT';
  const latest=sim.events[sim.events.length-1];if(latest&&latest!==lastEvent){lastEvent=latest;const log=$('event-log');log.replaceChildren();for(const e of sim.events.slice(-5).reverse()){const li=document.createElement('li'),time=document.createElement('time'),txt=document.createElement('span');time.textContent=clock(e.time);txt.textContent=e.text;li.append(time,txt);log.appendChild(li);}if(shell.running){shell.toast(latest.text);if(latest.type==='warn')shell.audio.beep('warn');if(latest.type==='good')shell.audio.beep('good');}}
}
refresh();fixedLoop(dt=>{sim.step(dt);shell.milestone(sim.cleared);if(sim.over)shell.finish({score:sim.score,count:sim.cleared,seconds:sim.time,reason:sim.reason,complete:sim.reason==='Shift complete'});},now=>{drawVector(view,sim,selected,draft,reduced);if(now-lastUI>.15){lastUI=now;refresh();}},()=>shell.active());
// Module-level access used by the shipped browser tests; no globals are added.
export const getSimulation=()=>sim;
