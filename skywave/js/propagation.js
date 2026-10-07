import {RAD, DEG, clamp, wrapLongitude, toVector, fromVector, subsolarPoint, cosZenith, solarElevation} from './solar.js';
import {isLand} from './landmask.js';

/** All propagation calibration lives here. Gain/noise tables are GAME values,
 * not manufacturer measurements. See README for explicitly resolved ambiguities. */
export const CONFIG = Object.freeze({
  earthRadiusKm:6371, f2HeightKm:300, eHeightKm:110, dHeightKm:70, minTakeoffDeg:3,
  shortPathKm:500, nvisMinimumGainDb:-3, greyElevationDeg:6, greyBonusDb:4,
  foDayBase:4, foDaySfi:0.05, foNightBase:2, foNightSfi:0.015,
  stormThreshold:3, stormDepression:0.04, stormLatitudeDeg:55,
  magneticPole:{lat:80.65,lon:-72.68}, polarLatitudeDeg:60, polarLossPerKp:3,
  absorptionBase:400, absorptionSfi:0.005, absorptionExponent:0.75, flareMultiplier:5,
  fsplConstant:32.45, landReflectionDb:2, seaReflectionDb:0.5,
  groundExtraLossDb:12, groundLossPerKm:0.04,
  receiverGainDb:0, receiverReferenceAngleDeg:15,
  noisePerKpDb:1, quietLoopDb:3, marginalDb:3, qsbSuccessProbability:0.5,
  esMufMHz:60, esMinimumKm:500, esMaximumKm:2200,
  angles:[5,10,20,30,45,60,90],
  mufTable:[[0,1],[500,1.4],[1000,1.9],[2000,2.6],[3000,3],[4000,3.3]],
  bands:[
    {id:'160m',mhz:1.84,noise:-111,nightNoise:7,ground:150},
    {id:'80m',mhz:3.6,noise:-115,nightNoise:7,ground:100},
    {id:'60m',mhz:5.36,noise:-118,nightNoise:6,ground:30},
    {id:'40m',mhz:7.1,noise:-122,nightNoise:6,ground:60},
    {id:'30m',mhz:10.13,noise:-125,nightNoise:5,ground:30},
    {id:'20m',mhz:14.1,noise:-128,nightNoise:4,ground:30},
    {id:'17m',mhz:18.1,noise:-130,nightNoise:3,ground:30},
    {id:'15m',mhz:21.1,noise:-132,nightNoise:3,ground:30},
    {id:'12m',mhz:24.94,noise:-134,nightNoise:3,ground:30},
    {id:'10m',mhz:28.5,noise:-136,nightNoise:3,ground:30},
    {id:'6m',mhz:50.15,noise:-138,nightNoise:2,ground:30}
  ],
  modes:{FT8:-20,CW:-10,SSB:6}, powers:[5,50,100,400],
  antennas:{
    lowDipole:{name:'Low dipole',description:'1/8 wavelength high. Strong overhead energy; best for NVIS.',gains:[-12,-8,-3,0,4,6,7]},
    dipole:{name:'Dipole 1/2 wave high',description:'Balanced all-rounder. Peaks at 25-30 degrees.',gains:[-5,-1,3,4,1,-5,-12]},
    vertical:{name:'Quarter-wave vertical',description:'Radials included. Low-angle DX; very little overhead energy.',gains:[1,2,1,0,-4,-10,-20]},
    efhw:{name:'EFHW at 10 m',description:'Simplified dipole-like pattern with installation loss.',gains:[-7,-3,1,2,0,-3,-6]},
    yagi:{name:'3-element Yagi',description:'20m-10m only. Aim the beam at the short-path bearing.',gains:[5,7,6,3,-3,-10,-20],bands:['20m','17m','15m','12m','10m'],frontToBackDb:20},
    loop:{name:'Magnetic loop',description:'40m-10m only. -6 dBi with a 3 dB local-noise reduction.',gains:[-6,-6,-6,-6,-6,-6,-6],bands:['40m','30m','20m','17m','15m','12m','10m']}
  }
});
export const BANDS = CONFIG.bands;
/** Failures caused by the schedule or rig rules rather than the ionosphere. Nothing propagates, so no arc is drawn. */
export const NON_PROPAGATION_REASONS = Object.freeze(['band closed','mode not allowed']);
export const isPathResult = r => Boolean(r) && (r.ok || !NON_PROPAGATION_REASONS.includes(r.reason));
export const getBand = id => BANDS.find(b=>b.id===id);
export function interpolate(table,x) {
  if(x<=table[0][0])return table[0][1];
  for(let i=1;i<table.length;i++)if(x<=table[i][0]){const [a,y]=table[i-1],[b,z]=table[i];return y+(z-y)*(x-a)/(b-a);}
  return table.at(-1)[1];
}
export function greatCircleDistance(a,b) {const x=toVector(a),y=toVector(b);const dot=x.x*y.x+x.y*y.y+x.z*y.z;const cross=Math.hypot(x.y*y.z-x.z*y.y,x.z*y.x-x.x*y.z,x.x*y.y-x.y*y.x);return CONFIG.earthRadiusKm*Math.atan2(cross,clamp(dot,-1,1));}
/** Spherical interpolation with deterministic, non-singular antipodal handling. */
export function intermediatePoint(a,b,t) {
  if(t<=0)return {...a};if(t>=1)return {...b};
  const u=toVector(a),v=toVector(b),dot=clamp(u.x*v.x+u.y*v.y+u.z*v.z,-1,1),angle=Math.acos(dot);
  if(angle<1e-8)return {...a};
  let w={x:v.x-u.x*dot,y:v.y-u.y*dot,z:v.z-u.z*dot},len=Math.hypot(w.x,w.y,w.z);
  if(len<1e-8){w=Math.abs(u.y)<0.9?{x:-u.z,y:0,z:u.x}:{x:0,y:u.z,z:-u.y};len=Math.hypot(w.x,w.y,w.z);}
  const c=Math.cos(angle*t),s=Math.sin(angle*t)/len;
  return fromVector({x:u.x*c+w.x*s,y:u.y*c+w.y*s,z:u.z*c+w.z*s});
}
export function initialBearing(a,b) {const d=wrapLongitude(b.lon-a.lon)*RAD;return (Math.atan2(Math.sin(d)*Math.cos(b.lat*RAD),Math.cos(a.lat*RAD)*Math.sin(b.lat*RAD)-Math.sin(a.lat*RAD)*Math.cos(b.lat*RAD)*Math.cos(d))*DEG+360)%360;}
export function maxHopKm(height=CONFIG.f2HeightKm,minAngle=CONFIG.minTakeoffDeg) {const r=CONFIG.earthRadiusKm,a=minAngle*RAD;return 2*r*(Math.acos(r*Math.cos(a)/(r+height))-a);}
export function takeoffAngle(hopKm,height=CONFIG.f2HeightKm) {const t=hopKm/(2*CONFIG.earthRadiusKm);return Math.atan2(Math.cos(t)-CONFIG.earthRadiusKm/(CONFIG.earthRadiusKm+height),Math.sin(t))*DEG;}
export function slantLength(hopKm,height=CONFIG.f2HeightKm) {const r=CONFIG.earthRadiusKm,t=hopKm/(2*r);return 2*Math.sqrt(height*height+2*r*(r+height)*(1-Math.cos(t)));}
/** Fixed centered-dipole approximation, not a live geomagnetic model. */
export function geomagneticLatitude(p) {return Math.asin(cosZenith(p,CONFIG.magneticPole))*DEG;}
export function criticalFrequency(p,date,conditions={}) {
  const sfi=conditions.sfi??100,kp=conditions.kp??0,day=CONFIG.foDayBase+CONFIG.foDaySfi*sfi,night=CONFIG.foNightBase+CONFIG.foNightSfi*sfi;
  const high=Math.abs(geomagneticLatitude(p))>CONFIG.stormLatitudeDeg?2:1;
  return (night+(day-night)*Math.sqrt(Math.max(0,cosZenith(p,date))))*(1-CONFIG.stormDepression*Math.max(0,kp-CONFIG.stormThreshold)*high);
}
export function flareActive(date,conditions) {
  if(!conditions.flare)return false;
  const d=new Date(date),m=d.getUTCHours()*60+d.getUTCMinutes();
  return m>=conditions.flare.start && m<conditions.flare.end;
}
export function dLayerAbsorption(p,date,mhz,conditions={}) {
  const light=Math.max(0,cosZenith(p,date));
  return CONFIG.absorptionBase*(1+CONFIG.absorptionSfi*(conditions.sfi??100))*light**CONFIG.absorptionExponent/(mhz*mhz)*(flareActive(date,conditions)?CONFIG.flareMultiplier:1);
}
export function antennaAllowed(id,band) {const a=CONFIG.antennas[id];return Boolean(a&&getBand(band)&&(!a.bands||a.bands.includes(band)));}
export function antennaGain(id,angle,bearing=0,pathBearing=0) {
  const a=CONFIG.antennas[id];if(!a)return -100;
  let g=interpolate(CONFIG.angles.map((v,i)=>[v,a.gains[i]]),angle);
  if(id==='yagi') {const difference=Math.abs(wrapLongitude(bearing-pathBearing));g-=a.frontToBackDb*(1-Math.cos(difference*RAD))/2;}
  return g;
}
export function esOpening(from,to,date,conditions,band) {
  const distance=greatCircleDistance(from,to);
  if(!['10m','6m'].includes(band)||distance<CONFIG.esMinimumKm||distance>CONFIG.esMaximumKm)return false;
  const p=intermediatePoint(from,to,0.5),d=new Date(date),m=d.getUTCHours()*60+d.getUTCMinutes();
  return (conditions.esPatches||[]).some(e=>m>=e.start&&m<e.end&&cosZenith(p,date)>0&&greatCircleDistance(p,e)<=e.radius);
}
/** Pure result: random fading is supplied as a number, never drawn internally.
 * reason is null on success; on failure it is one of the brief's seven reasons.
 * QSB is a separate flag, including marginal failures (reason: below noise).
 */
