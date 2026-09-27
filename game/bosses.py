import math
import pygame
from deep_engine import (
    Engine,
    GameObject,
    Component,
    SpriteRenderer,
    BoxCollider,
    Rigidbody2D,
    Health,
    Projectile,
    ParticleEmitter,
    SoundFX,
    I18n,
    LightSource,
    Vector2,
)
from deep_engine.components import _slow_dt, _AutoRemove

from game.entities import PlayerController


# (Boss classes use game logic independently of the engine.)

class BossController(Component):
    """End-of-level boss: jumps, throws fireballs, and has a top health bar.

    Receives a biome-specific look (body_color) and attack (fire_interval,
    bullet_speed, shoot_count) so the same mechanic can be reused across boss types.
    """
    def __init__(self, patrol_distance=200.0, speed=60.0,
                 fire_interval=2.0, bullet_speed=320.0, shoot_count=1,
                 body_color=(220, 40, 30), accent_color=(255, 230, 80),
                 boss_key="cave"):
        super().__init__()
        self.distance = patrol_distance
        self.speed = speed
        self.fire_interval = fire_interval
        self.bullet_speed = bullet_speed
        self.shoot_count = shoot_count
        self.body_color = tuple(body_color)
        self.accent_color = tuple(accent_color)
        self.boss_key = boss_key
        self.start_x = 0.0
        self.direction = -1
        self.jump_timer = 0.0
        self.shoot_timer = 0.0
        self.health = None
        self.font = None
        self._pattern_index = 0        # attack pattern cycle (variety)
        self._telegraph_timer = 0.0    # pre-attack telegraph (visual)
        self._telegraph_active = False

    def start(self):
        self.start_x = self.game_object.position.x
        self.health = self.game_object.get_component(Health)
        self.font = pygame.font.SysFont("Arial", 14, bold=True)

    def update(self, dt: float):
        rb = self.game_object.get_component(Rigidbody2D)
        if not rb:
            return
        # Time-slow powerup: boss movement/fire rate slow down (player is unaffected)
        dt = _slow_dt(dt)

        self.game_object.position.x += self.speed * self.direction * dt
        if abs(self.game_object.position.x - self.start_x) >= self.distance:
            self.direction *= -1

        self.jump_timer += dt
        if self.jump_timer > 3.2 and rb.is_grounded:
            self.jump_timer = 0.0
            rb.velocity.y = -620.0
            rb.is_grounded = False
            SoundFX.play("jump")

        self.shoot_timer += dt
        # Boss attack variety: cycle through patterns + speed up when low on HP (enrage)
        eff_interval = self.fire_interval
        if self.health and self.health.max_hp > 0 and self.health.current_hp > 0:
            hp_ratio = self.health.current_hp / self.health.max_hp
            if hp_ratio < 0.5:
                eff_interval = self.fire_interval * 0.75  # fires faster below half HP
        if self.shoot_timer > eff_interval:
            self.shoot_timer = 0.0
            self._pattern_index = (self._pattern_index + 1) % 3
            if self._pattern_index == 0:
                self._shoot_fireball()
            elif self._pattern_index == 1:
                self._shoot_ring()
            else:
                self._shoot_aimed()

    def _shoot_fireball(self):
        engine = Engine.instance
        if not engine or not engine.active_scene:
            return

        SoundFX.play("shoot")
        fb_x = self.game_object.position.x + (self.game_object.size.x if self.direction > 0 else -16)
        fb_y = self.game_object.position.y + 20

        # Fire shoot_count as a single-burst fan (light + particles for hit feedback)
        steps = max(1, self.shoot_count)
        spread_angle = 0.35  # radians (about 20°)
        for i in range(steps):
            # Single shot: center. Multiple: straight fan angles.
            if steps == 1:
                angle = 0.0
            else:
                t = i / (steps - 1) if steps > 1 else 0.0
                angle = spread_angle * (t - 0.5)
            dx = self.direction * abs(math.cos(angle))
            dy = math.sin(angle) + 0.1
            # normalize
            mag = (dx * dx + dy * dy) ** 0.5
            if mag == 0:
                continue
            direction = Vector2(dx / mag, dy / mag)

            fireball = GameObject(name="Fireball", x=fb_x, y=fb_y, width=16, height=16, tag="Enemy")
            fireball.add_component(SpriteRenderer(color=self.accent_color, shape="circle"))
            fireball.add_component(BoxCollider(is_trigger=True))
            fireball.add_component(ParticleEmitter())
            fireball.add_component(LightSource(radius=90, color=self.accent_color, intensity=0.9))
            fireball.add_component(Projectile(direction=direction, speed=self.bullet_speed, damage=1, is_enemy_bullet=True))
            engine.active_scene.add_object(fireball)

    def _fire_projectile(self, direction: Vector2):
        """Fires a single boss fireball in the given direction (shared helper)."""
        fb_x = self.game_object.position.x + self.game_object.size.x / 2 - 8
        fb_y = self.game_object.position.y + self.game_object.size.y / 2 - 8
        fireball = GameObject(name="Fireball", x=fb_x, y=fb_y, width=16, height=16, tag="Enemy")
        fireball.add_component(SpriteRenderer(color=self.accent_color, shape="circle"))
        fireball.add_component(BoxCollider(is_trigger=True))
        fireball.add_component(ParticleEmitter())
        fireball.add_component(LightSource(radius=90, color=self.accent_color, intensity=0.9))
        fireball.add_component(Projectile(direction=direction, speed=self.bullet_speed, damage=1, is_enemy_bullet=True))
        Engine.instance.active_scene.add_object(fireball)

    def _shoot_ring(self):
        """Attack 2: a 360° ring burst from the center (bullets in every direction)."""
        SoundFX.play("shoot")
        steps = max(6, self.shoot_count * 3)
        for i in range(steps):
            ang = (6.2831853 / steps) * i
            direction = Vector2(math.cos(ang), math.sin(ang))
            self._fire_projectile(direction)

    def _shoot_aimed(self):
        """Attack 3: aimed at the player's direction, with a slight arc spread."""
        SoundFX.play("shoot")
        engine = Engine.instance
        scene = getattr(engine, "active_scene", None)
        player = scene.find_by_tag("Player") if scene else None
        if player is None or not player.active:
            return
        # Direction toward the player's center (boss center -> player center)
        dirv = Vector2(
            (player.position.x + player.size.x / 2) - (self.game_object.position.x + self.game_object.size.x / 2),
            (player.position.y + player.size.y / 2) - (self.game_object.position.y + self.game_object.size.y / 2),
        )
        mag = (dirv.x * dirv.x + dirv.y * dirv.y) ** 0.5
        if mag == 0:
            return
        dirv = Vector2(dirv.x / mag, dirv.y / mag)
        # As difficulty rises the aimed shots also spread into a slight fan
        count = self.shoot_count
        for i in range(count):
            off = 0.0
            if count > 1:
                off = (i / (count - 1) - 0.5) * 0.14
            a = math.atan2(dirv.y, dirv.x) + off
            d = Vector2(math.cos(a), math.sin(a))
            self._fire_projectile(d)

    def draw(self, surface: pygame.Surface, camera_offset: Vector2):
        sx = int(self.game_object.position.x - camera_offset.x)
        sy = int(self.game_object.position.y - camera_offset.y)
        w = int(self.game_object.size.x)
        body = self.body_color
        accent = self.accent_color
        eye = (20, 10, 10)

        # Upper details in body color (eyes) + mouth
        pygame.draw.rect(surface, accent, (sx + 12, sy + 16, 12, 8), border_radius=2)
        pygame.draw.rect(surface, accent, (sx + 36, sy + 16, 12, 8), border_radius=2)
        pygame.draw.rect(surface, eye, (sx + 16, sy + 36, 28, 6), border_radius=2)

        if self.health:
            bar_w = 80
            bar_h = 10
            bar_x = sx - (bar_w - w) // 2
            bar_y = sy - 24

            pygame.draw.rect(surface, (30, 30, 30), (bar_x, bar_y, bar_w, bar_h), border_radius=3)
            pct = max(0.0, self.health.current_hp / self.health.max_hp)
            fill_w = int(bar_w * pct)
            if fill_w > 0:
                pygame.draw.rect(surface, (255, 80, 60), (bar_x, bar_y, fill_w, bar_h), border_radius=3)
            pygame.draw.rect(surface, (255, 255, 255), (bar_x, bar_y, bar_w, bar_h), width=1, border_radius=3)

            if self.font:
                name_key = f"boss_{self.boss_key}" if hasattr(self, "boss_key") and self.boss_key in ("forest", "cave", "ice", "desert", "astro") else "boss_cave_fallback"
                name_surf = self.font.render(f"{I18n.t(name_key)}: {int(self.health.current_hp)} HP", True, (255, 210, 180))
                surface.blit(name_surf, (bar_x, bar_y - 18))
        # Enrage visual phase (low HP) — drawn on top of the body
        _draw_enrage_aura(surface, self.game_object, self.health, camera_offset)


