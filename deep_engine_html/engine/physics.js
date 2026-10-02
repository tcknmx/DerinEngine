/* DerinEngine HTML — physics (BoxCollider, Rigidbody2D, collision)
 * BoxCollider: AABB kutu. is_trigger=True ise sadece bildirim tetikler,
 * engel değildir. one_way=True ise yalnız üstten durulabilir.
 * Rigidbody2D: yerçekimi + hız + max_fall (Python değerleriyle aynı mantık).
 * Çarpışma çözümü ScenePhys.presolve içinde (kare boyunca sondalama değil,
 * nüfuz geri itme: x önce, sonra y — klasik platformer).
 */

var DE = DE || {};

DE.Rect = class Rect {
    constructor(x, y, w, h) {
        this.x = x; this.y = y; this.w = w; this.h = h;
    }
    get right()  { return this.x + this.w; }
    get bottom() { return this.y + this.h; }
    get centery() { return this.y + this.h / 2; }
    get centerx() { return this.x + this.w / 2; }
    get top() { return this.y; }
    get left() { return this.x; }
    static of(go) { return new DE.Rect(go.position.x, go.position.y, go.size.x, go.size.y); }
    overlaps(o) {
        return this.x < o.right && this.right > o.x
            && this.y < o.bottom && this.bottom > o.y;
    }
}

