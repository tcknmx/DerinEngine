/* DerinEngine HTML — game/ui.js (Python game/ui.py birebir portu)
 * Menü / oyun sonu / zafer / duraklatma ekranları + yardımcı UI bileşenleri.
 * Motor UI kiti (DE.UITheme/Panel/Button) ve TextRenderer (is_ui) kullanılır.
 * KAMERA NOTU (M3 KALAN): Python menüsü player'a CLOSE-UP zoom + vinyet kullanır;
 * JS Scene.draw camera_zoom'u uygulamaz, bu yüzden yakınlaştırma/vinyet ATLANDI.
 * Çapraz geçiş (FadeOverlay) de M3'e bırakıldı (Python'da şu an kullanılmıyor).
 */
var DE_GAME = DE_GAME || {};

/* I18n etiketini her karede TextRenderer'a yazan bileşen ("T" dil değiştirince anında dolar). */
DE_GAME.LocalizedLabel = class LocalizedLabel extends DE.Component {
    constructor(key = "", format_args = null) {
        super();
        this.key = key;
        this.format_args = format_args || {};
        this._text = null;
    }
    start() {
        this._text = this.game_object.get_component(DE.TextRenderer);
    }
    update(dt) {
        if (this._text === null) {
            this._text = this.game_object.get_component(DE.TextRenderer);
            if (this._text === null) return;
        }
        if (Object.keys(this.format_args).length) {
            this._text.text = DE.I18n.localize(this.key, this.format_args);
        } else {
            this._text.text = DE.I18n.t(this.key);
        }
    }
};

/* Motor UI kiti Button'unu bir I18n anahtarıyla senkron tutar (çeviri değişince metni tazele). */
DE_GAME.KitLabelSync = class KitLabelSync extends DE.Component {
    constructor(button, key, was_locked = false) {
        super();
        this._button = button;
        this._key = key;
        this._was_locked = was_locked;
        this.is_ui = true;
    }
    update(dt) {
        const text = DE.I18n.t(this._key);
        if (this._button.text !== text) this._button.set_text(text);
    }
};

/* Kilitli menü satırında "4" yerine parmak izi (padlock) çizen küçük ikon. */
DE_GAME.LockIcon = class LockIcon extends DE.Component {
    constructor(color = [220, 210, 180], size = 14) {
        super();
        this.color = color;
        this.size = size;
        this.is_ui = true;
    }
    draw(ctx, camera_offset) {
        if (!this.game_object.active) return;
        const x = Math.trunc(this.game_object.position.x);
        const y = Math.trunc(this.game_object.position.y);
        const s = this.size;
        ctx.fillStyle = "rgb(" + this.color[0] + "," + this.color[1] + "," + this.color[2] + ")";
        ctx.beginPath();
        ctx.roundRect(x, y + Math.trunc(s / 3), s, Math.trunc(s * 0.8), Math.max(2, Math.trunc(s / 6)));
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x + s / 2, y + Math.trunc(s / 3), s * 0.33, Math.PI, 0);
        ctx.strokeStyle = "rgb(" + this.color[0] + "," + this.color[1] + "," + this.color[2] + ")";
        ctx.lineWidth = Math.max(2, Math.trunc(s / 6));
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(x + s / 2, y + Math.trunc(2 * s / 3), Math.max(2, Math.trunc(s / 7)), 0, Math.PI * 2);
        ctx.fillStyle = "rgb(15,15,20)";
        ctx.fill();
        ctx.fillRect(x + s / 2 - 1, y + Math.trunc(2 * s / 3), 3, Math.trunc(s / 5));
    }
};

