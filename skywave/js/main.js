import {BUILD_PHASE} from './build.js';
import {utcDateKey,dailySeed} from './seed.js';
import {generateDay} from './stations.js';
import {BANDS,CONFIG,antennaAllowed,initialBearing} from './propagation.js';
import {createGame,openingState,advanceTime,callTarget,revealHint,gameDate,selectedTarget,shareText,updateStats} from './game.js';
import {UI,$,escapeHTML} from './ui.js';
import {QsoReward} from './reward.js';
import {RadioAudio} from './audio.js';
import {adBreak} from './ads.js';
/** Every outbound link lives here. Share URLs come from this module's location,
 * so a GitHub Pages subpath still works. Nothing loads until the user clicks. */
export const LINKS=Object.freeze({
  site:'https://dexmlabs.app/skywave/',portfolio:'https://dexmlabs.app/',
  gearEfhw:'https://cults3d.com/en/3d-model/tool/toroid-box-for-ft240-and-ft140-cores-efhw-49-1-9-1-unun-choke-so-239-n-or',
  gearGuide:'https://cults3d.com/en/3d-model/tool/rf-connector-panel-drill-guides-so-239-n-4-hole-flange-and-bnc-d-hole-with',
  gearMat:'https://arthurdeusexmachina-shop.fourthwall.com/products/uk-ham-radio-band-plan-desk-mat-160m-to-70cm',
  support:'https://buymeacoffee.com/arthurdeusexmachina',
  voacap:'https://www.voacap.com/hf/',dxmaps:'https://www.dxmaps.com/spots/mapg.php',
  nasaDay:'https://science.nasa.gov/earth/earth-observatory/blue-marble-next-generation/',
  nasaNight:'https://science.nasa.gov/earth/earth-observatory/earth-at-night/maps/',
  nasaUsage:'https://www.nasa.gov/nasa-brand-center/images-and-media/',
  basemap:'https://matplotlib.org/basemap/stable/users/geography.html',
  three:'https://threejs.org/',threeLicense:'https://github.com/mrdoob/three.js/blob/r185/LICENSE',
  naturalEarth:'https://www.naturalearthdata.com/about/terms-of-use/',
  itu:'https://www.itu.int/en/ITU-R/terrestrial/fmd/Pages/call_sign_series.aspx'
});
const defaults={quality:'auto',units:'km',sound:false,reducedMotion:typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches,layers:{D:false,E:false,F2:true}};
const app={state:null,screen:'title',settings:defaults,globe:null,busy:false,hasPlayed:false,roundsFinished:0,stats:{},countdown:null,adEvents:[]};
const ui=new UI(),audio=new RadioAudio();let storageWarning=false,reward=null;
/** The in-game setting, or the system preference: either one turns the comet and count-up off. */
const reducedMotion=()=>Boolean(app.settings.reducedMotion||(typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches));
function read(key,fallback){try{return JSON.parse(localStorage.getItem('skywave:'+key))??fallback;}catch{return fallback;}}
function write(key,value){try{localStorage.setItem('skywave:'+key,JSON.stringify(value));return true;}catch{if(!storageWarning){storageWarning=true;ui.toast('Browser storage is unavailable. This round will not survive a reload.');}return false;}}
function validSave(s,day){return s?.version===1&&s.mode==='daily'&&s.day?.key===day.key&&s.day?.seed===day.seed&&Array.isArray(s.log)&&s.log.length<=144&&Array.isArray(s.worked)&&s.worked.length<=10&&Number.isInteger(s.minute)&&s.minute>=0&&s.minute<=1440&&day.targets.some(t=>t.id===s.selected)&&antennaAllowed(s.rig?.antenna,s.rig?.band)&&Object.hasOwn(CONFIG.modes,s.rig?.mode)&&CONFIG.powers.includes(s.rig?.power);}
function persist(){if(app.state?.mode!=='daily')return;write('round:'+app.state.day.key,app.state);try{const keys=Object.keys(localStorage).filter(k=>k.startsWith('skywave:round:')).sort().reverse();keys.slice(7).forEach(k=>localStorage.removeItem(k));}catch{}}
function applySettings(){ui.setSettings(app.settings);audio.setEnabled(BUILD_PHASE>1&&app.settings.sound);app.globe?.updateSettings(app.settings);write('settings',app.settings);if(app.state&&app.screen==='operating')ui.operating(app.state,app.busy);}
function today(){return generateDay(new Date());}
function refreshTitle(){const d=today(),saved=read('round:'+d.key,null);$('header-day').textContent=`#${d.number} / ${d.key} UTC`;$('play-daily').textContent=validSave(saved,d)?saved.finished?'See today\'s result':'Carry on with today\'s round':'Play today\'s round';}
function setState(state){app.state=state;persist();}
function navigate(screen,push=true){if(!['title','briefing','operating','results'].includes(screen))screen='title';if(screen!=='title'&&!app.state)screen='title';if(screen==='operating'&&app.state?.finished)screen='results';app.screen=screen;if(push)history.pushState({screen},'',`#${screen}`);ui.route(screen);app.globe?.setScreen(screen);
  if(screen!=='title')syncGlobeDay();
  if(screen!=='operating')reward?.hide();
  if(screen==='title'){refreshTitle();app.globe?.clearDay();app.globe?.setTime(new Date(`${utcDateKey()}T12:00:00Z`));app.globe?.focus({lat:18,lon:5});}
  if(screen==='briefing')ui.briefing(app.state);
  if(screen==='operating'){ui.operating(app.state,app.busy);app.globe?.setTime(gameDate(app.state));}
  if(screen==='results'){ui.results(app.state,app.stats);app.globe?.setResults(app.state);}
  scheduleCountdown();requestAnimationFrame(()=>app.globe?.resize());
}
/** Put the current round's day on the globe (pins, selection, the last call's arcs only). */
function showDayOnGlobe(globe,state){globe.setDay(state.day);globe.setTime(gameDate(state));globe.select(state.selected);const last=state.log.at(-1);if(last&&!state.finished)globe.addAttempt(last);}
function syncGlobeDay(){if(app.globe&&app.state&&app.globe.day!==app.state.day)showDayOnGlobe(app.globe,app.state);}
function loadDay(state){setState(state);ui.setupDay(state);if(app.globe)showDayOnGlobe(app.globe,state);}
function openDaily(){if(app.busy)return;const d=today(),saved=read('round:'+d.key,null);loadDay(validSave(saved,d)?saved:openingState(createGame(d)));app.hasPlayed=true;if(app.state.finished){app.stats=updateStats(app.stats,app.state);write('stats',app.stats);navigate('results');}else if(app.state.minute>(app.state.startMinute||0)||app.state.log.length)navigate('operating');else{navigate('briefing');maybeTutorial();}}
function maybeTutorial(){if(BUILD_PHASE>1&&!read('tutorialSeen',false)){ui.tutorialStep(0);$('tutorial-dialog').showModal();}}
function closeTutorial(){write('tutorialSeen',true);$('tutorial-dialog').close();}
function beginPractice(){const date=$('practice-date').value;if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date))){ui.toast('Choose a valid practice date.');return;}const seed=crypto.getRandomValues(new Uint32Array(1))[0];loadDay(openingState(createGame(generateDay(date,seed,{sfi:Number($('practice-sfi').value),kp:Number($('practice-kp').value)}),'practice')));$('practice-dialog').close();app.hasPlayed=true;navigate('briefing');}
function selectTarget(id){if(app.busy||!app.state||!app.state.day.targets.some(t=>t.id===id))return;setState({...app.state,selected:id});ui.operating(app.state);app.globe?.select(id);}
function rigChange(change){if(app.busy||!app.state||app.state.finished)return;const rig={...app.state.rig,...change};if(!antennaAllowed(rig.antenna,rig.band)){ui.toast('That antenna cannot use this band. Change antenna first.');return;}if(rig.band==='30m'&&rig.mode==='SSB'){rig.mode='CW';ui.toast('30m is CW / FT8 only. Mode changed to CW.');}setState({...app.state,rig});ui.operating(app.state);}
function advance(minute){if(app.busy||!app.state||app.state.finished)return;setState(advanceTime(app.state,minute));app.globe?.setTime(gameDate(app.state));if(app.state.minute>=1440)finishRound();else ui.operating(app.state);}
function visibleDelay(duration){return new Promise(resolve=>{if(!duration){resolve();return;}let elapsed=0,previous=0;const tick=time=>{if(previous)elapsed+=Math.min(60,time-previous);previous=time;if(elapsed>=duration)resolve();else requestAnimationFrame(tick);};requestAnimationFrame(tick);});}
async function transmit(){if(app.busy||!app.state)return;const {state,entry}=callTarget(app.state);if(!entry)return;app.busy=true;setState(state);app.globe?.addAttempt(entry);reward?.handle(entry,state);ui.operating(state,true);audio.transmit(entry.rig.mode,entry.result.ok);await visibleDelay(reducedMotion()?0:850+(state.finished&&entry.result.ok?1300:0));app.busy=false;app.globe?.setTime(gameDate(state));ui.operating(state);if(state.finished)finishRound();else $('feedback').scrollIntoView({block:'nearest',behavior:app.settings.reducedMotion?'auto':'smooth'});}
function finishRound(){if(!app.state||app.busy)return;if(!app.state.finished)app.roundsFinished++;setState({...app.state,finished:true});if(app.state.mode==='daily'){app.stats=updateStats(app.stats,app.state);write('stats',app.stats);}navigate('results');}
/** Ad breaks only at natural breaks: NEXT ROUND after a practice result, and RETURN TO TITLE from the
 * results screen once the session has already finished a round before this one. Never mid-round, never
 * on the first play of a session. */