# -----------------------------------------------------------------------------
# Helper: boss health bar + name drawing (shared by all boss types)
# -----------------------------------------------------------------------------
def _draw_boss_bar(surface, obj, health, font, boss_key, camera_offset, bar_w=80):
    _draw_enrage_aura(surface, obj, health, camera_offset)
    sx = int(obj.position.x - camera_offset.x)
    sy = int(obj.position.y - camera_offset.y)
    w = int(obj.size.x)
    bar_h = 10
    bar_x = sx - (bar_w - w) // 2
    bar_y = sy - 24
    pygame.draw.rect(surface, (30, 30, 30), (bar_x, bar_y, bar_w, bar_h), border_radius=3)
    pct = max(0.0, health.current_hp / health.max_hp)
    fill_w = int(bar_w * pct)
    if fill_w > 0:
        pygame.draw.rect(surface, (255, 80, 60), (bar_x, bar_y, fill_w, bar_h), border_radius=3)
    pygame.draw.rect(surface, (255, 255, 255), (bar_x, bar_y, bar_w, bar_h), width=1, border_radius=3)
    if font:
        name_key = (f"boss_{boss_key}" if boss_key in ("forest", "cave", "ice", "desert", "astro")
                    else "boss_cave_fallback")
        name_surf = font.render(f"{I18n.t(name_key)}: {int(health.current_hp)} HP", True, (255, 210, 180))
        surface.blit(name_surf, (bar_x, bar_y - 18))


