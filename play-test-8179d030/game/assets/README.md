# Repurposed optional assets (art and voice)

Everything here is optional. If a file is missing the game keeps its procedural art and still shows the voice lines as subtitles in the PA box. Nothing is requested unless `assets/manifest.json` says the file exists, so a missing file never causes a console error.

## How to add or replace files

1. Drop files into `assets/art/` or `assets/vo/` using the exact filenames below.
2. Run `node scan_assets.mjs` (the deploy script does this too). It updates `assets/manifest.json`.
3. Reload the game. No code change is needed.

## Art slots (`assets/art/`)

PNG, or JPG for opaque photo-like art (`poster-*` and `title-bg` ship as `.jpg`; the scanner accepts either extension). Power of two sizes are preferred for textures. Keep each file under 1.5 MB. `Alpha` means a transparent PNG.

| Slot file | Size | Alpha | Used for | Status |
|---|---|---|---|---|
| `poster-safety-1.png` | 1024x1536 | no | S wall bay x -12 | wired |
| `poster-safety-2.png` | 1024x1536 | no | S wall bay x -4 | wired |
| `poster-safety-3.png` | 1024x1536 | no | N wall bay x -12 | wired |
| `poster-wing-intake.png` | 1536x1024 | no | S wall high banner | wired |
| `poster-wing-processing.png` | 1536x1024 | no | level two | slot reserved, not placed yet |
| `poster-wing-reactor.png` | 1536x1024 | no | later level | slot reserved, not placed yet |
| `poster-employee-month.png` | 1024x1024 | no | S wall bay x 12 | wired |
| `sign-stencil-bay-numbers.png` | 2048x512 | yes | N wall low band | wired |
| `sign-hazard-panel.png` | 1024x512 | yes | N wall bay x 4 | wired |
| `sign-biohazard-door.png` | 1024x1024 | yes | later level | slot reserved, not placed yet |
| `screen-boot.png` | 1024x576 | no | control cab monitor while the level loads | slot reserved, not placed yet |
| `screen-cctv-frame.png` | 1024x576 | yes | reserved | slot reserved, not placed yet |
| `screen-status-ok.png` | 1024x576 | no | N wall monitor, normal state | wired |
| `screen-status-warn.png` | 1024x576 | no | N wall monitor, shown once the lift is powered | wired |
| `screen-reactor-diagram.png` | 1024x576 | no | later level | slot reserved, not placed yet |
| `screen-portal-diagram.png` | 1024x576 | no | level two | slot reserved, not placed yet |
| `title-bg.png` | 1920x1080 | no | no title screen yet | wired |
| `title-logo.png` | 1600x600 | yes | no title screen yet | wired |
| `title-layer-far.png` | 1920x1080 | yes | no title screen yet | wired |
| `title-layer-mid.png` | 1920x1080 | yes | no title screen yet | wired |
| `title-layer-near.png` | 1920x1080 | yes | no title screen yet | wired |
| `icon-512.png` | 512x512 | no | store and favicon | slot reserved, not placed yet |
| `icon-128.png` | 128x128 | no | store and favicon | wired |
| `cover-1280x720.png` | 1280x720 | no | store cover | slot reserved, not placed yet |
| `cover-square-1080.png` | 1080x1080 | no | store cover | slot reserved, not placed yet |
| `og-1200x630.png` | 1200x630 | no | link preview | wired (link preview) |
| `hud-icon-base.png` | 128x128 | yes | HUD | wired |
| `hud-icon-drone.png` | 128x128 | yes | HUD | wired |
| `hud-icon-arm.png` | 128x128 | yes | HUD | wired |
| `hud-crosshair.png` | 128x128 | yes | HUD | wired |
| `hud-grab.png` | 128x128 | yes | HUD | wired |
| `hud-zap.png` | 128x128 | yes | HUD | wired |
| `hud-press.png` | 128x128 | yes | HUD | wired |
| `hud-medal-gold.png` | 256x256 | yes | par time medals | wired |
| `hud-medal-silver.png` | 256x256 | yes | par time medals | wired |
| `hud-medal-bronze.png` | 256x256 | yes | par time medals | wired |
| `decal-arrow-yellow.png` | 512x512 | yes | facility floor, beside belts | wired |
| `decal-crate-outline.png` | 512x512 | yes | facility floor, at the pallets | wired |
| `decal-wear-1.png` | 1024x1024 | yes | facility floor | wired |
| `decal-wear-2.png` | 1024x1024 | yes | facility floor | wired |
| `decal-wear-3.png` | 1024x1024 | yes | facility floor | wired |
| `decal-roundel-worn.png` | 1024x1024 | yes | facility floor, centre | wired |

