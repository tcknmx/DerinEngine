/* DerinEngine HTML — oynanış bileşenleri (G3)
 * Python deep_engine/components.py'den taşındı: Animator, KeyframeAnimator,
 * BouncePad, Health, Projectile, PowerUp, BreakablePlatform, _AutoRemove, SpawnIn.
 * Ses/partikül çağrıları DE.SoundFX / DE.ParticleEmitter üzerinden (ilgili modülde).
 */
var DE = DE || {};

/* --- Animator (renk frame animasyonu) ----------------------------------- */
DE.Animator = class Animator extends DE.Component {
    constructor(fps = 8) {
        super();
        this.fps = fps;
        this.states = {};        // ad -> renk frame listesi
        this._sprite = null;
        this._state = null;
        this._frames = [];
        this._frame = 0;
        this._timer = 0.0;
        this.loop = true;
        this.finished = false;
    }
    start() {
        this._sprite = this.game_object.get_component(DE.SpriteRenderer);
    }
    add_state(name, colors) {
        this.states[name] = colors.map(c => [...c]);
    }
    play(name, loop = true) {
        if (!this.states[name]) return;
        this._state = name;
        this._frames = this.states[name];
        this._frame = 0;
        this._timer = 0.0;
        this.loop = loop;
        this.finished = false;
        this._apply_frame();
    }
    set_frame(index) {
        if (this._frames.length) {
            this._frame = ((index % this._frames.length) + this._frames.length) % this._frames.length;
            this._apply_frame();
        }
    }
    stop() {
        this._state = null;
        this._timer = 0.0;
    }
    _apply_frame() {
        if (this._sprite && this._frames.length) {
            this._sprite.color = [...this._frames[this._frame]];
        }
    }
    update(dt) {
        if (!this._sprite || !this._frames || this.finished || !this._state) return;
        this._timer += dt;
        const frame_time = 1.0 / Math.max(1, this.fps);
        while (this._timer >= frame_time) {
            this._timer -= frame_time;
            this._frame += 1;
            if (this._frame >= this._frames.length) {
                if (this.loop) {
                    this._frame = 0;
                } else {
                    this._frame = this._frames.length - 1;
                    this.finished = true;
                    break;
                }
            }
            this._apply_frame();
        }
    }
}

/* --- KeyframeAnimator (özellik interpolasyonu) --------------------------- */
DE.KeyframeAnimator = class KeyframeAnimator extends DE.Component {
    constructor(loop = true, autoplay = false, fps = 60) {
        super();
        this.loop = loop;
        this.autoplay = autoplay;
        this.fps = fps;
        this.animations = {};     // path -> {nodes, ease, length}
        this._tracks = {};
        this._time = 0.0;
        this._playing = false;
    }
    _ease_fn(name) {
        return (DE.EASING && DE.EASING[name]) || DE.ease_linear || ((t) => t);
    }
    animate(attr_path, nodes, ease = "linear", duration = null) {
        const ordered = [...nodes].sort((a, b) => a[1] - b[1]);
        const total = duration !== null ? duration : ordered[ordered.length - 1][1];
        this.animations[attr_path] = {
            nodes: ordered, ease: ease, length: Math.max(total, 0.001),
        };
        this._tracks[attr_path] = { pos: 0.0, seg: 0, t: 0.0 };
        if (this.autoplay) this._playing = true;
        return this;
    }
    play() {
        this._time = 0.0;
        this._playing = true;
        this._tracks = {};
        for (const path in this.animations) this._tracks[path] = { pos: 0.0, seg: 0, t: 0.0 };
        return this;
    }
    pause() { this._playing = false; return this; }
    stop() { this._playing = false; this._time = 0.0; return this; }
    get playing() { return this._playing; }

    _get_path(obj, path) {
        const parts = path.split(".");
        const aliases = { sprite: DE.SpriteRenderer, animator: DE.Animator };
        let node = obj;
        if (parts.length && aliases[parts[0]]) {
            node = obj.get_component(aliases[parts[0]]);
            if (!node) return [null, null];
            parts.shift();
        }
        if (!parts.length) return [null, null];
        let cur = node;
        for (let i = 0; i < parts.length; i++) {
            if (cur[parts[i]] === undefined) return [null, null];
            if (i === parts.length - 1) return [cur, parts[i]];
            cur = cur[parts[i]];
        }
        return [cur, parts[parts.length - 1]];
    }
    _set_path(obj, path, value) {
        const [cur, name] = this._get_path(obj, path);
        if (cur) cur[name] = DE._mix_value !== undefined
            ? (Array.isArray(value) ? value.map(v => (typeof v === "object" && v !== null && !Array.isArray(v) ? { x: v.x, y: v.y } : v)) : value)
            : value;
    }
    update(dt) {
        if (!this._playing || !Object.keys(this.animations).length) return;
        this._time += dt;
        for (const path in this.animations) {
            const anim = this.animations[path];
            const nodes = anim.nodes;
            if (nodes.length < 2) continue;
            let seg = 0;
            for (let i = nodes.length - 2; i >= 0; i--) {
                if (this._time >= nodes[i][1]) { seg = i; break; }
            }
            const [a_val, a_time] = nodes[seg];
            const [b_val, b_time] = nodes[seg + 1];
            const span = Math.max(b_time - a_time, 0.001);
            const t = Math.min(1.0, Math.max(0.0, (this._time - a_time) / span));
            const eased = this._ease_fn(anim.ease)(t);
            const val = DE._mix_value(a_val, b_val, eased);
            this._set_path(this.game_object, path, val);
        }
        let max_t = 0.0;
        for (const path in this.animations) max_t = Math.max(max_t, this.animations[path].nodes[this.animations[path].nodes.length - 1][1]);
        if (this._time >= max_t) {
            if (this.loop) this._time -= max_t;
            else this._playing = false;
        }
    }
}