def _draw_enrage_aura(surface, obj, health, camera_offset):
    """Draws a pulsing red/amber aura + crackling sparks around a low-HP boss.

    This is the VISUAL half of the 'enrage' phase (the mechanical half already
    fires faster at low HP via fire_interval*0.75). Purely cosmetic.
    """
    if not health or health.max_hp <= 0:
        return
    pct = health.current_hp / health.max_hp
    if pct >= 0.5 or pct <= 0:
        return
    sx = int(obj.position.x - camera_offset.x)
    sy = int(obj.position.y - camera_offset.y)
    w, h = int(obj.size.x), int(obj.size.y)
    cx, cy = sx + w / 2, sy + h / 2
    pulse = 0.5 + 0.5 * math.sin(pygame.time.get_ticks() * 0.012)
    # Glowing outline that breathes (bigger/redder the closer to death)
    strength = 1.0 - min(1.0, pct * 2.0)   # 0 at 50% -> 1 at 0%
    r = int(max(w, h) * (0.55 + 0.25 * pulse) * (1.0 + 0.35 * strength))
    pygame.draw.circle(surface, (180, 40, 20, 90), (int(cx), int(cy)), r, width=3)
    pygame.draw.circle(surface, (255, 110, 30, 70), (int(cx), int(cy)), r + 5, width=2)
    # Crackling sparks emanating outward from the shell
    tick = pygame.time.get_ticks()
    for i in range(6):
        ang = tick * 0.006 + i * (math.pi / 3)
        dist = r + 8 + int(6 * math.sin(tick * 0.02 + i * 2.4))
        px = int(cx + math.cos(ang) * dist)
        py = int(cy + math.sin(ang) * dist)
        pygame.draw.line(surface, (255, 140, 40), (int(cx + math.cos(ang) * (r - 6)), int(cy + math.sin(ang) * (r - 6))),
                         (px, py), 2)


