import math
import random
import os
import pygame
from deep_engine import (
    Engine,
    GameObject,
    Input,
    Component,
    SpriteRenderer,
    BoxCollider,
    Rigidbody2D,
    TextRenderer,
    Health,
    Projectile,
    ParticleEmitter,
    SoundFX,
    I18n,
    LightSource,
    Vector2,
    SpawnIn,
    SaveGame,
    user_data_dir,
)
from deep_engine.components import _slow_dt


from .state import campaign_state
from . import state

class PlayerController(Component):
    """Player movement, jumping, shooting, dash, squash & stretch animation and health logic."""
    def __init__(self, speed=260.0, jump_force=560.0, restart_scene_factory=None):
        super().__init__()
        self.speed = speed
        self.jump_force = jump_force
        self.restart_scene_factory = restart_scene_factory
        self.score = 0
        self.score_text_obj = None
        self.goal_text_obj = None
        self.health_text_obj = None
        self.streak_text_obj = None   # coin streak multiplier (x2/x3...) UI object
        self.particles = None
        self.health = None
        self._profile = None  # Game progress record (high score) - created on the first score
        self._profile_path = os.path.join(user_data_dir(), "savegame.json")
        self.spawn_pos = Vector2(80, 300)
        self.checkpoint_pos = None   # last safe ground position (fall recovery/respawn)
        self.can_double_jump = False
        self.facing_dir = 1
        self.dash_timer = 0.0
        self.dash_cooldown = 0.0
        self.dash_speed = 2.8            # speed multiplier during dash (for weight/ramp-up)
        self.dash_momentum = 0.0         # remaining forward momentum after the dash (weight feel)
        self.shoot_cooldown = 0.0

        # Dash after-image (deneyim 5): semi-transparent copies trailing the dash.
        self._afterimage_timer = 0.0
        self._afterimages = []      # each: (sx, sy, w, h, age) in screen space
        # Fall streaks (deneyim 7): continuous fall time above the speed threshold.
        self.fall_streak_time = 0.0

        # Procedural Animation (Squish & Stretch)
        self.scale_x = 1.0
        self.scale_y = 1.0
        self.air_time = 0.0

        # --- Jump forgiveness / game-feel tuning ---
        # Buffers that reset jump forgiveness / edge-scrape limits:
        self.coyote_timer = 0.0        # window to jump after leaving a platform (edge tolerance)
        self.jump_buffer_timer = 0.0   # buffer a jump pressed just before landing (input buffer)
        self.COAYOTE_TIME = 0.06       # seconds (0.10 felt too generous -> endless airborne feel)
        self.JUMP_BUFFER = 0.06        # seconds
        self.gravity_scale = 1.0       # extra gravity while falling (heavier landing)

        # Biome-feel physics (biyoma özel fizik): each biome tweaks movement
        # so every world feels different. Set by apply_biome() at build time.
        self.biome = "forest"
        self.biome_gravity = 1.0       # multiplier on Rigidbody2D.gravity
        self.biome_jump = 1.0          # multiplier on jump_force
        self.biome_grip = 1.0          # horizontal grip: 1.0 = instant, <1.0 = slippery
        self.biome_wind = 0.0          # constant sideways push (desert gusts)

        # Hit-stop: a tiny 'freeze' when the player takes damage
        self.hitstop_timer = 0.0       # while >0 the player is briefly locked

        # Wall-slide / Wall-jump (stick to a wall and slide + jump off it)
        self.wall_dir = 0               # direction of the wall the player touches: -1 left / +1 right / 0 none
        self.wall_sliding = False
        self.wall_slide_speed = 220.0   # max fall speed while sliding (160 still felt floaty)
        self.wall_jump_x = 210.0        # wall jump horizontal push
        self.wall_jump_y = 330.0        # wall jump vertical force
        self.jump_squash_timer = 0.0    # jump 'pre-squash' (telegraph): crouch first, then pop

        # Grass/dust particles (run puffs + landing dust)
        self.was_grounded = True         # previous frame ground contact (detects landing bursts)
        self.run_puff_timer = 0.0        # run puff interval
        self._bounce_timer = 0.0         # skip the jump-cut after a trampoline bounce

        # --- PowerUp Timers ---
        self.powerup_magnet = 0.0    #  Magnet pull duration
        self.powerup_triple = 0.0   #  Triple-shot duration
        self.powerup_shield = False #  Is the shield active?
        self.powerup_speed  = 0.0   #  Speed boost duration
        self.powerup_slow   = 0.0   # ⏳ Time-slow duration (enemies/bosses/enemy bullets slow down)
        self.powerup_label_timer = 0.0  # how long the "power active!" text shows on screen
        self.powerup_label_text = ""     # the power type to display right now
        self.powerup_label_text_obj = None  # UI object for the power notice text

        # V2.0: the 'star-gazing figure' mode for the main menu background.
        # While True, the player stands still as a figure with huge glowing eyes
        # looking at the sky (the drifting stars) and takes no input; False once
        # the game starts.
        self.menu_idle = False

        # ---  Coin Streak (consecutive pick-up multiplier) ---
        # Collecting coins in a row grows the score multiplier (x2/x3/x4). If no
        # new coin is collected within STREAK_WINDOW the chain resets -> no "idle
        # farming", constant motion is rewarded.
        self.coin_streak = 0        # coins collected in a row (and therefore the multiplier)
        self.streak_timer = 0.0     # time since the last coin
        self.STREAK_WINDOW = 2.5    # seconds - the chain breaks if no new coin in this time
        self.STREAK_MAX_X = 4       # highest multiplier (x4)


    def start(self):
        self.rb = self.game_object.get_component(Rigidbody2D)
        self.particles = self.game_object.get_component(ParticleEmitter)
        self.health = self.game_object.get_component(Health)
        self.spawn_pos = Vector2(self.game_object.position.x, self.game_object.position.y)
        if self.checkpoint_pos is None:
            self.checkpoint_pos = Vector2(self.spawn_pos.x, self.spawn_pos.y)

    def _detect_wall(self):
        """Checks whether there is a real WALL to the player's right/left.

        Permanent fix: the procedural floor's stepped Ground blocks (300px wide +
        bottom filler) no longer count as walls. Only narrow platform/wall blocks
        (width < 80) and the direction the player is pushing are considered -
        mid-air float and endless wall-jumping are gone. One-way platforms are
        already excluded.
        """
        try:
            from deep_engine.core import Engine
            eng = Engine.instance
            if not eng or not eng.active_scene:
                return 0
            x0 = self.game_object.position.x
            y0 = self.game_object.position.y
            w = self.game_object.size.x
            h = self.game_object.size.y
            # To stick to a wall the player must push toward it
            # (no auto-stick in open air).
            try:
                from deep_engine.input import Input
                axis = Input.get_horizontal_axis()
            except Exception:
                axis = 0
            for side in (-1, 1):
                if axis != 0 and (axis < 0) != (side < 0):
                    continue  # skip the direction not being pushed
                colx = (x0 - 3) if side < 0 else (x0 + w + 3)
                probe = pygame.Rect(int(colx), int(y0 + 6), 4, int(h - 12))
                for obj in eng.active_scene.game_objects:
                    if not obj.active:
                        continue
                    # Only ground blocks count as walls; not enemies/turrets/snipers
                    if obj.tag not in ("Ground", "Platform"):
                        continue
                    col = obj.get_component(BoxCollider)
                    if col is None or col.is_trigger or col.one_way:
                        continue
                    # Permanent floor (300px chunk + filler) is not a wall
                    if obj.tag == "Ground" and obj.size.x >= 90:
                        continue
                    if probe.colliderect(col.get_rect()):
                        return side
            return 0
        except Exception:
            return 0


    def update(self, dt: float):
        if not self.rb:
            return

        # V2.0: main menu mode — the player takes no input and stands still
        # (drawn with the default player model; no cartoon/stargazer variant).
        if self.menu_idle:
            self.scale_x = 1.0
            self.scale_y = 1.0
            return

        if self.dash_cooldown > 0:
            self.dash_cooldown -= dt
        if self.shoot_cooldown > 0:
            self.shoot_cooldown -= dt

        # Hit-stop: a short freeze on taking damage -> punchy, weighty impact.
        # During this time the player neither moves nor fires (only drawn).
        if self.hitstop_timer > 0:
            self.hitstop_timer -= dt
            return

        # ---  Jump 'pre-squash' (telegraph): crouch -> pop feel ---
        # The jump first applies a horizontal squash; when the timer runs out the
        # vertical 'pop' (stretch) kicks in.
        if self.jump_squash_timer > 0:
            self.jump_squash_timer -= dt
            if self.jump_squash_timer <= 0:
                self.scale_x = 0.7
                self.scale_y = 1.4

        # ---  Grass/dust particles (run puffs + landing dust) ---
        # Fall streak accumulation (deneyim 7): rises while falling fast enough,
        # resets the moment the player lands (used to draw speed lines).
        if self.rb.velocity.y >= 900.0 and not self.rb.is_grounded:
            self.fall_streak_time += dt
        elif self.rb.is_grounded:
            self.fall_streak_time = 0.0
        else:
            self.fall_streak_time = max(0.0, self.fall_streak_time - dt)

        # Landing: a small dust burst at the feet when touching the ground from the
        # air (weighty landing feel).
        if not self.was_grounded and self.rb.is_grounded:
            if self.particles:
                self.particles.burst(count=7, color=(150, 170, 120), speed_range=(15, 55),
                                     size_range=(3, 5), lifespan_range=(0.2, 0.4), gravity=80.0,
                                     origin_offset=(16, self.game_object.size.y - 2))
        self.was_grounded = self.rb.is_grounded

        # Save the last SAFE ground position as a checkpoint for fall recovery.
        # If the player falls into a pit/the void, they return here (not to the
        # level start).
        if self.rb.is_grounded and not self.menu_idle:
            self.checkpoint_pos = Vector2(self.game_object.position.x, self.game_object.position.y)

        # --- Decay PowerUp timers ---
        if self.powerup_magnet > 0:
            self.powerup_magnet -= dt
        if self.powerup_triple > 0:
            self.powerup_triple -= dt
        if self.powerup_speed > 0:
            self.powerup_speed -= dt
        if self.powerup_slow > 0:
            # Time layer: the engine (Engine) decays its own counter; the player
            # only mirrors it. The slow duration thus flows centrally from a single
            # source, independent of the player.
            _eng = Engine.instance
            if _eng:
                self.powerup_slow = max(0.0, _eng._time_slow_remaining)
            else:
                self.powerup_slow = max(0.0, self.powerup_slow - dt)
        if self.powerup_label_timer > 0:
            self.powerup_label_timer -= dt

        #  Magnet Pull: attract the stars around toward the player
        if self.powerup_magnet > 0:
            engine = Engine.instance
            if engine and engine.active_scene:
                px = self.game_object.position.x + 16
                py = self.game_object.position.y + 16
                for obj in engine.active_scene.game_objects:
                    if obj.active and obj.tag == "Coin":
                        dx = px - obj.position.x
                        dy = py - obj.position.y
                        dist = max(1.0, math.sqrt(dx*dx + dy*dy))
                        pull = min(320.0, 8000.0 / dist)  # pulls even from afar
                        obj.position.x += (dx / dist) * pull * dt
                        obj.position.y += (dy / dist) * pull * dt

        #  Speed Boost: leave a glowing ember trail behind while running
        if self.powerup_speed > 0:
            if self.particles and random.random() < 0.6:
                self.particles.burst(count=2, color=(255, 200, 30), speed_range=(10, 40),
                                     size_range=(3, 5), lifespan_range=(0.2, 0.4),
                                     gravity=0, origin_offset=(16, 24))

        # Procedural Squash & Stretch Smoothing (Lerp)
        self.scale_x += (1.0 - self.scale_x) * min(dt * 14.0, 1.0)
        self.scale_y += (1.0 - self.scale_y) * min(dt * 14.0, 1.0)

        # Track the time spent airborne and correctly detect landing
        if not self.rb.is_grounded:
            self.air_time += dt
        else:
            # Only if truly landing from the air (at least 100ms airborne) apply a soft landing squash
            if self.air_time > 0.10:
                self.scale_x = 1.25
                self.scale_y = 0.75
                if self.particles:
                    self.particles.burst(count=6, color=(200, 220, 255), speed_range=(15, 45), size_range=(2, 4), lifespan_range=(0.15, 0.3), gravity=30.0, origin_offset=(16, 30))
            self.air_time = 0.0

        # Dash Behavior (weight: speed ramps up and momentum lingers after it ends)
        if self.dash_timer > 0:
            self.dash_timer -= dt
            self.rb.velocity.y = 0
            # Ramps up from ~2.3x to 3.2x as the dash starts -> a strong, punchy burst
            self.dash_speed = min(3.2, self.dash_speed + 8.0 * dt)
            self.rb.velocity.x = self.direction_dash * self.speed * self.dash_speed
            if self.particles and random.random() < 0.5:
                self.particles.burst(count=2, color=(100, 220, 255), speed_range=(10, 30), size_range=(3, 5), lifespan_range=(0.2, 0.4), gravity=0)
            # After-image: snapshot every ~0.03s while dashing (faster dash -> tighter ghosts)
            self._afterimage_timer -= dt
            if self._afterimage_timer <= 0:
                self._afterimage_timer = 0.03 / max(1.0, self.dash_speed)
                self._afterimages.append([
                    self.game_object.position.x, self.game_object.position.y,
                    self.scale_x, self.scale_y, 0.0])
                if len(self._afterimages) > 6:
                    self._afterimages.pop(0)
            # Age existing ghosts
            for g in self._afterimages:
                g[4] += dt
            if self.dash_timer <= 0:
                # Dash over: leave some momentum (weight/deceleration feel)
                self.dash_momentum = self.direction_dash * self.speed * 1.6
            return

        # Horizontal Movement (keyboard A/D + gamepad analog/D-Pad combined;  speed powerup 1.7x)
        move_x = Input.get_horizontal_axis()
        if move_x < 0:
            self.facing_dir = -1
        elif move_x > 0:
            self.facing_dir = 1

        speed_mult = 1.7 if self.powerup_speed > 0 else 1.0
        # If dash momentum remains, keep moving with it (weight/deceleration); otherwise use the input.
        if self.dash_momentum != 0:
            self.rb.velocity.x = self.dash_momentum
            # Momentum decays a bit each frame (soft braking)
            self.dash_momentum *= (1.0 - min(dt * 4.0, 1.0))
            if abs(self.dash_momentum) < 20.0:
                self.dash_momentum = 0.0
        else:
            # Biome-feel: `grip` blends horizontal velocity toward the input target
            # (1.0 = instant, lower = slippery/floaty); `wind` adds a light gust push.
            target_x = move_x * self.speed * speed_mult + self.biome_wind
            if self.biome_grip >= 1.0:
                self.rb.velocity.x = target_x
            else:
                blend = (self.biome_grip + 0.5)
                self.rb.velocity.x += (target_x - self.rb.velocity.x) * min(dt * (6.0 if not self.rb.is_grounded else 14.0) * blend, 1.0)

        # --- Coyote Time & Jump Buffer (jump forgiveness) ---
        # Allows jumping "as if grounded" for a short time after leaving a platform.
        if self.rb.is_grounded:
            self.coyote_timer = self.COAYOTE_TIME
        else:
            self.coyote_timer = max(0.0, self.coyote_timer - dt)

        # If jump was pressed, buffer the input (remember a press just before landing)
        jump_down = Input.get_key_down("SPACE") or Input.get_key_down("W") or Input.get_key_down("UP")
        if jump_down:
            self.jump_buffer_timer = self.JUMP_BUFFER
        else:
            self.jump_buffer_timer = max(0.0, self.jump_buffer_timer - dt)

        # Refresh the double jump right when landing
        if self.rb.is_grounded:
            self.can_double_jump = True

        # ---  Wall-slide detection ---
        # Only looks for a wall while airborne (not grounded) and not dashing.
        # While pressing against a wall, fast falls are slowed (floaty glide feel).
        if self.rb.is_grounded or self.dash_timer > 0:
            self.wall_dir = 0
        else:
            self.wall_dir = self._detect_wall()
        self.wall_sliding = self.wall_dir != 0
        if self.wall_sliding:
            # Face the wall we're touching and clamp the fall to the slide speed
            self.facing_dir = self.wall_dir
            if self.rb.velocity.y > self.wall_slide_speed:
                self.rb.velocity.y = self.wall_slide_speed
            if self.particles and random.random() < 0.4:
                wx = self.game_object.position.x + (0 if self.wall_dir < 0 else self.game_object.size.x)
                self.particles.burst(count=1, color=(200, 210, 230), speed_range=(10, 30), size_range=(2, 3), lifespan_range=(0.2, 0.4), gravity=20.0, origin_offset=(wx - self.game_object.position.x, self.game_object.size.y - 6))

        # Execute the jump: wall jump > ground jump > double jump priority
        if self.jump_buffer_timer > 0:
            if self.wall_sliding:
                #  Wall-jump: launch away from the wall; DON'T restore/refresh the double jump -> no infinite loop
                self.rb.velocity.x = -self.wall_dir * self.wall_jump_x
                self.rb.velocity.y = -self.wall_jump_y
                self.rb.is_grounded = False
                self.coyote_timer = 0.0
                self.jump_buffer_timer = 0.0
                self.facing_dir = -self.wall_dir
                # Removed the double-jump refresh: a wall jump grants no new double jump
                self.scale_x = 1.5
                self.scale_y = 0.6
                self.jump_squash_timer = 0.06
                SoundFX.play_jump()
                self._screen_shake(0.1)
                if self.particles:
                    wx = self.game_object.position.x + (0 if self.wall_dir < 0 else self.game_object.size.x)
                    self.particles.burst(count=12, color=(220, 225, 245), speed_range=(40, 120), size_range=(3, 5), lifespan_range=(0.25, 0.5), gravity=20.0, origin_offset=(wx - self.game_object.position.x, self.game_object.size.y - 6))
            elif self.rb.is_grounded or self.coyote_timer > 0:
                self.rb.velocity.y = -self.jump_force * self.biome_jump
                self.rb.is_grounded = False
                self.coyote_timer = 0.0
                self.jump_buffer_timer = 0.0
                # Pre-squash (telegraph): crouch first, then 'pop' (stretch) shortly after
                self.scale_x = 1.6
                self.scale_y = 0.55
                self.jump_squash_timer = 0.06
                SoundFX.play_jump()
                if self.particles:
                    self.particles.burst(count=8, color=(200, 220, 255), speed_range=(20, 70), size_range=(2, 4), lifespan_range=(0.2, 0.4), gravity=40.0, origin_offset=(16, 30))
            elif self.can_double_jump:
                self.rb.velocity.y = -self.jump_force * 0.9 * self.biome_jump
                self.can_double_jump = False
                self.jump_buffer_timer = 0.0
                self.scale_x = 1.45
                self.scale_y = 0.6
                self.jump_squash_timer = 0.05
                SoundFX.play_jump()
                if self.particles:
                    self.particles.burst(count=16, color=(120, 240, 255), speed_range=(40, 120), size_range=(3, 5), lifespan_range=(0.3, 0.5), gravity=20.0, origin_offset=(16, 16))

        # ---  Variable jump height (short/full jump) ---
        # Releasing the jump key instantly cuts the ascent -> fast, tight, controlled jumps.
        # No cut after a trampoline bounce (_bounce_timer).
        if self._bounce_timer > 0:
            self._bounce_timer -= dt
        else:
            jump_held = Input.get_key("SPACE") or Input.get_key("W") or Input.get_key("UP")
            if not jump_held and self.rb.velocity.y < -400:
                self.rb.velocity.y = -400  # ascent cut (jump cut)

        # ---  Extra gravity while falling (weighty landing feel) ---
        # Fall faster than you rise -> sharper, better-feeling drops.
        # 400 -> 550: less float, punchier landings (popular platformer setting).
        if self.rb.velocity.y > 0:
            self.rb.velocity.y += 550 * dt


        # Run puffs: periodic little grass/dust puffs from under the feet while running on the ground
        if self.rb.is_grounded and abs(self.rb.velocity.x) > 60 and self.particles:
            self.run_puff_timer -= dt
            if self.run_puff_timer <= 0:
                self.run_puff_timer = 0.09
                self.particles.burst(count=1, color=(160, 180, 130), speed_range=(4, 20),
                                     size_range=(2, 4), lifespan_range=(0.15, 0.35), gravity=30.0,
                                     origin_offset=(16, self.game_object.size.y - 2))

        # Dash (LSHIFT)
        if Input.get_key_down("LSHIFT") and self.dash_cooldown <= 0:
            self.dash_timer = 0.16
            self.dash_cooldown = 0.6
            self.dash_speed = 2.3  # ramp start (rises to 3.2 below)
            self.direction_dash = self.facing_dir
            self.dash_momentum = 0.0
            self.scale_x = 1.45
            self.scale_y = 0.75
            # Camera 'kick' -- the screen reacts to the dash speed too (weight feel)
            eng = Engine.instance
            if eng and eng.active_scene:
                eng.active_scene.kick_camera(self.facing_dir * 20, 0)
            self.rb.velocity.x = self.facing_dir * self.speed * 2.3
            SoundFX.play_jump()
            if self.particles:
                self.particles.burst(count=15, color=(80, 200, 255), speed_range=(30, 100), size_range=(3, 6), lifespan_range=(0.25, 0.5), gravity=0, origin_offset=(16, 16))

        # Shooting (F or Left Click)
        if (Input.get_key_down("F") or Input.get_mouse_button_down(0)) and self.shoot_cooldown <= 0:
            self.shoot_bullet()

        # If falling below the world: recover at the last safe ground position
        # (checkpoint), losing a life but not the whole level — return to where
        # you had progressed.
        if self.game_object.position.y > 900:
            if self.health:
                self.health.take_damage(1)
            self.respawn(recover=True)

        # Health & Score UI Update
        if self.health and self.health_text_obj:
            txt = self.health_text_obj.get_component(TextRenderer)
            if txt:
                hearts = "❤️ " * self.health.current_hp + "🖤 " * (self.health.max_hp - self.health.current_hp)
                shield_icon = " 🛡️" if self.powerup_shield else ""
                txt.text = f"{I18n.t('health')}: {hearts}{shield_icon}"

        # Campaign: sync the displayed score with the persistent base + active
        # sector total. The sector score carries across scene transitions; the HUD
        # reads a single source every frame, so the accumulation survives the
        # entrance -> boss -> next sector path.
        if state.game_mode == "campaign":
            self.score = campaign_state["score"] + campaign_state["sector_score"]
        elif state.game_mode == "endless":
            # In endless mode the score stays cumulative when moving to the next
            # difficulty's map (a fresh PlayerController is built on each transition;
            # it reads from the persistent counter).
            self.score = state.endless_state["score"]

        if self.score_text_obj:
            txt = self.score_text_obj.get_component(TextRenderer)
            if txt:
                txt.text = f"{I18n.t('score')}: {self.score}"

        #  Streak: the chain resets if no new coin is collected within the window;
        # while the multiplier >1, an "x2"... indicator shows on screen.
        if self.streak_timer > 0.0:
            self.streak_timer -= dt
            if self.streak_timer <= 0.0:
                self.coin_streak = 0
                self.streak_timer = 0.0
        mult = self._streak_multiplier()
        if self.streak_text_obj:
            txt = self.streak_text_obj.get_component(TextRenderer)
            if txt:
                if mult > 1:
                    txt.text = I18n.localize("streak_x", n=mult)
                    txt.color = (255, 200, 60) if mult == 2 else (255, 170, 40) if mult == 3 else (255, 120, 30)
                else:
                    txt.text = ""

        # Show the PowerUp active notice (shield always, others for their duration)
        if self.powerup_label_text_obj:
            ltxt = self.powerup_label_text_obj.get_component(TextRenderer)
            if ltxt:
                label_key = ""
                if self.powerup_shield:
                    label_key = "pu_shield"
                elif self.powerup_label_timer > 0 and self.powerup_label_text:
                    label_key = "pu_" + self.powerup_label_text
                ltxt.text = I18n.t(label_key) if label_key else ""

    def apply_powerup(self, power_type: str, duration: float):
        """Called by the PowerUp component; activates the power-up."""
        # The shield is permanent so show a brief notice; others display until they expire
        self.powerup_label_timer = 3.0 if power_type == "shield" else duration
        self.powerup_label_text = power_type
        if power_type == "magnet":
            self.powerup_magnet = duration
        elif power_type == "triple":
            self.powerup_triple = duration
        elif power_type == "shield":
            self.powerup_shield = True
        elif power_type == "speed":
            self.powerup_speed = duration
        elif power_type == "slow":
            self.powerup_slow = duration
            _eng = Engine.instance
            if _eng:
                _eng._time_slow_remaining = duration

    def shoot_bullet(self):
        #  Fire in 3 directions if triple-shot is active, otherwise a single bullet
        self.shoot_cooldown = 0.22
        SoundFX.play("shoot")
        self.scale_x = 1.15
        self.scale_y = 0.9

        engine = Engine.instance
        if not engine or not engine.active_scene:
            return

        bx = self.game_object.position.x + (34 if self.facing_dir > 0 else -14)
        by = self.game_object.position.y + 10

        if self.powerup_triple > 0:
            # Bullets in three directions: straight, up-diagonal, down-diagonal
            directions = [
                Vector2(self.facing_dir, 0),
                Vector2(self.facing_dir, -0.5),
                Vector2(self.facing_dir, 0.5),
            ]
        else:
            directions = [Vector2(self.facing_dir, 0)]

        for d in directions:
            bullet = GameObject(name="Bullet", x=bx, y=by, width=12, height=12, tag="Bullet")
            bullet.add_component(SpriteRenderer(color=(80, 220, 255), shape="circle"))
            bullet.add_component(BoxCollider(is_trigger=True))
            bullet.add_component(ParticleEmitter())
            bullet.add_component(LightSource(radius=80, color=(100, 220, 255), intensity=0.9))
            bullet.add_component(Projectile(direction=d, speed=580.0, damage=25, is_enemy_bullet=False))
            engine.active_scene.add_object(bullet)

        if self.particles:
            self.particles.burst(count=6, color=(140, 240, 255), speed_range=(20, 60), size_range=(2, 4), lifespan_range=(0.15, 0.3), origin_offset=(16, 16))


    def respawn(self, recover=False):
        """Returns the player to the designated position.

        recover=True: after a fall, go back to the last SAFE ground (checkpoint).
        Otherwise (hazard/death) return to the default spawn position.
        """
        target = self.checkpoint_pos if (recover and self.checkpoint_pos is not None) else self.spawn_pos
        self.game_object.position.x = target.x
        self.game_object.position.y = target.y
        self.rb.velocity = Vector2(0, 0)

    def _record_score(self):
        """Updates the current score as 'high score' in the persistent profile."""
        if self._profile is None:
            self._profile = SaveGame(self._profile_path)
        self._profile.update_high_score("high_score", self.score)

    def _streak_multiplier(self):
        """Coin streak multiplier: x1..x4 based on consecutive collected coins."""
        if self.coin_streak >= 15:
            return 4
        if self.coin_streak >= 10:
            return 3
        if self.coin_streak >= 5:
            return 2
        return 1

    def _add_score(self, amount):
        """Adds score. In campaign mode the score accumulates in the ACTIVE SECTOR
        and carries over scene transitions (entrance -> boss -> next sector). The
        displayed score = persistent base (previously completed sectors) + the
        in-sector total. In endless mode the score builds in a separate persistent
        counter (endless_state) and survives the move to the next difficulty map."""
        if state.game_mode == "campaign":
            campaign_state["sector_score"] += amount
            self.score = campaign_state["score"] + campaign_state["sector_score"]
        elif state.game_mode == "endless":
            state.endless_state["score"] += amount
            self.score = state.endless_state["score"]
        else:
            self.score += amount
        self._record_score()

    def _screen_shake(self, amount: float):
        eng = Engine.instance
        if eng and eng.active_scene:
            eng.active_scene.add_shake(amount)

    def on_collision(self, other: GameObject):
        if other.tag == "Coin" and other.active:
            other.active = False
            #  Streak: consecutive coin multiplier. 5/10/15 coins -> x2/x3/x4.
            self.coin_streak += 1
            self.streak_timer = self.STREAK_WINDOW
            mult = self._streak_multiplier()
            self._add_score(10 * mult)
            SoundFX.play("coin")
            if self.particles:
                rel_x = other.position.x - self.game_object.position.x + 8
                rel_y = other.position.y - self.game_object.position.y + 8
                # Pickup feedback: big, bright, multicolored coin burst
                self.particles.burst(count=40, color=(255, 235, 80), speed_range=(80, 240), size_range=(3, 7), lifespan_range=(0.4, 0.8), gravity=120.0, origin_offset=(rel_x, rel_y))
                self.particles.burst(count=16, color=(255, 255, 255), speed_range=(40, 140), size_range=(2, 4), lifespan_range=(0.2, 0.5), gravity=0, origin_offset=(rel_x, rel_y))
            self._screen_shake(0.06)  # tiny pickup shake
            _spawn_float_score(other.position.x + 8, other.position.y, f"+{10*mult}", color=(255, 215, 50) if mult == 1 else (255, 200, 80) if mult == 2 else (255, 170, 40) if mult == 3 else (255, 120, 30))
            self._check_all_coins_collected()

        elif other.tag == "Enemy" and other.active:
            #  Stun dash: hitting an enemy while moving fast stuns it; the player
            # takes no damage. dash_timer lasts 0.16s; when it ends, momentum
            # (416 px/s) remains, and if the player clips the enemy while still fast
            # they shouldn't take damage -> momentum is also protected.
            if self.dash_timer > 0 or abs(self.dash_momentum) > 40:
                self._stun_enemy_dash(other)
            elif self.rb.velocity.y > 50 and self.game_object.position.y + self.game_object.size.y <= other.position.y + 16:
                other.active = False
                self.rb.velocity.y = -self.jump_force * 0.75
                self._add_score(30)
                SoundFX.play("coin")
                if self.particles:
                    self.particles.burst(count=25, color=(255, 80, 80), speed_range=(80, 200), size_range=(3, 7), lifespan_range=(0.3, 0.6), origin_offset=(16, 28))
            else:
                #  If the shield is active, absorb the hit and break the shield
                if self.powerup_shield:
                    self.powerup_shield = False
                    SoundFX.play("shield_break")
                    if self.particles:
                        self.particles.burst(count=30, color=(100, 200, 255), speed_range=(80, 220), size_range=(3, 7), lifespan_range=(0.3, 0.6), origin_offset=(16, 16))
                elif self.health:
                    self.health.take_damage(1)
                    self.hitstop_timer = 0.06   # small punchy impact
                    self.rb.velocity.x = -self.facing_dir * 250
                    self.rb.velocity.y = -220
                    self._screen_shake(0.3)

        elif other.tag == "Boss" and other.active:
            #  When dashing (or charging with momentum) into the boss, no damage taken (boss isn't stunned)
            if self.dash_timer > 0 or abs(self.dash_momentum) > 40:
                self.rb.velocity.x = -self.facing_dir * 160
                self.rb.velocity.y = -140
                SoundFX.play("hit")
                self._screen_shake(0.1)
            #  If the shield is active, absorb the boss's blow
            elif self.powerup_shield:
                self.powerup_shield = False
                SoundFX.play("shield_break")
                if self.particles:
                    self.particles.burst(count=40, color=(100, 200, 255), speed_range=(100, 280), size_range=(4, 8), lifespan_range=(0.4, 0.7), origin_offset=(16, 16))
            elif self.health:
                self.health.take_damage(1, iframe=1.15)   # boss hit: slightly longer i-frames than multi-hit situations
                self.hitstop_timer = 0.09   # boss hit: longer freeze + strong knockback
                self.rb.velocity.x = -self.facing_dir * 320
                self.rb.velocity.y = -280
                self._screen_shake(0.45)

        elif other.tag == "Hazard":
            if self.dash_timer > 0 or abs(self.dash_momentum) > 40:
                pass  #  Dashing (or charging with momentum) through spikes causes no damage / no respawn
            else:
                hit = False
                if self.powerup_shield:
                    self.powerup_shield = False
                    SoundFX.play("shield_break")
                    hit = True
                elif self.health:
                    hit = self.health.take_damage(1)
                if hit:
                    #  Sharp spike hit: damage + FREEZE + knockback (bounce) + particles.
                    # Instead of getting "stuck" on the spike, the player is launched
                    # up/back away from it; they also can't walk on it during i-frames.
                    # (bounce instead of respawn.)
                    self.hitstop_timer = 0.05
                    self.rb.velocity.x = -self.facing_dir * 220
                    self.rb.velocity.y = -330
                    self._screen_shake(0.35)
                    if self.particles:
                        self.particles.burst(count=12, color=(255, 80, 80), speed_range=(60, 180),
                                             size_range=(3, 6), lifespan_range=(0.25, 0.5),
                                             origin_offset=(16, 16))


    def _stun_enemy_dash(self, enemy_obj):
        """Stun dash: hitting an enemy with a dash stuns it; the player takes no damage."""
        for comp in enemy_obj.components:
            if getattr(comp, "stun_timer", None) is not None:
                comp.stun_timer = 1.2
        SoundFX.play("hit")
        self._screen_shake(0.12)
        self.rb.velocity.x = -self.facing_dir * 60
        self.rb.velocity.y = -140

    def on_beam_hit(self):
        """Sniper laser hit: the shield absorbs it, otherwise lose a life (with i-frames)."""
        if self.powerup_shield:
            self.powerup_shield = False
            SoundFX.play("shield_break")
            if self.particles:
                self.particles.burst(count=30, color=(100, 200, 255), speed_range=(80, 220), size_range=(3, 7), lifespan_range=(0.3, 0.6), origin_offset=(16, 16))
        elif self.health:
            self.health.take_damage(1)
            self.hitstop_timer = 0.06
            self._screen_shake(0.3)

    def _check_all_coins_collected(self):
        engine = Engine.instance
        if not engine or not engine.active_scene:
            return
        remaining = [obj for obj in engine.active_scene.game_objects if obj.active and obj.tag == "Coin"]
        portal_obj = engine.active_scene.find_by_tag("Portal")
        if portal_obj:
            portal_comp = portal_obj.get_component(GoalPortal)
            if portal_comp:
                if len(remaining) == 0:
                    portal_comp.unlock()
                    if self.goal_text_obj:
                        txt = self.goal_text_obj.get_component(TextRenderer)
                        if txt:
                            txt.text = I18n.t("portal_unlocked")
                            txt.color = (50, 255, 150)
                else:
                    if self.goal_text_obj:
                        txt = self.goal_text_obj.get_component(TextRenderer)
                        if txt:
                            txt.text = f"{I18n.t('remaining_stars')}: {len(remaining)} ({I18n.t('stars_goal_desc')})"

    def apply_biome(self, biome):
        """Biome feel: each world tunes movement slightly differently.

        Presets are subtle but noticeable and safe (never lock the player):
          - forest: neutral reference.
          - ice:    slippery but snappy (low grip = less friction), slightly
                    higher jump (vaulting over slick ground).
          - cave:   heavier gravity + weaker jump -> dense, weighty landing.
          - desert: constant light gust pushes the player (wind); normal jump.
          - astro:  low gravity + stronger jump -> floaty, high arcs.
        A light 'directional wind' (biome_wind) pushes horizontally, giving the
        desert an extra identity without ever being escapable.
        """
        self.biome = biome or "forest"
        if biome == "ice":
            self.biome_gravity, self.biome_jump, self.biome_grip, self.biome_wind = 1.0, 1.12, 0.55, 0.0
        elif biome == "cave":
            self.biome_gravity, self.biome_jump, self.biome_grip, self.biome_wind = 1.25, 0.9, 0.85, 0.0
        elif biome == "desert":
            self.biome_gravity, self.biome_jump, self.biome_grip, self.biome_wind = 1.0, 1.0, 0.8, 1.15
        elif biome == "astro":
            self.biome_gravity, self.biome_jump, self.biome_grip, self.biome_wind = 0.6, 1.15, 0.9, 0.0
        else:
            self.biome_gravity, self.biome_jump, self.biome_grip, self.biome_wind = 1.0, 1.0, 1.0, 0.0
        rb = self.game_object.get_component(Rigidbody2D)
        # Player's base gravity is 1400 (see _build_player); biomes only scale it.
        if rb is not None:
            rb.gravity = 1400.0 * self.biome_gravity

    def draw(self, surface: pygame.Surface, camera_offset: Vector2):
        if self.health and self.health.is_invulnerable():
            if int(self.health.flash_timer * 15) % 2 == 0:
                return

        # Animated size and center calculation
        base_w = self.game_object.size.x
        base_h = self.game_object.size.y
        anim_w = base_w * self.scale_x
        anim_h = base_h * self.scale_y

        sx = int(self.game_object.position.x - camera_offset.x - (anim_w - base_w) / 2)
        sy = int(self.game_object.position.y - camera_offset.y - (anim_h - base_h))

        # Fall speed lines (deneyim 7): the longer the fast-fall, the more lines
        # converge on the player from the top edge — reads as 'terminal velocity'.
        if self.fall_streak_time > 0.12 and self.rb and self.rb.velocity.y >= 900.0:
            intensity = min(1.0, (self.fall_streak_time - 0.12) / 0.5 + 0.3)
            n = int(4 + 4 * intensity)
            w, h = surface.get_size()
            px = sx + int(anim_w / 2)
            line_color = (210, 225, 255)
            for i in range(n):
                t = (pygame.time.get_ticks() * 0.020 + i * 0.31) % 1.0
                lx = int(w * (0.12 + 0.76 * t))
                ln = 26 + int(46 * intensity)
                pygame.draw.line(surface, line_color,
                                 (lx, -2), (lx, ln), 1)
                pygame.draw.line(surface, line_color,
                                 (lx, h + 2), (lx, h - ln), 1)

        # Dash after-image ghosts (drawn BEHIND the player): semi-transparent
        # copies that fade out. They snapshot the position/scale during the dash
        # and use the camera offset from this frame, so they trail naturally.
        for gx, gy, gscx, gscy, age in self._afterimages:
            if gscx <= 0 or gscy <= 0:
                continue
            gw = base_w * gscx
            gh = base_h * gscy
            ix = int(gx - camera_offset.x - (gw - base_w) / 2)
            iy = int(gy - camera_offset.y - (gh - base_h))
            alpha = max(0, int(110 * (1.0 - age / 0.18)))
            if alpha <= 0:
                continue
            ghost = pygame.Surface((int(gw), int(gh)), pygame.SRCALPHA)
            ghost.fill((80, 190, 245, alpha))
            pygame.draw.rect(ghost, (80, 190, 245, alpha), ghost.get_rect(), border_radius=6)
            surface.blit(ghost, (ix, iy))

        #  If the speed powerup is active, the character glows yellow
        if self.powerup_speed > 0:
            pulse = int(30 + 20 * math.sin(pygame.time.get_ticks() * 0.015))
            pygame.draw.rect(surface, (255, 220, 30),
                             pygame.Rect(sx - 3, sy - 3, int(anim_w) + 6, int(anim_h) + 6),
                             border_radius=8, width=2)

        # Character Body
        body_rect = pygame.Rect(sx, sy, int(anim_w), int(anim_h))
        pygame.draw.rect(surface, (60, 200, 245), body_rect, border_radius=6)

        # Eyes
        eye_offset = 3 if self.facing_dir > 0 else -3
        pygame.draw.circle(surface, (15, 20, 35), (sx + int(anim_w * 0.3) + eye_offset, sy + int(anim_h * 0.35)), 3)
        pygame.draw.circle(surface, (15, 20, 35), (sx + int(anim_w * 0.7) + eye_offset, sy + int(anim_h * 0.35)), 3)
        pygame.draw.circle(surface, (255, 255, 255), (sx + int(anim_w * 0.3) + eye_offset + 1, sy + int(anim_h * 0.35) - 1), 1)
        pygame.draw.circle(surface, (255, 255, 255), (sx + int(anim_w * 0.7) + eye_offset + 1, sy + int(anim_h * 0.35) - 1), 1)

        #  If the shield is active, draw a glowing blue ring around the character
        if self.powerup_shield:
            cx = sx + int(anim_w / 2)
            cy = sy + int(anim_h / 2)
            radius = int(max(anim_w, anim_h) * 0.75)
            alpha = 160 + int(60 * math.sin(pygame.time.get_ticks() * 0.01))
            pygame.draw.circle(surface, (80, 180, 255), (cx, cy), radius, width=3)
            pygame.draw.circle(surface, (140, 220, 255), (cx, cy), radius + 4, width=1)

        #  Purple ring while the magnet pull is active
        if self.powerup_magnet > 0:
            cx = sx + int(anim_w / 2)
            cy = sy + int(anim_h / 2)
            r = int(35 + 8 * math.sin(pygame.time.get_ticks() * 0.008))
            pygame.draw.circle(surface, (200, 80, 255), (cx, cy), r, width=2)

        #  Orange muzzle indicator while triple-shot is active
        if self.powerup_triple > 0:
            tip_x = sx + (int(anim_w) if self.facing_dir > 0 else 0)
            tip_y = sy + int(anim_h / 2)
            pygame.draw.circle(surface, (255, 140, 30), (tip_x, tip_y), 5)
            pygame.draw.circle(surface, (255, 200, 80), (tip_x, tip_y), 3)



