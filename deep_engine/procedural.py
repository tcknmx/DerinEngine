"""
================================================================================
DerinEngine - Procedural Level Generator
================================================================================
Generates random but always playable levels: platform areas with rolling
terrain, featuring different **biomes** and **enemy placements**.

This module lives in the *engine* layer and is independent of the game: it
does not build scenes; it only produces a JSON-compatible level data dictionary
that the builders in 'main.py' (levelfile.place_object) understand. The game
side (main.build_procedural_level) then does the setup using its own
enemy/platform builders.

Usage:
    data = procedural.generate(biome="ice", seed=1234, chunks=8)
    # -> {"name": ..., "background_color": [...], "parallax_theme": "ice",
    #     "objects": [ {"tag": "Ground", ...}, {"tag":"Player",...}, ... ]}

Biomes: forest, cave, ice, desert, astro  (biome=None -> random)
================================================================================
"""

import random
import time

# Grid / world constants
CHUNK_W = 300          # Horizontal width of each chunk (px)
GROUND_H = 40          # Ground thickness (px)
WORLD_H = 620          # Invisible ceiling/scene height (infrastructure)

# -----------------------------------------------------------------------------
# Biome Definitions
# -----------------------------------------------------------------------------
BIOMES = {
    "forest": {
        "name_tr": "Orman Vadisi",
        "name_en": "Forest Valley",
        "background": (16, 24, 34),
        "parallax": "forest",
        "platform": (60, 90, 130),
        "platform_alt": (40, 70, 110),
        "fog": (120, 255, 170),
        "coin": [255, 215, 0],
        "enemy_pool": ["Enemy", "Hopper", "Flyer", "Spikes"],
    },
    "cave": {
        "name_tr": "Karanlık Mağara",
        "name_en": "Dark Cave",
        "background": (12, 10, 20),
        "parallax": "cave",
        "platform": (70, 60, 80),
        "platform_alt": (55, 46, 66),
        "fog": (180, 180, 190),
        "coin": [255, 190, 60],
        "enemy_pool": ["Enemy", "Hopper", "Turret", "Spikes"],
    },
    "ice": {
        "name_tr": "Buz Diyarı",
        "name_en": "Frozen Realm",
        "background": (150, 200, 235),
        "parallax": "ice",
        "platform": (90, 170, 220),
        "platform_alt": (120, 200, 245),
        "fog": (220, 250, 255),
        "coin": [150, 240, 255],
        "enemy_pool": ["Enemy", "Flyer", "Hopper", "Spikes"],
    },
    "desert": {
        "name_tr": "Çöl Fırtınası",
        "name_en": "Desert Storm",
        "background": (60, 45, 30),
        "parallax": "desert",
        "platform": (190, 140, 70),
        "platform_alt": (160, 110, 55),
        "fog": (255, 220, 150),
        "coin": [255, 200, 90],
        "enemy_pool": ["Enemy", "Hopper", "Flyer", "Turret"],
    },
    "astro": {
        "name_tr": "Yıldız Boşluğu",
        "name_en": "Astral Void",
        "background": (12, 10, 28),
        "parallax": "astro",
        "platform": (60, 60, 110),
        "platform_alt": (45, 45, 95),
        "fog": (160, 170, 255),
        "coin": [200, 190, 255],
        "enemy_pool": ["Flyer", "Turret", "Hopper", "Spikes"],
    },
}

BIOME_NAMES = list(BIOMES.keys())


# -----------------------------------------------------------------------------
# Generator
# -----------------------------------------------------------------------------
def pick_biome(biome=None, rng: random.Random = None):
    """Returns the given biome; if None, picks one at random (seeded)."""
    if biome is not None and biome in BIOMES:
        return biome
    if rng is not None:
        return rng.choice(BIOME_NAMES)
    return random.choice(BIOME_NAMES)


