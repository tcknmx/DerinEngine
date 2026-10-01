import os
import random
from deep_engine import (
    Engine,
    Scene,
    GameObject,
    TextRenderer,
    Health,
    SoundFX,
    I18n,
    ParallaxBackground,
    SaveGame,
    place_object,
    user_data_dir,
)


from . import state
from .entities import (
    PlayerController,
    GoalPortal,
    TutorialBanner,
)
from .ui import (
    build_main_menu_scene,
    build_game_over_scene,
    build_victory_scene,
    build_pause_scene,
)
from . import builders as _builders

_NEXT_SCENE_FACTORIES = {
    "victory": build_victory_scene,
    "menu": build_main_menu_scene,
}

def _attach_ground_tilemap(scene, data):
    """Rasterizes the generated ground into a real Tilemap (grid + 2 color layers).

    The procedural generator emits ground as flat rect sprites. This helper
    converts the ground footprint into 32px grid cells on a Tilemap attached to
    the scene, and hides the old flat ground sprites (colliders stay for physics).
    The scene keeps a `_tilemap_ground` reference (and its `to_segments()` line
    segments under `_tilemap_segments`) as the runtime <-> editor bridge.
    """
    from deep_engine import Tilemap, SpriteRenderer, GameObject
    bname = data.get("biome")
    if not bname:
        return
    from deep_engine import procedural as proc
    b = proc.BIOMES.get(bname)
    if not b:
        return

    ts = 32
    grounds = [e for e in data["objects"] if e.get("tag") == "Ground"]
    if not grounds:
        return

    # World bounding box of all ground rects
    min_x = int(min(e["x"] for e in grounds))
    min_y = int(min(e["y"] for e in grounds))
    max_x = int(max(e["x"] + e["w"] for e in grounds))
    max_y = int(max(e["y"] + e["h"] for e in grounds))

    cols = (max_x - min_x) // ts + 1
    rows = (max_y - min_y) // ts + 1
    grid = [[None] * cols for _ in range(rows)]

    def _fill(e, tid):
        c0 = int((e["x"] - min_x) // ts)
        c1 = int((e["x"] + e["w"] - min_x - 0.01) // ts)
        r0 = int((e["y"] - min_y) // ts)
        r1 = int((e["y"] + e["h"] - min_y - 0.01) // ts)
        # Upper layers (top surface, id 1) win over subsoil (id 2): a cell that
        # overlaps both keeps the top-surface color.
        for r in range(max(0, r0), min(rows, r1 + 1)):
            for c in range(max(0, c0), min(cols, c1 + 1)):
                if grid[r][c] is None or tid == 1:
                    grid[r][c] = tid

    top = tuple(b["platform"])          # surface color -> tile id 1
    soil = tuple(b["platform_alt"])     # subsoil color -> tile id 2
    for e in grounds:
        color = tuple(e.get("color", []))
        if color[:3] == soil:
            _fill(e, 2)
    for e in grounds:
        color = tuple(e.get("color", []))
        if color[:3] == top:
            _fill(e, 1)

    tm_obj = GameObject(name="TilemapGround", x=min_x, y=min_y,
                        width=cols * ts, height=rows * ts, tag="Tilemap")
    tm = tm_obj.add_component(Tilemap(tile_size=ts, offset=(min_x, min_y)))
    tm.set_tile_set({1: top, 2: soil})
    tm.add_layer(grid)
    scene.add_object(tm_obj)

    # Hide the old flat ground sprites (their colliders stay for physics);
    # islands (one-way platforms) keep their sprite, only solid ground hides.
    from deep_engine import BoxCollider
    for obj in scene.find_all_by_tag("Ground"):
        col = obj.get_component(BoxCollider)
        if col is not None and col.one_way:
            continue
        spr = obj.get_component(SpriteRenderer)
        if spr is not None:
            spr.visible = False

    # Geometry bridge: keep the tilemap + its outline segments on the scene.
    scene._tilemap_ground = tm
    scene._tilemap_segments = tm.to_segments()


def export_scene_tilemap(scene):
    """Runtime -> data: the scene's tilemap ground as JSON-safe level data.

    The counterpart of `Tilemap.to_data()`, wired into the game layer so the
    ground grid can be written to disk (console `tilemap_save`) and later fed
    back through `import_scene_tilemap`. Returns None when the scene has no
    tilemap (boss arenas / menu / UI scenes).
    """
    tm = getattr(scene, "_tilemap_ground", None)
    return None if tm is None else tm.to_data()


def import_scene_tilemap(scene, data):
    """Data -> runtime: rebuilds the scene's tilemap ground from level data.

    Accepts a `Tilemap.to_data()` dict. When the scene already has a tilemap
    object its component is updated in place (no object churn); otherwise a new
    "Tilemap" object is added. Keeps the `_tilemap_ground` /
    `_tilemap_segments` geometry bridge in sync either way. False on bad input.
    """
    if not scene or not isinstance(data, dict) or not data.get("layers"):
        return False
    from deep_engine import Tilemap
    fresh = Tilemap.from_data(data)
    obj = scene.find_by_tag("Tilemap")
    tm = obj.get_component(Tilemap) if obj is not None else None
    if tm is not None:
        # Update in place so the component's scene reference stays valid.
        tm.tile_size = fresh.tile_size
        tm.offset = list(fresh.offset)
        tm.tile_set = dict(fresh.tile_set)
        tm.layers = list(fresh.layers)
    else:
        grid = fresh.layers[0]["grid"] if fresh.layers else []
        cols = len(grid[0]) if grid else 0
        rows = len(grid)
        obj = GameObject(name="TilemapGround", x=fresh.offset[0], y=fresh.offset[1],
                         width=cols * fresh.tile_size, height=rows * fresh.tile_size,
                         tag="Tilemap")
        obj.add_component(fresh)
        scene.add_object(obj)
        tm = fresh
    scene._tilemap_ground = tm
    scene._tilemap_segments = tm.to_segments()
    return True


def _tilemap_summary(scene):
    """One-line human summary of the scene's tilemap ground (console helper)."""
    data = export_scene_tilemap(scene)
    if not data:
        return None
    grid = data["layers"][0]["grid"]
    return "%dx%d hucre, %d katman, %d kenar cizgisi" % (
        len(grid[0]) if grid else 0, len(grid), len(data["layers"]),
        len(getattr(scene, "_tilemap_segments", []) or []))


def build_procedural_level(biome=None, seed=None, chunks=8, difficulty=0):
    """Builds a random biome/level scene from the procedural generator.

    - biome: "forest"|"cave"|"ice"|"desert"|"astro" (None -> random)
    - seed:  the same seed yields the same level (None -> random)
    - difficulty: 0..4 (enemy count/speed/firing increase, powerups & coins decrease)
    """
    from deep_engine import procedural
    
    data = procedural.generate(biome=biome, seed=seed, chunks=chunks, difficulty=difficulty)

    meta = {
        "name": data["name_tr"] if I18n.current_lang == "tr" else data["name_en"],
        "background_color": tuple(data["background_color"]),
        "parallax_theme": data["parallax_theme"],
    }

    scene = Scene(name=meta["name"], background_color=meta["background_color"])
    if meta["parallax_theme"]:
        try:
            scene.parallax_background = ParallaxBackground(theme=meta["parallax_theme"])
        except Exception:
            pass  # noqa: bilinçli

    # Build objects with builders (including Player — UI & controller come automatically)
    for entry in data["objects"]:
        place_object(scene, dict(entry))

    scene.start()

    # Real tilemap ground: rasterize the flat Ground rects into a 32px grid
    # (2 color layers: platform surface + subsoil) and hide the old sprites.
    _attach_ground_tilemap(scene, data)

    # ESC opens the pause overlay while playing (menu_idle keeps quit behavior)
    _register_pause(scene)

    # Write the target star count to the UI
    _builders._finalize_goal_ui(scene)

    # Link the goal portal with the player's scene (restart behavior)
    restart_stack = [biome, seed, chunks, difficulty]

    def _restart():
        return build_procedural_level(*restart_stack)

    # Game flow: show the same level on death, the victory scene on completion
    player = scene.find_by_tag("Player")
    if player:
        ctrl = player.get_component(PlayerController)
        if ctrl is not None:
            ctrl.restart_scene_factory = _restart
            # Biome-feel physics: each biome tunes gravity/jump/grip/wind.
            ctrl.apply_biome(data.get("biome"))
        # Death scenario
        health = player.get_component(Health)
        if health is not None:
            health.on_death = lambda: Engine.switch_scene(build_game_over_scene(_restart))

    # The portal's "victory" target is already wired to build_victory_scene in _build_portal.

    # Let the procedural level be usable as a portal/chain target like other levels
    _NEXT_SCENE_FACTORIES["procedural"] = build_procedural_level

    # Play the theme matching the scene's actual biome (correct music even with random pick)
    _play_theme(data.get("biome", "forest"))

    return scene


def _play_theme(biome, is_boss=False, fallback="level"):
    """Central level-music picker used by every scene builder.

    Guarantees the same 'theme' logic everywhere a level is entered:
      - boss arenas request 'boss_<biome>',
      - anything else plays '<biome>' when known, otherwise the shared 'level' track.
    Audio generation falls back to a safe generic track when a theme is missing
    (Audio handles that internally), so no build path can crash or stall on music.
    """
    name = f"boss_{biome}" if is_boss else (biome or fallback)
    SoundFX.play_music(name)


def _register_pause(scene):
    """Wires ESC -> pause overlay to a game scene.

    On the main menu (player `menu_idle`) ESC keeps its default quit behavior;
    everywhere else ESC freezes the scene and opens the pause overlay.
    """
    sm = Engine.instance.scene_manager
    if sm is None:
        return
    sm.register("pause", build_pause_scene())

    def _on_escape():
        player = scene.find_by_tag("Player")
        ctrl = player.get_component(PlayerController) if player is not None else None
        if ctrl is not None and getattr(ctrl, "menu_idle", False):
            return False  # main menu -> ESC quits the game as usual
        sm.push("pause")
        return True

    scene.on_escape = _on_escape


# =============================================================================
#  PROCEDURAL CAMPAIGN SYSTEM
# -----------------------------------------------------------------------------
# The main mode is now the campaign: 1 entrance + 1 boss arena per biome.
#   Entrance(biome) -> (portal) -> Boss(biome) -> (boss defeated, portal opens)
#   -> Entrance(next biome) -> ... -> Entrance(astro) -> Boss(astro, final) -> Victory
#
# The biome order is shuffled when the campaign starts, BUT **astro is always
# last** (final boss). Difficulty rises by 1 each biome: more enemies/spikes,
# fewer hearts/powerups, faster and more frequent enemy fire (procedural.py
# already scales this via the 'difficulty' parameter).
# =============================================================================

def start_campaign():
    """Starts the campaign with a new random biome chain (astro final).

    The other 4 biomes are shuffled, astro is appended last. Returns the first
    entrance scene.
    """
    from deep_engine import procedural as _proc
    chain = [b for b in _proc.BIOME_NAMES if b != "astro"]
    random.shuffle(chain)
    chain.append("astro")  # final boss is always astro
    state.campaign_state["chain"] = chain
    state.campaign_state["index"] = 0
    state.campaign_state["difficulty"] = 1
    state.campaign_state["score"] = 0          # new campaign: zero the base
    state.campaign_state["sector_score"] = 0   # active sector score also zero
    return build_campaign_entrance(chain[0], 1, 0)


def _campaign_sector_wipe():
    """Reset the sector score (on death); the persistent base (previous sectors) is kept."""
    state.campaign_state["sector_score"] = 0


def _campaign_sector_commit(biome=None):
    """Add the sector score to the persistent base when the sector is completed (boss defeated).

    When the completing sector's biome is given, it is also recorded in the
    savegame's `completed_biomes` list: this is the permanent campaign progress
    that the main menu shows as unlocked biome badges.
    """
    state.campaign_state["score"] += state.campaign_state["sector_score"]
    state.campaign_state["sector_score"] = 0
    if biome:
        try:
            profile = SaveGame(os.path.join(user_data_dir(), "savegame.json"))
            done = list(profile.get("completed_biomes", []))
            if biome not in done:
                done.append(biome)
                profile.set("completed_biomes", done)
                profile.save()
        except Exception:
            pass  # noqa: bilinçli (progress persistence is best-effort)


def build_campaign_entrance(biome, difficulty, index):
    """Builds a biome's 'entrance' level in the campaign.

    The portal at the end of the entrance leads to the next boss arena (same biome).
    """
    scene = build_procedural_level(biome=biome, difficulty=difficulty)
    scene.name = scene.name.replace("Procedural", "Kampanya")

    # Onboarding: the TutorialBanner shows the mechanics step by step on the
    # first entrance (easy difficulty), until completed and while not in the
    # menu (menu_idle). Shown once via the persistent 'tutorial_done' flag.
    if index == 0 and difficulty <= 1:
        try:
            profile = SaveGame(os.path.join(user_data_dir(), "savegame.json"))
            show_tut = not profile.get("tutorial_done", False)
        except Exception:
            show_tut = True
        if show_tut:
            tut_obj = GameObject(name="TutorialBanner", tag="Tutorial", x=0, y=0)
            tut_obj.add_component(TutorialBanner())
            scene.add_object(tut_obj)

    # On player death (restart), rebuild the campaign entrance itself so the
    # portal link (to the boss) is preserved. Otherwise build_procedural_level's
    # default restart would rebuild it without wiring the portal to the boss.
    def restart_fac():
        # Campaign: sector coins/score are cleared on this death (base is kept).
        _campaign_sector_wipe()
        return build_campaign_entrance(biome, difficulty, index)
    player = scene.find_by_tag("Player")
    if player:
        ctrl = player.get_component(PlayerController)
        if ctrl is not None:
            ctrl.restart_scene_factory = restart_fac
        health = player.get_component(Health)
        if health is not None:
            health.on_death = lambda: Engine.switch_scene(build_game_over_scene(restart_fac))

    # Entrance portal -> based on the selected game mode:
    #   campaign (P): to the boss arena (same biome + difficulty)
    #   endless  (4): to a new procedural map with rising difficulty (endless loop)
    for portal in scene.find_all_by_tag("Portal"):
        gp = portal.get_component(GoalPortal)
        if gp is None:
            continue
        gp.next_scene_factory = (
            lambda b=biome, d=difficulty, i=index: (
                build_endless_level(d + 1) if state.game_mode == "endless"
                else build_campaign_boss(b, d, i)
            )
        )
    return scene


def build_campaign_boss(biome, difficulty, index):
    """Builds the boss arena in a campaign (with the biome's special boss).

    - When the boss is defeated, the arena's exit portal opens.
    - Defeating the astro boss (final boss) -> Victory screen.
    - Defeating other bosses -> the next biome's entrance (difficulty +1).
    """
    from deep_engine import procedural
    
    chain = state.campaign_state["chain"]
    is_final = (index == len(chain) - 1)  # astro -> final
    next_target = "victory" if is_final else "campaign_next_entrance"

    data = procedural.generate_boss_arena(
        biome=biome, difficulty=difficulty, next_target=next_target)

    meta = {
        "name": (I18n.t("campaign_boss") + " - "
                 + (data["name_tr"] if I18n.current_lang == "tr" else data["name_en"])),
        "background_color": tuple(data["background_color"]),
        "parallax_theme": data["parallax_theme"],
    }
    scene = Scene(name=meta["name"], background_color=meta["background_color"])
    if meta["parallax_theme"]:
        try:
            scene.parallax_background = ParallaxBackground(theme=meta["parallax_theme"])
        except Exception:
            pass  # noqa: bilinçli

    for entry in data["objects"]:
        place_object(scene, dict(entry))
    scene.start()

    # ESC opens the pause overlay while playing (menu_idle keeps quit behavior)
    _register_pause(scene)

    # In the boss arena the goal is defeating the boss, not collecting stars -> adjust the UI
    chain = state.campaign_state["chain"]
    _boss_ui = (f"{I18n.t('campaign_boss')}: {I18n.t('boss_' + biome)}   |   "
                 f"{I18n.localize('campaign_stage', index=index + 1, total=len(chain))}")
    player = scene.find_by_tag("Player")
    if player:
        ctrl = player.get_component(PlayerController)
        if ctrl and ctrl.goal_text_obj:
            gtr = ctrl.goal_text_obj.get_component(TextRenderer)
            if gtr:
                gtr.text = _boss_ui
                gtr.color = (255, 190, 120)

    # DEATH (campaign): dying on the boss level returns to that biome's normal
    # entrance level (instead of replaying the boss). Because the entrance scene
    # is rebuilt from scratch, the coins/score earned in the sector (the biome's
    # normal + boss scenes) are also cleared — the player restarts the biome from
    # the beginning. (Endless mode has a separate rule: permadeath.)
    def boss_death_target():
        # Campaign: the sector score is cleared on this death, the persistent
        # base is kept; then return to this biome's PRE-boss entrance level.
        _campaign_sector_wipe()
        return build_campaign_entrance(biome, difficulty, index)
    player = scene.find_by_tag("Player")
    if player:
        ctrl = player.get_component(PlayerController)
        if ctrl is not None:
            ctrl.restart_scene_factory = boss_death_target
        health = player.get_component(Health)
        if health is not None:
            health.on_death = (
                lambda: Engine.switch_scene(build_game_over_scene(boss_death_target)))

    # Where does the exit portal go once the boss is defeated?
    # - final (astro): victory; otherwise the next biome's entrance (difficulty +1)
    if is_final:
        def _exit():
            _campaign_sector_commit(biome)  # add the final sector score to the base
            state.campaign_state["index"] = 0
            return build_victory_scene()
    else:
        ni = index + 1
        nxt_biome = chain[ni]
        nxt_diff = difficulty + 1

        def _exit():
            _campaign_sector_commit(biome)  # add the completed sector score to the persistent base
            state.campaign_state["index"] = ni
            return build_campaign_entrance(nxt_biome, nxt_diff, ni)

    for portal in scene.find_all_by_tag("Portal"):
        gp = portal.get_component(GoalPortal)
        if gp is not None:
            gp.next_scene_factory = _exit

    _play_theme(biome, is_boss=True)

    return scene


def build_endless_level(difficulty, index=0):
    """Endless Mode (4): a boss-less procedural level chain with rising difficulty.

    After the shared entrance map in the menu, each level's portal leads to the
    next procedural map with difficulty +1 (forever). On death the same level
    (same difficulty) is rebuilt.
    """
    scene = build_procedural_level(difficulty=difficulty)
    scene.name = I18n.t("endless_name")

    restart_fac = lambda: build_endless_level(difficulty, index)
    player = scene.find_by_tag("Player")
    if player:
        ctrl = player.get_component(PlayerController)
        if ctrl is not None:
            ctrl.restart_scene_factory = restart_fac
        health = player.get_component(Health)
        if health is not None:
            health.on_death = lambda: Engine.switch_scene(build_game_over_scene(restart_fac))

    # Progress to a new procedural map with rising difficulty on each completion (endless loop)
    for portal in scene.find_all_by_tag("Portal"):
        gp = portal.get_component(GoalPortal)
        if gp is not None:
            gp.next_scene_factory = (lambda d=difficulty: build_endless_level(d + 1))

    SoundFX.play_music("level")
    _play_theme(None, fallback="level")
    return scene