/* Kampanya kalıcı biyom ilerlemesi rozetleri (ana menü altta). */
DE_GAME.BiomeProgress = class BiomeProgress extends DE.Component {
    constructor(completed = null, x = 450, y = 0, badge = 26, gap = 86) {
        super();
        this.completed = new Set(completed || []);
        this.x = x;
        this.y = y;
        this.badge = badge;
        this.gap = gap;
        this.is_ui = true;
    }
    draw(ctx, camera_offset) {
        if (!this.game_object.active) return;
        const order = ["forest", "cave", "ice", "desert", "astro"];
        const colors = {
            "forest": [60, 150, 110], "cave": [120, 80, 160],
            "ice": [110, 190, 240], "desert": [210, 140, 60], "astro": [90, 90, 200],
        };
        for (let i = 0; i < order.length; i++) {
            const biome = order[i];
            const bx = this.x + i * this.gap;
            const by = this.y;
            const s = this.badge;
            const color = colors[biome] || [150, 150, 150];
            const unlocked = this.completed.has(biome);
            ctx.beginPath();
            ctx.roundRect(bx, by, s, s, Math.trunc(s / 5));
            if (unlocked) {
                ctx.fillStyle = "rgb(" + color[0] + "," + color[1] + "," + color[2] + ")";
                ctx.fill();
                ctx.strokeStyle = "rgb(255,255,255)";
                ctx.lineWidth = 2;
                ctx.stroke();
                const cx = bx + s / 2, cy = by + s / 2;
                const pts = [
                    [cx, cy - s / 3], [cx + s / 7, cy - s / 10], [cx + s / 3, cy - s / 10],
                    [cx + s / 7, cy + s / 10], [cx + s / 5, cy + s / 3], [cx, cy + s / 5],
                    [cx - s / 5, cy + s / 3], [cx - s / 7, cy + s / 10], [cx - s / 3, cy - s / 10],
                    [cx - s / 7, cy - s / 10],
                ];
                ctx.fillStyle = "rgb(255,240,180)";
                ctx.beginPath();
                ctx.moveTo(pts[0][0], pts[0][1]);
                for (let k = 1; k < pts.length; k++) ctx.lineTo(pts[k][0], pts[k][1]);
                ctx.closePath();
                ctx.fill();
            } else {
                ctx.strokeStyle = "rgb(95,100,110)";
                ctx.lineWidth = 2;
                ctx.stroke();
                const lx = bx + s / 2 - s / 6, ly = by + s / 2 - s / 6;
                ctx.fillStyle = "rgb(95,100,110)";
                ctx.beginPath();
                ctx.roundRect(lx, ly, s / 3, Math.trunc(s * 0.45), Math.trunc(s / 12));
                ctx.fill();
                ctx.beginPath();
                ctx.arc(lx + s / 6, ly, s / 6, Math.PI, 0);
                ctx.strokeStyle = "rgb(95,100,110)";
                ctx.lineWidth = Math.max(2, Math.trunc(s / 10));
                ctx.stroke();
            }
            const label = DE.I18n.t("biome_" + biome);
            ctx.font = "18px monospace";
            const tw = ctx.measureText(label).width || label.length * 9;
            ctx.fillStyle = "rgb(190,200,215)";
            ctx.fillText(label, bx + s / 2 - tw / 2, by + s + 22);
        }
    }
};

/* V2.0 ana menü kontrolcüsü: arka planda CANLI bir kampanya giriş seviyesi döner.
 * Oyuncu partiden önce hareketsiz durur; P/SPACE/ENTER -> Kampanya, 4 -> Sonsuz. */
