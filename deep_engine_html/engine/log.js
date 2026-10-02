/* DerinEngine HTML — motor log (MotorLogger)
 * Python deep_engine/log.py portu. Seviyeli log: DEBUG/INFO/WARN/BUG/ERR.
 * Varsayılan eşik WARN -> yalnızca "sorun" mesajları çıkar. Handler eklenebilir.
 */
var DE = DE || {};

DE.LOG = { DEBUG: 0, INFO: 1, WARN: 2, BUG: 3, ERR: 4 };
DE._LOG_LEVEL_NAMES = { 0: "DEBUG", 1: "INFO", 2: "WARN", 3: "BUG", 4: "ERR" };

DE.MotorLogger = class MotorLogger {
    constructor() {
        this.level = DE.LOG.WARN;
        this.handlers = [];
        this.handlers.push((level, label, msg) => this._default_console(level, label, msg));
        this._last_notified = {};
        this.file_name = null;   // web'de dosya yok; yalnizca ad + tampon tutulur
        this._buffer = [];
    }
    /* Python log.py set_file'in WEB karsiligi: tarayicida dosya sistemi yok.
     * Bunun yerine kayitlar bellekte tamponlanir; close_file() tamponu dondurur
     * (kaydetme/indirme bir UI/derleme katmani isligiyle yapilabilir). Boylece
     * API denk kalir ve "motor.log'a yaz" istegi sessizce yitmez. */
    set_file(name) {
        this.file_name = name || null;
        this._buffer = [];
        return this.file_name;
    }
    close_file() {
        const text = this._buffer.join("\n") + (this._buffer.length ? "\n" : "");
        this._buffer = [];
        this.file_name = null;
        return text;
    }
    /* Tampona yazilan son kayitlari dondurur (web'de set_file kullanilirsa). */
    file_buffer() {
        return this._buffer.slice();
    }
    set_level(level) {
        this.level = level;
    }
    add_handler(fn) {
        if (!this.handlers.includes(fn)) this.handlers.push(fn);
    }
    remove_handler(fn) {
        const i = this.handlers.indexOf(fn);
        if (i >= 0) this.handlers.splice(i, 1);
    }
    clear_handlers() {
        this.handlers = [];
    }
    _emit(level, msg) {
        if (level < this.level) return;
        const label = DE._LOG_LEVEL_NAMES[level] || "?";
        if (this.file_name) {
            this._buffer.push("[" + label + "] " + String(msg));
        }
        for (const h of [...this.handlers]) {
            try {
                h(level, label, String(msg));
            } catch (e) { /* bozuk handler'i atla */ }
        }
    }
    _default_console(level, label, msg) {
        const line = "[" + label + "] " + msg;
        try {
            if (typeof console !== "undefined") {
                if (level === DE.LOG.ERR) console.error(line);
                else if (level === DE.LOG.BUG) console.warn(line);
                else if (level === DE.LOG.WARN) console.warn(line);
                else console.log(line);
            }
        } catch (e) { return; }
    }
    debug(msg) { this._emit(DE.LOG.DEBUG, msg); }
    info(msg) { this._emit(DE.LOG.INFO, msg); }
    warn(msg) { this._emit(DE.LOG.WARN, msg); }
    bug(msg) { this._emit(DE.LOG.BUG, msg); }
    err(msg) { this._emit(DE.LOG.ERR, msg); }
    exception(tp, val, tb) {
        let lines;
        try {
            lines = String("EXCEPTION: ") + String(tp) + ": " + String(val);
        } catch (e) {
            lines = "EXCEPTION: " + String(val);
        }
        this.err(lines);
    }
}

DE.log = new DE.MotorLogger();