class GoalPortal(Component):
    def __init__(self, next_scene_factory):
        super().__init__()
        self.next_scene_factory = next_scene_factory
        self.is_unlocked = False

    def unlock(self):
        self.is_unlocked = True
        renderer = self.game_object.get_component(SpriteRenderer)
        if renderer:
            renderer.color = (120, 255, 180)
        particles = self.game_object.get_component(ParticleEmitter)
        if particles:
            particles.burst(count=30, color=(100, 255, 200), speed_range=(50, 150), size_range=(3, 6), lifespan_range=(0.5, 0.9), origin_offset=(20, 30))
        light = self.game_object.get_component(LightSource)
        if light:
            light.color = (100, 255, 180)
            light.base_radius = 200

    def update(self, dt: float):
        if self.is_unlocked:
            particles = self.game_object.get_component(ParticleEmitter)
            if particles and random.random() < 0.3:
                particles.burst(count=2, color=(150, 255, 220), speed_range=(20, 60), size_range=(2, 4), lifespan_range=(0.4, 0.7), origin_offset=(20, 20))

    def on_collision(self, other: GameObject):
        if other.tag == "Player" and self.is_unlocked:
            SoundFX.play("win")
            if self.next_scene_factory is None:
                return
            next_scene = self.next_scene_factory()
            if next_scene is None:
                # No next scene provided -> do nothing.
                return
            Engine.switch_scene(next_scene)


