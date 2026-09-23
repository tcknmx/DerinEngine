# Star Collector Hero

The first version of my game engine, written from scratch in Python + pygame (SDL), ships with a complete playable platformer: a procedural campaign, unique bosses, dynamic lighting and a built-in live level editor. The project is in active development.

## Features

- Built-in FPS counter & debug panel (F3)
- 2D dynamic lighting engine (dark-cave atmosphere)
- Physics engine: gravity, collisions, one-way platforms, trampolines
- Procedural level generator (same seed = same level)
- Procedural campaign: 5 biomes (Forest, Lava Cave, Ice, Desert, Astro) in a random chain with rising difficulty — the Astro Boss is the final boss
- 5 unique bosses: Forest Giant, Dark Colossus, Ice Giant, Sand Patrol, Star Destroyer
- Algorithmic 8-bit music: 10 mathematically generated tracks (one per biome + boss), built from melody/bass/harmony/rhythm layers
- Retro 8-bit sound effects synthesized in memory (no external files)
- Combat & projectile system + enemy variety: Patrol, Flyer, Hopper, Turret, Spike hazards
- 4 PowerUps: Magnetic Pull, Triple Shot, Shield, Storm Speed
- 3-heart health system with invulnerability (i-frames)
- Multi-language UI — Turkish / English live toggle (T)
- Persistent high score & language saving
- Live Level Editor: undo, copy/paste, save & load JSON levels
- Play user-levels from file (custom_level.json / [C])
- Full gamepad support

## Controls

| Action | Keys |
|---|---|
| Movement | A / D (or left analog / D-Pad) |
| Jump (Stretch Physics) | SPACE / W / Up arrow (Gamepad: A) |
| Double Jump | press Jump again in mid-air |
| Dash | LSHIFT (Gamepad: LB) |
| Shoot | F or LEFT CLICK (Gamepad: X) |
| Change Language (TR/EN) | T |
| Toggle Level Editor | E |
| Return to Main Menu | M |
| Restart | R (Gamepad: A) |
| FPS / Debug Panel | F3 |
| Quit | ESC (Gamepad: Start) |

## Main Menu

| [P] Campaign (procedural)  • [1] Forest  • [2] Lava Cave  • [4] Random Level |
|---|
| [3] Level + Editor  •  [C] Play saved level  •  [T] Language |

## Editor Shortcuts

| Left-Click = Place  •  Right-Click = Delete  •  [1-9] Tools |
|---|
| [Z] Undo  •  [C] Copy  •  [V] Paste  •  [S] Save  •  [L] Load |

---

## Star Collector Hero — v0.1.19 Update

Full campaign, unique bosses, a live level editor — plus a fresh set of gameplay improvements.

What's new since v0.1.0:

- Live animated main menu with a close-up camera over the real campaign level
- Smooth fade transitions between scenes
- Mouse support in the main menu
- Shooting stars drifting across the menu sky
- 3 new boss types: Flying, Lazer Sniper, Shielded — plus a grander final Astro boss
- Breakable platforms with hidden coins inside
- Endless Mode — never-ending, ever-harder levels (unlocked by beating the campaign)
- Slow-Motion PowerUp that slows enemies and their bullets
- Stun Dash — knock enemies into a daze
- New Lazer Turret enemy that tracks and fires at you
- Fair enemy spawning — they blink in, no cheap ambushes
- Checkpoint rescue — fall off and return to your last safe spot, not the level start
- Platforming polish: coyote time, jump buffering, variable jumps, wall slide & wall jump, hit-stop, screen shake
- Feedback effects: coin burst particles, floating score pop-ups, enemy death explosions, camera kicks
- Upgraded Level Editor: inspect panel to move, resize, recolor & delete objects
- Screen edge vignette + red flash on taking damage

---

## About the Engine

DerinEngine is the modular 2D game engine built from scratch for this project (`deep_engine/`): scene/object/component architecture, physics, collisions, tween/animation, particles, lighting, parallax, i18n, a level file format and the live editor. The game layer (`game/`) connects to the engine through its public API; the engine knows nothing about the game.

## Getting Started

```bash
pip install pygame
python main.py
```

### Windows standalone build (PyInstaller)

```bash
python -m PyInstaller --noconfirm --clean --onedir --windowed \
  --name "StarCollectorHero" \
  --add-data "custom_level.json;." \
  --collect-submodules deep_engine main.py
```

Output: `dist\StarCollectorHero\` (game data is written next to the exe).

### Web build (pygbag)

```bash
python -m pygbag --build --app_name StarCollectorHero .
```

Output: `build/web/` (game data is saved to localStorage in the browser).

## Project Structure

```
main.py                 # thin entry point
game/                   # game layer
  state.py              # campaign / endless / global state
  entities.py           # PlayerController, enemies
  bosses.py             # chapter boss types
  scenes.py             # procedural / campaign / endless scene builders
  builders.py           # level file builders + extractors
  ui.py                 # menu and UI scenes
deep_engine/            # DerinEngine core (game-independent)
  core.py               # Engine (game loop, window)
  scene.py, game_object.py, components.py, tween.py
  input.py, audio.py, particles.py, parallax.py, lighting.py
  i18n.py, editor.py, levelfile.py, procedural.py, savegame.py, math2d.py
tools/deep-tool.py      # dev scan/checkup CLI tool (TR/EN)
custom_level.json       # level file (format version: 1)
version.txt             # version history
```

## License

Released under the [MIT License](LICENSE). Copyright (c) 2026 tcknmx. See the `LICENSE` file for details.

---

*Latest version: **0.1.19** | Version history: see `version.txt`*