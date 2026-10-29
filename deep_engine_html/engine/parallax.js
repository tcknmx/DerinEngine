/* DerinEngine HTML — parallax (ParallaxLayer, ParallaxBackground)
 * Python deep_engine/parallax.py birebir portu (pygame.draw → Canvas2D).
 * ParallaxLayer.draw(ctx, w, h, camera_offset); ParallaxBackground.draw(ctx, w, h, camera_offset).
 */
var DE = DE || {};

/* Python `%` gibi hep pozitif sonuç verir (JS `%` işaretli).
 * ORTA-5: negatif kamera kaydırmasında parallax karo/konumları kaymasın diye. */
DE._pmod = function (n, m) { const r = n % m; return r < 0 ? r + m : r; };

DE.ParallaxLayer = class ParallaxLayer {
    constructor(speed_factor = 0.2, color = [30, 40, 60], layer_type = "mountains", height_range = [150, 300]) {
        this.speed_factor = speed_factor;
        this.color = color;
        this.layer_type = layer_type;
        this.height_range = height_range;
        this.cached_width = 2400;
    }

    _rgb(c) { return "rgb(" + c[0] + "," + c[1] + "," + c[2] + ")"; }

    draw(ctx, w, h, camera_offset) {
        // Faz kaydırması kameranın yatay konumuyla orantılıdır. ÖNEMLİ: eski kod
        // `_pmod(..., cached_width=2400)` ile sarmalıyordu; 2400 sinüs periyodunun
        // (2π/0.003 ≈ 2094, 2π/0.006 ≈ 1047) TAM KATI olmadığından sarma anında
        // yıldızlar ve dağlar ZIPLIYORDU → hareket ederken arka plan "bir anlığına
        // değişiyor" gibi görünüyordu. Çözüm: fazı gerçek periyoda göre hizala
        // (tam kat → görünümsüz sarma) veya hiç sarma.
        const cam_x = camera_offset ? camera_offset.x : 0;
        const off = cam_x * this.speed_factor;

        if (this.layer_type === "stars") {
            const scroll = Math.trunc(off);
            ctx.fillStyle = "rgb(220,235,255)";
            for (let i = 0; i < 50; i++) {
                const sx = DE._pmod(i * 47 - scroll, w);
                const sy = (i * 31) % Math.trunc(h * 0.7);
                const r = i % 3 !== 0 ? 1 : 2;
                ctx.beginPath();
                ctx.arc(sx, sy, r, 0, 6.283185307);
                ctx.fill();
            }
        } else if (this.layer_type === "mountains" || this.layer_type === "hills") {
            const step = this.layer_type === "mountains" ? 160 : 100;
            const freq = this.layer_type === "mountains" ? 0.003 : 0.006;
            const period = (2 * Math.PI) / freq;              // sinüs periyodu
            const off_w = off - Math.floor(off / period) * period;  // periyot-hizalı sarma
            const points = [];
            points.push([0, h]);
            for (let x = -step; x < w + step * 2; x += step) {
                const world_x = x + off_w;
                const peak_h = this.height_range[0] + (Math.sin(world_x * freq) * 0.5 + 0.5) * (this.height_range[1] - this.height_range[0]);
                points.push([x, Math.trunc(h - peak_h)]);
            }
            points.push([w, h]);
            if (points.length >= 3) {
                ctx.fillStyle = this._rgb(this.color);
                ctx.beginPath();
                ctx.moveTo(points[0][0], points[0][1]);
                for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1]);
                ctx.closePath();
                ctx.fill();
            }
        }
    }
}