DE._mix_value = function (a, b, t) {
    // skaler, (x,y) Vector2 benzeri nesne veya renk dizisi
    if (typeof a === "number" && typeof b === "number") {
        return a + (b - a) * t;
    }
    if (Array.isArray(a) && Array.isArray(b) && a.length === b.length) {
        return a.map((av, i) => av + (b[i] - av) * t);
    }
    if (a && b && typeof a === "object" && typeof a.x === "number") {
        return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
    }
    return b;
}

/* --- BouncePad (trambolin) ---------------------------------------------- */
DE.BouncePad = class BouncePad extends DE.Component {
    constructor(bounce_force = 850.0) {
        super();
        this.bounce_force = bounce_force;
    }
    on_collision(other) {
        if (other.tag !== "Player") return;
        const rb = other.get_component(DE.Rigidbody2D);
        if (rb) {
            rb.velocity.y = -this.bounce_force;
            rb.is_grounded = false;
            for (const c of other.components) {
                if (c._bounce_timer !== undefined) { c._bounce_timer = 0.18; break; }
            }
            if (DE.SoundFX && DE.SoundFX.play) DE.SoundFX.play("jump");
            if (DE.ParticleEmitter) {
                const pe = other.get_component(DE.ParticleEmitter);
                if (pe) pe.burst(16, [80, 255, 140], [80, 200], [3, 6], [0.3, 0.6], 120, [16, 28]);
            }
        }
    }
}

