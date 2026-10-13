const WORLD_W = 20;
const WORLD_H = 11;
const G = 9.81;
const STEP_HZ = 120;
const STEP_S = 1 / STEP_HZ;
const STEP_MS = 1e3 / STEP_HZ;
const EMPTY_READOUT = {
  speed: 0,
  height: 0,
  ke: 0,
  pe: 0,
  caption: "Run it to see the numbers move."
};
export {
  EMPTY_READOUT,
  G,
  STEP_HZ,
  STEP_MS,
  STEP_S,
  WORLD_H,
  WORLD_W
};
