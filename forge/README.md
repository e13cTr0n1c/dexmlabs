# FORGE — DEXM Labs Physics Facility

FORGE is a Three.js + cannon-es interactive physics construction laboratory.

## Modes

- **Sandbox / Proving Ground** — unlimited building plus wind tunnel, shake table, drop and speed tests.
- **Challenges** — constrained engineering objectives with one-time DEXM point rewards.
- **Walkthrough** — interactive introduction to parts, magnetic snap nodes, physical properties, joints and simulation.

## Building

Parts expose small red connection nodes in BUILD mode. With **Magnetic snap** enabled, nearby nodes pull together. **Auto-fix on snap** optionally creates a rigid fixed joint when the part is released. Disable Auto-fix when assembling mechanisms that need hinges, springs or motors.

The right inspector exposes mass, friction, restitution, damping, transforms and static locking. Velocity and gravity vectors can be displayed for the selected body.

## Facility tests

Sandbox includes four repeatable test rigs:

- Wind tunnel
- Shake table
- Drop test
- Speed run

FORGE tracks local records for top speed, height, peak kinetic energy and test survival time. Sandbox records do not award DEXM points.

## Runtime

FORGE loads browser ESM builds of Three.js 0.180.0 and cannon-es 0.20.0 from jsDelivr. It requires network access to those modules and has no npm/build dependency for deployment.
