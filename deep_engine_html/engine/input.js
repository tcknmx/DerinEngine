/* DerinEngine HTML — input (klavye + temel mouse)
 * Input.get_key_down() / get_key(name) — Python Input API'siyle aynı isimler.
 * Senkron durum; tarayıcı eventlerinden beslenir. is_ui/axis yok (ilk sürüm).
 */
var DE = DE || {};

DE.Input = class Input {
    constructor() {
        this._keys = {};           // basılı (get_key)
        this._down = {};           // bu kare basıldı (get_key_down)
        this._down_consumed = {};
        this._mouse = { x: 0, y: 0, buttons: 0 };
        this._mouse_down = 0;
        this._mouse_scroll = 0;
        this._typed_chars = [];
        this.init();
    }
    init() {
        window.addEventListener("keydown", (e) => {
            const k = this._normalize(e.key);
            if (!this._keys[k]) this._down[k] = true;
            this._keys[k] = true;
            if (e.key && e.key.length === 1) {
                this._typed_chars.push(e.key);
            }
            if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)) {
                e.preventDefault();
            }
        });
        window.addEventListener("keyup", (e) => {
            this._keys[this._normalize(e.key)] = false;
        });
        window.addEventListener("blur", () => {
            this._keys = {}; this._down = {};
        });
        window.addEventListener("mousemove", (e) => {
            this._mouse.x = e.clientX; this._mouse.y = e.clientY;
        });
        window.addEventListener("mousedown", (e) => {
            if (e.button === 0) { this._mouse_down = 1; this._mouse.buttons = 1; }
            else this._mouse.buttons = 0;
        });
        window.addEventListener("mouseup", (e) => {
            if (e.button === 0) this._mouse.buttons = 0;
        });
        window.addEventListener("wheel", (e) => {
            this._mouse_scroll += e.deltaY;
        });
    }
    _normalize(key) {
        const map = {
            " ": "SPACE", "Spacebar": "SPACE",
            "ArrowUp": "UP", "ArrowDown": "DOWN",
            "ArrowLeft": "LEFT", "ArrowRight": "RIGHT",
            "Enter": "ENTER", "Escape": "ESCAPE",
        };
        return map[key] || key.toUpperCase();
    }
    get_key_down(name) {
        const k = this._normalizeKeyArg(name);
        if (this._down[k]) {
            // Think once per frame: consumed until engine end_frame
            return true;
        }
        return false;
    }
    get_key(name) {
        return !!this._keys[this._normalizeKeyArg(name)];
    }
    _normalizeKeyArg(name) {
        return String(name).toUpperCase();
    }
    end_frame() {
        this._down = {};
        this._mouse_down = 0;
        this._mouse_scroll = 0;
    }
    get_mouse_position() { return { x: this._mouse.x, y: this._mouse.y }; }
    get_mouse_button(button = 0) {
        if (button !== 0) return false;
        return this._mouse.buttons === 1;
    }
    get_mouse_button_down(button = 0) {
        if (button !== 0) return false;
        return this._mouse_down === 1;
    }
    get_mouse_scroll() { return this._mouse_scroll; }
    get_typed_text() {
        const s = this._typed_chars.join("");
        this._typed_chars = [];
        return s;
    }
    clear_typed() { this._typed_chars = []; }
    is_controller_active() { return false; }
    _gamepad_a_down() { return false; }
}