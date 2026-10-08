/* Keeps the callsign labels on the globe clear of the map overlays: the HUD, the station list, the map buttons,
   the legend, the radio panel and the QSO card. Tries a few spots round the pin and hides the label if none is clear. */
export const LABEL_AVOID='.map-hud,.target-rail,.map-tools,.map-legend,.radio-panel,.qso-card';
/* Right of the pin first (the usual spot), then left, then above and below on each side. */
const SPOTS=[(x,y,w,h)=>[x+12,y-10],(x,y,w,h)=>[x-12-w,y-10],(x,y,w,h)=>[x+12,y-h-12],(x,y,w,h)=>[x+12,y+8],(x,y,w,h)=>[x-12-w,y-h-12],(x,y,w,h)=>[x-12-w,y+8]];
let cache={at:-1e9,left:NaN,top:NaN,rects:[]};
export function overlayRects(container,now=performance.now()){
  const c=container.getBoundingClientRect();
  if(now-cache.at<250&&cache.left===c.left&&cache.top===c.top)return cache.rects;
  const rects=[...document.querySelectorAll(LABEL_AVOID)].map(e=>e.getBoundingClientRect()).filter(r=>r.width>0&&r.height>0)
    .map(r=>({l:r.left-c.left-4,t:r.top-c.top-4,r:r.right-c.left+4,b:r.bottom-c.top+4}));
  cache={at:now,left:c.left,top:c.top,rects};return rects;
}
export function resetLabelCache(){cache.at=-1e9;}
/* x,y: the pin in container pixels. w,h: the label size. Returns the label's top-left corner, or null to hide it. */
export function placeLabel(x,y,w,h,width,height,rects){
  for(const spot of SPOTS){
    const [l,t]=spot(x,y,w,h);
    if(l<2||t<2||l+w>width-2||t+h>height-2)continue;
    if(!rects.some(r=>l<r.r&&l+w>r.l&&t<r.b&&t+h>r.t))return {x:l,y:t};
  }
  return null;
}
