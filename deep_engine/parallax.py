import math
import pygame
from .math2d import Vector2

class ParallaxLayer:
    """A single parallax background layer (different depth and speed)."""
    def __init__(self, speed_factor=0.2, color=(30, 40, 60), layer_type="mountains", height_range=(150, 300)):
        self.speed_factor = speed_factor
        self.color = color
        self.layer_type = layer_type
        self.height_range = height_range
        self.cached_surface = None
        self.cached_width = 2400

    def draw(self, surface: pygame.Surface, camera_offset: Vector2):
        w = surface.get_width()
        h = surface.get_height()

        # Layer scroll position relative to the camera (parallax effect)
        scroll_x = int(-camera_offset.x * self.speed_factor) % self.cached_width

        if self.layer_type == "stars":
            # Starry sky (very slowly moving bright dots)
            for i in range(50):
                sx = (i * 47 + scroll_x) % w
                sy = (i * 31) % int(h * 0.7)
                pygame.draw.circle(surface, (220, 235, 255), (sx, sy), 1 if i % 3 != 0 else 2)

        elif self.layer_type == "mountains":
            # Mountain silhouettes
            points = []
            points.append((0, h))
            step = 160
            for x in range(-step, w + step * 2, step):
                world_x = x - scroll_x
                # Produce mountain peak heights with mathematical waves
                peak_h = self.height_range[0] + (math.sin(world_x * 0.003) * 0.5 + 0.5) * (self.height_range[1] - self.height_range[0])
                points.append((x, int(h - peak_h)))
            points.append((w, h))

            if len(points) >= 3:
                pygame.draw.polygon(surface, self.color, points)

        elif self.layer_type == "hills":
            # Foreground hill layer
            points = []
            points.append((0, h))
            step = 100
            for x in range(-step, w + step * 2, step):
                world_x = x - scroll_x
                hill_h = self.height_range[0] + (math.sin(world_x * 0.006) * 0.5 + 0.5) * (self.height_range[1] - self.height_range[0])
                points.append((x, int(h - hill_h)))
            points.append((w, h))

            if len(points) >= 3:
                pygame.draw.polygon(surface, self.color, points)