DE_GAME.MenuController = class MenuController extends DE.Component {
    constructor() {
        super();
        this.is_ui = true;
        this.done = false;
        this.scene = null;
        this.player = null;
        this._hud_ui = [];
        this._click_zones = [];
    }
    start() {
        this.done = false;
        this.scene = DE.Engine.instance.active_scene;
        this.player = this.scene.find_by_tag("Player");
        // KAMERA NOTU (M3): Python burada yakınlaştırma/vinyet kurardı.
        if (this.player) {
            const pc = this.player.get_component(DE_GAME.PlayerController);
            if (pc) pc.menu_idle = true;
        }
        this._hud_ui = this.scene._hud_ui || [];
        for (const o of this._hud_ui) o.active = false;
        this._click_zones = [];
        const menu_ui = this.scene._menu_ui || [];
        for (const o of menu_ui) {
            const rect = o._click_rect;
            const action = o._click_action;
            if (rect && action !== undefined && action !== null) {
                this._click_zones.push([rect, action]);
            }
        }
    }
    _start_campaign() {
        DE.SoundFX.play("win");
        this.scene.name = this.scene._orig_name || this.scene.name;
        if (this.player) {
            const pc = this.player.get_component(DE_GAME.PlayerController);
            if (pc) pc.menu_idle = false;
        }
        for (const o of this._hud_ui) o.active = true;
        const menu_ui = this.scene._menu_ui || [];
        for (const o of menu_ui) o.active = false;
        this.done = true;
    }
    _endless_unlocked() {
        try {
            const profile = DE_GAME.savegame();
            return !!profile.get("endless_unlocked", false);
        } catch (e) { return false; }
    }
    _dispatch_action(action) {
        if (action === "campaign") {
            DE_GAME.state.game_mode = "campaign";
            this._start_campaign();
        } else if (action === "endless") {
            if (this._endless_unlocked()) {
                DE_GAME.state.game_mode = "endless";
                DE_GAME.state.endless_state["score"] = 0;
                this._start_campaign();
            } else {
                DE.SoundFX.play("click");
                console.log(DE.I18n.t("endless_locked_warn"));
            }
        } else if (action === "lang") {
            DE.I18n.toggle_language();
            DE.SoundFX.play("click");
        }
    }
    update(dt) {
        if (this.done) return;
        if (DE.Input.get_mouse_button_down(0)) {
            const m = DE.Input.get_mouse_position();
            for (let i = 0; i < this._click_zones.length; i++) {
                const [rect, action] = this._click_zones[i];
                if (m.x >= rect.x && m.x < rect.x + rect.w && m.y >= rect.y && m.y < rect.y + rect.h) {
                    this._dispatch_action(action);
                    return;
                }
            }
        }
        if (DE.Input.get_key_down("4")) {
            if (this._endless_unlocked()) {
                DE_GAME.state.game_mode = "endless";
                DE_GAME.state.endless_state["score"] = 0;
                this._start_campaign();
            } else {
                DE.SoundFX.play("click");
                console.log(DE.I18n.t("endless_locked_warn"));
            }
        } else if (DE.Input.get_key_down("P") || DE.Input.get_key_down("SPACE") || DE.Input.get_key_down("ENTER")) {
            DE_GAME.state.game_mode = "campaign";
            this._start_campaign();
        }
    }
};

