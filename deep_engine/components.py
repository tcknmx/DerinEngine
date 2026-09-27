import pygame
from .math2d import Vector2

def _slow_dt(dt):
    """Slows down the dt of non-player entities while the time-slow powerup is active.

    The player and player bullets do not use this function -> they are not slowed;
    enemies, bosses and enemy bullets do. The counter is ticked down in the
    PlayerController.update of the player (the counter is not reduced here).
    """
    from .core import Engine
    eng = Engine.instance
    if eng is None:
        return dt
    if getattr(eng, "_time_slow_remaining", 0.0) > 0:
        return dt * getattr(eng, "_time_slow_factor", 0.4)
    return dt

class Component:
    """Base class for all game components (physics, drawing, behavior)."""
    def __init__(self):
        self.game_object = None
        # Event system: loosely-coupled communication between components.
        # One component does `self.emit("jumped", ...)`; others listen
        # with `comp.on("jumped", fn)`. (Broadcasts at the component level.)
        self._events = {}

    def start(self):
        """Runs once when the game starts or when the component is added."""
        pass

    def update(self, dt: float):
        """Runs every frame (60 times per second). dt: time between two frames (seconds)."""
        pass

    def draw(self, surface: pygame.Surface, camera_offset: Vector2):
        """Called when it is time to draw to the screen."""
        pass

    def on_collision(self, other):
        """Triggered when a collision with another object occurs."""
        pass

    # --- Event System ------------------------------------------------------
    # Components can communicate with named signals without being directly
    # wired to each other (a lightweight version of Godot's signals).
    def on(self, event: str, callback):
        """Registers a listener for the given event. `callback(*args)` is called."""
        self._events.setdefault(event, []).append(callback)
        return callback

    def once(self, event: str, callback):
        """Registers a listener that fires only ONCE."""
        def _wrapper(*args, **kwargs):
            self.off(event, _wrapper)
            callback(*args, **kwargs)
        return self.on(event, _wrapper)

    def off(self, event: str, callback=None):
        """Removes all listeners for the given event (or just that callback)."""
        listeners = self._events.get(event)
        if not listeners:
            return
        if callback is None:
            self._events[event] = []
        else:
            self._events[event] = [c for c in listeners if c is not callback]

    def emit(self, event: str, *args, **kwargs):
        """Broadcasts the given event; all listeners are called with *args/**kwargs."""
        listeners = list(self._events.get(event, []))
        for cb in listeners:
            cb(*args, **kwargs)


class SpriteRenderer(Component):
    """Component that draws the object on screen as a colored shape (or image)."""
    def __init__(self, color=(255, 255, 255), shape="rect", border_radius=0):
        super().__init__()
        self.color = color
        self.shape = shape  # 'rect', 'circle'
        self.border_radius = border_radius

    def draw(self, surface: pygame.Surface, camera_offset: Vector2):
        obj = self.game_object
        screen_x = int(obj.position.x - camera_offset.x)
        screen_y = int(obj.position.y - camera_offset.y)

        if self.shape == "rect":
            rect = pygame.Rect(screen_x, screen_y, int(obj.size.x), int(obj.size.y))
            pygame.draw.rect(surface, self.color, rect, border_radius=self.border_radius)
        elif self.shape == "circle":
            radius = int(min(obj.size.x, obj.size.y) / 2)
            center = (screen_x + radius, screen_y + radius)
            pygame.draw.circle(surface, self.color, center, radius)
        elif self.shape == "spikes":
            # Sharp spike feel: 3-pointed sharp triangles rising bottom-to-top
            # along the box base (so the player can clearly read the danger).
            w = int(obj.size.x)
            h = int(obj.size.y)
            n = 3
            seg = w / n
            # base line (the dark block the spikes sit on)
            pygame.draw.rect(surface, self.color,
                             pygame.Rect(screen_x, screen_y + h - 3, w, 3))
            # bright tip on top, like salt (emphasizes the point's sharpness)
            tip_color = tuple(min(255, c + 70) for c in self.color)
            for i in range(n):
                x0 = screen_x + i * seg
                tip_x = x0 + seg / 2
                tri = [(x0, screen_y + h), (tip_x, screen_y - 2), (x0 + seg, screen_y + h)]
                pygame.draw.polygon(surface, self.color, tri)
                # thin bright tip line (sense of a pointed/sharp edge)
                pygame.draw.line(surface, tip_color,
                                 (tip_x, screen_y), (tip_x, screen_y + 3), 1)