def generate(biome=None, seed=None, chunks=8, difficulty=0, viewport_width=900):
    """Generates a random, playable level data dictionary.

    - biome: "forest"|"cave"|"ice"|"desert"|"astro" (None -> random)
    - seed:  a specific seed (same seed yields the same level). None -> random.
    - chunks: number of ground segments (generation length).
    - difficulty: 0..4. As it rises, enemy count/speed/fire rate increase and
      powerups & coins decrease.
    - viewport_width: horizontal width of the player's initial view area (px).
      Following the "smooth opening" principle, the player sees the entire
      spawn screen (view area) clear; the first threat starts beyond that view
      area -> the player is not ambushed and has time to react.
    """
    if seed is None:
        # To produce a different first level each session in every environment
        # (including the web/WASM/pygbag), add TIME entropy on top of Python's
        # random module. In some environments (especially WASM, where
        # os.urandom is unreliable) random can start with a fixed seed -> then
        # the first level would always be the same. Time changes on every run,
        # which guarantees this variety.
        seed = (random.randint(0, 999999) + int(time.time_ns())) % 100000000
    rng = random.Random(seed)

    bname = pick_biome(biome, rng)
    b = BIOMES[bname]

    objects = []
    ground_level = 480  # starting ground height

    # Player start point (also added as a Player object below)
    player_start_x = 60
    # 'Safe start' zone: no threats (enemies/spikes) are placed within this
    # horizontal distance from the spawn point -> a natural, comfortable opening.
    # View-based: the player sees the ENTIRE spawn screen (viewport) clear; the
    # first threat starts just outside the view area. This satisfies both the
    # "first screen is clean everywhere" and "fair first enemy (reaction time)"
    # principles together.
    safe_zone_width = max(260, int(viewport_width))
    safe_max_x = player_start_x + safe_zone_width

    # --- Ground / platform segments (rolling, continuous, step by step) ---
    # Height changes by -2..+2 tiles per chunk; big jumps can be crossed with
    # automatic ladders/springs, so the level always stays completable.
    world_end_x = chunks * CHUNK_W

    segment_start = 0
    prev_y = ground_level
    seg_heights = []  # ground height of each segment (later used for island placement)
    for c in range(chunks):
        cx0 = c * CHUNK_W
        cx1 = (c + 1) * CHUNK_W
        # Height step (in tiles): -2..+2
        step = rng.randint(-2, 2)
        # GUARANTEED PROGRESSION PATH: the player's spawn screen + view area
        # starts FLAT (no rises or drops). So the opening never risks a spiked
        # wall or a sudden pit; the player moves on comfortably from the safe zone.
        if (cx0 + safe_zone_width) < CHUNK_W * 2:
            step = 0
        new_y = max(320, min(540, prev_y + step * 32))
        seg_heights.append(new_y)
        # Ground platform (along this segment)
        _push(objects, "Ground", cx0, new_y, CHUNK_W, GROUND_H, b["platform"])
        # Visual: lower-layer fill (darker)
        _push(objects, "Ground", cx0, new_y + GROUND_H, CHUNK_W, WORLD_H - new_y - GROUND_H, b["platform_alt"])

        # If the height difference is large, add a spring for the transition
        # (guarantees climbing back up).
        # A spring is NEVER placed inside the safe zone (first view area): a
        # spawn spring at the player's start point (x=60) kept launching the
        # player (vy=-850) so they couldn't land/float back down. Since the
        # first segment already starts FLAT, no spring is needed there.
        if (cx0 >= safe_max_x) and new_y < prev_y and (prev_y - new_y) >= 64:
            # Sit the spring ON TOP of the new (lower) ground: y = ground top - spring height,
            # so the spring is not buried in the ground/soil. We place X at the segment start so that:
            #  1) it sits near the landing point (where the high ground ends),
            #  2) room stays for the 'island' platform in the rest of the segment.
            _push(objects, "Spring", cx0 + 60, new_y - 16, None, None, [50, 220, 120])

        # --- Decor: coin, enemy, powerup (island separate, next pass) ---
        # No threats on the first segment (spawn zone): safe start area
        _place_chunk_enemies(objects, rng, cx0, cx1, new_y, b, difficulty, safe_max_x=safe_max_x)
        _place_chunk_coins(objects, rng, cx0, cx1, new_y, b, difficulty)
        _maybe_powerup(objects, rng, cx0, cx1, new_y, difficulty, safe_max_x=safe_max_x)

        prev_y = new_y

    # --- Islands: added AFTER all springs are placed ---
    # This way an island in one segment never "misses" a spring added to a
    # neighboring segment; it avoids islands based on the springs' real positions.
    for c in range(chunks):
        cx0 = c * CHUNK_W
        cx1 = (c + 1) * CHUNK_W
        _maybe_island(objects, rng, cx0, cx1, seg_heights[c], b, difficulty, safe_max_x=safe_max_x)
        _maybe_breakable(objects, rng, cx0, cx1, seg_heights[c], safe_max_x=safe_max_x,
                         is_last_chunk=(c == chunks - 1))

    # --- Player start (first segment) ---
    objects.append({
        "tag": "Player", "name": "Player",
        "x": 60, "y": ground_level - 70, "w": 32, "h": 32,
        "color": [60, 200, 245],
    })

    # --- Exit portal (at the end of the world, above the ground) ---
    # the next key is wired to the boss scene by build_campaign_entry
    objects.append({
        "tag": "Portal", "name": "Portal",
        "x": world_end_x - 120, "y": prev_y - 70, "w": 40, "h": 60,
        "color": [160, 80, 240], "next": "campaign_boss",
    })

    return {
        "name": f"Procedural {bname} (#{seed})",
        "name_tr": f"Prosedürel {b['name_tr']}",
        "name_en": f"Procedural {b['name_en']}",
        "background_color": list(b["background"]),
        "parallax_theme": b["parallax"],
        "biome": bname,
        "seed": seed,
        "difficulty": difficulty,
        "objects": objects,
    }