/* Ana menü: kampanyanın ilk giriş seviyesini CANLI arka plan yapar, sağda menü seçenekleri. */
DE_GAME.build_main_menu_scene = function build_main_menu_scene() {
    const scene = DE_GAME.start_campaign();
    scene._orig_name = scene.name;
    scene.name = "Main Menu";

    if (scene.parallax_background === null) {
        try {
            scene.parallax_background = new DE.ParallaxBackground({ theme: "forest" });
        } catch (e) { /* yok say */ }
    }

    let profile = null;
    try { profile = DE_GAME.savegame(); } catch (e) { profile = null; }
    const getp = (key, def) => (profile ? profile.get(key, def) : def);

    const _menu_ui = [];

    // Başlık ve alt başlık (üst-orta, tek satır) — dili takip eder.
    const t1 = new DE.GameObject("T1", 450, 18, 0, 0, "UI");
    t1.add_component(new DE.TextRenderer(DE.I18n.t("menu_title"), 42, [255, 215, 50], true, [0, 0, 0], true, false));
    t1.add_component(new DE_GAME.LocalizedLabel("menu_title"));
    scene.add_object(t1);
    _menu_ui.push(t1);

    const t2 = new DE.GameObject("T2", 450, 74, 0, 0, "UI");
    t2.add_component(new DE.TextRenderer(DE.I18n.t("menu_subtitle"), 18, [180, 220, 255], true, [0, 0, 0], true, false));
    t2.add_component(new DE_GAME.LocalizedLabel("menu_subtitle"));
    scene.add_object(t2);
    _menu_ui.push(t2);

    function _menu_item(name, key, x, y, font_size, color, action, locked, lock_key) {
        const use_key = (locked && lock_key) ? lock_key : key;
        const o = new DE.GameObject(name, x, y, 0, 0, "UI");
        o.add_component(new DE.TextRenderer(DE.I18n.t(use_key), font_size,
            locked ? [110, 115, 130] : color, true, [0, 0, 0], false, false));
        o.add_component(new DE_GAME.LocalizedLabel(use_key));
        o._click_rect = { x: x, y: y - 10, w: 900 - x, h: font_size + 20 };
        o._click_action = action || null;
        scene.add_object(o);
        _menu_ui.push(o);
        if (locked) {
            const icon = new DE.GameObject(name + "_icon", x - 30, y - 6, 0, 0, "UI");
            icon.add_component(new DE_GAME.LockIcon([110, 115, 130], 16));
            scene.add_object(icon);
            _menu_ui.push(icon);
            const lock = new DE.GameObject(name + "_lock", x, y + font_size + 4, 0, 0, "UI");
            lock.add_component(new DE.TextRenderer(DE.I18n.t("menu_endless_locked"), 12, [125, 120, 135], true, [0, 0, 0]));
            lock.add_component(new DE_GAME.LocalizedLabel("menu_endless_locked"));
            scene.add_object(lock);
            _menu_ui.push(lock);
        }
    }

    _menu_item("M_KAMP", "menu_campaign", 610, 180, 28, [120, 255, 120], "campaign");

    // Sonsuz Mod satırı: motor UI kiti Button (hover/press/disabled görünümü).
    const _endless_locked = !getp("endless_unlocked", false);
    const _endless_key = _endless_locked ? "menu_random_locked" : "menu_random";
    const _endless_theme = new DE.UITheme({
        button_bg: [28, 66, 96], button_hover: [42, 88, 128], button_press: [20, 40, 64],
        button_focus: [150, 200, 235], button_text: [100, 255, 180], button_disabled: [58, 60, 70],
    });
    const _rnd_go = new DE.GameObject("M_RND", 610, 214, 280, 44, "UI");
    const _rnd_btn = new DE.Button(DE.I18n.t(_endless_key), null, _endless_theme, 23);
    _rnd_btn.enabled = !_endless_locked;
    _rnd_go.add_component(_rnd_btn);
    _rnd_go.add_component(new DE_GAME.KitLabelSync(_rnd_btn, _endless_key));
    _rnd_go._click_rect = { x: 610, y: 210, w: 290, h: 52 };
    _rnd_go._click_action = _endless_locked ? null : "endless";
    scene.add_object(_rnd_go);
    _menu_ui.push(_rnd_go);
    if (_endless_locked) {
        const icon = new DE.GameObject("M_RND_icon", 580, 230, 0, 0, "UI");
        icon.add_component(new DE_GAME.LockIcon([110, 115, 130], 16));
        scene.add_object(icon);
        _menu_ui.push(icon);
        const lock = new DE.GameObject("M_RND_lock", 610, 263, 0, 0, "UI");
        lock.add_component(new DE.TextRenderer(DE.I18n.t("menu_endless_locked"), 12, [125, 120, 135], true, [0, 0, 0]));
        lock.add_component(new DE_GAME.LocalizedLabel("menu_endless_locked"));
        scene.add_object(lock);
        _menu_ui.push(lock);
    }

    _menu_item("M4", "menu_lang", 610, 292, 23, [255, 230, 120], "lang");

    // Kontrol bilgisi + yüksek skor (alt-orta, hizalı).
    const cinfo = new DE.GameObject("M5", 450, 520, 0, 0, "UI");
    cinfo.add_component(new DE.TextRenderer(DE.I18n.t("controls_info"), 15, [165, 180, 205], true, [0, 0, 0], true, false));
    cinfo.add_component(new DE_GAME.LocalizedLabel("controls_info"));
    scene.add_object(cinfo);
    _menu_ui.push(cinfo);

    const high = getp("high_score", 0);
    const hs_obj = new DE.GameObject("HighScore", 450, 555, 0, 0, "UI");
    hs_obj.add_component(new DE.TextRenderer(DE.I18n.localize("menu_highscore", { score: high }), 18, [255, 215, 100], true, [0, 0, 0], true, false));
    hs_obj.add_component(new DE_GAME.LocalizedLabel("menu_highscore", { score: high }));
    scene.add_object(hs_obj);
    _menu_ui.push(hs_obj);

    const prog_title = new DE.GameObject("ProgTitle", 450, 604, 0, 0, "UI");
    prog_title.add_component(new DE.TextRenderer(DE.I18n.t("campaign_progress"), 15, [180, 195, 215], true, [0, 0, 0], true, false));
    prog_title.add_component(new DE_GAME.LocalizedLabel("campaign_progress"));
    scene.add_object(prog_title);
    _menu_ui.push(prog_title);

    const prog = new DE.GameObject("Progress", 450, 632, 0, 0, "UI");
    prog.add_component(new DE_GAME.BiomeProgress(getp("completed_biomes", []), 450, 632, 26, 86));
    scene.add_object(prog);
    _menu_ui.push(prog);

    const ver = new DE.GameObject("Version", 15, 575, 0, 0, "UI");
    ver.add_component(new DE.TextRenderer("DerinEngine v" + (DE.__version__ || "0.0.0"), 13, [110, 140, 180], true, [0, 0, 0]));
    scene.add_object(ver);
    _menu_ui.push(ver);

    const bg_fx = new DE.GameObject("MenuFX", 0, 0, 0, 0, "UI");
    bg_fx.add_component(new DE_GAME.MenuController());
    scene.add_object(bg_fx);

    scene._menu_ui = _menu_ui;
    scene._hud_ui = [...scene.game_objects, ...scene._objects_to_add]
        .filter(o => o.components.some(c => c.is_ui) && _menu_ui.indexOf(o) === -1);

    return scene;
};

