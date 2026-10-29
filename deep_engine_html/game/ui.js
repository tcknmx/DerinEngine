/* DerinEngine HTML — game/ui.js (Python game/ui.py birebir portu)
 * Menü / oyun sonu / zafer / duraklatma ekranları + yardımcı UI bileşenleri.
 * Motor UI kiti (DE.UITheme/Panel/Button) ve TextRenderer (is_ui) kullanılır.
 * M3: menü kamerası CLOSE-UP zoom (MENU_ZOOM=1.8) + güçlü vinyet (0.5); kampanya
 * başlarken zoom_to(1.0) + set_vignette(0.22). FadeOverlay + çapraz geçiş
 * (dormant) Python'da birebir taşındı (Python'da _pending_factory hiç set
 * edilmez — aynı davranış korunur).
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
        // auto_size=false: dil değişince metin güncellenir, buton boyutu sabit kalır
        // (kullanıcı: "butonlar sadece metnin sığdığı kadar küçülmesin").
        if (this._button.text !== text) this._button.set_text(text, null, false);
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
        const s = this.badge;
        const n = order.length;
        // Rozet adları hep 18px okunur çizilir; taşma, boşluğu (aralık) içeriğe
        // göre genişleterek çözülür: en geniş etiket gap'ten büyükse gap genişler,
        // satır merkezi korunduğu için göz ortalı hizada kalır. (Font küçültme yok.)
        const label_fs = 18;
        ctx.font = label_fs + "px monospace";
        const labels = order.map((b) => DE.I18n.t("biome_" + b));
        let widest = 0;
        for (const lb of labels) {
            widest = Math.max(widest, ctx.measureText(lb).width || lb.length * label_fs * 0.6);
        }
        const dyn_gap = Math.max(this.gap, Math.ceil(widest) + 8);
        const center_x = this.x + ((n - 1) * this.gap + s) / 2;
        const start_x = center_x - ((n - 1) * dyn_gap + s) / 2;
        for (let i = 0; i < n; i++) {
            const biome = order[i];
            const bx = start_x + i * dyn_gap;
            const by = this.y;
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
            const label = labels[i];
            const tw = ctx.measureText(label).width || label.length * label_fs * 0.6;
            ctx.fillStyle = "rgb(190,200,215)";
            ctx.fillText(label, bx + s / 2 - tw / 2, by + s + 22);
        }
    }
};

/* Menünün CLOSE-UP zoom değeri (1.0 = normal; >1 = yakın). Seviye seçilince 1.0'a döner. */
DE_GAME.MENU_ZOOM = 1.8;

/* FadeOverlay: yeni bir sahneye eklendiğinde ekran karartmasını 255->0 açar.
 * Menüden başka moda yumuşak çapraz geçiş sağlardı; Python'da şu an dormant
 * (MenuController._pending_factory hiç set edilmez) — birebir taşındı.
 */
DE_GAME.FadeOverlay = class FadeOverlay extends DE.Component {
    constructor(fade_speed = 500.0) {
        super();
        this._alpha = 255.0;
        this.fade_speed = fade_speed;
        this.is_ui = true;  // çizimi zoom'dan etkilenmez
    }
    update(dt) {
        this._alpha = Math.max(0.0, this._alpha - this.fade_speed * dt);
        if (this._alpha <= 0.0) {
            const scene = DE.Engine.instance ? DE.Engine.instance.active_scene : null;
            if (scene && scene.destroy) scene.destroy(this.game_object);
        }
    }
    draw(ctx, camera_offset) {
        if (this._alpha <= 0) return;
        const a = Math.max(0, Math.min(255, Math.trunc(this._alpha)));
        ctx.fillStyle = "rgba(0,0,0," + (a / 255).toFixed(3) + ")";
        ctx.fillRect(0, 0, ctx.canvas ? ctx.canvas.width : 900, ctx.canvas ? ctx.canvas.height : 600);
    }
};

