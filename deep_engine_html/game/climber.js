/* STAR CLIMBER — Icy Tower tok kokulu sonsuz yukarı tırmanma (oyun katmanı).
 *
 * PLANETARY NOTE (06.10.2026): Bu dosya artık Python game/climber.py'nin birebir
 * aynası DEĞİL — kullanıcı kararıyla bilinçli sapma (JS birincil):
 *   - OTOMATİK SEKİŞ KALKTI → manuel SPACE/W/↑ zıplama (coyote+buffer).
 *   - KAMERA OYNANİŞ İSTEMİ: sürekli sabit hızla yükselen kamera (CAM_SPEED);
 *     oyuncu buna yetişmek zorunda, alt çizgiye düşerse yeniden başlar.
 *   - YÜKSEKLİK SKILL: DOUBLE_JUMP_FLOOR katmanına ulaşınca "Çift Zıplama"
 *     pop-up ile açılır; sonraki katmanlar çift zıplama gerektirecek kadar açılır.
*  - CHECKPOINT YOK: respawn 0. katmana döner; rekor (best_floor/skor) korunur.
 *  - KIRILABİLİR KATMAN: üstünde BEKLEYİNCE kırılır (sekiş yok artık).
 *  - KULLANICI GERİ BİLDİRİMİ (08.10.2026, v2): DİKENLER KALDIRILDI (adil olmuyor,
 *    ölüm döngüsü doğuruyordu). Kule artık YATAY HAREKET İSTER: NO-STACK güçlü
 *    zig-zag (merkezler ~70px sallanır), FREE_CLIMB 3 kata indi. Ölüm döngüsü
 *    yumuşatıldı (kamera hız tavanı 1.5, çift zıplama boşluk tavanı 52px, ölüm payı
 *    140px). Arka plan GRID'SİZ pürüzsüz biyom arazi (tümsek tepeler + gradyan).
 *  Python'da bu özellikler eklenmeyecek (dondurulmuş referans).
 *   Görseller yine kodla çizilir (resim dosyası yok).
 */
"use strict";

/* --- Sabitler (Python game/climber.py'den bilinçli ayrışanlar not düşüldü) --- */
const SCREEN_W = 900;
const SCREEN_H = 600;
const START_Y = 520.0;             // 0. katmanın üst yüzeyi
const BASE_GAP = 78.0;             // ilk katmanlar arası dikey mesafe (tek zıplama ile aşılır)
const GAP_GROWTH = 1.5;            // her katmanda boşluk artar
const GAP_MAX_ADD = 40.0;          // tek zıplama bölgesinde en geniş ek boşluk
const DOUBLE_JUMP_FLOOR = 8;       // bu katmana ulaşınca çift zıplama skill'i açılır
const DOUBLE_GAP_PER = 8.0;        // skill sonrası her katmanda ek boşluk (çift zıplama ister)
const DOUBLE_GAP_CAP = 52.0;       // ... üst sınırı (v2: 60 → 52, daha adil)
const AHEAD = 16;                  // oyuncunun üstünde kaç katman önceden üretilir
const JUMP_FORCE = 640.0;          // manuel zıplama gücü (yükselen kameraya yetişmek için)
const DOUBLE_JUMP_FORCE = 0.86;    // çift zıplama güç oranı (ilk sekişe göre)
const COYOTE_TIME = 0.10;          // platformdan çıkınca zıplama penceresi
const JUMP_BUFFER = 0.10;          // yere inmeden az önce basılan zıplama affı
const CAM_SPEED = 66.0;            // kamera TABAN yükselme hızı (px/sn); max_floor arttıkça hızlanır
const CAM_BOOST_PER = 0.008;       // her katmanda kamera hızına eklenen çarpan (v2: 0.012 → 0.008)
const CAM_BOOST_CAP = 1.5;         // kamera hız çarpanı tavanı (v2: 1.8 → 1.5 — ölüm döngüsü azalır)
const PLAYER_W = 30.0, PLAYER_H = 40.0;
const BASE_SPEED = 250.0;
const SPEED_PER_LEVEL = 0.16;      // her zıplama seviyesi için %16 hız
const MAX_LEVEL = 5;
const LEVEL_DECAY = 1.6;           // zıplama seviyesi sönme süresi
const BREAK_CHANCE = 0.18;         // kırılabilir katman oranı
const BREAK_WAIT = 0.45;           // kırılabilir katman üstünde beklenince kırılma
const DEATH_MARGIN = 140.0;        // v2: 80 → 140 — alt çizgi geç yükselir, kurtuluş şansı var
const PLATFORM_H = 14.0;
const PLATFORM_MIN_W = 96.0;       // örtüşme ağırlıklandırması için referans genişlik
const PLATFORM_MAX_W = 150.0;
const SIDE_MARGIN = 24.0;
// Zorluk (09. katmandan itibaren): HARD_FROM üstünde her katman
// tek bir "zorluk modu" alabilir — dar ya da hareketli.
const HARD_FROM = DOUBLE_JUMP_FLOOR + 1;   // 9. katmandan itibaren kule zorlaşır
const MOVE_CHANCE = 0.30;          // HARD_FROM üstünde hareketli katman oranı
const MOVE_RANGE_MIN = 36, MOVE_RANGE_MAX = 70;   // yatay salınım genliği (px)
const MOVE_SPEED_MIN = 0.9, MOVE_SPEED_MAX = 1.9; // salınım hızı (rad/sn)
const NARROW_CHANCE = 0.24;        // HARD_FROM üstünde dar katman oranı
const NARROW_W_MIN = 54, NARROW_W_MAX = 76;       // dar katman genişliği
const SPIKE_CHANCE = 0.0;          // DİKENLER KALDIRILDI (08.10.2026 v2): haksız
const SPIKE_H = 9;                 // diken yüksekliği (px) — artık kullanılmıyor
// Yükseklikle daralma (altitude shrink): platform genişliği index'e göre eğriden
// küçülür. SWEEP_START'te geniş başlar, SWEEP_END'te minimuma iner (zorluk artar).
const SWEEP_START = 1;
const SWEEP_END = 30;
const SWEEP_W_MIN = 100, SWEEP_W_MIN_END = 68;   // normal katman alt sınırı 100 -> 68 (v2: daha geniş)
const SWEEP_W_MAX = 158, SWEEP_W_MAX_END = 108;  // normal katman üst sınırı 158 -> 108 (v2)
// Yerleştirme algoritması (08.10.2026 — "üst üste binme" şikayetine çözüm):
//  NO_STACK_SHIFT: ardışık katman MERKEZLERİ en az bu kadar yatay kaymalı
//    (üst üste dizilme engellenir; oyuncu YATAY HAREKET ETMEK ZORUNDA kalır).
const NO_STACK_SHIFT = 110.0;      // v2: 44 → 70 → 110 — çoğu pencere buna yetmez,
const TREND_PULL = 0.18;           // v2: 0.30 → 0.18 — kule daha çok gezinir
//  ZIG_WINDOW: merkezdeyken her bu kadar katmanda yön değişir (zig-zag / akış).
const ZIG_WINDOW = 2;              // v2: 3 → 2 — sık yön değişimi (hareket zorunlu)
// Ulaşılabilirlik: ardışık katmanlar arası en az yatay örtüşme (px).
// v2: 70 → 54 → 46 (min 34 → 30): koridor hâlâ oyuncuyu (30px) içine alır ama
// yerleştirme penceresi genişler → zig-zag YATAY hareketi gerçekten zorunlu kılar.
const REACH_OVERLAP = 46.0;
const REACH_OVERLAP_MIN = 30.0;
const FREE_CLIMB = 3;      // v2: 8 → 3 — ilk 3 katman oyuncunun sütununda; sonrası zig-zag
const RESPAWN_CAM_RATE = 0.72;     // 0. katman respawn'da ekranın %72'sine konur
const PLAYER_TOP_MARGIN = 96.0;    // oyuncunun başı bu üst payı kesmemeli (kamera kelepçesi)
// Arka plan: YEŞİL (biyoma göre) çevre -> astro geçişi (yükseldikçe).
const BG_TRANSITION_H = 2400.0;    // 0. katmandan kaç px yukarıda %100 astro olur

