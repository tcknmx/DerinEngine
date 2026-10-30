# DerinEngine — Star Collector Hero

A zero-dependency, component-based game engine built from scratch in JavaScript + HTML5 Canvas 2D, with a native WebGL rendering pipeline (3D Hello, voxel demo, TrenchBroom `.map` loader) and a 2.5D depth-scaling bridge integrated into the core. The engine runs entirely in the browser (no build step, no external libraries) and includes a full 2D platformer — **Star Collector Hero** — built on top of it.

> The Python reference (pygame) was removed on 2026-10-08 (`git log`). All current development is in the JS/HTML single source. Engine version: **1.0.0**, Game version: **0.1.20**.

---

## Architecture — Core Layers

### Engine (Core Loop)
The `DE.Engine` class manages the main loop (delta-time tracking, fixed FPS cap, event dispatch). It holds the active `Scene`, updates the input state (keyboard/controller analog axes + touch events), and drives the developer overlay (`F3` debug info), lighting engine, and in-game console (` ` / `"` backtick / quote). The engine switches scenes atomically (clean-up + initialization queues) and supports `run_async()` (awaitable promise loop with 60-frame telemetry).

### Scene
A scene is a discrete level or screen (`menu`, `game_over`, `victory`, `pause`). It owns an ordered `GameObject` list and supports child-parent hierarchies (`add_child` / `remove_child` with world-space coordinate resolution). Scene-level systems include:
- **Camera tracking**: smooth follow, look-ahead offset, zoom, zoom-punch (impact zoom), screen shake, camera kick, vignette, and hit-flash overlays.
- **Physics resolution**: optimized via a spatial grid; supports gravity, solid/trigger collisions, one-way platforms (`BreakablePlatform`), slope resolution, and `is_grounded` state tracking.
- **Lighting**: dynamic 2D radial light masks over an ambient darkness layer (`LightingEngine`).

### GameObject
The atomic world entity: player, enemy, platform, projectile, coin, portal. Each `GameObject` carries a `tag`, `position`, `size`, `z_index` (draw order), and an active/inactive flag. The engine supports hierarchical scene trees (`parent` / `children`) with local-to-world coordinate propagation.

### Component
Behavioral modules attached to `GameObject`. The base `Component` class provides `start()`, `update(dt)`, and `draw(ctx, camera_offset)` hooks.

| Category | Components |
|---|---|
| **Rendering** | `SpriteRenderer` (`rect` / `circle` / `triangle` / `spikes`), `Animator`, `KeyframeAnimator`, `TextRenderer` |
| **Physics** | `Rigidbody2D`, `BoxCollider` / `CircleCollider` / `PolygonCollider` |
| **Gameplay** | `Health`, `Projectile`, `PowerUp` (`magnet`, `triple`, `shield`, `speed`), `BouncePad`, `BreakablePlatform`, `SpawnIn`, `PortalArrowUI` |
| **Visual FX** | `LightSource`, `ParticleEmitter`, `Tween`, `FadeOverlay` |

Cross-component communication uses an event bus (`emit` / `on` / `once` / `off`) rather than tight coupling. Components are registered at runtime and removed cleanly on object destruction.

---

## 2.5D Depth Bridge (Engine Layer)
The 2D engine supports a depth dimension (`z`) without converting to full 3D. `GameObject.z` (default `0`) defines depth; `SpriteRenderer` applies perspective scaling (`scale = max(0.25, 1 - z * 0.015)`) so distant objects appear smaller. The `BackgroundDepth` decorative object (`z = 35`) is the first real-game demonstration: it renders at ~52.5% scale, creating a parallax-like depth cue. The bridge is backward-compatible (`z = 0` behaves exactly as before).

---

## 3D Pipeline (WebGL — Separate Demo Layer)
A standalone WebGL shader pipeline (`demo3d/`) verifies that 3D rendering is achievable with zero external libraries:

- **Hello World** (`cube.js`): manual 4x4 matrix math (`perspective`, `rotation`, `translation`), vertex/fragment shaders, indexed triangle drawing (`36` indices per cube), and mouse-controlled camera (`yaw` / `pitch`).
- **Voxel / STARCUBES** (`voxel.js`): extends the cube geometry to a `5x5` grid, demonstrating procedural scene construction from minimal geometry.
- **2.5D Verification** (`bridge.html` / `test_25d_bridge.js`): confirms that the `z`-scale rule produces visually distinct depth layers (`z = 0` / `60` / `120`).
- **TrenchBroom `.map` Loader** (`levelfile_map.js`): parses `.map` entity blocks (`worldspawn`, `func_detail`) and instantiates `Scene` objects through the registered builder table (`DE._BUILDERS`).

