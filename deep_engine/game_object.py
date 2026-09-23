import pygame
from .math2d import Vector2
from .components import Component

class GameObject:
    """The base object for everything in the game world (Character, Ground, Enemy, Score)."""
    def __init__(self, name="GameObject", x=0.0, y=0.0, width=32.0, height=32.0, tag="Default"):
        self.name = name
        self.tag = tag
        self.position = Vector2(x, y)
        self.size = Vector2(width, height)
        self.active = True
        self.components = []
        self._started = False

    def add_component(self, component: Component):
        """Adds a new capability/feature (Component) to this object."""
        component.game_object = self
        self.components.append(component)
        if self._started:
            component.start()
        return component

    def get_component(self, comp_type):
        """Finds and returns the component of the given type on this object."""
        for comp in self.components:
            if isinstance(comp, comp_type):
                return comp
        return None

    def start(self):
        if not self._started:
            for comp in self.components:
                comp.start()
            self._started = True

    def update(self, dt: float):
        if not self.active:
            return
        for comp in self.components:
            comp.update(dt)

    def draw(self, surface: pygame.Surface, camera_offset: Vector2):
        if not self.active:
            return
        for comp in self.components:
            comp.draw(surface, camera_offset)

    def __repr__(self):
        return f"GameObject({self.name}, Tag={self.tag}, Pos={self.position})"