function shade(rgb, k) {
    return [
        Math.max(0, Math.min(255, Math.round(rgb[0] * k))),
        Math.max(0, Math.min(255, Math.round(rgb[1] * k))),
        Math.max(0, Math.min(255, Math.round(rgb[2] * k))),
    ];
}

function lerp_color(a, b, k) {
    const l = (x, y) => Math.round(x + (y - x) * k);
    return [l(a[0], b[0]), l(a[1], b[1]), l(a[2], b[2])];
}

/* --- Yüzey biyom paletleri (Star Collector ana oyun biyomları — astro HARİÇ).
 * Her tırmanış bir yüzey biyomuyla başlar; yükseldikçe arka plan astro'ya geçer
 * (astro'da oyun bitmez, sadece tema değişir). Biyom adı DE.PR_BIOME_NAMES ile
 * birebir (procedural.js) — parite korunur. */
const CLIMB_BIOMES = {
    "forest": {
        "sky_top": [95, 150, 215],       // gündüz mavisi
        "sky_bot": [120, 200, 170],      // orman ufku (yeşilmsi)
        "grass": [120, 200, 90],         // çimen
        "soil": [110, 85, 55],           // toprak
        "platform": [70, 120, 95],       // yosunlu taş
        "spiked": [110, 160, 80],
    },
    "cave": {
        "sky_top": [55, 48, 78],         // mağara alacakaranlığı
        "sky_bot": [38, 32, 55],
        "grass": [120, 118, 130],        // buzlu kaya / sarkıt
        "soil": [45, 40, 60],
        "platform": [95, 85, 105],
        "spiked": [130, 120, 70],
    },
    "ice": {
        "sky_top": [150, 200, 235],      // buzul mavisi
        "sky_bot": [215, 240, 250],
        "grass": [220, 250, 255],        // kar
        "soil": [150, 195, 225],
        "platform": [120, 200, 245],
        "spiked": [140, 200, 130],
    },
    "desert": {
        "sky_top": [205, 165, 115],      // çöl göğü
        "sky_bot": [235, 200, 150],
        "grass": [235, 205, 150],        // kum
        "soil": [185, 140, 80],
        "platform": [190, 150, 75],
        "spiked": [190, 150, 60],
    },
};

const COL_SOLID = [110, 190, 255];
const COL_SPIKED = [120, 200, 90];
const COL_BREAKABLE = [255, 170, 90];
const COL_CRACK = [255, 120, 90];
const COL_SPIKE = [230, 90, 70];
const COL_BG = [110, 190, 255];
const COL_PLAYER = [60, 200, 245];   // ana oyundaki gibi mavi gövde (gözler çizilmez)

// Katman yükseklikleri önbellekli
const _FLOOR_Y = [START_Y];

