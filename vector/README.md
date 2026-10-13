# VECTOR

A self-contained static air traffic control game for DEXM Labs, integrated with the site's theme, points and storage notice.

## Play

Serve the website root, then visit `/vector/`. Select the first aircraft, choose **Route to gate**, set **2,000 ft** and **180 kt**, and **Arm approach**. The approach captures only when position, heading, altitude and speed are suitable. The aircraft then lands automatically. Sequence subsequent arrivals instead of sending everything to the gate together.

Drag from an aircraft to draw a route, or select a flight and click a radar destination. Cyan overflights need their assigned boundary exit. Keep clear of weather and handle priority aircraft before their fuel countdown expires. Three strikes end a scored run.

On phones, a fixed quick-command panel lets you select flights, route to the gate or exit, change altitude/speed and arm approaches while keeping the radar visible. Desktop controls also offer direct headings and keyboard adjustments. The in-game flight manual contains the full rules.

## Modes and records

- Endless: generated traffic and increasing pressure; a new seed for each run.
- Daily: one UTC-date seed and a five-minute shift, unless three strikes close the sector first.
- Sandbox: manually add traffic, no strike limit and no score or DEXM rewards.

Five clearances in an endless run earn 20 DEXM points, once per qualifying run and at most three times per UTC day. Completing the full daily shift with at least five clearances earns 100 once per date. The score multiplier and shared DEXM point balance are separate.

`vector:settings` saves mode and sound preference. `vector:stats` saves completed-run best scores and a completed-run count. Live runs are not saved. An interrupted run pauses and requires an explicit resume.

## Source layout

`js/sim.mjs` is the DOM-free aircraft, approach, weather and separation model. `js/draw.mjs` renders the radar and maps pointer coordinates into the sector. `js/main.mjs` connects those modules to the HTML controls. `css/style.css` is game-specific; common lifecycle, audio, storage and layout are in `../assets/flight-core.mjs` and `../assets/flight-ui.css`.

Simulation coordinates are a fictional 100-by-100 grid, not a real chart. Vertical separation is simplified and aircraft, turns and time are accelerated. This is entertainment, not ATC training or navigation software.

Tests: `node --test games-tests/models.test.mjs` from the website root. Browser tests and merge instructions are shipped separately at the root.
