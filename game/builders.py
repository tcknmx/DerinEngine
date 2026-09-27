import math
import pygame
from deep_engine import (
    Engine,
    Component,
    GameObject,
    SpriteRenderer,
    Animator,
    KeyframeAnimator,
    BoxCollider,
    PolygonCollider,
    Rigidbody2D,
    TextRenderer,
    BouncePad,
    Health,
    ParticleEmitter,
    SoundFX,
    I18n,
    LightSource,
    PowerUp,
    BreakablePlatform,
    SpawnIn,
    register_builder,
    register_extractor,
)


from .entities import (
    PlayerController,
    GoalPortal,
    PatrolEnemy,
    FlyerEnemy,
    HopperEnemy,
    TurretEnemy,
    SniperEnemy,
    BobbingAnimation,
    PatrolPlatform,
    PortalArrowUI,
)
from .bosses import (
    BossController,
    FlyingBoss,
    SniperBoss,
    CosmicBoss,
    ShieldBoss,
)
from .state import campaign_state
from . import state
from .ui import build_main_menu_scene, build_game_over_scene, build_victory_scene

# --- Builder functions: place a JSON record into a scene ---
def _build_breakable(scene, data):
    x, y = data.get("x", 0), data.get("y", 0)
    w, h = data.get("w", 48), data.get("h", 48)
    plat = GameObject(name="Breakable", x=x, y=y, width=w, height=h, tag="Breakable")
    plat.add_component(SpriteRenderer(color=tuple(data.get("color", [150, 120, 90])), border_radius=4))
    # Trigger parts like the boss shield don't physically block (so they don't
    # trap the boss); they provide "shield" protection merely by existing;
    # they are solid in normal levels.
    plat.add_component(BoxCollider(is_trigger=bool(data.get("trigger", False))))
    plat.add_component(ParticleEmitter())
    plat.add_component(BreakablePlatform(hits_to_break=data.get("hits", 1)))
    scene.add_object(plat)
    return plat


def _build_platform(scene, data):
    x, y = data.get("x", 0), data.get("y", 0)
    w, h = data.get("w", 32), data.get("h", 32)
    plat = GameObject(name="Platform", x=x, y=y, width=w, height=h, tag="Ground")
    plat.add_component(SpriteRenderer(color=tuple(data.get("color", [60, 90, 130])), border_radius=4))
    # One-way platform: walkable from the top, passable from below/sides
    plat.add_component(BoxCollider(one_way=bool(data.get("one_way", False))))
    scene.add_object(plat)
    if data.get("move_distance"):
        plat.add_component(PatrolPlatform(
            distance=data["move_distance"],
            speed=data.get("move_speed", 75.0),
            vertical=data.get("move_vertical", False)))
    return plat


class RampVisual(Component):
    """Game-side triangle drawer for a Ramp (PolygonCollider) object.

    Draws a filled triangle matching the collider shape so the slanted surface
    is actually visible (SpriteRenderer only draws axis-aligned rectangles).
    """
    def __init__(self, points, color, edge_color=None):
        super().__init__()
        self.points = points
        self.color = tuple(color)
        self.edge_color = tuple(edge_color) if edge_color else tuple(max(0, c - 40) for c in self.color)

    def draw(self, surface, camera_offset):
        ox, oy = self.game_object.position.x, self.game_object.position.y
        pts = [(int(ox + px - camera_offset.x), int(oy + py - camera_offset.y)) for px, py in self.points]
        pygame.draw.polygon(surface, self.color, pts)
        pygame.draw.polygon(surface, self.edge_color, pts, width=2)


