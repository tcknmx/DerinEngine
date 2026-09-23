import pygame
from .math2d import Vector2
from .game_object import GameObject
from .components import BoxCollider, Rigidbody2D

# --- Vignette (camera gradient) ---
# Precomputed radial mask that softly darkens the screen edges. It is reused
# for a variety of purposes (e.g. strong in the menu, subtle in gameplay) and as
# a red flash when the player is hit. For performance, each size/color combo is
# generated once and cached.
_VIGNETTE_CACHE = {}


def _build_vignette_surface(w, h, color=(0, 0, 0), falloff=1.6, edge_start=0.50, strength=0.30):
    key = (w, h, color, falloff, edge_start, strength)
    if key not in _VIGNETTE_CACHE:
        surf = pygame.Surface((w, h), pygame.SRCALPHA)
        cx, cy = w / 2.0, h / 2.0
        mx = w / 2.0
        my = h / 2.0
        step = 4
        for y in range(0, h, step):
            for x in range(0, w, step):
                # normalized distance from center: center 0, corners ~1.4 (clipped)
                dx = (x - cx) / mx
                dy = (y - cy) / my
                d = (dx * dx + dy * dy) ** 0.5
                t = min(1.0, d)
                ramp = max(0.0, (t - edge_start) / (1.0 - edge_start))
                a = int(255 * strength * (ramp ** falloff))
                if a > 0:
                    surf.fill((color[0], color[1], color[2], a), (x, y, step, step))
        _VIGNETTE_CACHE[key] = surf
    return _VIGNETTE_CACHE[key]

