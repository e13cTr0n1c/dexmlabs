import {hashString,mulberry32} from './seed.js';
import {evaluatePath,initialBearing} from './propagation.js';
import {isListening} from './stations.js';
export const RULES=Object.freeze({attemptMinutes:10,dayMinutes:1440,modeMult:{FT8:1,CW:1.5,SSB:2},powerMult:{5:3,50:1.5,100:1,400:0.7},hintCost:{muf:0.05,absorption:0.05,scope:0.10}});
export function createGame(day,mode='daily') {return {version:1,day,mode,minute:0,selected:day.targets[0].id,rig:{band:'20m',mode:'FT8',power:100,antenna:'dipole',bearing:0},log:[],worked:[],hints:{},score:0,finished:false};}
/** First-time friendly start: open the operating day at the earliest listening window (nothing is on air
 * before it, so no usable time is lost) and pre-select that station. The 24:00 end is unchanged. */
export function openingState(state) {
  const first=[...state.day.targets].sort((a,b)=>a.start-b.start||a.id.localeCompare(b.id))[0];
  if(!first||state.log.length||state.minute>0)return state;
  return {...advanceTime(state,first.start),selected:first.id,startMinute:first.start};
}
export const gameDate = (state,minute=state.minute) => new Date(Date.parse(state.day.key)+minute*60000);
export const selectedTarget = state => state.day.targets.find(t=>t.id===state.selected);
export function advanceTime(state,minute) {if(state.finished)return state;return {...state,minute:Math.min(RULES.dayMinutes,Math.max(state.minute,Math.ceil(minute/10)*10))};}
export function revealHint(state,type) {
  if(!Object.hasOwn(RULES.hintCost,type)||state.finished||state.worked.includes(state.selected))return state;
  const existing=state.hints[state.selected]||[];
  return existing.includes(type)?state:{...state,hints:{...state.hints,[state.selected]:[...existing,type]}};
}
export const penaltyFor = (state,id) => (state.hints[id]||[]).reduce((s,h)=>s+RULES.hintCost[h],0);
export function scoreContact(distance,rarity,mode,power,greyLine=false,penalty=0) {
  return Math.round(Math.round(distance/100)*rarity*RULES.modeMult[mode]*RULES.powerMult[power]*(greyLine?1.2:1)*(1-penalty));
}
export function inspectPath(state,minute=state.minute) {return evaluatePath({from:state.day.qth,to:selectedTarget(state),...state.rig,date:gameDate(state,minute),conditions:state.day.conditions,roll:0});}
export function callTarget(state) {
  const target=selectedTarget(state);
  if(!target||state.finished||state.minute+RULES.attemptMinutes>RULES.dayMinutes||state.worked.includes(target.id))return {state,entry:null};
  const roll=mulberry32(hashString(`${state.day.seed}:${state.log.length}:${target.id}:${state.minute}`))();
  let result=evaluatePath({from:state.day.qth,to:target,...state.rig,date:gameDate(state),conditions:state.day.conditions,roll});
  if(!isListening(target,state.minute))result={...result,ok:false,qsb:false,hops:[],failedHop:null,reason:'band closed',detail:`${target.callsign} is not listening. Its UTC window is ${formatTime(target.start)}-${formatTime(target.end)}.`};
  else if(!target.bands.includes(state.rig.band))result={...result,ok:false,qsb:false,hops:[],failedHop:null,reason:'band closed',detail:`${target.callsign} is not on ${state.rig.band}. Listen on ${target.bands.join(', ')}.`};
  else if(!target.modes.includes(state.rig.mode))result={...result,ok:false,qsb:false,hops:[],failedHop:null,reason:'mode not allowed',detail:`${target.callsign} is listening in ${target.modes.join(' / ')}, not ${state.rig.mode}.`};
  const points=result.ok?scoreContact(result.distanceKm,target.rarity,state.rig.mode,state.rig.power,result.greyLine,penaltyFor(state,target.id)):0;
  const entry={targetId:target.id,callsign:target.callsign,minute:state.minute,rig:{...state.rig},result,points};
  const worked=result.ok?[...state.worked,target.id]:state.worked;
  return {state:{...state,minute:state.minute+RULES.attemptMinutes,log:[...state.log,entry],worked,score:state.score+points,finished:worked.length===state.day.targets.length||state.minute+RULES.attemptMinutes>=RULES.dayMinutes},entry};
}
export function bandScope(state) {return Array.from({length:7},(_,i)=>Math.min(1430,state.minute+i*60)).filter((v,i,a)=>i===0||v!==a[i-1]).map(minute=>{const r=inspectPath(state,minute);return {minute,mufMHz:r.mufMHz,absDb:r.absDb};});}
export const formatTime = minute => `${String(Math.floor(minute/60)).padStart(2,'0')}:${String(minute%60).padStart(2,'0')}`;
export function shareText(state,url) {
  const squares=state.day.targets.map(t=>{const win=state.log.find(e=>e.targetId===t.id&&e.result.ok);return win?(win.result.qsb?'\u{1F7E8}':'\u{1F7E9}'):'\u{1F7E5}';}).join('');
  return `SKYWAVE ${state.mode==='daily'?'#'+state.day.number:'PRACTICE'} ${state.worked.length}/10 ${state.score.toLocaleString('en-GB')}pts\n${squares}\n${url}`;
}
export function missedTip(state) {
  const fails=state.log.filter(e=>!e.result.ok),reason=fails.at(-1)?.result.reason;
  return ({'above MUF':'Lower the frequency when a hop escapes. The weakest midpoint sets the whole path MUF.','absorbed (D layer)':'Try the low bands after sunset; their daytime D-layer losses can overwhelm extra power.','skip zone':'For nearby stations, pair a low dipole with a band below the overhead F2 critical frequency.','polar storm':'High K makes polar routes harder. Non-polar targets are often a better use of your time.','mode not allowed':'Check both the station modes and the band restrictions before transmitting.','band closed':'Plan around listening windows first; a perfect path cannot work a station that is off-air.','below noise':'Trade score for reliability: FT8, more power or a better-aimed antenna can rescue a weak signal.'})[reason]||'Work the stations with the earliest closing windows first. Keep low-band options for night and save high bands for sunlit paths.';
}
export function updateStats(previous,state) {
  if(state.mode!=='daily')return previous;
  const history={...(previous?.history||{})};
  const first=!history[state.day.key];history[state.day.key]={score:Math.max(history[state.day.key]?.score||0,state.score),qsos:Math.max(history[state.day.key]?.qsos||0,state.worked.length)};
  const dates=Object.keys(history).sort();let run=0,bestStreak=0,last='';
  for(const key of dates){run=last&&Date.parse(key)-Date.parse(last)===86400000?run+1:1;bestStreak=Math.max(bestStreak,run);last=key;}
  return {history,best:Math.max(0,...Object.values(history).map(h=>h.score)),streak:run,bestStreak,lastPlayed:last,rounds:dates.length,first};
}