# --- Helper builders ---
def _push(objects, tag, x, y, w, h, color, **extra):
    entry = {"tag": tag, "name": tag, "x": round(x, 1), "y": round(y, 1)}
    if w is not None:
        entry["w"] = round(w, 1)
    if h is not None:
        entry["h"] = round(h, 1)
    if color:
        entry["color"] = list(color)
    entry.update(extra)
    objects.append(entry)
    return entry


def _place_chunk_enemies(objects, rng, cx0, cx1, ground_y, b, difficulty=0, safe_max_x=0):
    pool = b["enemy_pool"]
    # Sentries (Turret) are introduced gradually across the campaign:
    #   - difficulty <= 1 (before the 1st boss):  none at all
    #   - difficulty   2 (after the 1st boss):    only ~40% of chunks may roll
    #     a Turret -> they start to trickle in, never stacking
    #   - difficulty >= 3 (after the 2nd boss):   full weight returns
    if difficulty <= 1:
        pool = [t for t in pool if t != "Turret"]
    elif difficulty == 2:
        pool = [t for t in pool if t != "Turret"]
        if rng.random() < 0.40:
            pool.append("Turret")
    # More enemies as difficulty rises
    count = rng.randint(1, 1 + difficulty)
    # As difficulty rises, enemies are faster / fire more often
    speed_bonus = difficulty * 25.0
    fire_penalty = max(0.5, 2.0 - difficulty * 0.25)
    bullet_bonus = difficulty * 30.0
    hp_bonus = difficulty * 10
    for _ in range(count):
        tag = rng.choice(pool)
        ex = rng.randint(cx0 + 40, cx1 - 40)
        # Skip threats that don't land outside the 'safe start' zone near the
        # spawn point: the player gets breathing room at the opening.
        if safe_max_x and ex < safe_max_x:
            continue
        if tag == "Flyer":
            _push(objects, "Flyer", ex, ground_y - rng.randint(100, 160), 26, 22, [90, 220, 200],
                  speed=55.0 + speed_bonus, hp=25 + hp_bonus)
        elif tag == "Hopper":
            _push(objects, "Hopper", ex, ground_y - 34, 28, 28, [250, 170, 60],
                  speed=40.0 + speed_bonus * 0.8, hp=25 + hp_bonus)
        elif tag == "Turret":
            _push(objects, "Turret", ex, ground_y - 34, 30, 30, [170, 60, 220],
                  fire_interval=fire_penalty, bullet_speed=240.0 + bullet_bonus, hp=25 + hp_bonus)
        elif tag == "Spikes":
            # Skip a spike that would sit right next to a spring: keep the spring's
            # approach clean so the player doesn't take instant spike damage on landing.
            spring_near = any(
                o.get("tag") == "Spring"
                and abs(ex - (o.get("x", 0) + o.get("w", 16) / 2.0)) < 55
                for o in objects)
            if spring_near:
                continue
            _push(objects, "Spikes", ex, ground_y - 16, 32, 16, [150, 150, 160])
        else:  # "Enemy" (classic patrol)
            _push(objects, "Enemy", ex, ground_y - 34, 28, 28, [235, 55, 75],
                  speed=65.0 + speed_bonus, hp=25 + hp_bonus)


