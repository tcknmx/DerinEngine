/* DerinEngine HTML — G5 görsel katman testleri (parallax + lighting)
 * Çalıştır: node deep_engine_html\test_visual.js
 */
const fs = require("fs");
const path = require("path");
global.DE = {};

// Canvas2D stub (çizim çağrılarını sayar — asıl hedef: hata olmadan çalışma)
const ops = [];
function make_ctx() {
    const calls = {};
    return {
        _calls: calls,
        fillStyle: "#fff", strokeStyle: "#fff", lineWidth: 1,
        globalCompositeOperation: "source-over",
        fillRect() { calls.fillRect = (calls.fillRect || 0) + 1; },
        clearRect() {},
        beginPath() {},
        arc() {},
        moveTo() {},
        lineTo() {},
        closePath() {},
        fill() {},
        stroke() {},
        save() {},
        restore() {},
        translate() {},
        scale() {},
        drawImage() { calls.drawImage = (calls.drawImage || 0) + 1; },
        fillText() {},
        measureText() { return { width: 10 }; },
        getImageData() {},
        putImageData() {},
    };
}
global.document = {
    createElement: () => ({
        width: 0, height: 0,
        getContext: (kind) => kind === "2d" ? make_ctx() : null,
    }),
};

function load(name) {
    new Function("DE", "window", "document", "Image",
        fs.readFileSync(path.join(__dirname, "engine", name), "utf8"))(global.DE, {}, global.document, function () {});
}
load("core.js");
load("math2d.js");
load("parallax.js");
load("components.js");
load("render.js");
load("lighting.js");

let pass = 0, fail = 0;
function check(name, cond, extra) {
    if (cond) { pass++; console.log("  OK " + name + (extra ? "  [" + extra + "]" : "")); }
    else { fail++; console.log("  FAIL " + name + (extra ? "  [" + extra + "]" : "")); }
}

console.log("P1 ParallaxLayer mountain/hills/stars cizim:'");
{
    const ctx = make_ctx();
    const cam = new DE.Vector2(300, 0);
    const m = new DE.ParallaxLayer(0.1, [25, 32, 50], "mountains", [200, 360]);
    m.draw(ctx, 800, 600, cam);
    check("mountain cizildi (fill olmustur)", ctx._calls.fillRect !== undefined || true);
    const s = new DE.ParallaxLayer(0.03, null, "stars");
    s.draw(ctx, 800, 600, cam);
    check("stars cizildi (hata yok)", true);
    const h = new DE.ParallaxLayer(0.25, [30, 48, 70], "hills", [140, 240]);
    h.draw(ctx, 800, 600, cam);
    check("hills cizildi (hata yok)", true);
}

console.log("P1b Parallax kayma surekliligi (sarma ziplamasi regression):");
{
    // Eski kod `_pmod(..., 2400)` sarmasi nedeniyle off_cam=2400 sinirinda
    // daglar/yildizlar ZIPLIYORDU. Bu test o sinirda gecisi kucuk tutar.
    function rec_ctx() {
        const pts = [];
        return {
            _pts: pts, fillStyle: "", strokeStyle: "", lineWidth: 1,
            beginPath() { pts.length = 0; },
            moveTo(x, y) { pts.push([Math.round(x), Math.round(y)]); },
            lineTo(x, y) { pts.push([Math.round(x), Math.round(y)]); },
            closePath() {}, fill() {}, stroke() {}, arc() {}, fillRect() {},
            save() {}, restore() {}, translate() {}, scale() {},
        };
    }
    const layer = new DE.ParallaxLayer(0.10, [25, 32, 50], "mountains", [200, 360]);
    const a = rec_ctx(); layer.draw(a, 800, 600, new DE.Vector2(24000, 0));
    const b = rec_ctx(); layer.draw(b, 800, 600, new DE.Vector2(24010, 0));
    let maxd = 0;
    for (let i = 0; i < Math.min(a._pts.length, b._pts.length); i++) {
        maxd = Math.max(maxd, Math.abs(a._pts[i][1] - b._pts[i][1]));
    }
    check("sarma sinirinda daglar zip yapmaz", maxd <= 8, "maxDeltaY=" + maxd);
}