/* --- Health -------------------------------------------------------------- */
DE.Health = class Health extends DE.Component {
    constructor(max_hp = 3, is_player = false, on_death = null, iframe_duration = 1.2) {
        super();
        this.max_hp = max_hp;
        this.current_hp = max_hp;
        this.is_player = is_player;
        this.on_death = on_death;
        this.iframe_duration = iframe_duration;
        this.invulnerable_timer = 0.0;
        this.flash_timer = 0.0;
    }
    take_damage(amount = 1, iframe = null) {
        if (this.invulnerable_timer > 0) return false;
        this.current_hp -= amount;
        if (this.is_player) {
            this.invulnerable_timer = (iframe !== null && iframe !== undefined) ? iframe : this.iframe_duration;
            // Python components.py:683-686: oyuncu hasarında kırmızı vinyet flaşı
            // (duruş/konum hissi) — JS'te yoktu (ORTA madde).
            const eng = DE.Engine.instance;
            const sc = eng ? eng.active_scene : null;
            if (sc && sc.flash) sc.flash(0.55);
        }
        if (DE.SoundFX && DE.SoundFX.play) {
            if (this.is_player) DE.SoundFX.play("hurt");
            else DE.SoundFX.play(this.game_object.tag === "Boss" ? "boss_hit" : "hit");
        }
        // Python components.py:689: sarsıntı YALNIZ düşman/boss hasarında
        // (oyuncuya gereksiz 0.12 sarsıntı JS ekleniyordu — ORTA madde).
        if (!this.is_player) this._shake(this.game_object.tag === "Boss" ? 0.18 : 0.12);
        const pe = this.game_object.get_component(DE.ParticleEmitter);
        if (pe) pe.burst(15, [255, 60, 60], [60, 160], [3, 6], [0.2, 0.5], 120, [0, 0]);
        if (this.current_hp <= 0) {
            this.current_hp = 0;
            if (this.is_player) this._shake(0.7);
            if (this.on_death) this.on_death();
            else if (!this.is_player) {
                this._death_burst();
                this.game_object.active = false;
                if (DE.SoundFX && DE.SoundFX.play) DE.SoundFX.play("explosion");
            }
        }
        return true;
    }
    _on_damage_hook() {
        return;
    }
    _death_burst() {
        // Partikül patlaması - üç renk katmanı (Python _death_burst birebir)
        this._shake(0.2);   // Python components.py:715: düşman ölümünde ekran sarsıntısı
        const scene = DE.Engine.instance ? DE.Engine.instance.active_scene : null;
        if (!scene) return;
        const o = this.game_object;
        for (const color of [[255, 80, 60], [255, 180, 40], [255, 255, 255]]) {
            const em = new DE.GameObject("_deathfx", o.position.x, o.position.y, o.size.x, o.size.y);
            const emitter = em.add_component(new DE.ParticleEmitter());
            em.add_component(new DE._AutoRemove());
            scene.add_object(em);
            emitter.burst(14, color, [60, 240], [3, 7], [0.4, 0.8], 120,
                          [o.size.x / 2, o.size.y / 2]);
        }
    }
    _shake(amount) {
        const eng = DE.Engine.instance;
        if (eng && eng.active_scene && eng.active_scene.add_shake) {
            eng.active_scene.add_shake(amount);
        }
    }
    update(dt) {
        if (this.invulnerable_timer > 0) {
            this.invulnerable_timer -= dt;
            this.flash_timer += dt;
        }
    }
    is_invulnerable() { return this.invulnerable_timer > 0; }
}

/* --- Projectile ---------------------------------------------------------- */
DE.Projectile = class Projectile extends DE.Component {
    constructor(direction, speed = 520.0, damage = 25, is_enemy_bullet = false, lifespan = 2.0) {
        super();
        this.direction = direction.normalize();
        this.speed = speed;
        this.damage = damage;
        this.is_enemy_bullet = is_enemy_bullet;
        this.lifespan = lifespan;
    }
    update(dt) {
        this.lifespan -= dt;
        if (this.lifespan <= 0) { this.game_object.active = false; return; }
        const move_dt = (this.is_enemy_bullet && DE._slow_dt) ? DE._slow_dt(dt) : dt;
        this.game_object.position.x += this.direction.x * this.speed * move_dt;
        this.game_object.position.y += this.direction.y * this.speed * move_dt;
        const pe = this.game_object.get_component(DE.ParticleEmitter);
        if (pe && DE._rng.uniform(0, 1) < 0.4) {
            const col = this.is_enemy_bullet ? [255, 120, 50] : [100, 220, 255];
            pe.burst(1, col, [5, 20], [2, 4], [0.15, 0.3], 0);
        }
    }
    on_collision(other) {
        if (!this.game_object.active) return;
        if (!this.is_enemy_bullet && (other.tag === "Enemy" || other.tag === "Boss") && other.active) {
            this.game_object.active = false;
            for (const comp of other.components) {
                if (comp.shield_intact && comp.shield_intact()) return;
            }
            const hp = other.get_component(DE.Health);
            if (hp) hp.take_damage(this.damage);
            else {
                other.active = false;
                if (DE.SoundFX && DE.SoundFX.play) DE.SoundFX.play("hit");
            }
        } else if (this.is_enemy_bullet && other.tag === "Player" && other.active) {
            const hp = other.get_component(DE.Health);
            if (hp && !hp.is_invulnerable()) {
                this.game_object.active = false;
                hp.take_damage(1);
            }
        } else if (other.tag === "Breakable") {
            if (!this.is_enemy_bullet) {
                this.game_object.active = false;
                const bp = other.get_component(DE.BreakablePlatform);
                if (bp) {
                    bp.hits += 1;
                    if (bp.hits >= bp.hits_to_break) bp.smash();
                }
            }
        } else if (other.tag === "Ground") {
            this.game_object.active = false;
            const pe = this.game_object.get_component(DE.ParticleEmitter);
            if (pe) pe.burst(6, [200, 220, 240], [30, 80], [2, 4], [0.15, 0.3], 120);
        }
    }
}

