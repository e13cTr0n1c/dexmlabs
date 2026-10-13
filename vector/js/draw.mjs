import {RUNWAY,EXITS} from './sim.mjs';
const C={ink:'#d6e7de',dim:'#698188',grid:'#1b3037',green:'#c9f75b',cyan:'#8cd9ff',amber:'#ffbf69',red:'#ff777a'};
export function mapView(view){const size=Math.max(1,Math.min(view.width-46,view.height-40));return {size,x:(view.width-size)/2,y:(view.height-size)/2,scale:size/100};}
export function toWorld(view,x,y){const m=mapView(view);return {x:(x-m.x)/m.scale,y:(y-m.y)/m.scale};}
export function drawVector(view,sim,selected,draft=[],reduced=false){
  const {ctx:c,width:w,height:h}=view,m=mapView(view),s=m.scale,P=(x,y)=>[m.x+x*s,m.y+y*s];
  c.clearRect(0,0,w,h);c.fillStyle='#081217';c.fillRect(0,0,w,h);
  const bg=c.createRadialGradient(w*.48,h*.5,20,w*.48,h*.5,w*.6);bg.addColorStop(0,'#11262a');bg.addColorStop(1,'#071016');c.fillStyle=bg;c.fillRect(0,0,w,h);
  c.save();c.beginPath();c.rect(m.x,m.y,m.size,m.size);c.clip();
  // A fictional coastline and land contour give the sector a sense of place.
  const coast=[[0,0],[31,0],[29,7],[33,16],[26,24],[31,33],[24,38],[25,46],[16,52],[21,61],[13,69],[18,77],[9,87],[11,100],[0,100]];
  c.beginPath();coast.forEach(([x,y],i)=>{const p=P(x,y);i?c.lineTo(...p):c.moveTo(...p);});c.closePath();c.fillStyle='#172b29';c.fill();c.strokeStyle='#29483d';c.lineWidth=1;c.stroke();
  c.strokeStyle='#223e36';c.lineWidth=.6;for(let j=0;j<3;j++){c.beginPath();coast.slice(1,-1).forEach(([x,y],i)=>{const p=P(x-4-j*6,y);i?c.lineTo(...p):c.moveTo(...p);});c.stroke();}
  c.strokeStyle=C.grid;c.lineWidth=.6;for(let i=0;i<=100;i+=10){c.beginPath();c.moveTo(...P(i,0));c.lineTo(...P(i,100));c.moveTo(...P(0,i));c.lineTo(...P(100,i));c.stroke();}
  const [cx,cy]=P(50,50);
  for(const r of [15,30,45]){c.strokeStyle=r===45?'#355158':'#233c43';c.beginPath();c.arc(cx,cy,r*s,0,Math.PI*2);c.stroke();}
  c.setLineDash([2,5]);c.strokeStyle='#375452';c.beginPath();c.arc(...P(RUNWAY.x,RUNWAY.y),16*s,0,Math.PI*2);c.stroke();c.setLineDash([]);
  if(!reduced){const angle=sim.time*.24-.8;for(let i=0;i<12;i++){c.beginPath();c.moveTo(cx,cy);c.arc(cx,cy,45*s,angle-i*.035,angle-(i-1)*.035);c.closePath();c.fillStyle=`rgba(173,235,102,${.004+(12-i)*.0013})`;c.fill();}c.strokeStyle='#72934c66';c.beginPath();c.moveTo(cx,cy);c.lineTo(cx+Math.cos(angle)*45*s,cy+Math.sin(angle)*45*s);c.stroke();}
  // Landing corridor, drawn underneath traffic and its labels.
  c.fillStyle='#c9f75b08';c.fillRect(...P(51,52),33*s,8*s);c.strokeStyle='#a0bb6260';c.setLineDash([4,5]);c.beginPath();c.moveTo(...P(51,56));c.lineTo(...P(86,56));c.stroke();c.setLineDash([]);
  c.strokeStyle='#c9f75b85';c.lineWidth=1;c.beginPath();c.arc(...P(73,56),3.5*s,0,Math.PI*2);c.stroke();c.beginPath();c.moveTo(...P(84,54));c.lineTo(...P(84,58));c.stroke();
  c.fillStyle='#9bba76';c.font='9px ui-monospace,monospace';c.textAlign='center';c.fillText('GATE',...P(73,49));c.fillStyle='#738e7e';c.fillText('270 / 2,000 FT / 180 KT',...P(69,65));
  const runway=P(42,55);c.fillStyle='#bdccbb';c.fillRect(runway[0],runway[1],9*s,2*s);c.fillStyle='#122325';for(let i=0;i<7;i++)c.fillRect(runway[0]+i*1.3*s,runway[1]+.65*s,.7*s,.7*s);
  c.textAlign='right';c.fillStyle='#d1ddc8';c.font='bold 10px ui-monospace,monospace';c.fillText('RWY 27',...P(40,57));
  c.font='9px ui-monospace,monospace';
  Object.entries(EXITS).forEach(([name,e])=>{let p=P(e.x,e.y);c.strokeStyle=C.cyan;c.fillStyle='#09151c';c.beginPath();c.moveTo(p[0],p[1]-5);c.lineTo(p[0]+5,p[1]);c.lineTo(p[0],p[1]+5);c.lineTo(p[0]-5,p[1]);c.closePath();c.fill();c.stroke();c.textAlign=e.x===0?'left':e.x===100?'right':'center';c.fillStyle='#93b5c4';c.fillText(name,p[0]+(e.x===0?9:e.x===100?-9:0),p[1]+(e.y===0?16:e.y===100?-12:-10));});
  if(sim.weather){const q=sim.weather,p=P(q.x,q.y);for(let i=3;i>=1;i--){c.fillStyle=`rgba(255,181,77,${.04+i*.02})`;c.beginPath();c.ellipse(p[0],p[1],q.r*s*i/3,q.r*s*i/3*.75,.3,0,Math.PI*2);c.fill();}c.strokeStyle='#ffc06080';c.setLineDash([3,4]);c.beginPath();c.arc(p[0],p[1],q.r*s,0,Math.PI*2);c.stroke();c.setLineDash([]);c.fillStyle=C.amber;c.textAlign='center';c.fillText('WX / AVOID',p[0],p[1]+3);}
  for(const a of sim.aircraft){const col=a.alert?C.red:a.priority?C.amber:a.kind==='transit'?C.cyan:C.green,p=P(a.x,a.y);a.trail.forEach((pt,i)=>{c.fillStyle=col;c.globalAlpha=.12+.3*i/a.trail.length;const z=P(pt.x,pt.y);c.fillRect(z[0]-1,z[1]-1,2,2);});c.globalAlpha=1;
    if(a.id===selected&&a.route.length){c.strokeStyle=C.green;c.lineWidth=1;c.setLineDash([5,4]);c.beginPath();c.moveTo(...p);a.route.forEach(t=>c.lineTo(...P(t.x,t.y)));c.stroke();c.setLineDash([]);a.route.forEach((t,i)=>{const z=P(t.x,t.y);c.strokeStyle='#c9f75b';c.fillStyle='#0a1920';c.beginPath();c.arc(...z,4,0,Math.PI*2);c.fill();c.stroke();});}
    const q=a.heading*Math.PI/180;
    if(a.id===selected){c.strokeStyle='#c9f75b88';c.lineWidth=1;c.beginPath();c.arc(...p,16,0,Math.PI*2);c.stroke();c.setLineDash([3,5]);c.beginPath();c.moveTo(...p);c.lineTo(p[0]+Math.sin(q)*a.speed/180*s*9,p[1]-Math.cos(q)*a.speed/180*s*9);c.stroke();c.setLineDash([]);}
    if(a.alert||a.warning){c.strokeStyle=a.alert?C.red:C.amber;c.lineWidth=1;c.setLineDash([2,3]);c.beginPath();c.arc(...p,22,0,Math.PI*2);c.stroke();c.setLineDash([]);}
    c.save();c.translate(...p);c.rotate(q);c.beginPath();c.moveTo(0,-8);c.lineTo(2,-2);c.lineTo(8,2);c.lineTo(8,4);c.lineTo(2,2);c.lineTo(2,7);c.lineTo(4,9);c.lineTo(-4,9);c.lineTo(-2,7);c.lineTo(-2,2);c.lineTo(-8,4);c.lineTo(-8,2);c.lineTo(-2,-2);c.closePath();c.fillStyle=col;c.fill();c.restore();
    const right=a.x>76,labelX=p[0]+(right?-17:17),labelY=p[1]-14;
    c.textAlign=right?'right':'left';c.font=`bold ${w<430?9:11}px ui-monospace,monospace`;c.fillStyle=col;c.fillText(a.callsign+(a.priority?' !':''),labelX,labelY);c.font=`${w<430?9:10}px ui-monospace,monospace`;c.fillStyle='#c4d6ce';c.fillText(`${Math.round(a.alt/100).toString().padStart(3,'0')} / ${Math.round(a.speed)}${a.final?' FINAL':''}`,labelX,labelY+13);
  }
  for(const [key,pair]of sim.pairs){const [ai,bi]=key.split(':'),a=sim.aircraft.find(a=>a.id===ai),b=sim.aircraft.find(a=>a.id===bi);if(!a||!b)continue;c.strokeStyle=C.red;c.setLineDash([3,4]);c.beginPath();c.moveTo(...P(a.x,a.y));c.lineTo(...P(b.x,b.y));c.stroke();c.setLineDash([]);}
  if(draft.length){c.strokeStyle='#f4ffc6';c.lineWidth=2;c.setLineDash([4,4]);c.beginPath();draft.forEach((p,i)=>i?c.lineTo(...P(p.x,p.y)):c.moveTo(...P(p.x,p.y)));c.stroke();c.setLineDash([]);}
  c.restore();
  c.fillStyle='#739098';c.font='9px ui-monospace,monospace';c.textAlign='left';c.fillText('SECTOR D / FICTIONAL AIRSPACE',12,15);c.textAlign='right';c.fillText('N',w/2,15);c.fillText(`TRAFFIC ${String(sim.aircraft.length).padStart(2,'0')}`,w-12,h-10);c.textAlign='left';c.fillText('ALTITUDE x100 FT / SPEED KT',12,h-10);
}
