/* Points in Skywave: hints spend shared points (/assets/points.js), finished rounds earn them. Boots the real page in jsdom. */
import {createRequire} from 'module';
import fs from 'fs';
import path from 'path';
import {fileURLToPath} from 'url';
import {createGame,openingState,RULES} from '../js/game.js';
import {generateDay} from '../js/stations.js';
const require=createRequire(import.meta.url);const {JSDOM}=require('jsdom');
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const POINTS_JS=[path.join(ROOT,'../assets/points.js'),path.join(process.env.DEXM_SITE||'/workspace/dexmlabs/site','assets/points.js')].find(f=>fs.existsSync(f));
const html=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
const assert=(x,m='Assertion failed')=>{if(!x)throw Error(m);};
let n=0;
async function boot(storage,hash,fn,{points=true}={}){
  const w=new JSDOM(html,{url:'https://dexmlabs.app/skywave/'+(hash||''),pretendToBeVisual:true}).window;
  for(const [k,v] of Object.entries(storage))w.localStorage.setItem(k,typeof v==='string'?v:JSON.stringify(v));
  w.matchMedia=q=>({matches:/reduce/.test(q),addEventListener(){},removeEventListener(){}});
  w.HTMLCanvasElement.prototype.getContext=()=>null;w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};w.HTMLDialogElement.prototype.close=function(){this.open=false;};
  w.ResizeObserver=class{observe(){}disconnect(){}};w.scrollTo=()=>{};w.Element.prototype.scrollIntoView=()=>{};
  const keys=['window','document','localStorage','location','history','matchMedia','requestAnimationFrame','cancelAnimationFrame','ResizeObserver','navigator','DexmPoints'];
  const saved={};for(const k of keys)saved[k]=Object.getOwnPropertyDescriptor(globalThis,k);
  for(const k of keys.slice(0,-1))Object.defineProperty(globalThis,k,{value:w[k]??globalThis[k],configurable:true,writable:true});
  if(points){new Function('window',fs.readFileSync(POINTS_JS,'utf8'))(w);globalThis.DexmPoints=w.DexmPoints;}else delete globalThis.DexmPoints;
  try{await import(`../js/main.js?points${++n}`);await fn(w.document,w);await new Promise(r=>setTimeout(r,400));}
  finally{w.close();for(const k of keys){if(saved[k])Object.defineProperty(globalThis,k,saved[k]);else delete globalThis[k];}}
}
const day=generateDay(new Date()),key='skywave:round:'+day.key;
const fresh=()=>openingState(createGame(day));
export const pointsCases=[
 ['Points: hint buttons show their price in points, a hint spends points for that station only',async()=>{
   await boot({[key]:{...fresh(),minute:fresh().minute+10}},'#operating',async(d,w)=>{const P=w.DexmPoints;assert(P.balance()===150,'welcome '+P.balance());
     assert(d.querySelector('[data-hint=muf] small').textContent==='10 pts'&&d.querySelector('[data-hint=scope] small').textContent==='20 pts','prices');
     d.querySelector('[data-hint=muf]').click();assert(P.balance()===140,'charged '+P.balance());
     d.querySelector('[data-hint=muf]').click();assert(P.balance()===140,'once per station');
     d.querySelector('[data-hint=scope]').click();assert(P.balance()===120);
     const s=JSON.parse(w.localStorage.getItem(key));assert(s.hints[s.selected].length===2,'saved');
     assert(d.getElementById('hint-output').textContent.includes('30 points spent'));});}],
 ['Points: not enough points disables a hint with a tooltip, and a click charges nothing',async()=>{
   await boot({[key]:{...fresh(),minute:fresh().minute+10}},'#operating',async(d,w)=>{const P=w.DexmPoints;P.spend('test',145,'drain');
     const b=d.querySelector('[data-hint=muf]');assert(b.getAttribute('aria-disabled')==='true'&&/^Not enough points/.test(b.title),'tooltip');
     b.click();assert(P.balance()===5);const s=JSON.parse(w.localStorage.getItem(key));assert(!(s.hints[s.selected]||[]).length,'no hint');
     assert(/Not enough points/.test(d.getElementById('toast').textContent));
     P.earn('test',50,'top');assert(!b.hasAttribute('aria-disabled'),'back on when the balance changes');});}],
 ['Points: a finished daily round with a contact pays 100 once, even if it was finished before points',async()=>{
   const done={...fresh(),finished:true,worked:[day.targets[0].id]};let ledger;
   await boot({[key]:done},'',async(d,w)=>{assert(w.DexmPoints.balance()===250,'paid '+w.DexmPoints.balance());assert(w.DexmPoints.has('skywave:daily:'+day.key));ledger=w.localStorage.getItem('dexm:points');});
   await boot({[key]:done,'dexm:points':ledger},'',async(d,w)=>{assert(w.DexmPoints.balance()===250,'not twice');});
   await boot({[key]:{...fresh(),finished:true,worked:[]}},'',async(d,w)=>{assert(w.DexmPoints.balance()===150,'no contacts, no points');});}],
 ['Points: without the points script, hints are free and the game still works',async()=>{
   await boot({[key]:{...fresh(),minute:fresh().minute+10}},'#operating',async(d,w)=>{d.querySelector('[data-hint=muf]').click();const s=JSON.parse(w.localStorage.getItem(key));assert(s.hints[s.selected].length===1);},{points:false});}],
 ['Points: the hint prices match the shared price list',async()=>{const w=new JSDOM('').window;new Function('window',fs.readFileSync(POINTS_JS,'utf8'))(w);assert(JSON.stringify(w.DexmPoints.COSTS.skywave)===JSON.stringify(RULES.hintPoints));}],
];
export async function runPoints(){const out=[];for(const [name,fn] of pointsCases){try{await fn();out.push({name,pass:true});}catch(e){out.push({name,pass:false,error:e.stack?.split('\n').slice(0,3).join(' ')||String(e)});}}
  // Toasts and the globe loader finish on timers after a page closes. Give them a blank document to land on.
  globalThis.document=new JSDOM(html).window.document;return out;}
