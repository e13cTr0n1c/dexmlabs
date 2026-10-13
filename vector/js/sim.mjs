/* Fictional, accelerated terminal-control model. Not an aviation training tool. */
import {rng,clamp,wrap,angleDiff} from '../../assets/flight-core.mjs';
export const RUNWAY={x:43,y:56,threshold:51,heading:270,gate:{x:73,y:56},entry:{x:84,y:56}};
export const EXITS={NORTH:{x:50,y:0},SOUTH:{x:50,y:100},WEST:{x:0,y:38},EAST:{x:100,y:35}};
export const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
export const bearing=(a,b)=>wrap(Math.atan2(b.x-a.x,a.y-b.y)*180/Math.PI);
const vector=h=>({x:Math.sin(h*Math.PI/180),y:-Math.cos(h*Math.PI/180)});
const PREFIX=['DEX','SKY','AUR','LAB','NIM','SOL','EKO','JET'];
export class VectorSim {
  constructor({seed='vector',mode='endless'}={}){this.seed=seed;this.mode=mode;this.random=rng(seed);this.time=0;this.score=0;this.cleared=0;this.strikes=0;this.streak=0;this.aircraft=[];this.serial=0;this.events=[];this.pairs=new Map();this.nextSpawn=24;this.over=false;this.reason='';this.weather=null;this.weatherAt=105;this.addAircraft({initial:0});this.addAircraft({initial:1});}
  emit(text,type='info'){this.events.push({time:this.time,text,type});if(this.events.length>60)this.events.shift();}
  get level(){return 1+Math.floor(this.time/65);}
  addAircraft({initial=-1}={}){
    if(this.aircraft.length>=14||this.over)return null;
    const n=++this.serial,r=this.random,transit=initial<0&&n>3&&r()<.26;
    let x,y,heading,exit=null;
    if(initial===0){x=88;y=39;heading=245;}else if(initial===1){x=48;y=10;heading=155;}else if(transit){const names=Object.keys(EXITS);exit=names[Math.floor(r()*names.length)];if(exit==='WEST'){x=96;y=18+r()*42;heading=270;}if(exit==='EAST'){x=4;y=16+r()*34;heading=90;}if(exit==='SOUTH'){x=22+r()*54;y=4;heading=180;}if(exit==='NORTH'){x=20+r()*55;y=96;heading=0;}}
    else{const side=Math.floor(r()*3);if(side===0){x=96;y=12+r()*73;heading=260;}else if(side===1){x=30+r()*55;y=4;heading=170;}else{x=22+r()*65;y=96;heading=10;}}
    let alt=initial===0?3000:initial===1?4000:3000+Math.floor(r()*3)*1000;
    // A new aircraft must not create an unavoidable separation incident at the edge.
    if(this.aircraft.some(a=>distance(a,{x,y})<14&&Math.abs(a.alt-alt)<1000)){for(const candidate of [5000,4000,3000,2000]){if(!this.aircraft.some(a=>distance(a,{x,y})<14&&Math.abs(a.alt-candidate)<1000)){alt=candidate;break;}}if(this.aircraft.some(a=>distance(a,{x,y})<12&&Math.abs(a.alt-alt)<1000))return null;}
    const heavy=n>4&&r()<.2,priority=n>6&&n%7===0;
    const a={id:`V${n}`,callsign:`${PREFIX[(n-1)%PREFIX.length]}${100+Math.floor(r()*890)}`,type:heavy?'HEAVY':'JET',kind:transit?'transit':'arrival',exit,x,y,heading,targetHeading:heading,alt,targetAlt:alt,speed:220,targetSpeed:220,route:[],armed:false,final:false,age:0,priority,fuel:priority?105:null,trail:[],trailTime:0,alert:false,warning:false,weatherTime:0,weatherHit:false};
    this.aircraft.push(a);this.emit(`${a.callsign} checking in. ${transit?`Exit ${exit}.`:'Inbound runway 27.'}${priority?' Priority fuel request.':''}`);return a;
  }
  captureStatus(a){return {position:Math.abs(a.y-RUNWAY.gate.y)<4&&a.x>65&&a.x<79,heading:Math.abs(angleDiff(a.heading,270))<32,altitude:a.alt<=2500,speed:a.speed<=200};}
  command(id,type,value){const a=this.aircraft.find(a=>a.id===id);if(!a||this.over||a.final)return false;
    if(type==='heading'){if(!Number.isFinite(value))return false;a.targetHeading=wrap(value);a.route=[];}
    else if(type==='altitude'){if(!Number.isFinite(value))return false;a.targetAlt=clamp(Math.round(value/1000)*1000,2000,6000);}
    else if(type==='speed'){if(!Number.isFinite(value))return false;a.targetSpeed=clamp(value,140,280);}
    else if(type==='route'){if(!Array.isArray(value)||!value.length||value.some(p=>!Number.isFinite(p.x)||!Number.isFinite(p.y)))return false;a.route=value.slice(0,20).map(p=>({x:clamp(p.x,1,99),y:clamp(p.y,1,99)}));}
    else if(type==='gate'){a.route=[{...RUNWAY.entry},{...RUNWAY.gate}];}
    else if(type==='exit'&&a.exit){a.route=[{...EXITS[a.exit]}];}
    else if(type==='arm'&&a.kind==='arrival'){a.armed=!a.armed;}
    else return false;
    return true;
  }
  strike(text){if(this.over)return;this.strikes++;this.streak=0;this.emit(text,'warn');if(this.strikes>=3&&this.mode!=='sandbox'){this.over=true;this.reason='Sector closed';}}
  clear(a){this.cleared++;this.streak++;const points=100+Math.min(this.streak-1,10)*15+(a.priority?100:0)+Math.max(0,50-Math.floor(a.age/2));if(this.mode!=='sandbox')this.score+=points;this.emit(`${a.callsign} ${a.kind==='arrival'?'landed safely':'handed over'}. +${this.mode==='sandbox'?0:points}`,'good');}
  step(dt){if(this.over||!Number.isFinite(dt)||dt<=0)return;dt=Math.min(dt,.1);this.time+=dt;
    if(this.mode!=='sandbox'&&this.time>=this.nextSpawn){this.addAircraft();this.nextSpawn+=Math.max(8,24-this.level*1.8);}
    if(!this.weather&&this.time>=this.weatherAt){this.weather={x:20+this.random()*12,y:27,r:8.5};this.emit('Weather cell in the western sector. Keep clear.','warn');}
    if(this.weather){this.weather.y=27+Math.sin((this.time-this.weatherAt)/32)*8;}
    const remove=new Set();
    for(const a of this.aircraft){a.age+=dt;a.alert=false;a.warning=false;
      if(a.route.length){const target=a.route[0];a.targetHeading=bearing(a,target);if(distance(a,target)<2.2){a.route.shift();if(a.route.length)a.targetHeading=bearing(a,a.route[0]);}}
      if(a.final){a.targetHeading=bearing(a,{x:RUNWAY.x,y:RUNWAY.y});a.targetAlt=0;a.targetSpeed=150;}
      a.heading=wrap(a.heading+clamp(angleDiff(a.targetHeading,a.heading),-(a.type==='HEAVY'?18:27)*dt,(a.type==='HEAVY'?18:27)*dt));
      a.alt+=clamp(a.targetAlt-a.alt,-320*dt,320*dt);a.speed+=clamp(a.targetSpeed-a.speed,-22*dt,22*dt);
      const dir=vector(a.heading),speed=a.speed/180;a.x+=dir.x*speed*dt;a.y+=dir.y*speed*dt;
      a.trailTime+=dt;if(a.trailTime>.7){a.trailTime=0;a.trail.push({x:a.x,y:a.y});if(a.trail.length>18)a.trail.shift();}
      if(a.armed&&!a.final&&Object.values(this.captureStatus(a)).every(Boolean)){a.final=true;a.route=[];this.emit(`${a.callsign} established on final.`);}
      if(a.final&&a.x<=RUNWAY.threshold&&Math.abs(a.y-RUNWAY.y)<3){this.clear(a);remove.add(a.id);continue;}
      if(a.kind==='transit'&&distance(a,EXITS[a.exit])<4.5){this.clear(a);remove.add(a.id);continue;}
      if(a.x < -1||a.x>101||a.y < -1||a.y>101){this.strike(`${a.callsign} left controlled airspace. Strike ${this.strikes+1}.`);remove.add(a.id);continue;}
      if(a.priority&&!a.final){a.fuel-=dt;if(a.fuel<=0){this.strike(`${a.callsign} fuel emergency diverted. Strike ${this.strikes+1}.`);remove.add(a.id);continue;}}
      if(this.weather&&distance(a,this.weather)<this.weather.r+1&&!a.final){a.warning=true;a.weatherTime+=dt;if(a.weatherTime>=3&&!a.weatherHit){a.weatherHit=true;this.strike(`${a.callsign} entered severe weather. Strike ${this.strikes+1}.`);}}else a.weatherTime=0;
    }
    this.aircraft=this.aircraft.filter(a=>!remove.has(a.id));
    const activePairs=new Set();
    for(let i=0;i<this.aircraft.length;i++)for(let j=i+1;j<this.aircraft.length;j++){
      const a=this.aircraft[i],b=this.aircraft[j],key=`${a.id}:${b.id}`,d=distance(a,b),dz=Math.abs(a.alt-b.alt),sep=d<7&&dz<950;
      const av=vector(a.heading),bv=vector(b.heading),rx=b.x-a.x,ry=b.y-a.y,vx=bv.x*b.speed/180-av.x*a.speed/180,vy=bv.y*b.speed/180-av.y*a.speed/180,den=vx*vx+vy*vy;
      const t=den>.0001?clamp(-(rx*vx+ry*vy)/den,0,9):0,predict=Math.hypot(rx+vx*t,ry+vy*t);
      if(predict<9&&dz<1100){a.warning=true;b.warning=true;}
      if(sep){a.alert=true;b.alert=true;activePairs.add(key);const p=this.pairs.get(key)||{seconds:0,struck:false};p.seconds+=dt;if(p.seconds>=3&&!p.struck){p.struck=true;this.strike(`${a.callsign} / ${b.callsign}: separation lost. Strike ${this.strikes+1}.`);}this.pairs.set(key,p);}
      else if(d>9||dz>=1000)this.pairs.delete(key);else if(this.pairs.has(key)&&!this.pairs.get(key).struck)this.pairs.get(key).seconds=0;
    }
    // Discard pairs involving aircraft which have landed or left the sector.
    const ids=new Set(this.aircraft.map(a=>a.id));for(const key of this.pairs.keys()){if(key.split(':').some(id=>!ids.has(id)))this.pairs.delete(key);}
    if(this.mode==='daily'&&this.time>=300&&!this.over){this.over=true;this.reason='Shift complete';}
  }
}
