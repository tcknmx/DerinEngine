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

    def normalize(self):
        """Keeps the vector's direction and sets its length to 1 (unit vector)."""
        l = self.length()
        if l > 0:
            return Vector2(self.x / l, self.y / l)
        return Vector2(0, 0)

    def __repr__(self):
        return f"Vector2({self.x:.2f}, {self.y:.2f})"
