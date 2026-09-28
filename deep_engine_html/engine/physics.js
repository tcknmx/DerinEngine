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
        this.self = null;      // kendi Rect (her frame yenilenir)
        this.offset_x = 0;
        this.offset_y = 0;
    }
    rect() {
        const o = this.game_object;
        return new DE.Rect(o.position.x + this.offset_x, o.position.y + this.offset_y,
                           o.size.x, o.size.y);
    }
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
    static resolve(scene, dt) {
        const solids = scene._solid_colliders || [];
        for (const go of scene.game_objects) {
            if (!go.active) continue;
            const rb = go.get_component(DE.Rigidbody2D);
            if (!rb || !rb.collider) continue;
            rb.is_grounded = false;
            let rect = rb.collider.rect();
            for (const s of solids) {
                if (s === rb.collider) continue;
                if (s.is_trigger) continue;
                const srect = s.rect();
                if (!rect.overlaps(srect)) continue;
                // Nüfuz derinlikleri — hangi eksende daha az gömüldü?
                const dxL = rect.right - srect.x;      // soldan nüfuz
                const dxR = srect.right - rect.x;      // sağdan nüfuz
                const dyT = rect.bottom - srect.y;     // üstten nüfuz
                const dyB = srect.bottom - rect.y;     // alttan nüfuz
                const minX = Math.min(dxL, dxR);
                const minY = Math.min(dyT, dyB);

                if (s.one_way) {
                    // Yalnız üstten gelirken durulur, alttan serbest geçilir
                    if (rb.velocity.y > 0 && dyT <= dyB) {
                        go.position.y = srect.y - go.size.y;
                        rb.velocity.y = 0;
                        rb.is_grounded = true;
                    }
                    rect = rb.collider.rect();
                    continue;
                }

                if (minX < minY) {
                    // Yatay çarpışma (duvar) — az gömülen tarafa it
                    if (dxL < dxR) {
                        go.position.x = srect.x - go.size.x;
                    } else {
                        go.position.x = srect.right;
                    }
                    rb.velocity.x = 0;
                    rect = rb.collider.rect();
                } else {
                    // Dikey çarpışma (zemin/tavan)
                    if (dyT < dyB) {
                        go.position.y = srect.y - go.size.y;
                        rb.velocity.y = 0;
                        rb.is_grounded = true;
                    } else {
                        go.position.y = srect.bottom;
                        rb.velocity.y = 0;
                    }
                    rect = rb.collider.rect();
                }
            }
        }
    }
}