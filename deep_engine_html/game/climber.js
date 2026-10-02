/* STAR CLIMBER — Icy Tower tarzı sonsuz yukarı tırmanma (oyun katmanı).
 *
 * Python game/climber.py'nin birebir JS aynası: sabitler, oynanış, sıralama ve
 * metinler aynıdır. Görseller kodla çizilir (resim dosyası yok).
 */
"use strict";

/* --- Sabitler (Python game/climber.py ile birebir aynı olmalı) --- */
const SCREEN_W = 900;
const SCREEN_H = 600;
const START_Y = 520.0;             // 0. katmanın üst yüzeyi
const BASE_GAP = 62.0;             // ilk katmanlar arası dikey mesafe
const GAP_GROWTH = 0.9;            // her katmanda boşluk biraz artar
const GAP_MAX_ADD = 26.0;
const AHEAD = 16;                  // oyuncunun üstünde kaç katman önceden üretilir
const BOUNCE = 880.0;              // sekiş gücü
const PLAYER_W = 30.0, PLAYER_H = 40.0;
const BASE_SPEED = 250.0;
const SPEED_PER_LEVEL = 0.16;      // her seviye için %16 hız
const MAX_LEVEL = 5;
const LEVEL_HOLD = 2.6;
const LEVEL_DECAY = 2.0;
const CHECKPOINT_EVERY = 10;
const BREAK_CHANCE = 0.28;
const DEATH_MARGIN = 80.0;
const PLATFORM_H = 14.0;
const PLATFORM_MIN_W = 96.0;
const PLATFORM_MAX_W = 150.0;
const CHECKPOINT_W = 220.0;
const SIDE_MARGIN = 24.0;
// Ulaşılabilirlik: ardışık katmanlar arası en az yatay örtüşme (px).
// Oyuncu yerinde kalsa bile bir üst kata geçebilsin diye zorunlu.
const REACH_OVERLAP = 70.0;
const FREE_CLIMB = 8;      // bu kata kadar katmanlar oyuncunun sütununda kalır
const FLOOR_LINE = 0.72;   // ulaşılan katman ekranın %72'sine çizilir
const PLAYER_TOP_MARGIN = 96.0;   // oyuncunun başı bu satırın üstüne çıkmaz

function shade(rgb, k) {
    return [
        Math.max(0, Math.min(255, Math.round(rgb[0] * k))),
        Math.max(0, Math.min(255, Math.round(rgb[1] * k))),
        Math.max(0, Math.min(255, Math.round(rgb[2] * k))),
    ];
}

const COL_SOLID = [110, 190, 255];
const COL_CHECKPOINT = [120, 255, 180];
const COL_BREAKABLE = [255, 170, 90];
const COL_CRACK = [255, 120, 90];
const COL_BG = [14, 16, 34];
const COL_PLAYER = [255, 235, 140];

// Katman yükseklikleri önbellekli
const _FLOOR_Y = [START_Y];

function floor_gap(index) {
    return Math.min(BASE_GAP + GAP_GROWTH * Math.max(0, index), BASE_GAP + GAP_MAX_ADD);
}
function floor_y(index) {
    if (index < 0) return START_Y;
    while (_FLOOR_Y.length <= index) {
        _FLOOR_Y.push(_FLOOR_Y[_FLOOR_Y.length - 1] - floor_gap(_FLOOR_Y.length - 1));
    }
    return _FLOOR_Y[index];
}
function reset_floor_cache() {
    _FLOOR_Y.length = 1;
    _FLOOR_Y[0] = START_Y;
}
/* Python climber.py modul fonksiyonlarinin DE_GAME uzerinden disa acilmis
 * halleri (parite: testler/konsol modul seviyesinde cagirabilmeli). */
DE_GAME.floor_gap = floor_gap;
DE_GAME.floor_y = floor_y;
DE_GAME.reset_floor_cache = reset_floor_cache;

