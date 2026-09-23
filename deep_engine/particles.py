import pygame
import random
from .math2d import Vector2
from .components import Component

class Particle:
    """A single particle's position, velocity, color and lifetime data."""
    def __init__(self, x, y, vx, vy, color, size=4.0, lifespan=0.5, gravity=100.0):
        self.x = float(x)
        self.y = float(y)
        self.vx = float(vx)
        self.vy = float(vy)
        self.color = color
        self.initial_size = float(size)
        self.size = float(size)
        self.lifespan = float(lifespan)
        self.max_lifespan = float(lifespan)
        self.gravity = float(gravity)
        self.is_alive = True

    def update(self, dt: float):
        self.lifespan -= dt
        if self.lifespan <= 0:
            self.is_alive = False
            return

        self.vy += self.gravity * dt
        self.x += self.vx * dt
        self.y += self.vy * dt

        # Shrink the size as it ages
        progress = self.lifespan / self.max_lifespan
        self.size = max(0.5, self.initial_size * progress)

    def draw(self, surface: pygame.Surface, camera_offset: Vector2):
        if not self.is_alive or self.size <= 0:
            return
        sx = int(self.x - camera_offset.x)
        sy = int(self.y - camera_offset.y)
        
        # Skip drawing when off screen
        if -20 < sx < surface.get_width() + 20 and -20 < sy < surface.get_height() + 20:
            pygame.draw.circle(surface, self.color, (sx, sy), int(self.size))


class ParticleEmitter(Component):
    """Component that adds particle bursts (sparkles, dust, fireworks) to game objects."""
    def __init__(self):
        super().__init__()
        self.particles = []

    def burst(self, count=15, color=(255, 215, 0), speed_range=(40, 160), size_range=(3, 6), lifespan_range=(0.3, 0.7), gravity=120.0, origin_offset=(0, 0)):
        """Creates a one-off particle burst."""
        ox = self.game_object.position.x + origin_offset[0]
        oy = self.game_object.position.y + origin_offset[1]

        for _ in range(count):
            angle = random.uniform(0, 6.28318)  # 360 degrees
            speed = random.uniform(*speed_range)
            vx = math_cos(angle) * speed
            vy = math_sin(angle) * speed
            size = random.uniform(*size_range)
            lifespan = random.uniform(*lifespan_range)
            
            p = Particle(ox, oy, vx, vy, color, size, lifespan, gravity)
            self.particles.append(p)

    def update(self, dt: float):
        for p in self.particles:
            p.update(dt)
        self.particles = [p for p in self.particles if p.is_alive]

    def draw(self, surface: pygame.Surface, camera_offset: Vector2):
        for p in self.particles:
            p.draw(surface, camera_offset)


# Quick trigonometry helpers
import math
math_cos = math.cos
math_sin = math.sin
