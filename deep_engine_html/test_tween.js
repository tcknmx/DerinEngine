/* DerinEngine HTML — G4 tween testleri
 * Çalıştır: node deep_engine_html\test_tween.js
 */
const fs = require("fs");
const path = require("path");
global.DE = {};
function load(name) {
    new Function("DE", "window", "document", "Image",
        fs.readFileSync(path.join(__dirname, "engine", name), "utf8"))(global.DE, global, undefined, undefined);
}
load("core.js");
load("math2d.js");
load("tween.js");

let pass = 0, fail = 0;
function check(name, cond, extra) {
    if (cond) { pass++; console.log("  OK " + name + (extra ? "  [" + extra + "]" : "")); }
    else { fail++; console.log("  FAIL " + name + (extra ? "  [" + extra + "]" : "")); }
}
const approx = (a, b) => Math.abs(a - b) < 0.5;

console.log("T1 easing fonksiyonlari:");
{
    check("linear clamp", DE.ease_linear(2.0) === 1.0 && DE.ease_linear(-1) === 0.0);
    check("in<out", DE.ease_in(0.5) < DE.ease_out(0.5), DE.ease_in(0.5).toFixed(3) + " vs " + DE.ease_out(0.5).toFixed(3));
    check("in_out orta nokta", Math.abs(DE.ease_in_out(0.5) - 0.5) < 0.01, DE.ease_in_out(0.5).toFixed(3));
    check("out_bounce son 1", DE.ease_out_bounce(1.0) === 1.0);
    check("out_bounce bas 0", DE.ease_out_bounce(0.0) === 0.0);
    check("out_elastic son 1", DE.ease_out_elastic(1.0) === 1.0);
    check("out_back son 1", DE.ease_out_back(1.0) === 1.0);
}

console.log("T2 Tween skaler + on_complete:");
{
    const o = new DE.GameObject("a", 0, 0, 32, 32, "t");
    const complete = { fired: false, val: null };
    const tw = new DE.Tween(o, "position.x", 100, 1.0, "linear", null, () => { complete.fired = true; complete.val = o.position.x; });
    tw.update(0.25);
    check("mid 25", approx(o.position.x, 25), "x=" + o.position.x.toFixed(1));
    check("done degil", !tw.done);
    tw.update(0.75);
    check("son 100", approx(o.position.x, 100), "x=" + o.position.x.toFixed(1));
    check("done + on_complete", tw.done && complete.fired);
    check("komplette son deger", approx(complete.val, 100));
    tw.update(0.5);  // bittikten sonra zararsız
    check("bittikten sonra sabit", approx(o.position.x, 100));
}

console.log("T3 Tween renk (tuple):");
{
    const go = new DE.GameObject("c", 0, 0, 32, 32, "t");
    const spr = go.add_component({ color: [255, 0, 0] });
    const tw = new DE.Tween(spr, "color", [0, 0, 255], 1.0);
    tw.update(1.0);
    check("renk hedef", spr.color[0] === 0 && spr.color[2] === 255, JSON.stringify(spr.color));
}

console.log("T4 Tween Vector2 in-place referans kararliligi:");
{
    const o = new DE.GameObject("v", 10, 20, 32, 32, "t");
    const orig_pos = o.position;
    const tw = new DE.Tween(o, "position", new DE.Vector2(300, 50), 1.0);
    tw.update(0.5);
    check("x yari", approx(o.position.x, 155), "x=" + o.position.x.toFixed(1));
    check("referans korundu", o.position === orig_pos);
}

console.log("T5 TweenComponent.to + basit beraber:");
{
    const o = new DE.GameObject("tc", 0, 0, 32, 32, "t");
    const tc = new DE.TweenComponent();
    tc.to(o, "position.x", 200, 1.0);
    tc.to(o, "position.y", 100, 2.0, "in_out");
    tc.update(1.0);
    check("x son", approx(o.position.x, 200), "x=" + o.position.x.toFixed(1));
    check("y yari (in_out)", approx(o.position.y, 50), "y=" + o.position.y.toFixed(1));
    tc.update(1.0);
    check("y son", approx(o.position.y, 100), "y=" + o.position.y.toFixed(1));
    check("running=0", tc.running() === 0);
}

console.log("T6 to_vec:");
{
    const o = new DE.GameObject("tv", 0, 0, 32, 32, "t");
    const tc = new DE.TweenComponent();
    tc.to_vec(o, "position", [300, 200], 1.0);
    tc.update(1.0);
    check("vec son", approx(o.position.x, 300) && approx(o.position.y, 200), "x=" + o.position.x.toFixed(1) + " y=" + o.position.y.toFixed(1));
}

console.log("T7 delay:");
{
    const o = new DE.GameObject("td", 0, 0, 32, 32, "t");
    const tc = new DE.TweenComponent();
    tc.to(o, "position.x", 100, 1.0, "linear", null, null, 0.5);
    tc.update(0.4);
    check("gecikmede baslamadi", approx(o.position.x, 0), "x=" + o.position.x.toFixed(1));
    tc.update(0.2);   // 0.6 > 0.5 → başladı; aynı frame'de ilerler (Python davranışı)
    check("gecikme sonrasi basladi", approx(o.position.x, 20), "x=" + o.position.x.toFixed(1));
    tc.update(1.0);
    check("son 100", approx(o.position.x, 100));
}

console.log("T8 chain (after) — sirali:" + "  // coklu secim simultane");
{
    const o = new DE.GameObject("ch", 0, 0, 32, 32, "t");
    const tc = new DE.TweenComponent();
    const t1 = tc.to(o, "position.x", 100, 1.0);
    tc.after(t1).to(o, "position.y", 200, 0.5);
    tc.after(t1).to(o, "position.x", 150, 0.5);   // x yine t1 sonrası (sırayla değil, ikisi de t1 bitince)
    tc.update(0.5);
    check("t1 yari (x=50)", approx(o.position.x, 50), "x=" + o.position.x.toFixed(1));
    tc.update(0.5);  // t1 bitti
    check("t1 bitti", t1.done, "x=" + o.position.x.toFixed(1));
    tc.update(0.25);
    check("y basladi (200=200?", approx(o.position.y, 100), "y=" + o.position.y.toFixed(1));
    tc.update(0.25);
    check("y son 200", approx(o.position.y, 200), "y=" + o.position.y.toFixed(1));
    check("x 150 oldu", approx(o.position.x, 150), "x=" + o.position.x.toFixed(1));
    check("running=0", tc.running() === 0);
}

console.log("T9 clear + kill:");
{
    const o = new DE.GameObject("cl", 0, 0, 32, 32, "t");
    const tc = new DE.TweenComponent();
    const tw = tc.to(o, "position.x", 500, 1.0);
    tc.update(0.2);
    check("hareket var", o.position.x > 0, "x=" + o.position.x.toFixed(1));
    tw.kill();
    tc.update(0.2);
    check("kill sonrası durdu", o.position.x < 200, "x=" + o.position.x.toFixed(1));
    tc.clear();
    check("clear sonrası running=0", tc.running() === 0);
}

console.log("\nSONUC: " + pass + " gecti, " + fail + " kaldi" + (fail === 0 ? " -> ALL OK" : ""));
process.exit(fail === 0 ? 0 : 1);