# FORGE

A static Three.js + cannon-es physics sandbox for DEXM Labs.

## Modes
- **Sandbox**: unlimited parts, no DEXM points.
- **Challenges**: eight objective-driven engineering tests with limited inventories. Rewards are one-time and use the shared `DexmPoints.earn()` ledger.
- **Walkthrough**: interactive guided build covering placement, movement, mass/material properties, hinges and running the simulation.

## Controls
- Click a part to select it.
- Drag a part to move it on its current horizontal plane.
- Shift-drag a part to raise/lower it.
- Drag empty space to orbit the camera; mouse wheel zooms.
- Delete removes the selected player-created part.
- Space toggles the simulation; R resets the current scene.
- Choose Fixed, Hinge, Spring or Motor, then click the desired connection point on two parts. Rigid/hinge/motor joints snap the second part so the chosen points meet.

## Physics
Mass, friction, restitution (bounce), linear damping and gravity are simulated. Parts can be static or dynamic. The inspector shows velocity, angular speed and translational kinetic energy. Optional arrows show selected-body velocity and gravity.

The browser imports Three.js 0.180.0 and cannon-es 0.20.0 from jsDelivr as ES modules; no local build step is required.
