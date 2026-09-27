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
        # --- Scene tree (hierarchy) ---
        self.parent = None          # the GameObject this object is attached to
        self.children = []          # objects attached to this one
        self.z_index = 0            # manual render sort among siblings (higher = on top)

    # --- Hierarchy ----------------------------------------------------------
    def add_child(self, child: 'GameObject', local_offset=(0.0, 0.0)):
        """Attaches `child` to this object (scene tree / parent-child).

        The child stores its position in LOCAL coordinates (relative to the
        parent), so moving the parent moves the whole subtree automatically.
        `local_offset` is the child's position relative to the parent's top-left.
        """
        if child.parent is not None:
            child.parent.remove_child(child)
        child.parent = self
        child.position = Vector2(local_offset[0], local_offset[1])
        self.children.append(child)
        return child

    def remove_child(self, child: 'GameObject'):
        """Detaches `child` and turns its position back into world coordinates."""
        if child in self.children:
            self.children.remove(child)
            child.position = self.world_position(child)
            child.parent = None
        return child

    def find_child(self, name: str):
        """Finds a direct child (or descendant) by name."""
        for c in self.children:
            if c.name == name:
                return c
            found = c.find_child(name)
            if found:
                return found
        return None

    def world_position(self, obj=None) -> Vector2:
        """Returns the world (absolute) position of this object or of a child.

        Every node stores its position relative to its parent; summing the
        positions up the chain gives the absolute world position.
        """
        target = obj if obj is not None else self
        total = Vector2(target.position.x, target.position.y)
        node = target.parent
        while node is not None:
            total = Vector2(total.x + node.position.x, total.y + node.position.y)
            node = node.parent
        return total

    def _subtree_active(self) -> bool:
        """Recursively checks whether self and ALL ancestors are active."""
        node = self
        while node is not None:
            if not node.active:
                return False
            node = node.parent
        return True

    # --- Component API ------------------------------------------------------
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
        if not self._subtree_active():
            return
        for comp in self.components:
            comp.update(dt)
        for child in self.children:
            child.update(dt)

    def draw(self, surface: pygame.Surface, camera_offset: Vector2, origin=(0.0, 0.0)):
        """Draws this object and its children.

        `origin` is the accumulated parent-chain offset: a child stores its
        position in LOCAL coordinates, so drawing subtracts the parents' origin
        from the camera offset to place it at its real world position. The
        default origin=(0,0) keeps root objects (and all existing game code)
        behaving exactly as before.
        """
        if not self._subtree_active():
            return
        eff_cam = camera_offset - Vector2(origin[0], origin[1])
        for comp in self.components:
            comp.draw(surface, eff_cam)
        # Stable drawing order among children: default = insertion order,
        # but a manual z_index lets the user force a particular sibling on top.
        child_list = (self.children if not any(getattr(c, "z_index", 0) for c in self.children)
                      else sorted(self.children, key=lambda c: c.z_index))
        for child in child_list:
            child.draw(surface, camera_offset,
                       (origin[0] + self.position.x, origin[1] + self.position.y))

    def __repr__(self):
        return f"GameObject({self.name}, Tag={self.tag}, Pos={self.position})"
