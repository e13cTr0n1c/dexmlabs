/** Canvas safety net for a blocked CDN / absent WebGL2. Not the primary 3D renderer.
 * Game rules are identical. This mode is explicitly labelled in the interface. */
import {toVector,fromVector,subsolarPoint} from './solar.js';
import {intermediatePoint,isPathResult,CONFIG,greatCircleDistance} from './propagation.js';
import {cometFraction,COMET_TRAVEL,REWARD} from './reward.js';
export async function createFallback(container,options={}) {
  const g=new CanvasGlobe(container,options);await g.init();return g;
}
class CanvasGlobe {
  constructor(container,{settings={},onSelect=()=>{},onProgress=()=>{},onStatus=()=>{}}){this.container=container;this.settings=settings;this.onSelect=onSelect;this.onProgress=onProgress;this.onStatus=onStatus;this.canvas=document.createElement('canvas');this.canvas.setAttribute('role','img');this.canvas.setAttribute('aria-label','Earth fallback view. Drag to rotate; select stations using the radio panel.');this.canvas.className='fallback-canvas';container.append(this.canvas);this.ctx=this.canvas.getContext('2d');this.lon=0;this.lat=22;this.paths=[];this.date=new Date();this.screen='title';this.paused=false;this.tier='fallback';this.fps=null;this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(container);let drag=null;this.canvas.addEventListener('pointerdown',e=>{drag={x:e.clientX,y:e.clientY,lon:this.lon,lat:this.lat};this.canvas.setPointerCapture(e.pointerId);});this.canvas.addEventListener('pointermove',e=>{if(drag){this.lon=drag.lon-(e.clientX-drag.x)*.4;this.lat=Math.max(-80,Math.min(80,drag.lat+(e.clientY-drag.y)*.3));this.render();}});this.canvas.addEventListener('pointerup',e=>{if(drag&&Math.hypot(e.clientX-drag.x,e.clientY-drag.y)<8){const rect=this.canvas.getBoundingClientRect(),x=e.clientX-rect.left,y=e.clientY-rect.top;const hit=(this.pinPositions||[]).find(p=>Math.hypot(p.x-x,p.y-y)<20);if(hit)this.onSelect(hit.id);}drag=null;});}
  async init(){const images=await Promise.all(['day','night'].map(type=>new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>{const c=document.createElement('canvas');c.width=1024;c.height=512;const ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,0,1024,512);resolve(ctx.getImageData(0,0,1024,512).data);};image.onerror=reject;image.src=new URL(`../assets/textures/earth_${type}_2k.jpg`,import.meta.url).href;})));[this.dayPixels,this.nightPixels]=images;this.onProgress(1);this.container.classList.add('loaded');this.resize();this.onStatus('2D map (the 3D library didn\'t load)');}
  resize(){this.canvas.width=Math.max(1,this.container.clientWidth);this.canvas.height=Math.max(1,this.container.clientHeight);this.render();}
  basis(){const a=this.lat*Math.PI/180,b=this.lon*Math.PI/180;return {front:{x:Math.cos(a)*Math.cos(b),y:Math.sin(a),z:-Math.cos(a)*Math.sin(b)},right:{x:-Math.sin(b),y:0,z:-Math.cos(b)},up:{x:-Math.sin(a)*Math.cos(b),y:Math.cos(a),z:Math.sin(a)*Math.sin(b)}};}
  project(point,alt=1){const v=toVector(point),b=this.axes;return {x:this.cx+this.radius*alt*(v.x*b.right.x+v.y*b.right.y+v.z*b.right.z),y:this.cy-this.radius*alt*(v.x*b.up.x+v.y*b.up.y+v.z*b.up.z),front:v.x*b.front.x+v.y*b.front.y+v.z*b.front.z};}
  render(){if(this.paused||!this.dayPixels)return;const ctx=this.ctx,w=this.canvas.width,h=this.canvas.height;ctx.clearRect(0,0,w,h);this.cx=w*.51;this.cy=h*.48;this.radius=Math.min(w*.38,h*.39);this.axes=this.basis();const size=480,r=size/2,off=document.createElement('canvas');off.width=off.height=size;const oc=off.getContext('2d'),im=oc.createImageData(size,size),out=im.data,b=this.axes,sun=toVector(subsolarPoint(this.date));
    for(let y=0;y<size;y++)for(let x=0;x<size;x++){const dx=(x-r)/r,dy=-(y-r)/r,z2=1-dx*dx-dy*dy;if(z2<0)continue;const z=Math.sqrt(z2),v={x:b.right.x*dx+b.up.x*dy+b.front.x*z,y:b.right.y*dx+b.up.y*dy+b.front.y*z,z:b.right.z*dx+b.up.z*dy+b.front.z*z};const lon=Math.atan2(-v.z,v.x),lat=Math.asin(v.y),tx=Math.min(1023,Math.max(0,Math.floor((lon+Math.PI)/(2*Math.PI)*1024))),ty=Math.min(511,Math.max(0,Math.floor((Math.PI/2-lat)/Math.PI*512))),ti=(ty*1024+tx)*4,i=(y*size+x)*4,cos=v.x*sun.x+v.y*sun.y+v.z*sun.z,m=Math.max(0,Math.min(1,(cos+.10)/.22)),light=.38+.7*Math.sqrt(Math.max(0,cos));for(let k=0;k<3;k++)out[i+k]=Math.min(255,this.dayPixels[ti+k]*light*m+(this.nightPixels[ti+k]*1.7+this.dayPixels[ti+k]*.02)*(1-m));out[i+3]=255;}
    oc.putImageData(im,0,0);ctx.save();ctx.shadowColor='#34778a';ctx.shadowBlur=22;ctx.drawImage(off,this.cx-this.radius,this.cy-this.radius,this.radius*2,this.radius*2);ctx.restore();
    ctx.strokeStyle='#50727a';ctx.globalAlpha=.14;ctx.lineWidth=1;for(let lat=-60;lat<=60;lat+=30)this.line(Array.from({length:181},(_,i)=>({lat,lon:-180+i*2})));for(let lon=-180;lon<180;lon+=30)this.line(Array.from({length:91},(_,i)=>({lat:-90+i*2,lon})));ctx.globalAlpha=1;
    if(this.settings.layers?.F2){ctx.beginPath();ctx.arc(this.cx,this.cy,this.radius*1.377,0,Math.PI*2);ctx.strokeStyle='#6b87914d';ctx.stroke();}
    for(const entry of this.paths){const color=entry.result.qsb?'#ffbf69':entry.result.ok?'#d6ff00':'#ff7272';ctx.strokeStyle=color;ctx.lineWidth=1.7;const t=this.day?.targets.find(t=>t.id===entry.targetId);if(!t)continue;ctx.globalAlpha=entry.ghost?.22:1;const ground=entry.result.mechanism==='Ground wave',hops=entry.result.hops?.length?entry.result.hops:[{from:this.day.qth,to:t,heightKm:CONFIG.f2HeightKm}];for(const hop of hops){const lift=ground?.01:(hop.heightKm>0?hop.heightKm:CONFIG.f2HeightKm)/CONFIG.earthRadiusKm*8;this.line(Array.from({length:65},(_,i)=>({...intermediatePoint(hop.from,hop.to,i/64),alt:1.004+Math.sin(Math.PI*i/64)*lift})));}ctx.globalAlpha=1;}
    this.pinPositions=[];if(this.day)for(const p of [{...this.day.qth,id:'home',callsign:'Your QTH'},...this.day.targets]){const q=this.project(p,1.01);if(q.front<.04)continue;const active=p.id===this.selected||p.id==='home';ctx.fillStyle=active?'#d6ff00':'#8db7c0';ctx.beginPath();ctx.arc(q.x,q.y,active?4:3,0,Math.PI*2);ctx.fill();ctx.strokeStyle=ctx.fillStyle;ctx.globalAlpha=.32;ctx.beginPath();ctx.arc(q.x,q.y,active?10:7,0,Math.PI*2);ctx.stroke();ctx.globalAlpha=1;if(active){ctx.font='11px monospace';ctx.fillText(p.callsign,q.x+13,q.y-8);}if(p.id!=='home')this.pinPositions.push({...q,id:p.id});}
  }
  line(points){const ctx=this.ctx;ctx.beginPath();let started=false;for(const p of points){const q=this.project(p,p.alt||1.003);if(q.front<0){started=false;continue;}if(!started){ctx.moveTo(q.x,q.y);started=true;}else ctx.lineTo(q.x,q.y);}ctx.stroke();}
  setDay(day){this.day=day;this.paths=[];this.lon=day.qth.lon;this.lat=day.qth.lat;this.render();}
  clearDay(){this.clearComets();this.day=null;this.selected=null;this.paths=[];this.render();}
  clearArcs(){this.clearComets();this.paths=[];this.render();}
  focusPath(fraction=.5){const t=this.day?.targets.find(t=>t.id===this.selected);if(!t)return;const m=intermediatePoint(this.day.qth,t,fraction);this.lon=m.lon;this.lat=m.lat;this.render();}
  setTime(date){this.date=date;this.render();}
  setScreen(screen){this.screen=screen;this.render();}
  select(id){this.selected=id;const t=this.day?.targets.find(t=>t.id===id);if(t){const m=intermediatePoint(this.day.qth,t,.35);this.lon=m.lon;this.lat=m.lat;}this.render();}
  focus(p){this.lon=p.lon;this.lat=p.lat;this.render();}
  /** Current call only, plus a faded ghost of the previous one; schedule failures draw nothing. */
  addAttempt(e){const previous=this.paths.filter(p=>!p.ghost).at(-1);this.paths=previous?[{...previous,ghost:true}]:[];if(e&&isPathResult(e.result))this.paths.push(e);this.render();}
  setResults(){this.clearComets();this.paths=[];this.render();}
  /** 2D version of the QSO comet: a short-lived overlay canvas, removed when done. */
  celebrate(entry,duration=REWARD.cometMs){if(this.settings.reducedMotion||!this.day||!entry?.result?.ok||!this.axes)return false;const t=this.day.targets.find(t=>t.id===entry.targetId);if(!t)return false;this.clearComets();
    const c=document.createElement('canvas');c.className='fallback-comet';c.width=this.canvas.width;c.height=this.canvas.height;c.setAttribute('aria-hidden','true');this.container.append(c);const ctx=c.getContext('2d'),start=performance.now(),qth=this.day.qth,peak=.06+.3*Math.min(1,greatCircleDistance(qth,t)/CONFIG.earthRadiusKm/1.6);
    const at=f=>this.project(intermediatePoint(qth,t,f),1.034+peak*Math.sin(Math.PI*f));
    const step=now=>{const k=(now-start)/duration;ctx.clearRect(0,0,c.width,c.height);if(k>=1){this.clearComets();return;}const s=Math.max(0,(k-COMET_TRAVEL)/(1-COMET_TRAVEL)),fade=k<.06?k/.06:1-s*s;ctx.globalCompositeOperation='lighter';
      for(let i=47;i>=0;i--){const q=at(cometFraction(k-i*.007));if(q.front<-.2)continue;const r=i?2+9*(1-i/48):16+40*s,g=ctx.createRadialGradient(q.x,q.y,0,q.x,q.y,r);g.addColorStop(0,`rgba(255,255,230,${fade*(i?(1-i/48)**1.4:1)})`);g.addColorStop(.35,`rgba(214,255,0,${fade*(i?.5*(1-i/48)**1.4:.7)})`);g.addColorStop(1,'rgba(214,255,0,0)');ctx.fillStyle=g;ctx.beginPath();ctx.arc(q.x,q.y,r,0,Math.PI*2);ctx.fill();}
      this.cometFrame=requestAnimationFrame(step);};
    this.comet=c;this.cometFrame=requestAnimationFrame(step);return true;}
  clearComets(){cancelAnimationFrame(this.cometFrame);this.cometFrame=null;this.comet?.remove();this.comet=null;}
  get effectCount(){return this.comet?1:0;}
  updateSettings(settings){this.settings=settings;this.render();}
  pause(p){this.paused=p;if(!p)this.render();}
  dispose(){this.resizeObserver.disconnect();this.canvas.remove();}
}