# -----------------------------------------------------------------------------
# 4. STANDARD ENEMIES & PLATFORMS
# -----------------------------------------------------------------------------

def _wake_up(component):
    """"Seamless Experience" awake (trigger) system.

    An enemy sleeps (inert) until the player enters its 'wake_radius'. A sleeping
    enemy never moves/fires -> the player is never ambushed; they see the enemy
    from afar and prepare for the encounter. Once awakened, it stays awake
    permanently.
    """
    obj = component.game_object
    if getattr(component, "_awake", False):
        return True  # already awake -> continue processing
    scene = getattr(Engine.instance, "active_scene", None)
    if scene is None:
        return False
    player = scene.find_by_tag("Player")
    if player is None or not player.active:
        return False
    # Spawn delay: no wake-up/reaction during the SpawnIn animation (prevents ambushes).
    for c in obj.components:
        if isinstance(c, SpawnIn) and not c.done:
            return False
    radius = getattr(component, "wake_radius", 380.0)
    if abs(player.position.x - obj.position.x) <= radius:
        component._awake = True
        return True
    return False


class PatrolEnemy(Component):
    """Red patrol enemy that walks back and forth along a track on the ground.

    Smart probe: turns around when it sees rising ground (a ledge/wall) or a gap
    ahead — so it never walks into or through the terrain.

    "Seamless Experience": enemies SLEEP until the player approaches (awake
    system). A sleeping enemy never moves/fires -> the player is never ambushed;
    they see the enemy from afar and meet it naturally.
    """
    def __init__(self, patrol_distance=120.0, speed=70.0, wake_radius=380.0):
        super().__init__()
        self.distance = patrol_distance
        self.speed = speed
        self.wake_radius = wake_radius
        self._awake = False  # the enemy doesn't react to the player while asleep
        self.start_x = 0.0
        self.direction = 1
        self._turn_cooldown = 0.0  # minimum time between direction changes (prevents jitter)
        self.stun_timer = 0.0  # Stun dash: freezes briefly when hit by a dash

    def start(self):
        self.start_x = self.game_object.position.x
        self._sprite = self.game_object.get_component(SpriteRenderer)
        self._base_color = tuple(self._sprite.color) if self._sprite else (200, 60, 60)

    def _static_ground_rects(self):
        """Rects of the static bodies acting as ground (Ground/Platform)."""
        scene = getattr(Engine.instance, "active_scene", None)
        if scene is None:
            return []
        rects = []
        for tag in ("Ground", "Platform"):
            for obj in scene.find_all_by_tag(tag):
                col = obj.get_component(BoxCollider)
                if col:
                    rects.append(col.get_rect())
        return rects

    def update(self, dt: float):
        o = self.game_object
        # Awake system: sleep until the player approaches (no ambushing)
        if not _wake_up(self):
            return
        # Time-slow powerup: non-player movement slows down
        dt = _slow_dt(dt)
        # Stun dash: freeze if stunned (movement/direction changes stop)
        if self.stun_timer > 0:
            self.stun_timer -= dt
            if self._sprite:
                self._sprite.color = (255, 235, 80) if self.stun_timer > 0 else self._base_color
            return
        forward = self.direction
        self._turn_cooldown = max(0.0, self._turn_cooldown - dt)

        # Scan the ground every frame (for accuracy; cheap since there are few objects)
        grounds = self._static_ground_rects()
        fwd_edge = o.position.x + (o.size.x if forward > 0 else 0)

        turn = False
        # 1) WALL / LEDGE AHEAD: is there solid ground rising in front of the body?
        wall = pygame.Rect(
            int(fwd_edge) + (2 if forward > 0 else -2),
            int(o.position.y - 2),
            2,
            int(o.size.y - 2),
        )
        if any(wall.colliderect(g) for g in grounds):
            turn = True
        else:
            # 2) GAP: is there no ground under the feet ahead? (so it doesn't fall)
            #    The probe looks far enough below to tolerate the spawn gap (~6px).
            foot = pygame.Rect(
                int(fwd_edge - o.size.x / 2) - (1 if forward < 0 else 0),
                int(o.position.y + o.size.y - 2),
                int(o.size.x),
                18,
            )
            if not any(foot.colliderect(g) for g in grounds):
                turn = True

        if turn and self._turn_cooldown <= 0:
            self.direction *= -1
            self._turn_cooldown = 0.4
            return

        # 3) Track limit: turn back if too far from start_x
        o.position.x += self.speed * forward * dt
        if abs(o.position.x - self.start_x) >= self.distance and self._turn_cooldown <= 0:
            self.direction *= -1
            self._turn_cooldown = 0.4

    def draw(self, surface: pygame.Surface, camera_offset: Vector2):
        sx = int(self.game_object.position.x - camera_offset.x)
        sy = int(self.game_object.position.y - camera_offset.y)
        pygame.draw.circle(surface, (255, 255, 255), (sx + 8, sy + 10), 3)
        pygame.draw.circle(surface, (255, 255, 255), (sx + 20, sy + 10), 3)
        pygame.draw.circle(surface, (0, 0, 0), (sx + (9 if self.direction > 0 else 7), sy + 10), 1)
        pygame.draw.circle(surface, (0, 0, 0), (sx + (21 if self.direction > 0 else 19), sy + 10), 1)