/* Havai fişek parçacık şovu (zafer ekranı). */
DE_GAME.FireworksController = class FireworksController extends DE.Component {
    constructor() {
        super();
        this.particles = null;
        this.timer = 0.0;
    }
    start() {
        this.particles = this.game_object.get_component(DE.ParticleEmitter);
    }
    update(dt) {
        this.timer += dt;
        if (this.timer > 0.25 && this.particles) {
            this.timer = 0.0;
            const colors = [[255, 215, 0], [255, 80, 80], [80, 200, 255], [100, 255, 120], [255, 120, 220]];
            const rx = 100 + DE._rng.uniform(0, 600);
            const ry = 80 + DE._rng.uniform(0, 220);
            this.particles.burst(30, colors[Math.floor(DE._rng.uniform(0, colors.length))],
                [80, 240], [3, 7], [0.8, 1.6], 140.0, [rx, ry]);
        }
    }
};

DE_GAME.VictoryController = class VictoryController extends DE_GAME.FireworksController {
    update(dt) {
        super.update(dt);
        if (DE.Input.get_key_down("R") || DE.Input.get_key_down("SPACE") || DE.Input.get_key_down("ENTER")) {
            DE.Engine.switch_scene(DE_GAME.build_main_menu_scene());
        }
    }
};

DE_GAME.GameOverController = class GameOverController extends DE.Component {
    constructor(restart_factory) {
        super();
        this.restart_factory = restart_factory;
    }
    update(dt) {
        if (DE.Input.get_key_down("R") || DE.Input.get_key_down("SPACE") || DE.Input.get_key_down("ENTER")) {
            DE.Engine.switch_scene(this.restart_factory());
        } else if (DE.Input.get_key_down("M")) {
            DE.Engine.switch_scene(DE_GAME.build_main_menu_scene());
        }
    }
};

