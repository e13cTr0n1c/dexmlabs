import {$,FlightShell,setupCanvas,fixedLoop,clock,fmt} from '../../assets/flight-core.mjs';
import {OrbitSim,elements,altitude,guidance} from './sim.mjs';
import {OrbitRenderer} from './draw.mjs';
const canvas=$('scope');let view;
try{view=setupCanvas(canvas);}catch(e){$('mode-description').textContent=e.message;$('start-run').disabled=true;throw e;}
const renderer=new OrbitRenderer(),reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
let sim=new OrbitSim({seed:'orbit:preview:v1'}),selectedBurn='prograde',lastUI=0,lastEvent=null,heldPointer=null,heldKeys=new Set();
function stopBurn(){heldPointer=null;heldKeys.clear();sim.setBurn(null);}
const shell=new FlightShell({game:'orbit',title:'ORBIT',countName:'satellites deployed',threshold:3,onStart:opts=>{sim=new OrbitSim(opts);selectedBurn='prograde';lastEvent=null;heldPointer=null;heldKeys.clear();$('throttle').value=100;$('reset-orbit').hidden=opts.mode!=='sandbox';$('label-time').textContent=opts.mode==='daily'?'Time left':'Elapsed';shell.toast('Raise AP to the target with prograde thrust. Release, coast to AP, then lift PE.');refresh();},onStopInput:stopBurn});
function chooseBurn(kind){if(!shell.active())return;stopBurn();selectedBurn=kind;refresh();}
function beginBurn(kind){if(!shell.active())return;selectedBurn=kind;sim.setBurn(kind);shell.audio.unlock();refresh();}
document.querySelectorAll('[data-burn]').forEach(b=>b.addEventListener('click',()=>chooseBurn(b.dataset.burn)));
document.querySelectorAll('[data-warp]').forEach(b=>b.addEventListener('click',()=>{if(!shell.active())return;sim.setWarp(Number(b.dataset.warp));refresh();}));
$('throttle').addEventListener('input',()=>{if(!shell.active())return;sim.throttle=Number($('throttle').value)/100;refresh();});
$('pulse-burn').addEventListener('click',()=>{if(!shell.active())return;stopBurn();sim.setWarp(1);sim.applyImpulse(selectedBurn,20);shell.audio.beep();refresh();});
$('cut-engine').addEventListener('click',()=>{stopBurn();refresh();});
$('reset-orbit').addEventListener('click',()=>{if(!shell.active())return;stopBurn();sim.resetOrbit();refresh();});
const burnButton=$('burn-button');
burnButton.addEventListener('pointerdown',e=>{if(!shell.active()||!e.isPrimary||e.button!==0)return;e.preventDefault();burnButton.focus({preventScroll:true});heldPointer=e.pointerId;burnButton.setPointerCapture(e.pointerId);beginBurn(selectedBurn);});
function release(e){if(e.pointerId!==heldPointer)return;stopBurn();if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);refresh();}
burnButton.addEventListener('pointerup',release);burnButton.addEventListener('pointercancel',release);burnButton.addEventListener('lostpointercapture',()=>{stopBurn();refresh();});burnButton.addEventListener('contextmenu',e=>e.preventDefault());
document.querySelectorAll('[data-mobile-burn]').forEach(b=>{b.addEventListener('pointerdown',e=>{if(!shell.active()||!e.isPrimary||e.button!==0)return;e.preventDefault();b.focus({preventScroll:true});heldPointer=e.pointerId;b.setPointerCapture(e.pointerId);beginBurn(b.dataset.mobileBurn);});b.addEventListener('pointerup',release);b.addEventListener('pointercancel',release);b.addEventListener('lostpointercapture',()=>{stopBurn();refresh();});b.addEventListener('contextmenu',e=>e.preventDefault());});
$('mobile-coast').addEventListener('click',()=>{if(!shell.active())return;sim.setWarp(sim.warp===1?3:1);refresh();});
const keys={KeyW:'prograde',KeyS:'retrograde',KeyA:'in',KeyD:'out'};
document.addEventListener('keydown',e=>{if(!shell.active()||e.ctrlKey||e.altKey||e.metaKey||document.querySelector('dialog[open]')||e.target.matches('input,textarea,select'))return;const kind=keys[e.code]||((e.code==='Space'||e.code==='Enter')&&(e.target===burnButton||e.target.matches('[data-mobile-burn]'))?(e.target.dataset.mobileBurn||selectedBurn):null);if(!kind)return;e.preventDefault();if(e.repeat)return;heldKeys.add(e.code);beginBurn(kind);});
document.addEventListener('keyup',e=>{if(!heldKeys.has(e.code))return;e.preventDefault();heldKeys.delete(e.code);if(!heldKeys.size){sim.setBurn(null);refresh();}else{const last=[...heldKeys].pop();beginBurn(keys[last]||selectedBurn);}});
function refresh(){const e=elements(sim.ship),t=sim.target,g=guidance(sim),asAlt=r=>Number.isFinite(r)?fmt(altitude(r))+' km':'ESCAPE';
  $('mobile-flightbar').hidden=!shell.active();$('mobile-pe').textContent=`${fmt(altitude(e.pe))} / ${fmt(altitude(t.pe))}`;$('mobile-ap').textContent=`${Number.isFinite(e.ap)?fmt(altitude(e.ap)):'ESC'} / ${fmt(altitude(t.ap))}`;
  document.querySelectorAll('[data-mobile-burn]').forEach(b=>b.setAttribute('aria-pressed',String(sim.burn===b.dataset.mobileBurn)));$('mobile-coast').textContent=sim.warp===1?'Coast 3x':'Coast 1x';
  $('metric-score').textContent=fmt(sim.score);$('metric-cleared').textContent=sim.deployed;$('metric-risk').textContent=sim.mode==='sandbox'?'UNL.':fmt(sim.fuel);$('metric-time').textContent=clock(sim.mode==='daily'?300-sim.time:sim.time);
  $('mission-number').textContent=`CONTRACT ${String(sim.deployed+1).padStart(2,'0')}`;$('mission-name').textContent=t.name;$('mission-type').textContent=t.purpose;$('target-pe').textContent=asAlt(t.pe);$('target-ap').textContent=asAlt(t.ap);$('current-pe').textContent=asAlt(e.pe);$('current-ap').textContent=asAlt(e.ap);$('orbit-progress').value=sim.stable;
  const matched=sim.matches();$('mission-status').textContent=matched?`Orbit acquired. ${Math.max(0,3-sim.stable).toFixed(1)}s to deploy.`:`Tolerance +/-${fmt(t.tolerance*6371)} km at both ends.`;$('mission-status').classList.toggle('match',matched);
  $('engine-status').textContent=sim.burn?'THRUST ACTIVE':'ENGINE IDLE';$('throttle-output').textContent=Math.round(sim.throttle*100)+'%';
  document.querySelectorAll('[data-burn]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.burn===selectedBurn)));document.querySelectorAll('[data-warp]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.warp)===sim.warp)));
  burnButton.setAttribute('aria-pressed',String(!!sim.burn));burnButton.textContent=sim.burn?`Burning ${sim.burn}. Release to cut.`:`Hold to burn ${selectedBurn}`;
  $('guidance-title').textContent=g.title;$('guidance-text').textContent=g.text;$('guidance-wait').textContent=g.kind==='coast'?'Thrust off. Automatic deployment armed.':g.wait<1.8?'Burn window now. Use short pulses as you near the target.':`Next burn window in about ${Math.ceil(g.wait/sim.warp)}s at ${sim.warp}x. Coast until then.`;
  $('instrument-status').textContent=e.pe<1.05?'LOW ORBIT WARNING':sim.fuel<350&&sim.mode!=='sandbox'?'LOW PROPELLANT':'TELEMETRY ONLINE';
  const latest=sim.events[sim.events.length-1];if(latest&&latest!==lastEvent){lastEvent=latest;const log=$('event-log');log.replaceChildren();for(const event of sim.events.slice(-5).reverse()){const li=document.createElement('li'),time=document.createElement('time'),text=document.createElement('span');time.textContent=clock(event.time);text.textContent=event.text;li.append(time,text);log.append(li);}if(shell.running){shell.toast(latest.text);if(latest.type==='good')shell.audio.beep('good');if(latest.type==='warn')shell.audio.beep('warn');}}
}
refresh();fixedLoop(dt=>{sim.step(dt);shell.milestone(sim.deployed);if(sim.over)shell.finish({score:sim.score,count:sim.deployed,seconds:sim.time,reason:sim.reason,complete:sim.reason==='Shift complete'});},now=>{renderer.draw(view,sim,reduced);if(now-lastUI>.12){lastUI=now;refresh();}},()=>shell.active());
export const getSimulation=()=>sim;