class FlyerEnemy(Component):
    """Flying enemy that glides through the air (no gravity, horizontal patrol, gentle bobbing)."""
    def __init__(self, patrol_distance=160.0, speed=55.0, wake_radius=400.0):
        super().__init__()
        self.distance = patrol_distance
        self.speed = speed
        self.wake_radius = wake_radius
        self._awake = False
        self.start_x = 0.0
        self.base_y = 0.0
        self.direction = 1
        self.stun_timer = 0.0  # Stun dash

    def start(self):
        self.start_x = self.game_object.position.x
        self.base_y = self.game_object.position.y
        self._sprite = self.game_object.get_component(SpriteRenderer)
        self._base_color = tuple(self._sprite.color) if self._sprite else (120, 180, 220)

    def update(self, dt: float):
        if not _wake_up(self):
            return
        dt = _slow_dt(dt)
        if self.stun_timer > 0:
            self.stun_timer -= dt
            if self._sprite:
                self._sprite.color = (255, 235, 80) if self.stun_timer > 0 else self._base_color
            return
        self.game_object.position.x += self.speed * self.direction * dt
        if abs(self.game_object.position.x - self.start_x) >= self.distance:
            self.direction *= -1
        # Vertical bobbing is driven by the engine's KeyframeAnimator
        # (attached by the level builder), keeping this component pure-motion.


