/* DerinEngine HTML — scenemanager (SceneManager: adlandırılmış sahne kayıt defteri)
 * Python deep_engine/scenemanager.py portu.
 * - switch_to: estif yığınını temizleyip adı geçen sahneyi aktif yapar,
 * - push/pop: tek katmanlı overlay (duraklatma ekranları) — alttaki sahne buzlulur.
 */
var DE = DE || {};

DE.SceneManager = class SceneManager {
    constructor(engine = null) {
        this.engine = engine;          // attach(engine) ile sonra bağlanabilir
        this._scenes = {};
        this._stack = [];              // sahne adları sırası (üst = aktif)
        this._overlay_below = null;    // push() edilen overlay altında donduran sahne
    }
    attach(engine) {
        this.engine = engine;
        return this;
    }
    register(name, scene, switchScene = false) {
        this._scenes[name] = scene;
        if (switchScene) this.switch_to(name);
        return scene;
    }
    scene(name) {
        return this._scenes[name] || null;
    }
    has(name) {
        return Object.prototype.hasOwnProperty.call(this._scenes, name);
    }
    names() {
        return Object.keys(this._scenes);
    }
    switch_to(name) {
        const scene = this._scenes[name];
        if (!scene) throw new Error("SceneManager: kayitli sahne yok: '" + name + "'");
        this._stack = [name];
        this._overlay_below = null;
        if (this.engine) this.engine.set_scene(scene);
        return scene;
    }
    push(name) {
        const scene = this._scenes[name];
        if (!scene) throw new Error("SceneManager: kayitli sahne yok: '" + name + "'");
        if (this._stack.length && this._stack[this._stack.length - 1] === name) {
            return scene;  // aynı overlay'i iki kez istiflemeyelim
        }
        if (this.engine && this.engine.active_scene !== null) {
            if (this.engine.active_scene !== scene) {
                this.engine.active_scene.active = false;
            }
        }
        this._overlay_below = this.engine ? this.engine.active_scene : null;
        this._stack.push(name);
        if (this.engine) this.engine.set_scene(scene);
        return scene;
    }
    pop() {
        if (!this._stack.length) return null;
        this._stack.pop();
        const below = this._overlay_below;
        this._overlay_below = null;
        if (below !== null) {
            if (this.engine && this.engine.active_scene !== null) {
                this.engine.active_scene.active = false;
            }
            below.active = true;
            if (this.engine) this.engine.active_scene = below;
            return below;
        }
        if (this.engine) this.engine.active_scene.active = true;
        return null;
    }
    get below_scene() {
        return this._overlay_below;
    }
    get current_name() {
        return this._stack.length ? this._stack[this._stack.length - 1] : null;
    }
}