DE.ParallaxBackground = class ParallaxBackground {
    /* Python `ParallaxBackground(theme="forest")` tek metin alir.
     * JS tarafinda cagri yerleri bir noktada `{theme: "ice"}` NESNESI gecirdi
     * (Python'da `theme=` anahtar sozcugu) -> tema hicbir kati ile eslesmedi ve
     * arka plan HIC cizilmedi (0 katman). Burada ikisini de kabul ediyoruz. */
    constructor(theme = "forest") {
        if (theme && typeof theme === "object") theme = theme.theme || theme[0] || "forest";
        this.theme = typeof theme === "string" ? theme : "forest";
        this.layers = [];
        this._stars = [];
        this._next_star = null;   // ms cinsinden (Python time based)
        this._setup_layers();
    }

    _setup_layers() {
        const P = DE.ParallaxLayer;
        if (this.theme === "forest") {
            this.layers.push(new P(0.03, null, "stars"));
            this.layers.push(new P(0.10, [25, 32, 50], "mountains", [200, 360]));
            this.layers.push(new P(0.25, [30, 48, 70], "hills", [140, 240]));
        } else if (this.theme === "lava") {
            this.layers.push(new P(0.04, null, "stars"));
            this.layers.push(new P(0.12, [50, 18, 24], "mountains", [220, 380]));
            this.layers.push(new P(0.28, [70, 25, 32], "hills", [150, 260]));
        } else if (this.theme === "cave") {
            this.layers.push(new P(0.10, [24, 20, 34], "mountains", [260, 420]));
            this.layers.push(new P(0.24, [40, 34, 52], "hills", [170, 280]));
        } else if (this.theme === "ice") {
            this.layers.push(new P(0.04, null, "stars"));
            this.layers.push(new P(0.12, [150, 200, 235], "mountains", [200, 360]));
            this.layers.push(new P(0.26, [200, 235, 255], "hills", [150, 260]));
        } else if (this.theme === "desert") {
            this.layers.push(new P(0.10, [120, 80, 40], "mountains", [220, 360]));
            this.layers.push(new P(0.24, [170, 120, 60], "hills", [150, 250]));
        } else if (this.theme === "astro") {
            for (let i = 0; i < 2; i++) {
                this.layers.push(new P(0.02 + i * 0.04, null, "stars"));
            }
            this.layers.push(new P(0.12, [40, 30, 70], "mountains", [200, 360]));
            this.layers.push(new P(0.26, [25, 20, 50], "hills", [130, 230]));
        }
    }

    _now() {
        return (typeof performance !== "undefined" && performance.now) ? performance.now() : Date.now();
    }

    draw(ctx, w, h, camera_offset) {
        for (const layer of this.layers) layer.draw(ctx, w, h, camera_offset);
        if (this.theme === "astro") this._draw_cosmic(ctx, w, h, camera_offset);
        this._update_shooting_stars(ctx, w, h);
    }

    _draw_cosmic(ctx, w, h, camera_offset) {
        const sx = -Math.trunc(camera_offset.x * 0.02);
        // Nebula bulutları (yarı saydam renk lekeleri)
        for (let i = 0; i < 4; i++) {
            const bx = DE._pmod(i * 347 + sx, w + 400) - 200;
            const by = (i * 173 + 40) % Math.trunc(h / 2);
            const rad = 90 + (i % 3) * 40;
            const cols = [[120, 60, 200], [60, 120, 220], [200, 60, 160], [80, 200, 180]];
            const col = cols[i % 4];
            for (let r = rad; r > 20; r -= 8) {
                const a = Math.trunc(26 * (1 - r / rad));
                ctx.fillStyle = "rgba(" + col[0] + "," + col[1] + "," + col[2] + "," + (a / 255) + ")";
                ctx.beginPath();
                ctx.arc(bx, by, r, 0, 6.283185307);
                ctx.fill();
            }
        }
        // Parlayan yıldız kümeleri
        for (let i = 0; i < 18; i++) {
            const stx = DE._pmod(i * 211 + sx * 1.3, w);
            const sty = (i * 89 + 30) % Math.trunc(h / 2);
            const size = i % 3 ? 1 : 2;
            const bright = 200 + (i % 3) * 20;
            ctx.fillStyle = "rgb(" + bright + "," + bright + ",255)";
            ctx.beginPath();
            ctx.arc(stx, sty, size, 0, 6.283185307);
            ctx.fill();
        }
        // Halkalı gezegen (üst sağda, kamerayla yumuşak salınımla süzülür).
        // NOT: eski kod `_pmod(sx*0.8, w+400)` ile sarmalıyordu; gezegen tek bir
        // nesne olduğu için sarma anında sağdan sola ZIPLIYORDU. Sinüs salınımı
        // ile sınırlı ve kesintisiz hale getirildi.
        const planet_drift = Math.sin((sx * 0.8) * (6.283185307 / (w + 400))) * (w * 0.16);
        const px = Math.trunc(w * 0.20 + planet_drift);
        const py = Math.trunc(h * 0.22);
        const planet_r = 42;
        ctx.fillStyle = "rgb(150,90,220)";
        ctx.beginPath(); ctx.arc(px, py, planet_r, 0, 6.283185307); ctx.fill();
        ctx.fillStyle = "rgb(190,140,250)";
        ctx.beginPath(); ctx.arc(px - 12, py - 12, planet_r - 16, 0, 6.283185307); ctx.fill();
        // Halka (elips çizilemiyor — transform ile döndürülmüş elips yerine iki yay)
        ctx.save();
        ctx.translate(px, py);
        ctx.scale(1.5, 0.5);
        ctx.strokeStyle = "rgba(220,170,255,0.51)";
        ctx.lineWidth = 5;
        ctx.beginPath(); ctx.arc(0, 0, planet_r, 0, 6.283185307); ctx.stroke();
        ctx.strokeStyle = "rgba(160,110,210,0.35)";
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(0, 0, planet_r - 6, 0, 6.283185307); ctx.stroke();
        ctx.restore();
        // Gezegeni tekrar üste çiz (halkanın arkasına gömülmüş gibi görünsün)
        ctx.fillStyle = "rgb(150,90,220)";
        ctx.beginPath(); ctx.arc(px, py, planet_r, 0, 6.283185307); ctx.fill();
        ctx.fillStyle = "rgb(200,160,255)";
        ctx.beginPath(); ctx.arc(px - 10, py - 10, planet_r - 18, 0, 6.283185307); ctx.fill();
    }

    _update_shooting_stars(ctx, w, h) {
        const now = this._now();
        if (this._next_star === null) {
            this._next_star = now + DE._rand_range(800, 2200);
        }
        if (now >= this._next_star) {
            this._stars.push({
                x: DE._rand_range(-60, w * 0.6),
                y: DE._rand_range(0, h * 0.4),
                vx: DE._rand_range(6, 12),
                vy: DE._rand_range(2.5, 6),
                born: now,
                life: DE._rand_range(700, 1300),
                length: DE._rand_range(16, 34),
            });
            this._next_star = now + DE._rand_range(900, 2600);
        }
        this._stars = this._stars.filter(s => (now - s.born) < s.life);
        for (const s of this._stars) {
            const age = now - s.born;
            const t = age / s.life;
            const frames = age / 16.0;
            const x = s.x + s.vx * frames;
            const y = s.y + s.vy * frames;
            const fade = Math.max(0.0, 1.0 - t);
            const tx = Math.trunc(230 * fade + 60 * (1 - fade));
            const tail_len = Math.trunc(s.length * (1.0 + t * 0.5));
            const ex = Math.trunc(x - s.vx * (tail_len / 16.0));
            const ey = Math.trunc(y - s.vy * (tail_len / 16.0));
            ctx.strokeStyle = "rgb(" + tx + "," + tx + "," + (fade > 0.75 ? 255 : 220) + ")";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(ex, ey);
            ctx.lineTo(Math.trunc(x), Math.trunc(y));
            ctx.stroke();
            ctx.fillStyle = "rgb(255,255,255)";
            ctx.beginPath(); ctx.arc(Math.trunc(x), Math.trunc(y), 2, 0, 6.283185307); ctx.fill();
        }
    }
}

DE._rand_range = function (a, b) {
    return a + Math.random() * (b - a);
}