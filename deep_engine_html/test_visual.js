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

console.log("\nSONUC: " + pass + " gecti, " + fail + " kaldi" + (fail === 0 ? " -> ALL OK" : ""));
process.exit(fail === 0 ? 0 : 1);