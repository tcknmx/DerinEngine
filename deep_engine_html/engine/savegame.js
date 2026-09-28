/* DerinEngine HTML — savegame (SaveGame: kalıcı oyuncu verisi)
 * Python deep_engine/savegame.py portu. Dosya yerine tarayıcı localStorage
 * kullanır (web-only). Node/test'te dışarıdan _WS_KEY destekli stub gerekebilir.
 */
var DE = DE || {};

DE.SaveGame = class SaveGame {
    constructor(path = "savegame.json") {
        this.path = path;
        this.data = {};
        this._local = DE.SaveGame._local_storage();
        this.load();
    }
    static _local_storage() {
        try {
            if (typeof window !== "undefined" && window.localStorage) {
                return window.localStorage;
            }
        } catch (e) { return null; }
        return null;
    }
    static get _WS_KEY() { return "derinengine_save_v1"; }

    load() {
        const persisted = this._read_storage();
        if (persisted !== null) {
            this.data = persisted;
            return;
        }
        if (!(this.data instanceof Object) || Array.isArray(this.data)) {
            this.data = {};
        }
    }
    _read_storage() {
        if (!this._local) return null;
        try {
            const raw = this._local.getItem(DE.SaveGame._WS_KEY);
            if (!raw) return null;
            const parsed = JSON.parse(raw);
            return (parsed && typeof parsed === "object" && !Array.isArray(parsed)) ? parsed : null;
        } catch (e) { return null; }
    }
    _write_storage() {
        if (!this._local) return;
        try {
            this._local.setItem(DE.SaveGame._WS_KEY, JSON.stringify(this.data));
        } catch (e) {
            DE.log && DE.log.warn ? DE.log.warn("localStorage kaydi basarisiz: " + e) : 0;
        }
    }
    save() {
        this._write_storage();
    }
    set(key, value) {
        this.data[key] = value;
    }
    get(key, defval = null) {
        return Object.prototype.hasOwnProperty.call(this.data, key) ? this.data[key] : defval;
    }
    has(key) {
        return Object.prototype.hasOwnProperty.call(this.data, key);
    }
    update_high_score(key, value) {
        const current = this.get(key, 0) || 0;
        if (value > current) {
            this.set(key, value);
            this.save();
            return true;
        }
        return false;
    }
    delete() {
        this.data = {};
        try {
            if (this._local) this._local.removeItem(DE.SaveGame._WS_KEY);
        } catch (e) { /* sessiz */ }
    }
}