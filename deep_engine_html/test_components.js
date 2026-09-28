/* DerinEngine HTML — G3 oynanış bileşenleri testleri
 * Çalıştır: node deep_engine_html\test_components.js
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
load("render.js");
load("physics.js");
load("particles.js");
load("components.js");

// Engine stub (shake + _AutoRemove için)
DE.Engine.instance = null;
function engine_stub(scene) {
    return { active_scene: scene, add_shake() {} };
}

// Input stub
const keys = {};
DE.Input = class Input {
    get_key(k) { return !!keys[String(k).toUpperCase()]; }
    get_key_down(k) { return !!keys["_" + String(k).toUpperCase()]; }
};
DE.Input.instance = new DE.Input();

let pass = 0, fail = 0;
function check(name, cond, extra) {
    if (cond) { pass++; console.log("  OK " + name + (extra ? "  [" + extra + "]" : "")); }
    else { fail++; console.log("  FAIL " + name + (extra ? "  [" + extra + "]" : "")); }
}
function make_scene() {
    return new DE.Scene("t");
}

console.log("T1 Animator (renk frame döngüsü):");
{
    const sc = make_scene();
    const o = new DE.GameObject("a", 0, 0, 32, 32, "t");
    o.add_component(new DE.SpriteRenderer([255, 0, 0], "rect"));
    const anim = o.add_component(new DE.Animator(4));
    sc.add_object(o);
    sc.update(0);     // start tetiklenir (sprite bulunur)
    anim.add_state("idle", [[255, 0, 0], [0, 255, 0], [0, 0, 255]]);
    anim.play("idle");
    const spr = o.get_component(DE.SpriteRenderer);
    check("ilk frame", spr.color[0] === 255 && spr.color[1] === 0);
    sc.update(0.26);   // 1 frame atlar
    const c1 = spr.color[1];
    check("animasyon ilerledi", c1 === 255, "g=" + c1);
    anim.play("idle", false);
    spr.color = [1, 1, 1];
    for (let i = 0; i < 60; i++) sc.update(1 / 60);
    check("finished", anim.finished === true);
}

console.log("T2 KeyframeAnimator interpolasyon:");
{
    const o = new DE.GameObject("k", 0, 0, 32, 32, "t");
    const kf = o.add_component(new DE.KeyframeAnimator(false, true));
    kf.animate("position.x", [[0, 0.0], [100, 1.0]], "linear");
    const sc = make_scene();
    sc.add_object(o);
    sc.update(0.5);
    check("mid 50", Math.abs(o.position.x - 50) < 0.5, "x=" + o.position.x.toFixed(1));
    sc.update(0.51);
    check("son 100", Math.abs(o.position.x - 100) < 0.01, "x=" + o.position.x.toFixed(1));
    check("bitti (loop yok)", kf.playing === false);
}

console.log("T3 BouncePad firlatma:");
{
    const sc = make_scene();
    DE.Engine.instance = engine_stub(sc);
    const pad = new DE.GameObject("Pad", 100, 500, 60, 14, "Ground");
    pad.add_component(new DE.BoxCollider(false, false));
    pad.add_component(new DE.BouncePad(850));
    sc.add_object(pad);
    const p = new DE.GameObject("Player", 110, 465, 40, 40, "Player");
    p.add_component(new DE.BoxCollider(false, false));
    const rb = p.add_component(new DE.Rigidbody2D(1400, false, 1800));
    sc.add_object(p);
    sc.update(1 / 60);
    check("bounce yukari", rb.velocity.y <= -800, "vy=" + rb.velocity.y.toFixed(1));
    sc.update(1 / 60);
    check("yukari hareket", p.position.y < 465, "y=" + p.position.y.toFixed(1));
    DE.Engine.instance = null;
}

console.log("T4 Health hasar + iframe:");
{
    const o = new DE.GameObject("e", 0, 0, 32, 32, "Enemy");
    const hp = o.add_component(new DE.Health(3, false));
    hp.take_damage(1);
    check("hp=2", hp.current_hp === 2);
    hp.on_death = null;
    hp.take_damage(2);
    check("hp=0 + active=False", hp.current_hp === 0 && o.active === false);
    // i-frame player
    const pgo = new DE.GameObject("p", 0, 0, 32, 32, "Player");
    const php = pgo.add_component(new DE.Health(3, true));
    php.take_damage(1);
    check("player iframe actives", php.invulnerable_timer > 0);
    const ret = php.take_damage(1);
    check("iframe ikinci hasar engellendi", ret === false && php.current_hp === 2);
    const sc = make_scene();
    sc.add_object(pgo);
    sc.update(0.1);
    check("iframe saniyor", php.invulnerable_timer < 1.2);
}

console.log("T5 Projectile duskmana vurur / duvara carpar:");
{
    const sc = make_scene();
    const en = new DE.GameObject("Enemy", 200, 100, 32, 32, "Enemy");
    en.add_component(new DE.BoxCollider(false, false));
    en.add_component(new DE.Health(25, false));
    sc.add_object(en);
    const w = new DE.GameObject("Wall", 300, 0, 20, 200, "Ground");
    w.add_component(new DE.BoxCollider(false, false));
    sc.add_object(w);
    const b = new DE.GameObject("Bullet", 150, 116, 8, 8, "Bullet");
    b.add_component(new DE.CircleCollider(false, 4));
    b.add_component(new DE.Projectile(new DE.Vector2(1, 0), 500, 25, false, 5));
    sc.add_object(b);
    let vy_sign = 0;
    for (let i = 0; i < 12 && b.active; i++) sc.update(1 / 60);
    check("duskmana ulasti", b.position.x >= 190, "x=" + b.position.x.toFixed(1) + " aktif=" + b.active);
    check("dusman hasar aldi", en.get_component(DE.Health).current_hp === 0, "hp=" + en.get_component(DE.Health).current_hp);
    check("bullet bitti", b.active === false);
    // Yeni mermi duvara
    const b2 = new DE.GameObject("Bullet2", 120, 100, 8, 8, "Bullet");
    b2.add_component(new DE.CircleCollider(false, 4));
    b2.add_component(new DE.Projectile(new DE.Vector2(1, 0), 500, 25, false, 5));
    sc.add_object(b2);
    for (let i = 0; i < 40; i++) sc.update(1 / 60);
    check("duvara carpti", b2.active === false);
}

console.log("T6 PowerUp oyuncuya uygular:");
{
    const sc = make_scene();
    const pu = new DE.GameObject("PU", 100, 100, 20, 20, "PowerUp");
    pu.add_component(new DE.BoxCollider(false, false));
    pu.add_component(new DE.PowerUp("magnet", 6));
    sc.add_object(pu);
    const p = new DE.GameObject("Player", 105, 105, 32, 32, "Player");
    p.add_component(new DE.BoxCollider(false, false));
    const ph = p.add_component(new DE.Component());
    let applied = null;
    ph.apply_powerup = function (t, d) { applied = [t, d]; };
    sc.add_object(p);
    sc.update(1 / 60);
    check("uygulandi", applied && applied[0] === "magnet" && applied[1] === 6);
    check("pu kalkti", pu.active === false);
}

console.log("T7 BreakablePlatform smash:");
{
    const o = new DE.GameObject("BRK", 100, 100, 64, 16, "Breakable");
    const bp = o.add_component(new DE.BreakablePlatform(2));
    bp.smash();
    check("1.smash kapatti", o.active === false);
    bp.smash();
    check("2.smash guvenli (aktif kalmadi)", o.active === false);
}

console.log("T8 SpawnIn blink + done:");
{
    const sc = make_scene();
    const o = new DE.GameObject("s", 0, 0, 32, 32, "Enemy");
    o.add_component(new DE.SpriteRenderer([100, 100, 100], "rect"));
    const sp = o.add_component(new DE.SpawnIn(0.6));
    sc.add_object(o);
    sc.update(0.1);
    check("done degil", sp.done === false);
    check("blink renk degisti", o.get_component(DE.SpriteRenderer).color[0] > 100);
    for (let i = 0; i < 40; i++) sc.update(1 / 60);
    check("6 sn sonra done", sp.done === true);
    check("renk geri dondu", o.get_component(DE.SpriteRenderer).color[0] === 100);
}

console.log("T9 _AutoRemove partikul bitince kaldirir:");
{
    const sc = make_scene();
    DE.Engine.instance = engine_stub(sc);
    const o = new DE.GameObject("fx", 0, 0, 32, 32, "fx");
    const em = o.add_component(new DE.ParticleEmitter());
    em.burst(3, [255, 0, 0], [0, 0], [3, 3], [0.05, 0.05], 0);
    o.add_component(new DE._AutoRemove());
    sc.add_object(o);
    sc.update(0.01);
    check("obje duruyor", sc.game_objects.includes(o));
    for (let i = 0; i < 40; i++) sc.update(1 / 60);
    check("obje kaldirildi", !sc.game_objects.includes(o));
    DE.Engine.instance = null;
}

console.log("\nSONUC: " + pass + " gecti, " + fail + " kaldi" + (fail === 0 ? " -> ALL OK" : ""));
process.exit(fail === 0 ? 0 : 1);