class ParallaxBackground:
    """Multi-layer parallax background manager that gives a feel of 3D depth."""
    def __init__(self, theme="forest"):
        self.theme = theme
        self.layers = []
        self._stars = []          # shooting stars
        self._next_star = None    # when the next star appears (ms)
        self._setup_layers()

    def _setup_layers(self):
        if self.theme == "forest":
            # Forest theme: stars -> distant purple mountains -> misty green hills
            self.layers.append(ParallaxLayer(speed_factor=0.03, layer_type="stars"))
            self.layers.append(ParallaxLayer(speed_factor=0.10, color=(25, 32, 50), layer_type="mountains", height_range=(200, 360)))
            self.layers.append(ParallaxLayer(speed_factor=0.25, color=(30, 48, 70), layer_type="hills", height_range=(140, 240)))
        elif self.theme == "lava":
            # Lava cave: red volcanic sky -> dark basalt rocks -> glowing ember hills
            self.layers.append(ParallaxLayer(speed_factor=0.04, layer_type="stars"))
            self.layers.append(ParallaxLayer(speed_factor=0.12, color=(50, 18, 24), layer_type="mountains", height_range=(220, 380)))
            self.layers.append(ParallaxLayer(speed_factor=0.28, color=(70, 25, 32), layer_type="hills", height_range=(150, 260)))
        elif self.theme == "cave":
            # Dark cave: deep plum-colored mountains -> rocky hills (no stars)
            self.layers.append(ParallaxLayer(speed_factor=0.10, color=(24, 20, 34), layer_type="mountains", height_range=(260, 420)))
            self.layers.append(ParallaxLayer(speed_factor=0.24, color=(40, 34, 52), layer_type="hills", height_range=(170, 280)))
        elif self.theme == "ice":
            # Ice world: pale sky -> glacier mountains -> white hills
            self.layers.append(ParallaxLayer(speed_factor=0.04, layer_type="stars"))
            self.layers.append(ParallaxLayer(speed_factor=0.12, color=(150, 200, 235), layer_type="mountains", height_range=(200, 360)))
            self.layers.append(ParallaxLayer(speed_factor=0.26, color=(200, 235, 255), layer_type="hills", height_range=(150, 260)))
        elif self.theme == "desert":
            # Desert: warm sand-colored mountains -> orange-sand hills
            self.layers.append(ParallaxLayer(speed_factor=0.10, color=(120, 80, 40), layer_type="mountains", height_range=(220, 360)))
            self.layers.append(ParallaxLayer(speed_factor=0.24, color=(170, 120, 60), layer_type="hills", height_range=(150, 250)))
        elif self.theme == "astro":
            # Space: lots of stars -> purple distant planet mountains -> dark space hills
            for i in range(2):
                self.layers.append(ParallaxLayer(speed_factor=0.02 + i * 0.04, layer_type="stars"))
            self.layers.append(ParallaxLayer(speed_factor=0.12, color=(40, 30, 70), layer_type="mountains", height_range=(200, 360)))
            self.layers.append(ParallaxLayer(speed_factor=0.26, color=(25, 20, 50), layer_type="hills", height_range=(130, 230)))

    def draw(self, surface: pygame.Surface, camera_offset: Vector2):
        for layer in self.layers:
            layer.draw(surface, camera_offset)
        # Astro (final biome): draw cosmic bodies (planet + nebula) in deep space.
        # They drift very slowly with the camera -> depth feel, the player gazing at the sky.
        if self.theme == "astro":
            self._draw_cosmic(surface, camera_offset)
        self._update_shooting_stars(surface)

    def _draw_cosmic(self, surface: pygame.Surface, camera_offset: Vector2):
        """Draws cosmic elements (ringed planet, nebula clouds, bright star clusters)
        on the astro background. They scroll very slowly with the camera;
        positions are deterministic."""
        w, h = surface.get_width(), surface.get_height()
        # Very slow scroll (deep-space feel): speed ~0.02
        sx = -int(camera_offset.x * 0.02)

        # --- Nebula clouds (semi-transparent color blots) ---
        neb = pygame.Surface((w, h), pygame.SRCALPHA)
        for i in range(4):
            bx = ((i * 347 + sx) % (w + 400)) - 200
            by = (i * 173 + 40) % (h // 2)
            rad = 90 + (i % 3) * 40
            colors = [  # purple, blue, magenta, greenish space nebulas
                (120, 60, 200), (60, 120, 220), (200, 60, 160), (80, 200, 180)]
            col = colors[i % 4]
            for r in range(rad, 20, -8):
                a = int(26 * (1 - r / rad))
                pygame.draw.circle(neb, (*col, a), (bx, by), r)
        surface.blit(neb, (0, 0))

        # --- Sparkling star clusters ---
        for i in range(18):
            stx = (i * 211 + sx * 1.3) % w
            sty = (i * 89 + 30) % (h // 2)
            size = 1 if i % 3 else 2
            bright = 200 + (i % 3) * 20
            pygame.draw.circle(surface, (bright, bright, 255), (stx, sty), size)

        # --- Ringed planet (upper right, scrolls slowly with the camera) ---
        # modular scrolling keeps the camera drift deterministic
        px = int(w * 0.20 + (sx * 0.8) % (w + 400))
        py = int(h * 0.22)
        planet_r = 42
        pygame.draw.circle(surface, (150, 90, 220), (px, py), planet_r)
        pygame.draw.circle(surface, (190, 140, 250), (px - 12, py - 12), planet_r - 16)
        # Ring (ellipse)
        ring = pygame.Surface((planet_r * 3, planet_r), pygame.SRCALPHA)
        pygame.draw.ellipse(ring, (220, 170, 255, 130), ring.get_rect(), width=5)
        pygame.draw.ellipse(ring, (160, 110, 210, 90), ring.get_rect().inflate(-12, -12), width=3)
        surface.blit(ring, (px - planet_r * 3 // 2, py - planet_r // 2))
        # Draw the planet over the ring (so it looks embedded behind the ring)
        pygame.draw.circle(surface, (150, 90, 220), (px, py), planet_r)
        pygame.draw.circle(surface, (200, 160, 255), (px - 10, py - 10), planet_r - 18)

    def _update_shooting_stars(self, surface: pygame.Surface):
        """Draws the 'shooting star' effect streaking across the sky at intervals.

        V2.0: replaces the fireworks in the main menu — the player watches these
        shooting stars (like lightning) in the sky of the background level.
        """
        import random
        now = pygame.time.get_ticks()
        w, h = surface.get_width(), surface.get_height()

        if self._next_star is None:
            self._next_star = now + random.randint(800, 2200)
        if now >= self._next_star:
            # Spawn a new shooting star
            self._stars.append({
                "x": random.uniform(-60, w * 0.6),
                "y": random.uniform(0, h * 0.4),
                "vx": random.uniform(6, 12),
                "vy": random.uniform(2.5, 6),
                "born": now,
                "life": random.randint(700, 1300),
                "length": random.randint(16, 34),
            })
            self._next_star = now + random.randint(900, 2600)

        self._stars = [s for s in self._stars if (now - s["born"]) < s["life"]]
        for s in self._stars:
            age = now - s["born"]
            t = age / s["life"]
            frames = age / 16.0  # assume ~60 FPS
            x = s["x"] + s["vx"] * frames
            y = s["y"] + s["vy"] * frames
            # Brightness: bright at birth -> fades out at the end of its life
            fade = max(0.0, 1.0 - t)
            tx = int(230 * fade + 60 * (1 - fade))
            tail_len = int(s["length"] * (1.0 + t * 0.5))
            ex = int(x - s["vx"] * (tail_len / 16.0))
            ey = int(y - s["vy"] * (tail_len / 16.0))
            pygame.draw.line(surface, (tx, tx, 255 if fade > 0.75 else 220),
                             (ex, ey), (int(x), int(y)), 2)
            pygame.draw.circle(surface, (255, 255, 255), (int(x), int(y)), 2)
