/** QSO reward: points breakdown, score count-up and the confirmed-QSO card. No three.js here, so the maths
 * runs in tests without a browser. The comet itself lives in globe.js (and fallback.js). */
import {RULES} from './game.js';
import {getBand} from './propagation.js';
/** With motion on, the card and the count-up wait for the comet to reach the station (cardDelayMs). */
export const REWARD=Object.freeze({countMs:1000,cometMs:2000,cardDelayMs:1100,cardMs:6500,pulseMs:450});
/** Comet timing, shared by the 3D globe and the 2D fallback. Normalised time t (0..1) to path fraction:
 * fast start, easing into the contacted station by 70%, then a short flare there. */
export const COMET_TRAVEL=.7;
export const cometFraction=t=>{const u=Math.min(1,Math.max(0,t/COMET_TRAVEL));return 1-(1-u)*(1-u);};
export const easeOutCubic=t=>{const x=Math.min(1,Math.max(0,t));return 1-(1-x)**3;};
export const countValue=(from,to,t)=>Math.round(from+(to-from)*easeOutCubic(t));
export const kmToMiles=km=>km*.621371;
const fmt=n=>Math.round(n).toLocaleString('en-GB');
const mult=n=>String(n);
/** The real game scoring, split into its steps. total always equals scoreContact() for the same inputs. */
export function scoreBreakdown({distanceKm,rarity,mode,power,greyLine=false,penalty=0}){
  const base=Math.round(distanceKm/100),modeMult=RULES.modeMult[mode],powerMult=RULES.powerMult[power],grey=greyLine?1.2:1;
  const gross=base*rarity*modeMult*powerMult*grey,total=Math.round(gross*(1-penalty));
  const factors=[{label:'Rarity',value:rarity},{label:mode,value:modeMult},{label:`${power} W`,value:powerMult}];if(greyLine)factors.push({label:'Grey line',value:1.2});
  const formula=`${fmt(base)} × ${factors.map(f=>mult(f.value)).join(' × ')}${penalty>0?` − ${Math.round(penalty*100)}% hints`:''} = ${fmt(total)}`;
  return {base,factors,penalty,gross,total,formula};
}
export const shouldReward=entry=>Boolean(entry?.result?.ok);
export function rewardPlan(entry,{reducedMotion=false}={}){const ok=shouldReward(entry);return {card:ok,comet:ok&&!reducedMotion,countUp:ok&&!reducedMotion};}
/** Everything the card shows, from a logged entry and its target. */
export function qsoCardModel(entry,target,penalty=0){
  const r=entry.result,band=getBand(entry.rig.band),b=scoreBreakdown({distanceKm:r.distanceKm,rarity:target.rarity,mode:entry.rig.mode,power:entry.rig.power,greyLine:r.greyLine,penalty});
  return {callsign:entry.callsign,band:entry.rig.band,mhz:band.mhz.toFixed(3),mode:entry.rig.mode,power:entry.rig.power,km:Math.round(r.distanceKm),miles:Math.round(kmToMiles(r.distanceKm)),qsb:Boolean(r.qsb),breakdown:b,points:entry.points};
}
export function cardHTML(m,escape=s=>String(s)){
  const rows=[[`Base: ${fmt(m.km)} km ÷ 100`,fmt(m.breakdown.base)],...m.breakdown.factors.map(f=>[`× ${f.label}`,mult(f.value)])];
  if(m.breakdown.penalty>0)rows.push(['− Hints',`${Math.round(m.breakdown.penalty*100)}%`]);
  return `<div class="qso-card-top"><span class="eyebrow">\u2713 QSO confirmed${m.qsb?', QSB':''}</span><button type="button" class="qso-card-close" aria-label="Close QSO card">&#215;</button></div>`
   +`<strong class="qso-card-call">${escape(m.callsign)}</strong>`
   +`<p class="qso-card-meta">${escape(m.band)}, ${m.mhz} MHz, ${escape(m.mode)}, ${m.power} W</p>`
   +`<p class="qso-card-meta">${fmt(m.km)} km (${fmt(m.miles)} mi)</p>`
   +`<dl class="qso-card-sum">${rows.map(([k,v])=>`<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>`
   +`<p class="qso-card-formula">${m.breakdown.formula}</p>`
   +`<p class="qso-card-total"><span>Total</span><span>+${fmt(m.points)} pts</span></p>`;
}
/** Score counter. animateTo() starts from whatever is on screen, so a second QSO mid-count carries on
 * smoothly instead of jumping back. show() is for normal re-renders: it never interrupts a count heading
 * to the same total. Clock and frame scheduler are injectable for tests. */
export class ScoreCounter {
  constructor(el,{format=v=>`${fmt(v)} pts`,now=()=>performance.now(),raf=f=>requestAnimationFrame(f),caf=id=>cancelAnimationFrame(id),duration=REWARD.countMs,setTimer=(f,ms)=>setTimeout(f,ms),clearTimer=id=>clearTimeout(id)}={}){Object.assign(this,{el,format,now,raf,caf,duration,setTimer,clearTimer});this.value=null;this.target=null;this.frame=null;this.pulseTimer=null;}
  get running(){return this.frame!==null;}
  render(v){this.value=v;if(this.el)this.el.textContent=this.format(v);}
  stop(){if(this.frame!==null)this.caf(this.frame);this.frame=null;}
  show(v){if(this.running&&this.target===v)return;this.stop();this.target=v;this.render(v);}
  animateTo(v,{reducedMotion=false,delay=0}={}){
    const from=this.value??0;this.stop();this.target=v;
    if(reducedMotion||from===v){this.render(v);return;}
    const start=this.now()+delay;
    const step=()=>{const t=Math.max(0,(this.now()-start)/this.duration);this.render(countValue(from,v,t));if(t>=1){this.frame=null;this.pulse();}else this.frame=this.raf(step);};
    this.frame=this.raf(step);
  }
  pulse(){if(!this.el?.classList)return;this.clearTimer(this.pulseTimer);this.el.classList.remove('score-pulse');void this.el.offsetWidth;this.el.classList.add('score-pulse');this.pulseTimer=this.setTimer(()=>this.el.classList.remove('score-pulse'),REWARD.pulseMs);}
}
/** The reward hook. Called once per logged call; does nothing unless the call was a QSO. */
export class QsoReward {
  constructor({card,counter,globe=()=>null,reducedMotion=()=>false,escape,setTimer=(f,ms)=>setTimeout(f,ms),clearTimer=id=>clearTimeout(id)}){Object.assign(this,{card,counter,globe,reducedMotion,escape,setTimer,clearTimer});this.timer=null;this.delayTimer=null;this.fired=0;}
  handle(entry,state){
    if(!entry)return false;
    const plan=rewardPlan(entry,{reducedMotion:this.reducedMotion()});
    if(!plan.card){this.hide();this.counter?.show(state.score);return false;}
    this.fired++;
    const target=state.day.targets.find(t=>t.id===entry.targetId),penalty=(state.hints[entry.targetId]||[]).reduce((s,h)=>s+RULES.hintCost[h],0);
    const model=qsoCardModel(entry,target,penalty),delay=plan.comet&&this.globe()?.celebrate?.(entry)?REWARD.cardDelayMs:0;
    this.hide();
    if(delay)this.delayTimer=this.setTimer(()=>{this.delayTimer=null;this.showCard(model);},delay);else this.showCard(model);
    this.counter?.animateTo(state.score,{reducedMotion:!plan.countUp,delay});
    return true;
  }
  showCard(model){if(!this.card)return;this.clearTimer(this.timer);this.card.innerHTML=cardHTML(model,this.escape);this.card.hidden=false;this.card.querySelector('.qso-card-close')?.addEventListener('click',()=>this.hide());this.timer=this.setTimer(()=>this.hide(),REWARD.cardMs);}
  hide(){this.clearTimer(this.timer);this.clearTimer(this.delayTimer);this.timer=this.delayTimer=null;if(this.card)this.card.hidden=true;}
}
