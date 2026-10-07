import {dailySeed,dayNumber,utcDateKey,mulberry32,pick,shuffle,randomInt} from './seed.js';
import {wrapLongitude} from './solar.js';
import {greatCircleDistance} from './propagation.js';
/** Approximate operating sites and valid ITU prefix families; suffixes are invented.
 * These are not records of actual licensees, DXCC entities or band plans. */
export const LOCATIONS = [
  ['Lincolnshire','England',53.2,-0.3,'G','EU'],['Reykjavik','Iceland',64.1,-21.9,'TF','EU'],
  ['Lisbon','Portugal',38.7,-9.1,'CT','EU'],['Tromso','Norway',69.6,19,'LA','EU'],
  ['Rome','Italy',41.9,12.5,'I','EU'],['Athens','Greece',38,23.7,'SV','EU'],
  ['Helsinki','Finland',60.2,24.9,'OH','EU'],['Warsaw','Poland',52.2,21,'SP','EU'],
  ['Dakar','Senegal',14.7,-17.4,'6W','AF'],['Accra','Ghana',5.6,-0.2,'9G','AF'],
  ['Nairobi','Kenya',-1.3,36.8,'5Z','AF'],['Cape Town','South Africa',-33.9,18.4,'ZS','AF'],
  ['Antananarivo','Madagascar',-18.9,47.5,'5R','AF'],['Windhoek','Namibia',-22.6,17.1,'V5','AF'],
  ['Halifax','Canada',44.6,-63.6,'VE','NA'],['Vancouver','Canada',49.3,-123.1,'VE','NA'],
  ['Anchorage','Alaska',61.2,-149.9,'KL','NA'],['Boston','United States',42.4,-71.1,'W','NA'],
  ['Denver','United States',39.7,-105,'K','NA'],['Mexico City','Mexico',19.4,-99.1,'XE','NA'],
  ['San Jose','Costa Rica',9.9,-84.1,'TI','NA'],['Bogota','Colombia',4.7,-74.1,'HK','SA'],
  ['Lima','Peru',-12,-77,'OA','SA'],['Santiago','Chile',-33.4,-70.7,'CE','SA'],
  ['Buenos Aires','Argentina',-34.6,-58.4,'LU','SA'],['Recife','Brazil',-8.1,-34.9,'PY','SA'],
  ['Tokyo','Japan',35.7,139.7,'JA','AS'],['Seoul','South Korea',37.6,127,'HL','AS'],
  ['Bengaluru','India',13,77.6,'VU','AS'],['Bangkok','Thailand',13.8,100.5,'HS','AS'],
  ['Dubai','United Arab Emirates',25.2,55.3,'A6','AS'],['Singapore','Singapore',1.3,103.8,'9V','AS'],
  ['Perth','Australia',-31.9,115.9,'VK','OC'],['Sydney','Australia',-33.9,151.2,'VK','OC'],
  ['Wellington','New Zealand',-41.3,174.8,'ZL','OC'],['Suva','Fiji',-18.1,178.4,'3D2','OC']
].map(([name,country,lat,lon,prefix,continent])=>({name,country,lat,lon,prefix,continent}));
export function maidenhead({lat,lon}) {
  const x=Math.min(359.999999,((lon+180)%360+360)%360),y=Math.max(0,Math.min(179.999999,lat+90));
  return String.fromCharCode(65+Math.floor(x/20),65+Math.floor(y/10))+Math.floor(x%20/2)+Math.floor(y%10)+String.fromCharCode(65+Math.floor((x%2)*12),65+Math.floor((y%1)*24));
}
function callsign(rng,prefix) {
  const letters='ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const suffix=Array.from({length:3},()=>pick(rng,letters)).join('');
  return prefix+(prefix==='3D2'?'':randomInt(rng,0,9))+suffix;
}
export function generateDay(date=new Date(),seed=dailySeed(date),overrides={}) {
  const key=utcDateKey(date),rng=mulberry32(seed);
  const sfi=overrides.sfi??randomInt(rng,65,220),kp=overrides.kp??pick(rng,[0,0,1,1,1,2,2,2,3,3,4,5,6,7]);
  const flareStart=randomInt(rng,180,1260),flare=rng()<0.22?{start:flareStart,end:Math.min(1440,flareStart+randomInt(rng,3,12)*10)}:null;
  const qth={...pick(rng,LOCATIONS)};qth.locator=maidenhead(qth);
  const month=new Date(key).getUTCMonth(),esPatches=[];
  if(month>=4&&month<=7)for(let i=0,n=randomInt(rng,0,3);i<n;i++) {
    const lon=randomInt(rng,-110,150),center=Math.round((12-lon/15)*60),start=Math.max(0,center-180),end=Math.min(1440,center+180);
    esPatches.push({lat:randomInt(rng,28,58),lon,radius:randomInt(rng,500,1000),start,end});
  }
  const locations=shuffle(rng,LOCATIONS.filter(p=>greatCircleDistance(qth,p)>750)).slice(0,9);
  locations.splice(randomInt(rng,0,9),0,{...qth,name:'Regional field station',lat:Math.max(-80,Math.min(80,qth.lat+2)),lon:wrapLongitude(qth.lon+1)});
  const used=new Set();
  const targets=locations.map((p,i)=>{
    const start=randomInt(rng,0,14)*60,end=Math.min(1440,start+randomInt(rng,6,10)*60);
    const bands=[...new Set(['40m','20m',...shuffle(rng,['160m','80m','60m','30m','17m','15m','12m','10m','6m']).slice(0,randomInt(rng,2,4))])];
    if(greatCircleDistance(qth,p)<500)bands.push('80m');
    let call;do{call=callsign(rng,p.prefix);}while(used.has(call));used.add(call);
    return {...p,id:`t${i}`,callsign:call,locator:maidenhead(p),start,end,bands:[...new Set(bands)],modes:rng()<0.35?['FT8','CW']:['FT8','CW','SSB'],rarity:randomInt(rng,1,5)};
  });
  return {key,number:dayNumber(key),seed:seed>>>0,qth,targets,conditions:{sfi,kp,a:[0,4,7,15,27,48,80,132][kp],flare,esPatches}};
}
export const isListening = (target,minute) => minute>=target.start&&minute<target.end;