class Animator(Component):
    """Simple 2D animation component driven by color frame arrays.

    (Like an 'Animator' in full engines, but instead of image files it works by
    keyframing the SpriteRenderer's color; compatible with procedural drawing.)

    Usage:
        anim = obj.add_component(Animator(fps=8))
        anim.add_state("idle",  [(255,215,0), (255,230,60), (255,215,0)])   # 3-frame loop
        anim.play("idle")                                                    # play looped
        anim.play("pop", loop=False)                                         # play once, then stop
    """
    def __init__(self, fps=8):
        super().__init__()
        self.fps = fps
        self.states = {}          # name -> color frame list
        self._sprite = None
        self._state = None        # active state name
        self._frames = []
        self._frame = 0
        self._timer = 0.0
        self.loop = True
        self.finished = False     # whether the one-shot animation is done

    def start(self):
        self._sprite = self.game_object.get_component(SpriteRenderer)

    def add_state(self, name: str, colors):
        """Registers an animation state (a color frame list)."""
        self.states[name] = list(colors)

    def play(self, name: str, loop=True):
        """Starts playing the given state."""
        if name not in self.states:
            return
        self._state = name
        self._frames = self.states[name]
        self._frame = 0
        self._timer = 0.0
        self.loop = loop
        self.finished = False
        self._apply_frame()

    def set_frame(self, index: int):
        """Instantly jumps to a specific frame."""
        if self._frames:
            self._frame = index % len(self._frames)
            self._apply_frame()

    def stop(self):
        """Stops the animation (it stays on the last frame's color)."""
        self._state = None
        self._timer = 0.0

    def _apply_frame(self):
        if self._sprite and self._frames:
            self._sprite.color = self._frames[self._frame]

    def update(self, dt: float):
        if not self._sprite or self._frames is None or not self._state or self.finished:
            return
        if not self.loop and self.finished:
            return
        self._timer += dt
        frame_time = 1.0 / max(1, self.fps)
        while self._timer >= frame_time:
            self._timer -= frame_time
            self._frame += 1
            if self._frame >= len(self._frames):
                if self.loop:
                    self._frame = 0
                else:
                    self._frame = len(self._frames) - 1
                    self.finished = True
                    break
            self._apply_frame()


class BoxCollider(Component):
    """2D Box Collision Box (Hitbox) component."""
    def __init__(self, is_trigger=False, one_way=False):
        super().__init__()
        self.is_trigger = is_trigger  # Trigger: the object is not a physical obstacle but reports when something passes through (e.g. picking up gold)
        self.one_way = one_way        # One-way platform: can be stood on from above, passed through from below

    def get_rect(self) -> pygame.Rect:
        return pygame.Rect(
            int(self.game_object.position.x),
            int(self.game_object.position.y),
            int(self.game_object.size.x),
            int(self.game_object.size.y)
        )

    def get_aabb(self) -> pygame.Rect:
        """Axis-aligned bounding box of the collider (for the spatial grid + broad phase)."""
        return self.get_rect()

    def check_collision(self, other_collider: 'BoxCollider') -> bool:
        """Checks whether the two boxes touch each other (AABB)."""
        return self.get_rect().colliderect(other_collider.get_rect())

    def overlap_check(self, other) -> bool:
        """Generic precise overlap test with ANY other collider type."""
        from .math2d import circle_aabb_overlap, polygons_overlap
        oaabb = other.get_aabb()
        if not self.get_aabb().colliderect(oaabb):
            return False
        if isinstance(other, CircleCollider):
            c = other.get_center()
            r = other.get_radius()
            x, y = self.game_object.position.x, self.game_object.position.y
            return circle_aabb_overlap(c.x, c.y, r, x, y, self.game_object.size.x, self.game_object.size.y)
        if isinstance(other, PolygonCollider):
            return polygons_overlap(self._as_poly(), other.get_world_points())
        return self.check_collision(other)

    def _as_poly(self):
        x, y = self.game_object.position.x, self.game_object.position.y
        w, h = self.game_object.size.x, self.game_object.size.y
        return [(x, y), (x + w, y), (x + w, y + h), (x, y + h)]


