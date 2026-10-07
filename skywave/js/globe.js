import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {toVector,subsolarPoint} from './solar.js';
import {CONFIG,intermediatePoint,greatCircleDistance,isPathResult} from './propagation.js';
const GREEN=0xd6ff00,AMBER=0xffbf69,RED=0xff7272;
const vector=(p,r=1)=>{const v=toVector(p);return new THREE.Vector3(v.x*r,v.y*r,v.z*r);};
/** View-only exaggeration of layer heights (8x, as in the brief). Never used by the model. */
const HEIGHT_SCALE=8/CONFIG.earthRadiusKm,SURFACE=1.004,GHOST_OPACITY=.22;
const shellVertex=`varying vec3 vNormal; varying vec3 vViewNormal; varying vec3 vView;
void main(){vNormal=normalize(normal); vViewNormal=normalize(normalMatrix*normal); vec4 mv=modelViewMatrix*vec4(position,1.0); vView=normalize(-mv.xyz); gl_Position=projectionMatrix*mv;}`;
const vertex=`varying vec2 vUv; varying vec3 vNormal; varying vec3 vView;
void main(){vUv=uv; vNormal=normalize(normal); vec4 mv=modelViewMatrix*vec4(position,1.0);vView=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}`;
const earthFragment=`uniform sampler2D dayMap; uniform sampler2D nightMap; uniform vec3 sun;
varying vec2 vUv; varying vec3 vNormal;
void main(){float c=dot(normalize(vNormal),sun);float light=smoothstep(-0.10,0.12,c);
vec3 day=texture2D(dayMap,vUv).rgb*(0.28+0.8*sqrt(max(c,0.0)));
vec3 night=texture2D(nightMap,vUv).rgb*1.55+texture2D(dayMap,vUv).rgb*0.013;
gl_FragColor=vec4(mix(night,day,light),1.0);
#include <tonemapping_fragment>
#include <colorspace_fragment>
}`;
function disposeGroup(group){for(const child of [...group.children]){group.remove(child);child.traverse(o=>{o.geometry?.dispose();if(Array.isArray(o.material))o.material.forEach(m=>m.dispose());else o.material?.dispose();});}}
export async function createGlobe(container,options={}) {const g=new SkyGlobe(container,options);try{await g.init();return g;}catch(error){g.dispose();throw error;}}
class SkyGlobe {
  constructor(container,{settings={},phase=2,onSelect=()=>{},onProgress=()=>{},onStatus=()=>{}}) {
    this.container=container;this.settings=settings;this.phase=phase;this.onSelect=onSelect;this.onProgress=onProgress;this.onStatus=onStatus;
    this.scene=new THREE.Scene();this.camera=new THREE.PerspectiveCamera(38,1,.05,100);this.camera.position.copy(vector({lat:23,lon:8},4.1));
    this.renderer=new THREE.WebGLRenderer({antialias:false,alpha:true,powerPreference:'low-power'});
    this.renderer.setClearColor(0x000000,0);this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.NoToneMapping;
    this.renderer.domElement.setAttribute('aria-label','Interactive Earth. Drag to rotate; use station buttons for keyboard selection.');
    this.renderer.domElement.setAttribute('role','img');container.append(this.renderer.domElement);
    this.controls=new OrbitControls(this.camera,this.renderer.domElement);this.controls.enableDamping=!settings.reducedMotion;this.controls.dampingFactor=.08;this.controls.enablePan=false;this.controls.minDistance=2.35;this.controls.maxDistance=6.5;this.controls.rotateSpeed=.5;
    this.controls.addEventListener('start',()=>{this.flight=null;});
    this.sunUniform={value:vector(subsolarPoint(new Date()))};
    /* Earth, shells, pins and arcs all live in one group, so they always share a frame. */
    this.world=new THREE.Group();this.scene.add(this.world);
    this.earth=new THREE.Mesh(new THREE.SphereGeometry(1,80,48),new THREE.ShaderMaterial({vertexShader:vertex,fragmentShader:earthFragment,uniforms:{dayMap:{value:null},nightMap:{value:null},sun:this.sunUniform}}));this.world.add(this.earth);
    this.pins=new THREE.Group();this.world.add(this.pins);this.paths=new THREE.Group();this.world.add(this.paths);this.transient=new THREE.Group();this.world.add(this.transient);this.shells={};this.labels=[];
    this.raycaster=new THREE.Raycaster();this.pointer=new THREE.Vector2();this.paused=false;this.screen='title';this.raf=null;this.lastTime=0;this.frames=0;this.sampleStart=0;this.elapsed=0;this.tier='low';this.textureSize='';this.textureGeneration=0;this.textureCache={};
    this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(container);
    this.setupDecoration();this.setupInput();
    this.renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();this.pause(true);this.onStatus('Graphics paused. Restore this tab or reload to resume. Your daily round is saved.');});
    this.renderer.domElement.addEventListener('webglcontextrestored',()=>this.pause(false));
  }
  async init(){await this.setQuality(this.settings.quality==='auto'?'low':this.settings.quality||'low');this.resize();this.container.classList.add('loaded');this.start();}
  setupDecoration(){
    const positions=[];let seed=13579;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
    for(let i=0;i<420;i++){const y=random()*2-1,a=random()*Math.PI*2,r=Math.sqrt(1-y*y);positions.push(Math.cos(a)*r*18,y*18,Math.sin(a)*r*18);}
    const starGeo=new THREE.BufferGeometry();starGeo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));this.scene.add(new THREE.Points(starGeo,new THREE.PointsMaterial({color:0x74919a,size:.025,sizeAttenuation:true,transparent:true,opacity:.52})));
    const rim=new THREE.Mesh(new THREE.SphereGeometry(1.022,64,40),new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.BackSide,vertexShader:`varying vec3 n;varying vec3 v;void main(){vec4 p=modelViewMatrix*vec4(position,1.0);n=normalize(normalMatrix*normal);v=normalize(-p.xyz);gl_Position=projectionMatrix*p;}`,fragmentShader:`varying vec3 n;varying vec3 v;void main(){float f=pow(1.0-abs(dot(n,v)),3.0);gl_FragColor=vec4(0.20,0.60,0.70,f*0.40);}`}));this.world.add(rim);
    const grid=[];for(let lat=-60;lat<=60;lat+=30)for(let lon=-180;lon<180;lon+=3)grid.push(vector({lat,lon},1.003),vector({lat,lon:lon+3},1.003));
    for(let lon=-180;lon<180;lon+=30)for(let lat=-90;lat<90;lat+=3)grid.push(vector({lat,lon},1.003),vector({lat:lat+3,lon},1.003));
    this.world.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(grid),new THREE.LineBasicMaterial({color:0x5b8090,transparent:true,opacity:.10})));
    if(this.phase<2)return;
    const pole=vector(CONFIG.magneticPole);
    for(const [name,height] of [['D',70],['E',110],['F2',300]]) {
      const uniforms={sun:this.sunUniform,dayBase:{value:CONFIG.foDayBase},daySfi:{value:CONFIG.foDaySfi},nightBase:{value:CONFIG.foNightBase},nightSfi:{value:CONFIG.foNightSfi},sfi:{value:100},kp:{value:1},storm:{value:CONFIG.stormDepression},stormThreshold:{value:CONFIG.stormThreshold},latitudeLimit:{value:Math.sin(CONFIG.stormLatitudeDeg*Math.PI/180)},pole:{value:pole},layer:{value:name==='F2'?2:name==='E'?1:0}};
      uniforms.strength={value:1};
      /* Subtle shells: additive, visible mainly at the limb (fresnel). F2 colour and brightness follow foF2
       * (same formula as propagation.js); D glows faintly on the sunlit side; E is barely there. */
      const mat=new THREE.ShaderMaterial({vertexShader:shellVertex,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.FrontSide,uniforms,fragmentShader:`varying vec3 vNormal;varying vec3 vViewNormal;varying vec3 vView;uniform vec3 sun;uniform vec3 pole;uniform float sfi,kp,storm,stormThreshold,latitudeLimit,dayBase,daySfi,nightBase,nightSfi,strength;uniform int layer;
void main(){vec3 n=normalize(vNormal);float c=max(0.0,dot(n,sun));float rim=1.0-abs(dot(normalize(vViewNormal),normalize(vView)));float fres=pow(rim,3.0);
float d=dayBase+daySfi*sfi;float k=nightBase+nightSfi*sfi;float high=abs(dot(n,pole))>latitudeLimit?2.0:1.0;float fo=(k+(d-k)*sqrt(c))*(1.0-storm*max(0.0,kp-stormThreshold)*high);float f=clamp((fo-2.0)/12.0,0.0,1.0);
vec3 col=mix(vec3(.12,.34,.62),vec3(.62,.90,.18),f);float a=fres*(.05+.14*f);
if(layer==0){col=vec3(.95,.48,.14);a=fres*.035*c;}if(layer==1){col=vec3(.25,.65,.58);a=fres*.022;}
gl_FragColor=vec4(col,a*strength);}`});
      const shell=new THREE.Mesh(new THREE.SphereGeometry(1+height*HEIGHT_SCALE,64,40),mat);shell.renderOrder=1;shell.visible=false;this.shells[name]=shell;this.world.add(shell);
    }
  }
  setupInput(){let down=null;this.renderer.domElement.addEventListener('pointerdown',e=>{down={x:e.clientX,y:e.clientY};});this.renderer.domElement.addEventListener('pointerup',e=>{if(!down||Math.hypot(e.clientX-down.x,e.clientY-down.y)>8)return;const rect=this.container.getBoundingClientRect();this.pointer.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);this.raycaster.setFromCamera(this.pointer,this.camera);const hits=this.raycaster.intersectObjects(this.hitPins||[]);const earthHit=this.raycaster.intersectObject(this.earth)[0];if(hits[0]&&(!earthHit||hits[0].distance<earthHit.distance))this.onSelect(hits[0].object.userData.id);down=null;});}
  async loadTextures(size){
    if(this.textureCache[size])return this.textureCache[size];
    let done=0;const loader=new THREE.TextureLoader();
    const textures=await Promise.all(['day','night'].map(type=>loader.loadAsync(new URL(`../assets/textures/earth_${type}_${size}.jpg`,import.meta.url).href).then(t=>{t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=Math.min(4,this.renderer.capabilities.getMaxAnisotropy());this.onProgress(++done/2);return t;})));
    this.textureCache[size]=textures;return textures;
  }
  async setQuality(requested){
    const tier=this.phase<2?'low':requested;this.tier=['low','medium','high'].includes(tier)?tier:'low';
    if(this.tier==='high'&&this.renderer.capabilities.maxTextureSize<4096)this.tier='medium';
    this.renderer.setPixelRatio(Math.min(devicePixelRatio,this.tier==='low'?1:this.tier==='medium'?1.5:2));
    const size=this.tier==='high'?'4k':'2k',generation=++this.textureGeneration;
    const [day,night]=await this.loadTextures(size);if(generation!==this.textureGeneration)return;
    this.earth.material.uniforms.dayMap.value=day;this.earth.material.uniforms.nightMap.value=night;this.textureSize=size;
    if(this.tier==='high'&&!this.composer){
      try{const [{EffectComposer},{RenderPass},{UnrealBloomPass},{OutputPass}]=await Promise.all([import('three/addons/postprocessing/EffectComposer.js'),import('three/addons/postprocessing/RenderPass.js'),import('three/addons/postprocessing/UnrealBloomPass.js'),import('three/addons/postprocessing/OutputPass.js')]);
        if(generation!==this.textureGeneration||this.tier!=='high')return;
        this.composer=new EffectComposer(this.renderer);this.composer.addPass(new RenderPass(this.scene,this.camera));this.bloom=new UnrealBloomPass(new THREE.Vector2(800,600),.28,.35,1.0);this.composer.addPass(this.bloom);this.composer.addPass(new OutputPass());
      }catch{this.onStatus('Bloom unavailable; standard rendering is still active.');}
    }
    if(this.tier!=='high'&&this.composer){this.composer.passes.forEach(p=>p.dispose?.());this.composer.dispose();this.composer=null;}
    this.applyLayers();this.resize();this.onStatus(`${this.tier.toUpperCase()} / 3D`);
  }
  applyLayers(){for(const [name,shell]of Object.entries(this.shells)){shell.visible=Boolean(this.settings.layers?.[name])&&(this.tier!=='low'||name==='F2');shell.material.uniforms.strength.value=this.tier==='high'?.5:this.tier==='low'?.6:1;/* High adds bloom, which roughly doubles the limb glow */}}
  updateSettings(settings){this.settings=settings;this.controls.enableDamping=!settings.reducedMotion;this.controls.autoRotate=this.screen==='title'&&!settings.reducedMotion;if(settings.reducedMotion)this.flight=null;this.applyLayers();const t=settings.quality==='auto'?(this.autoTier||'low'):settings.quality;this.setQuality(t).catch(()=>this.onStatus('Texture loading failed. Retry or choose Low quality.'));}
  resize(){const w=this.container.clientWidth,h=this.container.clientHeight;if(!w||!h)return;this.camera.aspect=w/h;
    /* Phone layout: the radio sheet covers the bottom of the globe stage. Shift the view up so the globe and
     * its hop arcs are centred in the part that is still visible. */
    const shift=this.coveredShift(h);if(shift)this.camera.setViewOffset(w,h,0,shift,w,h);else this.camera.clearViewOffset();this.camera.updateProjectionMatrix();this.renderer.setSize(w,h,false);this.composer?.setSize(w,h);}
  clearArcs(){disposeGroup(this.paths);disposeGroup(this.transient);}
  clearDay(){this.day=null;this.selected=null;this.clearArcs();disposeGroup(this.pins);this.hitPins=[];this.labels.forEach(l=>l.node.remove());this.labels=[];}
  setDay(day){this.clearDay();this.day=day;
    for(const p of [{...day.qth,id:'home',callsign:'YOUR QTH'},...day.targets]){
      const v=vector(p,1.014),pin=new THREE.Mesh(new THREE.SphereGeometry(p.id==='home'?.017:.013,10,8),new THREE.MeshBasicMaterial({color:p.id==='home'?0xd6ff00:0x86bac0,toneMapped:false}));pin.position.copy(v);pin.userData.id=p.id;this.pins.add(pin);if(p.id!=='home')this.hitPins.push(pin);
      const label=document.createElement('span');label.className='globe-pin-label';label.textContent=p.callsign;label.hidden=true;this.container.append(label);this.labels.push({node:label,vector:v,id:p.id});
    }
    for(const shell of Object.values(this.shells)){shell.material.uniforms.sfi.value=day.conditions.sfi;shell.material.uniforms.kp.value=day.conditions.kp;}
    this.focus(day.qth,true);
  }
  setTime(date){this.sunUniform.value.copy(vector(subsolarPoint(date)));}
  coveredShift(h){if(this.screen!=='operating'||typeof document==='undefined')return 0;const panel=document.getElementById('radio-panel');if(!panel)return 0;
    const c=this.container.getBoundingClientRect(),p=panel.getBoundingClientRect();if(p.left>c.left+1||p.right<c.right-1)return 0;const covered=Math.min(c.bottom-p.top,h*.4);return covered>8?Math.round(covered/2):0;}
  setScreen(screen){const changed=this.screen!==screen;this.screen=screen;if(changed)this.resize();this.controls.autoRotate=screen==='title'&&!this.settings.reducedMotion;this.controls.autoRotateSpeed=.28;}
  select(id){this.selected=id;for(const p of this.hitPins){const active=p.userData.id===id;p.scale.setScalar(active?1.5:1);p.material.color.setHex(active?GREEN:0x86bac0);}this.focusPath(.5);}
  /** Look at a point on the selected path from ~34 degrees off the great-circle plane. Viewing from inside
   * that plane (the old behaviour) collapses every hop arc into a flat straight line. */
  focusPath(fraction=.5,immediate=false){const target=this.day?.targets.find(t=>t.id===this.selected);if(!target)return;
    const a=vector(this.day.qth),b=vector(target),mid=vector(intermediatePoint(this.day.qth,target,fraction));let n=new THREE.Vector3().crossVectors(a,b);
    if(n.lengthSq()<1e-10)n.set(0,1,0).addScaledVector(mid,-mid.y);n.normalize();if(n.dot(this.camera.position)<0)n.negate();
    const tilt=.6,km=greatCircleDistance(this.day.qth,target),len=this.camera.position.length(),distance=Math.min(this.controls.maxDistance,Math.max(len,km>12000?5.6:km>7000?4.8:len));
    this.flyTo(mid.multiplyScalar(Math.cos(tilt)).addScaledVector(n,Math.sin(tilt)).normalize().multiplyScalar(distance),immediate);}
  focus(point,immediate=false){this.flyTo(vector(point,this.camera.position.length()),immediate);}
  flyTo(to,immediate=false){if(immediate||this.settings.reducedMotion){this.flight=null;this.camera.position.copy(to);}else this.flight={from:this.camera.position.clone(),to,start:this.elapsed};}
  /** Keep at most the current call's arcs plus a faded ghost of the previous call. Schedule failures
   * (off air, wrong band, mode not allowed) draw nothing: no signal propagated. */
  addAttempt(entry){disposeGroup(this.paths);for(const group of [...this.transient.children]){this.transient.remove(group);this.ghost(group);this.paths.add(group);}if(entry&&isPathResult(entry.result))this.drawPath(entry,this.transient);}
  ghost(group){const {pulse}=group.userData;if(pulse){group.remove(pulse);pulse.geometry.dispose();pulse.material.dispose();}group.userData={};group.traverse(o=>{if(o.material?.uniforms?.opacity)o.material.uniforms.opacity.value=GHOST_OPACITY;});}
  drawPath(entry,parent){
    const color=entry.result.qsb?AMBER:entry.result.ok?GREEN:RED;
    const baseColor=new THREE.Color(color),segments=this.tier==='low'?64:128;const group=new THREE.Group();const allPoints=[];let hops=entry.result.hops;
    if(!hops.length){const t=this.day?.targets.find(t=>t.id===entry.targetId);if(!t)return;hops=[{from:this.day.qth,to:t,heightKm:CONFIG.f2HeightKm}];}
    const ground=entry.result.mechanism==='Ground wave';
    for(let i=0;i<hops.length;i++){
      if(entry.result.failedHop!==null&&i>entry.result.failedHop)break;
      const h=hops[i],lift=ground?.01:(Number.isFinite(h.heightKm)&&h.heightKm>0?h.heightKm:CONFIG.f2HeightKm)*HEIGHT_SCALE,escape=this.phase>1&&entry.result.reason==='above MUF'&&i===entry.result.failedHop,absorbed=this.phase>1&&entry.result.reason==='absorbed (D layer)'&&i===entry.result.failedHop;
      const pts=[],alphas=[];
      for(let j=0;j<=segments;j++){
        const t=j/segments;let fraction=t,height;
        if(escape){fraction=Math.min(t,.5);height=t<=.5?Math.sin(Math.PI*t)*lift:(lift+(t-.5)*1.05);}
        else if(absorbed){fraction=t*Math.asin(Math.min(1,CONFIG.dHeightKm*HEIGHT_SCALE/lift))/Math.PI;height=Math.sin(Math.PI*fraction)*lift;}
        else height=Math.sin(Math.PI*t)*lift;
        const p=vector(intermediatePoint(h.from,h.to,fraction),SURFACE+height);pts.push(p);allPoints.push(p);alphas.push(absorbed?1-t:entry.result.ok?.85:.65);
      }
      const geo=new THREE.BufferGeometry().setFromPoints(pts);geo.setAttribute('alpha',new THREE.Float32BufferAttribute(alphas,1));
      const mat=new THREE.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{color:{value:baseColor.clone().multiplyScalar(1.3)},opacity:{value:1}},vertexShader:'attribute float alpha;varying float a;void main(){a=alpha;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',fragmentShader:'uniform vec3 color;uniform float opacity;varying float a;void main(){gl_FragColor=vec4(color,a*opacity);}'});group.add(new THREE.Line(geo,mat));
    }
    if(this.phase>1&&allPoints.length&&!this.settings.reducedMotion){const pulse=new THREE.Mesh(new THREE.SphereGeometry(.013,8,6),new THREE.MeshBasicMaterial({color:baseColor.clone().multiplyScalar(2.5),toneMapped:false}));group.add(pulse);group.userData={points:allPoints,pulse,start:this.elapsed};}
    parent.add(group);
  }
  /** Round over: clear every arc (the results card has its own path map). */
  setResults(state){this.clearArcs();if(state?.day)this.focus(state.day.qth);}
  start(){if(!this.raf&&!this.paused)this.raf=requestAnimationFrame(t=>this.frame(t));}
  pause(paused){this.paused=paused;if(paused){cancelAnimationFrame(this.raf);this.raf=null;this.lastTime=0;this.sampleStart=0;this.frames=0;}else this.start();}
  frame(time){this.raf=null;if(this.paused||document.hidden)return;const dt=this.lastTime?Math.min(.1,(time-this.lastTime)/1000):0;this.lastTime=time;this.elapsed+=dt;
    if(!this.sampleStart)this.sampleStart=time;this.frames++;
    if(time-this.sampleStart>=1000){this.fps=this.frames*1000/(time-this.sampleStart);this.sampleStart=time;this.frames=0;if(!this.autoTier&&this.elapsed>1){const max=this.renderer.capabilities.maxTextureSize,dpr=devicePixelRatio;this.autoTier=max<4096||this.fps<34?'low':this.fps<52||dpr>2||this.container.clientWidth<600?'medium':'high';if(this.settings.quality==='auto')this.setQuality(this.autoTier).catch(()=>{});}if(this.settings.quality==='auto'&&this.elapsed>4&&this.fps<27&&this.tier!=='low'){this.autoTier=this.tier==='high'?'medium':'low';this.setQuality(this.autoTier).catch(()=>{});}}
    if(this.flight){const t=Math.min(1,(this.elapsed-this.flight.start)/.9),e=t*t*(3-2*t),r=THREE.MathUtils.lerp(this.flight.from.length(),this.flight.to.length(),e);this.camera.position.lerpVectors(this.flight.from,this.flight.to,e).normalize().multiplyScalar(r);if(t===1)this.flight=null;}
    this.controls.update(dt);
    for(const parent of [this.paths,this.transient])for(const group of parent.children){const {points,pulse,start}=group.userData;if(pulse){pulse.visible=!this.settings.reducedMotion&&this.screen!=='briefing';const t=((this.elapsed-start)/3)%1*(points.length-1),i=Math.floor(t);pulse.position.copy(points[i]).lerp(points[Math.min(i+1,points.length-1)],t-i);}}
    const view=this.camera.position.clone().normalize();
    for(const l of this.labels){const world=this.world.localToWorld(l.vector.clone()),visible=(l.id==='home'||l.id===this.selected)&&world.clone().normalize().dot(view)>.18;l.node.hidden=!visible;if(visible){const p=world.project(this.camera);l.node.style.transform=`translate(${(p.x*.5+.5)*this.container.clientWidth+12}px,${(-p.y*.5+.5)*this.container.clientHeight-10}px)`;}}
    if(this.tier==='high'&&this.composer)this.composer.render(dt);else this.renderer.render(this.scene,this.camera);
    this.start();
  }
  dispose(){this.pause(true);this.resizeObserver.disconnect();this.controls.dispose();this.scene.traverse(o=>{o.geometry?.dispose();o.material?.dispose?.();});Object.values(this.textureCache).flat().forEach(t=>t.dispose());this.composer?.dispose();this.renderer.dispose();this.labels.forEach(l=>l.node.remove());this.renderer.domElement.remove();}
}