/* --- PowerUp -------------------------------------------------------------- */
DE.PowerUp = class PowerUp extends DE.Component {
    constructor(power_type = "magnet", duration = 8.0) {
        super();
        this.power_type = power_type;   // magnet | triple | shield | speed
        this.duration = duration;
    }
    on_collision(other) {
        if (other.tag !== "Player" || !this.game_object.active) return;
        this.game_object.active = false;
        if (DE.SoundFX && DE.SoundFX.play_powerup) DE.SoundFX.play_powerup(this.power_type);
        const pe = other.get_component(DE.ParticleEmitter);
        if (pe) pe.burst(25, [120, 255, 230], [60, 180], [3, 6], [0.4, 0.8], 120);
        for (const comp of other.components) {
            if (comp.apply_powerup) comp.apply_powerup(this.power_type, this.duration);
        }
    }
}

/* --- BreakablePlatform ---------------------------------------------------- */
DE.BreakablePlatform = class BreakablePlatform extends DE.Component {
    constructor(hits_to_break = 1) {
        super();
        this.hits_to_break = hits_to_break;
        this.hits = 0;
    }
    smash() {
        if (!this.game_object || !this.game_object.active) return;
        this.game_object.active = false;
        if (DE.SoundFX && DE.SoundFX.play) DE.SoundFX.play("break");
        const pe = this.game_object.get_component(DE.ParticleEmitter);
        if (pe) pe.burst(16, [200, 210, 230], [40, 140], [3, 7], [0.4, 0.9], 500);
        const eng = DE.Engine.instance;
        if (eng && eng.active_scene && eng.active_scene.add_shake) eng.active_scene.add_shake(0.12);
    }
}

/* --- _AutoRemove (partikülü bitince nesneyi kaldırır) --------------------- */
DE._AutoRemove = class _AutoRemove extends DE.Component {
    update(dt) {
        const emitter = this.game_object.get_component(DE.ParticleEmitter);
        const eng = DE.Engine.instance;
        if ((!emitter || emitter.particles.length === 0) && eng && eng.active_scene) {
            const list = eng.active_scene.game_objects;
            const i = list.indexOf(this.game_object);
            if (i !== -1) list.splice(i, 1);
        }
    }
}

/* --- SpawnIn (doğuş işareti / gecikme) ------------------------------------ */
DE.SpawnIn = class SpawnIn extends DE.Component {
    constructor(duration = 0.6, shorten_nearby = true, shorten_radius = 220.0) {
        super();
        this.duration = duration;
        this.timer = 0.0;
        this._sprite = null;
        this._base_color = [255, 255, 255];
        this._shorten_nearby = shorten_nearby;
        this._shorten_radius = shorten_radius;
    }
    get done() { return this.timer >= this.duration; }
    start() {
        this._sprite = this.game_object.get_component(DE.SpriteRenderer);
        if (this._sprite) this._base_color = [...this._sprite.color];
    }
    update(dt) {
        let step = dt;
        if (this._shorten_nearby && !this.done) {
            const eng = DE.Engine.instance;
            const scene = eng ? eng.active_scene : null;
            if (scene) {
                const player = scene.find_by_tag("Player");
                if (player && player.active &&
                    Math.abs(player.position.x - this.game_object.position.x) <= this._shorten_radius) {
                    step = dt * 3.0;
                }
            }
        }
        this.timer += step;
        if (!this._sprite) return;
        if (this.done) {
            this._sprite.color = [...this._base_color];
            return;
        }
        const blink = (Math.trunc(this.timer * 7) % 2) === 0;
        if (blink) this._sprite.color = this._base_color.map(c => Math.min(255, c + 45));
        else this._sprite.color = this._base_color.map(c => Math.max(20, c - 25));
    }
}