class CircleCollider(Component):
    """2D Circle (disk) Collision component.

    The circle lives inside the object's box (size) and is centered in it, using
    the smaller axis so it always stays inside the sprite's rect.
    """
    def __init__(self, is_trigger=False, radius=None):
        super().__init__()
        self.is_trigger = is_trigger
        self._radius = radius   # None -> auto from object size

    def get_radius(self):
        if self._radius is not None:
            return float(self._radius)
        return min(self.game_object.size.x, self.game_object.size.y) / 2.0

    def get_center(self):
        obj = self.game_object
        from .math2d import Vector2
        return Vector2(obj.position.x + obj.size.x / 2.0,
                       obj.position.y + obj.size.y / 2.0)

    def get_aabb(self) -> pygame.Rect:
        c = self.get_center()
        r = self.get_radius()
        return pygame.Rect(int(c.x - r), int(c.y - r), int(r * 2), int(r * 2))

    def check_collision(self, other_collider) -> bool:
        return self.overlap_check(other_collider)

    def overlap_check(self, other) -> bool:
        from .math2d import circle_circle_overlap, circle_polygon_overlap, circle_aabb_overlap
        oaabb = other.get_aabb()
        if not self.get_aabb().colliderect(oaabb):
            return False
        c = self.get_center()
        r = self.get_radius()
        if isinstance(other, CircleCollider):
            oc = other.get_center()
            return circle_circle_overlap(c.x, c.y, r, oc.x, oc.y, other.get_radius())
        if isinstance(other, BoxCollider):
            x, y = other.game_object.position.x, other.game_object.position.y
            return circle_aabb_overlap(c.x, c.y, r, x, y,
                                       other.game_object.size.x, other.game_object.size.y)
        if isinstance(other, PolygonCollider):
            return circle_polygon_overlap(c.x, c.y, r, other.get_world_points())
        return False


class PolygonCollider(Component):
    """2D Convex Polygon collider.

    Points are stored in LOCAL space (relative to the object's top-left corner).
    The world position is computed from the object's current position, so the
    polygon moves with the object automatically.
    """
    def __init__(self, points=None, is_trigger=False, one_way=False):
        super().__init__()
        self.is_trigger = is_trigger
        self.one_way = one_way
        self.points = [tuple(p) for p in (points or [(0, 0), (32, 0), (32, 32), (0, 32)])]

    def get_world_points(self):
        obj = self.game_object
        ox, oy = obj.position.x, obj.position.y
        return [(ox + px, oy + py) for px, py in self.points]

    def get_aabb(self) -> pygame.Rect:
        xs = [p[0] for p in self.get_world_points()]
        ys = [p[1] for p in self.get_world_points()]
        x, y = min(xs), min(ys)
        return pygame.Rect(int(x), int(y), int(max(xs) - x), int(max(ys) - y))

    def check_collision(self, other_collider) -> bool:
        return self.overlap_check(other_collider)

    def overlap_check(self, other) -> bool:
        from .math2d import polygons_overlap, circle_polygon_overlap
        oaabb = other.get_aabb()
        if not self.get_aabb().colliderect(oaabb):
            return False
        wp = self.get_world_points()
        if isinstance(other, PolygonCollider):
            return polygons_overlap(wp, other.get_world_points())
        if isinstance(other, CircleCollider):
            c = other.get_center()
            return circle_polygon_overlap(c.x, c.y, other.get_radius(), wp)
        if isinstance(other, BoxCollider):
            return polygons_overlap(wp, other._as_poly())
        return False


def _collider_overlap(a, b):
    """Generic overlap test between any two collider components."""
    return a.overlap_check(b)


def _mix_value(a, b, t):
    """Linearly interpolates two values (numbers, tuple/list colors or Vector2)."""
    if isinstance(a, (int, float)) and isinstance(b, (int, float)):
        return a + (b - a) * t
    if isinstance(a, (list, tuple)) and isinstance(b, (list, tuple)):
        mixed = [a[i] + (b[i] - a[i]) * t for i in range(min(len(a), len(b)))]
        return type(a)(round(v) if isinstance(a[i], int) else v for i, v in enumerate(mixed))
    from .math2d import Vector2
    if isinstance(a, Vector2) and isinstance(b, Vector2):
        return Vector2(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t)
    return b if t >= 0.5 else a