export function evaluatePath({from,to,band='20m',mode='FT8',power=100,antenna='dipole',bearing=0,date,conditions={},roll=0.75}) {
  const result={ok:false,snr:null,margin:null,hops:[],reason:null,detail:'',failedHop:null,distanceKm:0,mufMHz:null,absDb:0,polarLossDb:0,reflectionDb:0,greyLine:false,qsb:false,mechanism:'F2',angle:0};
  const fail=(reason,detail)=>({...result,reason,detail});
  if(!Object.hasOwn(CONFIG.modes,mode)||band==='30m'&&mode==='SSB')return fail('mode not allowed','30m supports CW and FT8, not SSB.');
  const b=getBand(band);
  if(!b||!antennaAllowed(antenna,band)||!CONFIG.powers.includes(Number(power)))return fail('band closed','This band, antenna or power pairing is not available.');
  if(!from||!to||![from.lat,from.lon,to.lat,to.lon].every(Number.isFinite)||!Number.isFinite(new Date(date).getTime()))return fail('band closed','Invalid path coordinates or UTC time.');
  const distance=greatCircleDistance(from,to),mid=intermediatePoint(from,to,0.5),sun=subsolarPoint(date);
  result.distanceKm=distance;
  const ground=distance<=b.ground,short=distance<CONFIG.shortPathKm,es=!ground&&esOpening(from,to,date,conditions,band);
  result.mechanism=ground?'Ground wave':es?'Sporadic E':short?'NVIS':'F2';
  const height=es?CONFIG.eHeightKm:CONFIG.f2HeightKm;
  const n=ground?1:short||es?1:Math.ceil(distance/maxHopKm()),hopKm=distance/n;
  const angle=ground?5:takeoffAngle(hopKm,height);result.angle=angle;
  if(short&&!ground&&(b.mhz>=criticalFrequency(mid,sun,conditions)||antennaGain(antenna,angle,bearing,initialBearing(from,to))<CONFIG.nvisMinimumGainDb)) {
    result.mufMHz=criticalFrequency(mid,sun,conditions);
    return fail('skip zone',`${Math.round(distance)} km is beyond ${b.ground} km ground-wave range. Use a lower band and a high-angle antenna for NVIS.`);
  }
  for(let i=0;i<n;i++) {
    const start=intermediatePoint(from,to,i/n),end=intermediatePoint(from,to,(i+1)/n),middle=intermediatePoint(from,to,(i+0.5)/n);
    const muf=ground?Infinity:es?CONFIG.esMufMHz:criticalFrequency(middle,sun,conditions)*(short?1:interpolate(CONFIG.mufTable,hopKm));
    const passes=ground?[]:[0.25,0.75].map(t=>({point:intermediatePoint(from,to,(i+t)/n),absDb:dLayerAbsorption(intermediatePoint(from,to,(i+t)/n),date,b.mhz,conditions)}));
    const abs=passes.reduce((s,p)=>s+p.absDb,0),reflection=i<n-1?(isLand(end.lat,end.lon)?CONFIG.landReflectionDb:CONFIG.seaReflectionDb):0;
    result.hops.push({from:start,to:end,midpoint:middle,mufMHz:Number.isFinite(muf)?muf:null,absDb:abs,reflection,passes,heightKm:ground?0:height,angle,failed:false});
    result.absDb+=abs;result.reflectionDb+=reflection;
  }
  result.mufMHz=ground?null:Math.min(...result.hops.map(h=>h.mufMHz));
  const sampleCount=Math.max(3,Math.ceil(distance/150));
  const polar=!ground&&Array.from({length:sampleCount+1},(_,i)=>Math.abs(geomagneticLatitude(intermediatePoint(from,to,i/sampleCount)))).some(x=>x>CONFIG.polarLatitudeDeg);
  result.polarLossDb=polar?CONFIG.polarLossPerKp*(conditions.kp??0):0;
  result.greyLine=!ground&&b.mhz<=10.13&&[from,to].every(p=>Math.abs(solarElevation(p,sun))<=CONFIG.greyElevationDeg);
  const pathKm=ground?Math.max(1,distance):n*slantLength(hopKm,height);
  const fspl=CONFIG.fsplConstant+20*Math.log10(b.mhz)+20*Math.log10(pathKm);
  const gtx=antennaGain(antenna,angle,bearing,initialBearing(from,to));
  const noise=b.noise+(cosZenith(to,sun)<0?b.nightNoise:0)+CONFIG.noisePerKpDb*(conditions.kp??0)-(antenna==='loop'?CONFIG.quietLoopDb:0);
  const groundLoss=ground?CONFIG.groundExtraLossDb+CONFIG.groundLossPerKm*distance:0;
  result.snr=10*Math.log10(power)+gtx+CONFIG.receiverGainDb-fspl-result.absDb-result.reflectionDb-result.polarLossDb-groundLoss-noise+(result.greyLine?CONFIG.greyBonusDb:0);
  result.margin=result.snr-CONFIG.modes[mode];
  result.losses={freeSpaceDb:fspl,absorptionDb:result.absDb,reflectionsDb:result.reflectionDb,polarDb:result.polarLossDb,groundDb:groundLoss};
  result.noiseDbw=noise;result.gainDb=gtx;result.slantKm=pathKm;
  const blocked=result.hops.findIndex(h=>h.mufMHz!==null&&b.mhz>h.mufMHz);
  if(blocked>=0){result.failedHop=blocked;result.hops[blocked].failed=true;return fail('above MUF',`Hop ${blocked+1} above MUF: ${b.mhz} MHz vs ${result.hops[blocked].mufMHz.toFixed(1)} MHz at the midpoint. Try a lower band or a sunnier path.`);}
  if(result.margin<0) {
    if(result.absDb>3&&(result.margin+result.absDb>=0||result.absDb>result.polarLossDb&&result.absDb>12)){
      result.failedHop=result.hops.reduce((a,h,i,arr)=>h.absDb>arr[a].absDb?i:a,0);result.hops[result.failedHop].failed=true;
      return fail('absorbed (D layer)',`Hop ${result.failedHop+1} is heavily absorbed. Total D-layer loss ${result.absDb.toFixed(1)} dB${flareActive(date,conditions)?' during the flare':''}. Try a higher band or wait for darkness.`);
    }
    if(result.polarLossDb>0&&result.margin+result.polarLossDb>=0)return fail('polar storm',`The polar route adds ${result.polarLossDb.toFixed(0)} dB of loss at K ${conditions.kp}. Try a non-polar target or a more sensitive mode.`);
    return fail('below noise',`SNR ${result.snr.toFixed(1)} dB; ${mode} needs ${CONFIG.modes[mode]} dB. Try CW/FT8, more power, or a better take-off angle.`);
  }
  result.qsb=result.margin<=CONFIG.marginalDb;
  if(result.qsb&&roll>=CONFIG.qsbSuccessProbability)return fail('below noise',`QSB: ${result.margin.toFixed(1)} dB margin, but the signal faded. A marginal call has a seeded 50% chance; try another call or improve the setup.`);
  result.ok=true;result.detail=`${result.mechanism} contact${result.qsb?' through QSB':''}. ${result.snr.toFixed(1)} dB SNR; ${result.margin.toFixed(1)} dB decode margin${result.greyLine?' with grey-line enhancement':''}.`;
  return result;
}
