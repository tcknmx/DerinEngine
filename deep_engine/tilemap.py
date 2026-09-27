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

    The tile map is fully serializable through to_data()/from_data() and can
    export its solid cells as boundary line segments via to_segments() -- the
    bridge toward runtime/edit-time geometry (.map) tooling.
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

    # --- Data layer (JSON-compatible serialization / geometry export) --------
    def to_data(self) -> dict:
        """Serializes the tile map into a plain dict (JSON-safe).

        Keys: `tile_size`, `offset`, `tile_set` (ids as strings; a tile entry is
        `None` for air or a [r,g,b] color) and `layers` (each layer a list of
        rows, each row a list of ids). No engine/game classes leak into the data.
        """
        tile_set = {}
        for tid, color in self.tile_set.items():
            if color is None:
                tile_set[str(tid)] = None
            elif isinstance(color, (tuple, list)) and len(color) >= 3:
                tile_set[str(tid)] = list(color[:3])
        return {
            "tile_size": self.tile_size,
            "offset": [self.offset[0], self.offset[1]],
            "tile_set": tile_set,
            "layers": [
                {"z": layer["z"], "grid": [list(row) for row in layer["grid"]]}
                for layer in self.layers
            ],
        }

    @classmethod
    def from_data(cls, data: dict) -> "Tilemap":
        """Rebuilds a Tilemap from a `to_data()` dict (colors re-tupled)."""
        tm = cls(tile_size=data.get("tile_size", 32))
        tm.offset = list(data.get("offset", (0, 0)))
        tile_set = {}
        for key, color in data.get("tile_set", {}).items():
            tile_set[int(key)] = tuple(color) if isinstance(color, (tuple, list)) else None
        tm.set_tile_set(tile_set)
        for layer in data.get("layers", []):
            tm.add_layer([list(row) for row in layer["grid"]], z_index=layer.get("z", 0))
        return tm

    def to_segments(self, layer=-1) -> list:
        """Exports solid cells as boundary line segments (world-space polygons).

        For every solid cell, its four edges are emitted as `((x1,y1),(x2,y2))`
        tuples UNLESS the neighbouring cell in that direction is also solid (shared
        inner edges are culled). The result is the map's outline as connected
        line segments -- a first-class `geometry` representation usable by the
        runtime, physics re-checks or .map-style editors. Uses the bottom layer
        (layer=-1) or a specific layer.
        """
        ts = self.tile_size
        ox, oy = self.offset[0], self.offset[1]
        spans = range(len(self.layers)) if layer < 0 else [layer]
        rows = len(self.layers[spans[0]]["grid"]) if self.layers else 0
        cols = len(self.layers[spans[0]]["grid"][0]) if rows else 0

        def _filled(l, c, r):
            """A cell is filled only if it has an actual drawable color (mirrors draw())."""
            tid = self.get_tile(l, c, r)
            return tid is not None and self.tile_set.get(tid) is not None

        solid = [[[any(_filled(l, c, r) for l in spans)] for c in range(cols)]
                 for r in range(rows)]
        segments = []
        for r in range(rows):
            for c in range(cols):
                if not any(solid[r][c]):
                    continue
                x0 = ox + c * ts
                y0 = oy + r * ts
                edges = [
                    ((x0, y0), (x0 + ts, y0)),           # top
                    ((x0 + ts, y0), (x0 + ts, y0 + ts)), # right
                    ((x0, y0 + ts), (x0 + ts, y0 + ts)), # bottom
                    ((x0, y0), (x0, y0 + ts)),           # left
                ]
                neighbours = [
                    (r - 1, c),  # top
                    (r, c + 1),  # right
                    (r + 1, c),  # bottom
                    (r, c - 1),  # left
                ]
                for edge, (nr, nc) in zip(edges, neighbours):
                    if 0 <= nr < rows and 0 <= nc < cols and any(solid[nr][nc]):
                        continue  # inner edge shared with a solid neighbour
                    segments.append(edge)
        return segments

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