class KeyframeAnimator(Component):
    """Tween-based keyframe animation over object properties.

    Unlike Animator (which cycles SpriteRenderer colors), this component plays a
    timed list of keyframes and interpolates the target property smoothly between
    them (using the engine's easing curves). Any attribute path can be animated:
    position/size/rotation on the object, or SpriteRenderer color, etc.

    Usage:
        kf = obj.add_component(KeyframeAnimator(loop=True, autoplay=True))
        kf.animate("position.x", [(0, 0.0)], [(300, 1.0)], ease="in_out")   # nodes list
        kf.animate("size", [(32, 32)])          # or add keyframes then set duration
        kf.play(); kf.pause(); kf.stop()

    The easing names match the tween module: 'linear', 'in', 'out', 'in_out',
    'in_back', 'out_back', etc. (see tween.EASING).
    """
    def __init__(self, loop=True, autoplay=False, fps=60):
        super().__init__()
        self.loop = loop
        self.autoplay = autoplay
        self.fps = fps
        self.animations = {}      # attr_path -> {'nodes':[(value,time),...], 'ease':...}
        self._tracks = {}         # state per playing track
        self._time = 0.0
        self._playing = False

    def _ease_fn(self, name):
        from .tween import EASING, ease_linear
        fn = EASING.get(name, ease_linear)
        return fn

    def animate(self, attr_path: str, nodes, ease="linear", duration=None):
        """Registers/restarts a keyframe track.

        `nodes` is a list of `(value, at_time)` keyframes, sorted by time.
        `duration` overrides the total time from the last keyframe. `value` can be
        a number, a color tuple (for sprite color), or a (x, y) Vector2 target.
        """
        ordered = sorted(nodes, key=lambda n: n[1])
        total = duration if duration else ordered[-1][1]
        self.animations[attr_path] = {"nodes": ordered, "ease": ease, "length": max(total, 0.001)}
        self._tracks[attr_path] = {"pos": 0.0, "from": None, "to": None, "seg": 0, "t": 0.0}
        if self.autoplay:
            self._playing = True
        return self

    def play(self):
        """Starts (or resumes) all registered tracks from the beginning."""
        self._time = 0.0
        self._playing = True
        self._tracks.clear()
        for path, anim in self.animations.items():
            self._tracks[path] = {"pos": 0.0, "seg": 0, "t": 0.0}
        return self

    def pause(self):
        self._playing = False
        return self

    def stop(self):
        self._playing = False
        self._time = 0.0
        return self

    @property
    def playing(self):
        return self._playing

    def _get_path(self, obj, path):
        """Resolves a dotted attribute path (e.g. 'position.x', 'sprite.color').

        Aliases let the animation target common components without a reference:
        'sprite' -> SpriteRenderer, 'animator' -> Animator, 'transform' -> obj.
        """
        node = obj
        parts = path.split(".")
        # First segment may be a component alias.
        aliases = {"sprite": SpriteRenderer, "animator": Animator}
        if parts and parts[0] in aliases:
            comp = obj.get_component(aliases[parts[0]])
            if comp is None:
                return None, None, None
            node = comp
            parts = parts[1:]
        if not parts:
            return None, None, None
        cur = node
        for i, p in enumerate(parts):
            if not hasattr(cur, p):
                return None, None, None
            if i == len(parts) - 1:
                return cur, p, None
            cur = getattr(cur, p)
        return cur, parts[-1], None

    def _set_path(self, obj, path, value):
        cur, name, _ = self._get_path(obj, path)
        if cur is None:
            return
        setattr(cur, name, value)

    def update(self, dt: float):
        if not self._playing or not self.animations:
            return
        # Current time is driven by dt (frames), not per-track.
        step = dt
        self._time += step

        for path, anim in self.animations.items():
            track = self._tracks.get(path)
            if track is None:
                continue
            nodes = anim["nodes"]
            if len(nodes) < 2:
                continue
            # Find the segment [a, b) that currently brackets the time.
            seg = 0
            for i in range(len(nodes) - 2, -1, -1):
                if self._time >= nodes[i][1]:
                    seg = i
                    break
            a_val, a_time = nodes[seg]
            b_val, b_time = nodes[seg + 1]
            span = max(b_time - a_time, 0.001)
            t = min(1.0, max(0.0, (self._time - a_time) / span))
            eased = self._ease_fn(anim["ease"])(t)
            val = _mix_value(a_val, b_val, eased)
            self._set_path(self.game_object, path, val)

        # Loop / finish
        max_t = max((anim["nodes"][-1][1] for anim in self.animations.values()), default=0.0)
        if self._time >= max_t:
            if self.loop:
                self._time -= max_t
            else:
                self._playing = False


class Rigidbody2D(Component):
    """Component that adds gravity, velocity and physical movement."""
    def __init__(self, gravity=980.0, use_gravity=True, max_fall_velocity=1800.0):
        super().__init__()
        self.velocity = Vector2(0, 0)
        self.gravity = gravity
        self.use_gravity = use_gravity
        self.is_grounded = False
        # Ceils fall speed so a single frame cannot tunnel through a thin
        # one-way platform (24px board) and sink the player below it.
        self.max_fall_velocity = max_fall_velocity

    def update(self, dt: float):
        if self.use_gravity and not self.is_grounded:
            self.velocity.y += self.gravity * dt

        # Harden the fall: keep the "fall boost" feel but never let one frame
        # move further than the platform thickness (prevents tunneling).
        if self.velocity.y > self.max_fall_velocity:
            self.velocity.y = self.max_fall_velocity

        # Update position
        self.game_object.position.x += self.velocity.x * dt
        self.game_object.position.y += self.velocity.y * dt