def _place_chunk_coins(objects, rng, cx0, cx1, ground_y, b, difficulty=0):
    # Fewer coins as difficulty rises (resource drain)
    base = rng.randint(2, 4) - difficulty
    count = max(1, base)
    # Spike (Spikes) x ranges in this segment. If a coin lands on the same
    # horizontal line as a spike, it is moved to the spike's CLEAR TOP so the
    # player can collect it with a jump (double-jump tactic); no uncollectable
    # 'next-to-spike' coin remains. (The top of a negative entity becomes a
    # positive stress-reward spot.)
    spikes = [
        (o.get("x", 0), o.get("x", 0) + o.get("w", 32))
        for o in objects if o.get("tag") == "Spikes" and cx0 <= o.get("x", 0) < cx1
    ]
    for _ in range(count):
        cx = rng.randint(cx0 + 30, cx1 - 30)
        height = rng.choice([-60, -90, -120, -30])
        # Does the coin overlap the spike horizontally (edges included)? If so,
        # place it on the spike's clear top. (Based on the coin/spike rect
        # intersection, not the center.)
        coin_w = 18
        if any(cx < s1 and cx + coin_w > s0 for s0, s1 in spikes):
            height = -75  # the spike's clear top (collectible mid-air)
        _push(objects, "Coin", cx, ground_y + height, 18, 18, b["coin"])


def _maybe_powerup(objects, rng, cx0, cx1, ground_y, difficulty=0, safe_max_x=0):
    # Powerup chance decreases as difficulty rises
    prob = max(0.10, 0.35 - difficulty * 0.06)
    if rng.random() < prob:
        ptype = rng.choice(["magnet", "triple", "shield", "speed", "slow"])
        px = rng.randint(cx0 + 40, cx1 - 40)
        if safe_max_x and px < safe_max_x:
            return
        _push(objects, "PowerUp", px, ground_y - 70, 24, 24, [180, 60, 255],
              power_type=ptype, duration=8.0)


def _maybe_island(objects, rng, cx0, cx1, ground_y, b, difficulty=0, safe_max_x=0):
    """A reachable floating island platform (accessed via spring) + coins.

    Does not place an island if this segment already has a spring: the spring
    is a priority traversal element letting the player drop from high ground
    and climb back up; adding an island on/next to it would hide the spring
    and could overlap.

    On levels with difficulty >= 3, a SniperEnemy (laser sniper) is also
    placed on the island -> a stress-raising but fair (dodgeable) elevated
    platform threat.

    safe_max_x: right edge of the spawn safe zone. Neither islands nor (most
    importantly) SniperEnemy are placed on islands/high ground before this
    edge (inside the player's initial view), so the "first screen is clear"
    guarantee from item 16 also holds for snipers (the player is never shot
    instantly on the spawn screen).
    """
    # Don't allow islands+snipers in segments inside the spawn safe zone
    if safe_max_x and cx0 < safe_max_x:
        return
    # Is there a spring in this segment or at the start of the next one (an
    # island could cross the segment border and reach it)? If so, skip.
    has_spring = any(
        o.get("tag") == "Spring" and cx0 <= o["x"] < cx1 + 150 for o in objects)
    if has_spring:
        return
    if rng.random() < 0.4:
        ix = rng.randint(cx0 + 60, cx1 - 60)
        iy = ground_y - rng.randint(140, 200)
        _push(objects, "Ground", ix, iy, rng.choice([96, 128, 160]), 24, b["platform"], one_way=True)
        # A few coins on top of the island
        for k in range(3):
            _push(objects, "Coin", ix + 12 + k * 30, iy - 30, 18, 18, b["coin"])
        # Sniper: on elevated platforms, only at high difficulty levels
        if difficulty >= 3:
            _push(objects, "SniperEnemy", ix + 24, iy - 40, 24, 26, (120, 200, 90))


