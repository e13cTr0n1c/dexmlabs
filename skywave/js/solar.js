/** Low-cost solar approximation for the game, not an astronomical ephemeris.
 * Coordinates: degrees, east-positive longitude. Time: UTC Date / epoch ms.
 * Earth vector convention matches the equirectangular three.js SphereGeometry.
 */
export const RAD = Math.PI / 180;
export const DEG = 180 / Math.PI;
export const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
export const wrapLongitude = lon => ((lon + 180) % 360 + 360) % 360 - 180;
export function subsolarPoint(value) {
  const d = new Date(value);
  if (!Number.isFinite(d.getTime())) throw new RangeError('Invalid solar date');
  const day = Math.floor((Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),d.getUTCDate()) - Date.UTC(d.getUTCFullYear(),0,0))/86400000);
  const hour = d.getUTCHours() + d.getUTCMinutes()/60 + d.getUTCSeconds()/3600;
  const g = 2*Math.PI/365 * (day - 1 + (hour-12)/24);
  const decl = 0.006918 - 0.399912*Math.cos(g) + 0.070257*Math.sin(g) - 0.006758*Math.cos(2*g) + 0.000907*Math.sin(2*g) - 0.002697*Math.cos(3*g) + 0.00148*Math.sin(3*g);
  const equationMinutes = 229.18*(0.000075 + 0.001868*Math.cos(g) - 0.032077*Math.sin(g) - 0.014615*Math.cos(2*g) - 0.040849*Math.sin(2*g));
  return {lat:decl*DEG, lon:wrapLongitude(180-hour*15-equationMinutes/4)};
}
export function toVector({lat,lon}) { const a=lat*RAD,b=lon*RAD; return {x:Math.cos(a)*Math.cos(b),y:Math.sin(a),z:-Math.cos(a)*Math.sin(b)}; }
export function fromVector(v) { const r=Math.hypot(v.x,v.y,v.z); return {lat:Math.asin(clamp(v.y/r,-1,1))*DEG,lon:wrapLongitude(Math.atan2(-v.z,v.x)*DEG)}; }
export function cosZenith(point, sunOrDate) {
  const sun = sunOrDate && typeof sunOrDate.lat === 'number' ? sunOrDate : subsolarPoint(sunOrDate);
  const a=toVector(point), b=toVector(sun);
  return clamp(a.x*b.x+a.y*b.y+a.z*b.z,-1,1);
}
export const solarZenith = (p,d) => Math.acos(cosZenith(p,d))*DEG;
export const solarElevation = (p,d) => Math.asin(cosZenith(p,d))*DEG;
export function terminator(date, segments=180) {
  const s=toVector(subsolarPoint(date));
  let u={x:-s.z,y:0,z:s.x}; let l=Math.hypot(u.x,u.z);
  if(l<1e-8){u={x:1,y:0,z:0}; l=1;}
  u={x:u.x/l,y:u.y/l,z:u.z/l};
  const v={x:s.y*u.z-s.z*u.y,y:s.z*u.x-s.x*u.z,z:s.x*u.y-s.y*u.x};
  return Array.from({length:segments+1},(_,i)=>{const a=2*Math.PI*i/segments;return fromVector({x:u.x*Math.cos(a)+v.x*Math.sin(a),y:u.y*Math.cos(a)+v.y*Math.sin(a),z:u.z*Math.cos(a)+v.z*Math.sin(a)});});
}