class TextRenderer(Component):
    """Component that draws text on the screen (e.g. Score, Lives)."""
    def __init__(self, text="", font_size=24, color=(255, 255, 255), is_ui=False, shadow=None,
                 center_x=False, center_y=False):
        super().__init__()
        self.text = text
        self.font_size = font_size
        self.color = color
        self.is_ui = is_ui  # if is_ui=True it stays fixed on screen, independent of the camera
        self.shadow = shadow  # if (r,g,b) is given, the shadow is drawn under the text (readability)
        self.center_x = center_x  # centers its position horizontally
        self.center_y = center_y  # centers its position vertically
        self._font = None
        self._emoji_font = None

    def _get_emoji_font(self):
        """Returns a suitable system font for drawing colored emojis.

        First tries 'Segoe UI Emoji' (Windows' colored emoji font); if unavailable,
        pygame's built-in font. The colored emoji font natively draws most emojis
        (❤️ 🖤 🛡️ ⚡ ⏳ 🧲 🚀 ...); the built-in font may not render emojis in color
        (it falls back to drawing). Returns None if no font is found.
        """
        for name in ("segoeuiemoji", "segoe ui emoji", "seguiemj"):
            try:
                f = pygame.font.SysFont(name, self.font_size)
                if f is not None:
                    return f
            except Exception:
                continue
        return None

    def start(self):
        self._font = pygame.font.SysFont("Arial", self.font_size, bold=True)
        self._emoji_font = self._get_emoji_font()

    @staticmethod
    def _is_emoji_char(ch):
        """Whether a character is a real emoji (should be drawn in color).

        Turkish and Latin characters (ß ü ö ç ğ ı ş... all below 0x2FF) are not
        counted as emojis -> they are drawn with Arial. Known emoji code points:
          - 0x1F000-0x1FAFF  (pictograms: 🧲 🔱 🛡️ 🖤 🚀 ...)
          - 0x2600-0x27BF    (symbols: ⚡ ❤ ☀ ...)
          - 0x2300-0x23FF    (technical: ⏳ ⌛ ...)
          - 0x2B00-0x2BFF    (arrows/symbols)
          - 0xFE0F variation selector + 0x200D joiner (emoji sequences)
        """
        o = ord(ch)
        return (0x1F000 <= o <= 0x1FAFF or 0x2600 <= o <= 0x27BF
                or 0x2300 <= o <= 0x23FF or 0x2B00 <= o <= 0x2BFF
                or o in (0xFE0F, 0x200D))

    def _render_complex(self, color=None):
        """Renders text, drawing only the emoji parts (if any) with the emoji font.

        Each character is sorted into a normal (Arial) or emoji source; adjacent
        characters of the same kind are grouped into a single segment, drawn with
        its own font and stitched side by side. This way Turkish characters
        (ş, ğ, ü, ı...) never fall into Segoe UI Emoji's empty-box glyphs and the
        HUD emojis stay colored.
        """
        if not self._font:
            self._font = pygame.font.SysFont("Arial", self.font_size, bold=True)
        if self._emoji_font is None:
            self._emoji_font = self._get_emoji_font()
        col = color if color is not None else self.color
        if self._emoji_font is None or not self.text:
            return self._font.render(self.text, True, col)
        segments, buf, cur_is_emoji = [], "", None
        for ch in self.text:
            is_emoji = self._is_emoji_char(ch)
            if cur_is_emoji is None:
                cur_is_emoji = is_emoji
            if is_emoji != cur_is_emoji:
                segments.append((buf, cur_is_emoji))
                buf, cur_is_emoji = "", is_emoji
            buf += ch
        segments.append((buf, cur_is_emoji))
        total_w = sum(self._emoji_font.size(s)[0] if e else self._font.size(s)[0]
                      for s, e in segments)
        max_h = max(self._emoji_font.get_height(), self._font.get_height())
        out = pygame.Surface((total_w, max_h), pygame.SRCALPHA)
        x = 0
        for s, e in segments:
            f = self._emoji_font if e else self._font
            surf = f.render(s, True, col)
            out.blit(surf, (x, 0))
            x += surf.get_width()
        return out

    def draw(self, surface: pygame.Surface, camera_offset: Vector2):
        text_surf = self._render_complex()
        if self.is_ui:
            sx, sy = int(self.game_object.position.x), int(self.game_object.position.y)
        else:
            sx = int(self.game_object.position.x - camera_offset.x)
            sy = int(self.game_object.position.y - camera_offset.y)
        tw, th = text_surf.get_size()
        if self.center_x:
            sx -= tw // 2
        if self.center_y:
            sy -= th // 2
        if self.shadow:
            sh = self._render_complex(self.shadow)
            surface.blit(sh, (sx + 2, sy + 2))
        surface.blit(text_surf, (sx, sy))


