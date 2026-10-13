/* Planar two-body gravity in Earth-radius units, mu=1. Velocity-Verlet integration.
 * Display conversions use R=6371 km, mu=398600.4418 km^3/s^2. Deliberately a game:
 * no inclination, J2, drag, Moon, real spacecraft mass model or mission planning. */
import {rng,clamp,wrap} from '../../assets/flight-core.mjs';
export const EARTH_KM=6371;
export const VELOCITY_MS=Math.sqrt(398600.4418/EARTH_KM)*1000;
export const TIME_SCALE=.52;
export const THRUST=.024;
export const altitude=r=>Math.round((r-1)*EARTH_KM);
export function elements(s){
  const r=Math.hypot(s.x,s.y),v2=s.vx*s.vx+s.vy*s.vy,h=s.x*s.vy-s.y*s.vx,energy=v2/2-1/r;
  const ex=s.vy*h-s.x/r,ey=-s.vx*h-s.y/r,e=Math.hypot(ex,ey),a=energy<0?-1/(2*energy):Infinity;
  const pe=h*h/(1+e),ap=energy<0?a*(1+e):Infinity;
  const omega=e<.00001?Math.atan2(s.y,s.x):Math.atan2(ey,ex);
  let toAp=0,toPe=0;
  if(e>.001&&e<1){const E=Math.atan2((s.x*s.vx+s.y*s.vy)/(e*Math.sqrt(a)),(1-r/a)/e),M=wrap(E-e*Math.sin(E),Math.PI*2),n=1/Math.sqrt(a*a*a);toAp=wrap(Math.PI-M,Math.PI*2)/n/TIME_SCALE;toPe=wrap(-M,Math.PI*2)/n/TIME_SCALE;}
  return {r,v:Math.sqrt(v2),h,energy,e,a,pe,ap,omega,toAp,toPe};
}
export function integrate(s,dt){
  const r2=s.x*s.x+s.y*s.y,k=1/(r2*Math.sqrt(r2));
  s.vx-=s.x*k*dt/2;s.vy-=s.y*k*dt/2;s.x+=s.vx*dt;s.y+=s.vy*dt;
  const n2=s.x*s.x+s.y*s.y,nk=1/(n2*Math.sqrt(n2));s.vx-=s.x*nk*dt/2;s.vy-=s.y*nk*dt/2;
}
export function direction(s,kind){const v=Math.hypot(s.vx,s.vy),r=Math.hypot(s.x,s.y);if(kind==='prograde')return {x:s.vx/v,y:s.vy/v};if(kind==='retrograde')return {x:-s.vx/v,y:-s.vy/v};if(kind==='out')return {x:s.x/r,y:s.y/r};if(kind==='in')return {x:-s.x/r,y:-s.y/r};return {x:0,y:0};}
const NAMES=['AURORA','KESTREL','HORIZON','NIMBUS','RELAY','KEPLER','PIONEER','BEACON'];
export class OrbitSim {
  constructor({seed='orbit',mode='endless'}={}){this.seed=seed;this.mode=mode;this.random=rng(seed);this.ship={x:1.55,y:0,vx:0,vy:Math.sqrt(1/1.55)};this.time=0;this.simTime=0;this.fuel=2800;this.maxFuel=3600;this.score=0;this.deployed=0;this.warp=1;this.throttle=1;this.burn=null;this.stable=0;this.burnUsed=0;this.legStart=0;this.advisoryTask=null;this.trail=[];this.trailClock=0;this.satellites=[];this.events=[];this.over=false;this.reason='';this.target=this.nextTarget();this.emit('Flight computer online. First contract received.');}
  emit(text,type='info'){this.events.push({time:this.time,text,type});if(this.events.length>60)this.events.shift();}
  nextTarget(){let pe,ap;const n=this.deployed,r=this.random,el=elements(this.ship);if(n===0){pe=ap=1.95;}else{const base=clamp((el.pe+Math.min(el.ap,3.8))/2+(r()<.48?-1:1)*(.28+r()*.48),1.45,3.2);pe=Math.round(base*20)/20;ap=pe;if(n>=3&&r()<.42)ap=pe+.3+Math.round(r()*8)/20;if(Math.abs(pe-el.pe)<.15&&Math.abs(ap-el.ap)<.15)pe=ap=clamp(pe+.35,1.45,3.3);}
    return {pe,ap,tolerance:n<2?.085:.065,name:`${NAMES[n%NAMES.length]}-${String(n+1).padStart(2,'0')}`,purpose:pe===ap?'Deploy a communications satellite into a circular orbit.':'Deploy a science satellite into an elliptical orbit.'};}
  setBurn(kind){if(this.over)return false;if(kind!==null&&!['prograde','retrograde','out','in'].includes(kind))return false;this.burn=kind;if(kind)this.warp=1;return true;}
  setWarp(value){if(![1,3,10].includes(value)||this.over)return false;this.warp=this.burn?1:value;return true;}
  applyImpulse(kind,ms){if(this.over||!Number.isFinite(ms)||ms<=0)return 0;const d=direction(this.ship,kind);if(!d.x&&!d.y)return 0;const used=this.mode==='sandbox'?Math.min(ms,200):Math.min(ms,200,this.fuel);this.ship.vx+=d.x*used/VELOCITY_MS;this.ship.vy+=d.y*used/VELOCITY_MS;if(this.mode!=='sandbox')this.fuel=Math.max(0,this.fuel-used);this.burnUsed+=used;return used;}
  matches(){const e=elements(this.ship),t=this.target;return Number.isFinite(e.ap)&&Math.abs(e.pe-t.pe)<=t.tolerance&&Math.abs(e.ap-t.ap)<=t.tolerance;}
  deploy(){const points=500+Math.max(0,400-Math.round(this.burnUsed/5))+Math.min(500,this.deployed*40);this.deployed++;if(this.mode!=='sandbox')this.score+=points;const e=elements(this.ship);this.satellites.push({a:e.a,e:e.e,omega:e.omega,phase:Math.atan2(this.ship.y,this.ship.x)-e.omega,name:this.target.name});if(this.satellites.length>12)this.satellites.shift();this.emit(`${this.target.name} deployed. +${this.mode==='sandbox'?0:points}. Propellant replenished.`,'good');this.fuel=Math.min(this.maxFuel,this.fuel+1500);this.stable=0;this.burnUsed=0;this.legStart=this.time;this.advisoryTask=null;this.burn=null;this.warp=1;this.target=this.nextTarget();}
  resetOrbit(){if(this.mode!=='sandbox')return false;const a=Math.PI*2*this.random();this.ship={x:1.55*Math.cos(a),y:1.55*Math.sin(a),vx:-Math.sqrt(1/1.55)*Math.sin(a),vy:Math.sqrt(1/1.55)*Math.cos(a)};this.trail=[];this.burn=null;this.warp=1;this.stable=0;this.advisoryTask=null;this.over=false;this.reason='';this.emit('Training orbit reset.');return true;}
  finish(reason){this.burn=null;this.over=true;this.reason=reason;}
  step(dt){if(this.over||!Number.isFinite(dt)||dt<=0)return;dt=Math.min(dt,.1);this.time+=dt;const warp=this.burn?1:this.warp,total=dt*TIME_SCALE*warp,steps=Math.max(1,Math.ceil(total/.006)),h=total/steps;
    for(let i=0;i<steps;i++){
      if(this.burn){const delta=THRUST*this.throttle*h*VELOCITY_MS;this.applyImpulse(this.burn,delta);if(this.fuel<=0&&this.mode!=='sandbox')this.burn=null;}
      integrate(this.ship,h);this.simTime+=h;const r=Math.hypot(this.ship.x,this.ship.y);
      if(!Number.isFinite(r)||r<=1.02){if(this.mode==='sandbox'){this.resetOrbit();this.emit('Atmospheric entry. Training orbit restored.','warn');return;}this.finish('Atmospheric entry');return;}
      if(r>9){if(this.mode==='sandbox'){this.resetOrbit();this.emit('Escape trajectory. Training orbit restored.','warn');return;}this.finish('Signal lost');return;}
    }
    this.trailClock+=dt;if(this.trailClock>=.09){this.trailClock=0;this.trail.push({x:this.ship.x,y:this.ship.y});if(this.trail.length>160)this.trail.shift();}
    if(this.matches()&&!this.burn){this.stable+=dt;if(this.stable>=3)this.deploy();}else this.stable=0;
    if(this.mode!=='sandbox'&&this.fuel<.1&&!this.matches()){this.finish('Propellant exhausted');return;}
    if(this.mode==='daily'&&this.time>=300){this.finish('Shift complete');}
  }
}
/** Advice is based on orbital extrema, never the ship's current altitude alone. */
export function guidance(sim){const e=elements(sim.ship),t=sim.target,tol=t.tolerance*.8;
  if(sim.matches())return {title:'Orbit acquired',text:'Release thrust and hold this orbit for three seconds to deploy.',kind:'coast',wait:0};
  if(e.pe<1.05)return {title:'Atmosphere warning',text:'Burn prograde near apoapsis to lift the low side clear of Earth.',kind:'prograde',wait:e.toAp};
  if(!Number.isFinite(e.ap))return {title:'Escape trajectory',text:'Burn retrograde to reduce speed and return to a closed orbit.',kind:'retrograde',wait:0};
  // Keep one advisory task until that end reaches its target. Without this
  // hysteresis, tiny pulses can switch the advice between opposite apsides
  // every frame, wasting fuel or waiting an orbit after every correction.
  const dAp=t.ap-e.ap,dPe=t.pe-e.pe;
  let low=sim.advisoryTask?.contract===t.name?sim.advisoryTask.low:null;
  if(low===null||Math.abs(low?dAp:dPe)<=tol){
    low=e.ap<t.pe-tol ? true : e.pe>t.ap+tol ? false : Math.abs(dAp)>=Math.abs(dPe);
    sim.advisoryTask={contract:t.name,low};
  }
  const raise=(low?dAp:dPe)>0;
  const kind=raise?'prograde':'retrograde';
  const title=low?(raise?'Raise the high side':'Lower the high side'):(raise?'Raise the low side':'Lower the low side');
  const text=low?`Coast to periapsis. Burn ${kind} there until AP reaches its target.`:`Coast to apoapsis. Burn ${kind} there until PE reaches its target.`;
  let wait=low?e.toPe:e.toAp;
  if(e.e<.003||Math.abs(e.r-(low?e.pe:e.ap))<Math.max(.022,(e.ap-e.pe)*.045))wait=0;
  return {title,text,kind,wait};
}