DE_GAME.build_game_over_scene = function build_game_over_scene(restart_factory) {
    const scene = new DE.Scene("Game Over", [20, 10, 15]);
    const t1 = new DE.GameObject("T1", 280, 160, 0, 0, "UI");
    t1.add_component(new DE.TextRenderer(DE.I18n.t("game_over_title"), 46, [255, 60, 60], true));
    scene.add_object(t1);
    const t2 = new DE.GameObject("T2", 310, 240, 0, 0, "UI");
    t2.add_component(new DE.TextRenderer(DE.I18n.t("game_over_subtitle"), 24, [220, 180, 180], true));
    scene.add_object(t2);
    const t3 = new DE.GameObject("T3", 240, 340, 0, 0, "UI");
    t3.add_component(new DE.TextRenderer(DE.I18n.t("game_over_restart"), 20, [255, 220, 100], true));
    scene.add_object(t3);
    const t4 = new DE.GameObject("T4", 270, 390, 0, 0, "UI");
    t4.add_component(new DE.TextRenderer(DE.I18n.t("game_over_menu"), 18, [160, 190, 230], true));
    scene.add_object(t4);
    const ctrl_obj = new DE.GameObject("GameOverCtrl", 0, 0, 0, 0, "UI");
    ctrl_obj.add_component(new DE_GAME.GameOverController(restart_factory));
    scene.add_object(ctrl_obj);
    return scene;
};

DE_GAME.build_victory_scene = function build_victory_scene() {
    const scene = new DE.Scene("Zafer Ekrani", [15, 20, 35]);
    try {
        const vp = DE_GAME.savegame();
        vp.set("endless_unlocked", true);
        vp.save();
    } catch (e) { /* ilerleme kalıcılığı en iyi çaba */ }
    const fw_obj = new DE.GameObject("Fireworks", 0, 0, 0, 0, "UI");
    fw_obj.add_component(new DE.ParticleEmitter());
    fw_obj.add_component(new DE_GAME.VictoryController());
    scene.add_object(fw_obj);
    const t1 = new DE.GameObject("Title1", 180, 130, 0, 0, "UI");
    t1.add_component(new DE.TextRenderer(DE.I18n.t("victory_title"), 36, [255, 220, 50], true));
    scene.add_object(t1);
    const t2 = new DE.GameObject("Title2", 240, 210, 0, 0, "UI");
    t2.add_component(new DE.TextRenderer(DE.I18n.t("victory_subtitle"), 23, [200, 240, 255], true));
    scene.add_object(t2);
    const t3 = new DE.GameObject("Title3", 290, 290, 0, 0, "UI");
    t3.add_component(new DE.TextRenderer(DE.I18n.t("victory_praise"), 26, [100, 255, 160], true));
    scene.add_object(t3);
    const t4 = new DE.GameObject("Title4", 250, 410, 0, 0, "UI");
    t4.add_component(new DE.TextRenderer(DE.I18n.t("victory_restart"), 20, [180, 180, 210], true));
    scene.add_object(t4);
    DE.SoundFX.play_music("victory");
    return scene;
};