`icon-128` is the browser tab icon and `og-1200x630` the link preview image (both set in `index.html`). The title screen shows once per browser session when `title-bg` is present.

## Voice over (`assets/vo/`)

Preferred: OGG Vorbis, mono, 44.1 kHz, with an MP3 copy of each line as a fallback (the game tries OGG first, then MP3). About 0.1 s of silence at each end, loudness about -16 LUFS, and no more than the listed seconds. The filename is the cue id, with numbered variants where listed (`nudge_1.ogg`, `nudge_2.ogg`). `lines.json` maps each cue or variant id to the exact subtitle text; the PA box shows it whether or not an audio file exists.

| Cue id | Variants | Max s | Plays when |
|---|---|---|---|
| `intro.ogg` | 1 | 10 | first ever load, on the first click or key press |
| `chamber_start_1.ogg`, `chamber_start_2.ogg`, `chamber_start_3.ogg` | 3 | 5 | a chamber loads |
| `facility_start.ogg` | 1 | 8 | the loading hall loads |
| `possess_base_1.ogg`, `possess_base_2.ogg` | 2 | 4 | player takes the walking bot |
| `possess_drone_1.ogg`, `possess_drone_2.ogg` | 2 | 4 | player takes the drone |
| `possess_arm_1.ogg`, `possess_arm_2.ogg` | 2 | 4 | player takes the arm |
| `button_pressed.ogg` | 1 | 4 | the arm presses the heavy button |
| `panel_zapped.ogg` | 1 | 4 | the drone zaps the panel |
| `plate_ok.ogg` | 1 | 4 | a crate settles on the plate (gate or door) |
| `door_open.ogg` | 1 | 4 | the chamber exit opens |
| `win_1.ogg`, `win_2.ogg`, `win_3.ogg`, `win_4.ogg` | 4 | 6 | a chamber or the hall is cleared |
| `hidden_route.ogg` | 1 | 6 | the secret route is used |
| `fail_1.ogg`, `fail_2.ogg`, `fail_3.ogg` | 3 | 5 | the base falls out of the map |
| `nudge_1.ogg`, `nudge_2.ogg`, `nudge_3.ogg`, `nudge_4.ogg`, `nudge_5.ogg`, `nudge_6.ogg` | 6 | 6 | the player has stalled for 45 s |
| `warn_conveyor.ogg` | 1 | 4 | near the belts in the loading hall |
| `warn_vent.ogg` | 1 | 4 | near the vent in the chambers |
| `portal.ogg` | 1 | 4 | reserved, no portal in the game yet |
| `level_two.ogg` | 1 | 8 | reserved, no second section yet |
| `notice.ogg` | 1 | 6 | looking at the property notice |
| `outro.ogg` | 1 | 10 | the last chamber is cleared |

Voice credit: **Voice: Jenny (Dioco), via Piper**. It is shown on the title screen and in the audio panel. The Piper engine is GPL licensed and is not part of the game; only the rendered clips are.

## Audio engine

All music, ambience and effects are generated in code (`src/audio.js`), so there are no samples and no licensing. The audio panel (bottom right, or the M key to mute) has master, music, effects and voice sliders, saved in localStorage. Audio starts on the first click or key press.
