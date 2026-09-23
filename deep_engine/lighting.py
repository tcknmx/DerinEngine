import math
import pygame
from .math2d import Vector2
from .components import Component

class LightSource(Component):
    """Component that emits a colored, circular, glowing light from game objects."""
    def __init__(self, radius=120, color=(100, 200, 255), intensity=1.0, pulsing=False, pulse_speed=3.0, pulse_amount=15.0, offset=(16, 16)):
        super().__init__()
        self.base_radius = float(radius)
        self.current_radius = float(radius)
        self.color = color
        self.intensity = float(intensity)
        self.pulsing = pulsing
        self.pulse_speed = pulse_speed
        self.pulse_amount = pulse_amount
        self.offset = offset
        self.time = 0.0

    def update(self, dt: float):
        if self.pulsing:
            self.time += dt
            self.current_radius = self.base_radius + math.sin(self.time * self.pulse_speed) * self.pulse_amount


class LightingEngine:
    """2D dynamic lighting and dark atmosphere manager."""
    _light_masks = {}

    def __init__(self, ambient_darkness=130):
        self.ambient_darkness = ambient_darkness  # 0: bright, 255: pitch dark
        self.darkness_surface = None

    @classmethod
    def _get_radial_light_mask(cls, radius, color, intensity=1.0) -> pygame.Surface:
        """Caches the soft circular light mask in memory (for high FPS)."""
        radius = max(10, int(radius))
        key = (radius, color, int(intensity * 10))
        if key in cls._light_masks:
            return cls._light_masks[key]

        size = radius * 2
        surface = pygame.Surface((size, size), pygame.SRCALPHA)

        # Soft light gradient fading from the center outward
        for r in range(radius, 0, -3):
            alpha = int(255 * (1.0 - (r / radius) ** 1.3) * intensity)
            alpha = max(0, min(255, alpha))
            col = (*color, alpha)
            pygame.draw.circle(surface, col, (radius, radius), r)

        cls._light_masks[key] = surface
        return surface

    def render_lights(self, target_surface: pygame.Surface, scene, camera_offset: Vector2):
        if self.ambient_darkness <= 0:
            return

        w = target_surface.get_width()
        h = target_surface.get_height()

        if not self.darkness_surface or self.darkness_surface.get_size() != (w, h):
            self.darkness_surface = pygame.Surface((w, h), pygame.SRCALPHA)

        # 1. Fill with ambient darkness
        self.darkness_surface.fill((10, 12, 18, self.ambient_darkness))

        # 2. Gather all light sources in the scene and punch through the darkness
        for obj in scene.game_objects:
            if not obj.active:
                continue
            light = obj.get_component(LightSource)
            if light:
                mask = self._get_radial_light_mask(light.current_radius, light.color, light.intensity)
                lx = int(obj.position.x + light.offset[0] - light.current_radius - camera_offset.x)
                ly = int(obj.position.y + light.offset[1] - light.current_radius - camera_offset.y)

                # If on screen, carve the light into the darkness surface (BLEND_RGBA_SUB)
                if -light.current_radius * 2 < lx < w + 100 and -light.current_radius * 2 < ly < h + 100:
                    self.darkness_surface.blit(mask, (lx, ly), special_flags=pygame.BLEND_RGBA_SUB)

        # 3. Blit the darkness surface onto the main screen
        target_surface.blit(self.darkness_surface, (0, 0))
