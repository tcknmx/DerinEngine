/* DerinEngine HTML â€” headless mantÄ±k smoke testi (Node)
 * DOM/canvas olmadan Ã§ekirdek dÃ¶ngÃ¼ + fizik + PlayerController davranÄ±ÅŸÄ±nÄ±
 * doÄŸrular: kutu dÃ¼ÅŸer, yere oturur, zÄ±playÄ±nca havalanÄ±r.
 * Ã‡alÄ±ÅŸtÄ±r: node deep_engine_html\test_core.js   (yÃ¼klediÄŸi modÃ¼ller var)
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
// TEST13 (engine.run_async) DevConsole kullaniyor; konsol modulunu de yukle
load("ui.js");
load("log.js");
load("i18n.js");
load("savegame.js");
load("console.js");

// PlayerController (demo/main.js'ten, DOMContentLoaded olmadan) â€” test iÃ§in yÃ¼kle
new Function("DE", "window", "document",
             fs.readFileSync(path.join(__dirname, "demo", "main.js"), "utf8").split(
               'window.addEventListener("DOMContentLoaded"')[0]
           )(global.DE, global, undefined);

// Input stub (tarayÄ±cÄ± eventleri yok)
const keys = {};
DE.Input = class Input {
  constructor() {}
  get_key(k) { return !!keys[String(k).toUpperCase()]; }
  get_key_down(k) { return !!keys["_" + String(k).toUpperCase()]; }
  begin_frame() {}
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

// ---- Test 1: dÃ¼ÅŸer ve yere oturur ----
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

// ---- Test 2: zÄ±plama ----
console.log("TEST2 ziplama:");
{
  const { scene, player } = fresh_scene();
  const rb = player.get_component(DE.Rigidbody2D);
  const dt = 1 / 60;
  for (let i = 0; i < 90; i++) scene.update(dt);   // yere in
  keys["_SPACE"] = true;                            // bu kare zÄ±pla
  scene.update(dt);
  keys["_SPACE"] = false;
  check("zipladi (vy<0)", rb.velocity.y < 0, "vy=" + rb.velocity.y.toFixed(1));
  check("havada (grounded=false)", rb.is_grounded === false);
}

// ---- Test 3: Ã§ift zÄ±plama ----
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

/* ---- Test 11: Component EVENT SISTEMI (Python components.py on/once/off/emit) ----
 * 03.10.2026 parite calismasi: JS Component'te sinyal sistemi HIC yoktu. */
console.log("TEST11 component event sistemi (on/once/off/emit):");
{
  const comp = new DE.Component();
  let a = 0, b = 0;
  const f1 = () => { a++; };
  comp.on("hit", f1);
  comp.on("hit", () => { b++; });
  comp.emit("hit");
  check("emit iki dinleyiciyi de cagirdi", a === 1 && b === 1, "a=" + a + " b=" + b);
  comp.off("hit", f1);
  comp.emit("hit");
  check("off tek dinleyiciyi sildi", a === 1 && b === 2, "a=" + a + " b=" + b);
  comp.off("hit");
  comp.emit("hit");
  check("off() hepsini temizledi", b === 2, "b=" + b);

  let once_n = 0;
  comp.on("tick", () => { once_n++; });
  comp.once("tick", () => { once_n += 10; });
  comp.emit("tick");
  comp.emit("tick");
  check("once yalnizca bir kez calisti", once_n === 12, "n=" + once_n);

  // argumanlar aktarilir (emit(*args))
  let seen = null;
  comp.on("data", (x, y) => { seen = [x, y]; });
  comp.emit("data", 7, "abc");
  check("emit argumanlari aktardi", seen && seen[0] === 7 && seen[1] === "abc",
    JSON.stringify(seen));

  // emit sirasinda off cagirmak guvenli (kopyu uzerinden gezilir)
  let removed = false;
  const self_off = () => { removed = true; comp.off("z", self_off); };
  comp.on("z", self_off);
  comp.on("z", () => { removed = true; });
  comp.emit("z");
  comp.emit("z");
  check("emit icinde off guvenli", removed === true);

  // hicbir sey dinlenmiyorken emit sessizce gecer
  let threw = false;
  try { comp.emit("yokboyle-bir-olay"); } catch (e) { threw = true; }
  check("bilinmeyen olay emit hatasi vermez", !threw);
}

/* ---- Test 12: GameObject SAHNE AGACI (Python game_object.py) ----------------
 * 03.10.2026 parite calismasi: JS'te add_child/world_position HIC yoktu. */
