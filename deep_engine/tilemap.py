import pygame
from .components import Component


class Tilemap(Component):
    """Grid-based tile map component (real tile layers, not free rects).

    A tile map is a grid of cells; each cell holds a tile *id*. A small tile set
    maps ids to drawable tiles (color + kind). Layers are stacked: layer 0 is the
    bottom, higher layers render on top (and later added layers cover earlier ones).

    Rendering is culled to the visible screen region, so huge maps stay fast.

    Usage:
        tm = obj.add_component(Tilemap(tile_size=32))
        tm.set_tile_set({0: None, 1: (80,200,80), 2: (140,140,140), 3: (210,180,40)})
        tm.add_layer([[...grid of ids...]])          # world styles
        tm.add_layer([[...overlay ids...]])          # drawn on top
        tm.place_at_world(x, y, tile_id, layer=0)    # edit a single cell

    The tile map itself is not a collider: attach a BoxCollider (or a custom
    per-tile collider builder in the game layer) on the same object when needed.
    """
    def __init__(self, tile_size=32, offset=(0, 0)):
        super().__init__()
        self.tile_size = tile_size
        self.offset = list(offset)          # world (x, y) of the grid's top-left
        self.tile_set = {}                  # tile id -> (r,g,b) color (or None = empty)
        self.layers = []                    # list of 2D grids (list of rows / row cells)

    # --- Grid access --------------------------------------------------------
    def add_layer(self, grid, z_index=0):
        """Adds a rendering layer on top of the previous ones (z_index keeps order)."""
        self.layers.append({"grid": grid, "z": z_index})
        self.layers.sort(key=lambda L: L["z"])
        return self

    def set_tile_set(self, tile_set):
        """Sets the `id -> color` mapping. `None` means the cell is empty (air)."""
        self.tile_set = dict(tile_set)
        return self

    @property
    def layers_count(self):
        return len(self.layers)

    def get_tile(self, layer, col, row):
        """Returns the tile id at the given grid cell (None when out of bounds)."""
        if layer < 0 or layer >= len(self.layers):
            return None
        grid = self.layers[layer]["grid"]
        if 0 <= row < len(grid) and 0 <= col < len(grid[row]):
            return grid[row][col]
        return None

    def set_tile(self, layer, col, row, tile_id):
        """Sets the tile id at a grid cell."""
        if layer < 0 or layer >= len(self.layers):
            return
        grid = self.layers[layer]["grid"]
        if 0 <= row < len(grid) and 0 <= col < len(grid[row]):
            grid[row][col] = tile_id

    def place_at_world(self, wx, wy, tile_id, layer=0):
        """Sets the tile at a WORLD position (so placing uses screen coords)."""
        col = int((wx - self.offset[0]) // self.tile_size)
        row = int((wy - self.offset[1]) // self.tile_size)
        self.set_tile(layer, col, row, tile_id)

    def solid_at(self, col, row, layer=-1):
        """True if the given cell holds a non-None tile (any layer by default)."""
        layers = range(len(self.layers)) if layer < 0 else [layer]
        for l in layers:
            if self.get_tile(l, col, row) is not None:
                return True
        return False

    # --- Rendering ----------------------------------------------------------
    def draw(self, surface: pygame.Surface, camera_offset):
        ts = self.tile_size
        ox, oy = self.offset[0], self.offset[1]
        cam_x, cam_y = camera_offset.x, camera_offset.y
        w, h = surface.get_size()
        # Visible cell range (culling: only draw the cells that reach the screen).
        col0 = max(0, int((cam_x - ox) // ts))
        row0 = max(0, int((cam_y - oy) // ts))
        col1 = int((cam_x + w - ox) // ts) + 1
        row1 = int((cam_y + h - oy) // ts) + 1
        for layer in self.layers:
            grid = layer["grid"]
            for row in range(row0, min(row1, len(grid))):
                cells = grid[row]
                for col in range(col0, min(col1, len(cells))):
                    tid = cells[col]
                    if tid is None:
                        continue
                    color = self.tile_set.get(tid)
                    if color is None:
                        continue
                    rect = pygame.Rect(int(ox + col * ts - cam_x),
                                       int(oy + row * ts - cam_y), ts, ts)
                    pygame.draw.rect(surface, color, rect)
                    if len(color) > 3:
                        # hints for a tile border already encoded in the tint
                        pass