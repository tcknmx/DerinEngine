/* DerinEngine HTML — input (klavye + mouse + oyun kumandası)
 * Python deep_engine/input.py ile birebir API: get_key / get_key_down /
 * get_key_up / get_axis / get_hat / get_horizontal_axis / get_mouse_* /
 * get_typed_text / is_controller_active / end_frame.
 * Tarayıcı eventleri biriktirilir; end_frame() kare sonunda one-shot durumları
 * (_down/_up/_mouse_down/_mouse_scroll/_joy_buttons_down/up) sıfırlar
 * (Python _update_events eşdeğeri — tek basış tam bir kare görünür).
 * Kumanda: Gamepad API (navigator.getGamepads) kare başında begin_frame() ile
 * taranır; mantıksal buton eşlemesi Python BUTTON_MAP ile aynıdır.
 * Not: get_typed_text() okunduğunda boşaltır (Python kare başında temizler);
 * tek okuyucu (konsol) için davranış aynıdır.
 */
var DE = DE || {};

DE.Input = class Input {
    constructor() {
        this._keys = {};           // basılı (get_key) — klavye
        this._down = {};           // bu kare basıldı (get_key_down)
        this._up = {};             // bu kare bırakıldı (get_key_up)
        this._mouse_pos = { x: 0, y: 0 };
        this._mouse_buttons = [false, false, false];   // sol / orta / sağ
        this._mouse_down = [false, false, false];
        this._mouse_scroll = 0;
        this._typed_chars = [];    // bu arada yazılan yazdırılabilir karakterler

        // --- Oyun kumandası (Python _joystick alanlarıyla denk) ---
        this._gamepads = [];       // bağlı kumandalar (canlı getGamepads sonucu)
        this._axis_values = new Array(8).fill(0);  // analog eksenler (-1..1)
        this._hat_values = [[0, 0], [0, 0], [0, 0], [0, 0]];  // D-Pad (dx, dy)
        this._joy_buttons_held = new Set();  // basılı tutulan kumanda butonları
        this._joy_buttons_down = new Set();  // bu kare basılanlar
        this._joy_buttons_up = new Set();    // bu kare bırakılanlar
        this._axes_deadzone = 0.2;           // analog ölü bölge (kayma/donma engeli)

        // Mantıksal aksiyon -> kumanda buton numarası (Python BUTTON_MAP aynıdır)
        // 0=A,1=B,2=X,3=Y,4=LB,5=RB,6=Back,7=Start,8=LS,9=RS
        this._BUTTON_MAP = {
            "SPACE": 0, "ENTER": 0,      // A butonu = zıpla / onayla
            "F": 2,                      // X butonu = ateş et
            "LSHIFT": 4,                 // LB = dash
            "ESCAPE": 7,                 // Start = çıkış
        };
        // Python numarası -> oyun kumandası standart index (Xbox layout):
        // standartta 6=LT,7=RT,8=Back,9=Start,10=LS,11=RS (Python'da 6=Back..)
        this._STD_INDEX = { 0: 0, 1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 8, 7: 9, 8: 10, 9: 11 };
        this._PY_NUM = {};
        for (const k in this._STD_INDEX) this._PY_NUM[this._STD_INDEX[k]] = Number(k);

        this.init();
    }
    init() {
        window.addEventListener("keydown", (e) => this._on_keydown(e));
        window.addEventListener("keyup", (e) => this._on_keyup(e));
        window.addEventListener("blur", () => {
            this._keys = {}; this._down = {}; this._up = {};
        });
        window.addEventListener("mousemove", (e) => {
            this._mouse_pos.x = e.clientX; this._mouse_pos.y = e.clientY;
        });
        window.addEventListener("mousedown", (e) => {
            if (e.button >= 0 && e.button < 3) {
                this._mouse_down[e.button] = true;
                this._mouse_buttons[e.button] = true;
            }
        });
        window.addEventListener("mouseup", (e) => {
            if (e.button >= 0 && e.button < 3) this._mouse_buttons[e.button] = false;
        });
        window.addEventListener("wheel", (e) => {
            this._mouse_scroll += e.deltaY;
        });
    }
    _on_keydown(e) {
        const k = this._normalize(e.key, e.location);
        if (!this._keys[k]) this._down[k] = true;
        this._keys[k] = true;
        if (e.key && e.key.length === 1) this._typed_chars.push(e.key);
        if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)) {
            e.preventDefault();
        }
    }
    _on_keyup(e) {
        const k = this._normalize(e.key, e.location);
        this._keys[k] = false;
        this._up[k] = true;
    }
    _normalize(key, location) {
        if (key === "Shift") return location === 2 ? "RSHIFT" : "LSHIFT";
        const map = {
            " ": "SPACE", "Spacebar": "SPACE",
            "ArrowUp": "UP", "ArrowDown": "DOWN",
            "ArrowLeft": "LEFT", "ArrowRight": "RIGHT",
            "Enter": location === 3 ? "KPENTER" : "ENTER",
            "Escape": "ESCAPE",
            "Tab": "TAB",
            "Backspace": "BACKSPACE",
            "`": "BACKQUOTE",
            "\"": "QUOTEDBL",
        };
        return map[key] || key.toUpperCase();
    }
    _normalizeKeyArg(name) {
        return String(name).toUpperCase();
    }

    /* --- kare başı: kumanda durumunu tazele (Python _poll_joystick) --- */
    begin_frame() {
        this._poll_gamepads();
    }
    _nav() {
        // window.navigator (tarayıcı/eklenebilir stub) ya da global navigator
        if (typeof window !== "undefined" && window && window.navigator) return window.navigator;
        if (typeof navigator !== "undefined") return navigator;
        return null;
    }
    _poll_gamepads() {
        const nav = this._nav();
        let pads = [];
        if (nav && nav.getGamepads) pads = nav.getGamepads() || [];
        this._gamepads = (Array.isArray(pads) ? pads : []).filter(p => p && p.connected);
        if (this._gamepads.length === 0) {
            this._joy_buttons_down = new Set();
            this._joy_buttons_up = new Set();
            return;
        }
        const gp = this._gamepads[0];
        const axes = gp.axes || [];
        for (let i = 0; i < this._axis_values.length; i++) {
            this._axis_values[i] = axes[i] !== undefined ? axes[i] : 0;
            if (Math.abs(this._axis_values[i]) < this._axes_deadzone) this._axis_values[i] = 0;
        }
        // D-Pad, eksen olarak değil standart buton 12-15 olarak gelir -> hat üret
        const b = gp.buttons || [];
        const pressed = (i) => !!(b[i] && b[i].pressed);
        this._hat_values[0][0] = (pressed(15) ? 1 : 0) - (pressed(14) ? 1 : 0);
        this._hat_values[0][1] = (pressed(13) ? 1 : 0) - (pressed(12) ? 1 : 0);
        const held = new Set();
        for (let i = 0; i < b.length; i++) {
            const py = this._PY_NUM[i];
            if (py !== undefined && pressed(i)) held.add(py);
        }
        this._joy_buttons_down = new Set([...held].filter(x => !this._joy_buttons_held.has(x)));
        this._joy_buttons_up = new Set([...this._joy_buttons_held].filter(x => !held.has(x)));
        this._joy_buttons_held = held;
    }

    /* --- klavye + kumanda birleşik sorgular (Python ile aynı) --- */
    get_key_down(name) {
        const k = this._normalizeKeyArg(name);
        if (this._down[k]) return true;
        const btn = this._BUTTON_MAP[k];
        return btn !== undefined && this._joy_buttons_down.has(btn);
    }
    get_key(name) {
        const k = this._normalizeKeyArg(name);
        if (this._keys[k]) return true;
        const btn = this._BUTTON_MAP[k];
        return btn !== undefined && this._joy_buttons_held.has(btn);
    }
    get_key_up(name) {
        const k = this._normalizeKeyArg(name);
        if (this._up[k]) return true;
        const btn = this._BUTTON_MAP[k];
        return btn !== undefined && this._joy_buttons_up.has(btn);
    }

    /* --- analog eksen / D-Pad yardımcıları (Python ile aynı) --- */
    get_axis(index) {
        return (index >= 0 && index < this._axis_values.length) ? this._axis_values[index] : 0.0;
    }
    get_hat(index = 0) {
        return (index >= 0 && index < this._hat_values.length)
            ? this._hat_values[index].slice() : [0, 0];
    }
    get_horizontal_axis() {
        // Klavye (A/D + ok) + sol analog eksen + D-Pad birleşimi (-1..1)
        let v = this.get_axis(0);
        const hx = this.get_hat(0)[0];
        if (v === 0 && hx !== 0) v = hx;
        if (this.get_key("A") || this.get_key("LEFT") || this.get_key("D") || this.get_key("RIGHT")) {
            let k = 0;
            if (this.get_key("A") || this.get_key("LEFT")) k -= 1;
            if (this.get_key("D") || this.get_key("RIGHT")) k += 1;
            v = (k !== 0) ? k : v;
        }
        return v;
    }

    /* --- kumanda bağlantısı --- */
    is_controller_active() {
        if (this._gamepads.length > 0) return true;
        // begin_frame çağrılmadıysa canlı yokla (takılma testleri/garanti)
        const nav = this._nav();
        let pads = [];
        if (nav && nav.getGamepads) pads = nav.getGamepads() || [];
        return (Array.isArray(pads) ? pads : []).some(p => p && p.connected);
    }
    _gamepad_a_down() {
        return this._joy_buttons_down.has(this._BUTTON_MAP["SPACE"]);
    }

    /* --- fare --- */
    get_mouse_position() { return { x: this._mouse_pos.x, y: this._mouse_pos.y }; }
    get_mouse_button(button = 0) {
        if (button >= 0 && button < 3) return this._mouse_buttons[button];
        return false;
    }
    get_mouse_button_down(button = 0) {
        if (button >= 0 && button < 3) return this._mouse_down[button];
        return false;
    }
    get_mouse_scroll() { return this._mouse_scroll; }

    /* --- yazı girişi --- */
    get_typed_text() {
        const s = this._typed_chars.join("");
        this._typed_chars = [];
        return s;
    }
    clear_typed() { this._typed_chars = []; }

    /* --- kare sonu: one-shot durumları sıfırla --- */
    end_frame() {
        this._down = {};
        this._up = {};
        this._mouse_down = [false, false, false];
        this._mouse_scroll = 0;
        // Kumanda kenar durumları da kareye özeldir: bir sonraki begin_frame'de
        // yeniden hesaplanana kadar _joy_buttons_down/up görünmez (Python'da
        // _update_events sonraki kare başında tazeler — görünürlük eşdeğer).
        this._joy_buttons_down = new Set();
        this._joy_buttons_up = new Set();
    }
}

