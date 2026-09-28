/* DerinEngine HTML — tween (easing + Tween + TweenComponent + zincir)
 * Python deep_engine/tween.py birebir portu. Motor-bağımsız; herhangi bir
 * nesnenin numerik özelliğini zamana bağlı yumuşak değiştirir.
 */
var DE = DE || {};

/* --- Easing fonksiyonları (t: 0..1 -> çıktı) ----------------------------- */
DE.ease_linear = function (t) { return Math.min(1.0, Math.max(0.0, t)); };
DE.ease_in = function (t) { t = Math.min(1.0, Math.max(0.0, t)); return t * t; };
DE.ease_out = function (t) {
    t = Math.min(1.0, Math.max(0.0, t));
    return 1.0 - (1.0 - t) * (1.0 - t);
};
DE.ease_in_out = function (t) {
    t = Math.min(1.0, Math.max(0.0, t));
    if (t < 0.5) return 2.0 * t * t;
    return 1.0 - ((-2.0 * t + 2.0) ** 2) / 2.0;
};
DE.ease_in_cubic = function (t) { t = Math.min(1.0, Math.max(0.0, t)); return t * t * t; };
DE.ease_out_cubic = function (t) {
    t = Math.min(1.0, Math.max(0.0, t));
    return 1.0 - (1.0 - t) ** 3;
};
DE.ease_out_bounce = function (t) {
    t = Math.min(1.0, Math.max(0.0, t));
    const n1 = 7.5625, d1 = 2.75;
    if (t < 1.0 / d1) return n1 * t * t;
    else if (t < 2.0 / d1) { t -= 1.5 / d1; return n1 * t * t + 0.75; }
    else if (t < 2.5 / d1) { t -= 2.25 / d1; return n1 * t * t + 0.9375; }
    t -= 2.625 / d1;
    return n1 * t * t + 0.984375;
};
DE.ease_out_elastic = function (t) {
    t = Math.min(1.0, Math.max(0.0, t));
    const c4 = (2.0 * Math.PI) / 3.0;
    if (t === 0 || t === 1) return t;
    return 2 ** (-10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1.0;
};
DE.ease_out_back = function (t) {
    t = Math.min(1.0, Math.max(0.0, t));
    const c1 = 1.70158, c3 = 2.70158;
    return 1.0 + c3 * (t - 1.0) ** 3 + c1 * (t - 1.0) ** 2;
};

DE.EASING = {
    "linear": DE.ease_linear,
    "in": DE.ease_in,
    "out": DE.ease_out,
    "in_out": DE.ease_in_out,
    "in_cubic": DE.ease_in_cubic,
    "out_cubic": DE.ease_out_cubic,
    "out_bounce": DE.ease_out_bounce,
    "out_elastic": DE.ease_out_elastic,
    "out_back": DE.ease_out_back,
};

DE._get_easing = function (ease) {
    if (typeof ease === "function") return ease;
    return DE.EASING[ease] || DE.ease_linear;
};

/* --- Değer karıştırma (float / Vector2 / renk) --------------------------- */
DE._mix_tween = function (start, end, t) {
    // Vector2 nesnesi (x,y) — in-place güncelleme için yeni obje DÖNMEZ,
    // Python _mix ile aynı şekilde yeni bir Vector2 döndürür.
    if (end instanceof DE.Vector2) {
        return new DE.Vector2(
            start.x + (end.x - start.x) * t,
            start.y + (end.y - start.y) * t,
        );
    }
    if (Array.isArray(end)) {
        return end.map((_, i) => Math.max(0, Math.min(255, Math.round(start[i] + (end[i] - start[i]) * t))));
    }
    return start + (end - start) * t;
};

DE.Tween = class Tween {
    constructor(source, attr, end, duration, ease = "linear",
                from_ = null, on_complete = null) {
        this.source = source;
        this.attr = attr;
        this.end = end;
        this.duration = Math.max(0.0001, duration);
        this.ease = DE._get_easing(ease);
        this.on_complete = on_complete;
        this.elapsed = 0.0;
        this.done = false;
        this._start = from_ !== null && from_ !== undefined ? from_ : this._read();
    }

    _read_ptr() {
        // 'position.x' tarzı yolu yürür ve (parent, last_attr) döndürür.
        let obj = this.source;
        const parts = this.attr.split(".");
        let p = obj;
        for (let i = 0; i < parts.length - 1; i++) p = p[parts[i]];
        return { parent: p, name: parts[parts.length - 1] };
    }
    _read() {
        const { parent, name } = this._read_ptr();
        return parent[name];
    }
    _write(value) {
        const { parent, name } = this._read_ptr();
        const current = parent[name];
        // Vector2 hedeflerde referans kararlı kalsın (in-place güncelle) — zincirli
        // tween'ler eski vektöre bağlanmışsa ölü referans oluşmasın.
        if (current instanceof DE.Vector2 && value instanceof DE.Vector2) {
            current.x = value.x;
            current.y = value.y;
        } else {
            parent[name] = value;
        }
    }

    update(dt) {
        if (this.done) return;
        this.elapsed += dt;
        let t = this.elapsed / this.duration;
        if (t >= 1.0) { t = 1.0; this.done = true; }
        const eased = this.ease(t);
        this._write(DE._mix_tween(this._start, this.end, eased));
        if (this.done && this.on_complete) this.on_complete();
    }

    kill() { this.done = true; }
}

DE.TweenComponent = class TweenComponent extends DE.Component {
    constructor() {
        super();
        this._tweens = [];
        this._queue = [];       // gecikmeli tween'ler (start zamanı bekliyor)
        this._updating = false; // update sırasında to() güvenli eklensin diye
        this._pending = [];     // update esnasında eklenenler, döngü sonunda alınır
    }

    to(source, attr, end, duration = 1.0, ease = "linear",
        from_ = null, on_complete = null, delay = 0.0) {
        const tw = new DE.Tween(source, attr, end, duration, ease,
            from_, on_complete);
        if (delay > 0) {
            this._queue.push({ delay, tw });
        } else if (this._updating) {
            this._pending.push(tw);   // zincir güvenliği
        } else {
            this._tweens.push(tw);
        }
        return tw;
    }

    to_vec(source, attr, end_vec, duration = 1.0, ease = "linear",
        on_complete = null, delay = 0.0) {
        let ev = end_vec;
        if (!(ev instanceof DE.Vector2)) ev = new DE.Vector2(end_vec[0], end_vec[1]);
        return this.to(source, attr, ev, duration, ease,
            null, on_complete, delay);
    }

    after(previous_tween) {
        return new DE._Chain(this, previous_tween);
    }

    do_after(previous_tween, source, attr, end, duration = 1.0,
             ease = "linear", on_complete = null) {
        return this.after(previous_tween).to(source, attr, end, duration,
                                             ease, null, on_complete);
    }

    update(dt) {
        this._updating = true;
        try {
            // Gecikmeli tween'leri zamanlayıcıyla başlat
            if (this._queue.length) {
                const ready = [], remaining = [];
                for (const item of this._queue) {
                    item.delay -= dt;
                    if (item.delay <= 0) ready.push(item.tw);
                    else remaining.push(item);
                }
                this._queue = remaining;
                this._tweens.push(...ready);
            }
            const live = [];
            for (const tw of this._tweens) {
                tw.update(dt);
                if (!tw.done) live.push(tw);
            }
            this._tweens = live;
        } finally {
            this._updating = false;
        }
        // Update sırasında eklenenler (ör. zincir on_complete) şimdi devral
        if (this._pending.length) {
            this._tweens.push(...this._pending);
            this._pending.length = 0;
        }
    }

    clear() {
        this._tweens.length = 0;
        this._queue.length = 0;
    }

    running() { return this._tweens.length; }
}

DE._Chain = class _Chain {
    constructor(component, previous) {
        this.component = component;
        this.previous = previous;
        this.actions = [];   // _fire çağrılınca başlayacak spec'ler
    }

    to(source, attr, end, duration = 1.0, ease = "linear",
        from_ = null, on_complete = null) {
        this.actions.push({ source, attr, end, duration, ease, from_, on_complete });
        if (this.actions.length === 1 && this.previous !== null && this.previous !== undefined) {
            // İlk hedefi bağla: tüm eylemler önceki tween bitince başlar.
            const orig = this.previous.on_complete;
            const self = this;
            this.previous.on_complete = function () {
                if (orig) orig();
                self._fire();
            };
        } else if ((this.previous === null || this.previous === undefined) && this.actions.length === 1) {
            // Önceki tween yoksa hemen başlat
            this._fire();
        }
        return this;
    }

    _fire() {
        for (const a of this.actions) {
            this.component.to(a.source, a.attr, a.end, a.duration, a.ease,
                               a.from_, a.on_complete);
        }
    }
}

// geriye uyumlu ad
DE.Tweener = DE.TweenComponent;