def _build_ramp(scene, data):
    """Builds an inclined ramp as a PolygonCollider (the engine resolves slopes).

    `slope` == 1  -> rises from left (base on the ground) to the right (top edge).
    `slope` == -1 -> rises from right to left.
    The collider is a triangle; the visual is drawn by RampVisual to match it.
    """
    x, y = data.get("x", 0), data.get("y", 0)
    w, h = data.get("w", 96), data.get("h", 48)
    slope = int(data.get("slope", 1))
    if slope >= 0:
        pts = [(0, h), (w, 0), (w, h)]
    else:
        pts = [(0, 0), (0, h), (w, h)]
    ramp = GameObject(name="Ramp", x=x, y=y, width=w, height=h, tag="Ground")
    ramp.add_component(PolygonCollider(points=pts))
    color = data.get("color", [60, 90, 130])
    ramp.add_component(RampVisual(pts, color))
    scene.add_object(ramp)
    return ramp


def _build_coin(scene, data):
    x, y = data.get("x", 0), data.get("y", 0)
    coin = GameObject(name="Coin", x=x, y=y, width=18, height=18, tag="Coin")
    coin.add_component(SpriteRenderer(color=(255, 215, 0), shape="circle"))
    anim = coin.add_component(Animator(fps=8))
    anim.add_state("glow", [(255, 215, 0), (255, 235, 90), (255, 255, 170), (255, 235, 90)])
    anim.play("glow")
    coin.add_component(BoxCollider(is_trigger=True))
    coin.add_component(BobbingAnimation())
    coin.add_component(LightSource(radius=80, color=(255, 220, 50), intensity=0.8, pulsing=True, pulse_speed=4.0, pulse_amount=12.0))
    scene.add_object(coin)
    return coin


def _build_spring(scene, data):
    x, y = data.get("x", 0), data.get("y", 0)
    spring = GameObject(name="Spring", x=x, y=y, width=32, height=16, tag="Spring")
    spring.add_component(SpriteRenderer(color=(50, 220, 120), border_radius=3))
    spring.add_component(BoxCollider(is_trigger=True))
    spring.add_component(LightSource(radius=75, color=(60, 230, 130), intensity=0.7))
    spring.add_component(BouncePad(bounce_force=data.get("bounce", 850.0)))
    scene.add_object(spring)
    return spring


def _build_portal(scene, data):
    x, y = data.get("x", 0), data.get("y", 0)
    w, h = data.get("w", 40), data.get("h", 60)
    next_key = data.get("next", "victory")
    from . import scenes as _scenes_mod
    factory = _scenes_mod._NEXT_SCENE_FACTORIES.get(next_key, build_victory_scene)
    portal = GameObject(name="Portal", x=x, y=y, width=w, height=h, tag="Portal")
    portal.add_component(SpriteRenderer(color=(70, 70, 90), border_radius=12))
    portal.add_component(BoxCollider(is_trigger=True))
    portal.add_component(ParticleEmitter())
    portal.add_component(LightSource(radius=160, color=(140, 80, 230), intensity=0.85, pulsing=True, pulse_speed=2.5, pulse_amount=25.0))
    portal.add_component(GoalPortal(factory))
    portal.scene_key = next_key
    scene.add_object(portal)
    return portal


def _build_enemy(scene, data):
    x, y = data.get("x", 0), data.get("y", 0)
    w, h = data.get("w", 28), data.get("h", 28)
    enemy = GameObject(name="Enemy", x=x, y=y, width=w, height=h, tag="Enemy")
    enemy.add_component(SpriteRenderer(color=tuple(data.get("color", [235, 55, 75])), border_radius=6))
    anim = enemy.add_component(Animator(fps=6))
    base = tuple(data.get("color", [235, 55, 75]))
    darker = tuple(max(0, c - 50) for c in base)
    anim.add_state("threat", [darker, base, darker, base])
    anim.play("threat")
    enemy.add_component(BoxCollider())
    enemy.add_component(Health(max_hp=data.get("hp", 25), is_player=False))
    enemy.add_component(LightSource(radius=80, color=(255, 60, 60), intensity=0.7))
    enemy.add_component(PatrolEnemy(patrol_distance=data.get("patrol_distance", 90.0), speed=data.get("speed", 65.0)))
    enemy.add_component(SpawnIn(duration=0.5))
    scene.add_object(enemy)
    return enemy