/* --- Python Input (statik) köprüsü ---
 * Oyun kodu (game/*.js) Python'daki gibi `DE.Input.get_key_down("F")` biçiminde
 * çağırır; bu statik passthrough'lar `DE.Input.instance` üzerinden döner.
 * (Python deep_engine/input.py Input sınıfı statik metodlarla aynı API'yi sunar.) */
DE.Input.get_key = function (k) {
    const i = DE.Input.instance; return i ? i.get_key(k) : false;
};
DE.Input.get_key_down = function (k) {
    const i = DE.Input.instance; return i ? i.get_key_down(k) : false;
};
DE.Input.get_key_up = function (k) {
    const i = DE.Input.instance; return i ? i.get_key_up(k) : false;
};
DE.Input.get_axis = function (i) {
    const inst = DE.Input.instance; return inst ? inst.get_axis(i) : 0;
};
DE.Input.get_hat = function (h) {
    const inst = DE.Input.instance; return inst ? inst.get_hat(h) : [0, 0];
};
DE.Input.get_horizontal_axis = function () {
    const i = DE.Input.instance; return i ? i.get_horizontal_axis() : 0;
};
DE.Input.get_mouse_position = function () {
    const i = DE.Input.instance; return i ? i.get_mouse_position() : { x: 0, y: 0 };
};
DE.Input.get_mouse_button = function (b) {
    const i = DE.Input.instance; return i ? i.get_mouse_button(b) : false;
};
DE.Input.get_mouse_button_down = function (b) {
    const i = DE.Input.instance; return i ? i.get_mouse_button_down(b) : false;
};
/* Python'da @classmethod; JS'te statik sarmalayici olmazsa konsol
 * (DevConsole.update) her kare TypeError atip oyun dongusunu dusuruyordu. */
DE.Input.get_typed_text = function () {
    const i = DE.Input.instance; return i ? i.get_typed_text() : "";
};
DE.Input.clear_typed = function () {
    const i = DE.Input.instance; if (i) i.clear_typed();
};
DE.Input.is_controller_active = function () {
    const i = DE.Input.instance; return i ? i.is_controller_active() : false;
};