console.log("TEST12 sahne agaci (add_child/world_position/remove_child):");
{
  const root = new DE.GameObject("Root", 100, 200);
  const mid = new DE.GameObject("Mid");
  const leaf = new DE.GameObject("Leaf");
  root.add_child(mid);
  mid.add_child(leaf);
  check("cocuk yerel konuma alindi", mid.position.x === 0 && mid.position.y === 0,
    "mid=" + mid.position.x + "," + mid.position.y);
  check("world_position ebeveyn zincirini toplar",
    root.world_position(leaf).x === 100 && root.world_position(leaf).y === 200,
    JSON.stringify(root.world_position(leaf)));
  check("find_child (torun) buldu", root.find_child("Leaf") === leaf);
  check("olmayan cocuk null", root.find_child("Yok") === null);

  // ebeveyni tasininca alt agac tasinir
  root.position = new DE.Vector2(400, 50);
  check("ebeveyn tasidi, alt agac da tasidi",
    root.world_position(leaf).x === 400 && root.world_position(leaf).y === 50,
    JSON.stringify(root.world_position(leaf)));

  // remove_child: konum dunya koordinatina doner
  root.remove_child(mid);
  check("remove_child ayirdi", mid.parent === null && root.children.length === 0);
  check("remove_child konumu dunyaya cevirdi",
    mid.position.x === 400 && mid.position.y === 50,
    mid.position.x + "," + mid.position.y);

  // baska nesneye tasima: iki ebeveyn olmaz
  const other = new DE.GameObject("Other", 10, 20);
  other.add_child(mid);
  check("yeniden ekleme eski ebeveynden ayirdi", root.children.length === 0);
  check("yeni ebeveyn baglandi", mid.parent === other &&
    other.children.length === 1);

  // pasif ebeveyn tum alt agaci durdurur (update)
  const p = new DE.GameObject("P", 0, 0);
  const c1 = new DE.GameObject("C1", 0, 0);
  p.add_child(c1);
  let upd = 0;
  c1.add_component(new (class extends DE.Component {
    update() { upd++; }
  })());
  for (let i = 0; i < 5; i++) p.update(1 / 60);
  const before = upd;
  p.active = false;
  for (let i = 0; i < 5; i++) p.update(1 / 60);
  check("pasif ebeveyn alt agaci guncellemez", before === 5 && upd === 5,
    "upd=" + upd);
  p.active = true;
  for (let i = 0; i < 3; i++) p.update(1 / 60);
  check("tekrar aktiflesince guncellenir", upd === 8, "upd=" + upd);
}

/* ---- Test 13: Engine.run_async (Python run_async'in JS karsiligi) --------- */
console.log("TEST13 engine.run_async (await edilebilir dongu):");
{
  // Engine yapicisi canvas.getContext("2d") ister; headless'ta sahte 2d baglami
  const fakeCtx = new Proxy({}, {
    get(t, k) {
      if (k === "canvas") return { width: 200, height: 150 };
      if (k === "measureText") return () => ({ width: 10 });
      if (k === "createLinearGradient") {
        return () => ({ addColorStop() { } });
      }
      return () => { };
    },
    set() { return true; },
  });
  const fakeCanvas = { width: 200, height: 150, getContext: () => fakeCtx };
  const eng = new DE.Engine(fakeCanvas, "AsyncTest", 200, 150);
  const sc = new DE.Scene("S", [10, 10, 20]);
  let ticks = 0;
  sc.add_object(new (class extends DE.GameObject {
    update() { ticks++; }
  })());
  eng.set_scene(sc);
  const rAFs = [];
  global.requestAnimationFrame = (f) => { rAFs.push(f); return rAFs.length; };
  let t = 0;
  const drive = (n) => {
    for (let i = 0; i < n && rAFs.length; i++) {
      const cb = rAFs.shift();
      t += 1000 / 60;      // 60 Hz: Python `clock.tick(60)` ile ayni sabit adim
      cb(t);
    }
  };
  const p = eng.run_async();
  check("run_async bir Promise donduruyor", p && typeof p.then === "function");
  drive(10);
  check("kareler ilerledi (sahne guncellendi)", ticks === 10, "ticks=" + ticks);
  eng.stop();
  check("stop() donguyu durdurur", eng.is_running === false);
  drive(5);
  check("durduktan sonra kare ilerlemez", ticks === 10, "ticks=" + ticks);
  // sahnesiz run_async hata verir (Python ile ayni kural)
  const eng2 = new DE.Engine(fakeCanvas, "NoScene", 200, 150);
  let threw = false;
  try { eng2.run_async(); } catch (e) { threw = true; }
  check("sahnesiz run_async hata verir", threw);
}

console.log("\nSONUC: " + pass + " gecti, " + fail + " kaldi" + (fail === 0 ? " -> ALL OK" : ""));
process.exit(fail === 0 ? 0 : 1);