function floor_gap(index) {
    const base = Math.min(BASE_GAP + GAP_GROWTH * Math.max(0, index), BASE_GAP + GAP_MAX_ADD);
    if (index > DOUBLE_JUMP_FLOOR) {
        return base + Math.min((index - DOUBLE_JUMP_FLOOR) * DOUBLE_GAP_PER, DOUBLE_GAP_CAP);
    }
    return base;
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

/* --- Tek yönlü katman platformu (artık sekirtmez; manuel zıplama var) --- */
DE_GAME.ClimbPlatform = class ClimbPlatform extends DE.Component {
    constructor(floor_index = 0, hits_to_break = 0, game = null) {
        super();
        this.floor_index = floor_index;
        this.hits_to_break = hits_to_break;      // 0 = hiç kırılmaz
        this.game = game;
        this.hits = 0;
        this._base_color = null;
        // Zorluk (07.10.2026):
        this.moving = null;          // null | { base_x, amp, speed, phase } — yatay sarkaç
        this.spiked = false;         // üstünde dikenler (temas = ölüm)
        this._move_t = 0.0;
        this._prev_x = null;
    }
    start() {
        const sprite = this.game_object.get_component(DE.SpriteRenderer);
        if (sprite) this._base_color = sprite.color.slice();
        if (this.moving) {
            this._prev_x = this.game_object.position.x;
            this._move_t = this.moving.phase || 0.0;
        }
    }
    update(dt) {
        // Hareketli katman: sinüs salınımı. Yukarı çıkan katmanlar daha vahşi
        // salınır (amp genliği katmanla büyür).
        if (!this.moving) return;
        const obj = this.game_object;
        const m = this.moving;
        this._move_t += (m.speed || 1.0) * dt;
        const amp = m.amp + Math.max(0, this.floor_index - DOUBLE_JUMP_FLOOR) * 1.5;
        const next = m.base_x + Math.sin(this._move_t) * amp;
        const dx = next - obj.position.x;
        obj.position.x = next;
        // Üstünde duran oyuncuyu da sürükle (altından kayma hissi verme amacıyla
        // oyuncu platformla birlikte kayar — "chase" hissi zorluğu artırır).
        const g = this.game;
        if (g && g.player && g.ctrl && g.ctrl.rb && g.ctrl.rb.is_grounded) {
            const p = g.player;
            const feet = p.position.y + p.size.y;
            if (Math.abs(feet - obj.position.y) < 6.0) {
                const pl = p.position.x, pr = p.position.x + p.size.x;
                if (pr >= obj.position.x - 4 && pl <= obj.position.x + obj.size.x + 4) {
                    p.position.x += dx;
                    p.position.x = Math.max(0, Math.min(p.position.x, SCREEN_W - p.size.x));
                }
            }
        }
        this._prev_x = next;
    }
    on_collision() {
        // Tek yönlü katman eskiden sekirirdi; artık zıplama manuel.
        // Onay: kırılma "üstünde bekleme" (ClimbGame._check_break_under) ile.
    }
    _break() {
        // Katman kırılır → delik oluşur. Motorun BreakablePlatform işi yapar.
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
        const top = base;
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
        if (this.hits_to_break > 0) {
            const k = Math.min(1.0, this.hits / this.hits_to_break);
            const n = 1 + Math.round(k * 3);
            ctx.fillStyle = "rgb(" + COL_CRACK.join(",") + ")";
            for (let i = 0; i < n; i++) {
                const cx = x + Math.round(w * (0.25 + 0.5 * (i / 3.0)));
                ctx.fillRect(cx, y + 2, 2, h - 5);
            }
        }
        // Dikenler: üst yüzeyde üçgen sırası (engel).
        if (this.spiked) {
            ctx.fillStyle = "rgb(" + COL_SPIKE.join(",") + ")";
            const n = Math.max(3, Math.floor(w / 14));
            ctx.beginPath();
            for (let i = 0; i < n; i++) {
                const cx2 = x + (w * (i + 0.5)) / n;
                ctx.moveTo(cx2 - 6, y + 2);
                ctx.lineTo(cx2, y - SPIKE_H);
                ctx.lineTo(cx2 + 6, y + 2);
            }
            ctx.fill();
        }
        // Hareketli katman ok işareti (hangi yöne salındığını sezdirir).
        if (this.moving) {
            const d = this._prev_x !== null
                ? Math.sign(this.game_object.position.x - this._prev_x) : 0;
            ctx.fillStyle = "rgb(" + [70, 150, 220].join(",") + ")";
            const cx = x + Math.trunc(w / 2), cy = y + 6;
            ctx.beginPath();
            ctx.moveTo(cx - 5 * (d || 1), cy + 3);
            ctx.lineTo(cx + 5 * (d || 1), cy + 3);
            ctx.lineTo(cx, cy - 3);
            ctx.fill();
        }
        ctx.fillStyle = prev;
    }
};

/* --- Arka plan: yüzeyde ANA OYUN BİYOMU (astro hariç), yükseldikçe astro --- */
DE_GAME.ClimbBackdrop = class ClimbBackdrop extends DE.Component {
    constructor(biome = "forest") {
        super();
        this.biome = CLIMB_BIOMES[biome] ? biome : "forest";
        this.b = CLIMB_BIOMES[this.biome];
    }
    set_biome(biome) {
        if (CLIMB_BIOMES[biome]) { this.biome = biome; this.b = CLIMB_BIOMES[biome]; }
    }
    draw(ctx, camera_offset) {
        if (!ctx) return;
        const w = (ctx.canvas ? ctx.canvas.width : SCREEN_W);
        const h = (ctx.canvas ? ctx.canvas.height : SCREEN_H);
        const camY = camera_offset ? camera_offset.y : 0;
        const prev = ctx.fillStyle;
        const b = this.b;

        // 0. katman yüksekliği referans: kamera yükseldikçe (camY küçülür) t artar.
        const t = Math.max(0.0, Math.min(1.0, (START_Y - camY) / BG_TRANSITION_H));
        // t=0 tamamen yüzey biyomu, t=1 tamamen astro (yıldızlı uzay).

        const mix = (c1, c2, k) => lerp_color(c1, c2, k);

        // Gökyüzü: yüzey biyomunun göğünden -> derin uzay moruna.
        const sky_top = mix(b.sky_top, [8, 10, 42], t);
        const sky_bot = mix(b.sky_bot, [20, 24, 60], t);
        try {
            const grad = ctx.createLinearGradient ? ctx.createLinearGradient(0, 0, 0, h) : null;
            if (grad) {
                grad.addColorStop(0, "rgb(" + sky_top.join(",") + ")");
                grad.addColorStop(1, "rgb(" + sky_bot.join(",") + ")");
                ctx.fillStyle = grad;
                ctx.fillRect(0, 0, w, h);
            } else {
                ctx.fillStyle = "rgb(" + sky_bot.join(",") + ")";
                ctx.fillRect(0, 0, w, h);
            }
        } catch (e) {
            ctx.fillStyle = "rgb(" + sky_bot.join(",") + ")";
            ctx.fillRect(0, 0, w, h);
        }

        // Biyom yüzeyi (GRID'SİZ — v2): pürüzsüz yuvarlanışlı tepelik arazi.
        // Üst kenar hafif dalgalı bir çizgidir (blok/çizgi ızgara YOK); aşağısı
        // biyom toprağının dikey gradyanı. Yükseldikçe yüksekliği azalır ve
        // %100 astro'da tamamen kaybolur.
        const ground_h = Math.round(h * (0.55 - 0.45 * t));
        if (ground_h > 0) {
            const soilBot = mix(b.soil, [40, 26, 40], t);        // dip (koyu)
            const soilTop = shade(mix(b.soil, [60, 50, 60], t), 1.12); // üst
            const grass = mix(b.grass, [70, 90, 60], t);
            // toprak gradyanı
            try {
                const gg = ctx.createLinearGradient ? ctx.createLinearGradient(0, h - ground_h, 0, h) : null;
                if (gg) {
                    gg.addColorStop(0, "rgb(" + soilTop.join(",") + ")");
                    gg.addColorStop(1, "rgb(" + soilBot.join(",") + ")");
                    ctx.fillStyle = gg;
                    ctx.fillRect(0, h - ground_h, w, ground_h);
                } else {
                    ctx.fillStyle = "rgb(" + soilBot.join(",") + ")";
                    ctx.fillRect(0, h - ground_h, w, ground_h);
                }
            } catch (e) {
                ctx.fillStyle = "rgb(" + soilBot.join(",") + ")";
                ctx.fillRect(0, h - ground_h, w, ground_h);
            }
            // Üst kenar: yumuşak tepeler (sinüs harmanı, her kare aynı).
            const PEAK = 26, PEAK2 = 14;
            ctx.fillStyle = "rgb(" + grass.join(",") + ")";
            ctx.beginPath();
            ctx.moveTo(0, h - ground_h);
            for (let gx = 0; gx <= w; gx += 12) {
                const y = h - ground_h
                    - Math.round(Math.sin(gx * 0.0047) * PEAK
                        + Math.sin(gx * 0.0113 + 1.7) * PEAK2);
                ctx.lineTo(gx, y);
            }
            ctx.lineTo(w, h - ground_h + 14);
            ctx.lineTo(0, h - ground_h + 14);
            ctx.closePath();
            ctx.fill();
            // Çim bandı üstünde ince parlak vurgu (toprağa geçiş).
            ctx.fillStyle = "rgba(255,255,255," + (0.10 * (1 - t)).toFixed(2) + ")";
            ctx.fillRect(0, h - ground_h, w, 3);
        }

        // Yükseldikçe beliren yıldızlar (astro teması).
        if (t > 0.05) {
            const n = Math.round(30 * t);
            for (let i = 0; i < n; i++) {
                const sx = ((i * 137) % (w - 20)) + 10;
                const sy = ((i * 383) % Math.max(1, Math.round(h * 0.7))) + 8;
                const size = 1 + (i % 3);
                const alpha = t;
                ctx.fillStyle = "rgba(255,255,255," + alpha.toFixed(2) + ")";
                ctx.fillRect(sx, sy, size, size);
            }
        }

        // yan duvar gölgeleri (kule hissi) — astro'da koyu mor.
        const wall = mix([30, 40, 60], [6, 8, 30], t);
        ctx.fillStyle = "rgb(" + wall.join(",") + ")";
        ctx.fillRect(0, 0, SIDE_MARGIN, h);
        ctx.fillRect(w - SIDE_MARGIN, 0, SIDE_MARGIN, h);
        ctx.fillStyle = prev;
    }
};

/* --- Yatay hareket + hız kombisi + MANUEL zıplama (coyote/buffer/çift) --- */
DE_GAME.ClimberPlayer = class ClimberPlayer extends DE.Component {
    constructor(speed = BASE_SPEED) {
        super();
        this.speed = speed;
        this.rb = null;
        this.level = 0;                 // her zıplamada artan hız seviyesi
        this._level_timer = 0.0;
        this.facing = 1;
        this.double_jump = false;       // skill ile açılır (ClimbGame)
        this.game = null;
        this._coyote = 0.0;
        this._buffer = 0.0;
        this._air_jumps = 0;
        // Ana oyunla aynı dash: krvarma, bekleme, hayalet izleri, squash.
        this._afterimages = [];
        this._afterimage_t = 0.0;
        this.dash_timer = 0.0;
        this.dash_cooldown = 0.0;
        this.dash_speed = 2.8;
        this.dash_dir = 1;
        this._squash = 0.0;
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
        if (!this.game) {
            const sc = DE.Engine.instance ? DE.Engine.instance.active_scene : null;
            const g = sc ? sc.find_by_tag("ClimbGame") : null;
            if (g) this.game = g.get_component(DE_GAME.ClimbGame);
        }
        const move_x = DE.Input.get_horizontal_axis();
        // -- Dash (ana oyunla aynı his: LSHIFT, 0.16s, 2.3 -> 3.2, hayalet izleri) --
        if (this.dash_timer > 0.0) {
            this.dash_timer -= dt;
            this.dash_speed = Math.min(3.2, this.dash_speed + 8.0 * dt);
            this.rb.velocity.x = this.dash_dir * this.speed * this.speed_mult * this.dash_speed;
            this.rb.velocity.y = 0.0;
        } else {
            if (this.dash_cooldown > 0.0) this.dash_cooldown -= dt;
            if (DE.Input.get_key_down("LSHIFT") && this.dash_cooldown <= 0.0) {
                this.dash_timer = 0.16;
                this.dash_cooldown = 0.6;
                this.dash_speed = 2.3;
                this.dash_dir = this.facing;
                this._afterimage_t = 0.0;
            }
            if (move_x !== 0) this.facing = move_x > 0 ? 1 : -1;
            this.rb.velocity.x = move_x * this.speed * this.speed_mult;
        }
        if (this.dash_timer > 0.0) {
            this._afterimage_t -= dt;
            if (this._afterimage_t <= 0.0) {
                this._afterimage_t = 0.03;
                const o = this.game_object;
                this._afterimages.push([o.position.x, o.position.y, 0.0]);
                if (this._afterimages.length > 6) this._afterimages.shift();
            }
        }
        for (let i = this._afterimages.length - 1; i >= 0; i--) {
            this._afterimages[i][2] += dt;
            if (this._afterimages[i][2] >= 0.18) this._afterimages.splice(i, 1);
        }
        if (this._squash > 0.0) this._squash = Math.max(0.0, this._squash - 8.0 * dt);
        // Kenar kelepçesi: kule dışına çıkma (düşey hareket serbest)
        if (this.game_object.position.x < 0.0) {
            this.game_object.position.x = 0.0;
            this.rb.velocity.x = 0.0;
        } else if (this.game_object.position.x > SCREEN_W - PLAYER_W) {
            this.game_object.position.x = SCREEN_W - PLAYER_W;
            this.rb.velocity.x = 0.0;
        }
        // -- Zıplama: coyote + buffer + (skill'li) çift zıplama --
        const grounded = this.rb.is_grounded;
        if (grounded) {
            this._coyote = COYOTE_TIME;
            this._air_jumps = 0;
        } else {
            this._coyote = Math.max(0.0, this._coyote - dt);
        }
        const jump_pressed = DE.Input.get_key_down("SPACE")
            || DE.Input.get_key_down("W") || DE.Input.get_key_down("UP");
        if (jump_pressed) this._buffer = JUMP_BUFFER;
        else this._buffer = Math.max(0.0, this._buffer - dt);
        if (this._buffer > 0.0) {
            if (grounded || this._coyote > 0.0) {
                this.do_jump(false);
            } else if (this.double_jump && this._air_jumps < 1) {
                this.do_jump(true);
                this._air_jumps += 1;
            }
        }
        // Hız seviyesi zamanla söner (zıplamadığın sürece hız kaybolur)
        if (this.level > 0) {
            this._level_timer -= dt;
            if (this._level_timer <= 0.0) {
                this.level -= 1;
                this._level_timer = LEVEL_DECAY;
            }
        }
    }
    do_jump(air) {
        if (!this.rb) return;
        this.rb.velocity.y = -(JUMP_FORCE * (air ? DOUBLE_JUMP_FORCE : 1.0));
        this.rb.is_grounded = false;
        this._buffer = 0.0;
        this._coyote = 0.0;
        this.add_level();
        if (DE.SoundFX && DE.SoundFX.play) DE.SoundFX.play("jump");
        const pe = this.game_object.get_component(DE.ParticleEmitter);
        if (pe) pe.burst(10, COL_PLAYER, [60, 170], [2, 5], [0.2, 0.4], 120);
        if (this.game && this.game.on_jump) this.game.on_jump(this, air);
        this._squash = 1.0;
    }
    add_level() {
        // Her zıplama bir hız seviyesi ekler (tavan MAX_LEVEL).
        if (this.level < MAX_LEVEL) this.level += 1;
        this._level_timer = LEVEL_DECAY;
    }
    reset_level() {
        this.level = 0;
        this._level_timer = 0.0;
    }
};

/* --- Sonsuz tırmanma döngüsü: katman üretimi, skor, sabit kamera, respawn --- */
DE_GAME.ClimbGame = class ClimbGame extends DE.Component {
    constructor(scene = null, seed = null) {
        super();
        this.seed = (seed === null || seed === undefined)
            ? Math.floor(Math.random() * 4294967296) : seed;
        this.rand = mulberry32(this.seed);
        this.scene = scene;
        this.player = null;
        this.ctrl = null;
        this.floors = {};               // index -> GameObject
        this.top_index = 0;
        this.max_floor = 0;        // oyuncunun şu anki en yüksek konumu
        this.best_floor = 0;       // rekor katman (düşünce silinmez = high score)
        this.score = 0;
        this.falls = 0;
        this._cam_y = 0.0;
        this.hud = null;
        this.speed_hud = null;
        this.record_hud = null;
        this.popup = null;
        this._popup_timer = 0.0;
        this._skill_unlocked = false;
        this._stand_timer = 0.0;
        this._zig = 0;              // NO-STACK zig-zag sayacı
        this._last_floor_rect = null;
        this.biome = this._pick_biome();   // yüzey: ana oyun biyomundan biri
    }
    _uniform(lo, hi) { return lo + this.rand() * (hi - lo); }
    // Yüzey biyomu seed'a göre DETERMİNİSTİK seçilir; astro hariç (astro zirvede):
    // adlar ana oyun procedural.js DE.PR_BIOME_NAMES'ten gelir (parite korunur).
    _pick_biome() {
        const names = (typeof DE !== "undefined" && DE.PR_BIOME_NAMES && DE.PR_BIOME_NAMES.length)
            ? DE.PR_BIOME_NAMES.filter((n) => n !== "astro")
            : ["forest", "cave", "ice", "desert"];
        if (!names.length) return "forest";
        const r = mulberry32((this.seed ^ 0x9E3779B9) >>> 0);
        return names[Math.floor(r() * names.length)] || "forest";
    }

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
        this.record_hud = this.scene.find_by_tag("ClimbRecord");
        this.popup = this.scene.find_all_by_tag("ClimbPopup")[0] || null;
        // Yüzey biyomunu sahneye uygula (arka plan + gökyüzü rengi).
        const bgObj = this.scene.find_by_tag("ClimbBackdrop");
        if (bgObj) {
            const b = bgObj.get_component(DE_GAME.ClimbBackdrop);
            if (b) b.set_biome(this.biome);
        }
        const pal = CLIMB_BIOMES[this.biome];
        if (pal) this.scene.background_color = pal.sky_top;
        this._cam_y = floor_y(0) - SCREEN_H * RESPAWN_CAM_RATE;
        this.scene.camera_position.y = this._cam_y;
        this._last_floor_rect = null;   // bir önceki katmanın (x, w) kutusu
        this._zig = 0;
        for (let i = 0; i <= AHEAD; i++) this._build_floor(i);
        this.top_index = AHEAD;
        if (this.popup) this.popup.active = false;
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
    // Katman x konumu — ulaşılabilirlik kuralları (Python _place_floor_x).
    //  Kural 1: ilk kule katmanı (index 1) oyuncunun üstünü kapsar.
    //  Kural 2: ardışık katmanlar en az REACH_OVERLAP kadar örtüşür.
    //           Dar katmanlarda örtüşme isteği REACH_OVERLAP_MIN'e düşer.
    //  Kural 3: FREE_CLIMB boyunca katman oyuncunun sütununda kalır → kule sürüklenmez.
    _placement_overlap(w) {
        if (w >= PLATFORM_MIN_W) return REACH_OVERLAP;
        return Math.max(REACH_OVERLAP_MIN, REACH_OVERLAP * (w / PLATFORM_MIN_W));
    }
    // Yükseklikle daralma (altitude shrink): normal katman genişliği eğrisel olarak
    // küçülür (SWEEP_START..SWEEP_END). Kolay başlar, yükseldikçe daralır → zorluk.
    _platform_w(index) {
        const sweep = Math.max(0, Math.min(1,
            (index - SWEEP_START) / (SWEEP_END - SWEEP_START)));
        const wMin = SWEEP_W_MIN + (SWEEP_W_MIN_END - SWEEP_W_MIN) * sweep;
        const wMax = SWEEP_W_MAX + (SWEEP_W_MAX_END - SWEEP_W_MAX) * sweep;
        return this._uniform(wMin, wMax);
    }
    // Katman x konumu — üç SERT kural + üstüne YERLEŞTİRME ALGORİTMASI:
    //  Kural 1: ilk kule katmanı (index 1) oyuncunun üstünü kapsar.
    //  Kural 2: ardışık katmanlar en az REACH_OVERLAP kadar örtüşür (golden path).
    //           Dar katmanlarda örtüşme isteği REACH_OVERLAP_MIN'e düşer.
    //  Kural 3: FREE_CLIMB boyunca katman oyuncunun sütununda kalır → kule sürüklenmez.
    //  Algoritma (08.10.2026 — "üst üste binme"ye çözüm):
    //   a) IN-BOUND TREND: önceki merkez ekran ortasından uzaksa yeni katman
    //      pensiyonu merkeze çekilir → katmanlar kenara takılıp aynı sütuna
    //      dizilemez (TREND_PULL).
    //   b) NO-STACK: yeni merkez önceki merkezden en az NO_STACK_SHIFT uzakta.
    //      Kenardaysak öncelik MERKEZE dönüş yönündedir; dengede her ZIG_WINDOW
    //      katmanda yön değiştiren zig-zag (oyuncu hareket etmeye zorlanır).
    _place_floor_x(index, w) {
        let lo = SIDE_MARGIN;
        let hi = Math.max(SIDE_MARGIN, SCREEN_W - SIDE_MARGIN - w);
        const need = this._placement_overlap(w);
        const prev = (index > 1) ? this._last_floor_rect : null;
        if (index === 1) {
            const col = this._player_column_range(w);
            if (col) { lo = Math.max(lo, col[0]); hi = Math.min(hi, col[1]); }
        } else if (prev) {
            const px = prev[0], pw = prev[1];
            // Örtüşme = min(px+pw, x+w) - max(px, x) >= need  (SERT kısıt)
            lo = Math.max(lo, px + need - w);
            hi = Math.min(hi, px + pw - need);
        }
        if (index <= FREE_CLIMB) {
            const col = this._player_column_range(w);
            if (col) { lo = Math.max(lo, col[0]); hi = Math.min(hi, col[1]); }
        }
        if (lo > hi) {
            lo = hi = Math.max(SIDE_MARGIN, Math.min(lo, SCREEN_W - SIDE_MARGIN - w));
        }
        if (!prev || index === 1) return this._uniform(lo, hi);

        const px = prev[0], pw = prev[1];
        const pc = px + pw / 2;                        // önceki katman merkezi
        // Merkez penceresi: örtüşme kutusu içinde trend çekmesi (merkeze doğru).
        let cLo = lo + w / 2, cHi = hi + w / 2;
        const pull = -(pc - SCREEN_W / 2) * TREND_PULL;
        if (pull > 0) cLo += pull; else cHi += pull;
        cLo = Math.max(lo + w / 2, cLo);
        cHi = Math.min(hi + w / 2, cHi);
        // Yön: kenardaysak merkeze; dengede zig-zag (ZIG_WINDOW katman periyodu).
        let side;
        if (pc > SCREEN_W / 2 + NO_STACK_SHIFT) side = -1;
        else if (pc < SCREEN_W / 2 - NO_STACK_SHIFT) side = 1;
        else {
            this._zig = (this._zig || 0) + 1;
            const flip = Math.floor((this._zig - 1) / ZIG_WINDOW) % 2 === 0;
            side = flip ? 1 : -1;
        }
        const reachR = cHi - pc;                       // sağa ne kadar kayabilir
        const reachL = pc - cLo;                       // sola ne kadar kayabilir
        let c;
        if (reachR >= NO_STACK_SHIFT || reachL >= NO_STACK_SHIFT) {
            // NO-STACK tam karşılanabiliyor: istenen yönde, en az shift kadar uzağa.
            if (side === 1) c = (reachR >= NO_STACK_SHIFT)
                ? this._uniform(pc + NO_STACK_SHIFT, cHi)
                : this._uniform(cLo, pc - NO_STACK_SHIFT);
            else c = (reachL >= NO_STACK_SHIFT)
                ? this._uniform(cLo, pc - NO_STACK_SHIFT)
                : this._uniform(pc + NO_STACK_SHIFT, cHi);
        } else if (reachR > 0 || reachL > 0) {
            // Tam shift sığmıyor (dar-dar): istenen yönde (side) en uzak uca it → üst
            // üste dizilmez. 0.02px içeride kalınır: tam sınırda oturur + kayan nokta
            // 1e-4 sapması örtüşme >= need garantisini bozmasın.
            c = (side === 1) ? cHi - 0.02 : cLo + 0.02;
        } else {
            c = (cLo + cHi) / 2;                        // yatay pencere yok: merkez
        }
        // v2 ORTA-SÜTUN TEMİZLEME: oyuncu dümdüz zıplamasın (kullanıcı şikayeti).
        // FREE_CLIMB aşıldıktan sonra katman merkezi ekran ortasının CLEAR kadar
        // yakınına düşemez. Önce zig yönü (side) denenir; mümkün değilse uzak uca
        // itilir. Böylece "sadece SPACE" tırmanışı imkânsız olur.
        if (index > FREE_CLIMB) {
            const CLEAR = 72.0, mid = SCREEN_W / 2;
            if (c > mid - CLEAR && c < mid + CLEAR) {
                const lx = mid - CLEAR, rx = mid + CLEAR;
                const okR = rx <= cHi && rx >= cLo;
                const okL = lx >= cLo && lx <= cHi;
                if (okR && okL) c = (side === 1) ? rx : lx;
                else if (okR) c = rx;
                else if (okL) c = lx;
                else {
                    const distR = cHi - mid, distL = mid - cLo;
                    c = (distR >= distL) ? cHi - 0.02 : cLo + 0.02;
                }
            }
        }
        return c - w / 2;
    }

    _build_floor(index) {
        // 0. katman oyuncunun altında olduğu garantili geniş başlangıç zemini.
        let w, x;
        let spiked = false, moving = null, narrow = false;
        if (index === 0) {
            w = SCREEN_W - 2 * SIDE_MARGIN;
            x = SIDE_MARGIN;
        } else {
            // Zorluk (09. katmandan itibaren): HARD_FROM üstünde her katman
            // tek bir "zorluk modu" alabilir — dar ya da hareketli (DİKEN YOK, v2).
            if (index === 1 || index < HARD_FROM) {
                w = this._platform_w(index);
            } else {
                const roll = this.rand();
                if (roll < NARROW_CHANCE) {                       // DAR
                    w = this._uniform(NARROW_W_MIN, NARROW_W_MAX);
                    narrow = true;
                } else if (roll < NARROW_CHANCE + MOVE_CHANCE) { // HAREKETLİ
                    w = this._platform_w(index);
                    moving = {
                        base_x: null,             // _place sonrası set edilir
                        amp: this._uniform(MOVE_RANGE_MIN, MOVE_RANGE_MAX),
                        speed: this._uniform(MOVE_SPEED_MIN, MOVE_SPEED_MAX),
                        phase: this.rand() * 6.283185307,
                    };
                } else {                                          // NORMAL
                    w = this._platform_w(index);
                }
            }
            x = this._place_floor_x(index, w);
            if (moving) moving.base_x = x;
        }
        let hits_to_break = 0;
        if (!spiked && index >= 3 && this.rand() < BREAK_CHANCE) hits_to_break = 1;
        const pal = CLIMB_BIOMES[this.biome] || CLIMB_BIOMES["forest"];
        const color = spiked ? pal.spiked : (hits_to_break ? COL_BREAKABLE : pal.platform);
        const obj = new DE.GameObject("Floor" + index, x, floor_y(index), w, PLATFORM_H, "ClimbFloor");
        obj.add_component(new DE.SpriteRenderer(color, "rect", 5));
        obj.add_component(new DE.BoxCollider(false, true));   // one_way: alttan geçilir
        obj.add_component(new DE.ParticleEmitter());
        const plat = new DE_GAME.ClimbPlatform(index, hits_to_break, this);
        plat.spiked = spiked;
        plat.moving = moving;
        obj.add_component(plat);
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
        this._generate_ahead();
        this._update_progress();
        this._check_skill();
        this._check_break_under(dt);
        this._check_spike_under();
        this._track_camera(dt);
        this._check_fall();
        if (this._popup_timer > 0.0) {
            this._popup_timer -= dt;
            if (this._popup_timer <= 0.0 && this.popup) this.popup.active = false;
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
    on_platform_bounce(platform, player) {
        // Python API kataloğu imzası (bilinçli sapma: sekiş yerine manuel zıplama).
        // Yeni davranışta bu olay yerine on_jump() çağrılır; skor _update_progress'te.
        if (platform && platform.floor_index > this.max_floor) {
            this.max_floor = platform.floor_index;
            if (platform.floor_index > this.best_floor) this.best_floor = platform.floor_index;
        }
        this._update_hud();
    }
    _camera_anchor_y() {
        // Python API kataloğu imzası: klasik "kamera yukarı gider" modelinde
        // referans katmanın y'si. Sabit-kamera modelinde yalnızca bilgi amaçlı.
        return floor_y(Math.max(this.max_floor, this.best_floor));
    }
    _camera_speed() {
        // Taban CAM_SPEED; ulaşılan en yüksek katman (dup max_floor) arttıkça
        // kamera hızlanır (zorluk yükselir). Best_floor değil, MEVCUT max_floor
        // baz alınır; düşünce 0. katman hızına döner.
        const boost = Math.min(CAM_BOOST_CAP, 1.0 + this.max_floor * CAM_BOOST_PER);
        return CAM_SPEED * Math.max(1.0, boost);
    }
    on_jump(player, air) {
        // Her zıplama hız seviyesini yükseltir; skor rekor katman + seviye bonusu.
        this._update_hud();
    }
    _update_progress() {
        // Oyuncunun yıktığı en yüksek katman (best_floor) rekor skordur.
        const idx = this.player_floor();
        if (idx > this.max_floor) {
            this.max_floor = idx;
            if (idx > this.best_floor) this.best_floor = idx;
        }
        if (DE_GAME.state && this.best_floor > ((DE_GAME.state.climber_high) || 0)) {
            DE_GAME.state.climber_high = this.best_floor;   // açılış/ölüm boyunca kalıcı rekor
        }
        const level = this.ctrl ? this.ctrl.level : 0;
        this.score = this.best_floor * 10 + level * 5;
        this._update_hud();
    }
    _check_skill() {
        // DOUBLE_JUMP_FLOOR katmanına ulaşınca çift zıplama açılır (pop-up ile).
        if (this._skill_unlocked || this.best_floor < DOUBLE_JUMP_FLOOR) return;
        this._skill_unlocked = true;
        if (this.ctrl) this.ctrl.double_jump = true;
        if (this.popup) {
            const tr = this.popup.get_component(DE.TextRenderer);
            if (tr) tr.text = DE.I18n.localize("climber_skill", {});
            this.popup.active = true;
        }
        this._popup_timer = 3.5;
    }
    _check_break_under(dt) {
        // Oyuncu bir kırılabilir katmanın ÜSTÜNDE bekliyorsa BREAK_WAIT sonrası kırılır.
        if (!this.ctrl || !this.ctrl.rb || !this.ctrl.rb.is_grounded) {
            this._stand_timer = 0.0;
            return;
        }
        const px = this.player.position.x;
        const idx = this.player_floor();
        for (const cand of [idx, idx - 1, idx + 1]) {
            if (cand < 0) continue;
            const comp = this._floor_component(cand);
            if (!comp || comp.hits_to_break <= 0) continue;
            const fobj = comp.game_object;
            if (px + this.player.size.x <= fobj.position.x || px >= fobj.position.x + fobj.size.x) continue;
            this._stand_timer += dt;
            if (this._stand_timer >= BREAK_WAIT) {
                this._stand_timer = 0.0;
                comp._break();
            }
            return;
        }
        this._stand_timer = 0.0;
    }
    _check_spike_under() {
        // Dikenli katmanın ÜSTÜNE ayak basarsa anında ölüm (respawn).
        if (!this.ctrl || !this.ctrl.rb) return;
        const px = this.player.position.x;
        const feet = this.player.position.y + this.player.size.y;
        const idx = this.player_floor();
        for (const cand of [idx, idx - 1, idx + 1]) {
            if (cand < 0) continue;
            const comp = this._floor_component(cand);
            if (!comp || !comp.spiked) continue;
            const fobj = comp.game_object;
            // Üst yüzeye "basınca" (ayaklar platform üstü bandında) ve x örtüşmesi.
            if (feet >= fobj.position.y - SPIKE_H - 2 && feet <= fobj.position.y + 6 &&
                px + this.player.size.x > fobj.position.x + 3 &&
                px < fobj.position.x + fobj.size.x - 3) {
                this.respawn();
                return;
            }
        }
    }
    _track_camera(dt) {
        // Kamera SÜREKLİ yükselir; asla aşağı inmez. Hız max_floor ile artar.
        // Oyuncu bu yekpare yükselişe yetişmek zorunda (alt çizgi yükselir).
        this._cam_y -= this._camera_speed() * dt;
        // Üst kelepçe: oyuncu çok hızlı tırmanırsa kamera damarı da yukarı
        // itilir — oyuncunun başı ekranın üstünden PLAYER_TOP_MARGIN içine
        // girmez. Kamera gerektiğinde hızlanır ama YALNIZCA yukarı yönde.
        if (this.player) {
            const keep = this.player.position.y - PLAYER_TOP_MARGIN;
            if (keep < this._cam_y) this._cam_y = keep;
        }
        this.scene.camera_position.x = 0.0;
        this.scene.camera_position.y = this._cam_y;
    }
    _check_fall() {
        // Alt çizgi: kamera ekranı + ölüm payı. Zemin bile kurtarmaz (kamera yükseliyor).
        const bottom = this._cam_y + SCREEN_H + DEATH_MARGIN;
        if (this.player.position.y + this.player.size.y > bottom) this.respawn();
    }
    respawn() {
        // CHECKPOINT YOK: her düşüş 0. katmana döner VE YÜZEY BİYOMUYLA YENİ
        // BİR HARİTA ÜRETİLİR (aynı map tekrar oynanmaz). Rekor (best_floor +
        // state.climber_high) korunur.
        this._regen_map();
        const floor = this.floors[0];
        this.player.position.x = Math.min(Math.max(0.0,
            floor.position.x + floor.size.x / 2 - PLAYER_W / 2), SCREEN_W - PLAYER_W);
        this.player.position.y = floor.position.y - PLAYER_H;
        const rb = this.player.get_component(DE.Rigidbody2D);
        if (rb) {
            rb.velocity.x = 0.0; rb.velocity.y = 0.0; rb.is_grounded = false;
        }
        if (this.ctrl) this.ctrl.reset_level();
        this.max_floor = 0;
        this._cam_y = floor_y(0) - SCREEN_H * RESPAWN_CAM_RATE;
        this.scene.camera_position.y = this._cam_y;
        this.scene.add_shake(0.25);
        this.falls += 1;
        if (DE.SoundFX && DE.SoundFX.play) DE.SoundFX.play("hit");
    }
    // YENİ HARİTA: seed değişir (rastgele, eskisiyle aynı olmaz), yeni yüzey
    // biyomu seçilir, tüm katmanlar sıfırdan üretilir; skill yeniden kazanılır.
    _regen_map() {
        let seed;
        do { seed = Math.floor(Math.random() * 4294967296); } while (seed === this.seed);
        this.seed = seed;
        this.rand = mulberry32(seed);
        this.biome = this._pick_biome();
        const bgObj = this.scene.find_by_tag("ClimbBackdrop");
        if (bgObj) {
            const b = bgObj.get_component(DE_GAME.ClimbBackdrop);
            if (b) b.set_biome(this.biome);
        }
        const pal = CLIMB_BIOMES[this.biome];
        if (pal) this.scene.background_color = pal.sky_top;
        for (const k in this.floors) {
            const f = this.floors[k];
            if (!f) continue;
            f.active = false;
            try { this.scene.destroy(f); } catch (e) { /* yok */ }
        }
        this.floors = {};
        this.top_index = 0;
        this._last_floor_rect = null;
        this._zig = 0;
        reset_floor_cache();
        for (let i = 0; i <= AHEAD; i++) this._build_floor(i);
        this.top_index = AHEAD;
        // Skill rekor gibi KALICI kalır (best_floor korunduğu için _check_skill
        // yeniden popup açıp döngüye girmez). Popup şu anda kapalıysa kapalı kalsın.
        if (this.popup && this._popup_timer <= 0.0) this.popup.active = false;
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
        if (this.record_hud) {
            const tr = this.record_hud.get_component(DE.TextRenderer);
            if (tr) tr.text = DE.I18n.localize("climber_record",
                { floor: (DE_GAME.state && DE_GAME.state.climber_high) || 0 });
        }
    }
};

/* Ana oyundaki player'ın (entities.js draw) climber karşılığı: BİREBİR —
 * mavi yuvarlak köşeli gövde + yön hissi veren gözler + dash hayaletleri
 * + zıplama squash'ı. (GÖZLER ana oyundakiyle aynı çizilir.) */
function _climb_round_rect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    if (ctx.roundRect) {
        ctx.roundRect(x, y, w, h, r);
    } else {
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y, x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r);
        ctx.arcTo(x, y, x + w, y, r);
        ctx.closePath();
    }
}
DE_GAME.ClimbPlayerVisual = class ClimbPlayerVisual extends DE.Component {
    draw(ctx, camera_offset) {
        const o = this.game_object;
        const cp = o.get_component ? o.get_component(DE_GAME.ClimberPlayer) : null;
        const facing = (cp && cp.facing) || 1;
        const squ = (cp && cp._squash) || 0.0;
        const cam = camera_offset || { x: 0, y: 0 };
        const base_w = o.size.x, base_h = o.size.y;
        const anim_w = base_w * (1.0 - squ * 0.18);
        const anim_h = base_h * (1.0 + squ * 0.35);
        const sx = Math.trunc(o.position.x - cam.x - (anim_w - base_w) / 2);
        const sy = Math.trunc(o.position.y - cam.y - anim_h);
        const aw = Math.trunc(anim_w), ah = Math.trunc(anim_h);
        if (!ctx || aw <= 0 || ah <= 0) return;
        const prev = ctx.fillStyle;
        // Dash hayaletleri (ana oyundaki afterimage'lerin eşi).
        if (cp && cp._afterimages && cp._afterimages.length > 0) {
            for (const [gx, gy, age] of cp._afterimages) {
                const alpha = Math.max(0, Math.trunc(110 * (1.0 - age / 0.18)));
                if (alpha <= 0) continue;
                ctx.globalAlpha = alpha / 255;
                ctx.fillStyle = "rgb(80,190,245)";
                ctx.fillRect(Math.trunc(gx - cam.x),
                    Math.trunc(gy - cam.y - base_h),
                    Math.trunc(base_w), Math.trunc(base_h));
                ctx.globalAlpha = 1;
            }
        }
        // Gövde (ana oyundaki gibi).
        ctx.fillStyle = "rgb(60,200,245)";
        _climb_round_rect(ctx, sx, sy, aw, ah, 6);
        ctx.fill();
        // Gözler (ana oyundaki gibi yön hissi ile).
        const eo = facing > 0 ? 3 : -3;
        ctx.fillStyle = "rgb(15,20,35)";
        ctx.beginPath(); ctx.arc(sx + Math.trunc(aw * 0.3) + eo, sy + Math.trunc(ah * 0.35), 3, 0, 6.283185307); ctx.fill();
        ctx.beginPath(); ctx.arc(sx + Math.trunc(aw * 0.7) + eo, sy + Math.trunc(ah * 0.35), 3, 0, 6.283185307); ctx.fill();
        ctx.fillStyle = "rgb(255,255,255)";
        ctx.beginPath(); ctx.arc(sx + Math.trunc(aw * 0.3) + eo + 1, sy + Math.trunc(ah * 0.35) - 1, 1, 0, 6.283185307); ctx.fill();
        ctx.beginPath(); ctx.arc(sx + Math.trunc(aw * 0.7) + eo + 1, sy + Math.trunc(ah * 0.35) - 1, 1, 0, 6.283185307); ctx.fill();
        ctx.fillStyle = prev;
    }
};

/* Açılış banner'ı: "Portallar kapandı — koleksiyonerler Astro'ya kule diktiler."
 * 5 saniye sürer, son 2 saniyede söner. Başlangıçta hızlıca belirir. */
DE_GAME.ClimbIntro = class ClimbIntro extends DE.Component {
    constructor() {
        super();
        this.t = 5.0;
    }
    update(dt) {
        this.t -= dt;
        if (this.t <= 0.0 && this.game_object) this.game_object.active = false;
    }
    draw(ctx, camera_offset) {
        if (!ctx || this.game_object === null) return;
        const w = ctx.canvas ? ctx.canvas.width : SCREEN_W;
        const h = ctx.canvas ? ctx.canvas.height : SCREEN_H;
        const fade_in = Math.max(0.0, Math.min(1.0, (5.0 - this.t) / 0.6));
        const fade_out = Math.max(0.0, Math.min(1.0, this.t - 2.0));
        const al = Math.min(fade_in, fade_out);
        if (al <= 0.0) return;
        ctx.save();
        ctx.globalAlpha = al;
        ctx.font = "bold 30px Arial, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "rgb(255,240,170)";
        ctx.fillText(DE.I18n.t("climber_banner1"), Math.round(w / 2), Math.round(h * 0.34));
        ctx.font = "17px Arial, sans-serif";
        ctx.fillStyle = "rgb(120,255,180)";
        ctx.fillText(DE.I18n.t("climber_banner2"), Math.round(w / 2), Math.round(h * 0.34 + 34));
        ctx.restore();
    }
};

function _climber_make_player(scene) {
    const player = new DE.GameObject("Player", SCREEN_W / 2 - PLAYER_W / 2,
        START_Y - PLAYER_H, PLAYER_W, PLAYER_H, "Player");
    player.add_component(new DE_GAME.ClimbPlayerVisual());
    player.add_component(new DE.BoxCollider(false, false));
    player.add_component(new DE.Rigidbody2D(980.0, true, 1600.0));
    player.add_component(new DE.ParticleEmitter());
    player.add_component(new DE_GAME.ClimberPlayer());
    scene.add_object(player);
    return player;
}

DE_GAME.build_climber_scene = function (seed = null) {
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
    const intro = new DE.GameObject("ClimbIntro", 0, 0, 0, 0, "ClimbIntro");
    intro.add_component(new DE_GAME.ClimbIntro());
    scene.add_object(intro);
    _climber_make_player(scene);
    // Merkez semantiği: center_x + center_y true, y = metnin görsel merkezi.
    const hud = new DE.GameObject("ClimbHUD", SCREEN_W / 2, 35, 0, 0, "ClimbHUD");
    hud.add_component(new DE.TextRenderer(
        DE.I18n.localize("climber_hud", { floor: 0, score: 0 }), 26,
        [255, 240, 170], true, [0, 0, 0], true, true));
    scene.add_object(hud);
    const speed = new DE.GameObject("ClimbSpeed", SCREEN_W / 2, 63, 0, 0, "ClimbSpeed");
    speed.add_component(new DE.TextRenderer(
        DE.I18n.localize("climber_speed", { mult: "1.00" }), 18,
        [140, 220, 255], true, [0, 0, 0], true, true));
    scene.add_object(speed);
    const record = new DE.GameObject("ClimbRecord", SCREEN_W / 2, 88, 0, 0, "ClimbRecord");
    record.add_component(new DE.TextRenderer(
        DE.I18n.localize("climber_record",
            { floor: (DE_GAME.state && DE_GAME.state.climber_high) || 0 }), 14,
        [205, 185, 255], true, [0, 0, 0], true, true));
    scene.add_object(record);
    const goal = new DE.GameObject("ClimbGoal", SCREEN_W / 2, 112, 0, 0, "ClimbGoal");
    goal.add_component(new DE.TextRenderer(
        DE.I18n.localize("climber_goal", {}), 13,
        [110, 255, 170], true, [0, 0, 0], true, true));
    scene.add_object(goal);
    const hint = new DE.GameObject("ClimbHint", SCREEN_W / 2, SCREEN_H - 8, 0, 0, "ClimbHint");
    hint.add_component(new DE.TextRenderer(
        DE.I18n.localize("climber_hint", {}), 15,
        [120, 140, 180], true, [0, 0, 0], true, true));
    scene.add_object(hint);
    // Çift zıplama skill pop-up'ı (başlangıçta gizli)
    const popup = new DE.GameObject("ClimbPopup", SCREEN_W / 2, SCREEN_H * 0.42 + 15, 0, 0, "ClimbPopup");
    popup.add_component(new DE.TextRenderer(
        "", 30, [120, 255, 180], true, [0, 0, 0], true, true));
    popup.active = false;
    scene.add_object(popup);
    const game = new DE.GameObject("ClimbGame", 0, 0, 0, 0, "ClimbGame");
    game.add_component(new DE_GAME.ClimbGame(scene, seed));
    scene.add_object(game);
    DE_GAME._attach_touch(scene);
    scene.start();
    return scene;
};

// Konsol/Developer API'ye aç (Python game/commands.py eşiyle uyum için)
DE_GAME.build_climber = DE_GAME.build_climber_scene;