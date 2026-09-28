/* DerinEngine HTML — math2d (Vector2 + çarpışma yardımcıları)
 * Python deep_engine/math2d.py'nin birebir taşıması. Çokgenler dizi olarak
 * [ [x,y], [x,y], ... ] tutulur (tuple listesi). SAT: _polygon_axes + _project.
 */
var DE = DE || {};

DE.Vector2 = class Vector2 {
    constructor(x = 0.0, y = 0.0) {
        this.x = Number(x);
        this.y = Number(y);
    }
    static _is_v(o) { return o instanceof DE.Vector2; }

    add(other) {
        if (DE.Vector2._is_v(other)) return new DE.Vector2(this.x + other.x, this.y + other.y);
        return new DE.Vector2(this.x + other, this.y + other);
    }
    sub(other) {
        if (DE.Vector2._is_v(other)) return new DE.Vector2(this.x - other.x, this.y - other.y);
        return new DE.Vector2(this.x - other, this.y - other);
    }
    mul(scalar) { return new DE.Vector2(this.x * scalar, this.y * scalar); }
    div(scalar) {
        if (scalar === 0) return new DE.Vector2(0, 0);
        return new DE.Vector2(this.x / scalar, this.y / scalar);
    }
    length() { return Math.sqrt(this.x * this.x + this.y * this.y); }
    derivative() { return new DE.Vector2(-this.y, this.x); }
    dot(other) { return this.x * other.x + this.y * other.y; }
    normalize() {
        const l = this.length();
        if (l > 0) return new DE.Vector2(this.x / l, this.y / l);
        return new DE.Vector2(0, 0);
    }
    clone() { return new DE.Vector2(this.x, this.y); }
    set(x, y) { this.x = Number(x); this.y = Number(y); return this; }
}

DE.point_in_polygon = function (px, py, poly) {
    let inside = false;
    const n = poly.length;
    let j = n - 1;
    for (let i = 0; i < n; i++) {
        const [xi, yi] = poly[i];
        const [xj, yj] = poly[j];
        if (((yi > py) !== (yj > py)) && (px < (xj - xi) * (py - yi) / (yj - yi) + xi)) {
            inside = !inside;
        }
        j = i;
    }
    return inside;
}

DE._closest_point_on_segment = function (px, py, ax, ay, bx, by) {
    const abx = bx - ax, aby = by - ay;
    const apx = px - ax, apy = py - ay;
    const length2 = abx * abx + aby * aby;
    if (length2 <= 1e-12) return { x: ax, y: ay, t: 0.0 };
    const t = Math.max(0.0, Math.min(1.0, (apx * abx + apy * aby) / length2));
    return { x: ax + t * abx, y: ay + t * aby, t };
}

DE.point_segment_dist = function (px, py, ax, ay, bx, by) {
    const c = DE._closest_point_on_segment(px, py, ax, ay, bx, by);
    const dx = px - c.x, dy = py - c.y;
    return Math.sqrt(dx * dx + dy * dy);
}

function _ccw(o1, o2, o3) {
    return (o2[1] - o1[1]) * (o3[0] - o2[0]) - (o2[0] - o1[0]) * (o3[1] - o2[1]);
}
function _on_segment(a, b, p) {
    return (Math.min(a[0], b[0]) <= p[0] && p[0] <= Math.max(a[0], b[0])
            && Math.min(a[1], b[1]) <= p[1] && p[1] <= Math.max(a[1], b[1]));
}

DE.segments_intersect = function (ax, ay, bx, by, cx, cy, dx, dy) {
    const a = [ax, ay], b = [bx, by], c = [cx, cy], d = [dx, dy];
    const d1 = _ccw(c, d, a);
    const d2 = _ccw(c, d, b);
    const d3 = _ccw(a, b, c);
    const d4 = _ccw(a, b, d);
    const cross1 = ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0));
    const cross2 = ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
    if (cross1 && cross2) return true;
    const eps = 1e-9;
    if (Math.abs(d1) <= eps && _on_segment(c, d, a)) return true;
    if (Math.abs(d2) <= eps && _on_segment(c, d, b)) return true;
    if (Math.abs(d3) <= eps && _on_segment(a, b, c)) return true;
    if (Math.abs(d4) <= eps && _on_segment(a, b, d)) return true;
    return false;
}

DE._poly_edges = function* (poly) {
    const n = poly.length;
    for (let i = 0; i < n; i++) yield [poly[i], poly[(i + 1) % n]];
}

DE._polygon_axes = function (poly) {
    const axes = [];
    for (const [a, b] of DE._poly_edges(poly)) {
        const n = new DE.Vector2(-(b[1] - a[1]), (b[0] - a[0]));
        const l = n.length();
        if (l <= 1e-9) continue;
        const nn = n.div(l);
        if (!axes.some(ex => Math.abs(nn.x - ex.x) < 1e-6 && Math.abs(nn.y - ex.y) < 1e-6)) {
            axes.push(nn);
        }
    }
    return axes;
}

DE._project = function (axis, poly) {
    let mn = Infinity, mx = -Infinity;
    for (const [x, y] of poly) {
        const v = axis.x * x + axis.y * y;
        if (v < mn) mn = v;
        if (v > mx) mx = v;
    }
    return [mn, mx];
}

DE.polygons_overlap = function (poly1, poly2) {
    for (const axis of DE._polygon_axes(poly1).concat(DE._polygon_axes(poly2))) {
        const [a0, a1] = DE._project(axis, poly1);
        const [b0, b1] = DE._project(axis, poly2);
        if (a1 < b0 || b1 < a0) return false;
    }
    return true;
}

DE.polygon_intersection = function (poly1, poly2) {
    let min_overlap = null;
    let min_axis = null;
    for (const axis of DE._polygon_axes(poly1).concat(DE._polygon_axes(poly2))) {
        const [a0, a1] = DE._project(axis, poly1);
        const [b0, b1] = DE._project(axis, poly2);
        const overlap = Math.min(a1, b1) - Math.max(a0, b0);
        if (overlap < 0) return null;
        if (min_overlap === null || overlap < min_overlap) {
            min_overlap = overlap;
            min_axis = axis;
        }
    }
    return [min_overlap, min_axis];
}

DE.circle_circle_overlap = function (x1, y1, r1, x2, y2, r2) {
    const dx = x2 - x1, dy = y2 - y1;
    const rr = r1 + r2;
    return dx * dx + dy * dy <= rr * rr;
}

DE.circle_polygon_overlap = function (cx, cy, r, poly) {
    if (DE.point_in_polygon(cx, cy, poly)) return true;
    for (const [a, b] of DE._poly_edges(poly)) {
        if (DE.point_segment_dist(cx, cy, a[0], a[1], b[0], b[1]) <= r) return true;
    }
    return false;
}

DE.circle_aabb_overlap = function (cx, cy, r, x, y, w, h) {
    const nx = Math.max(x, Math.min(cx, x + w));
    const ny = Math.max(y, Math.min(cy, y + h));
    const dx = cx - nx, dy = cy - ny;
    return dx * dx + dy * dy <= r * r;
}