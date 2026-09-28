/* DerinEngine HTML — console (DevConsole: `` ` `` ile açılan geliştirici komut satırı)
 * Python deep_engine/console.py portu. Komutlar: help / clear / version (motor katmanı).
 * Oyun tarafı register_command ile kendi komutlarını ekler.
 */
var DE = DE || {};

DE._CONSOLE_COMMANDS = {};

DE.register_command = function (name, help_text, fn) {
    DE._CONSOLE_COMMANDS[String(name).toLowerCase()] = { help: help_text, fn: fn };
};

DE._cmd_help = function (scene, args) {
    const lines = ["Komutlar:"];
    for (const name of Object.keys(DE._CONSOLE_COMMANDS).sort()) {
        lines.push("  " + name + "  ->  " + DE._CONSOLE_COMMANDS[name].help);
    }
    return lines.join("\n");
};
DE._cmd_clear = function (scene, args) { return "__CLEAR__"; };
DE._cmd_version = function (scene, args) {
    return "DerinEngine motor surumu: " + (DE.__version__ || "0.0.0");
};

DE.register_command("help", "komut listesini goster", DE._cmd_help);
DE.register_command("clear", "konsolu temizle", DE._cmd_clear);
DE.register_command("version", "motor surumunu goster", DE._cmd_version);

DE.DevConsole = class DevConsole {
    constructor(width, height) {
        this.active = false;
        this.width = width;
        this.height = height;
        this.input_line = "";
        this.history = [];
        this.history_index = 0;
        this.output = [];
        this._output_max = 64;
        this.font_size = 16;
        this._cursor_timer = 0.0;
        this._cmd_count = 0;
    }
    _print(text) {
        for (const line of String(text).split("\n")) {
            this.output.push(line);
            if (this.output.length > this._output_max) this.output.shift();
        }
    }
    toggle() {
        this.active = !this.active;
        if (this.active) {
            if (DE.Input && DE.Input.clear_typed) DE.Input.clear_typed();
            this.input_line = "";
            this.history_index = this.history.length;
            this._print("Konsol acik. 'help' yazip ENTER'a bas.");
        }
        return this.active;
    }
    close() {
        this.active = false;
    }
    update(dt) {
        if (!DE.Input) return;
        const typed = DE.Input.get_typed_text();
        if (typed) this.input_line += typed;

        if (DE.Input.get_key_down("BACKSPACE")) {
            this.input_line = this.input_line.slice(0, -1);
        }
        if (DE.Input.get_key_down("UP") && this.history.length) {
            this.history_index = Math.max(0, this.history_index - 1);
            this.input_line = this.history[this.history_index];
        }
        if (DE.Input.get_key_down("DOWN")) {
            this.history_index = Math.min(this.history.length, this.history_index + 1);
            this.input_line = this.history_index < this.history.length ? this.history[this.history_index] : "";
        }
        if (DE.Input.get_key_down("ENTER") || DE.Input.get_key_down("KPENTER")) {
            const line = this.input_line.trim();
            this.input_line = "";
            this._run(line);
        }
        if (DE.Input.get_key_down("ESCAPE")) {
            this.close();
        }
        this._cursor_timer += dt;
    }
    _run(line) {
        if (!line) return;
        this.history.push(line);
        this.history_index = this.history.length;
        this._print("> " + line);
        const parts = line.split(/\s+/);
        const name = parts[0].toLowerCase();
        const args = parts.slice(1);
        const cmd = DE._CONSOLE_COMMANDS[name];
        if (!cmd) {
            this._print("Bilinmeyen komut: '" + name + "' (help yaz)");
            return;
        }
        let result;
        try {
            const scene = (DE.Engine && DE.Engine.instance && DE.Engine.instance.active_scene) || null;
            result = cmd.fn(scene, args);
        } catch (exc) {
            this._print("HATA: " + exc);
            return;
        }
        if (result === "__CLEAR__") {
            this.output = [];
        } else if (result) {
            this._print(result);
        }
    }
    draw(ctx) {
        if (!this.active) return;
        const w = this.width;
        const h = this.height;
        const panel_h = Math.floor(h * 0.42);
        ctx.save();
        ctx.fillStyle = "rgba(12,14,20,0.92)";
        ctx.fillRect(0, 0, w, panel_h);
        ctx.strokeStyle = "rgb(70,100,150)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, panel_h); ctx.lineTo(w, panel_h);
        ctx.stroke();
        ctx.font = this.font_size + "px monospace";
        // Çıktı satırları (en yeni altta)
        const line_h = 20;
        let y = panel_h - 34;
        ctx.fillStyle = "rgb(210,220,235)";
        ctx.textBaseline = "middle";
        for (let i = this.output.length - 1; i >= 0; i--) {
            if (y < 18) break;
            ctx.fillText(this.output[i], 12, y - line_h);
            y -= line_h;
        }
        // Girdi satırı (panel altı)
        let prompt = "> " + this.input_line;
        if (Math.floor(this._cursor_timer * 2) % 2 === 0) prompt += "_";
        ctx.fillStyle = "rgb(120,230,120)";
        ctx.fillText(prompt, 12, panel_h - 30);
        ctx.fillStyle = "rgb(120,130,150)";
        ctx.fillText("` veya ESC ile kapat - help ile komutlari gor", 12, panel_h - 54);
        ctx.textBaseline = "alphabetic";
        ctx.restore();
    }
}