def _build_flyer(scene, data):
    x, y = data.get("x", 0), data.get("y", 40)
    w, h = data.get("w", 26), data.get("h", 22)
    enemy = GameObject(name="Flyer", x=x, y=y, width=w, height=h, tag="Enemy")
    enemy.add_component(SpriteRenderer(color=tuple(data.get("color", [90, 220, 200])), shape="circle"))
    anim = enemy.add_component(Animator(fps=7))
    base = tuple(data.get("color", [90, 220, 200]))
    light = tuple(min(255, c + 40) for c in base)
    anim.add_state("fly", [base, light, base, light])
    anim.play("fly")
    enemy.add_component(BoxCollider())
    enemy.add_component(Health(max_hp=data.get("hp", 20), is_player=False))
    enemy.add_component(FlyerEnemy(patrol_distance=data.get("patrol_distance", 160.0),
                                   speed=data.get("speed", 55.0)))
    # Gentle bobbing via the engine's keyframe animator (position.y 3-point loop).
    # Period matches the classic bob_speed (rad/s): T = 2*pi / bob_speed.
    bob_amp = data.get("bob_amplitude", 14.0)
    bob_speed = data.get("bob_speed", 2.2)
    period = max(0.3, 2 * math.pi / bob_speed)
    kf = enemy.add_component(KeyframeAnimator(loop=True, autoplay=True))
    kf.animate("position.y", [(y, 0.0), (y - bob_amp, period * 0.5), (y, period)], ease="in_out", duration=period)
    enemy.add_component(LightSource(radius=70, color=(80, 230, 200), intensity=0.6))
    enemy.add_component(SpawnIn(duration=0.6))
    scene.add_object(enemy)
    return enemy


def _build_hopper(scene, data):
    x, y = data.get("x", 0), data.get("y", 0)
    w, h = data.get("w", 28), data.get("h", 28)
    enemy = GameObject(name="Hopper", x=x, y=y, width=w, height=h, tag="Enemy")
    enemy.add_component(SpriteRenderer(color=tuple(data.get("color", [250, 170, 60])), border_radius=6))
    enemy.add_component(Rigidbody2D(gravity=1300.0))
    enemy.add_component(BoxCollider())
    enemy.add_component(Health(max_hp=data.get("hp", 22), is_player=False))
    enemy.add_component(HopperEnemy(hop_force=data.get("hop_force", 430.0),
                                    hop_interval=data.get("hop_interval", 1.1),
                                    speed=data.get("speed", 40.0)))
    enemy.add_component(LightSource(radius=70, color=(255, 180, 70), intensity=0.6))
    enemy.add_component(SpawnIn(duration=0.5))
    scene.add_object(enemy)
    return enemy

def _build_turret(scene, data):
    x, y = data.get("x", 0), data.get("y", 0)
    w, h = data.get("w", 30), data.get("h", 30)
    fire_interval = data.get("fire_interval", 2.0)
    # Soften turret aggressiveness on the first level (low difficulty): put a
    # lower bound on the fire interval. The player won't be showered with bullets
    # in the campaign's ENTRANCE biome (difficulty<=1); at difficulty 2+ the
    # formula's tight interval is kept.
    if state.game_mode == "campaign" and campaign_state.get("difficulty", 1) <= 1:
        fire_interval = max(fire_interval, 2.0)
    fire_interval = max(1.4, fire_interval)
    enemy = GameObject(name="Turret", x=x, y=y, width=w, height=h, tag="Enemy")
    enemy.add_component(SpriteRenderer(color=tuple(data.get("color", [170, 60, 220])), border_radius=5))
    enemy.add_component(BoxCollider())
    enemy.add_component(Health(max_hp=data.get("hp", 30), is_player=False))
    enemy.add_component(TurretEnemy(fire_interval=fire_interval,
                                    bullet_speed=data.get("bullet_speed", 240.0),
                                    bullet_damage=data.get("bullet_damage", 25),
                                    range=data.get("range", 460.0)))
    enemy.add_component(LightSource(radius=90, color=(190, 90, 255), intensity=0.8, pulsing=True))
    enemy.add_component(SpawnIn(duration=0.8))
    scene.add_object(enemy)
    return enemy