class HopperEnemy(Component):
    """Enemy that advances by hopping periodically on the ground (jumps like a trampoline)."""
    def __init__(self, hop_force=420.0, hop_interval=1.1, speed=40.0, wake_radius=380.0):
        super().__init__()
        self.hop_force = hop_force
        self.hop_interval = hop_interval
        self.speed = speed
        self.wake_radius = wake_radius
        self._awake = False
        self.timer = 0.0
        self.direction = 1
        self.stun_timer = 0.0  # Stun dash
        self._sprite = None
        self._base_color = (190, 90, 160)

    def start(self):
        self._sprite = self.game_object.get_component(SpriteRenderer)
        if self._sprite:
            self._base_color = tuple(self._sprite.color)

    def update(self, dt: float):
        if not _wake_up(self):
            return
        dt = _slow_dt(dt)
        if self.stun_timer > 0:
            self.stun_timer -= dt
            rb = self.game_object.get_component(Rigidbody2D)
            if rb:
                rb.velocity.x = 0.0
            if self._sprite:
                self._sprite.color = (255, 235, 80) if self.stun_timer > 0 else self._base_color
            return
        self.timer += dt
        obj = self.game_object
        rb = obj.get_component(Rigidbody2D)
        if rb is None:
            return
        # Keep the horizontal direction constant
        rb.velocity.x = self.speed * self.direction
        # Jump when the time is right (while grounded)
        if rb.is_grounded and self.timer >= self.hop_interval:
            self.timer = 0.0
            rb.velocity.y = -self.hop_force
            rb.is_grounded = False
        # No wall/patrol direction changes; kept simple