These files (`demo3d/`) are proof-of-concept; the 3D pipeline is not yet merged into `DE.Engine`'s scene manager. The `.map` loader (`levelfile_map.js`) is registered in the engine namespace and callable from any scene.

---

## Other Critical Systems

### Physics & Collisions
Gravity (`Rigidbody2D`), AABB (`BoxCollider`) and polygon (`PolygonCollider`) collision detection, slope surface resolution (`resolve_slope` / `resolve_slope_gate`), one-way platform tunneling prevention (`fast-fall` cap at `1800` px/s), and `is_grounded` tracking with `i-frame` invulnerability windows.

### Lighting
2D radial light sources (`LightSource` component) cast masks onto a dark ambient layer. The scene manager excludes `UI` and `Pause` scenes from the lighting pass (`transparent` overlay). The `Engine.lighting` property is lazily instantiated (`LightingEngine`).

### Audio
8-bit retro sound effects synthesized at runtime (`SoundFX`) — no `.wav` or `.mp3` assets. Algorithmic 8-bit music (`SoundFX.play_music`) supports biome themes (`forest`, `lava_cave`, `ice`, `desert`, `astro`, `boss_*`, `victory`).

### Particles, Tween, Parallax
`ParticleEmitter` for spawn/death/explosion effects; `Tween` for smooth interpolation; `Parallax` background for depth layers.

### Tilemap / LevelFile
`Tilemap` component supports cell-based level design; `procedural.js` generates seed-based levels (`custom_level.json` format); `levelfile.js` saves/loads scene metadata as JSON; `.map` loader parses TrenchBroom brush entities.

### Procedural Generation
Same seed = identical level (`procedural_generate_level`). Campaign chain (`state.campaign_state`) tracks completed biomes (`forest`, `cave`, `ice`, `desert`, `astro`) and unlocks the final `victory` scene.

### Localization (i18n)
`DE.I18n` supports Turkish (`tr`) and English (`en`). All UI labels, button text, and HUD elements (`LocalizedLabel`, `KitLabelSync`) refresh live on language toggle (`T` key). Translation dictionary is embedded in `engine/i18n.js`.

### SaveGame
`DE.SaveGame` writes `savegame.json` (BOM-less, minimal: `{"lang":"tr","high_score":0}`). Profile data includes `biomes_completed`, `endless_score`, `difficulty`, and `high_score`.

### Developer Tools
In-game console (` ` / `"`) with 11 commands (`hp`, `heal`, `god`, `coins`, `speed`, `jump`, `tp`, `respawn`, `list`, `tilemap_save`, `tilemap_load`). `deep-tool.bat` / `tools_html/deep-tool.js` provides interactive TR/EN scanning (`all` checks: syntax, secret scan, regression, dead code, complexity).

---

## Product — Star Collector Hero (v0.1.20)
A fully playable 2D platformer with:
- **Campaign**: 5 biomes (`forest`, `lava_cave`, `ice`, `desert`, `astro`) + final `victory`
- **Endless Mode**: unlockable, procedural difficulty scaling
- **Bosses**: 5 unique types (ground dev, flyer, laser sniper, layered shield, cosmic astro)
- **Physics**: double jump, dash (`i-frame`), magnet coin, triple laser, shield, lightning speed, time slow
- **Procedural seed**: same input = same level
- **Mobile touch controls**: analog stick + A/X/LB buttons
- **Web Editor**: `webpanel.bat` (`127.0.0.1:8766`) for level design

---

## Build / Validation

```bash
# Full syntax scan (21 engine + 8 game + 3 demo files — 0 errors)
node -c deep_engine_html/engine/*.js
node deep_engine_html/test_core.js    # 53/0
node deep_engine_html/test_game.js    # 163/0
node deep_engine_html/test_visual.js  # 31/0
node tools_html/test_tools.js         # 36/0
node tools_html/test_browser.js       # 52/0
```

---

## Running / Browser Play
Open `deep_engine_html/index.html` in any modern browser (`file://` works — no server required). For `.map` level testing: `demo3d/map_test.html`. For 3D pipeline verification: `demo3d/index.html` (WebGL cube + voxel grid).

---

*License: All Rights Reserved. Private property (`tcknmx`). Source available for review; redistribution requires explicit permission.*