class BouncePad(Component):
    """Trampoline / Spring component that launches the character skyward."""
    def __init__(self, bounce_force=850.0):
        super().__init__()
        self.bounce_force = bounce_force

    def on_collision(self, other):
        if other.tag == "Player":
            rb = other.get_component(Rigidbody2D)
            if rb:
                rb.velocity.y = -self.bounce_force
                rb.is_grounded = False
                # Don't let variable jump cut-off interrupt the trampoline launch
                for c in other.components:
                    if hasattr(c, "_bounce_timer"):
                        c._bounce_timer = 0.18
                        break
                from .audio import SoundFX
                SoundFX.play("jump")
                from .particles import ParticleEmitter
                pe = other.get_component(ParticleEmitter)
                if pe:
                    pe.burst(count=16, color=(80, 255, 140), speed_range=(80, 200), size_range=(3, 6), lifespan_range=(0.3, 0.6), origin_offset=(16, 28))


class Health(Component):
    """Health, damage taking and temporary invulnerability (i-frames) component."""
    def __init__(self, max_hp=3, is_player=False, on_death=None, iframe_duration=1.2):
        super().__init__()
        self.max_hp = max_hp
        self.current_hp = max_hp
        self.is_player = is_player
        self.on_death = on_death
        self.iframe_duration = iframe_duration  # i-frame duration (seconds)
        self.invulnerable_timer = 0.0
        self.flash_timer = 0.0

    def take_damage(self, amount=1, iframe=None):
        if self.invulnerable_timer > 0:
            return False  # invulnerability is active

        self.current_hp -= amount
        from .audio import SoundFX
        from .particles import ParticleEmitter

        if self.is_player:
            # i-frame duration: customizable depending on the calling (game) source;
            # e.g. boss hits are a bit longer (breathing room against multiple hits).
            self.invulnerable_timer = iframe if iframe is not None else self.iframe_duration
            SoundFX.play("hurt")
            # Red vignette flash: sense of impact (camera gradient). Scene-space effect.
            try:
                from .core import Engine
                sc = getattr(Engine.instance, "active_scene", None)
                if sc is not None and hasattr(sc, "flash"):
                    sc.flash(0.55)
            except Exception:
                pass  # noqa: bilinçli
        else:
            # On an enemy/boss hit: punchy shake + a strong hit sound
            SoundFX.play("boss_hit" if getattr(self.game_object, "tag", "") == "Boss" else "hit")
            self._shake(0.18 if getattr(self.game_object, "tag", "") == "Boss" else 0.12)

        pe = self.game_object.get_component(ParticleEmitter)
        if pe:
            pe.burst(count=15, color=(255, 60, 60), speed_range=(60, 160), size_range=(3, 6), lifespan_range=(0.2, 0.5))

        if self.current_hp <= 0:
            self.current_hp = 0
            if self.is_player:
                self._shake(0.7)  # big shake when the player dies
            if self.on_death:
                self.on_death()
            elif not self.is_player:
                # Enemy death: shattering explosion + strong screen shake
                self._death_burst()
                self.game_object.active = False
                SoundFX.play("explosion")

        return True

    def _death_burst(self):
        """Shattering effects on enemy death: multi-colored particle burst + shake."""
        try:
            from .core import Engine
            from .game_object import GameObject
            from .particles import ParticleEmitter
            self._shake(0.2)
            eng = Engine.instance
            if not eng or not eng.active_scene:
                return
            scene = eng.active_scene
            pos = self.game_object.position
            center = (pos.x + self.game_object.size.x / 2, pos.y + self.game_object.size.y / 2)
            # Angry/glowing color scale: attach particles to a temporary object without a collider.
            # The object stays active so the emitter keeps updating; `_AutoRemove` cleans up once particles end.
            for color in ((255, 80, 60), (255, 180, 40), (255, 255, 255)):
                em = GameObject(f"_deathfx_{color[0]}", x=pos.x, y=pos.y,
                                width=self.game_object.size.x, height=self.game_object.size.y)
                emitter = em.add_component(ParticleEmitter())
                em.add_component(_AutoRemove())
                scene.add_object(em)
                emitter.burst(count=14, color=color, speed_range=(60, 240), size_range=(3, 7),
                              lifespan_range=(0.4, 0.8), gravity=120.0, origin_offset=center)
        except Exception:
            pass  # noqa: bilinçli

    def _shake(self, amount: float):
        """Adds screen shake (trauma) to the active scene."""
        try:
            from .core import Engine
            eng = Engine.instance
            if eng and eng.active_scene:
                eng.active_scene.add_shake(amount)
        except Exception:
            pass  # noqa: bilinçli

    def update(self, dt: float):
        if self.invulnerable_timer > 0:
            self.invulnerable_timer -= dt
            self.flash_timer += dt

    def is_invulnerable(self):
        return self.invulnerable_timer > 0


