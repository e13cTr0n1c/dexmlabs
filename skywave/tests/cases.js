import {dailySeed,mulberry32} from '../js/seed.js';
import {subsolarPoint,cosZenith,terminator} from '../js/solar.js';
import {evaluatePath,maxHopKm,takeoffAngle,greatCircleDistance,intermediatePoint,antennaAllowed,antennaGain,criticalFrequency,dLayerAbsorption,CONFIG} from '../js/propagation.js';
import {generateDay,maidenhead} from '../js/stations.js';
import {createGame,advanceTime,callTarget,revealHint,scoreContact,updateStats} from '../js/game.js';
import {isLand} from '../js/landmask.js';
const assert=(x,m='Assertion failed')=>{if(!x)throw Error(m);};
const close=(a,b,e=1e-6)=>assert(Math.abs(a-b)<e,`${a} != ${b}`);
const noon='2026-03-20T12:00:00Z',night='2026-03-20T00:00:00Z';
const base={from:{lat:0,lon:-9},to:{lat:0,lon:9},date:noon,conditions:{sfi:70,kp:0},band:'20m',mode:'FT8',power:100,antenna:'dipole',roll:0};
export const cases=[
 ['Daily seed and targets are deterministic',()=>{assert(JSON.stringify(generateDay(noon))===JSON.stringify(generateDay(noon)));assert(JSON.stringify(generateDay(noon))!==JSON.stringify(generateDay('2026-03-21')));} ],
 ['UTC seed ignores time of day',()=>assert(dailySeed(noon)===dailySeed(night))],
 ['mulberry32 repeats a seeded sequence',()=>{let a=mulberry32(42),b=mulberry32(42);for(let i=0;i<100;i++)close(a(),b());}],
 ['20m / 2000 km / SFI 70 / noon opens',()=>{const r=evaluatePath(base);assert(r.ok,JSON.stringify(r));}],
 ['160m / 2000 km / noon is absorbed',()=>assert(evaluatePath({...base,band:'160m'}).reason==='absorbed (D layer)')],
 ['10m / 6000 km / SFI 70 / night is above MUF',()=>assert(evaluatePath({...base,from:{lat:0,lon:-27},to:{lat:0,lon:27},band:'10m',date:night}).reason==='above MUF')],
 ['10m / 6000 km / SFI 200 / noon opens',()=>{const r=evaluatePath({...base,from:{lat:0,lon:-27},to:{lat:0,lon:27},band:'10m',conditions:{sfi:200,kp:0}});assert(r.ok,r.detail);}],
 ['40m / 300 km / low dipole opens by NVIS',()=>{const r=evaluatePath({...base,from:{lat:0,lon:-1.35},to:{lat:0,lon:1.35},band:'40m',antenna:'lowDipole'});assert(r.ok&&r.mechanism==='NVIS',r.detail);}],
 ['15m / 300 km is in the skip zone',()=>assert(evaluatePath({...base,from:{lat:0,lon:-1.35},to:{lat:0,lon:1.35},band:'15m',antenna:'lowDipole'}).reason==='skip zone')],
 ['K 6 polar path has 18 dB additional loss',()=>{const r=evaluatePath({...base,from:{lat:60,lon:-100},to:{lat:60,lon:80},conditions:{sfi:150,kp:6}});close(r.polarLossDb,18);}],
 ['30m forbids SSB',()=>assert(evaluatePath({...base,band:'30m',mode:'SSB'}).reason==='mode not allowed')],
 ['Derived maximum hop respects 3-degree takeoff',()=>close(takeoffAngle(maxHopKm()),3)],
 ['Antipodal interpolation stays finite',()=>{const a={lat:0,lon:0},b={lat:0,lon:180},m=intermediatePoint(a,b,.5);assert(Number.isFinite(m.lat)&&Number.isFinite(m.lon));close(greatCircleDistance(a,m),Math.PI*6371/2,1e-4);}],
 ['Date-line path uses the short great circle',()=>assert(greatCircleDistance({lat:0,lon:179},{lat:0,lon:-179})<225)],
 ['Solar terminator has zero zenith cosine',()=>{for(const p of terminator(noon,24))close(cosZenith(p,noon),0);}],
 ['Subsolar point has overhead sun',()=>close(cosZenith(subsolarPoint(noon),noon),1)],
 ['Flare multiplies sunlit D absorption by five',()=>{const p={lat:0,lon:0};close(dLayerAbsorption(p,noon,7.1,{sfi:100,flare:{start:700,end:740}}),5*dLayerAbsorption(p,noon,7.1,{sfi:100}));}],
 ['Flare does not absorb on the dark side',()=>close(dLayerAbsorption({lat:0,lon:180},noon,7.1,{flare:{start:700,end:740}}),0)],
 ['Ground wave has no D-layer or F2 constraint',()=>{const r=evaluatePath({...base,to:{lat:0,lon:-8.5},band:'160m'});assert(r.mechanism==='Ground wave'&&r.absDb===0&&r.mufMHz===null);}],
 ['Vertical cannot provide high-angle NVIS',()=>assert(evaluatePath({...base,from:{lat:0,lon:0},to:{lat:0,lon:2.7},band:'40m',antenna:'vertical'}).reason==='skip zone')],
 ['Yagi and loop have explicit valid bands',()=>{assert(!antennaAllowed('yagi','40m'));assert(antennaAllowed('yagi','17m'));assert(!antennaAllowed('loop','6m'));}],
 ['Yagi has a 20 dB front-to-back difference',()=>close(antennaGain('yagi',10,0,0)-antennaGain('yagi',10,180,0),20)],
 ['Es opens a 6m path only inside an active daytime patch',()=>{const r=evaluatePath({...base,from:{lat:0,lon:-5},to:{lat:0,lon:5},band:'6m',conditions:{sfi:70,kp:0,esPatches:[{lat:0,lon:0,radius:800,start:600,end:900}]}});assert(r.ok&&r.mechanism==='Sporadic E'&&r.mufMHz===60,r.detail);}],
 ['Es does not open 20m artificially',()=>{const r=evaluatePath({...base,conditions:{sfi:70,kp:0,esPatches:[{lat:0,lon:0,radius:1000,start:0,end:1440}]}});assert(r.mechanism==='F2');}],
 ['Storm depression doubles at high magnetic latitude',()=>{const p=CONFIG.magneticPole;close(criticalFrequency(p,noon,{sfi:100,kp:6})/criticalFrequency(p,noon,{sfi:100,kp:3}),.76);}],
 ['Maidenhead encodes Greenwich and date-line safely',()=>{assert(maidenhead({lat:51.5,lon:0})==='JO01AM');assert(/^[A-R]{2}[0-9]{2}[A-X]{2}$/.test(maidenhead({lat:90,lon:180})));}],
 ['Land mask distinguishes central Africa and Atlantic',()=>{assert(isLand(5,20));assert(!isLand(0,-30));}],
 ['Daily targets have unique fictional calls and locators',()=>{const d=generateDay(noon);assert(d.targets.length===10&&new Set(d.targets.map(t=>t.callsign)).size===10);assert(d.targets.every(t=>/^[A-R]{2}[0-9]{2}[A-X]{2}$/.test(t.locator)));}],
 ['Northern winter does not spawn summer Es patches',()=>assert(generateDay('2026-01-15').conditions.esPatches.length===0)],
 ['Game clock never runs backwards',()=>{const g=advanceTime(createGame(generateDay(noon)),600);assert(advanceTime(g,200).minute===600);}],
 ['Call consumes exactly ten minutes, including closed stations',()=>{const g=createGame(generateDay(noon));assert(callTarget(g).state.minute===10);}],
 ['Hints charge once, and only for the selected target',()=>{let g=createGame(generateDay(noon));g=revealHint(revealHint(g,'muf'),'muf');assert(g.hints[g.selected].length===1);}],
 ['Scoring applies rarity, mode, power, grey line and penalty',()=>close(scoreContact(1000,2,'CW',5,true,.1),97)],
 ['A worked target cannot be scored again',()=>{let g=createGame(generateDay(noon));g.worked=[g.selected];assert(callTarget(g).entry===null);}],
 ['Last call can finish exactly at 24:00',()=>{let g=createGame(generateDay(noon));g.minute=1430;let x=callTarget(g);assert(x.state.minute===1440&&x.state.finished);assert(callTarget(x.state).entry===null);}],
 ['Daily statistics are idempotent',()=>{let g=createGame(generateDay(noon));g.score=100;let s=updateStats({},g);assert(updateStats(s,g).rounds===1);}],
 ['QSB uses supplied roll without mutating inputs',()=>{const x=JSON.parse(JSON.stringify(base));evaluatePath(x);assert(JSON.stringify(x)===JSON.stringify(base));}],
 ['Reason belongs to the specified vocabulary on every failed path',()=>{for(const b of CONFIG.bands){const r=evaluatePath({...base,band:b.id});assert(r.ok||['above MUF','absorbed (D layer)','below noise','skip zone','polar storm','band closed','mode not allowed'].includes(r.reason));}}]
];
export function runTests() {return cases.map(([name,test])=>{try{test();return {name,pass:true};}catch(e){return {name,pass:false,error:e.message};}});}