def _build_sniper(scene, data):
    x, y = data.get("x", 0), data.get("y", 0)
    w, h = data.get("w", 24), data.get("h", 26)
    enemy = GameObject(name="Sniper", x=x, y=y, width=w, height=h, tag="Enemy")
    enemy.add_component(SpriteRenderer(color=tuple(data.get("color", [120, 200, 90])), border_radius=5))
    enemy.add_component(BoxCollider())
    enemy.add_component(Health(max_hp=data.get("hp", 30), is_player=False))
    enemy.add_component(SniperEnemy(fire_interval=data.get("fire_interval", 2.8)))
    enemy.add_component(LightSource(radius=90, color=(140, 255, 110), intensity=0.7, pulsing=True))
    enemy.add_component(SpawnIn(duration=1.0))
    scene.add_object(enemy)
    return enemy


def _build_spikes(scene, data):
    x, y = data.get("x", 0), data.get("y", 0)
    w, h = data.get("w", 32), data.get("h", 16)
    spikes = GameObject(name="Spikes", x=x, y=y, width=w, height=h, tag="Hazard")
    spikes.add_component(SpriteRenderer(color=(150, 150, 160), shape="spikes", border_radius=0))
    # Trigger: spikes are NOT solid blocks — the player can't "stand" on them or
    # be physically pushed through; on contact they take damage and are bounced
    # out (on_collision).
    spikes.add_component(BoxCollider(is_trigger=True))
    spikes.add_component(LightSource(radius=60, color=(200, 200, 210), intensity=0.4))
    scene.add_object(spikes)
    return spikes


def _build_powerup(scene, data):
    x, y = data.get("x", 0), data.get("y", 0)
    power_type = data.get("power_type", "magnet")
    duration = data.get("duration", 8.0)
    colors = {
        "magnet": (180, 60, 255), "triple": (255, 140, 30),
        "shield": (60, 180, 255), "speed": (255, 220, 30),
        "slow": (160, 200, 255),
    }
    light_colors = {
        "magnet": (180, 80, 255), "triple": (255, 160, 60),
        "shield": (100, 210, 255), "speed": (255, 240, 80),
        "slow": (140, 200, 255),
    }
    body_color = colors.get(power_type, (200, 200, 200))
    light_color = light_colors.get(power_type, (220, 220, 220))
    pu = GameObject(name=f"PowerUp_{power_type}", x=x, y=y, width=24, height=24, tag="PowerUp")
    pu.add_component(SpriteRenderer(color=body_color, shape="rect", border_radius=6))
    pu.add_component(BoxCollider(is_trigger=True))
    pu.add_component(BobbingAnimation(amplitude=5.0, speed=3.5))
    pu.add_component(LightSource(radius=100, color=light_color, intensity=0.85, pulsing=True, pulse_speed=5.0, pulse_amount=15.0))
    pu.add_component(PowerUp(power_type=power_type, duration=duration))
    scene.add_object(pu)
    return pu