DE.BoxCollider = class BoxCollider extends DE.Component {
    constructor(is_trigger = false, one_way = false) {
        super();
        this.is_trigger = is_trigger;
        this.one_way = one_way;
        this.self = null;
        this.offset_x = 0;
        this.offset_y = 0;
    }
    rect() {
        const o = this.game_object;
        return new DE.Rect(o.position.x + this.offset_x, o.position.y + this.offset_y,
                           o.size.x, o.size.y);
    }
    get_rect() {
        const r = this.rect();
        return { x: Math.trunc(r.x), y: Math.trunc(r.y), w: Math.trunc(r.w), h: Math.trunc(r.h),
                 get right() { return this.x + this.w; }, get bottom() { return this.y + this.h; } };
    }
    get_aabb() { return this.rect(); }
    check_collision(other) {
        return this.rect().overlaps(other.rect());
    }
    _as_poly() {
        const o = this.game_object;
        const x = o.position.x, y = o.position.y, w = o.size.x, h = o.size.y;
        return [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
    }
    overlap_check(other) {
        const oaabb = other.get_aabb();
        const a = this.get_aabb();
        if (!(a.x < oaabb.x + oaabb.w && oaabb.x < a.x + a.w && a.y < oaabb.y + oaabb.h && oaabb.y < a.y + a.h)) {
            return false;
        }
        if (other instanceof DE.CircleCollider) {
            const c = other.get_center();
            const r = other.get_radius();
            const o = this.game_object;
            return DE.circle_aabb_overlap(c.x, c.y, r, o.position.x, o.position.y, o.size.x, o.size.y);
        }
        if (other instanceof DE.PolygonCollider) {
            return DE.polygons_overlap(this._as_poly(), other.get_world_points());
        }
        return this.check_collision(other);
    }
}

DE.CircleCollider = class CircleCollider extends DE.Component {
    constructor(is_trigger = false, radius = null) {
        super();
        this.is_trigger = is_trigger;
        this._radius = radius;   // null -> otomatik (nesne boyutundan)
    }
    get_radius() {
        if (this._radius !== null) return Number(this._radius);
        return Math.min(this.game_object.size.x, this.game_object.size.y) / 2.0;
    }
    get_center() {
        const o = this.game_object;
        return new DE.Vector2(o.position.x + o.size.x / 2.0, o.position.y + o.size.y / 2.0);
    }
    get_aabb() {
        const c = this.get_center();
        const r = this.get_radius();
        return new DE.Rect(c.x - r, c.y - r, r * 2, r * 2);
    }
    check_collision(other) { return this.overlap_check(other); }
    overlap_check(other) {
        const oaabb = other.get_aabb();
        const a = this.get_aabb();
        if (!(a.x < oaabb.x + oaabb.w && oaabb.x < a.x + a.w && a.y < oaabb.y + oaabb.h && oaabb.y < a.y + a.h)) {
            return false;
        }
        const c = this.get_center();
        const r = this.get_radius();
        if (other instanceof DE.CircleCollider) {
            const oc = other.get_center();
            return DE.circle_circle_overlap(c.x, c.y, r, oc.x, oc.y, other.get_radius());
        }
        if (other instanceof DE.BoxCollider) {
            const o = other.game_object;
            return DE.circle_aabb_overlap(c.x, c.y, r, o.position.x, o.position.y, o.size.x, o.size.y);
        }
        if (other instanceof DE.PolygonCollider) {
            return DE.circle_polygon_overlap(c.x, c.y, r, other.get_world_points());
        }
        return false;
    }
}

DE.PolygonCollider = class PolygonCollider extends DE.Component {
    constructor(points = null, is_trigger = false, one_way = false) {
        super();
        this.is_trigger = is_trigger;
        this.one_way = one_way;
        this.points = (points || [[0, 0], [32, 0], [32, 32], [0, 32]]).map(p => [p[0], p[1]]);
    }
    get_world_points() {
        const o = this.game_object;
        const ox = o.position.x, oy = o.position.y;
        return this.points.map(([px, py]) => [ox + px, oy + py]);
    }
    get_aabb() {
        const pts = this.get_world_points();
        const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
        const x = Math.min(...xs), y = Math.min(...ys);
        return new DE.Rect(x, y, Math.max(...xs) - x, Math.max(...ys) - y);
    }
    check_collision(other) { return this.overlap_check(other); }
    overlap_check(other) {
        const oaabb = other.get_aabb();
        const a = this.get_aabb();
        if (!(a.x < oaabb.x + oaabb.w && oaabb.x < a.x + a.w && a.y < oaabb.y + oaabb.h && oaabb.y < a.y + a.h)) {
            return false;
        }
        const wp = this.get_world_points();
        if (other instanceof DE.PolygonCollider) {
            return DE.polygons_overlap(wp, other.get_world_points());
        }
        if (other instanceof DE.CircleCollider) {
            const c = other.get_center();
            return DE.circle_polygon_overlap(c.x, c.y, other.get_radius(), wp);
        }
        if (other instanceof DE.BoxCollider) {
            return DE.polygons_overlap(wp, other._as_poly());
        }
        return false;
    }
}

DE._collider_overlap = function (a, b) {
    return a.overlap_check(b);
}

DE.Rigidbody2D = class Rigidbody2D extends DE.Component {
    constructor(gravity = 980, use_gravity = true, max_fall_velocity = 1800) {
        super();
        this.velocity = new DE.Vector2(0, 0);
        this.gravity = gravity;
        this.use_gravity = use_gravity;
        this.max_fall_velocity = max_fall_velocity;
        this.is_grounded = false;
        this.collider = null;   // Rigidbody'nin kendi BoxCollider'ı (start'ta bulunur)
    }
    start() {
        this.collider = this.game_object.get_component(DE.BoxCollider);
    }
    update(dt) {
        if (this.use_gravity && !this.is_grounded) {
            this.velocity.y += this.gravity * dt;
        }
        if (this.velocity.y > this.max_fall_velocity) {
            this.velocity.y = this.max_fall_velocity;
        }
        this.game_object.position.x += this.velocity.x * dt;
        this.game_object.position.y += this.velocity.y * dt;
    }
}

/* --- Çarpışma çözümü ----------------------------------------------------
 * resolve_collisions(scene, dt): tüm katı collider'ları okur, her Rigidbody'yi
 * ayrı ayrı x ekseninde sonra y ekseninde iterek çözer. Trigger/one_way ayrımı.
 */
DE.Physics = class Physics {
    static _solid_colliders(scene) {
        const solids = [];
        for (const o of scene.game_objects) {
            if (!o.active) continue;
            const rb = o.get_component(DE.Rigidbody2D);
            const col = o.get_component(DE.BoxCollider) || o.get_component(DE.PolygonCollider) || o.get_component(DE.CircleCollider);
            if (col && !col.is_trigger && !rb) solids.push(col);
        }
        return solids;
    }
    static resolve(scene, dt) {
        const solids = DE.Physics._solid_colliders(scene);
        // Çözüm yalnızca BoxCollider solid'ler için (Python _resolve_solid_collision mantığı).
        // Polygon/Circle solid şimdilik sadece on_collision bildirir.
        for (const go of scene.game_objects) {
            if (!go.active) continue;
            const rb = go.get_component(DE.Rigidbody2D);
            if (!rb || !rb.collider) continue;
            rb.is_grounded = false;
            for (const s of solids) {
                if (s === rb.collider) continue;
                if (!(s instanceof DE.BoxCollider)) continue;
                const rect = rb.collider.get_aabb();
                const srect = s.get_aabb();
                if (!rect.overlaps(srect)) continue;

                // One-way platform: üstten gelirken durulur (Python one_way davranışı)
                if (s.one_way) {
                    if (rb.velocity.y >= 0 && (rect.bottom - srect.y) <= Math.max(4.0, srect.h + 6.0)) {
                        go.position.y = srect.y - go.size.y;
                        rb.velocity.y = 0;
                        rb.is_grounded = true;
                    } else if (rb.velocity.y >= 0 && rb.collider.get_aabb().centery < srect.centery) {
                        go.position.y = srect.y - go.size.y;
                        rb.velocity.y = 0;
                        rb.is_grounded = true;
                    }
                    continue;
                }

                const overlap_left = rect.right - srect.x;
                const overlap_right = srect.right - rect.x;
                const overlap_top = rect.bottom - srect.y;
                const overlap_bottom = srect.bottom - rect.y;
                const min_overlap = Math.min(overlap_left, overlap_right, overlap_top, overlap_bottom);

                if (min_overlap === overlap_top && rb.velocity.y >= 0) {
                    go.position.y = srect.y - go.size.y;
                    rb.velocity.y = 0;
                    rb.is_grounded = true;
                } else if (min_overlap === overlap_bottom && rb.velocity.y < 0) {
                    go.position.y = srect.bottom;
                    rb.velocity.y = 0;
                } else if (min_overlap === overlap_left) {
                    go.position.x = srect.x - go.size.x;
                    rb.velocity.x = 0;
                } else if (min_overlap === overlap_right) {
                    go.position.x = srect.right;
                    rb.velocity.x = 0;
                }
            }
        }
        DE.Physics._detect_ground(scene, solids);
    }

    /* Python scene.py "Stable ground detection" blogunun birebir JS karsiligi
     * (Python L286-305). OYUNCU BU OLMADAN "is_grounded" HEP FALSE KALIYOR:
     * yukaridaki itme kodu oyuncuyu platformdan tam DIŞARI ittiği için bir
     * sonraki karede çakışma yoktur -> `is_grounded` set edilmez. Python'da
     * bunu ayak probu (ayak altina 2px'lik dikdortgen) kurtarir: yalnizca
     * zemine DEGMEK yeterlidir, çakışma gerekmez. Yoksa zıplama yalnizca
     * 0.06s'lik coyote süresine bagli kalir, duvar kaymasi/iniş/toz
     * efektleri tetiklenmez -> "fizik Python kadar iyi degil". */
    static _detect_ground(scene, solids) {
        for (const obj of scene.game_objects) {
            const rb = obj.get_component(DE.Rigidbody2D);
            if (!rb || rb.is_grounded || rb.velocity.y < 0) continue;
            // Python: pygame.Rect(int(x+4), int(y+size.y), int(size.x-8), 2)
            const fx = Math.trunc(obj.position.x + 4);
            const fy = Math.trunc(obj.position.y + obj.size.y);
            const fw = Math.trunc(obj.size.x - 8);
            const fh = 2;
            const foot_right = fx + fw;
            const foot_bottom = fy + fh;
            for (const sc of solids) {
                if (sc instanceof DE.PolygonCollider) {
                    // Egim: zemin seviyesi poligonun YUZEYI (AABB tepesi degil),
                    // yoksa karakter rampa yerine gorunmez bir kutu kenarinda durur.
                    const surf = DE.Physics._polygon_surface_y(sc, fx + fw / 2);
                    if (surf !== null && fy <= surf + 3.0) {
                        rb.is_grounded = true;
                        rb.velocity.y = 0;
                        obj.position.y = surf - obj.size.y;
                        break;
                    }
                    continue;
                }
                if (!(sc instanceof DE.BoxCollider)) continue;
                const r = sc.get_aabb();
                if (fx >= r.right || foot_right <= r.x) continue;          // yatay kesisim yok
                if (fy >= r.bottom || foot_bottom <= r.y) continue;       // dikey kesisim yok
                rb.is_grounded = true;
                rb.velocity.y = 0;
                obj.position.y = r.y - obj.size.y;
                break;
            }
        }
    }

    /* Python _polygon_surface_y birebir: dunya uzayindaki cokgenin world-x
     * noktasindaki EN YUKSEK (en kucuk y) yuzey noktasi, yoksa None.
     * Dikey kenarlar yuzey sayilmaz (duvardir). */
    static _polygon_surface_y(poly, x) {
        const pts = poly.get_world_points ? poly.get_world_points() : null;
        if (!pts || !pts.length) return null;
        let best = null;
        for (let i = 0; i < pts.length; i++) {
            const ax = pts[i].x !== undefined ? pts[i].x : pts[i][0];
            const ay = pts[i].y !== undefined ? pts[i].y : pts[i][1];
            const j = (i + 1) % pts.length;
            const bx = pts[j].x !== undefined ? pts[j].x : pts[j][0];
            const by = pts[j].y !== undefined ? pts[j].y : pts[j][1];
            if (Math.abs(bx - ax) < 0.001) continue;
            if (Math.min(ax, bx) - 0.001 <= x && x <= Math.max(ax, bx) + 0.001) {
                const tt = (x - ax) / (bx - ax);
                const y = ay + tt * (by - ay);
                if (best === null || y < best) best = y;
            }
        }
        return best;
    }
}