/* V2.0 ana menü kontrolcüsü: arka planda CANLI bir kampanya giriş seviyesi döner.
 * Oyuncu partiden önce hareketsiz durur; P/SPACE/ENTER -> Kampanya, 4 -> Sonsuz.
 * Menü kamerası oyuncuya CLOSE-UP (zoom 1.8) + güçlü vinyet ile başlar. */
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
        // Yumuşak çapraz geçiş: bir seçenek seçilince kısa kararma olur (dormant).
        this._fade = 0.0;
        this._fading_out = false;
        this._fade_dir = 0;
        this._pending_factory = null;
        this.scene = DE.Engine.instance.active_scene;
        this.player = this.scene.find_by_tag("Player");
        // Kamera: CLOSE-UP (oyuncu büyük, sol-orta) + menüde güçlü kenar vinyeti.
        this.scene.camera_manual = true;
        this.scene.camera_zoom = DE_GAME.MENU_ZOOM;
        this.scene.camera_zoom_target = DE_GAME.MENU_ZOOM;
        this.scene.set_vignette(0.5);
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
    _place_menu_camera() {
        // Kamerayı konumlandır: oyuncu ekranın sol-ortasında yakın planda kalır.
        const scene = this.scene;
        const player = this.player;
        if (!player) return;
        const cx = player.position.x + player.size.x / 2;
        const cy = player.position.y + player.size.y / 2;
        const fx = 0.30, fy = 0.55;  // oyuncunun ekrandaki (yakın çekim) konum oranları
        scene.camera_position.x = cx - (0.5 + (fx - 0.5) / scene.camera_zoom) * scene.screen_width;
        scene.camera_position.y = cy - (0.5 + (fy - 0.5) / scene.camera_zoom) * scene.screen_height;
    }
    _start_campaign() {
        DE.SoundFX.play("win");
        this.scene.name = this.scene._orig_name || this.scene.name;
        // Oyun başlıyor: CLOSE-UP -> normal oyun büyüklüğü, vinyet hafifler.
        this.scene.camera_manual = false;   // otomatik takip -> oyuncuya odaklan
        this.scene.zoom_to(1.0);
        // Menü kamerası oyuncuya uzak bir noktaya park edilmişti: ışınla, böylece
        // çıkış tek temiz bir zoom-out olur (zoom + dünya kayması birlikte olmaz).
        this.scene.snap_camera_to_target();
        this.scene.set_vignette(0.22);
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
    // Ayarlar ekranı: aynı andaki menü gibi fade + ayrı sahne ile açılır.
    _start_settings() {
        DE.SoundFX.play("click");
        this._pending_factory = DE_GAME.build_settings_scene;
        this._fade = 0;
        this._fade_dir = 1;
        this._fading_out = true;
    }
    _dispatch_action(action) {
        if (action === "campaign") {
            DE_GAME.state.game_mode = "campaign";
            this._start_campaign();
        } else if (action === "settings") {
            this._start_settings();
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
        this._place_menu_camera();

        if (this._fading_out) {
            // Kararma: 255'e ulaşınca sahne geçer (varsa); 0'a dönünce biter.
            const FADE_SPEED = 420.0;
            this._fade = Math.max(0.0, Math.min(255.0, this._fade + this._fade_dir * FADE_SPEED * dt));
            if (this._fade >= 255.0) {
                if (this._pending_factory !== null && this._pending_factory !== undefined) {
                    const new_scene = this._pending_factory();
                    const fo = new DE.GameObject("FadeIn", 0, 0, 0, 0, "Default");
                    fo.add_component(new DE_GAME.FadeOverlay());
                    new_scene.add_object(fo);
                    DE.Engine.switch_scene(new_scene);
                    this._pending_factory = null;
                }
                this._fade_dir = -1;   // aydınlan (255 -> 0)
            } else if (this._fade <= 0.0 && this._fade_dir < 0) {
                this.done = true;
            }
            return;
        }

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
    draw(ctx, camera_offset) {
        // Tam ekran karartma katmanı (çapraz geçiş sırasında).
        if (this._fade > 0) {
            const a = Math.max(0, Math.min(255, Math.trunc(this._fade)));
            ctx.fillStyle = "rgba(0,0,0," + (a / 255).toFixed(3) + ")";
            ctx.fillRect(0, 0, ctx.canvas ? ctx.canvas.width : 900, ctx.canvas ? ctx.canvas.height : 600);
        }
    }
};

/* Ayarlar ekranı kontrolcüsü: butonlu dil + efekt/müzik ses seviyesi.
 * Değerler SaveGame'de kalıcı; açılışta main.js bunları SoundFX'e uygular. */
DE_GAME.SettingsController = class SettingsController extends DE.Component {
    constructor() {
        super();
        this.is_ui = true;
        this.scene = null;
        this._click_zones = [];
        this._volume_labels = {};
    }
    start() {
        this.scene = DE.Engine.instance.active_scene;
        this._click_zones = [];
        const ui = (this.scene && this.scene._settings_ui) || [];
        for (const o of ui) {
            const rect = o._click_rect;
            const action = o._click_action;
            if (rect && action !== undefined && action !== null) {
                this._click_zones.push([rect, action]);
                if (action === "sfx-minus" || action === "sfx-plus" || action === "music-minus" || action === "music-plus") {
                    this._volume_labels[action] = o;
                }
            }
        }
        // Kayıtlı ses seviyelerini bataryaya yükle (menüden gelinmiş olabilir).
        try {
            const p = DE_GAME.savegame();
            DE.SoundFX.set_sfx_volume(p.get("sfx_volume", 1.0));
            DE.SoundFX.set_music_volume(p.get("music_volume", 1.0));
        } catch (e) { /* yok say */ }
        this._refresh_volume_text();
        this._refresh_lang_markers();
    }
    _dispatch(action) {
        if (action === "lang-tr" || action === "lang-en") {
            DE.I18n.set_language(action === "lang-tr" ? "tr" : "en");
            try { DE_GAME.savegame().set("lang", DE.I18n.current_lang); DE_GAME.savegame().save(); }
            catch (e) { /* yok say */ }
            DE.SoundFX.play("click");
            this._refresh_lang_markers();
        } else if (action === "sfx-minus" || action === "sfx-plus") {
            const step = 0.1;
            let v = DE.SoundFX.get_sfx_volume();
            v = action === "sfx-plus" ? Math.round((v + step) * 10) / 10 : Math.round((v - step) * 10) / 10;
            v = Math.max(0.0, Math.min(1.0, v));
            DE.SoundFX.set_sfx_volume(v);
            try { DE_GAME.savegame().set("sfx_volume", v); DE_GAME.savegame().save(); }
            catch (e) { /* yok say */ }
            this._refresh_volume_text();
            DE.SoundFX.play("click");
        } else if (action === "music-minus" || action === "music-plus") {
            const step = 0.1;
            let v = DE.SoundFX.get_music_volume();
            v = action === "music-plus" ? Math.round((v + step) * 10) / 10 : Math.round((v - step) * 10) / 10;
            v = Math.max(0.0, Math.min(1.0, v));
            DE.SoundFX.set_music_volume(v);
            try { DE_GAME.savegame().set("music_volume", v); DE_GAME.savegame().save(); }
            catch (e) { /* yok say */ }
            this._refresh_volume_text();
            DE.SoundFX.play("click");
        } else if (action === "back") {
            DE.SoundFX.play("click");
            DE.Engine.switch_scene(DE_GAME.build_main_menu_scene());
        }
    }
    _refresh_volume_text() {
        if (!this.scene) return;
        const sfx = DE.SoundFX.get_sfx_volume();
        const music = DE.SoundFX.get_music_volume();
        for (const o of this.scene.game_objects) {
            if (o.name === "SFXVal") {
                const tr = o.get_component(DE.TextRenderer);
                if (tr) tr.text = "%" + Math.round(sfx * 100);
            } else if (o.name === "MusicVal") {
                const tr = o.get_component(DE.TextRenderer);
                if (tr) tr.text = "%" + Math.round(music * 100);
            }
        }
    }
    _refresh_lang_markers() {
        if (!this.scene) return;
        const active = DE.I18n.current_lang === "tr" ? "LangTR" : "LangEN";
        for (const o of this.scene.game_objects) {
            if (o.name === "LangTR" || o.name === "LangEN") {
                const tr = o.get_component(DE.TextRenderer);
                if (tr) tr.color = (o.name === active) ? [255, 235, 140] : [200, 205, 220];
            }
        }
    }
    update(dt) {
        if (!this.scene) return;
        if (DE.Input.get_key_down("Escape")) {
            this._dispatch("back");
            return;
        }
        if (DE.Input.get_mouse_button_down(0)) {
            const m = DE.Input.get_mouse_position();
            for (let i = 0; i < this._click_zones.length; i++) {
                const [rect, action] = this._click_zones[i];
                if (m.x >= rect.x && m.x < rect.x + rect.w && m.y >= rect.y && m.y < rect.y + rect.h) {
                    this._dispatch(action);
                    return;
                }
            }
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
    // TÜM ekran metinleri center_x + center_y ile MERKEZ semantiğinde:
    // position = metnin ortası (üst-kenar kayması yaşanmaz).
    const t1 = new DE.GameObject("T1", 450, 40, 0, 0, "UI");
    t1.add_component(new DE.TextRenderer(DE.I18n.t("menu_title"), 42, [255, 215, 50], true, [0, 0, 0], true, true));
    t1.add_component(new DE_GAME.LocalizedLabel("menu_title"));
    scene.add_object(t1);
    _menu_ui.push(t1);

    const t2 = new DE.GameObject("T2", 450, 83, 0, 0, "UI");
    t2.add_component(new DE.TextRenderer(DE.I18n.t("menu_subtitle"), 18, [180, 220, 255], true, [0, 0, 0], true, true));
    t2.add_component(new DE_GAME.LocalizedLabel("menu_subtitle"));
    scene.add_object(t2);
    _menu_ui.push(t2);

    // Yerel yardımcı: sağ alttaki mod kutucuğu (Panel + merkezde başlık).
    function _menu_box(name, x, y, w, h, bg, border, title_key, title_font, title_color, action, locked) {
        const box = new DE.GameObject(name + "_box", x, y, w, h, "UI");
        box.add_component(new DE.Panel(null, bg, border, 10));
        scene.add_object(box);
        _menu_ui.push(box);

        const lbl = new DE.GameObject(name, x + w / 2, y + (locked ? 15 : h / 2), 0, 0, "UI");
        lbl.add_component(new DE.TextRenderer(DE.I18n.t(title_key), title_font,
            title_color, true, [0, 0, 0], true, true));
        lbl.add_component(new DE_GAME.LocalizedLabel(title_key));
        lbl._click_rect = { x: x, y: y, w: w, h: h };
        lbl._click_action = action;
        scene.add_object(lbl);
        _menu_ui.push(lbl);

        if (locked) {
            const icon = new DE.GameObject(name + "_icon", x + 12, y + 10, 0, 0, "UI");
            icon.add_component(new DE_GAME.LockIcon([255, 230, 140], 18));
            scene.add_object(icon);
            _menu_ui.push(icon);
            const lock = new DE.GameObject(name + "_lock", x + w / 2, y + h - 8, 0, 0, "UI");
            lock.add_component(new DE.TextRenderer(DE.I18n.t("menu_endless_locked"), 12, [220, 200, 140], true, [0, 0, 0], true, true));
            lock.add_component(new DE_GAME.LocalizedLabel("menu_endless_locked"));
            scene.add_object(lock);
            _menu_ui.push(lock);
        }
        return lbl;
    }

    // ÜST SA�?: Play + Settings (motor kit butonları). Dil artık Settings içinde.
    const _play_theme = new DE.UITheme({
        button_bg: [58, 132, 92], button_hover: [76, 164, 116], button_press: [36, 96, 64],
        button_focus: [220, 255, 225], button_text: [245, 255, 245],
    });
    const play_go = new DE.GameObject("M_PLAY", 610, 150, 280, 54, "UI");
    const play_btn = new DE.Button(DE.I18n.t("menu_play"), null, _play_theme, 26);
    play_go.add_component(play_btn);
    play_go.add_component(new DE_GAME.KitLabelSync(play_btn, "menu_play"));
    play_go._click_rect = { x: 610, y: 150, w: 280, h: 54 };
    play_go._click_action = "campaign";
    scene.add_object(play_go);
    _menu_ui.push(play_go);

    const _set_theme = new DE.UITheme({
        button_bg: [52, 82, 130], button_hover: [68, 104, 162], button_press: [34, 56, 92],
        button_focus: [220, 230, 250], button_text: [240, 244, 252],
    });
    const set_go = new DE.GameObject("M_SETTINGS", 610, 216, 280, 46, "UI");
    const set_btn = new DE.Button(DE.I18n.t("menu_settings"), null, _set_theme, 20);
    set_go.add_component(set_btn);
    set_go.add_component(new DE_GAME.KitLabelSync(set_btn, "menu_settings"));
    set_go._click_rect = { x: 610, y: 216, w: 280, h: 46 };
    set_go._click_action = "settings";
    scene.add_object(set_go);
    _menu_ui.push(set_go);

    // SAĞ ALT: Sonsuz Mod kutucuğu (gri "bot" yok; kilitliyken canlı panel +
    // kilit ikonu). Star Climber mini-oyunu 09.10.2026'da kaldırıldı.
    const _endless_locked = !getp("endless_unlocked", false);
    _menu_box("M_RND", 610, 428, 280, 70,
        _endless_locked ? [64, 58, 140] : [46, 110, 150], [168, 156, 220],
        "endless_name", 22, _endless_locked ? [185, 175, 255] : [140, 240, 255],
        "endless", _endless_locked);

    // SAĞ ALT (boşluk doldurma): "Yakında / Coming Soon" gri, tıklanamaz kutu.
    // İçerik yok, yanıt vermez — yalnızca yer tutucu (itch.io demosu için).
    {
        const _cs_box = new DE.GameObject("M_COMING_box", 610, 508, 280, 70, "UI");
        _cs_box.add_component(new DE.Panel(null, [78, 78, 84], [130, 130, 136], 10));
        scene.add_object(_cs_box);
        _menu_ui.push(_cs_box);

        const _cs_lbl = new DE.GameObject("M_COMING", 610 + 280 / 2, 508 + 70 / 2, 0, 0, "UI");
        _cs_lbl.add_component(new DE.TextRenderer(DE.I18n.t("menu_coming_soon"), 22,
            [195, 195, 200], true, [0, 0, 0], true, true));
        _cs_lbl.add_component(new DE_GAME.LocalizedLabel("menu_coming_soon"));
        scene.add_object(_cs_lbl);
        _menu_ui.push(_cs_lbl);
        // _click_rect / _click_action kasıtlı olarak set edilmiyor → tıklanamaz.
    }

    // ALT-ORTA: kontroller + yüksek skor + kampanya rozetleri (kutucuklarla çakışmaz).
    // Merkez semantiği: center_x + center_y true, y = metnin görsel merkezi.
    const cinfo = new DE.GameObject("M5", 360, 450, 0, 0, "UI");
    cinfo.add_component(new DE.TextRenderer(DE.I18n.t("controls_info"), 15, [165, 180, 205], true, [0, 0, 0], true, true));
    cinfo.add_component(new DE_GAME.LocalizedLabel("controls_info"));
    scene.add_object(cinfo);
    _menu_ui.push(cinfo);

    const high = getp("high_score", 0);
    const hs_obj = new DE.GameObject("HighScore", 360, 483, 0, 0, "UI");
    hs_obj.add_component(new DE.TextRenderer(DE.I18n.localize("menu_highscore", { score: high }), 18, [255, 215, 100], true, [0, 0, 0], true, true));
    hs_obj.add_component(new DE_GAME.LocalizedLabel("menu_highscore", { score: high }));
    scene.add_object(hs_obj);
    _menu_ui.push(hs_obj);

    const prog_title = new DE.GameObject("ProgTitle", 360, 512, 0, 0, "UI");
    prog_title.add_component(new DE.TextRenderer(DE.I18n.t("campaign_progress"), 15, [180, 195, 215], true, [0, 0, 0], true, true));
    prog_title.add_component(new DE_GAME.LocalizedLabel("campaign_progress"));
    scene.add_object(prog_title);
    _menu_ui.push(prog_title);

    // Rozet serisi: 5 rozet, 360 merkezine hizalı (badge 22, gap 52 -> başlangıç 245).
    // Etiketler rozetin 22px ALTINA çizilir -> son satır 524+22+22=568'de ekran içinde.
    const prog = new DE.GameObject("Progress", 245, 524, 0, 0, "UI");
    prog.add_component(new DE_GAME.BiomeProgress(getp("completed_biomes", []), 245, 524, 22, 52));
    scene.add_object(prog);
    _menu_ui.push(prog);

    const ver = new DE.GameObject("Version", 450, 582, 0, 0, "UI");
    ver.add_component(new DE.TextRenderer("DerinEngine v" + (DE_GAME.__version__ || DE.__version__ || "0.0.0"), 13, [110, 140, 180], true, [0, 0, 0], true, true));
    scene.add_object(ver);
    _menu_ui.push(ver);

    const bg_fx = new DE.GameObject("MenuFX", 0, 0, 0, 0, "UI");
    bg_fx.add_component(new DE_GAME.MenuController());
    scene.add_object(bg_fx);

    scene._menu_ui = _menu_ui;
    scene._hud_ui = scene.game_objects
        .filter(o => o.components.some(c => c.is_ui) && _menu_ui.indexOf(o) === -1);

    return scene;
};

/* Ayarlar ekranı: butonlu dil + efekt/müzik ses seviyesi ayarı + ana menüye dönüş.
 * Buraya open() ile gelinir (MenuController action "settings"); ESC veya Geri
 * butonu ana menüyü yeniden kurar. */
DE_GAME.build_settings_scene = function build_settings_scene() {
    const scene = new DE.Scene("Settings", [12, 16, 28]);

    if (scene.parallax_background === null) {
        try {
            scene.parallax_background = new DE.ParallaxBackground({ theme: "forest" });
        } catch (e) { /* yok say */ }
    }

    const _sui = [];

    const title = new DE.GameObject("SetTitle", 450, 61, 0, 0, "UI");
    title.add_component(new DE.TextRenderer(DE.I18n.t("settings_title"), 42, [255, 215, 50], true, [0, 0, 0], true, true));
    title.add_component(new DE_GAME.LocalizedLabel("settings_title"));
    scene.add_object(title);
    _sui.push(title);

    // DİL: Türkçe / English butonları (aktif dil ★ ile vurgulur).
    const lang_label = new DE.GameObject("LangLabel", 450, 140, 0, 0, "UI");
    lang_label.add_component(new DE.TextRenderer(DE.I18n.t("settings_lang"), 20, [200, 210, 228], true, [0, 0, 0], true, true));
    lang_label.add_component(new DE_GAME.LocalizedLabel("settings_lang"));
    scene.add_object(lang_label);
    _sui.push(lang_label);

    function _lang_button(name, cx, lang) {
        const key = lang === "tr" ? "settings_lang_tr" : "settings_lang_en";
        const o = new DE.GameObject(name, cx, 180, 0, 0, "UI");   // cx = metin MERKEZİ
        const tr = new DE.TextRenderer(DE.I18n.t(key), 22, [200, 205, 220], true, [0, 0, 0], true, true);
        o.add_component(tr);
        o.add_component(new DE_GAME.LocalizedLabel(key));
        const w = 150;
        o._click_rect = { x: cx - w / 2, y: 160, w: w, h: 40 };   // tıklama alanı metinle merkezli
        o._click_action = "lang-" + lang;
        scene.add_object(o);
        _sui.push(o);
        return o;
    }
    // İki dil butonu ekran merkezi (450) etrafında simetrik: 360 ve 540.
    _lang_button("LangTR", 360, "tr");
    _lang_button("LangEN", 540, "en");

    // EFEKT SEVİYESİ: [-] %NN [+]
    const sfx_label = new DE.GameObject("SfxLabel", 450, 260, 0, 0, "UI");
    sfx_label.add_component(new DE.TextRenderer(DE.I18n.t("settings_sfx"), 20, [200, 210, 228], true, [0, 0, 0], true, true));
    sfx_label.add_component(new DE_GAME.LocalizedLabel("settings_sfx"));
    scene.add_object(sfx_label);
    _sui.push(sfx_label);

    const sfx_minus = new DE.GameObject("SfxMinus", 378, 288, 44, 40, "UI");
    sfx_minus.add_component(new DE.Button("−", null, new DE.UITheme({
        button_bg: [70, 76, 96], button_hover: [92, 100, 126], button_press: [50, 56, 72],
    }), 22));
    sfx_minus._click_rect = { x: 378, y: 288, w: 44, h: 40 };
    sfx_minus._click_action = "sfx-minus";
    scene.add_object(sfx_minus);
    _sui.push(sfx_minus);

    const sfx_val = new DE.GameObject("SFXVal", 450, 308, 0, 0, "UI");
    sfx_val.add_component(new DE.TextRenderer("%100", 22, [140, 240, 200], true, [0, 0, 0], true, true));
    scene.add_object(sfx_val);
    _sui.push(sfx_val);

    const sfx_plus = new DE.GameObject("SfxPlus", 478, 288, 44, 40, "UI");
    sfx_plus.add_component(new DE.Button("+", null, new DE.UITheme({
        button_bg: [70, 76, 96], button_hover: [92, 100, 126], button_press: [50, 56, 72],
    }), 22));
    sfx_plus._click_rect = { x: 478, y: 288, w: 44, h: 40 };
    sfx_plus._click_action = "sfx-plus";
    scene.add_object(sfx_plus);
    _sui.push(sfx_plus);

    // MÜZİK SEVİYESİ: [-] %NN [+]
    const music_label = new DE.GameObject("MusicLabel", 450, 370, 0, 0, "UI");
    music_label.add_component(new DE.TextRenderer(DE.I18n.t("settings_music"), 20, [200, 210, 228], true, [0, 0, 0], true, true));
    music_label.add_component(new DE_GAME.LocalizedLabel("settings_music"));
    scene.add_object(music_label);
    _sui.push(music_label);

    const music_minus = new DE.GameObject("MusicMinus", 378, 398, 44, 40, "UI");
    music_minus.add_component(new DE.Button("−", null, new DE.UITheme({
        button_bg: [70, 76, 96], button_hover: [92, 100, 126], button_press: [50, 56, 72],
    }), 22));
    music_minus._click_rect = { x: 378, y: 398, w: 44, h: 40 };
    music_minus._click_action = "music-minus";
    scene.add_object(music_minus);
    _sui.push(music_minus);

    const music_val = new DE.GameObject("MusicVal", 450, 418, 0, 0, "UI");
    music_val.add_component(new DE.TextRenderer("%100", 22, [140, 220, 255], true, [0, 0, 0], true, true));
    scene.add_object(music_val);
    _sui.push(music_val);

    const music_plus = new DE.GameObject("MusicPlus", 478, 398, 44, 40, "UI");
    music_plus.add_component(new DE.Button("+", null, new DE.UITheme({
        button_bg: [70, 76, 96], button_hover: [92, 100, 126], button_press: [50, 56, 72],
    }), 22));
    music_plus._click_rect = { x: 478, y: 398, w: 44, h: 40 };
    music_plus._click_action = "music-plus";
    scene.add_object(music_plus);
    _sui.push(music_plus);

    // GERİ: ana menüye dön
    const back = new DE.GameObject("Back", 340, 500, 220, 48, "UI");   // merkez 450: 340..560
    const back_btn = new DE.Button(DE.I18n.t("settings_back"), null, new DE.UITheme({
        button_bg: [52, 82, 130], button_hover: [68, 104, 162], button_press: [34, 56, 92],
        button_text: [240, 244, 252],
    }), 20);
    back.add_component(back_btn);
    back.add_component(new DE_GAME.KitLabelSync(back_btn, "settings_back"));
    back._click_rect = { x: 340, y: 500, w: 220, h: 48 };
    back._click_action = "back";
    scene.add_object(back);
    _sui.push(back);

    const ctrl = new DE.GameObject("SettingsFX", 0, 0, 0, 0, "UI");
    ctrl.add_component(new DE_GAME.SettingsController());
    scene.add_object(ctrl);

    scene._settings_ui = _sui;
    scene._menu_ui = _sui;   // SettingsController _settings_ui okur; menü sözleşmesi de korunur
    scene._hud_ui = [];

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
        this.is_ui = true;
        this.restart_factory = restart_factory;
        this._focused_index = 0;
        this._buttons = [];
        this._button_keys = [];
    }
    start() {
        const scene = DE.Engine.instance.active_scene;
        this._buttons = scene._gameover_buttons || [];
        for (let i = 0; i < this._buttons.length; i++) {
            this._buttons[i][0].focused = (i === this._focused_index);
        }
    }
    _retry() {
        DE.SoundFX.play("click");
        DE.Engine.switch_scene(this.restart_factory());
    }
    _to_menu() {
        DE.SoundFX.play("click");
        DE.Engine.switch_scene(DE_GAME.build_main_menu_scene());
    }
    update(dt) {
        // Dil değişimi buton metinlerini tazele (boyut sabit — KitLabelSync auto_size=false).
        if (DE.Input.get_key_down("T")) {
            for (let i = 0; i < this._button_keys.length; i++) {
                const [btn, key] = this._button_keys[i];
                btn.set_text(DE.I18n.t(key), null, false);
            }
        }
        // Klasik kısayollar (eski tuş düzeni korunur).
        if (DE.Input.get_key_down("R")) { this._retry(); return; }
        if (DE.Input.get_key_down("M")) { this._to_menu(); return; }

        const total = this._buttons.length;
        if (total === 0) return;
        if (DE.Input.get_key_down("DOWN") || DE.Input.get_key_down("S")) {
            this._focused_index = (this._focused_index + 1) % total;
            DE.SoundFX.play("click");
        } else if (DE.Input.get_key_down("UP") || DE.Input.get_key_down("W")) {
            this._focused_index = (this._focused_index - 1 + total) % total;
            DE.SoundFX.play("click");
        } else if (DE.Input.get_key_down("ENTER") || DE.Input.get_key_down("SPACE")) {
            const [btn, callback] = this._buttons[this._focused_index];
            if (callback) callback();
            return;
        }
        for (let i = 0; i < this._buttons.length; i++) {
            this._buttons[i][0].focused = (i === this._focused_index);
        }
    }
};

/* Oyun bitti ekranı: başlık + iki buton (Yeniden Dene / Ana Menü).
 * Klavye: R yeniden dener, M ana menü, ↑/↓ + ENTER gezinir; fareyle tıklanır. */
DE_GAME.build_game_over_scene = function build_game_over_scene(restart_factory) {
    const scene = new DE.Scene("Game Over", [20, 10, 15]);

    const theme = new DE.UITheme({
        panel_bg: [30, 18, 22], panel_border: [120, 60, 60],
        button_bg: [110, 45, 45], button_hover: [150, 60, 60],
        button_focus: [255, 220, 200], button_text: [255, 235, 235],
    });

    // Başlıklar — merkez semantiği (center_x + center_y): position = metnin ortası.
    const t1 = new DE.GameObject("T1", 450, 173, 0, 0, "UI");
    t1.add_component(new DE.TextRenderer(DE.I18n.t("game_over_title"), 46, [255, 60, 60], true, [0, 0, 0], true, true));
    t1.add_component(new DE_GAME.LocalizedLabel("game_over_title"));
    scene.add_object(t1);
    const t2 = new DE.GameObject("T2", 450, 227, 0, 0, "UI");
    t2.add_component(new DE.TextRenderer(DE.I18n.t("game_over_subtitle"), 24, [220, 180, 180], true, [0, 0, 0], true, true));
    t2.add_component(new DE_GAME.LocalizedLabel("game_over_subtitle"));
    scene.add_object(t2);

    const ctrl = new DE_GAME.GameOverController(restart_factory);

    // BUTON 1: Yeniden Dene (350..550, merkez 450)
    const retry_go = new DE.GameObject("GO_RETRY", 350, 290, 200, 46, "UI");
    const retry_btn = new DE.Button(DE.I18n.t("game_over_retry"), null, theme, 22);
    retry_go.add_component(retry_btn);
    retry_go.add_component(new DE_GAME.KitLabelSync(retry_btn, "game_over_retry"));
    scene.add_object(retry_go);

    // BUTON 2: Ana Menü
    const menu_go = new DE.GameObject("GO_MENU", 350, 350, 200, 46, "UI");
    const menu_btn = new DE.Button(DE.I18n.t("game_over_menu_btn"), null, theme, 22);
    menu_go.add_component(menu_btn);
    menu_go.add_component(new DE_GAME.KitLabelSync(menu_btn, "game_over_menu_btn"));
    scene.add_object(menu_go);

    retry_btn.on_click = ctrl._retry.bind(ctrl);
    menu_btn.on_click = ctrl._to_menu.bind(ctrl);
    scene._gameover_buttons = [[retry_btn, retry_btn.on_click], [menu_btn, menu_btn.on_click]];
    ctrl._button_keys = [[retry_btn, "game_over_retry"], [menu_btn, "game_over_menu_btn"]];

    // Kısayol ipucu satırı (eski [R]/[SPACE]/[M] tuş düzeni hâlâ çalışır).
    const hint = new DE.GameObject("GO_HINT", 450, 448, 0, 0, "UI");
    hint.add_component(new DE.TextRenderer(DE.I18n.t("game_over_hint"), 16, [200, 170, 170], true, [0, 0, 0], true, true));
    hint.add_component(new DE_GAME.LocalizedLabel("game_over_hint"));
    scene.add_object(hint);

    const ctrl_obj = new DE.GameObject("GameOverCtrl", 0, 0, 0, 0, "UI");
    ctrl_obj.add_component(ctrl);
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
    // Merkez semantiği: tüm satırlar x=450, center_x + center_y (kayma yok).
    const t1 = new DE.GameObject("Title1", 450, 148, 0, 0, "UI");
    t1.add_component(new DE.TextRenderer(DE.I18n.t("victory_title"), 36, [255, 220, 50], true, [0, 0, 0], true, true));
    scene.add_object(t1);
    const t2 = new DE.GameObject("Title2", 450, 222, 0, 0, "UI");
    t2.add_component(new DE.TextRenderer(DE.I18n.t("victory_subtitle"), 23, [200, 240, 255], true, [0, 0, 0], true, true));
    scene.add_object(t2);
    const t3 = new DE.GameObject("Title3", 450, 303, 0, 0, "UI");
    t3.add_component(new DE.TextRenderer(DE.I18n.t("victory_praise"), 26, [100, 255, 160], true, [0, 0, 0], true, true));
    scene.add_object(t3);
    const t4 = new DE.GameObject("Title4", 450, 420, 0, 0, "UI");
    t4.add_component(new DE.TextRenderer(DE.I18n.t("victory_restart"), 20, [180, 180, 210], true, [0, 0, 0], true, true));
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
                // auto_size=false: dil değişimi buton boyutunu bozmasın (200x46 sabit).
                btn.set_text(DE.I18n.t(key), null, false);
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
        // ESC burada işlenmez: yalnızca sahnenin on_escape'i (_resume) çağırır.
        // (Python PauseController.update paritesi — ESC motorda update'ten önce
        // işlendiği için burada tekrar bakılırsa pause aynı karede geri kapanır.)
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

    // Pause menüsü 900x600 canvas'ta MERKEZLENMİ�? (Python'da sol-yaslı 800 panel
    // vardı; tarayıcıda oynanınca sola kayık görünüyordu — kullanıcı düzeltmesi.
    // Python donmuş referans güncellenmez; kayıt _shared.md "şimdanlar" bölümünde.)
    const dim = new DE.GameObject("PauseDim", 0, 0, 900, 600, "UI");
    dim.add_component(new DE.Panel(theme, [10, 12, 20], null, 0, 150));
    scene.add_object(dim);

    const title = new DE.GameObject("PauseTitle", 450, 142, 0, 0, "UI");
    title.add_component(new DE.TextRenderer(DE.I18n.t("pause_title"), 44, [255, 220, 90], true, [0, 0, 0], true, true));
    title.add_component(new DE_GAME.LocalizedLabel("pause_title"));
    scene.add_object(title);

    const hint = new DE.GameObject("PauseHint", 450, 190, 0, 0, "UI");
    hint.add_component(new DE.TextRenderer(DE.I18n.t("pause_hint"), 16, [170, 185, 210], true, [0, 0, 0], true, true));
    hint.add_component(new DE_GAME.LocalizedLabel("pause_hint"));
    scene.add_object(hint);

    const pause_controller = new DE_GAME.PauseController();

    // 200px genişlik x=350 -> 350..550, merkez 450
    const resume = new DE.GameObject("ResumeBtn", 350, 240, 200, 46, "UI");
    const resume_button = new DE.Button(DE.I18n.t("pause_resume_btn"), pause_controller._resume.bind(pause_controller), theme, 22);
    resume.add_component(resume_button);
    scene.add_object(resume);

    const menu = new DE.GameObject("MenuBtn", 350, 306, 200, 46, "UI");
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

/* --- DOKUNMATİK KONTROLLER (mobil/tablet — itchio'da oynanabilirlik) ---
 * Yalnızca dokunmatik cihazlarda görünür + etkin (maxTouchPoints / ontouchstart).
 * Çizim ve giriş: HUD katmanı (is_ui), kamera/zoomdan bağımsız.
 * Sol alt: sanal joystick (yatay eksen -> A/D sanal tuşları; yukarı itme -> SPACE).
 * Sağ alt: üç buton — Zıpla (A, büyük, sağ altta), Ateş (X), Dash (B).
 * DE.Input.set_virtual_key_down/up üzerinden oyun kodu değişmeden çalışır:
 * PlayerController zaten get_horizontal_axis / get_key_down("SPACE|F|LSHIFT") okur.
 * Statik sayfada test edilemez (gereçli dokunma yok) — tarayıcıda canlı denenir. */
DE_GAME.TouchControls = class TouchControls extends DE.Component {
    constructor() {
        super();
        this.is_ui = true;
        this._active = false;
        this._enabled = true;
        this._cv = null;
        this._ctx = null;
        this._touches = {};            // throttle target
        // Joystick durumu
        this._joy = null;              // { id, x0, y0, x, y }
        this._joy_keys = {};           // A/D basılı durumu
        // Buton alanları (ekran uzayı 900x600)
        this._buttons = [
            { id: "jump", x: 780, y: 490, r: 62, label: "A", keys: ["SPACE", "W", "UP"] },
            { id: "fire", x: 640, y: 490, r: 56, label: "X", keys: ["F"] },
            { id: "dash", x: 860, y: 535, r: 50, label: "B", keys: ["LSHIFT"] },
        ];
        this._zone_joy = { x: 140, y: 430, r: 150 };   // sol alt joystick dokunma bölgesi
        this._btn_map = {};            // touch.identifier -> buton id (multi-touch)
        this._joy_pointer = null;      // touch.identifier (joystick aktif parmak)
    }
    start() {
        this._cv = DE.Engine.instance ? DE.Engine.instance.canvas : null;
        const nav = (typeof navigator !== "undefined") ? navigator : null;
        const coarse = nav && nav.maxTouchPoints && nav.maxTouchPoints > 0;
        const touch_api = (typeof window !== "undefined") && ("ontouchstart" in window);
        this._active = !!(coarse || touch_api);
        if (!this._active || !this._cv) return;
        this._ctx = this._cv.getContext ? this._cv.getContext("2d") : null;
        this._on_touch_start = this._on_touch_start.bind(this);
        this._on_touch_move = this._on_touch_move.bind(this);
        this._on_touch_end = this._on_touch_end.bind(this);
        this._cv.addEventListener("touchstart", this._on_touch_start, { passive: false });
        this._cv.addEventListener("touchmove", this._on_touch_move, { passive: false });
        this._cv.addEventListener("touchend", this._on_touch_end);
        this._cv.addEventListener("touchcancel", this._on_touch_end);
    }
    destroy() {
        this._release_all();
        if (this._cv) {
            this._cv.removeEventListener("touchstart", this._on_touch_start);
            this._cv.removeEventListener("touchmove", this._on_touch_move);
            this._cv.removeEventListener("touchend", this._on_touch_end);
            this._cv.removeEventListener("touchcancel", this._on_touch_end);
        }
        this._cv = null;
    }
    _canvas_pt(client) {
        if (!this._cv || typeof this._cv.getBoundingClientRect !== "function") {
            return { x: client.x, y: client.y };
        }
        const r = this._cv.getBoundingClientRect();
        const bl = this._cv.clientLeft || 0, bt = this._cv.clientTop || 0;
        const cw = this._cv.clientWidth || 1, ch = this._cv.clientHeight || 1;
        const sx = this._cv.width / cw, sy = this._cv.height / ch;
        return { x: (client.x - r.left - bl) * sx, y: (client.y - r.top - bt) * sy };
    }
    _point_in_circle(px, py, c) {
        const dx = px - c.x, dy = py - c.y;
        return (dx * dx + dy * dy) <= (c.r * c.r);
    }
    _button_at(px, py) {
        for (let i = 0; i < this._buttons.length; i++) {
            if (this._point_in_circle(px, py, this._buttons[i])) return this._buttons[i].id;
        }
        return null;
    }
    _on_touch_start(e) {
        if (!this._enabled) return;
        e.preventDefault();
        const touches = e.changedTouches || [];
        for (let i = 0; i < touches.length; i++) {
            const t = touches[i];
            const p = this._canvas_pt({ x: t.clientX, y: t.clientY });
            const btn = this._button_at(p.x, p.y);
            if (btn) {
                this._btn_map[t.identifier] = btn;
                this._press(btn);
            } else if (this._joy_pointer === null && this._point_in_circle(p.x, p.y, this._zone_joy)) {
                this._joy_pointer = t.identifier;
                this._joy = { x0: p.x, y0: p.y, x: p.x, y: p.y };
                this._update_joy_keys();
            }
        }
    }
    _on_touch_move(e) {
        if (!this._enabled) return;
        e.preventDefault();
        const touches = e.changedTouches || [];
        for (let i = 0; i < touches.length; i++) {
            const t = touches[i];
            if (this._joy_pointer === t.identifier && this._joy) {
                const p = this._canvas_pt({ x: t.clientX, y: t.clientY });
                this._joy.x = p.x; this._joy.y = p.y;
                this._update_joy_keys();
            }
        }
    }
    _on_touch_end(e) {
        const touches = e.changedTouches || [];
        for (let i = 0; i < touches.length; i++) {
            const t = touches[i];
            if (this._joy_pointer === t.identifier) {
                this._joy_pointer = null;
                this._release_joy();
            }
            const btn_id = this._btn_map[t.identifier];
            if (btn_id !== undefined) {
                delete this._btn_map[t.identifier];
                this._release(btn_id);
            }
        }
    }
    _press(id) {
        const b = this._buttons.find(x => x.id === id);
        if (!b) return;
        b.pressed = true;
        for (const k of b.keys) DE.Input.set_virtual_key_down(k);
    }
    _release(id) {
        const b = this._buttons.find(x => x.id === id);
        if (!b) return;
        b.pressed = false;
        for (const k of b.keys) DE.Input.set_virtual_key_up(k);
    }
    _update_joy_keys() {
        if (!this._joy) return;
        const dx = this._joy.x - this._joy.x0;
        const dy = this._joy.y - this._joy.y0;
        const dead = 18;
        const want_left = dx < -dead;
        const want_right = dx > dead;
        const want_up = dy < -dead;
        if (want_left && !this._joy_keys.left) { this._joy_keys.left = true; DE.Input.set_virtual_key_down("A"); }
        if (!want_left && this._joy_keys.left) { this._joy_keys.left = false; DE.Input.set_virtual_key_up("A"); }
        if (want_right && !this._joy_keys.right) { this._joy_keys.right = true; DE.Input.set_virtual_key_down("D"); }
        if (!want_right && this._joy_keys.right) { this._joy_keys.right = false; DE.Input.set_virtual_key_up("D"); }
        // Yukarı itme = zıpla (joystick üstüne) — sağ alt butona alternatif.
        if (want_up && !this._joy_keys.up) { this._joy_keys.up = true; DE.Input.set_virtual_key_down("SPACE"); }
        if (!want_up && this._joy_keys.up) { this._joy_keys.up = false; DE.Input.set_virtual_key_up("SPACE"); }
    }
    _release_joy() {
        if (!this._joy) return;
        if (this._joy_keys.left) { this._joy_keys.left = false; DE.Input.set_virtual_key_up("A"); }
        if (this._joy_keys.right) { this._joy_keys.right = false; DE.Input.set_virtual_key_up("D"); }
        if (this._joy_keys.up) { this._joy_keys.up = false; DE.Input.set_virtual_key_up("SPACE"); }
        this._joy_keys = {};
        this._joy = null;
    }
    release_held() {
        this._joy_keys = {};
        this._joy = null;
        this._joy_pointer = null;
        for (const id of Object.keys(this._btn_map)) this._release(this._btn_map[id]);
        this._btn_map = {};
        DE.Input.clear_virtual_keys();
    }
    _release_all() {
        this._joy = null;
        this._joy_pointer = null;
        for (const b of this._buttons) if (b.pressed) this._release(b.id);
        this._btn_map = {};
    }
    update(dt) {
        if (!this._active) return;
        // Sahne değişince bırakılmayan dokunuşları güvenli bırak (takılı tuş).
        if (!this.game_object || !this.game_object.active) this.release_held();
    }
    draw(ctx, camera_offset) {
        if (!this._active || !this._enabled) return;
        const w = ctx.canvas ? ctx.canvas.width : 900;
        const h = ctx.canvas ? ctx.canvas.height : 600;
        ctx.save();
        ctx.globalAlpha = 0.16;
        // Joystick taban dairesi
        ctx.beginPath();
        ctx.arc(this._zone_joy.x, this._zone_joy.y, this._zone_joy.r, 0, Math.PI * 2);
        ctx.fillStyle = "#ffffff";
        ctx.fill();
        ctx.restore();
        ctx.save();
        ctx.globalAlpha = 0.5;
        ctx.strokeStyle = "#e8f0ff";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(this._zone_joy.x, this._zone_joy.y, this._zone_joy.r - 8, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
        // Joystick aktif ise topuz çiz
        if (this._joy) {
            const bx = this._zone_joy.x + Math.max(-this._zone_joy.r + 20, Math.min(this._zone_joy.r - 20, this._joy.x - this._joy.x0));
            const by = this._zone_joy.y + Math.max(-this._zone_joy.r + 20, Math.min(this._zone_joy.r - 20, this._joy.y - this._joy.y0));
            ctx.beginPath();
            ctx.arc(bx, by, 42, 0, Math.PI * 2);
            ctx.fillStyle = "rgba(220,235,255,0.55)";
            ctx.fill();
            ctx.strokeStyle = "#ffffff";
            ctx.lineWidth = 3;
            ctx.stroke();
            ctx.strokeStyle = "rgba(255,255,255,0.5)";
            ctx.beginPath();
            ctx.moveTo(this._zone_joy.x, this._zone_joy.y);
            ctx.lineTo(bx, by);
            ctx.stroke();
        }
        // Buton daireleri
        for (const b of this._buttons) {
            const r = b.r;
            ctx.beginPath();
            ctx.arc(b.x, b.y, r, 0, Math.PI * 2);
            if (b.pressed) {
                ctx.fillStyle = "rgba(170,230,255,0.5)";
                ctx.fill();
                ctx.strokeStyle = "#ffffff";
                ctx.lineWidth = 3;
            } else {
                ctx.fillStyle = "rgba(255,255,255,0.14)";
                ctx.fill();
                ctx.strokeStyle = "rgba(230,240,255,0.6)";
                ctx.lineWidth = 2;
            }
            ctx.stroke();
            ctx.font = "26px monospace";
            ctx.fillStyle = "rgba(240,248,255,0.9)";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(b.label, b.x, b.y + 1);
            ctx.textAlign = "start";
            ctx.textBaseline = "alphabetic";
        }
    }
};