class FlyingBoss(Component):
    """Flying boss: glides in the air independent of gravity, rising and falling
    toward the player's height, and occasionally rains fireballs downward.

    Does NOT use a Rigidbody (kinematic): it writes its movement directly to
    position. Its box is a trigger -> the player passes through it; it only takes
    damage from bullets/health.
    """
    def __init__(self, distance=180.0, speed=70.0, fire_interval=1.6,
                 bullet_speed=260.0, shoot_count=2, body_color=(120, 210, 255),
                 accent_color=(230, 180, 60), boss_key="ice",
                 wind_force=150.0, wind_radius=130.0):
        super().__init__()
        self.distance = distance
        self.speed = speed
        self.fire_interval = fire_interval
        self.bullet_speed = bullet_speed
        self.shoot_count = shoot_count
        self.body_color = tuple(body_color)
        self.accent_color = tuple(accent_color)
        self.boss_key = boss_key
        self.wind_force = wind_force        # wind force pushing the player below it downward
        self.wind_radius = wind_radius      # horizontal wind effect width
        self.start_x = 0.0
        self.start_y = 0.0
        self.health = None
        self.font = None
        self.shoot_timer = 0.0
        self._t = 0.0
        self._wind_timer = 0.0

    def start(self):
        self.start_x = self.game_object.position.x
        self.start_y = self.game_object.position.y
        self.health = self.game_object.get_component(Health)
        self.font = pygame.font.SysFont("Arial", 14, bold=True)

    def update(self, dt: float):
        dt = _slow_dt(dt)
        self._t += dt
        scene = getattr(Engine.instance, "active_scene", None)
        player = scene.find_by_tag("Player") if scene else None

        # Horizontal oscillation (back and forth around start_x)
        self.game_object.position.x = self.start_x + math.sin(self._t * self.speed / 40.0) * self.distance
        if player:
            # Drift slowly toward the player's height (stays airborne)
            target_y = player.position.y - 90
            self.game_object.position.y += (target_y - self.game_object.position.y) * dt * 1.2
        else:
            self.game_object.position.y = self.start_y

        self.shoot_timer += dt
        if self.shoot_timer >= self.fire_interval:
            self.shoot_timer = 0.0
            self._shoot_rain()

        #  WIND (down draft): while the player is below the boss and within
        # horizontal range they are pushed slightly downward -> harder jumps and
        # timing, a signature boss effect. Since the boss itself is gravity-less,
        # this only adds a playable challenge layer for the player (it doesn't
        # touch the physics core, it pushes velocity).
        if player and player.active and player.position.x < self.game_object.position.x + self.game_object.size.x + self.wind_radius and player.position.x + player.size.x > self.game_object.position.x - self.wind_radius:
            px = player.position.x + player.size.x / 2
            bx = self.game_object.position.x + self.game_object.size.x / 2
            if player.position.y > self.game_object.position.y + self.game_object.size.y:
                dist = abs(px - bx)
                falloff = max(0.0, 1.0 - dist / self.wind_radius)
                if falloff > 0.05:
                    prb = player.get_component(Rigidbody2D)
                    if prb:
                        prb.velocity.y += self.wind_force * falloff * dt
                    self._wind_timer -= dt
                    if self._wind_timer <= 0:
                        self._wind_timer = 0.08
                        self._spawn_wind_puff(bx, player.position.y, falloff)

    def _spawn_wind_puff(self, bx, py, falloff):
        scene = getattr(Engine.instance, "active_scene", None)
        if not scene:
            return
        puff = GameObject(name="WindPuff", x=bx - 14, y=py + 10, width=28, height=8, tag="FX")
        puff.add_component(ParticleEmitter())
        puff.add_component(_AutoRemove())
        puff.get_component(ParticleEmitter).burst(
            count=4, color=(200, 230, 255), speed_range=(15, 40), size_range=(2, 4),
            lifespan_range=(0.2, 0.4), gravity=-30.0, origin_offset=(14, 4))
        scene.add_object(puff)

    def _shoot_rain(self):
        scene = getattr(Engine.instance, "active_scene", None)
        if not scene:
            return
        SoundFX.play("shoot")
        cx = self.game_object.position.x + self.game_object.size.x / 2
        cy = self.game_object.position.y + self.game_object.size.y
        # Aim at the PLAYER instead of straight down: fire a 'fan' toward the
        # player's center (shoot_count projectiles, spread at a slight angle) (V2).
        player = scene.find_by_tag("Player")
        tx, ty = cx, cy + 200
        if player and player.active:
            tx = player.position.x + player.size.x / 2
            ty = player.position.y + player.size.y / 2
        base = math.atan2(ty - cy, tx - cx)
        for i in range(self.shoot_count):
            ang = base + (i - (self.shoot_count - 1) / 2) * 0.16
            dir = Vector2(math.cos(ang), math.sin(ang))
            ox = (i - (self.shoot_count - 1) / 2) * 26
            fb = GameObject(name="Fireball", x=cx + ox - 8, y=cy, width=14, height=14, tag="Enemy")
            fb.add_component(SpriteRenderer(color=self.accent_color, shape="circle"))
            fb.add_component(BoxCollider(is_trigger=True))
            fb.add_component(ParticleEmitter())
            fb.add_component(Projectile(direction=dir, speed=self.bullet_speed,
                                        damage=1, is_enemy_bullet=True))
            scene.add_object(fb)

    def draw(self, surface, camera_offset):
        sx = int(self.game_object.position.x - camera_offset.x)
        sy = int(self.game_object.position.y - camera_offset.y)
        w = int(self.game_object.size.x)
        # Wings (flapping feel based on the oscillation)
        flap = math.sin(self._t * 10.0)
        pygame.draw.rect(surface, self.accent_color,
                         (sx - 14, sy + 14 + int(flap * 6), 10, 5), border_radius=2)
        pygame.draw.rect(surface, self.accent_color,
                         (sx + w + 4, sy + 14 + int(-flap * 6), 10, 5), border_radius=2)
        pygame.draw.rect(surface, self.body_color, (sx, sy, w, int(self.game_object.size.y)), border_radius=8)
        pygame.draw.rect(surface, (220, 40, 40), (sx + 10, sy + 14, 8, 8), border_radius=4)
        pygame.draw.rect(surface, (220, 40, 40), (sx + w - 18, sy + 14, 8, 8), border_radius=4)
        if self.health:
            _draw_boss_bar(surface, self.game_object, self.health, self.font,
                           self.boss_key, camera_offset)


