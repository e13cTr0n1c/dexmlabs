import p0 from "./sim-src/0.mjs";
import p1 from "./sim-src/1.mjs";
import p2 from "./sim-src/2.mjs";
import p3 from "./sim-src/3.mjs";
import p4 from "./sim-src/4.mjs";
import p5 from "./sim-src/5.mjs";
import p6 from "./sim-src/6.mjs";
import p7 from "./sim-src/7.mjs";
function decode(b64) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}
const base = new URL("./", import.meta.url).href;
const src = [p0, p1, p2, p3, p4, p5, p6, p7].map(decode).join("").replaceAll("__FORGE_JS__/", base);
const url = URL.createObjectURL(new Blob([src], { type: "text/javascript" }));
const mod = await import(url);
export const issue = mod.issue;
export const previewLevel = mod.previewLevel;
export const projectileArc = mod.projectileArc;
export const runSolution = mod.runSolution;
export const startLevel = mod.startLevel;
export const stepLevel = mod.stepLevel;