/* --- 0..1 deterministik rastgelelik (Python random.Random yerine) --- */
function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
        a = (a + 0x6D2B79F5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/* --- Tek yönlü, geri seken (kırılabilir) platform katmanı --- */
DE_GAME.ClimbPlatform = class ClimbPlatform extends DE.Component {
    constructor(floor_index = 0, hits_to_break = 0, checkpoint = false, bounce = BOUNCE, game = null) {
        super();
        this.floor_index = floor_index;
        this.hits_to_break = hits_to_break;      // 0 = hiç kırılmaz
        this.checkpoint = checkpoint;
        this.bounce = bounce;
        this.game = game;
        this.hits = 0;
        this._cooldown = 0.0;
        this._base_color = null;
    }
    start() {
        const sprite = this.game_object.get_component(DE.SpriteRenderer);
        if (sprite) this._base_color = sprite.color.slice();
    }
    update(dt) {
        if (this._cooldown > 0.0) this._cooldown -= dt;
    }
    on_collision(other) {
        // Oyuncu ÜSTTEN düşüyorsa sektir (alttan geçişte sekiş olmaz).
        if (other.tag !== "Player" || !this.game_object.active) return;
        const rb = other.get_component(DE.Rigidbody2D);
        if (!rb || this._cooldown > 0.0) return;
        if (rb.velocity.y < 0) return;          // yukarı sekiş: içinden geçiyor
        const feet = other.position.y + other.size.y;
        if (feet > this.game_object.position.y + 18.0) return;   // yandan değdi
        this._cooldown = 0.12;
        this._bounce(other, rb);
    }
    _bounce(player, rb) {
        rb.velocity.y = -this.bounce;
        rb.is_grounded = false;
        this.hits += 1;
        // Çatlak görseli: her isabet kırılma rengine doğru koyulaşır
        if (this._base_color && this.hits_to_break > 0) {
            const sprite = this.game_object.get_component(DE.SpriteRenderer);
            if (sprite) {
                const k = Math.min(1.0, this.hits / this.hits_to_break);
                sprite.color = this._base_color.map((c, i) =>
                    Math.round(c + (COL_CRACK[i] - c) * k));
            }
        }
        if (DE.SoundFX && DE.SoundFX.play) DE.SoundFX.play("jump");
        const pe = player.get_component(DE.ParticleEmitter);
        if (pe) pe.burst(12, COL_SOLID, [60, 170], [2, 5], [0.25, 0.5], 120, [PLAYER_W / 2, PLAYER_H]);
        if (this.game) this.game.on_platform_bounce(this, player);
        if (this.hits_to_break > 0 && this.hits >= this.hits_to_break) this._break();
    }
    _break() {
        // Platform kırılır → delik oluşur. Motorun BreakablePlatform işi yapar.
        const bp = this.game_object.get_component(DE.BreakablePlatform);
        if (bp) bp.smash();
        else {
            this.game_object.active = false;
            if (DE.SoundFX && DE.SoundFX.play) DE.SoundFX.play("break");
        }
    }
    /* --- Çizim: düz kutu yerine "kiriş" görünümlü katman (Python draw eşi) --- */
    draw(ctx, camera_offset) {
        if (!this.game_object.active) return;
        const obj = this.game_object;
        const x = Math.round(obj.position.x - (camera_offset ? camera_offset.x : 0));
        const y = Math.round(obj.position.y - (camera_offset ? camera_offset.y : 0));
        const w = Math.round(obj.size.x), h = Math.round(obj.size.y);
        if (w <= 0 || h <= 0 || !ctx) return;
        const base = this._base_color || COL_SOLID;
        const top = this.checkpoint ? COL_CHECKPOINT : base;
        const prev = ctx.fillStyle;
        const r = (px, py, pw, ph, rgb) => {
            if (pw <= 0 || ph <= 0) return;
            ctx.fillStyle = "rgb(" + rgb[0] + "," + rgb[1] + "," + rgb[2] + ")";
            ctx.fillRect(px, py, pw, ph);
        };
        r(x, y + h - 3, w, 3, shade(base, 0.35));          // alt gölge
        r(x, y, 2, h, shade(top, 1.18));                    // sol pah
        r(x + w - 2, y, 2, h, shade(top, 0.62));            // sağ pah
        r(x, y, w, 4, shade(top, 1.30));                    // üst yüzey (basılan yer)
        r(x, y + 4, w, 2, shade(top, 0.92));
        if (this.checkpoint) {
            r(x, y + 6, w, 3, COL_CHECKPOINT);
            r(x + w - 26, y - 16, 2, 16, [200, 220, 230]);   // flama direği
            r(x + w - 24, y - 16, 22, 10, COL_CHECKPOINT);  // flama
        }
        if (this.hits_to_break > 0) {
            const k = Math.min(1.0, this.hits / this.hits_to_break);
            const n = 1 + Math.round(k * 3);
            ctx.fillStyle = "rgb(" + COL_CRACK.join(",") + ")";
            for (let i = 0; i < n; i++) {
                const cx = x + Math.round(w * (0.25 + 0.5 * (i / 3.0)));
                ctx.fillRect(cx, y + 2, 2, h - 5);
            }
        }
        ctx.fillStyle = prev;
    }
};

/* --- Bina cephesi: yan duvarlar + kat ayraçları (derinlik) --- */
DE_GAME.ClimbBackdrop = class ClimbBackdrop extends DE.Component {
    draw(ctx, camera_offset) {
        if (!ctx) return;
        const w = (ctx.canvas ? ctx.canvas.width : SCREEN_W);
        const h = (ctx.canvas ? ctx.canvas.height : SCREEN_H);
        const camY = camera_offset ? camera_offset.y : 0;
        const m = SIDE_MARGIN;
        const prev = ctx.fillStyle;
        const r = (px, py, pw, ph, rgb) => {
            ctx.fillStyle = "rgb(" + rgb.join(",") + ")";
            ctx.fillRect(px, py, pw, ph);
        };
        r(0, -camY, m, h, [22, 26, 48]);                    // sol duvar
        r(w - m, -camY, m, h, [22, 26, 48]);                // sağ duvar
        r(m - 2, -camY, 2, h, [46, 56, 92]);                // iç kenar
        r(w - m, -camY, 2, h, [46, 56, 92]);
        // kat ayraçları
        const STOREY = 78;
        let yy = Math.floor((camY - h) / STOREY) * STOREY;
        const limit = camY + h * 2;
        while (yy < limit) {
            const sy = Math.round(yy - camY);
            if (sy >= -2 && sy <= h + 2) r(m, sy, w - 2 * m, 1, [24, 28, 54]);
            yy += STOREY;
        }
        ctx.fillStyle = prev;
    }
};

/* --- Yatay hareket + hız kombisi (zıplama yok: platformlar sektirir) --- */
DE_GAME.ClimberPlayer = class ClimberPlayer extends DE.Component {
    constructor(speed = BASE_SPEED) {
        super();
        this.speed = speed;
        this.rb = null;
        this.level = 0;                 // Icy Tower hız seviyesi
        this._level_timer = 0.0;
        this.facing = 1;
    }
    start() {
        this.rb = this.game_object.get_component(DE.Rigidbody2D);
    }
    get speed_mult() {
        return 1.0 + SPEED_PER_LEVEL * this.level;
    }
    update(dt) {
        if (!this.rb) {
            this.rb = this.game_object.get_component(DE.Rigidbody2D);
            if (!this.rb) return;
        }
        const move_x = DE.Input.get_horizontal_axis();
        if (move_x !== 0) this.facing = move_x > 0 ? 1 : -1;
        this.rb.velocity.x = move_x * this.speed * this.speed_mult;
        // Kenar kelepçesi: kule dışına çıkma (düşey hareket serbest)
        if (this.game_object.position.x < 0.0) {
            this.game_object.position.x = 0.0;
            this.rb.velocity.x = 0.0;
        } else if (this.game_object.position.x > SCREEN_W - PLAYER_W) {
            this.game_object.position.x = SCREEN_W - PLAYER_W;
            this.rb.velocity.x = 0.0;
        }
        // Hız seviyesi zamanla söner
        if (this.level > 0) {
            this._level_timer -= dt;
            if (this._level_timer <= 0.0) {
                this.level -= 1;
                this._level_timer = LEVEL_DECAY;
            }
        }
    }
    add_level() {
        if (this.level < MAX_LEVEL) this.level += 1;
        this._level_timer = LEVEL_HOLD;
    }
    reset_level() {
        this.level = 0;
        this._level_timer = 0.0;
    }
};

/* --- Sonsuz tırmanma döngüsü: katman üretimi, skor, kamera, düşme-kurtarma --- */
DE_GAME.ClimbGame = class ClimbGame extends DE.Component {
    constructor(scene = null, seed = null) {
        super();
        // Python: random.Random(seed). JS'te eşdeğer deterministik üreteç.
        this.rand = mulberry32(seed === null || seed === undefined
            ? Math.floor(Math.random() * 4294967296) : seed);
        this.scene = scene;
        this.player = null;
        this.ctrl = null;
        this.floors = {};               // index -> GameObject
        this.top_index = 0;
        this.max_floor = 0;        // ulaşılan en yüksek katman (kamera referansı)
        this.best_floor = 0;       // rekor katman (skor; düşünce silinmez)
        this.checkpoint_floor = 0;
        this.score = 0;
        this.falls = 0;
        this._cam_y = 0.0;
        this.hud = null;
        this.speed_hud = null;
    }
    _uniform(lo, hi) { return lo + this.rand() * (hi - lo); }

    start() {
        if (!this.scene) {
            this.scene = DE.Engine.instance ? DE.Engine.instance.active_scene : null;
        }
        if (!this.scene) return;
        this.player = this.scene.find_by_tag("Player");
        if (!this.player) return;
        this.ctrl = this.player.get_component(DE_GAME.ClimberPlayer);
        this.hud = this.scene.find_by_tag("ClimbHUD");
        this.speed_hud = this.scene.find_by_tag("ClimbSpeed");
        this._cam_y = this.scene.camera_position.y;
        this._last_floor_rect = null;   // bir önceki katmanın (x, w) kutusu
        for (let i = 0; i <= AHEAD; i++) this._build_floor(i);
        this.top_index = AHEAD;
        this._update_hud();
    }
    // Platformun oyuncunun sütununu TAMAMEN kapsadığı x aralığı
// (Python _player_column_range ile aynı): [x, x+w] ⊇ [pl, pr] ⇔ pr-w <= x <= pl
_player_column_range(w) {
    if (!this.player) return null;
    const pl = this.player.position.x;
    const pr = pl + this.player.size.x;
    const lo = Math.max(SIDE_MARGIN, pr - w);
    const hi = Math.min(pl, SCREEN_W - SIDE_MARGIN - w);
    return (lo <= hi) ? [lo, hi] : null;
}
// Katman x konumu — ulaşılabilirlik kuralları (Python _place_floor_x).
//  Kural 1: ilk kule katmanı (index 1) oyuncunun üstünü kapsar.
//  Kural 2: ardışık katmanlar en az REACH_OVERLAP kadar örtüşür.
//  Kural 3: FREE_CLIMB boyunca katman oyuncunun sütununda kalır → kule sürüklenmez.
_place_floor_x(index, w, checkpoint) {
    let lo = SIDE_MARGIN;
    let hi = Math.max(SIDE_MARGIN, SCREEN_W - SIDE_MARGIN - w);
    const prev = (index > 1) ? this._last_floor_rect : null;
    if (index === 1) {
        const col = this._player_column_range(w);
        if (col) { lo = col[0]; hi = col[1]; }
    } else if (prev) {
        const px = prev[0], pw = prev[1];
        // Örtüşme = min(px+pw, x+w) - max(px, x) >= REACH_OVERLAP
        lo = Math.max(lo, px + REACH_OVERLAP - w);
        hi = Math.min(hi, px + pw - REACH_OVERLAP);
    }
    if (index <= FREE_CLIMB && !checkpoint) {
        const col = this._player_column_range(w);
        if (col) { lo = Math.max(lo, col[0]); hi = Math.min(hi, col[1]); }
    }
    if (lo <= hi) return this._uniform(lo, hi);
    return Math.max(SIDE_MARGIN, Math.min(hi, SCREEN_W - SIDE_MARGIN - w));
}

    _build_floor(index) {
        // Python _build_floor ile aynı: 0. katman oyuncunun altında olduğu garanti
        // geniş başlangıç zemini (ilk karede boşluğa düşme olmaz).
        const checkpoint = (index > 0 && index % CHECKPOINT_EVERY === 0);
        let w, x;
        if (index === 0) {
            w = SCREEN_W - 2 * SIDE_MARGIN;
            x = SIDE_MARGIN;
        } else if (checkpoint) {
            w = CHECKPOINT_W;
            x = this._place_floor_x(index, w, checkpoint);
        } else {
            w = this._uniform(PLATFORM_MIN_W, PLATFORM_MAX_W);
            x = this._place_floor_x(index, w, checkpoint);
        }
        let hits_to_break = 0;
        if (index >= 3 && !checkpoint && this.rand() < BREAK_CHANCE) hits_to_break = 1;
        const color = checkpoint ? COL_CHECKPOINT : (hits_to_break ? COL_BREAKABLE : COL_SOLID);
        const obj = new DE.GameObject("Floor" + index, x, floor_y(index), w, PLATFORM_H, "ClimbFloor");
        obj.add_component(new DE.SpriteRenderer(color, "rect", 5));
        obj.add_component(new DE.BoxCollider(false, true));   // one_way: alttan geçilir
        obj.add_component(new DE.ParticleEmitter());
        obj.add_component(new DE_GAME.ClimbPlatform(index, hits_to_break, checkpoint,
            BOUNCE - Math.min(120.0, index * 2.0), this));
        if (hits_to_break > 0) {
            // Motorun kırılabilir platform bileşeni de eklenir: kırılma işini o yapar.
            obj.add_component(new DE.BreakablePlatform(hits_to_break));
        }
        this.scene.add_object(obj);
        this.floors[index] = obj;
        this._last_floor_rect = [x, w];
        return obj;
    }

    update(dt) {
        if (!this.player) {
            this.start();
            if (!this.player) return;
        }
        this._pump_bounce();
        this._generate_ahead();
        this._track_camera(dt);
        this._check_fall();
    }
    // Zeminde duran oyuncuyu sektirir (Python _pump_bounce ile aynı).
    // Gerekçe: motorun "stable ground" adımı çarpışma bildiriminden ÖNCE
    // oyuncuyu platformun üstüne yapıştırıp velocity.y=0 yapar; one_way
    // platformlarda bu yüzden overlap_check hiç True olmaz ve on_collision'a
    // güvenilemez. Icy Tower'da oyuncu zemine her değdiğinde seker.
    _pump_bounce() {
        if (!this.ctrl) return;
        let rb = this.ctrl.rb;
        if (!rb) {
            rb = this.player.get_component(DE.Rigidbody2D);
            this.ctrl.rb = rb;
            if (!rb) return;
        }
        if (!rb.is_grounded) return;
        const feet = this.player.position.y + this.player.size.y;
        const px = this.player.position.x;
        const idx = this.player_floor();
        for (const cand of [idx, idx - 1, idx + 1]) {
            if (cand < 0) continue;
            const comp = this._floor_component(cand);
            if (!comp || !comp.game_object.active) continue;
            const fobj = comp.game_object;
            if (px + this.player.size.x <= fobj.position.x || px >= fobj.position.x + fobj.size.x) continue;
            if (Math.abs(feet - fobj.position.y) > 6.0) continue;
            if (comp._cooldown > 0.0) continue;
            comp._bounce(this.player, rb);
            return;
        }
    }
    _floor_component(index) {
        const fobj = this.floors[index];
        if (!fobj || !fobj.active) return null;
        return fobj.get_component(DE_GAME.ClimbPlatform);
    }
    _generate_ahead() {
        const current = this.player_floor();
        while (this.top_index < current + AHEAD) {
            this.top_index += 1;
            this._build_floor(this.top_index);
        }
    }
    player_floor() {
        // Python player_floor ile aynı: ayakların üstünde kalan en yüksek katman.
        const feet = this.player.position.y + this.player.size.y;
        let i = Math.min(this.top_index, Math.max(0, _FLOOR_Y.length - 1));
        while (i > 0 && floor_y(i) < feet - 2.0) i -= 1;
        return i;
    }
    on_platform_bounce(platform) {
        if (this.ctrl) this.ctrl.add_level();
        if (platform.floor_index > this.max_floor) {
            this.max_floor = platform.floor_index;
            if (platform.floor_index > this.best_floor) this.best_floor = platform.floor_index;
            if (platform.checkpoint) this.checkpoint_floor = platform.floor_index;
        }
        // Skor: KAYIT katman başına 10 + hız seviyesi bonusu
        const level = this.ctrl ? this.ctrl.level : 0;
        this.score = this.best_floor * 10 + level * 5;
        this._update_hud();
    }
    _camera_anchor_y() {
        return floor_y(Math.max(this.max_floor, this.checkpoint_floor));
    }
    _track_camera(dt) {
        // Kamera SADECE yukarı gider ve YALNIZCA yeni katmana inildiğinde yükselir.
        // Zıplama tepesine takılırsa oyuncu kendi katmanının ekran dışına düşer ve
        // her sekişte aynı yerde ölür; Icy Tower'da da kamera yeni katmana
        // inince kayar.
        let want = this._camera_anchor_y() - SCREEN_H * FLOOR_LINE;
        // Oyuncu BAŞI ekranın üstüne çıkmasın (sekiş tepesi ≈390px > 372px).
        if (this.player) {
            const keep = this.player.position.y - PLAYER_TOP_MARGIN;
            if (keep < want) want = keep;
        }
        if (want < this._cam_y) {
            this._cam_y += (want - this._cam_y) * Math.min(dt * 9.0, 1.0);
        }
        this.scene.camera_position.x = 0.0;
        this.scene.camera_position.y = this._cam_y;
    }
    _check_fall() {
        // Zeminde duran oyuncu ÖLMEZ: kamera yalnız yukarı gittiği için oyuncu
        // sağlam bir katmanın üstündeyken ekran altında kalabilir.
        const bottom = this.scene.camera_position.y + SCREEN_H + DEATH_MARGIN;
        if (this.player.position.y <= bottom) return;
        if (this._standing_on_floor()) return;
        this.respawn();
    }
    _standing_on_floor() {
        if (this.ctrl && this.ctrl.rb && this.ctrl.rb.is_grounded) return true;
        const feet = this.player.position.y + this.player.size.y;
        const px = this.player.position.x;
        const idx = this.player_floor();
        for (const cand of [idx, idx - 1, idx + 1]) {
            if (cand < 0) continue;
            const comp = this._floor_component(cand);
            if (!comp) continue;
            const fobj = comp.game_object;
            if (px + this.player.size.x <= fobj.position.x || px >= fobj.position.x + fobj.size.x) continue;
            if (Math.abs(feet - fobj.position.y) <= 10.0) return true;
        }
        return false;
    }
    respawn() {
        const idx = this.checkpoint_floor > 0 ? this.checkpoint_floor : 0;
        let floor = this.floors[idx];
        if (!floor || !floor.active) floor = this._build_floor(idx);
        this.player.position.x = Math.min(Math.max(0.0,
            floor.position.x + floor.size.x / 2 - PLAYER_W / 2), SCREEN_W - PLAYER_W);
        this.player.position.y = floor.position.y - PLAYER_H;
        const rb = this.player.get_component(DE.Rigidbody2D);
        if (rb) {
            rb.velocity.x = 0.0; rb.velocity.y = 0.0; rb.is_grounded = false;
        }
        if (this.ctrl) this.ctrl.reset_level();
        // Düşünce yükseklik ilerlemesi sıfırlanır (Icy Tower): kamera eski
        // katmana çekilip oyuncuyu anında öldürürdü. Rekor (best_floor) korunur.
        this.max_floor = idx;
        this.checkpoint_floor = Math.min(this.checkpoint_floor, idx);
        this._cam_y = floor_y(idx) - SCREEN_H * 0.62;
        this.scene.camera_position.y = this._cam_y;
        this.scene.add_shake(0.25);
        this.falls += 1;
        if (DE.SoundFX && DE.SoundFX.play) DE.SoundFX.play("hit");
    }
    _update_hud() {
        if (this.hud) {
            const tr = this.hud.get_component(DE.TextRenderer);
            if (tr) tr.text = DE.I18n.localize("climber_hud",
                { floor: this.best_floor, score: this.score });
        }
        if (this.speed_hud && this.ctrl) {
            const tr = this.speed_hud.get_component(DE.TextRenderer);
            if (tr) tr.text = DE.I18n.localize("climber_speed",
                { mult: this.ctrl.speed_mult.toFixed(2) });
        }
    }
};

function _climber_make_player(scene) {
    const player = new DE.GameObject("Player", SCREEN_W / 2 - PLAYER_W / 2,
        START_Y - PLAYER_H, PLAYER_W, PLAYER_H, "Player");
    player.add_component(new DE.SpriteRenderer(COL_PLAYER, "rect", 6));
    player.add_component(new DE.BoxCollider(false, false));
    player.add_component(new DE.Rigidbody2D(980.0, true, 1600.0));
    player.add_component(new DE.ParticleEmitter());
    player.add_component(new DE_GAME.ClimberPlayer());
    scene.add_object(player);
    return player;
}

DE_GAME.build_climber_scene = function (seed = null) {
    // Python build_climber_scene eşi: oyun kamerası elle sürülür (yalnızca yukarı).
    const scene = new DE.Scene("Star Climber", COL_BG);
    scene.camera_manual = true;
    // ESC -> ana menü (motor ESC'yi sahne alırsa oyun kapanmaz)
    scene.on_escape = function () {
        try { DE_GAME.state.game_mode = "menu"; } catch (e) { /* yok say */ }
        DE.Engine.switch_scene(DE_GAME.build_main_menu_scene());
        return true;
    };
    const bg = new DE.GameObject("ClimbBackdrop", 0, 0, 0, 0, "ClimbBackdrop");
    bg.add_component(new DE_GAME.ClimbBackdrop());
    scene.add_object(bg);
    _climber_make_player(scene);
    const hud = new DE.GameObject("ClimbHUD", SCREEN_W / 2, 22, 0, 0, "ClimbHUD");
    hud.add_component(new DE.TextRenderer(
        DE.I18n.localize("climber_hud", { floor: 0, score: 0 }), 26,
        [255, 240, 170], true, [0, 0, 0], true));
    scene.add_object(hud);
    const speed = new DE.GameObject("ClimbSpeed", SCREEN_W / 2, 54, 0, 0, "ClimbSpeed");
    speed.add_component(new DE.TextRenderer(
        DE.I18n.localize("climber_speed", { mult: "1.00" }), 18,
        [140, 220, 255], true, [0, 0, 0], true));
    scene.add_object(speed);
    const hint = new DE.GameObject("ClimbHint", SCREEN_W / 2, SCREEN_H - 16, 0, 0, "ClimbHint");
    hint.add_component(new DE.TextRenderer(
        DE.I18n.localize("climber_hint", {}), 15,
        [120, 140, 180], true, [0, 0, 0], true));
    scene.add_object(hint);
    const game = new DE.GameObject("ClimbGame", 0, 0, 0, 0, "ClimbGame");
    game.add_component(new DE_GAME.ClimbGame(scene, seed));
    scene.add_object(game);
    scene.start();
    return scene;
};

// Konsol/Developer API'ye aç (Python game/commands.py eşiyle uyum için)
DE_GAME.build_climber = DE_GAME.build_climber_scene;