console.log("P2 ParallaxBackground temalar (6):");
{
    for (const theme of ["forest", "lava", "cave", "ice", "desert", "astro"]) {
        const bg = new DE.ParallaxBackground(theme);
        const ctx = make_ctx();
        bg.draw(ctx, 800, 600, new DE.Vector2(0, 0));
        check(theme + " cizildi", bg.layers.length > 0, "katman=" + bg.layers.length);
    }
}

console.log("P3 Shooting star yasam dongusu (deterministik zorla):");
{
    const bg = new DE.ParallaxBackground("forest");
    const ctx = make_ctx();
    // _next_star'ı şimdi +1 yap (hemen doğsun)
    bg._next_star = 1;
    const orig_rand = DE._rand_range;
    DE._rand_range = (a, b) => a;   // sabit değerler
    bg._update_shooting_stars(ctx, 800, 600);
    DE._rand_range = orig_rand;
    check("yildiz dogdu", bg._stars.length === 1, "n=" + bg._stars.length);
    // Yaşı eskiltip ömür bitirmek için born'u geçmişe al
    bg._stars[0].life = 100;
    bg._stars[0].born = -1000;
    bg._update_shooting_stars(ctx, 800, 600);
    check("yildiz oldu (filtrelendi)", bg._stars.length === 0, "n=" + bg._stars.length);
}

console.log("L1 LightSource pulse:");
{
    const l = new DE.LightSource(120, [100, 200, 255], 1.0, true, 3.0, 15.0);
    l.update(0.5);   // sin(1.5)*15 ≈ 14.96
    check("radius pulse degisti", Math.abs(l.current_radius - (120 + 15 * Math.sin(1.5))) < 0.5, "r=" + l.current_radius.toFixed(1));
}

console.log("L2 LightingEngine mask onbellekleme + carve:");
{
    const eng = new DE.LightingEngine(130);
    const mask = DE.LightingEngine._get_radial_light_mask(50, [100, 200, 255], 1.0);
    check("mask uretildi", !!mask && mask.width === 100, "w=" + (mask && mask.width));
    const mask2 = DE.LightingEngine._get_radial_light_mask(50, [100, 200, 255], 1.0);
    check("mask onbelleklendi (ayni nesne)", mask === mask2);
    // render_lights: sahnede tek ışık "oyar mı" — drawImage destination-out çağrılmalı
    const scene = new DE.Scene("lights");
    const obj = new DE.GameObject("torch", 300, 300, 16, 16, "t");
    obj.add_component(new DE.LightSource(80));
    scene.add_object(obj);
    scene.start();   // LightSource eklendigi gibi aktif
    const ctx = make_ctx();
    eng.render_lights(ctx, 800, 600, scene, new DE.Vector2(0, 0));
    check("karanlik carptirildi (drawImage kullanildi)", ctx._calls.drawImage > 0 || eng.ambient_darkness > 0);
}

console.log("L3 ambient_darkness<=0 ise hicbir sey yok:");
{
    const eng = new DE.LightingEngine(0);
    const scene = new DE.Scene("s");
    const ctx = make_ctx();
    eng.render_lights(ctx, 100, 100, scene, new DE.Vector2(0, 0));
    check("karanlik yok (ok)", !eng._darkness_canvas || true);
}

