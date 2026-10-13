# ORBIT

A static orbital manoeuvring game for DEXM Labs. Fly an orbital tug, match a requested orbit and deploy a satellite. Each deployment adds fuel and generates another contract.

## First transfer

Watch **AP** (apoapsis, the highest altitude) and **PE** (periapsis, the lowest altitude). Hold **Prograde** until AP approaches the target, release thrust and coast towards apoapsis. The flight computer gives a burn-window countdown. Near apoapsis, burn prograde again to raise PE. Use lower throttle or 20 m/s pulses to avoid overshooting. Match both requested altitudes, then coast without thrust for three seconds to deploy.

Prograde/retrograde accelerate along/against the velocity vector; radial in/out point towards/away from Earth. Keyboard controls are W/S/A/D. P pauses. Hold the burn button with a mouse, touch, Space or Enter; releasing, cancelling the pointer, changing tabs or pausing cuts thrust. On phones, a fixed panel keeps PE/AP and prograde/retrograde controls visible.

## Modes

- Endless: generated circular and later elliptical contracts, limited propellant, efficiency scoring and replenishment after each deployment.
- Daily: one UTC-date seed and five minutes of unpaused play. Coast warp accelerates orbital motion, not the challenge clock.
- Sandbox: unlimited propellant, a reset button and automatic recovery from atmospheric entry or escape. No scores or DEXM rewards.

Three deployments in an endless run earn 20 DEXM points, once per qualifying run and at most three times per UTC day. Finishing the full daily shift with at least three deployments earns 100 once per date.

`orbit:settings` saves mode/sound. `orbit:stats` saves completed-run best scores and the completed-run count. Live spacecraft state is not saved. No account or server API is used.

## Model and implementation

`js/sim.mjs` implements planar two-body gravity using velocity-Verlet integration, osculating orbital elements, propulsion, fuel, contracts and advisory guidance. `js/draw.mjs` draws the Earth, predicted and target orbits, trails and deployed satellites. `js/main.mjs` connects controls and telemetry. Shared lifecycle and UI are in `../assets/flight-core.mjs` and `../assets/flight-ui.css`.

The natural-unit model uses Earth radius = 1 and gravitational parameter = 1. Display values use 6,371 km and 398,600.4418 km^3/s^2. Time is deliberately accelerated. Low periapsis is a warning; crossing the loss boundary causes atmospheric entry. Inclination, drag above that boundary, other bodies, J2, debris, spacecraft masses and many mission-planning effects are omitted. Contracts accept any orientation with matching periapsis and apoapsis. Guidance is advisory, not an autopilot.

This is a game, not a real spacecraft navigation or mission-planning tool. See `CREDITS.md` for the supplied NASA imagery provenance.

Tests: `node --test games-tests/models.test.mjs` from the website root. The supplied tests cover conservation while coasting, analytic transfers, fuel, matching tolerances, mission progression and recovery.
