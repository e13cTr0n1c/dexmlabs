import {cases} from './cases.js';
import {CONFIG,evaluatePath,intermediatePoint,greatCircleDistance,initialBearing,getBand,antennaAllowed} from '../js/propagation.js';
import {mulberry32,dailySeed} from '../js/seed.js';
import {createGame,callTarget,revealHint,penaltyFor,advanceTime,updateStats,shareText} from '../js/game.js';
import {generateDay} from '../js/stations.js';
import {adBreak} from '../js/ads.js';
const assert=(x,m='Assertion failed')=>{if(!x)throw Error(m);};
const base={from:{lat:0,lon:-9},to:{lat:0,lon:9},date:'2026-03-20T12:00:00Z',conditions:{sfi:70,kp:0},band:'20m',mode:'FT8',power:100,antenna:'dipole',roll:0};
cases.push(
 ['Every calculated SNR and margin is finite (all bands)',()=>{for(const b of CONFIG.bands){const r=evaluatePath({...base,band:b.id});assert(Number.isFinite(r.snr)&&Number.isFinite(r.margin),`${b.id}: non-finite result`);}}],
 ['Two-kilometre ground path stays numerically finite',()=>{const r=evaluatePath({...base,to:{lat:0,lon:-8.98}});assert(r.ok&&Number.isFinite(r.snr));}],
 ['QSB succeeds below the seeded half-way cut and fails above it',()=>{let candidate=null;for(let lon=10;lon<170&&!candidate;lon+=.25){const args={...base,from:{lat:0,lon:0},to:{lat:0,lon},mode:'SSB',power:5};const r=evaluatePath(args);if(r.qsb)candidate=args;}assert(candidate,'No marginal fixture found');assert(evaluatePath({...candidate,roll:.49}).ok);const failed=evaluatePath({...candidate,roll:.5});assert(!failed.ok&&failed.qsb&&failed.reason==='below noise');}],
 ['Night-time Es does not create an opening',()=>{const r=evaluatePath({...base,from:{lat:0,lon:-5},to:{lat:0,lon:5},date:'2026-03-20T00:00:00Z',band:'6m',conditions:{sfi:70,kp:0,esPatches:[{lat:0,lon:0,radius:1000,start:0,end:1440}]}});assert(r.reason==='above MUF');}],
 ['Grey line requires both ends and only low bands',()=>{const args={...base,from:{lat:-9,lon:92},to:{lat:9,lon:92},band:'40m',power:400};assert(evaluatePath(args).greyLine);assert(!evaluatePath({...args,band:'20m'}).greyLine);}],
 ['Hints cost points, never score, and a worked QSO cannot be charged',()=>{let s=createGame(generateDay(base.date));for(const h of ['muf','absorption','scope'])s=revealHint(s,h);assert(penaltyFor(s,s.selected)===0);s.worked=[s.selected];assert(revealHint(s,'muf')===s);}],
 ['Practice never updates daily statistics',()=>{const stats={best:100};assert(updateStats(stats,createGame(generateDay(base.date),'practice'))===stats);}],
 ['Consecutive UTC days create a streak and a gap resets it',()=>{let stats={};for(const d of ['2026-06-01','2026-06-02','2026-06-04'])stats=updateStats(stats,createGame(generateDay(d)));assert(stats.streak===1&&stats.bestStreak===2);}],
 ['Share text has one status tile for each of ten targets',()=>{const s=createGame(generateDay(base.date)),text=shareText(s,'https://example.invalid/skywave/');assert([...text.split('\n')[1]].length===10&&text.includes('0/10'));}],
 ['Ad stub completes synchronously without pausing or requesting an ad',()=>{let before=0,after=0;adBreak({type:'next',name:'practice-next',beforeAd:()=>before++,afterAd:()=>after++});assert(before===0&&after===1);}],
 ['One thousand varied paths never return NaN or an unnamed failure',()=>{const rng=mulberry32(7351),reasons=['above MUF','absorbed (D layer)','below noise','skip zone','polar storm','band closed','mode not allowed'];for(let i=0;i<1000;i++){const band=CONFIG.bands[Math.floor(rng()*11)].id,antenna=Object.keys(CONFIG.antennas)[Math.floor(rng()*6)],r=evaluatePath({from:{lat:rng()*160-80,lon:rng()*360-180},to:{lat:rng()*160-80,lon:rng()*360-180},band,antenna,mode:['CW','SSB','FT8'][Math.floor(rng()*3)],power:CONFIG.powers[Math.floor(rng()*4)],date:new Date(Date.UTC(2026,Math.floor(rng()*12),15,Math.floor(rng()*24))),conditions:{sfi:65+Math.floor(rng()*156),kp:Math.floor(rng()*8)},roll:rng()});assert(r.ok||reasons.includes(r.reason));assert(r.snr===null||Number.isFinite(r.snr));assert(r.margin===null||Number.isFinite(r.margin));assert(r.hops.every(h=>h.mufMHz===null||Number.isFinite(h.mufMHz)));}}]
);