class Scene:
    """Scene class representing a game level or screen."""
    def __init__(self, name="MainScene", background_color=(30, 30, 40)):
        self.name = name
        self.background_color = background_color
        self.game_objects = []
        self._objects_to_destroy = []
        self._objects_to_add = []
        self.camera_position = Vector2(0, 0)
        self.camera_target = None  # the object the camera will follow (e.g. the Player)
        self.camera_smoothness = 5.0
        self.screen_width = 800
        self.screen_height = 600
        self.parallax_background = None  # layered parallax background (optional)

        # --- Screen Shake ---
        self.shake_trauma = 0.0          # 0.0 -> 1.0; how much shake there is
        self.shake_offset = Vector2(0, 0)
        self.shake_max_offset = 14.0     # maximum shake amplitude in pixels
        self.camera_kick = Vector2(0, 0) # sudden 'kick' (punch) given to the camera on dash/explosion

        # --- Camera Zoom (V2.0: wide angle from main menu into gameplay -> zoom in) ---
        self.camera_zoom = 1.0           # 1.0 = normal; <1 = far/wide angle; >1 = close
        self.camera_zoom_target = 1.0
        self.zoom_smoothness = 3.0       # how fast it eases toward the target
        self.camera_manual = False       # when True automatic follow is off (menu camera)

        # --- Camera vignette (menu/gameplay gradient + hit flash) ---
        self.vignette_intensity = 0.22   # 0..1 constant edge darkening (subtle in-game)
        self.hit_flash = 0.0             # 0..1 red flash ramp for the moment of a hit

    def set_vignette(self, v: float):
        """Sets the persistent vignette strength (0..1). Stronger in the menu, subtle in gameplay."""
        self.vignette_intensity = max(0.0, min(1.0, v))

    def flash(self, v: float):
        """Triggers the red hit flash (it stacks; it fades over time)."""
        self.hit_flash = min(1.0, max(self.hit_flash, v))

    def add_object(self, obj: GameObject):
        """Adds a new game object to the scene."""
        self._objects_to_add.append(obj)
        return obj

    def destroy(self, obj: GameObject):
        """Marks an object to be removed from the scene."""
        self._objects_to_destroy.append(obj)

    def find_by_tag(self, tag: str):
        """Finds the first object with the given tag."""
        for obj in self.game_objects:
            if obj.active and obj.tag == tag:
                return obj
        return None

    def find_all_by_tag(self, tag: str):
        """Returns a list of all objects with the given tag."""
        return [obj for obj in self.game_objects if obj.active and obj.tag == tag]

    def set_camera_target(self, obj: GameObject):
        """Makes the camera follow the target object."""
        self.camera_target = obj

    def add_shake(self, amount: float):
        """Adds screen shake (trauma). amount is between 0.0-1.0 and it stacks."""
        self.shake_trauma = min(1.0, self.shake_trauma + amount)

    def kick_camera(self, x: float, y: float):
        """Applies a momentary 'kick' (punch) to the camera along the movement direction (dash etc.)."""
        self.camera_kick.x += x
        self.camera_kick.y += y

    def zoom_to(self, target: float):
        """Smoothly eases the camera zoom toward the target value (1.0 = normal/close)."""
        self.camera_zoom_target = target

    def _is_ui_object(self, obj) -> bool:
        """Tells whether the object is drawn in screen space (UI) so it stays outside zoom."""
        for comp in obj.components:
            if getattr(comp, "is_ui", False):
                return True
        return False

    def _update_shake(self):
        """Decays the trauma and computes a random shake offset."""
        self.shake_trauma = max(0.0, self.shake_trauma - 1.2 / 60.0)
        if self.shake_trauma <= 0.0:
            self.shake_offset = Vector2(0, 0)
            return
        import random
        power = self.shake_trauma ** 2
        self.shake_offset = Vector2(
            random.uniform(-1, 1) * self.shake_max_offset * power,
            random.uniform(-1, 1) * self.shake_max_offset * power
        )

    @property
    def render_camera(self) -> Vector2:
        """The camera position used for rendering (shake included)."""
        self._update_shake()
        return self.camera_position + self.shake_offset

    def _handle_physics_and_collisions(self):
        """Resolves collisions between solid objects and ground contacts."""
        # Reset the grounded state of every physics object before collision checks
        for obj in self.game_objects:
            rb = obj.get_component(Rigidbody2D)
            if rb:
                rb.is_grounded = False

        colliders = []
        static_solid_colliders = []
        for obj in self.game_objects:
            if not obj.active:
                continue
            col = obj.get_component(BoxCollider)
            if col:
                colliders.append(col)
                if not col.is_trigger and not obj.get_component(Rigidbody2D):
                    static_solid_colliders.append(col)

        # Check collision pairs: a direct O(n²) is fine for small levels, but for large
        # scenes (many bullets + coins + enemies) we keep the frame rate up with a UNIFORM
        # SPATIAL GRID. Each collider is bucketed into the cells it covers; only candidates
        # landing in the same cell enter the overlap test (no nondeterminism — it yields the
        # exact same collision set).
        CELL = 128
        grid = {}
        for idx, col in enumerate(colliders):
            r = col.get_rect()
            for cx in range(r.left // CELL, r.right // CELL + 1):
                for cy in range(r.top // CELL, r.bottom // CELL + 1):
                    grid.setdefault((cx, cy), []).append((idx, col))

        seen = set()  # prevents the same pair from being processed in multiple cells
        for bucket in grid.values():
            n = len(bucket)
            for a in range(n):
                ia, c1 = bucket[a]
                for b in range(a + 1, n):
                    ib, c2 = bucket[b]
                    key = (ia, ib) if ia < ib else (ib, ia)
                    if key in seen:
                        continue
                    seen.add(key)

                    if not c1.check_collision(c2):
                        continue
                    # Trigger event notifications
                    for comp in c1.game_object.components:
                        comp.on_collision(c2.game_object)
                    for comp in c2.game_object.components:
                        comp.on_collision(c1.game_object)

                    # If at least one of them is a trigger, skip the physical push
                    if c1.is_trigger or c2.is_trigger:
                        continue

                    # Physical push / solid block collision resolution
                    self._resolve_solid_collision(c1, c2)

        # Stable ground detection (prevents the character from entering a 1-pixel fall-rise loop on the ground)
        for obj in self.game_objects:
            rb = obj.get_component(Rigidbody2D)
            if rb and not rb.is_grounded and rb.velocity.y >= 0:
                foot_rect = pygame.Rect(int(obj.position.x + 4), int(obj.position.y + obj.size.y), int(obj.size.x - 8), 2)
                for sc in static_solid_colliders:
                    if foot_rect.colliderect(sc.get_rect()):
                        rb.is_grounded = True
                        rb.velocity.y = 0
                        obj.position.y = sc.get_rect().top - obj.size.y
                        break

    def _resolve_solid_collision(self, c1: BoxCollider, c2: BoxCollider):
        # Resolve with the logic "if one has a Rigidbody2D, the other is a platform"
        r1 = c1.game_object.get_component(Rigidbody2D)
        r2 = c2.game_object.get_component(Rigidbody2D)

        # If both sides are dynamic (e.g. Player-Hopper or Player-Boss contact):
        # do NOT apply one-sided solid push. Such contact is handled by game logic
        # (on_collision — damage / crush / stun / stun-dash) and it removes the
        # order-dependent, unpredictable push behavior coming from the colliders list.
        if r1 and r2:
            return

        dynamic_col = c1 if r1 else (c2 if r2 else None)
        static_col = c2 if r1 else (c1 if r2 else None)

        if not dynamic_col or not static_col:
            return

        dyn_obj = dynamic_col.game_object
        stat_obj = static_col.game_object
        rb = dyn_obj.get_component(Rigidbody2D)

        rect1 = dynamic_col.get_rect()
        rect2 = static_col.get_rect()

        # One-way platform: only allows standing on it from above.
        # It supports the character while landing (moving downward); from below
        # or the sides the character can pass through.
        if getattr(static_col, "one_way", False):
            if rb.velocity.y >= 0 and (rect1.bottom - rect2.top) <= 4:
                dyn_obj.position.y = rect2.top - dyn_obj.size.y
                rb.velocity.y = 0
                rb.is_grounded = True
            return

        # Compute the overlap amounts
        overlap_left = (rect1.right - rect2.left)
        overlap_right = (rect2.right - rect1.left)
        overlap_top = (rect1.bottom - rect2.top)
        overlap_bottom = (rect2.bottom - rect1.top)

        min_overlap = min(overlap_left, overlap_right, overlap_top, overlap_bottom)

        if min_overlap == overlap_top and rb.velocity.y >= 0:
            # Landing on the ground from above
            dyn_obj.position.y = rect2.top - dyn_obj.size.y
            rb.velocity.y = 0
            rb.is_grounded = True
        elif min_overlap == overlap_bottom and rb.velocity.y < 0:
            # Hitting the ceiling from below
            dyn_obj.position.y = rect2.bottom
            rb.velocity.y = 0
        elif min_overlap == overlap_left:
            # Hitting from the left
            dyn_obj.position.x = rect2.left - dyn_obj.size.x
            rb.velocity.x = 0
        elif min_overlap == overlap_right:
            # Hitting from the right
            dyn_obj.position.x = rect2.right
            rb.velocity.x = 0

    def start(self):
        # Also activate objects that are pending (not yet added) when the scene starts,
        # so update/draw/save can happen right after set_scene.
        if self._objects_to_add:
            for obj in self._objects_to_add:
                self.game_objects.append(obj)
            self._objects_to_add.clear()
        for obj in self.game_objects:
            obj.start()

    def update(self, dt: float):
        # Activate newly added objects
        if self._objects_to_add:
            for obj in self._objects_to_add:
                self.game_objects.append(obj)
                obj.start()
            self._objects_to_add.clear()

        # Clean up objects marked for removal
        if self._objects_to_destroy:
            self.game_objects = [obj for obj in self.game_objects if obj not in self._objects_to_destroy]
            self._objects_to_destroy.clear()

        # Update the objects
        for obj in self.game_objects:
            obj.update(dt)

        # Resolve physics and collisions
        self._handle_physics_and_collisions()

        # Camera follow
        if self.camera_target and not self.camera_manual:
            target_x = self.camera_target.position.x - self.screen_width / 2 + self.camera_target.size.x / 2
            target_y = self.camera_target.position.y - self.screen_height / 2 + self.camera_target.size.y / 2
            # Look-ahead: nudge the camera slightly forward based on the player's speed
            # (look ahead toward where the player is heading -> endless, more 'lively' screen)
            rb = self.camera_target.get_component(Rigidbody2D)
            if rb is not None:
                look = max(-1.0, min(1.0, rb.velocity.x / 260.0)) * 70.0
                target_x += look
            # Smooth follow (Lerp)
            self.camera_position.x += (target_x - self.camera_position.x) * min(dt * self.camera_smoothness, 1.0)
            self.camera_position.y += (target_y - self.camera_position.y) * min(dt * self.camera_smoothness, 1.0)

        # Camera 'kick' (punch): the instant reaction fades over time and is added to the target
        if self.camera_kick.x != 0 or self.camera_kick.y != 0:
            self.camera_position += self.camera_kick
            decay = max(0.0, 1.0 - dt * 10.0)
            self.camera_kick.x *= decay
            self.camera_kick.y *= decay
            if abs(self.camera_kick.x) < 0.1 and abs(self.camera_kick.y) < 0.1:
                self.camera_kick = Vector2(0, 0)

        # Smoothly ease the camera zoom toward the target (V2.0)
        if self.camera_zoom != self.camera_zoom_target:
            self.camera_zoom += (self.camera_zoom_target - self.camera_zoom) * min(dt * self.zoom_smoothness, 1.0)
            if abs(self.camera_zoom - self.camera_zoom_target) < 0.002:
                self.camera_zoom = self.camera_zoom_target

        # The red hit flash fades over time
        if self.hit_flash > 0.0:
            self.hit_flash = max(0.0, self.hit_flash - dt * 2.2)

    def _draw_vignette(self, surface: pygame.Surface):
        """Draws a soft gradient vignette on the screen edges + (if any) red hit flash."""
        if self.vignette_intensity <= 0.01 and self.hit_flash <= 0.01:
            return
        w, h = surface.get_size()
        # Persistent vignette (edge darkening)
        if self.vignette_intensity > 0.01:
            vs = _build_vignette_surface(w, h, (0, 0, 0))
            vs.set_alpha(int(255 * min(1.0, self.vignette_intensity)))
            surface.blit(vs, (0, 0))
        # Red hit flash (on top, stronger)
        if self.hit_flash > 0.01:
            rs = _build_vignette_surface(w, h, (255, 40, 30), falloff=1.2, edge_start=0.30, strength=0.55)
            rs.set_alpha(int(255 * min(1.0, self.hit_flash)))
            surface.blit(rs, (0, 0))

    def draw(self, surface: pygame.Surface):
        surface.fill(self.background_color)
        render_cam = self.render_camera
        zoom = self.camera_zoom
        # Normal (no zoom) drawing — the most common path, optimized for performance.
        if abs(zoom - 1.0) < 0.001:
            if self.parallax_background:
                self.parallax_background.draw(surface, render_cam)
            for obj in self.game_objects:
                if not self._is_ui_object(obj):
                    obj.draw(surface, render_cam)
            # Draw UI objects on top (independent of camera/zoom, z-order preserved)
            for obj in self.game_objects:
                if self._is_ui_object(obj):
                    obj.draw(surface, render_cam)
            self._draw_vignette(surface)
            return

        # Zoomed drawing: draw the world (except UI) to an intermediate surface, scale
        # and center it around the camera's midpoint; UI objects are unaffected by zoom.
        w, h = surface.get_width(), surface.get_height()
        world_surf = pygame.Surface((w, h))
        # Sky/background fill: with zoomed drawing the background color (the empty area
        # left above the parallax) should be the scene's background color, not black.
        world_surf.fill(self.background_color)
        if self.parallax_background:
            self.parallax_background.draw(world_surf, render_cam)
        for obj in self.game_objects:
            if not self._is_ui_object(obj):
                obj.draw(world_surf, render_cam)
        # Scale around the center (zoom<1 pushes away, >1 pulls closer)
        zoomed = pygame.transform.rotozoom(world_surf, 0, zoom)
        ox = (w - zoomed.get_width()) // 2
        oy = (h - zoomed.get_height()) // 2
        surface.blit(zoomed, (ox, oy))
        # Draw UI objects separately, without zoom
        for obj in self.game_objects:
            if self._is_ui_object(obj):
                obj.draw(surface, render_cam)
        self._draw_vignette(surface)
