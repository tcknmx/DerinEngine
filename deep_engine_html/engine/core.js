/* DerinEngine HTML — core (Vector2, Component, GameObject, Scene, Engine)
 * Saf tarayıcı JS; ek kütüphane yok. API, deep_engine (Python) ile birebir.
 * Yükleyen sayfa index.html, <script> etiketleri sırayla çalışır (file:// OK).
 */
var DE = DE || {};

/* --- Sürüm bilgisi (Python deep_engine/__init__.__version__ eşdeğeri) ------- */
DE.__version__ = "1.0.0";
DE.__engine_name__ = "DerinEngine HTML";

/* --- Rastgele (Python random ile uyumlu deterministik PRNG) -------------- */
DE._rng = {
    _next: (function () {
        let s = 0x9E3779B9;
        return function () {
            s |= 0; s = (s + 0x6D2B79F5) | 0;
            let t = Math.imul(s ^ (s >>> 15), 1 | s);
            t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    })(),
    seed(v) { this._s = v >>> 0; },
    uniform(a, b) { return a + (b - a) * this._next(); },
    rand() { return this._next(); },
};
DE._rng.seed(12345);

/* --- Vector2 (Python math2d.Vector2 ile aynı) --------------------------- */
DE.Vector2 = class Vector2 {
    constructor(x = 0, y = 0) {
        this.x = Number(x);
        this.y = Number(y);
    }
    add(o) { return new DE.Vector2(this.x + o.x, this.y + o.y); }
    sub(o) { return new DE.Vector2(this.x - o.x, this.y - o.y); }
    mul(s) { return new DE.Vector2(this.x * s, this.y * s); }
    div(s) { return s === 0 ? new DE.Vector2(0, 0) : new DE.Vector2(this.x / s, this.y / s); }
    length() { return Math.sqrt(this.x * this.x + this.y * this.y); }
    dot(o) { return this.x * o.x + this.y * o.y; }
    normalize() {
        const l = this.length();
        return l > 0 ? new DE.Vector2(this.x / l, this.y / l) : new DE.Vector2(0, 0);
    }
    clone() { return new DE.Vector2(this.x, this.y); }
}

/* --- Component ---------------------------------------------------------- */
DE.Component = class Component {
    constructor() {
        this.game_object = null;
        this.active = true;
    }
    start() {}
    update(dt) {}
    draw(ctx, camera_offset) {}
    on_collision(other) {}
}

DE._slow_dt = function (dt) {
    // Python components.py _slow_dt birebir: yalnızca motorun time-slow katmanı
    // aktifken yavaşlatır (Engine._time_slow_remaining/_factor). Oyun tarafında
    // düşmanlar/düşman mermileri bu fonksiyonu çağırır; oyuncu çağırmaz -> güç
    // çubuğu 'slow' yalnız düşman dünyasını yavaşlatır (Python davranışı).
    const eng = DE.Engine && DE.Engine.instance;
    if (eng && eng._time_slow_remaining > 0) {
        return dt * (eng._time_slow_factor || 0.4);
    }
    return dt;
}

/* --- GameObject --------------------------------------------------------- */
DE.GameObject = class GameObject {
    constructor(name = "GameObject", x = 0, y = 0, width = 32, height = 32, tag = "Default") {
        this.name = name;
        this.tag = tag;
        this.position = new DE.Vector2(x, y);
        this.size = new DE.Vector2(width, height);
        this.active = true;
        this.components = [];
        this._started = false;
        this.z_index = 0;
    }
    add_component(component) {
        component.game_object = this;
        this.components.push(component);
        if (this._started) component.start();
        return component;
    }
    get_component(comp_type) {
        for (const c of this.components) {
            if (c instanceof comp_type) return c;
        }
        return null;
    }
    start() {
        if (!this._started) {
            for (const c of this.components) c.start();
            this._started = true;
        }
    }
    update(dt) {
        if (!this.active) return;
        for (const c of this.components) c.update(dt);
    }
    draw(ctx, camera_offset) {
        if (!this.active) return;
        for (const c of this.components) c.draw(ctx, camera_offset);
    }
}

/* --- Scene -------------------------------------------------------------- */
DE.Scene = class Scene {
    constructor(name = "Scene", background_color = [20, 24, 40]) {
        this.name = name;
        this.background_color = background_color;
        this.active = true;
        this.game_objects = [];
        this._objects_to_add = [];
        this.camera_offset = new DE.Vector2(0, 0);
        this.camera_zoom = 1.0;
        this.time_scale = 1.0;
        this._shake_trauma = 0.0;
        this.camera_target = null;
        this.camera_manual = false;
        this.camera_position = new DE.Vector2(0, 0);
        this.camera_smoothness = 5.0;
        this.camera_kick = new DE.Vector2(0, 0);   // Python Scene.camera_kick (dash kamera zıplaması)

        // Kamera yakınlaştırma katmanı (Python scene.py V2.0 aynı): geniş açı ->
        // oyuna girişte yumuşak zoom-in + boss/patlama anlarında zoom punch'ı
        // (boss ölümü on_boss_death -> zoom_punch(1.18, 0.35) kullanır).
        this.camera_zoom_target = 1.0;   // 1.0 = normal; >1 = yakın; <1 = uzak/geniş
        this.zoom_smoothness = 3.0;      // hedefe yaklaşma hızı
        this._zoom_punch_timer = 0.0;    // punch'ın kalan saniyesi
        this._zoom_punch_base = 1.0;     // punch sonrası geri dönülecek hedef zoom

        // Vinyet (kenar karartması) + kırmızı isabet flaşı (Python Scene aynı).
        this.vignette_intensity = 0.22;  // 0..1 sürekli kenar karartması (oyunda hafif)
        this.hit_flash = 0.0;            // 0..1 anlık kırmızı isabet ramp'i
        this.screen_width = 900;
        this.screen_height = 600;
        this.parallax_background = null;
    }
    set_camera_target(obj) {
        this.camera_target = obj;
        return this;
    }
    add_object(obj) {
        this._objects_to_add.push(obj);
        return obj;
    }
    find_by_tag(tag) {
        for (const o of [...this.game_objects, ...this._objects_to_add]) {
            if (o.tag === tag) return o;
        }
        return null;
    }
    find_all_by_tag(tag) {
        return [...this.game_objects, ...this._objects_to_add].filter(o => o.tag === tag);
    }
    start() {
        const to_add = this._objects_to_add;
        this._objects_to_add = [];
        for (const o of to_add) {
            this.game_objects.push(o);
            o.start();
        }
    }
    add_shake(amount) {
        this._shake_trauma = Math.min(1.0, this._shake_trauma + amount);
    }
    kick_camera(x, y) {
        // Python Scene.kick_camera: geçici bir kamera 'poke' (dash vb. yönünde).
        this.camera_kick.x += x;
        this.camera_kick.y += y;
        return this;
    }
    set_vignette(v) {
        // Python Scene.set_vignette: kalıcı vinyet gücü (0..1).
        this.vignette_intensity = Math.max(0.0, Math.min(1.0, v));
    }
    flash(v) {
        // Python Scene.flash: kırmızı isabet flaşı (üst üste biner, zamanla söner).
        this.hit_flash = Math.min(1.0, Math.max(this.hit_flash, v));
    }
    zoom_to(target) {
        // Python Scene.zoom_to: kamerayı hedefe yumuşakça yaklaştırır / uzaklaştırır.
        this.camera_zoom_target = target;
    }
    zoom_punch(amount, duration = 0.25) {
        // Python Scene.zoom_punch: anlık etki yaklaştırması (boss vuruşu vb.).
        // Süre sonunda kamera normal hedefine geri döner.
        if (amount <= 0) return;
        this._zoom_punch_base = this.camera_zoom_target;
        this.camera_zoom_target = Math.min(2.0, this.camera_zoom_target * amount);
        this._zoom_punch_timer = duration;
    }
    update(dt) {
        const sim_dt = dt * this.time_scale;
        this.start();
        // Spatial grid (Python _handle_physics_and_collisions ile aynı yapı)
        const colliders = [];
        for (const o of this.game_objects) {
            if (!o.active) continue;
            const col = o.get_component(DE.BoxCollider) || o.get_component(DE.CircleCollider) || o.get_component(DE.PolygonCollider);
            if (col) colliders.push(col);
        }
        // GÜNCELLEME fazı (Rigidbody pozisyonu taşır). is_grounded burada SIFIRLANMAZ:
        // Python ile aynı — güncelleme fazı bir önceki karenin çözüm değerini okur,
        // kare sonunda Physics.resolve sıfırlar + yeniden hesaplar.
        for (const o of this.game_objects) o.update(sim_dt);

        // Çarpışma çiftleri: uniform grid (CELL=128), aynı hücrede overlap → on_collision
        const CELL = 128;
        const grid = {};
        for (let idx = 0; idx < colliders.length; idx++) {
            const col = colliders[idx];
            const r = col.get_aabb();
            const x0 = Math.floor(r.x / CELL), x1 = Math.floor((r.x + r.w) / CELL);
            const y0 = Math.floor(r.y / CELL), y1 = Math.floor((r.y + r.h) / CELL);
            for (let cx = x0; cx <= x1; cx++) {
                for (let cy = y0; cy <= y1; cy++) {
                    const key = cx + "," + cy;
                    if (!grid[key]) grid[key] = [];
                    grid[key].push([idx, col]);
                }
            }
        }
        const seen = new Set();
        for (const key in grid) {
            const bucket = grid[key];
            const n = bucket.length;
            for (let a = 0; a < n; a++) {
                const [ia, c1] = bucket[a];
                for (let b = a + 1; b < n; b++) {
                    const [ib, c2] = bucket[b];
                    const pair_key = ia < ib ? ia + "_" + ib : ib + "_" + ia;
                    if (seen.has(pair_key)) continue;
                    seen.add(pair_key);
                    if (!c1.overlap_check(c2)) continue;
                    // Trigger / normal çarpışma bildirimi (her iki yön)
                    for (const comp of c1.game_object.components) {
                        if (comp.on_collision) comp.on_collision(c2.game_object);
                    }
                    for (const comp of c2.game_object.components) {
                        if (comp.on_collision) comp.on_collision(c1.game_object);
                    }
                }
            }
        }

        if (DE.Physics) DE.Physics.resolve(this, sim_dt);

        // Kamera takibi (Python Scene._update_camera mantığı — sadeleştirilmiş)
        if (this.camera_target && !this.camera_manual) {
            let target_x = this.camera_target.position.x - this.screen_width / 2 + this.camera_target.size.x / 2;
            let target_y = this.camera_target.position.y - this.screen_height / 2 + this.camera_target.size.y / 2;
            const rb = this.camera_target.get_component(DE.Rigidbody2D);
            if (rb) {
                const look = Math.max(-1.0, Math.min(1.0, rb.velocity.x / 260.0)) * 70.0;
                target_x += look;
            }
            const alpha = Math.min(dt * this.camera_smoothness, 1.0);
            this.camera_position.x += (target_x - this.camera_position.x) * alpha;
            this.camera_position.y += (target_y - this.camera_position.y) * alpha;
        }
        // Kamera kick (Python _update_camera'da same): sıfırlanana kadar küçülür.
        if (this.camera_kick.x !== 0 || this.camera_kick.y !== 0) {
            this.camera_position.x += this.camera_kick.x;
            this.camera_position.y += this.camera_kick.y;
            const dec = Math.min(dt * 10.0, 1.0);
            this.camera_kick.x *= (1.0 - dec);
            this.camera_kick.y *= (1.0 - dec);
            if (Math.abs(this.camera_kick.x) < 0.05) this.camera_kick.x = 0;
            if (Math.abs(this.camera_kick.y) < 0.05) this.camera_kick.y = 0;
        }
        if (this._shake_trauma > 0.001) {
            const sh = this._shake_trauma * this._shake_trauma * 18.0;
            this._shake_trauma = Math.max(0, this._shake_trauma - dt * 1.4);
        }
        // Kamera zoom yumuşatması + punch geri sarması (Python scene.py aynı).
        if (this._zoom_punch_timer > 0.0) {
            this._zoom_punch_timer = Math.max(0.0, this._zoom_punch_timer - dt);
            if (this._zoom_punch_timer <= 0.0) {
                this.camera_zoom_target = this._zoom_punch_base;
            }
        }
        if (this.camera_zoom !== this.camera_zoom_target) {
            this.camera_zoom += (this.camera_zoom_target - this.camera_zoom) * Math.min(dt * this.zoom_smoothness, 1.0);
            if (Math.abs(this.camera_zoom - this.camera_zoom_target) < 0.002) {
                this.camera_zoom = this.camera_zoom_target;
            }
        }
        // Kırmızı isabet flaşı zamanla söner.
        if (this.hit_flash > 0.0) {
            this.hit_flash = Math.max(0.0, this.hit_flash - dt * 2.2);
        }
    }
    _is_ui_object(obj) {
        for (const c of obj.components) {
            if (c.is_ui) return true;
        }
        return false;
    }
    _draw_vignette(ctx) {
        // Kenar karartması + kırmızı isabet flaşı (Python _draw_vignette karşılığı).
        // Canvas gradyanı yoksa ya da boş dönerse (test stub'ları) sessizce atlanır.
        if (this.vignette_intensity <= 0.01 && this.hit_flash <= 0.01) return;
        if (typeof ctx.createRadialGradient !== "function") return;
        const w = ctx.canvas.width, h = ctx.canvas.height;
        const cx = w / 2, cy = h / 2;
        const maxR = Math.sqrt(cx * cx + cy * cy);
        if (this.vignette_intensity > 0.01) {
            const a = Math.min(1.0, this.vignette_intensity);
            const g = ctx.createRadialGradient(cx, cy, maxR * 0.5, cx, cy, maxR);
            if (g && typeof g.addColorStop === "function") {
                g.addColorStop(0, "rgba(0,0,0,0)");
                g.addColorStop(1, "rgba(0,0,0," + a.toFixed(3) + ")");
                ctx.fillStyle = g;
                ctx.fillRect(0, 0, w, h);
            }
        }
        if (this.hit_flash > 0.01) {
            const a = Math.min(1.0, this.hit_flash);
            const g = ctx.createRadialGradient(cx, cy, maxR * 0.3, cx, cy, maxR);
            if (g && typeof g.addColorStop === "function") {
                g.addColorStop(0, "rgba(255,40,30,0)");
                g.addColorStop(1, "rgba(255,40,30," + (a * 0.55).toFixed(3) + ")");
                ctx.fillStyle = g;
                ctx.fillRect(0, 0, w, h);
            }
        }
    }
    draw(ctx) {
        const zoom = this.camera_zoom;
        if (Math.abs(zoom - 1.0) < 0.001) {
            // Normal (zoomsuz) çizim — en yaygın yol, optimize (Python aynı).
            if (this.background_color) {
                ctx.fillStyle = `rgb(${this.background_color[0]},${this.background_color[1]},${this.background_color[2]})`;
                ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
            }
            if (this.parallax_background) {
                this.parallax_background.draw(ctx, ctx.canvas.width, ctx.canvas.height, this.camera_position);
            }
            const sorted = [...this.game_objects].sort((a, b) => a.z_index - b.z_index);
            for (const o of sorted) {
                if (!this._is_ui_object(o)) o.draw(ctx, this.camera_position);
            }
            // UI nesneleri en üstte, kameradan bağımsız (ekran uzayı)
            for (const o of sorted) {
                if (this._is_ui_object(o)) o.draw(ctx, new DE.Vector2(0, 0));
            }
            this._draw_vignette(ctx);
            return;
        }
        // Zoomlu çizim: dünya (UI hariç) kameranın merkezi çevresinde ölçeklenir;
        // UI nesneleri zoom'dan etkilenmez (Python scene.py aynı mantık).
        const w = ctx.canvas.width, h = ctx.canvas.height;
        ctx.save();
        if (this.background_color) {
            ctx.fillStyle = `rgb(${this.background_color[0]},${this.background_color[1]},${this.background_color[2]})`;
            ctx.fillRect(0, 0, w, h);
        }
        ctx.translate(w / 2, h / 2);
        ctx.scale(zoom, zoom);
        ctx.translate(-w / 2, -h / 2);
        if (this.parallax_background) {
            this.parallax_background.draw(ctx, w, h, this.camera_position);
        }
        const sorted = [...this.game_objects].sort((a, b) => a.z_index - b.z_index);
        for (const o of sorted) {
            if (!this._is_ui_object(o)) o.draw(ctx, this.camera_position);
        }
        ctx.restore();
        // UI nesneleri zoom'dan bağımsız ekran uzayında.
        for (const o of sorted) {
            if (this._is_ui_object(o)) o.draw(ctx, new DE.Vector2(0, 0));
        }
        this._draw_vignette(ctx);
    }
}

/* --- Engine ------------------------------------------------------------- */
DE.Engine = class Engine {
    constructor(canvas, title = "DerinEngine HTML", width = 900, height = 600, target_fps = 60) {
        DE.Engine.instance = this;
        this.canvas = canvas;
        this.ctx = canvas.getContext("2d");
        canvas.width = width;
        canvas.height = height;
        this.width = width;
        this.height = height;
        this.target_fps = target_fps;
        this.active_scene = null;
        this.is_running = false;
        this._last = 0;
        this._frame_count = 0;
        // Python Engine: bekleyen sahne değişimi + time-slow katmanı (sadece
        // düşman dünyasını yavaşlatır; DE._slow_dt okuyucusu).
        this._next_scene = null;
        this._time_slow_remaining = 0.0;
        this._time_slow_factor = 0.4;
    }
    set_scene(scene) {
        this.active_scene = scene;
        scene.start();
    }
    _frame(now) {
        const dt = Math.min(1 / 30, (now - (this._last || now)) / 1000);
        this._last = now;
        this._frame_count += 1;
        // Python Engine._frame: sahne değişimi bekleyen switch_scene varsa uygula.
        if (this._next_scene) {
            this.set_scene(this._next_scene);
            this._next_scene = null;
        }
        // Python Engine._frame: time-slow sayacını motorda erit (menü/ölümde bile akar).
        if (this._time_slow_remaining > 0) {
            this._time_slow_remaining = Math.max(0.0, this._time_slow_remaining - dt);
        }
        // Python Engine._frame -> Input._update_events eşdeğeri: kumanda durumunu
        // kare başında tazele (analog eksen/hat/buton kenar algılama).
        if (DE.Input && DE.Input.instance) DE.Input.instance.begin_frame();
        if (this.active_scene) {
            this.active_scene.update(dt);
            this.active_scene.draw(this.ctx);
        }
        // Python Engine._frame -> _handle_escape: ESC, aktif sahnenin on_escape
        // olayını tetikler (duraklatma overlay'i, menüde çıkış). on_escape yoksa
        // veya false dönerse oyun kapanır.
        const esc = (DE.Input && DE.Input.get_key_down) ? DE.Input.get_key_down("ESCAPE") : false;
        if (esc) {
            const sc = this.active_scene;
            if (sc && sc.on_escape) {
                if (sc.on_escape() === false) this.is_running = false;
            } else {
                this.is_running = false;
            }
        }
        // Python Engine._frame -> Input._update_events eşdeğeri: one-shot durumu
        // (get_key_down / get_mouse_button_down / get_mouse_scroll) her kare sonunda
        // sıfırlanır, böylece bir tuş basışı tam olarak bir kare görünür.
        if (DE.Input && DE.Input.instance) DE.Input.instance.end_frame();
    }
    run() {
        this.is_running = true;
        DE.Engine.instance = this;
        const step = (now) => {
            if (!this.is_running) return;
            this._frame(now);
            requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
    }
}

/* Python Engine.switch_scene classmethod karşılığı: herhangi bir yerden sahne
 * değiştirmeye izin verir (kare başında uygulanır — Python davranışı). */
DE.Engine.switch_scene = function (scene) {
    if (DE.Engine.instance) {
        DE.Engine.instance._next_scene = scene;
    }
}