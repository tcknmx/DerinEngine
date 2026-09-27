import math

class Vector2:
    """Vector class for position and velocity management in 2D space."""
    def __init__(self, x=0.0, y=0.0):
        self.x = float(x)
        self.y = float(y)

    def __add__(self, other):
        if isinstance(other, Vector2):
            return Vector2(self.x + other.x, self.y + other.y)
        return Vector2(self.x + other, self.y + other)

    def __sub__(self, other):
        if isinstance(other, Vector2):
            return Vector2(self.x - other.x, self.y - other.y)
        return Vector2(self.x - other, self.y - other)

    def __mul__(self, scalar):
        return Vector2(self.x * scalar, self.y * scalar)

    def __truediv__(self, scalar):
        if scalar == 0:
            return Vector2(0, 0)
        return Vector2(self.x / scalar, self.y / scalar)

    def length(self):
        """Computes the length (magnitude) of the vector."""
        return math.sqrt(self.x ** 2 + self.y ** 2)

    def derivative(self):
        return Vector2(-self.y, self.x)

    def dot(self, other):
        """Dot product of the two vectors."""
        return self.x * other.x + self.y * other.y

    def normalize(self):
        """Keeps the vector's direction and sets its length to 1 (unit vector)."""
        l = self.length()
        if l > 0:
            return Vector2(self.x / l, self.y / l)
        return Vector2(0, 0)

    def __repr__(self):
        return f"Vector2({self.x:.2f}, {self.y:.2f})"


def point_in_polygon(px, py, poly):
    """Whether a point is inside a convex or concave polygon (ray-casting)."""
    inside = False
    n = len(poly)
    j = n - 1
    for i in range(n):
        xi, yi = poly[i]
        xj, yj = poly[j]
        if ((yi > py) != (yj > py)) and (px < (xj - xi) * (py - yi) / (yj - yi) + xi):
            inside = not inside
        j = i
    return inside


def _closest_point_on_segment(px, py, ax, ay, bx, by):
    """Closest point on segment AB to point P, returned as (x, y, t)."""
    abx, aby = bx - ax, by - ay
    apx, apy = px - ax, py - ay
    length2 = abx * abx + aby * aby
    if length2 <= 1e-12:
        return ax, ay, 0.0
    t = max(0.0, min(1.0, (apx * abx + apy * aby) / length2))
    return ax + t * abx, ay + t * aby, t


def point_segment_dist(px, py, ax, ay, bx, by):
    """Distance from a point to a segment (used for circle-vs-polygon tests)."""
    cx, cy, _ = _closest_point_on_segment(px, py, ax, ay, bx, by)
    dx, dy = px - cx, py - cy
    return math.sqrt(dx * dx + dy * dy)


def segments_intersect(ax, ay, bx, by, cx, cy, dx, dy):
    """Whether segment AB intersects segment CD (includes touching endpoints)."""
    def _ccw(o1, o2, o3):
        return (o2[1] - o1[1]) * (o3[0] - o2[0]) - (o2[0] - o1[0]) * (o3[1] - o2[1])
    a, b, c, d = (ax, ay), (bx, by), (cx, cy), (dx, dy)
    d1 = _ccw(c, d, a)
    d2 = _ccw(c, d, b)
    d3 = _ccw(a, b, c)
    d4 = _ccw(a, b, d)
    cross1 = ((d1 > 0 and d2 < 0) or (d1 < 0 and d2 > 0))
    cross2 = ((d3 > 0 and d4 < 0) or (d3 < 0 and d4 > 0))
    if cross1 and cross2:
        return True
    eps = 1e-9
    if abs(d1) <= eps and _on_segment(c, d, a):
        return True
    if abs(d2) <= eps and _on_segment(c, d, b):
        return True
    if abs(d3) <= eps and _on_segment(a, b, c):
        return True
    if abs(d4) <= eps and _on_segment(a, b, d):
        return True
    return False


def _on_segment(a, b, p):
    return (min(a[0], b[0]) <= p[0] <= max(a[0], b[0])
            and min(a[1], b[1]) <= p[1] <= max(a[1], b[1]))


def _poly_edges(poly):
    n = len(poly)
    for i in range(n):
        yield poly[i], poly[(i + 1) % n]


def _polygon_axes(poly):
    """Unique edge normals (SAT separating axes) of a polygon."""
    axes = []
    for a, b in _poly_edges(poly):
        n = Vector2(-(b[1] - a[1]), (b[0] - a[0]))
        l = n.length()
        if l <= 1e-9:
            continue
        n = n / l
        if not any(abs(n.x - ex.x) < 1e-6 and abs(n.y - ex.y) < 1e-6 for ex in axes):
            axes.append(n)
    return axes


def _project(axis, poly):
    """Min/max scalar projection of all vertices onto an axis."""
    mn = float("inf")
    mx = float("-inf")
    for x, y in poly:
        v = axis.x * x + axis.y * y
        if v < mn:
            mn = v
        if v > mx:
            mx = v
    return mn, mx


def polygons_overlap(poly1, poly2):
    """Separating-Axis-Theorem test for two convex polygons -> bool overlap."""
    for axis in _polygon_axes(poly1) + _polygon_axes(poly2):
        a0, a1 = _project(axis, poly1)
        b0, b1 = _project(axis, poly2)
        if a1 < b0 or b1 < a0:
            return False
    return True


def polygon_intersection(poly1, poly2):
    """Returns the penetration vector (dx, dy) to push poly2 out of poly1, or None."""
    min_overlap = None
    min_axis = None
    for axis in _polygon_axes(poly1) + _polygon_axes(poly2):
        a0, a1 = _project(axis, poly1)
        b0, b1 = _project(axis, poly2)
        overlap = min(a1, b1) - max(a0, b0)
        if overlap < 0:
            return None
        if min_overlap is None or overlap < min_overlap:
            min_overlap = overlap
            min_axis = axis
    return min_overlap, min_axis


def circle_circle_overlap(x1, y1, r1, x2, y2, r2):
    dx = x2 - x1
    dy = y2 - y1
    rr = r1 + r2
    return dx * dx + dy * dy <= rr * rr


def circle_polygon_overlap(cx, cy, r, poly):
    """Whether a circle overlaps a polygon (vertex-in + edge-distance tests)."""
    if point_in_polygon(cx, cy, poly):
        return True
    for a, b in _poly_edges(poly):
        if point_segment_dist(cx, cy, a[0], a[1], b[0], b[1]) <= r:
            return True
    return False


def circle_aabb_overlap(cx, cy, r, x, y, w, h):
    """Whether a circle overlaps an axis-aligned box (closest-point test)."""
    nx = max(x, min(cx, x + w))
    ny = max(y, min(cy, y + h))
    dx = cx - nx
    dy = cy - ny
    return dx * dx + dy * dy <= r * r