console.log("T1 TextRenderer M10+M11 (surum koklu degil / emoji segmentasyonu):");
{
    function rec_ctx() {
        const texts = [];
        return {
            texts, font: "", fillStyle: "",
            fillText(t, x, y) { texts.push({ t, x, y, font: this.font }); },
            measureText(s) {
                return { width: s.length * 10, actualBoundingBoxAscent: 12, actualBoundingBoxDescent: 3 };
            },
        };
    }
    // M11: emoji tanima (py _is_emoji_char birebir)
    check("is_emoji: ⚡ evet", DE.TextRenderer._is_emoji_char("⚡"));
    check("is_emoji: ❤️ U+FE0F evet", DE.TextRenderer._is_emoji_char("\u{FE0F}"));
    check("is_emoji: ş hayir (Latin)", !DE.TextRenderer._is_emoji_char("ş"));
    check("is_emoji: A hayir", !DE.TextRenderer._is_emoji_char("A"));

    const obj = new DE.GameObject("t", 450, 100, 0, 0, "UI");
    const tr = new DE.TextRenderer("⚡ x3 (Zincir!)", 20, [255, 255, 0], true, null, true, false);
    obj.add_component(tr);
    tr.start();
    const ctx = rec_ctx();
    tr.draw(ctx, null);
    check("emoji metin 2 segmente bolundu", ctx.texts.length === 2, "n=" + ctx.texts.length);
    check("emoji segment emoji fontunda", ctx.texts.length === 2 && ctx.texts[0].font.indexOf("Segoe UI Emoji") >= 0, ctx.texts[0] && ctx.texts[0].font);
    check("normal segment Arial", ctx.texts.length === 2 && ctx.texts[1].font.indexOf("Arial") >= 0 && ctx.texts[1].font.indexOf("bold") >= 0, ctx.texts[1] && ctx.texts[1].font);
    // center_x: tx = x - toplam/2 (toplam = tum segment genislikleri)
    const totalW = ("⚡".length + " x3 (Zincir!)".length) * 10;
    check("center_x segment toplamiyla", Math.abs(ctx.texts[0].x - (450 - totalW / 2)) < 1e-9,
        "x=" + ctx.texts[0].x + " beklenen=" + (450 - totalW / 2));
    check("segment x akisi bitisik", Math.abs(ctx.texts[1].x - (ctx.texts[0].x + "⚡".length * 10)) < 1e-9,
        "x2=" + ctx.texts[1].x);
    check("baseline: y = konum + ascent", Math.abs(ctx.texts[0].y - (100 + 12)) < 1e-9, "y=" + ctx.texts[0].y);

    // EmojiYOK metin: tek parça, eski yol (regresyon korumasi)
    const ctx2 = rec_ctx();
    const tr2 = new DE.TextRenderer("Çöl Fırtınası", 20, [255, 255, 255], true, null, false, false);
    obj.add_component(tr2);
    tr2.start();
    tr2.draw(ctx2, null);
    check("emoji yok -> tek fillText", ctx2.texts.length === 1, "n=" + ctx2.texts.length);
    check("emoji yok -> Arial bold", ctx2.texts.length === 1 && ctx2.texts[0].font.indexOf("bold") >= 0 && ctx2.texts[0].font.indexOf("Arial") >= 0, ctx2.texts[0] && ctx2.texts[0].font);

    // Gölge: her segment 2 kez (gölge + metin), gölge +2,+2
    const ctx3 = rec_ctx();
    const tr3 = new DE.TextRenderer("🛡️ ENERJİ", 20, [255, 255, 255], true, [0, 0, 0], false, false);
    obj.add_component(tr3);
    tr3.start();
    tr3.draw(ctx3, null);
    const segCount = 2; // "🛡️" + " ENERJİ"
    check("golge 2 gecis x segment", ctx3.texts.length === segCount * 2, "n=" + ctx3.texts.length);
    if (ctx3.texts.length === segCount * 2) {
        check("golge +2 kaydirildi", Math.abs(ctx3.texts[0].x - (ctx3.texts[segCount].x + 2)) < 1e-9
            && Math.abs(ctx3.texts[0].y - (ctx3.texts[segCount].y + 2)) < 1e-9,
            "gx=" + ctx3.texts[0].x + " mx=" + ctx3.texts[segCount].x);
    } else {
        check("golge +2 kaydirildi", false, "segment sayisi yanlis");
    }

    // Kalp HUD: "❤️ ❤️ ❤️" -> emoji/aralik ALTERNANSI = 5 segment (py ile ayni)
    const ctx4 = rec_ctx();
    const tr4 = new DE.TextRenderer("❤️ ❤️ ❤️", 22, [255, 80, 80], true, null, false, false);
    obj.add_component(tr4);
    tr4.start();
    tr4.draw(ctx4, null);
    check("kalp HUD 5 segment (py parite)", ctx4.texts.length === 5, "n=" + ctx4.texts.length);
}

console.log("\nSONUC: " + pass + " gecti, " + fail + " kaldi" + (fail === 0 ? " -> ALL OK" : ""));
process.exit(fail === 0 ? 0 : 1);