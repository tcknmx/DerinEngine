/* DerinEngine HTML — core (Vector2, Component, GameObject, Scene, Engine)
 * Saf tarayıcı JS; ek kütüphane yok. API, deep_engine (Python) ile birebir.
 * Yükleyen sayfa index.html, <script> etiketleri sırayla çalışır (file:// OK).
 */
var DE = DE || {};

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
        this.game_objects = [];
        this._objects_to_add = [];
        this.camera_offset = new DE.Vector2(0, 0);
        this.camera_zoom = 1.0;
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
    update(dt) {
        this.start();
        this._solid_colliders = [];
        for (const o of this.game_objects) {
            if (!o.active) continue;
            const col = o.get_component(DE.BoxCollider);
            if (col) this._solid_colliders.push(col);
        }
        for (const o of this.game_objects) o.update(dt);
        if (DE.Physics) DE.Physics.resolve(this, dt);
    }
    draw(ctx) {
        if (this.background_color) {
            ctx.fillStyle = `rgb(${this.background_color[0]},${this.background_color[1]},${this.background_color[2]})`;
            ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        }
        const sorted = [...this.game_objects].sort((a, b) => a.z_index - b.z_index);
        for (const o of sorted) o.draw(ctx, this.camera_offset);
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
    }
    set_scene(scene) {
        this.active_scene = scene;
        scene.start();
    }
    _frame(now) {
        if (!this.active_scene) return;
        const dt = Math.min(1 / 30, (now - (this._last || now)) / 1000);
        this._last = now;
        this._frame_count += 1;
        this.active_scene.update(dt);
        this.active_scene.draw(this.ctx);
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