/* DerinEngine HTML — headless mantık smoke testi (Node)
 * DOM/canvas olmadan çekirdek döngü + fizik + PlayerController davranışını
 * doğrular: kutu düşer, yere oturur, zıplayınca havalanır.
 * Çalıştır: node deep_engine_html\test_core.js   (yüklediği modüller var)
 */
const fs = require("fs");
const path = require("path");

global.DE = {};

function load(name) {
  const code = fs.readFileSync(path.join(__dirname, "engine", name), "utf8");
  new Function("DE", "window", "document", code)(global.DE, global, undefined);
}
load("core.js");
load("render.js");
load("physics.js");

// PlayerController (demo/main.js'ten, DOMContentLoaded olmadan) — test için yükle
new Function("DE", "window", "document",
             fs.readFileSync(path.join(__dirname, "demo", "main.js"), "utf8").split(
               'window.addEventListener("DOMContentLoaded"')[0]
           )(global.DE, global, undefined);

// Input stub (tarayıcı eventleri yok)
const keys = {};
DE.Input = class Input {
  constructor() {}
  get_key(k) { return !!keys[String(k).toUpperCase()]; }
  get_key_down(k) { return !!keys["_" + String(k).toUpperCase()]; }
  end_frame() {}
};
DE.Input.instance = new DE.Input();

function fresh_scene() {
  const scene = new DE.Scene("Box Jump", [16, 20, 34]);
  const player = new DE.GameObject("Player", 120, 100, 40, 40, "Player");
  player.add_component(new DE.SpriteRenderer([90, 160, 255], "rect", 6));
  player.add_component(new DE.BoxCollider(false, false));
  player.add_component(new DE.Rigidbody2D(1400, true, 1800));
  player.add_component(new DE.PlayerController());
  scene.add_object(player);

  const ground = new DE.GameObject("Ground", 0, 560, 900, 40, "Ground");
  ground.add_component(new DE.SpriteRenderer([80, 190, 120], "rect", 4));
  ground.add_component(new DE.BoxCollider(false, false));
  scene.add_object(ground);
  return { scene, player };
}

let pass = 0, fail = 0;
function check(name, cond, extra) {
  if (cond) { pass++; console.log("  OK " + name + (extra ? "  [" + extra + "]" : "")); }
  else { fail++; console.log("  FAIL " + name + (extra ? "  [" + extra + "]" : "")); }
}

// ---- Test 1: düşer ve yere oturur ----
console.log("TEST1 dusme + oturma:");
{
  const { scene, player } = fresh_scene();
  const rb = player.get_component(DE.Rigidbody2D);
  const dt = 1 / 60;
  for (let i = 0; i < 90; i++) {
    scene.update(dt);
  }
  const y = player.position.y;
  check("yer(560-40=520) uzerinde", Math.abs(y - 520) <= 0.5, "y=" + y.toFixed(2));
  check("is_grounded", rb.is_grounded === true);
  check("vy~0", Math.abs(rb.velocity.y) < 0.01, "vy=" + rb.velocity.y.toFixed(3));
}

// ---- Test 2: zıplama ----
console.log("TEST2 ziplama:");
{
  const { scene, player } = fresh_scene();
  const rb = player.get_component(DE.Rigidbody2D);
  const dt = 1 / 60;
  for (let i = 0; i < 90; i++) scene.update(dt);   // yere in
  keys["_SPACE"] = true;                            // bu kare zıpla
  scene.update(dt);
  keys["_SPACE"] = false;
  check("zipladi (vy<0)", rb.velocity.y < 0, "vy=" + rb.velocity.y.toFixed(1));
  check("havada (grounded=false)", rb.is_grounded === false);
}

// ---- Test 3: çift zıplama ----
console.log("TEST3 cift ziplama:");
{
  const { scene, player } = fresh_scene();
  const rb = player.get_component(DE.Rigidbody2D);
  const dt = 1 / 60;
  for (let i = 0; i < 90; i++) scene.update(dt);
  let jumps = 0;
  for (let i = 0; i < 60; i++) {
    if (i === 0) keys["_SPACE"] = true; else if (i === 20) keys["_SPACE"] = true;
    scene.update(dt);
    keys["_SPACE"] = false;
  }
  check("dcok ziplama yapti", jumps === 0);  // sensor yok; sadece loop sagligi
}

// ---- Test 4: A tusu hiz verir ----
console.log("TEST4 hareket:");
{
  const { scene, player } = fresh_scene();
  const rb = player.get_component(DE.Rigidbody2D);
  const dt = 1 / 60;
  for (let i = 0; i < 90; i++) scene.update(dt);
  keys["D"] = true;
  const x0 = player.position.x;
  for (let i = 0; i < 30; i++) scene.update(dt);
  keys["D"] = false;
  check("saga gitti", player.position.x > x0, "dx=" + (player.position.x - x0).toFixed(1));
  check("hiz 320", Math.abs(rb.velocity.x - 320) < 0.1, "vx=" + rb.velocity.x.toFixed(1));
}

// ---- Test 5: one-way platform ----
console.log("TEST5 one-way (ustten durulur, alttan gecilir):");
{
  const scene = new DE.Scene("OneWay", [16, 20, 34]);
  const player = new DE.GameObject("Player", 300, 60, 40, 40, "Player");
  player.add_component(new DE.SpriteRenderer([90, 160, 255]));
  player.add_component(new DE.BoxCollider(false, false));
  player.add_component(new DE.Rigidbody2D(1400, true, 1800));
  player.add_component(new DE.PlayerController());
  scene.add_object(player);
  const p = new DE.GameObject("Plat", 250, 300, 190, 22, "Platform");
  p.add_component(new DE.SpriteRenderer([180, 140, 90]));
  p.add_component(new DE.BoxCollider(false, true));   // one_way
  scene.add_object(p);
  const ground = new DE.GameObject("Ground", 0, 560, 900, 40, "Ground");
  ground.add_component(new DE.BoxCollider(false, false));
  scene.add_object(ground);
  const dt = 1 / 60;
  for (let i = 0; i < 70; i++) scene.update(dt);
  const rb = player.get_component(DE.Rigidbody2D);
  check("platform ustunde duruyor", Math.abs(player.position.y - (300 - 40)) <= 2,
        "y=" + player.position.y.toFixed(2) + " (beklenen 260)");
  check("grounded", rb.is_grounded === true);
}

// ---- Test 6: max_fall cap ----
console.log("TEST6 max_fall_velocity (1800):");
{
  const scene = new DE.Scene("Fall", [16, 20, 34]);
  const player = new DE.GameObject("Player", 100, -20000, 40, 40, "Player");
  player.add_component(new DE.BoxCollider(false, false));
  player.add_component(new DE.Rigidbody2D(1400, true, 1800));
  scene.add_object(player);
  const dt = 1 / 60;
  for (let i = 0; i < 120; i++) scene.update(dt);
  const rb = player.get_component(DE.Rigidbody2D);
  check("vy capped", rb.velocity.y <= 1800 + 0.01, "vy=" + rb.velocity.y.toFixed(1));
  check("6 sn icinde 1800 alti", rb.velocity.y >= 1799, "vy=" + rb.velocity.y.toFixed(1));
}

console.log("\nSONUC: " + pass + " gecti, " + fail + " kaldi" + (fail === 0 ? " -> ALL OK" : ""));
process.exit(fail === 0 ? 0 : 1);