function naturalBreak(name,done){const allowed=BUILD_PHASE>1&&app.hasPlayed&&app.screen==='results'&&(name==='practice-next'||app.roundsFinished>1);if(!allowed){done();return;}if(!['practice-next','return-title'].includes(name))throw Error('Invalid ad break location');app.adEvents.push(name);adBreak({type:'next',name,beforeAd:()=>{audio.pause();app.globe?.pause(true);},afterAd:()=>{if(!document.hidden){audio.resume();app.globe?.pause(false);}done();}});}
function returnTitle(){if(app.busy)return;persist();naturalBreak('return-title',()=>navigate('title'));}
async function copyText(text){try{if(navigator.clipboard&&window.isSecureContext){await navigator.clipboard.writeText(text);return true;}}catch{}return false;}
function showShareText(text){$('share-text').value=text;$('share-dialog').showModal();$('share-text').focus();$('share-text').select();}
async function share(native=false){if(!app.state)return;const text=shareText(app.state,LINKS.site||new URL('../',import.meta.url).href);if(native&&navigator.share){try{await navigator.share({title:'Skywave',text});return;}catch(e){if(e.name==='AbortError')return;}}if(await copyText(text)){ui.toast('Result copied to clipboard.');return;}showShareText(text);}
function confirmFinish(){if(app.busy||!app.state||app.state.finished)return;const left=app.state.day.targets.length-app.state.worked.length;$('confirm-copy').textContent=left?`${left} station${left===1?'':'s'} not worked yet will be logged as missed, and you can\'t come back to this day.`:'You\'ve worked every station. Close the log and see your result.';$('confirm-dialog').showModal();$('confirm-cancel').focus();}
function scheduleCountdown(){clearTimeout(app.countdown);if(document.hidden||app.screen!=='results'||app.state?.mode!=='daily')return;const now=new Date(),end=Date.parse(app.state.day.key)+86400000,seconds=Math.max(0,Math.ceil((end-now)/1000));if(!seconds){$('tomorrow').textContent='Today\'s new round is ready. Go back to the start to play it.';return;}const h=Math.floor(seconds/3600),m=Math.floor(seconds%3600/60),s=seconds%60;$('tomorrow').textContent=`Next round in ${[h,m,s].map(n=>String(n).padStart(2,'0')).join(':')}`;app.countdown=setTimeout(scheduleCountdown,1000);}
function bind(){
  $('play-daily').addEventListener('click',openDaily);$('play-practice').addEventListener('click',()=>{$('practice-dialog').showModal();});$('begin-practice').addEventListener('click',beginPractice);
  $('start-operating').addEventListener('click',()=>{navigate('operating');audio.unlock();});$('target-select').addEventListener('change',e=>selectTarget(e.target.value));$('antenna-select').addEventListener('change',e=>rigChange({antenna:e.target.value}));$('bearing-slider').addEventListener('input',e=>rigChange({bearing:Number(e.target.value)}));$('time-slider').addEventListener('change',e=>advance(Number(e.target.value)));
  $('wait-window').addEventListener('click',()=>advance(selectedTarget(app.state).start));$('aim-yagi').addEventListener('click',()=>rigChange({bearing:Math.round(initialBearing(app.state.day.qth,selectedTarget(app.state)))%360}));$('call-button').addEventListener('click',transmit);
  $('finish-day').addEventListener('click',confirmFinish);$('confirm-cancel').addEventListener('click',()=>$('confirm-dialog').close());$('confirm-ok').addEventListener('click',()=>{$('confirm-dialog').close();finishRound();});
  $('share-copy').addEventListener('click',async()=>{const text=$('share-text').value;$('share-text').select();let ok=await copyText(text);if(!ok){try{ok=document.execCommand('copy');}catch{ok=false;}}ui.toast(ok?'Result copied to clipboard.':'Select the text and copy it with Ctrl+C / Cmd+C.');});
  $('settings-open').addEventListener('click',()=>{$('settings-dialog').showModal();});$('quality-select').addEventListener('change',e=>{app.settings={...app.settings,quality:e.target.value};applySettings();});$('units-select').addEventListener('change',e=>{app.settings={...app.settings,units:e.target.value};applySettings();if(app.screen==='results')ui.results(app.state,app.stats);});$('sound-setting').addEventListener('change',e=>{app.settings={...app.settings,sound:e.target.checked};applySettings();audio.unlock();});$('motion-setting').addEventListener('change',e=>{app.settings={...app.settings,reducedMotion:e.target.checked};applySettings();});
  $('fly-target').addEventListener('click',()=>app.globe?.focusPath?app.globe.focusPath(.85):app.globe?.focus(selectedTarget(app.state)));$('fly-home').addEventListener('click',()=>app.globe?.focusPath?app.globe.focusPath(.15):app.globe?.focus(app.state.day.qth));$('layer-toggle').addEventListener('click',()=>{app.settings.layers.F2=!app.settings.layers.F2;applySettings();});
  $('sheet-toggle').addEventListener('click',()=>{const full=$('radio-panel').classList.toggle('expanded');$('sheet-toggle').setAttribute('aria-expanded',String(full));$('sheet-toggle').innerHTML=full?'Hide radio desk <span aria-hidden="true">\u2304</span>':'Show radio desk <span aria-hidden="true">\u2303</span>';});
  $('tutorial-open').addEventListener('click',()=>{ui.tutorialStep(0);$('tutorial-dialog').showModal();});$('tutorial-next').addEventListener('click',()=>{if(ui.tutorialIndex===2)closeTutorial();else ui.tutorialStep(ui.tutorialIndex+1);});$('tutorial-skip').addEventListener('click',closeTutorial);
  $('practice-sfi').addEventListener('input',e=>{$('practice-sfi-value').textContent=e.target.value;});$('practice-kp').addEventListener('input',e=>{$('practice-kp-value').textContent=e.target.value;});
  $('share-result').addEventListener('click',()=>share(true));$('copy-result').addEventListener('click',()=>share(false));$('next-practice').addEventListener('click',()=>naturalBreak('practice-next',()=>{$('practice-dialog').showModal();}));
  document.addEventListener('click',e=>{const el=e.target.closest('button');if(!el||el.disabled)return;if(el.dataset.close)$(el.dataset.close).close();if(el.dataset.action==='title')returnTitle();if(el.dataset.band)rigChange({band:el.dataset.band});if(el.dataset.mode)rigChange({mode:el.dataset.mode});if(el.dataset.power)rigChange({power:Number(el.dataset.power)});if(el.dataset.target)selectTarget(el.dataset.target);if(el.dataset.advance)advance(app.state.minute+Number(el.dataset.advance));if(el.dataset.hint&&!app.busy){setState(revealHint(app.state,el.dataset.hint));ui.operating(app.state);}});
  document.querySelectorAll('[data-layer]').forEach(e=>e.addEventListener('change',()=>{app.settings.layers[e.dataset.layer]=e.checked;applySettings();}));
  document.addEventListener('keydown',e=>{if(app.screen!=='operating'||app.busy||document.querySelector('dialog[open]')||['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName)||e.ctrlKey||e.metaKey||e.altKey)return;const index='1234567890-'.indexOf(e.key);if(index>=0){e.preventDefault();rigChange({band:BANDS[index].id});}else if(e.key.toLowerCase()==='c'){e.preventDefault();transmit();}else if(e.key==='ArrowRight'||e.key==='ArrowUp'){e.preventDefault();advance(app.state.minute+(e.key==='ArrowUp'?60:10));}else if(e.key==='ArrowLeft'||e.key==='ArrowDown'){e.preventDefault();ui.toast('The operating clock only moves forward.');}});
  document.addEventListener('visibilitychange',()=>{app.globe?.pause(document.hidden);if(document.hidden){audio.pause();ui.pause();clearTimeout(app.countdown);persist();}else{audio.resume();scheduleCountdown();refreshTitle();}});
  window.addEventListener('popstate',()=>navigate(location.hash.slice(1)||'title',false));window.addEventListener('pagehide',persist);
}
async function initGlobe(){let timeout;try{const module=await Promise.race([import('./globe.js'),new Promise((_,reject)=>{timeout=setTimeout(()=>reject(Error('CDN timed out')),9000);})]);clearTimeout(timeout);app.globe=await module.createGlobe($('globe-stage'),{settings:app.settings,phase:BUILD_PHASE,onSelect:selectTarget,onProgress:p=>{$('load-progress').value=p;},onStatus:text=>{$('renderer-status').textContent=text;}});}catch{clearTimeout(timeout);$('load-message').textContent='Starting accessible fallback view';$('globe-stage').replaceChildren();try{const {createFallback}=await import('./fallback.js');app.globe=await createFallback($('globe-stage'),{settings:app.settings,onSelect:selectTarget,onProgress:p=>{$('load-progress').value=p;},onStatus:text=>{$('renderer-status').textContent=text;}});}catch{$('renderer-status').textContent='Map unavailable, but the radio desk still works';}}
  $('loading').hidden=true;if(!app.globe)return;const state=app.state;app.globe.setScreen(app.screen);if(state&&app.screen!=='title'){showDayOnGlobe(app.globe,state);if(app.screen==='results')app.globe.setResults(state);}else{app.globe.setTime(new Date(`${utcDateKey()}T12:00:00Z`));app.globe.focus({lat:18,lon:5},true);}if(document.hidden)app.globe.pause(true);
}
export function getState(){return app.state?JSON.parse(JSON.stringify(app.state)):null;}
export function getDiagnostics(){const memory=app.globe?.renderer?.info?.memory;return {phase:BUILD_PHASE,screen:app.screen,busy:app.busy,renderer:app.globe?.tier||'none',fps:app.globe?.fps||null,adEvents:[...app.adEvents],effects:app.globe?.effectCount??0,geometries:memory?.geometries??null,rewards:reward?.fired??0};}
function boot(){document.querySelectorAll('[data-link]').forEach(e=>{const url=LINKS[e.dataset.link];if(url){e.href=url;e.rel='noopener noreferrer';e.target='_blank';}else e.hidden=true;});document.body.classList.toggle('lite',BUILD_PHASE===1);
  if(!$('globe-stage')){if($('night-provenance'))fetch('./assets/textures/provenance.json').then(r=>r.json()).then(data=>{if(data.authenticNight){$('night-provenance').textContent='NASA Black Marble night imagery is installed. See CREDITS.md for source attribution.';}}).catch(()=>{});return;}
  ui.init();reward=new QsoReward({card:$('qso-card'),counter:ui.score,globe:()=>app.globe,reducedMotion,escape:escapeHTML});const savedSettings=read('settings',{});app.settings={...defaults,...savedSettings,layers:{...defaults.layers,...savedSettings.layers}};if(!['auto','low','medium','high'].includes(app.settings.quality))app.settings.quality='auto';if(!['km','mi'].includes(app.settings.units))app.settings.units='km';app.stats=read('stats',{});ui.setSettings(app.settings);audio.setEnabled(BUILD_PHASE>1&&app.settings.sound);$('practice-date').value=utcDateKey();bind();refreshTitle();
  const requested=location.hash.slice(1),validScreens=['title','briefing','operating','results'];if(validScreens.includes(requested)&&requested!=='title'){const day=today(),saved=read('round:'+day.key,null);if(validSave(saved,day)){app.state=saved;ui.setupDay(saved);}}
  navigate(validScreens.includes(requested)?requested:'title',false);initGlobe();
}
boot();