class Projectile(Component):
    """Movement, particle trail and damage logic for fired projectiles."""
    def __init__(self, direction: Vector2, speed=520.0, damage=25, is_enemy_bullet=False, lifespan=2.0):
        super().__init__()
        self.direction = direction.normalize()
        self.speed = speed
        self.damage = damage
        self.is_enemy_bullet = is_enemy_bullet
        self.lifespan = lifespan

    def update(self, dt: float):
        self.lifespan -= dt
        if self.lifespan <= 0:
            self.game_object.active = False
            return

        # Time slow: enemy bullets (is_enemy_bullet) slow down; player bullets are unaffected
        move_dt = _slow_dt(dt) if self.is_enemy_bullet else dt

        self.game_object.position.x += self.direction.x * self.speed * move_dt
        self.game_object.position.y += self.direction.y * self.speed * move_dt

        # Light particle trail behind the bullet
        from .particles import ParticleEmitter
        pe = self.game_object.get_component(ParticleEmitter)
        import random
        if pe and random.random() < 0.4:
            col = (255, 120, 50) if self.is_enemy_bullet else (100, 220, 255)
            pe.burst(count=1, color=col, speed_range=(5, 20), size_range=(2, 4), lifespan_range=(0.15, 0.3), gravity=0)

    def on_collision(self, other):
        if not self.game_object.active:
            return

        from .particles import ParticleEmitter
        from .audio import SoundFX

        # 1. Player bullet hits an Enemy or Boss
        if not self.is_enemy_bullet and (other.tag == "Enemy" or other.tag == "Boss") and other.active:
            self.game_object.active = False
            # Shield boss: takes no damage while its shield is intact (the player must break it first).
            # The engine looks for any component with a 'shield_intact()' method without knowing
            # the game-specific ShieldBoss type (keeps the engine-game separation intact).
            for comp in other.components:
                if hasattr(comp, "shield_intact") and comp.shield_intact():
                    return
            hp = other.get_component(Health)
            if hp:
                hp.take_damage(self.damage)
            else:
                other.active = False
                SoundFX.play("hit")

        # 2. Enemy bullet hits the Player
        elif self.is_enemy_bullet and other.tag == "Player" and other.active:
            hp = other.get_component(Health)
            if hp and not hp.is_invulnerable():
                self.game_object.active = False
                hp.take_damage(1)

        # 3. Breakable platform: a player bullet breaks it, an enemy bullet passes through
        elif other.tag == "Breakable":
            if not self.is_enemy_bullet:
                self.game_object.active = False
                bp = other.get_component(BreakablePlatform)
                if bp:
                    bp.hits += 1
                    if bp.hits >= bp.hits_to_break:
                        bp.smash()

        # 4. Hits the ground or a wall
        elif other.tag == "Ground":
            self.game_object.active = False
            pe = self.game_object.get_component(ParticleEmitter)
            if pe:
                pe.burst(count=6, color=(200, 220, 240), speed_range=(30, 80), size_range=(2, 4), lifespan_range=(0.15, 0.3))