def _build_player(scene, data):
    x, y = data.get("x", 80), data.get("y", 300)
    w, h = data.get("w", 32), data.get("h", 32)

    # Default restart: back to the main menu (real scenes override this factory).
    _restart_factory = build_main_menu_scene

    # Standard UI for playability (score, health, goal, info, power-up label)
    score_obj = GameObject(name="ScoreUI", x=20, y=10)
    score_obj.add_component(TextRenderer(text=f"{I18n.t('score')}: 0", font_size=22, color=(255, 215, 0), is_ui=True))
    scene.add_object(score_obj)

    health_obj = GameObject(name="HealthUI", x=160, y=10)
    health_obj.add_component(TextRenderer(text=f"{I18n.t('health')}: ❤️ ❤️ ❤️", font_size=22, color=(255, 80, 80), is_ui=True))
    scene.add_object(health_obj)

    goal_obj = GameObject(name="GoalUI", x=20, y=36)
    goal_obj.add_component(TextRenderer(text=f"{I18n.t('remaining_stars')}: 0", font_size=16, color=(180, 220, 255), is_ui=True))
    scene.add_object(goal_obj)

    info_obj = GameObject(name="InfoUI", x=20, y=60)
    info_obj.add_component(TextRenderer(text=I18n.t("l1_info"), font_size=13, color=(160, 240, 200), is_ui=True))
    scene.add_object(info_obj)

    pu_label = GameObject(name="PowerUpLabelUI", x=20, y=84)
    pu_label.add_component(TextRenderer(text="", font_size=18, color=(255, 230, 120), is_ui=True))
    scene.add_object(pu_label)

    streak_label = GameObject(name="StreakUI", x=20, y=110)
    streak_label.add_component(TextRenderer(text="", font_size=24, color=(255, 200, 60), is_ui=True))
    scene.add_object(streak_label)

    # Portal direction arrow: a fixed UI arrow showing the direction when the target is off-screen.
    portal_arrow = GameObject(name="PortalArrowUI", x=0, y=0)
    portal_arrow.add_component(PortalArrowUI())
    scene.add_object(portal_arrow)

    player = GameObject(name="Player", x=x, y=y, width=w, height=h, tag="Player")
    player.add_component(Rigidbody2D(gravity=1400.0))
    player.add_component(BoxCollider())
    player.add_component(ParticleEmitter())
    player.add_component(LightSource(radius=150, color=(100, 210, 255), intensity=0.95))
    player.add_component(Health(max_hp=3, is_player=True, iframe_duration=1.0,
                                on_death=lambda: Engine.switch_scene(build_game_over_scene(_restart_factory))))
    ctrl = player.add_component(PlayerController(speed=260.0, jump_force=620.0, restart_scene_factory=_restart_factory))
    ctrl.score_text_obj = score_obj
    ctrl.health_text_obj = health_obj
    ctrl.goal_text_obj = goal_obj
    ctrl.powerup_label_text_obj = pu_label
    ctrl.streak_text_obj = streak_label
    scene.add_object(player)
    scene.set_camera_target(player)
    return player