class TurretEnemy(Component):
    """Stationary turret enemy that periodically fires bullets toward the player."""
    def __init__(self, fire_interval=2.0, bullet_speed=240.0, bullet_damage=25, range=460.0, wake_radius=330.0):
        super().__init__()
        self.fire_interval = fire_interval
        self.bullet_speed = bullet_speed
        self.bullet_damage = bullet_damage
        self.range = range
        self.wake_radius = wake_radius
        self._awake = False
        self.timer = 0.6  # short delay for the first shot
        # Attack 'telegraph': a brief red blink right before firing (tell)
        self.telegraph_time = 0.35
        self._sprite = None
        self._base_color = (255, 90, 60)
        self.stun_timer = 0.0  # Stun dash

    def start(self):
        self._sprite = self.game_object.get_component(SpriteRenderer)
        if self._sprite:
            self._base_color = tuple(self._sprite.color)

    def _apply_telegraph(self, dt: float):
        """Brief red blink before firing (telegraph visual)."""
        if self._sprite is None:
            return
        # Fast blink between fire_interval - telegraph_time .. fire_interval
        warn = self.timer >= (self.fire_interval - self.telegraph_time)
        if warn:
            blink = (int(self.timer * 14) % 2) == 0
            self._sprite.color = (255, 70, 40) if blink else self._base_color
        else:
            self._sprite.color = self._base_color

    def update(self, dt: float):
        # Awake system: sleep until the player approaches (no ambushing)
        if not _wake_up(self):
            return
        dt = _slow_dt(dt)
        # Stun dash: no firing / telegraph visual while stunned
        if self.stun_timer > 0:
            self.stun_timer -= dt
            if self._sprite:
                self._sprite.color = (255, 235, 80) if self.stun_timer > 0 else self._base_color
            return
        self.timer += dt
        self._apply_telegraph(dt)
        if self.timer < self.fire_interval:
            return
        obj = self.game_object
        # Is the player nearby?
        scene = getattr(Engine.instance, "active_scene", None)
        if scene is None:
            return
        player = scene.find_by_tag("Player")
        if player is None or not player.active:
            return
        dx = player.position.x - obj.position.x
        dy = player.position.y - obj.position.y
        if abs(dx) > self.range:
            return  # player is too far

        self.timer = 0.0
        from deep_engine.math2d import Vector2 as _V2
        from deep_engine.components import Projectile as _Prj
        from deep_engine.particles import ParticleEmitter as _PE
        bullet = GameObject(name="EnemyBullet", x=obj.position.x + obj.size.x / 2 - 4,
                            y=obj.position.y + obj.size.y / 2 - 4, width=8, height=8, tag="EnemyBullet")
        bullet.add_component(SpriteRenderer(color=(255, 90, 60), shape="circle"))
        bullet.add_component(BoxCollider())
        bullet.add_component(_PE())
        bullet.add_component(_Prj(direction=_V2(dx, dy), speed=self.bullet_speed,
                                  damage=self.bullet_damage, is_enemy_bullet=True, lifespan=2.5))
        scene.add_object(bullet)
        SoundFX.play("shoot")
        if self._sprite:
            self._sprite.color = self._base_color