class SniperBoss(Component):
    """Sniper boss: stands still, locks the target with a red laser and fires an
    instant hitscan beam. Uses the SniperEnemy phase logic (aim -> lock -> fire) at
    boss scale and faster. The dodge window is fair.
    """
    def __init__(self, distance=0.0, speed=30.0, fire_interval=2.4,
                 bullet_speed=0.0, shoot_count=1, body_color=(220, 120, 60),
                 accent_color=(255, 60, 60), boss_key="desert", aim_time=1.0,
                 lock_time=0.8, beam_width=7, range=600.0):
        super().__init__()
        self.distance = distance
        self.speed = speed
        self.fire_interval = fire_interval
        self.bullet_speed = bullet_speed
        self.shoot_count = shoot_count
        self.body_color = tuple(body_color)
        self.accent_color = tuple(accent_color)
        self.boss_key = boss_key
        self.aim_time = aim_time
        self.lock_time = lock_time
        self.beam_width = beam_width
        self.range = range
        self.start_x = 0.0
        self.health = None
        self.font = None
        self.timer = 0.0
        self._target_x = None
        self._target_y = None
        self._lock_x = None
        self._lock_y = None
        self._locked = False
        self._aim_state = "aim"
        self._beam_flash = 0.0

    def start(self):
        self.start_x = self.game_object.position.x
        self.health = self.game_object.get_component(Health)
        self.font = pygame.font.SysFont("Arial", 14, bold=True)

    def _phase(self):
        t = self.timer % self.fire_interval
        if t >= self.fire_interval - self.lock_time:
            return "lock"
        return "aim"

    def update(self, dt: float):
        dt = _slow_dt(dt)
        self._beam_flash = max(0.0, self._beam_flash - dt)
        self.timer += dt
        scene = getattr(Engine.instance, "active_scene", None)
        player = scene.find_by_tag("Player") if scene else None
        cx = self.game_object.position.x + self.game_object.size.x / 2
        cy = self.game_object.position.y + self.game_object.size.y / 2
        if player is None or not player.active:
            return
        dx = player.position.x - cx
        dy = player.position.y - cy
        if abs(dx) > self.range or abs(dy) > self.range:
            self._locked = False
            self._aim_state = "aim"
            return

        phase = self._phase()
        # Fire (hitscan) — before the phase update, then return
        if self.timer >= self.fire_interval:
            if self._lock_x is not None:
                self._fire_beam(cx, cy, self._lock_x, self._lock_y, player)
            self.timer = 0.0
            self._locked = False
            self._lock_x = self._lock_y = None
            return

        if phase == "aim":
            self._aim_state = "aim"
            self._locked = False
            self._target_x = player.position.x + player.size.x / 2
            self._target_y = player.position.y + player.size.y / 2
            self._lock_x = self._lock_y = None
        elif phase == "lock":
            if not self._locked:
                self._locked = True
                self._lock_x = self._target_x
                self._lock_y = self._target_y
            self._aim_state = "lock"

    def _fire_beam(self, sx, sy, tx, ty, player):
        self._beam_flash = 0.14
        SoundFX.play("shoot")
        # point-to-line distance: a hit if the player is on the locked beam
        px = player.position.x + player.size.x / 2
        py = player.position.y + player.size.y / 2
        vx, vy = tx - sx, ty - sy
        mag2 = vx * vx + vy * vy
        if mag2 < 1:
            return
        t = max(0.0, min(1.0, ((px - sx) * vx + (py - sy) * vy) / mag2))
        closest_x = sx + vx * t
        closest_y = sy + vy * t
        dist = math.hypot(px - closest_x, py - closest_y)
        if dist <= self.beam_width:
            player_health = player.get_component(Health)
            if player_health and not player_health.is_invulnerable():
                player_health.take_damage(1)
                ctrl = player.get_component(PlayerController)
                if ctrl:
                    ctrl.hitstop_timer = max(ctrl.hitstop_timer, 0.06)
                    ctrl._screen_shake(0.2)
                scene = getattr(Engine.instance, "active_scene", None)
                if scene:
                    scene.add_shake(0.2)

    def draw(self, surface, camera_offset):
        sx = int(self.game_object.position.x - camera_offset.x)
        sy = int(self.game_object.position.y - camera_offset.y)
        w = int(self.game_object.size.x)
        h = int(self.game_object.size.y)
        pygame.draw.rect(surface, self.body_color, (sx, sy, w, h), border_radius=8)
        pygame.draw.rect(surface, self.accent_color, (sx + w // 2 - 6, sy + h // 2 - 3, 12, 6), border_radius=2)

        cx = sx + w / 2
        cy = sy + h / 2
        if self._aim_state == "lock" and self._lock_x is not None and self._lock_y is not None:
            tx = int(self._lock_x - camera_offset.x)
            ty = int(self._lock_y - camera_offset.y)
            # locked: frozen, blinking red laser
            blink = (math.sin(self.timer * 30) > 0)
            color = (255, 60, 60) if blink else (200, 40, 40)
            pygame.draw.line(surface, color, (int(cx), int(cy)), (tx, ty), self.beam_width)
        elif self._target_x is not None and self._target_y is not None:
            tx = int(self._target_x - camera_offset.x)
            ty = int(self._target_y - camera_offset.y)
            pygame.draw.line(surface, (255, 90, 60), (int(cx), int(cy)), (tx, ty), 3)

        if self._beam_flash > 0:
            tx = int((self._lock_x if self._lock_x is not None else self._target_x) - camera_offset.x)
            ty = int((self._lock_y if self._lock_y is not None else self._target_y) - camera_offset.y)
            pygame.draw.line(surface, (255, 120, 80), (int(cx), int(cy)), (tx, ty), self.beam_width + 4)

        if self.health:
            _draw_boss_bar(surface, self.game_object, self.health, self.font,
                           self.boss_key, camera_offset)


class CosmicBoss(FlyingBoss):
    """ASTRO = FINAL boss: combines ALL of the flying boss's attacks.

    - Flies + rains fireballs/bullets (aimed at the player) + wind (inherited from FlyingBoss).
    - Additionally uses the sniper laser (aim -> lock -> fire) PERIODICALLY; it
      flies, holds a laser, and throws fireballs at the same time.

    Does NOT use a Rigidbody (kinematic like FlyingBoss, with a trigger box).
    """
    def __init__(self, distance=180.0, speed=70.0, fire_interval=1.6,
                 bullet_speed=260.0, shoot_count=2, body_color=(120, 210, 255),
                 accent_color=(230, 180, 60), boss_key="astro",
                 wind_force=150.0, wind_radius=130.0,
                 beam_interval=4.2, aim_time=1.0, lock_time=0.8,
                 beam_width=7, beam_range=700.0):
        super().__init__(distance=distance, speed=speed, fire_interval=fire_interval,
                         bullet_speed=bullet_speed, shoot_count=shoot_count,
                         body_color=body_color, accent_color=accent_color,
                         boss_key=boss_key, wind_force=wind_force, wind_radius=wind_radius)
        self.beam_interval = beam_interval   # time between lasers (accompanies the fireball flow)
        self.aim_time = aim_time
        self.lock_time = lock_time
        self.beam_width = beam_width
        self.beam_range = beam_range
        # Separate counter for the sniper phase (won't clash with FlyingBoss.shoot_timer)
        self._beam_timer = 0.0
        self._aim_state = "aim"
        self._locked = False
        self._target_x = None
        self._target_y = None
        self._lock_x = None
        self._lock_y = None
        self._beam_flash = 0.0

    def update(self, dt: float):
        # FlyingBoss.update: flying + player-aimed fireballs + wind
        super().update(dt)
        # Sniper laser phase
        scene = getattr(Engine.instance, "active_scene", None)
        player = scene.find_by_tag("Player") if scene else None
        self._beam_flash = max(0.0, self._beam_flash - dt)
        self._beam_timer += dt
        if player is None or not player.active:
            return
        cx = self.game_object.position.x + self.game_object.size.x / 2
        cy = self.game_object.position.y + self.game_object.size.y / 2
        dx = player.position.x - cx
        dy = player.position.y - cy
        if abs(dx) > self.beam_range or abs(dy) > self.beam_range:
            self._locked = False
            self._aim_state = "aim"
            return
        # Phase: aim until the end of the period -> final lock window
        t = self._beam_timer % self.beam_interval
        phase = "lock" if t >= self.beam_interval - self.lock_time else "aim"
        if self._beam_timer >= self.beam_interval:
            if self._lock_x is not None:
                self._fire_beam(cx, cy, self._lock_x, self._lock_y, player)
            self._beam_timer = 0.0
            self._locked = False
            self._lock_x = self._lock_y = None
            return
        if phase == "aim":
            self._aim_state = "aim"
            self._locked = False
            self._target_x = player.position.x + player.size.x / 2
            self._target_y = player.position.y + player.size.y / 2
            self._lock_x = self._lock_y = None
        elif phase == "lock":
            if not self._locked:
                self._locked = True
                self._lock_x = self._target_x
                self._lock_y = self._target_y
            self._aim_state = "lock"

    def _fire_beam(self, sx, sy, tx, ty, player):
        self._beam_flash = 0.16
        SoundFX.play("shoot")
        px = player.position.x + player.size.x / 2
        py = player.position.y + player.size.y / 2
        vx, vy = tx - sx, ty - sy
        mag2 = vx * vx + vy * vy
        if mag2 < 1:
            return
        tt = max(0.0, min(1.0, ((px - sx) * vx + (py - sy) * vy) / mag2))
        closest_x = sx + vx * tt
        closest_y = sy + vy * tt
        dist = math.hypot(px - closest_x, py - closest_y)
        if dist <= self.beam_width:
            player_health = player.get_component(Health)
            if player_health and not player_health.is_invulnerable():
                player_health.take_damage(1, iframe=1.15)
                ctrl = player.get_component(PlayerController)
                if ctrl:
                    ctrl.hitstop_timer = max(ctrl.hitstop_timer, 0.06)
                    ctrl._screen_shake(0.2)
                scene = getattr(Engine.instance, "active_scene", None)
                if scene:
                    scene.add_shake(0.2)

    def draw(self, surface, camera_offset):
        # Draw the flying boss body (including wings)
        super().draw(surface, camera_offset)
        sx = int(self.game_object.position.x - camera_offset.x)
        sy = int(self.game_object.position.y - camera_offset.y)
        w = int(self.game_object.size.x)
        cx = sx + w / 2
        cy = sy + self.game_object.size.y / 2
        if self._aim_state == "lock" and self._lock_x is not None and self._lock_y is not None:
            tx = int(self._lock_x - camera_offset.x)
            ty = int(self._lock_y - camera_offset.y)
            blink = (math.sin(self._beam_timer * 30) > 0)
            color = (255, 60, 60) if blink else (200, 40, 40)
            pygame.draw.line(surface, color, (int(cx), int(cy)), (tx, ty), self.beam_width)
        elif self._target_x is not None and self._target_y is not None:
            tx = int(self._target_x - camera_offset.x)
            ty = int(self._target_y - camera_offset.y)
            pygame.draw.line(surface, (255, 90, 60), (int(cx), int(cy)), (tx, ty), 3)
        if self._beam_flash > 0:
            tx = int((self._lock_x if self._lock_x is not None else self._target_x) - camera_offset.x)
            ty = int((self._lock_y if self._lock_y is not None else self._target_y) - camera_offset.y)
            pygame.draw.line(surface, (255, 120, 80), (int(cx), int(cy)), (tx, ty), self.beam_width + 4)


class ShieldBoss(Component):
    """Shield boss: has a shield made of breakable platforms around it.

    The shield parts are GameObject's tagged "Breakable" in the scene and are
    recorded in a list. The boss takes no damage until all of them are broken; once
    broken it fights normally. The boss's own bullets PASS THROUGH the breakable
    platforms (Projectile logic); only the player's bullets break them ->
    "its own attacks never touch the shield".
    """
    def __init__(self, distance=60.0, speed=45.0, fire_interval=2.2,
                 bullet_speed=320.0, shoot_count=2, body_color=(150, 70, 210),
                 accent_color=(255, 230, 80), boss_key="cave"):
        super().__init__()
        self.distance = distance
        self.speed = speed
        self.fire_interval = fire_interval
        self.bullet_speed = bullet_speed
        self.shoot_count = shoot_count
        self.body_color = tuple(body_color)
        self.accent_color = tuple(accent_color)
        self.boss_key = boss_key
        self.start_x = 0.0
        self.health = None
        self.font = None
        self.shoot_timer = 0.0
        self._timer = 0.0
        self.shield_parts = []   # the Breakable GameObjects forming the shield
        self._previously_shielded = True

    def start(self):
        self.start_x = self.game_object.position.x
        self.health = self.game_object.get_component(Health)
        self.font = pygame.font.SysFont("Arial", 14, bold=True)

    def _register_shield_parts(self):
        # Find the breakable parts in the scene (archetype: Breakable near the boss)
        if self.shield_parts:
            return
        scene = getattr(Engine.instance, "active_scene", None)
        if not scene:
            return
        cx = self.game_object.position.x + self.game_object.size.x / 2
        cy = self.game_object.position.y + self.game_object.size.y / 2
        for o in scene.game_objects:
            if o.tag == "Breakable" and o.active:
                ox = o.position.x + o.size.x / 2
                oy = o.position.y + o.size.y / 2
                if abs(ox - cx) < 150 and abs(oy - cy) < 90:
                    self.shield_parts.append(o)

    def shield_intact(self):
        self._register_shield_parts()
        # 'all': every part must be intact for the boss to be shielded. So breaking
        # a single part (the one in the player's firing range) is enough — not all.
        return bool(self.shield_parts) and all(p.active for p in self.shield_parts)

    def update(self, dt: float):
        dt = _slow_dt(dt)
        self._timer += dt
        self.shoot_timer += dt
        # Always fires: the boss can attack even while inside its shield (fort);
        # its own bullets PASS THROUGH the breakable shield (they don't touch or
        # break it).
        if self.shoot_timer >= self.fire_interval:
            self.shoot_timer = 0.0
            self._shoot_fan()
        # Movement: the boss stays put in its fort until the shield breaks (a wall
        # barrier); once the shield is down (the part in range is destroyed) it
        # leaves the fort and roams.
        if self.shield_intact():
            return
        self.game_object.position.x = self.start_x + math.sin(self._timer * 0.8) * self.distance * 0.5

    def _shoot_fan(self):
        scene = getattr(Engine.instance, "active_scene", None)
        if not scene:
            return
        SoundFX.play("shoot")
        cx = self.game_object.position.x + self.game_object.size.x / 2
        cy = self.game_object.position.y + self.game_object.size.y / 2
        # Fire aimed at the player (outward from inside the shield)
        player = scene.find_by_tag("Player")
        base_ang = math.pi  # default left if no player
        if player and player.active:
            dx = (player.position.x + player.size.x / 2) - cx
            dy = (player.position.y + player.size.y / 2) - cy
            if abs(dx) + abs(dy) > 1:
                base_ang = math.atan2(dy, dx)
        steps = max(1, self.shoot_count)
        spread = 0.35
        for i in range(steps):
            if steps == 1:
                ang = base_ang
            else:
                t = i / (steps - 1)
                ang = base_ang + spread * (t - 0.5)
            d = Vector2(math.cos(ang), math.sin(ang))
            fb = GameObject(name="Fireball", x=cx - 8, y=cy - 8, width=16, height=16, tag="Enemy")
            fb.add_component(SpriteRenderer(color=self.accent_color, shape="circle"))
            fb.add_component(BoxCollider(is_trigger=True))
            fb.add_component(ParticleEmitter())
            fb.add_component(Projectile(direction=d, speed=self.bullet_speed,
                                        damage=1, is_enemy_bullet=True))
            scene.add_object(fb)

    def draw(self, surface, camera_offset):
        sx = int(self.game_object.position.x - camera_offset.x)
        sy = int(self.game_object.position.y - camera_offset.y)
        w = int(self.game_object.size.x)
        h = int(self.game_object.size.y)
        pygame.draw.rect(surface, self.body_color, (sx, sy, w, h), border_radius=10)
        pygame.draw.rect(surface, self.accent_color, (sx + 14, sy + 16, 12, 8), border_radius=2)
        pygame.draw.rect(surface, self.accent_color, (sx + w - 26, sy + 16, 12, 8), border_radius=2)
        pygame.draw.rect(surface, (20, 10, 10), (sx + 16, sy + 36, w - 32, 6), border_radius=2)
        if self.health:
            _draw_boss_bar(surface, self.game_object, self.health, self.font,
                           self.boss_key, camera_offset)
            self._draw_shield_bar(surface, camera_offset)

    def _draw_shield_bar(self, surface, camera_offset):
        """Shield health bar: shows how many of the breakable parts forming the
        shield are still intact, segment by segment. Once all are broken the bar
        disappears.
        """
        self._register_shield_parts()
        if not self.shield_parts:
            return
        total = len(self.shield_parts)
        intact = sum(1 for p in self.shield_parts if p.active)
        if intact <= 0:
            return
        sx = int(self.game_object.position.x - camera_offset.x) + int(self.game_object.size.x / 2)
        sy = int(self.game_object.position.y - camera_offset.y)
        bar_w = 60
        seg = 12
        x0 = sx - bar_w // 2
        y0 = sy - 14
        for i in range(total):
            px = x0 + i * seg