class PowerUp(Component):
    """Object that grants the character temporary super powers (Magnet, Triple Shot, Shield, Speed)."""
    def __init__(self, power_type="magnet", duration=8.0):
        super().__init__()
        self.power_type = power_type  # 'magnet', 'triple', 'shield', 'speed'
        self.duration = duration

    def on_collision(self, other):
        if other.tag == "Player" and self.game_object.active:
            self.game_object.active = False
            from .audio import SoundFX
            from .particles import ParticleEmitter
            SoundFX.play_powerup(self.power_type)
            pe = other.get_component(ParticleEmitter)
            if pe:
                pe.burst(count=25, color=(120, 255, 230), speed_range=(60, 180), size_range=(3, 6), lifespan_range=(0.4, 0.8))
            
            # Pass the power to the player controller
            for comp in other.components:
                if hasattr(comp, "apply_powerup"):
                    comp.apply_powerup(self.power_type, self.duration)


class BreakablePlatform(Component):
    """Breakable solid platform.

    The player can stand on it (behaves like solid ground, BoxCollider is_trigger=False).
    A player bullet breaks it (particles + sound + it deactivates). Enemy/boss bullets
    pass THROUGH it (shield logic: a boss's own attack does not hit its shield).

    Also, it does not break on normal collision (against the player's body, with a
    Rigidbody2D) — only a bullet fired by the player breaks it. So it is safe to stand on.
    """
    def __init__(self, hits_to_break=1):
        super().__init__()
        self.hits_to_break = hits_to_break
        self.hits = 0

    def smash(self):
        """Breaks the platform: particles + sound + deactivates it. Safe to call multiple times."""
        if not self.game_object or not self.game_object.active:
            return
        self.game_object.active = False
        from .audio import SoundFX
        from .particles import ParticleEmitter
        SoundFX.play("break")
        pe = self.game_object.get_component(ParticleEmitter)
        if pe:
            pe.burst(count=16, color=(200, 210, 230), speed_range=(40, 140),
                     size_range=(3, 7), lifespan_range=(0.4, 0.9), gravity=500)
        eng = _EngineRef()
        if eng and eng.active_scene:
            eng.active_scene.add_shake(0.12)


def _EngineRef():
    from .core import Engine
    return Engine.instance


class _AutoRemove(Component):
    """Removes the parent object from the scene by itself once its ParticleEmitter is empty."""
    def __init__(self):
        super().__init__()

    def update(self, dt: float):
        try:
            from .particles import ParticleEmitter
            from .core import Engine
            emitter = self.game_object.get_component(ParticleEmitter)
            if emitter is None or len(emitter.particles) == 0:
                eng = Engine.instance
                if eng and eng.active_scene and self.game_object in eng.active_scene.game_objects:
                    eng.active_scene.game_objects.remove(self.game_object)
        except Exception:
            pass  # noqa: bilinçli


class SpawnIn(Component):
    """Spawn telegraph / delay.

    When an object (enemy etc.) first appears it BLINKS for ~duration seconds
    (between bright and base colors) and is treated as 'harmless' during this time —
    i.e. enemies do not wake up/react during it. So the player can see a threat
    spawning and is never instantly hit (prevents ambushes).

    `_wake_up` (main.py) checks this component to suppress reactions during the spawn
    without being game-dependent; here only the visual blink is managed.
    """
    def __init__(self, duration=0.6, shorten_nearby=True, shorten_radius=220.0):
        super().__init__()
        self.duration = duration
        self.timer = 0.0
        self._sprite = None
        self._base_color = (255, 255, 255)
        self._shorten_nearby = shorten_nearby
        self._shorten_radius = shorten_radius

    @property
    def done(self) -> bool:
        """Is the spawn animation done? (the object can now go into harmful/awake state)"""
        return self.timer >= self.duration

    def start(self):
        self._sprite = self.game_object.get_component(SpriteRenderer)
        if self._sprite:
            self._base_color = tuple(self._sprite.color)

    def update(self, dt: float):
        step = dt
        # If the player is nearby, speed up the spawn telegraph (a long telegraph is
        # unnecessary; if the player is right there, finish it 3x faster so the
        # enemy can wake up sooner).
        if self._shorten_nearby and not self.done:
            scene = getattr(_EngineRef(), "active_scene", None)
            if scene is not None:
                player = scene.find_by_tag("Player")
                if player is not None and player.active:
                    if abs(player.position.x - self.game_object.position.x) <= self._shorten_radius:
                        step = dt * 3.0
        self.timer += step
        if not self._sprite:
            return
        if self.done:
            # Animation done -> restore the base color just in case
            self._sprite.color = self._base_color
            return
        # Blinking: toggles between bright/base every ~0.15s (clearly visible but quick)
        blink = (int(self.timer * 7) % 2) == 0
        if blink:
            self._sprite.color = tuple(min(255, c + 45) for c in self._base_color)
        else:
            self._sprite.color = tuple(max(20, c - 25) for c in self._base_color)