class SniperEnemy(Component):
    """Sniper enemy standing on upper platforms, firing with a hitscan laser.

    The attack is periodic, not continuous: first a red laser line DRAWS toward
    the target (tracking the player), then the line LOCKS and blinks, and after a
    short delay it fires an instant beam along that locked line. If the player is
    not on the line at lock time (they moved away), there is no hit -> a fair,
    "stressful but dodgeable" enemy.

    Difficulty gate: placed on upper platforms only on procedural levels with
    difficulty >= 3.
    """
    def __init__(self, fire_interval=3.2, aim_time=1.1, lock_time=0.85,
                 beam_width=6, range=900.0, wake_radius=520.0):
        super().__init__()
        self.fire_interval = fire_interval
        self.aim_time = aim_time
        self.lock_time = lock_time
        self.beam_width = beam_width
        self.range = range
        self.wake_radius = wake_radius
        self._awake = False
        self.stun_timer = 0.0
        self.timer = 0.0
        self._sprite = None
        self._base_color = (120, 200, 90)
        # Aim state (world coordinates, not screen — camera is subtracted at draw)
        self._target_x = None      # tracked (aim) target position
        self._target_y = None
        self._lock_x = None        # locked (frozen) target
        self._lock_y = None
        self._locked = False       # aim -> lock transition
        self.__aim_state = "aim"   # "aim" | "lock"
        self._beam_flash = 0.0     # bright laser visual at fire time (fades)

    def start(self):
        self._sprite = self.game_object.get_component(SpriteRenderer)
        if self._sprite:
            self._base_color = tuple(self._sprite.color)

    def _phase(self):
        """Computes the active phase within the period (aim -> lock)."""
        t = self.timer % self.fire_interval
        if t >= self.fire_interval - self.lock_time:
            return "lock"
        return "aim"

    def _find_player(self):
        scene = getattr(Engine.instance, "active_scene", None)
        if scene is None:
            return None
        p = scene.find_by_tag("Player")
        if p is None or not p.active:
            return None
        return p

    def update(self, dt: float):
        # Awake system: sleep until the player approaches (stressful but not an ambush)
        if not _wake_up(self):
            self.__aim_state = "aim"
            self._locked = False
            return
        dt = _slow_dt(dt)
        if self.stun_timer > 0:
            self.stun_timer -= dt
            if self._sprite:
                self._sprite.color = (255, 235, 80) if self.stun_timer > 0 else self._base_color
            return
        # Restore the sprite so drawing is not interrupted
        if self._sprite and self._sprite.color != self._base_color:
            self._sprite.color = self._base_color

        self._beam_flash = max(0.0, self._beam_flash - dt)
        self.timer += dt

        player = self._find_player()
        if player is None:
            self._locked = False
            self.__aim_state = "aim"
            return
        dx = player.position.x - self.game_object.position.x
        dy = player.position.y - self.game_object.position.y
        if abs(dx) > self.range or abs(dy) > self.range:
            self._locked = False
            self.__aim_state = "aim"
            return

        phase = self._phase()
        cx = self.game_object.position.x + self.game_object.size.x / 2
        cy = self.game_object.position.y + self.game_object.size.y / 2

        # Fire: when the period elapses, a hitscan along the locked beam. Done BEFORE
        # the phase calculation and returns; otherwise the aim block would reset
        # _lock_x.
        if self.timer >= self.fire_interval:
            if self._lock_x is not None:
                self._fire_beam(cx, cy, self._lock_x, self._lock_y, player)
            self.timer = 0.0
            self._locked = False
            self._lock_x = self._lock_y = None
            return

        if phase == "aim":
            # Track the player (the line points at the live target)
            self.__aim_state = "aim"
            self._locked = False
            self._target_x = player.position.x + player.size.x / 2
            self._target_y = player.position.y + player.size.y / 2
            self._lock_x, self._lock_y = None, None

        elif phase == "lock":
            # Lock the line (freeze the last tracked target)
            if not self._locked:
                self._locked = True
                self._lock_x = self._target_x
                self._lock_y = self._target_y
            self.__aim_state = "lock"

    def _fire_beam(self, sx, sy, tx, ty, player):
        """Instant laser damage (hitscan) if the player is near the locked beam line."""
        self._beam_flash = 0.12
        SoundFX.play("shoot")
        # Point-to-line distance (player center -> locked beam line)
        px = player.position.x + player.size.x / 2
        py = player.position.y + player.size.y / 2
        dx = tx - sx
        dy = ty - sy
        seg2 = dx * dx + dy * dy
        if seg2 == 0:
            seg2 = 1.0
        # projection (the player's footpoint on the line)
        t = ((px - sx) * dx + (py - sy) * dy) / seg2
        # The beam segment is only valid from the sniper to the target; the projection must lie within it
        if t < 0 or t > 1:
            return
        mx = sx + t * dx
        my = sy + t * dy
        dist = math.sqrt((px - mx) ** 2 + (py - my) ** 2)
        half = self.beam_width / 2 + player.size.x / 2
        if dist <= half:
            # hit: the player's aimed-shot logic (shield / damage / hitstop / shake)
            pc = player.get_component(PlayerController)
            if pc is not None:
                pc.on_beam_hit()
            else:
                hp = player.get_component(Health)
                if hp:
                    hp.take_damage(1)
            scene = getattr(Engine.instance, "active_scene", None)
            if scene:
                scene.add_shake(0.25)

    def draw(self, surface: pygame.Surface, camera_offset: Vector2):
        o = self.game_object
        sx = int(o.position.x - camera_offset.x)
        sy = int(o.position.y - camera_offset.y)
        cx = sx + o.size.x // 2
        cy = sy + o.size.y // 2
        # Aim/lock beam
        if self._beam_flash > 0:
            # Fire moment: bright white/red thick laser (fades)
            ex = self._lock_x - camera_offset.x if self._lock_x is not None else cx
            ey = self._lock_y - camera_offset.y if self._lock_y is not None else cy
            width = max(2, int(6 * (self._beam_flash / 0.12)))
            pygame.draw.line(surface, (255, 255, 255), (cx, cy), (int(ex), int(ey)), width + 2)
            pygame.draw.line(surface, (255, 60, 60), (cx, cy), (int(ex), int(ey)), max(1, width))
        elif self._locked and self._lock_x is not None:
            # Lock: frozen, blinking red line (telegraph)
            ex = self._lock_x - camera_offset.x
            ey = self._lock_y - camera_offset.y
            blink = (int(self.timer * 18) % 2) == 0
            col = (255, 235, 80) if blink else (255, 80, 80)
            pygame.draw.line(surface, col, (cx, cy), (int(ex), int(ey)), 3)
        elif self._target_x is not None:
            # Aim: thin red line tracking the player
            ex = self._target_x - camera_offset.x
            ey = self._target_y - camera_offset.y
            pygame.draw.line(surface, (255, 70, 70), (cx, cy), (int(ex), int(ey)), 2)
        # Sniper body highlight (laser source)
        pygame.draw.circle(surface, (255, 255, 255), (cx, cy), 3)


class BobbingAnimation(Component):
    def __init__(self, amplitude=6.0, speed=4.0):
        super().__init__()
        self.amplitude = amplitude
        self.speed = speed
        self.time = random.uniform(0, 3.14)
        self.base_y = 0.0

    def start(self):
        self.base_y = self.game_object.position.y

    def update(self, dt: float):
        self.time += dt
        self.game_object.position.y = self.base_y + math.sin(self.time * self.speed) * self.amplitude


class PatrolPlatform(Component):
    def __init__(self, distance=140.0, speed=80.0, vertical=False):
        super().__init__()
        self.distance = distance
        self.speed = speed
        self.vertical = vertical
        self.start_pos = 0.0
        self.direction = 1

    def start(self):
        self.start_pos = self.game_object.position.y if self.vertical else self.game_object.position.x

    def update(self, dt: float):
        if self.vertical:
            self.game_object.position.y += self.speed * self.direction * dt
            if abs(self.game_object.position.y - self.start_pos) >= self.distance:
                self.direction *= -1
        else:
            self.game_object.position.x += self.speed * self.direction * dt
            if abs(self.game_object.position.x - self.start_pos) >= self.distance:
                self.direction *= -1


class FloatingScore(Component):
    """The '+10' text that rises and fades when collecting score."""
    def __init__(self, text="+10", color=(255, 215, 50), font_size=20, duration=0.8):
        super().__init__()
        self.text = text
        self.color = color
        self.font_size = font_size
        self.timer = 0.0
        self.duration = duration
        self._font = None

    def update(self, dt: float):
        self.timer += dt
        if self.timer >= self.duration:
            try:
                from deep_engine.core import Engine
                eng = Engine.instance
                if eng and eng.active_scene and self.game_object in eng.active_scene.game_objects:
                    eng.active_scene.game_objects.remove(self.game_object)
            except Exception:
                pass  # noqa: bilinçli
            return
        self.game_object.position.y -= 45 * dt  # drift upward

    def draw(self, surface: pygame.Surface, camera_offset):
        if not self._font:
            self._font = pygame.font.SysFont("Arial", self.font_size, bold=True)
        alpha = max(0.0, 1.0 - self.timer / self.duration)
        col = (int(self.color[0] * alpha + 30 * (1 - alpha)),
               int(self.color[1] * alpha + 30 * (1 - alpha)),
               int(self.color[2] * alpha + 30 * (1 - alpha)))
        text_surf = self._font.render(self.text, True, col)
        surface.blit(text_surf, (int(self.game_object.position.x), int(self.game_object.position.y)))