def _build_boss(scene, data):
    x, y = data.get("x", 1800), data.get("y", 360)
    w, h = data.get("w", 64), data.get("h", 64)
    boss_key = data.get("boss_key", "cave")  # hangi biyomun boss'u
    color = tuple(data.get("color", [220, 40, 30]))
    light_color = tuple(data.get("light", color))
    # Accent color: slightly brighter than the body color
    accent = tuple(min(255, c + 45) for c in color)
    boss = GameObject(name="Boss", x=x, y=y, width=w, height=h, tag="Boss")
    boss_type = data.get("boss_type", "archer")
    boss.boss_type = boss_type
    boss.add_component(SpriteRenderer(color=color, border_radius=10))
    # Flying, sniper and cosmic (final) bosses are gravity-less/kinematic -> NO Rigidbody.
    # Shield and archer bosses roam on the ground -> Rigidbody + solid BoxCollider.
    if boss_type in ("flying", "sniper", "cosmic"):
        boss.add_component(BoxCollider(is_trigger=True))
    else:
        boss.add_component(Rigidbody2D(gravity=1100.0))
        boss.add_component(BoxCollider(is_trigger=False))
    boss.add_component(ParticleEmitter())
    boss.add_component(LightSource(radius=240, color=light_color, intensity=1.0, pulsing=True, pulse_speed=3.0, pulse_amount=30.0))
    boss.boss_key = boss_key

    # This boss's exit portal (the portal leading to the boss's "next" target in a campaign).
    # NOTE: the portal is built AFTER the boss in the generate_boss_arena data; so we
    # store the "next" key on the boss and look up the portal when the boss dies (once
    # the whole scene is built). Otherwise an early lookup -> portal not found -> won't open.
    next_key = data.get("next", "victory")
    boss.scene_key = next_key

    def on_boss_death():
        boss.active = False
        SoundFX.play("explosion")
        eng = Engine.instance
        # Victory slow-mo: a short dramatic slowdown of every non-player entity
        # (enemies, enemy bullets, subsequent bosses) via the engine time layer.
        # The player keeps full control so movement still feels good.
        eng._time_slow_remaining = 0.9
        eng._time_slow_factor = 0.28
        if eng and eng.active_scene:
            eng.active_scene.add_shake(0.9)
            # Big multi-burst explosion at the boss's position whenever it dies.
            if boss.game_object:
                emitter = boss.game_object.get_component(ParticleEmitter)
                if emitter:
                    center = (boss.game_object.size.x / 2, boss.game_object.size.y / 2)
                    for _ in range(3):
                        emitter.burst(
                            count=14, color=(255, 160, 60), speed_range=(70, 220),
                            size_range=(5, 10), lifespan_range=(0.5, 1.0), gravity=140.0,
                            origin_offset=center)
                        emitter.burst(
                            count=10, color=(255, 240, 200), speed_range=(40, 160),
                            size_range=(3, 7), lifespan_range=(0.35, 0.7), gravity=0,
                            origin_offset=center)
        # Look up the portal dynamically: everything is built once the boss dies.
        # CAUTION: the boss may share the same scene_key (its next target) and comes
        # before the portal in the object list; so we only search for tag="Portal".
        exit_portal = next(
            (o for o in scene.game_objects
             if o.tag == "Portal" and getattr(o, "scene_key", None) == getattr(boss, "scene_key", next_key)),
            None)
        if exit_portal:
            portal_comp = exit_portal.get_component(GoalPortal)
            if portal_comp:
                portal_comp.unlock()
        # "enter the portal" notice in the UI (if present)
        ctrl = scene.find_by_tag("Player")
        if ctrl:
            pc = ctrl.get_component(PlayerController)
            if pc and pc.powerup_label_text_obj:
                tr = pc.powerup_label_text_obj.get_component(TextRenderer)
                if tr:
                    tr.text = I18n.t("campaign_defeated")
                    tr.color = (120, 255, 180)

    boss.add_component(Health(max_hp=data.get("hp", 100), is_player=False, on_death=on_boss_death))
    if boss_type == "flying":
        boss.add_component(FlyingBoss(
            distance=data.get("patrol_distance", 180.0),
            speed=data.get("speed", 70.0),
            fire_interval=data.get("fire_interval", 1.6),
            bullet_speed=data.get("bullet_speed", 260.0),
            shoot_count=data.get("shoot_count", 2),
            body_color=color, accent_color=accent, boss_key=boss_key))
    elif boss_type == "sniper":
        boss.add_component(SniperBoss(
            distance=0.0, speed=data.get("speed", 30.0),
            fire_interval=data.get("fire_interval", 2.4),
            bullet_speed=data.get("bullet_speed", 0.0),
            shoot_count=data.get("shoot_count", 1),
            body_color=color, accent_color=accent, boss_key=boss_key))
    elif boss_type == "shield":
        boss.add_component(ShieldBoss(
            distance=data.get("patrol_distance", 60.0),
            speed=data.get("speed", 45.0),
            fire_interval=data.get("fire_interval", 2.2),
            bullet_speed=data.get("bullet_speed", 320.0),
            shoot_count=data.get("shoot_count", 2),
            body_color=color, accent_color=accent, boss_key=boss_key))
    elif boss_type == "cosmic":
        # ASTRO (FINAL) boss: flies + fireballs (aimed at the player) + sniper laser.
        boss.add_component(CosmicBoss(
            distance=data.get("patrol_distance", 180.0),
            speed=data.get("speed", 70.0),
            fire_interval=data.get("fire_interval", 1.6),
            bullet_speed=data.get("bullet_speed", 260.0),
            shoot_count=data.get("shoot_count", 2),
            body_color=color, accent_color=accent, boss_key=boss_key,
            beam_interval=max(3.0, data.get("fire_interval", 4.2) * 2.0)))
    else:  # archer (default BossController)
        boss.add_component(BossController(
            patrol_distance=data.get("patrol_distance", 160.0),
            speed=data.get("speed", 65.0),
            fire_interval=data.get("fire_interval", 2.0),
            bullet_speed=data.get("bullet_speed", 320.0),
            shoot_count=data.get("shoot_count", 1),
            body_color=color, accent_color=accent, boss_key=boss_key))
    scene.add_object(boss)
    return boss


