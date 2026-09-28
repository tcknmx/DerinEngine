/* DerinEngine HTML — G2 birim testleri: math2d + collider'lar
 * Çalıştır: node deep_engine_html\test_math2d.js
 */
const fs = require("fs");
const path = require("path");
global.DE = {};
function load(name) {
    new Function("DE", "window", "document", "Image",
        fs.readFileSync(path.join(__dirname, "engine", name), "utf8"))(global.DE, global, undefined, undefined);
}
load("core.js");
load("math2d.js");
load("render.js");
load("physics.js");

let pass = 0, fail = 0;
function check(name, cond, extra) {
    if (cond) { pass++; console.log("  OK " + name + (extra ? "  [" + extra + "]" : "")); }
    else { fail++; console.log("  FAIL " + name + (extra ? "  [" + extra + "]" : "")); }
}

console.log("M1 Vector2:");
{
    const a = new DE.Vector2(3, 4);
    check("length 5", Math.abs(a.length() - 5) < 1e-9);
    check("normalize", Math.abs(a.normalize().x - 0.6) < 1e-9 && Math.abs(a.normalize().y - 0.8) < 1e-9);
    check("dot", Math.abs(a.dot(new DE.Vector2(1, 2)) - 11) < 1e-9);
    check("add vec", a.add(new DE.Vector2(1, 1)).x === 4 && a.add(new DE.Vector2(1, 1)).y === 5);
    check("mul", a.mul(2).x === 6 && a.mul(2).y === 8);
    check("div0", a.div(0).x === 0 && a.div(0).y === 0);
    check("derivative", a.derivative().x === -4 && a.derivative().y === 3);
}

console.log("M2 point_in_polygon:");
{
    const sq = [[0, 0], [10, 0], [10, 10], [0, 10]];
    check("icinde", DE.point_in_polygon(5, 5, sq) === true);
    check("disinda", DE.point_in_polygon(15, 5, sq) === false);
    const tri = [[0, 0], [10, 0], [5, 10]];
    check("ucgen icinde", DE.point_in_polygon(5, 3, tri) === true);
    check("ucgen disinda", DE.point_in_polygon(0, 5, tri) === false);
}

console.log("M3 segments_intersect:");
{
    check("kesisiyor", DE.segments_intersect(0, 0, 10, 10, 0, 10, 10, 0) === true);
    check("kesismiyor", DE.segments_intersect(0, 0, 10, 0, 0, 10, 10, 10) === false);
    check("uc nokta (touching)", DE.segments_intersect(0, 0, 10, 0, 5, 0, 5, 10) === true);
}

console.log("M4 SAT polygons_overlap + intersection:");
{
    const sq1 = [[0, 0], [10, 0], [10, 10], [0, 10]];
    const sq2 = [[5, 5], [15, 5], [15, 15], [5, 15]];
    check("karesi karesi overlap", DE.polygons_overlap(sq1, sq2) === true);
    const sq3 = [[20, 20], [30, 20], [30, 30], [20, 30]];
    check("ayri overlap yok", DE.polygons_overlap(sq1, sq3) === false);
    const inter = DE.polygon_intersection(sq1, sq2);
    check("penetration var", inter !== null && inter[0] > 0 && inter[0] < 10,
          inter ? "overlap=" + inter[0].toFixed(2) : "null");
    check("ayri penetration null", DE.polygon_intersection(sq1, sq3) === null);
}

console.log("M5 circle tests:");
{
    check("cc ic ice", DE.circle_circle_overlap(0, 0, 5, 1, 1, 5) === true);
    check("cc uzak", DE.circle_circle_overlap(0, 0, 5, 20, 0, 5) === false);
    const sq = [[0, 0], [10, 0], [10, 10], [0, 10]];
    check("cp icerde (merkez)", DE.circle_polygon_overlap(5, 5, 3, sq) === true);
    check("cp kenara yakin", DE.circle_polygon_overlap(11, 5, 2, sq) === true);
    check("cp uzak", DE.circle_polygon_overlap(20, 5, 2, sq) === false);
    check("aabb icinde", DE.circle_aabb_overlap(5, 5, 3, 0, 0, 10, 10) === true);
    check("aabb koselerden uzak", DE.circle_aabb_overlap(30, 30, 3, 0, 0, 10, 10) === false);
}

// --- Collider bileşenleri ---
function go(x, y, w, h) {
    const o = new DE.GameObject("c", x, y, w, h, "test");
    return o;
}

console.log("C1 BoxCollider:");
{
    const a = go(0, 0, 10, 10), b = go(5, 5, 10, 10), c = go(20, 20, 10, 10);
    const ca = a.add_component(new DE.BoxCollider(false, false));
    const cb = b.add_component(new DE.BoxCollider(false, false));
    const cc = c.add_component(new DE.BoxCollider(false, false));
    check("cakisan", ca.check_collision(cb) === true);
    check("ayri", ca.check_collision(cc) === false);
    check("overlap_check box-box", ca.overlap_check(cb) === true);
}

console.log("C2 CircleCollider:");
{
    const a = go(0, 0, 10, 10), b = go(8, 0, 10, 10), c = go(50, 0, 10, 10);
    const ca = a.add_component(new DE.CircleCollider());
    const cb = b.add_component(new DE.CircleCollider());
    const cc = c.add_component(new DE.CircleCollider());
    check("radius auto 5", Math.abs(ca.get_radius() - 5) < 1e-9);
    check("center", ca.get_center().x === 5 && ca.get_center().y === 5);
    check("circle-circle temas", ca.check_collision(cb) === true);
    check("circle-circle uzak", ca.check_collision(cc) === false);
    // circle vs box
    const boxo = go(4, 4, 10, 10);
    const box = boxo.add_component(new DE.BoxCollider());
    check("circle-box overlap", ca.overlap_check(box) === true);
}

console.log("C3 PolygonCollider:");
{
    const tri = go(0, 0, 10, 10);
    const pc = tri.add_component(new DE.PolygonCollider([[0, 0], [10, 0], [5, 10]]));
    check("world points", pc.get_world_points().length === 3
        && pc.get_world_points()[1][0] === 10);
    const boxo = go(5, 3, 5, 5);
    const box = boxo.add_component(new DE.BoxCollider());
    check("poly-box overlap", pc.overlap_check(box) === true);
    const far = go(200, 200, 5, 5);
    const farbox = far.add_component(new DE.BoxCollider());
    check("poly-box uzak", pc.overlap_check(farbox) === false);
    // polygon vs polygon
    const p2 = go(5, 5, 10, 10);
    const pc2 = p2.add_component(new DE.PolygonCollider([[0, 0], [10, 0], [10, 10]]));
    check("poly-poly overlap", pc.overlap_check(pc2) === true);
}

console.log("C4 _collider_overlap generic:");
{
    const a = go(0, 0, 10, 10).add_component(new DE.CircleCollider());
    const b = go(5, 5, 10, 10).add_component(new DE.CircleCollider());
    check("generic", DE._collider_overlap(a, b) === true);
}

console.log("\nSONUC: " + pass + " gecti, " + fail + " kaldi" + (fail === 0 ? " -> ALL OK" : ""));
process.exit(fail === 0 ? 0 : 1);