/* Duraklatma kontrolcüsü: overlay'i kapat (ESC), 'M' ana menü, butonlar (Resume/Menu). */
DE_GAME.PauseController = class PauseController extends DE.Component {
    constructor() {
        super();
        this.is_ui = true;
        this._focused_index = 0;
        this._buttons = [];
        this._button_keys = [];
    }
    start() {
        const scene = DE.Engine.instance.active_scene;
        this._buttons = scene._pause_buttons || [];
        for (let i = 0; i < this._buttons.length; i++) {
            this._buttons[i][0].focused = (i === this._focused_index);
        }
    }
    _resume() {
        DE.SoundFX.play("click");
        const sm = DE.Engine.instance.scene_manager;
        if (sm !== null && sm !== undefined) sm.pop();
        return true;
    }
    _to_menu() {
        DE.SoundFX.play("click");
        if (this._resume()) {
            DE.Engine.switch_scene(DE_GAME.build_main_menu_scene());
        }
        return true;
    }
    update(dt) {
        if (DE.Input.get_key_down("T")) {
            for (let i = 0; i < this._button_keys.length; i++) {
                const [btn, key] = this._button_keys[i];
                btn.set_text(DE.I18n.t(key));
            }
        }
        const total = this._buttons.length;
        if (total === 0) return;
        if (DE.Input.get_key_down("DOWN") || DE.Input.get_key_down("S")) {
            this._focused_index = (this._focused_index + 1) % total;
            DE.SoundFX.play("click");
        } else if (DE.Input.get_key_down("UP") || DE.Input.get_key_down("W")) {
            this._focused_index = (this._focused_index - 1 + total) % total;
            DE.SoundFX.play("click");
        }
        if (DE.Input.get_key_down("ESCAPE")) {
            this._resume();
            return;
        }
        if (DE.Input.get_key_down("ENTER") || DE.Input.get_key_down("SPACE")) {
            const [btn, callback] = this._buttons[this._focused_index];
            if (callback) callback();
            return;
        }
        if (DE.Input.get_key_down("M")) {
            this._to_menu();
            return;
        }
        for (let i = 0; i < this._buttons.length; i++) {
            this._buttons[i][0].focused = (i === this._focused_index);
        }
    }
};

DE_GAME.build_pause_scene = function build_pause_scene() {
    const scene = new DE.Scene("Pause", [8, 10, 16]);
    scene.transparent = true;

    const theme = new DE.UITheme({
        panel_bg: [22, 26, 38], panel_border: [90, 100, 130],
        button_bg: [50, 70, 110], button_hover: [70, 95, 150],
        button_focus: [220, 220, 235], button_text: [235, 240, 250],
    });

    const dim = new DE.GameObject("PauseDim", 0, 0, 800, 600, "UI");
    dim.add_component(new DE.Panel(theme, [10, 12, 20], null, 0, 150));
    scene.add_object(dim);

    const title = new DE.GameObject("PauseTitle", 400, 120, 0, 0, "UI");
    title.add_component(new DE.TextRenderer(DE.I18n.t("pause_title"), 44, [255, 220, 90], true, [0, 0, 0], true, false));
    title.add_component(new DE_GAME.LocalizedLabel("pause_title"));
    scene.add_object(title);

    const hint = new DE.GameObject("PauseHint", 400, 182, 0, 0, "UI");
    hint.add_component(new DE.TextRenderer(DE.I18n.t("pause_hint"), 16, [170, 185, 210], true, [0, 0, 0], true, false));
    hint.add_component(new DE_GAME.LocalizedLabel("pause_hint"));
    scene.add_object(hint);

    const pause_controller = new DE_GAME.PauseController();

    const resume = new DE.GameObject("ResumeBtn", 300, 240, 200, 46, "UI");
    const resume_button = new DE.Button(DE.I18n.t("pause_resume_btn"), pause_controller._resume.bind(pause_controller), theme, 22);
    resume.add_component(resume_button);
    scene.add_object(resume);

    const menu = new DE.GameObject("MenuBtn", 300, 306, 200, 46, "UI");
    const menu_button = new DE.Button(DE.I18n.t("pause_menu_btn"), pause_controller._to_menu.bind(pause_controller), theme, 22);
    menu.add_component(menu_button);
    scene.add_object(menu);

    pause_controller._buttons = [[resume_button, resume_button.on_click], [menu_button, menu_button.on_click]];
    pause_controller._button_keys = [[resume_button, "pause_resume_btn"], [menu_button, "pause_menu_btn"]];
    scene._pause_buttons = pause_controller._buttons;

    const ctrl_obj = new DE.GameObject("PauseCtrl", 0, 0, 0, 0, "UI");
    ctrl_obj.add_component(pause_controller);
    scene.add_object(ctrl_obj);

    // Overlay ESC = kapat ve donmuş oyuna dön
    scene.on_escape = pause_controller._resume.bind(pause_controller);
    return scene;
};