# --- Extractors: gather type-specific data when saving an object to JSON ---
def _extract_enemy(obj):
    comp = obj.get_component(PatrolEnemy)
    hp = obj.get_component(Health)
    return {"patrol_distance": comp.distance if comp else 90.0,
            "speed": comp.speed if comp else 65.0,
            "hp": hp.max_hp if hp else 25}


def _extract_ramp(obj):
    kf = obj.get_component(KeyframeAnimator)
    coll = obj.get_component(PolygonCollider)
    pts = coll.points if coll else [(0, 0), (32, 0), (32, 32)]
    w = int(max(p[0] for p in pts))
    h = int(max(p[1] for p in pts))
    left_low = pts[0][0] == 0 and pts[0][1] == h
    return {"w": w, "h": h, "slope": 1 if left_low else -1,
            "color": list(obj.get_component(SpriteRenderer).color) if obj.get_component(SpriteRenderer) else [60, 90, 130]}


def _extract_platform(obj):
    comp = obj.get_component(PatrolPlatform)
    data = {}
    if comp:
        data.update({"move_distance": comp.distance, "move_speed": comp.speed, "move_vertical": comp.vertical})
    # Also save the one-way platform flag (kept when rebuilding)
    collider = obj.get_component(BoxCollider)
    if collider and collider.one_way:
        data["one_way"] = True
    return data


def _extract_breakable(obj):
    comp = obj.get_component(BreakablePlatform)
    data = {"hits": comp.hits_to_break if comp else 1}
    col = obj.get_component(BoxCollider)
    if col and col.is_trigger:
        data["trigger"] = True
    return data


def _extract_spring(obj):
    comp = obj.get_component(BouncePad)
    return {"bounce": comp.bounce_force if comp else 850.0}


def _extract_powerup(obj):
    comp = obj.get_component(PowerUp)
    return {"power_type": comp.power_type if comp else "magnet",
            "duration": comp.duration if comp else 8.0}


def _extract_boss(obj):
    comp = obj.get_component(BossController)
    bcomp = obj.get_component(FlyingBoss) or obj.get_component(SniperBoss) or obj.get_component(ShieldBoss)
    hp = obj.get_component(Health)
    data = {"hp": hp.max_hp if hp else 100}
    boss_type = getattr(obj, "boss_type", None)
    if boss_type:
        data["boss_type"] = boss_type
    if comp:
        data.update({"patrol_distance": comp.distance, "speed": comp.speed})
    if bcomp:
        data["patrol_distance"] = getattr(bcomp, "distance", 160.0)
        data["speed"] = getattr(bcomp, "speed", 60.0)
    return data


def _extract_portal(obj):
    return {"next": getattr(obj, "scene_key", "victory")}