class PortalArrowUI(Component):
    """Screen-space arrow pointing toward the goal portal while it is off-screen.

    is_ui=True so it is unaffected by camera zoom/parallax; the player never loses
    their bearings on long procedural maps. The arrow is hidden while the portal
    is on screen (clear line of sight).
    """
    is_ui = True

    def __init__(self, color=(175, 90, 255), margin=28, size=18):
        super().__init__()
        self.color = color
        self.margin = margin
        self.size = size

    def draw(self, surface: pygame.Surface, camera_offset):
        from deep_engine.core import Engine
        eng = Engine.instance
        if not eng or not eng.active_scene:
            return
        scene = eng.active_scene
        # Hide the arrow in the main menu (menu_idle) — the menu scene also builds the
        # campaign entrance and we don't want a navigation arrow there.
        player_obj = scene.find_by_tag("Player")
        if player_obj:
            pc = player_obj.get_component(PlayerController)
            if pc and getattr(pc, "menu_idle", False):
                return
        portal = next((o for o in scene.game_objects
                       if getattr(o, "active", True) and o.tag == "Portal"), None)
        if not portal:
            return
        w, h = surface.get_width(), surface.get_height()
        cx, cy = w // 2, h // 2
        px = portal.position.x - camera_offset.x
        py = portal.position.y - camera_offset.y
        # No arrow needed while the portal is on screen.
        if self.margin <= px <= w - self.margin and self.margin <= py <= h - self.margin:
            return
        dx, dy = px - cx, py - cy
        length = math.hypot(dx, dy)
        if length < 1e-6:
            return
        ux, uy = dx / length, dy / length
        # Ray from the center toward the portal -> intersection with the screen rect:
        # the arrow pins to the screen edge (not the center).
        cand = []
        if ux > 0:
            cand.append((w - self.margin - cx) / ux)
        elif ux < 0:
            cand.append((cx - self.margin) / -ux)
        if uy > 0:
            cand.append((h - self.margin - cy) / uy)
        elif uy < 0:
            cand.append((cy - self.margin) / -uy)
        t = min((c for c in cand if c > 0), default=None)
        if t is None:
            return
        tip_x = cx + ux * t
        tip_y = cy + uy * t
        base_x = tip_x - ux * self.size
        base_y = tip_y - uy * self.size
        perp_x, perp_y = -uy, ux
        head = self.size * 0.55
        pygame.draw.line(surface, self.color, (base_x, base_y), (tip_x, tip_y), 4)
        pygame.draw.polygon(surface, self.color, [
            (tip_x, tip_y),
            (base_x + perp_x * head, base_y + perp_y * head),
            (base_x - perp_x * head, base_y - perp_y * head),
        ])
        pygame.draw.line(surface, (30, 10, 60), (base_x, base_y), (tip_x, tip_y), 1)


class TutorialBanner(Component):
    """Onboarding sequence for the first campaign entrance, teaching mechanics step by step.

    Shows a series of tips: movement → jump → double jump → dash → shoot →
    coin streak → portal goal. When the player performs the action, it advances
    to the next tip; otherwise each step force-advances within MAX_SHOW seconds
    (the player never gets stuck on a scripted step). When the whole series
    finishes, a permanent 'tutorial_done' flag is written to the savegame and it
    is never shown again.

    is_ui=True → independent of camera/zoom, drawn fixed at bottom-center.
    Hidden in the main menu (menu_idle) (the menu scene also builds the first
    campaign entrance; no tutorial wanted there).
    """
    is_ui = True

    MIN_SHOW = 1.2      # minimum time a step stays visible (noticeable transition)
    MAX_SHOW = 8.0      # force-advance if the condition never happens (no getting stuck)

    def __init__(self):
        super().__init__()
        # (i18n key, condition: receives the player (pc, rb, scene) -> bool; None = unconditional)
        self.steps = [
            ("tut_move",   self._done_move),
            ("tut_jump",   self._done_jump),
            ("tut_double", self._done_double),
            ("tut_dash",   self._done_dash),
            ("tut_shoot",  self._done_shoot),
            ("tut_coin",   self._done_coin),
            ("tut_goal",   None),  # goal info; unconditional, ends by timeout
        ]
        self.index = 0
        self.timer = 0.0
        self.done = False
        self._pc = None
        self._rb = None
        self._font = None
        self._small_font = None

    def start(self):
        from deep_engine.core import Engine
        eng = Engine.instance
        if not eng or not eng.active_scene:
            return
        po = eng.active_scene.find_by_tag("Player")
        if po:
            self._pc = po.get_component(PlayerController)
            self._rb = po.get_component(Rigidbody2D)

    # --- step conditions (observe player behavior) ---
    @staticmethod
    def _done_move(pc, rb, scene):
        return rb is not None and abs(rb.velocity.x) > 30

    @staticmethod
    def _done_jump(pc, rb, scene):
        return rb is not None and not rb.is_grounded

    @staticmethod
    def _done_double(pc, rb, scene):
        # Double jump used: airborne + both jumps spent.
        return rb is not None and pc is not None and not rb.is_grounded and not pc.can_double_jump

    @staticmethod
    def _done_dash(pc, rb, scene):
        return pc is not None and pc.dash_timer > 0

    @staticmethod
    def _done_shoot(pc, rb, scene):
        # Shot went on cooldown (a bullet was fired).
        return pc is not None and pc.shoot_cooldown > 0.1

    @staticmethod
    def _done_coin(pc, rb, scene):
        # At least a 2-coin streak (easy while running).
        return pc is not None and pc.coin_streak >= 2

    def update(self, dt):
        if self.done:
            return
        if self._pc is None:
            self.start()
        if self._pc is None:
            return
        # Wait while in the main menu — start once the game begins (menu_idle=False).
        if self._pc.menu_idle:
            self.timer = 0.0
            return
        self.timer += dt
        if self.timer < self.MIN_SHOW:
            return
        key, cond = self.steps[self.index]
        ok = False
        if cond is not None:
            try:
                from deep_engine.core import Engine
                ok = bool(cond(self._pc, self._rb,
                               Engine.instance.active_scene if Engine.instance else None))
            except Exception:
                ok = False
        if ok or cond is None or self.timer >= self.MAX_SHOW:
            self._advance()

    def _advance(self):
        self.index += 1
        self.timer = 0.0
        try:
            SoundFX.play("click")
        except Exception:
            pass  # noqa: bilinçli
        if self.index >= len(self.steps):
            self.done = True
            self._mark_done()
            if self.game_object:
                self.game_object.active = False

    def _mark_done(self):
        try:
            profile = SaveGame(os.path.join(user_data_dir(), "savegame.json"))
            profile.set("tutorial_done", True)
            profile.save()
        except Exception:
            pass  # noqa: bilinçli

    def draw(self, surface: pygame.Surface, camera_offset):
        if self.done:
            return
        if self._pc is None:
            return
        if self._pc.menu_idle:
            return
        key, _cond = self.steps[self.index]
        if not self._font:
            self._font = pygame.font.SysFont("Arial", 18, bold=True)
            self._small_font = pygame.font.SysFont("Arial", 13)
        w, h = surface.get_width(), surface.get_height()
        label = I18n.localize("tut_banner", index=self.index + 1, total=len(self.steps))
        text = I18n.t(key)
        # Semi-transparent bottom band
        band_w = min(w - 60, 620)
        band_h = 34
        bx = (w - band_w) // 2
        by = h - band_h - 14
        band = pygame.Surface((band_w, band_h), pygame.SRCALPHA)
        band.fill((8, 12, 20, 180))
        surface.blit(band, (bx, by))
        pygame.draw.rect(surface, (120, 200, 255), (bx, by, band_w, band_h), 1, border_radius=8)
        # Title (TUTORIAL i/N) left, text center/left
        title_surf = self._small_font.render(label, True, (150, 210, 255))
        surface.blit(title_surf, (bx + 10, by + 3))
        text_surf = self._font.render(text, True, (240, 245, 255))
        surface.blit(text_surf, (bx + 10, by + 16))
        # Progress dots on the right
        for i in range(len(self.steps)):
            c = (120, 220, 120) if i < self.index else ((255, 220, 90) if i == self.index else (90, 120, 150))
            px = bx + band_w - 10 - (len(self.steps) - i) * 16
            pygame.draw.circle(surface, c, (px, by + band_h // 2), 4)


def _spawn_float_score(world_x, world_y, text="+10", color=(255, 215, 50), font_size=20):
    """Spawns a screen-space '+score' text at a world-coordinate point."""
    try:
        from deep_engine.core import Engine
        eng = Engine.instance
        if not eng or not eng.active_scene:
            return
        cam = eng.active_scene.camera_position
        obj = GameObject(name="FloatScore", x=world_x - cam.x, y=world_y - cam.y)
        obj.add_component(FloatingScore(text=text, color=color, font_size=font_size))
        eng.active_scene.add_object(obj)
    except Exception:
        pass  # noqa: bilinçli