def _maybe_breakable(objects, rng, cx0, cx1, ground_y, safe_max_x=0, is_last_chunk=False):
    """A floating platform block breakable by bullets (occasionally).

    Hides a secret coin inside/below it: the player shoots the platform to
    break it and reach the coin. It is solid, so it can be stood on, but
    bullets can break it. It is not placed in the safe start zone. Only on
    SHORT levels (chunks <= 3), where the view area never reaches any gap,
    safety is relaxed on the LAST chunk so a short level can still produce a
    breakable block.
    """
    # Don't place a breakable platform in segments inside the safe zone
    # (on the last chunk, relax the "first screen is clear" guarantee: it extends past the view area)
    if safe_max_x and cx0 < safe_max_x and not is_last_chunk:
        return
    if rng.random() < 0.28:
        bx = rng.randint(cx0 + 60, cx1 - 60)
        by = ground_y - rng.randint(120, 170)
        # HALF block: a thin horizontal platform strip. The player stands on it,
        # bullets break it. (User: breakables in levels are for platforms.)
        bw = rng.choice([56, 64, 72])
        bh = 20  # half height (thin strip)
        _push(objects, "Breakable", bx, by, bw, bh, [150, 120, 90])
        # A hidden reward (coin) inside/nearby — reached by breaking the platform
        _push(objects, "Coin", bx + bw // 2 - 9, by + bh + 8, 18, 18, [255, 215, 0])


# -----------------------------------------------------------------------------
# Chapter Bosses (a unique boss per biome)
# -----------------------------------------------------------------------------
BOSSES = {
    "forest": {
        "name_tr": "Orman Devi", "name_en": "Forest Titan",
        "color": (90, 200, 80), "hp": 120, "fire_interval": 2.2,
        "bullet_speed": 300, "shoot_count": 1, "light": (90, 220, 90),
    },
    "cave": {
        "name_tr": "Karanlık Kolüssüs", "name_en": "Dark Colossus",
        "color": (150, 70, 210), "hp": 150, "fire_interval": 1.9,
        "bullet_speed": 330, "shoot_count": 1, "light": (170, 80, 240),
    },
    "ice": {
        "name_tr": "Buz Devi", "name_en": "Frost Titan",
        "color": (120, 210, 255), "hp": 160, "fire_interval": 1.7,
        "bullet_speed": 350, "shoot_count": 2, "light": (130, 220, 255),
    },
    "desert": {
        "name_tr": "Kum Devriyesi", "name_en": "Sand Warden",
        "color": (235, 150, 60), "hp": 180, "fire_interval": 1.5,
        "bullet_speed": 380, "shoot_count": 2, "light": (235, 160, 80),
    },
    "astro": {
        "name_tr": "Yıldız Yok Edici", "name_en": "Star Annihilator",
        "color": (190, 130, 255), "hp": 260, "fire_interval": 1.2,
        "bullet_speed": 420, "shoot_count": 3, "light": (200, 150, 255),
    },
}

# Boss types that can be randomly assigned (one of these is picked per biome)
BOSS_TYPES = ["archer", "flying", "sniper", "shield"]

# Side-effect spike count (activity for the boss arena)
def _boss_design(biome, difficulty=0, rng=None):
    """Scales the biome's boss design according to difficulty.

    - rng: for deterministically picking the boss type (archer/flying/sniper/shield).
    - boss_type determines which BossController subtype is built at build time.
    """
    if rng is None:
        rng = random.Random(0)
    b = BOSSES[biome]
    scale = 1.0 + difficulty * 0.15
    # ASTRO = final boss: always produces the combined 'cosmic' type, which can
    # do all three attacks (flying + fireball + sniper laser); other biomes pick via rng.choice.
    if biome == "astro":
        boss_type = "cosmic"
    else:
        boss_type = rng.choice(BOSS_TYPES)
    return {
        "boss_key": biome,
        "boss_type": boss_type,
        "color": list(b["color"]),
        "light": list(b["light"]),
        "hp": int(b["hp"] * scale),
        "fire_interval": max(0.6, b["fire_interval"] - difficulty * 0.15),
        "bullet_speed": int(b["bullet_speed"] * scale),
        "shoot_count": b["shoot_count"] + difficulty // 2,
        "patrol_distance": 200.0,
        "speed": 65.0 + difficulty * 10,
    }


def generate_boss_arena(biome=None, seed=None, difficulty=0, next_target="victory"):
    """Generates a chapter boss arena (played after the entrance level).

    - biome: a specific biome (None -> random). In a campaign the boss's biome
             must match the entrance biome.
    - seed: deterministic generation seed.
    - difficulty: 0..4 (boss hp/fire rate/shot count rise with it).
    - next_target: the "next" key of the following scene when the boss is
      beaten and the portal is entered.
    """
    if seed is None:
        # A different arena each session, including the web (time entropy) — see generate().
        seed = (random.randint(0, 999999) + int(time.time_ns())) % 100000000
    rng = random.Random(seed)
    bname = pick_biome(biome, rng)
    b = BIOMES[bname]

    objects = []
    ground_level = 480
    # A flat, wide arena ground
    arena_w = int(6 * CHUNK_W)
    _push(objects, "Ground", 0, ground_level, arena_w, GROUND_H, b["platform"])
    _push(objects, "Ground", 0, ground_level + GROUND_H, arena_w,
          WORLD_H - ground_level - GROUND_H, b["platform_alt"])

    # Player start (left side of the arena)
    objects.append({
        "tag": "Player", "name": "Player",
        "x": 80, "y": ground_level - 70, "w": 32, "h": 32,
        "color": [60, 200, 245],
    })

    # Boss (center of the arena)
    boss = _boss_design(bname, difficulty, rng)
    objects.append({
        "tag": "Boss", "name": "Boss",
        "x": arena_w // 2 - 32, "y": ground_level - 84, "w": 64, "h": 64,
        "color": boss["color"],
        "boss_key": boss["boss_key"],
        "boss_type": boss["boss_type"],
        "light": boss["light"],
        "hp": boss["hp"],
        "fire_interval": boss["fire_interval"],
        "bullet_speed": boss["bullet_speed"],
        "shoot_count": boss["shoot_count"],
        "patrol_distance": boss["patrol_distance"],
        "speed": boss["speed"],
        "next": next_target,
    })

    # Shield-type boss: weave a shield of breakable platforms around it.
    # The player cannot damage the boss until these platforms are broken; the
    # boss's own bullets PASS THROUGH breakable platforms (player bullets break them).
    if boss["boss_type"] == "shield":
        bcx = arena_w // 2
        bcy = ground_level - 60
        # A pair of breakable platforms (left and right) + a single top piece.
        # trigger=True: does not block physically (won't trap the boss), works via the protection guard.
        _push(objects, "Breakable", bcx - 74, bcy, 44, 44, [150, 120, 90], hits=2, trigger=True)
        _push(objects, "Breakable", bcx + 30, bcy, 44, 44, [150, 120, 90], hits=2, trigger=True)
        _push(objects, "Breakable", bcx - 22, bcy - 58, 44, 44, [150, 120, 90], hits=2, trigger=True)

    # Exit portal at the arena's end (opens when the boss dies)
    objects.append({
        "tag": "Portal", "name": "Portal",
        "x": arena_w - 160, "y": ground_level - 70, "w": 40, "h": 60,
        "color": [160, 80, 240], "next": next_target,
        "boss_arena": True,
    })

    return {
        "name": f"Boss {bname} (#{seed})",
        "name_tr": f"{b['name_tr']} - Amiral",  # flagship / chapter end
        "name_en": f"{b['name_en']} - Stronghold",
        "background_color": list(b["background"]),
        "parallax_theme": b["parallax"],
        "biome": bname,
        "seed": seed,
        "difficulty": difficulty,
        "is_boss_arena": True,
        "objects": objects,
    }