def _extract_flyer(obj):
    comp = obj.get_component(FlyerEnemy)
    hp = obj.get_component(Health)
    kf = obj.get_component(KeyframeAnimator)
    anim = kf.animations.get("position.y") if kf else None
    nodes = anim["nodes"] if anim else []
    amp = 14.0
    if len(nodes) >= 2:
        amp = abs(nodes[0][0] - nodes[1][0])
    speed = 2.2
    if anim and anim.get("length"):
        speed = 2 * math.pi / anim["length"]
    return {"patrol_distance": comp.distance if comp else 160.0,
            "speed": comp.speed if comp else 55.0,
            "bob_amplitude": amp,
            "bob_speed": speed,
            "hp": hp.max_hp if hp else 20}


def _extract_hopper(obj):
    comp = obj.get_component(HopperEnemy)
    hp = obj.get_component(Health)
    return {"hop_force": comp.hop_force if comp else 430.0,
            "hop_interval": comp.hop_interval if comp else 1.1,
            "speed": comp.speed if comp else 40.0,
            "hp": hp.max_hp if hp else 22}


def _extract_turret(obj):
    comp = obj.get_component(TurretEnemy)
    hp = obj.get_component(Health)
    return {"fire_interval": comp.fire_interval if comp else 2.0,
            "bullet_speed": comp.bullet_speed if comp else 240.0,
            "bullet_damage": comp.bullet_damage if comp else 25,
            "range": comp.range if comp else 600.0,
            "hp": hp.max_hp if hp else 30}


def _extract_sniper(obj):
    comp = obj.get_component(SniperEnemy)
    hp = obj.get_component(Health)
    spr = obj.get_component(SpriteRenderer)
    return {"fire_interval": comp.fire_interval if comp else 2.8,
            "hp": hp.max_hp if hp else 30,
            "color": list(spr.color) if spr else [120, 200, 90]}


def _finalize_goal_ui(scene):
    """Writes the goal star count to the UI after the level is loaded."""
    coin_count = len(scene.find_all_by_tag("Coin"))
    player = scene.find_by_tag("Player")
    if not player:
        return
    ctrl = player.get_component(PlayerController)
    if ctrl and ctrl.goal_text_obj:
        txt = ctrl.goal_text_obj.get_component(TextRenderer)
        if txt:
            txt.text = f"{I18n.t('remaining_stars')}: {coin_count} ({I18n.t('stars_goal_desc')})"


def _register_level_builders():
    # Placement (read) builders
    register_builder("Platform", _build_platform)
    register_builder("Ground", _build_platform)
    register_builder("Ramp", _build_ramp)
    register_builder("Breakable", _build_breakable)
    register_builder("Coin", _build_coin)
    register_builder("Spring", _build_spring)
    register_builder("Portal", _build_portal)
    register_builder("Enemy", _build_enemy)
    register_builder("Flyer", _build_flyer)
    register_builder("Hopper", _build_hopper)
    register_builder("Turret", _build_turret)
    register_builder("SniperEnemy", _build_sniper)
    register_builder("Spikes", _build_spikes)
    register_builder("PowerUp", _build_powerup)
    register_builder("Player", _build_player)
    register_builder("Boss", _build_boss)
    # Save (write) extractors
    register_extractor("Enemy", _extract_enemy)
    register_extractor("Flyer", _extract_flyer)
    register_extractor("Hopper", _extract_hopper)
    register_extractor("Turret", _extract_turret)
    register_extractor("SniperEnemy", _extract_sniper)
    register_extractor("Platform", _extract_platform)
    register_extractor("Ground", _extract_platform)
    register_extractor("Ramp", _extract_ramp)
    register_extractor("Breakable", _extract_breakable)
    register_extractor("Spring", _extract_spring)
    register_extractor("PowerUp", _extract_powerup)
    register_extractor("Boss", _extract_boss)
    register_extractor("Portal", _extract_portal)


# Register during module load (so the editor/loader is ready afterwards)
_register_level_builders()
