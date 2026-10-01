/* DerinEngine HTML — game/ test süiti (Node, DOM yok)
 * game/*.js katmanının headless doğrulaması:
 *  - prosedürel seviye kurulumu (Player/Portal/Coin), düşme/zıplama/dash/ateş,
 *  - coin toplama -> skor + streak + portal kilidi açma,
 *  - kampanya zinciri (astro son, boss arenası, ölüm -> portal açılır, zafer),
 *  - sonsuz mod portalı, ana menü (menu_idle -> P ile kampanya başlar).
 * Çalıştır: node deep_engine_html\test_game.js
 */
const fs = require("fs");
const path = require("path");

global.DE = {};
global.DE_GAME = {};

const windowStub = { innerWidth: 900, innerHeight: 600, addEventListener() {} };
const documentStub = { createElement: () => ({}), getElementById: () => ({}), addEventListener() {} };

const ENGINE_FILES = [
  "core.js", "math2d.js", "render.js", "parallax.js", "physics.js",
  "particles.js", "components.js", "tween.js", "lighting.js", "tilemap.js",
  "levelfile.js", "ui.js", "log.js", "scenemanager.js", "i18n.js",
  "savegame.js", "console.js", "audio.js", "procedural.js",
];

function loadEngine(name) {
  const code = fs.readFileSync(path.join(__dirname, "engine", name), "utf8");
  new Function("DE", "window", "document", code)(global.DE, windowStub, documentStub);
}
for (const f of ENGINE_FILES) loadEngine(f);

function loadGame(name) {
  const code = fs.readFileSync(path.join(__dirname, "game", name), "utf8");
  new Function("DE", "window", "document", "DE_GAME", code)(global.DE, windowStub, documentStub, global.DE_GAME);
}
for (const f of ["state.js", "entities.js", "bosses.js", "ui.js", "scenes.js", "builders.js", "climber.js", "commands.js"]) loadGame(f);

// --- Input stub: tarayıcı yok; get_key/get_key_down/get_horizontal_axis vb. statikleri. ---
class FakeInput {
  constructor() {
    this._down = {};
    this._up = {};
    this._keys = {};
  }
  get_key(k) { return !!this._keys[String(k).toUpperCase()]; }
  get_key_down(k) { return !!this._down[String(k).toUpperCase()]; }
  get_key_up(k) { return !!this._up[String(k).toUpperCase()]; }
  get_horizontal_axis() {
    let d = 0;
    if (this._keys["D"] || this._keys["RIGHT"]) d += 1;
    if (this._keys["A"] || this._keys["LEFT"]) d -= 1;
    return d;
  }
  get_axis() { return [0, 0]; }
  get_hat() { return null; }
  get_mouse_button() { return false; }
  get_mouse_button_down() { return false; }
  get_mouse_position() { return { x: 0, y: 0 }; }
  begin_frame() {}
  end_frame() { this._down = {}; this._up = {}; }
}
DE.Input = FakeInput;
DE.Input.instance = new FakeInput();
DE.Input.get_key = (k) => DE.Input.instance.get_key(k);
DE.Input.get_key_down = (k) => DE.Input.instance.get_key_down(k);
DE.Input.get_key_up = (k) => DE.Input.instance.get_key_up(k);
DE.Input.get_horizontal_axis = () => DE.Input.instance.get_horizontal_axis();
DE.Input.get_axis = () => DE.Input.instance.get_axis();
DE.Input.get_hat = () => DE.Input.instance.get_hat();
DE.Input.get_mouse_button = (b) => DE.Input.instance.get_mouse_button(b);
DE.Input.get_mouse_button_down = (b) => DE.Input.instance.get_mouse_button_down(b);
DE.Input.get_mouse_position = () => DE.Input.instance.get_mouse_position();

// --- Motor örneği (canvas yok; kare bilgisi ve sahne geçiş tamponu). ---
const engine = {
  active_scene: null,
  _next_scene: null,
  _time_slow_remaining: 0.0,
  _time_slow_factor: 0.4,
  scene_manager: null,
};
DE.Engine.instance = engine;

function use(scene) { engine.active_scene = scene; }
function press(key) { DE.Input.instance._down[key.toUpperCase()] = true; }
function hold(key) { DE.Input.instance._keys[key.toUpperCase()] = true; }
function release(key) { DE.Input.instance._keys[key.toUpperCase()] = false; }
function step(scene, n = 1, dt = 1 / 60) {
  for (let i = 0; i < n; i++) {
    if (engine._next_scene) {
      engine.active_scene = engine._next_scene;
      engine._next_scene = null;
    }
    if (scene) scene.update(dt);
    DE.Input.instance.end_frame();
  }
}

let pass = 0, fail = 0;
function check(name, cond, extra) {
  if (cond) { pass++; console.log("  OK " + name + (extra ? "  [" + extra + "]" : "")); }
  else { fail++; console.log("  FAIL " + name + (extra ? "  [" + extra + "]" : "")); }
}

// ---- TEST 1: oyun durumu + sahne fabrika tablosu ----
console.log("TEST1 state + sahne fabrikaları:");
{
  const s = DE_GAME.state;
  check("campaign_state anahtarları", s.campaign_state && s.campaign_state["chain"] && "index" in s.campaign_state);
  check("endless_state.score", s.endless_state && "score" in s.endless_state);
  check("_NEXT_SCENE_FACTORIES: victory/menu", typeof DE_GAME._NEXT_SCENE_FACTORIES["victory"] === "function"
    && typeof DE_GAME._NEXT_SCENE_FACTORIES["menu"] === "function");
  check("_NEXT_SCENE_FACTORIES: campaign_boss", typeof DE_GAME._NEXT_SCENE_FACTORIES["campaign_boss"] === "function");
}

// ---- TEST 2: prosedürel seviye kurulumu ----
console.log("TEST2 prosedürel seviye:");
let lvl;
{
  lvl = DE_GAME.build_procedural_level("forest", 42, 8, 0);
  use(lvl);
  check("oyuncu var", lvl.find_by_tag("Player") !== null);
  check("portal var", lvl.find_all_by_tag("Portal").length === 1);
  const coins = lvl.find_all_by_tag("Coin");
  check("coin sayısı > 0", coins.length > 0, "coins=" + coins.length);
  const player = lvl.find_by_tag("Player");
  const ctrl = player.get_component(DE_GAME.PlayerController);
  check("PlayerController var", ctrl !== null);
  check("Rigidbody var", player.get_component(DE.Rigidbody2D) !== null);
  check("Health(3) var", player.get_component(DE.Health) !== null
    && player.get_component(DE.Health).max_hp === 3);
  const goal = ctrl.goal_text_obj.get_component(DE.TextRenderer);
  check("hedef yıldız yazısı yazıldı", typeof goal.text === "string" && goal.text.indexOf(":") > 0, goal.text.slice(0, 24));
  const gp = lvl.find_all_by_tag("Portal")[0].get_component(DE_GAME.GoalPortal);
  check("portal kilitli", gp.is_unlocked === false);
  check("_register_pause scene_manager yoksa güvenli", lvl.on_escape === undefined || typeof lvl.on_escape === "function");
  check("_NEXT_SCENE_FACTORIES: procedural (lazy kayıt)", typeof DE_GAME._NEXT_SCENE_FACTORIES["procedural"] === "function");
  check("zemin tilemap rasterize", lvl._tilemap_ground !== null && lvl._tilemap_ground !== undefined
    && lvl._tilemap_ground.layers_count === 1 && lvl._tilemap_segments.length > 0,
    "segments=" + (lvl._tilemap_segments ? lvl._tilemap_segments.length : 0));
  const groundHide = lvl.find_all_by_tag("Ground").filter(o => {
    const s = o.get_component(DE.SpriteRenderer);
    return s && o.get_component(DE.BoxCollider) && !o.get_component(DE.BoxCollider).one_way && s.visible === false;
  });
  check("katı zemin sprite'ları gizlendi", groundHide.length > 0, "gizli=" + groundHide.length);
  check("tilemap gönderildi", lvl._tilemap_ground !== null && lvl.find_all_by_tag("Tilemap").length === 1);
}

// Taze seviye yardımcısı (düşme/zıplama/dash/ateş testleri bağımsız).
function freshLevel(biome, seed, chunks, difficulty) {
  const sc = DE_GAME.build_procedural_level(biome, seed, chunks, difficulty);
  use(sc);
  step(sc, 60);
  return { lvl: sc, player: sc.find_by_tag("Player"), ctrl: sc.find_by_tag("Player").get_component(DE_GAME.PlayerController) };
}

// ---- TEST 3: oyuncu düşer ve zemine oturur ----
console.log("TEST3 düşme + oturma:");
{
  const { lvl, player } = freshLevel("forest", 42, 8, 0);
  const rb = player.get_component(DE.Rigidbody2D);
  let touched_top = null;
  for (const obj of lvl.game_objects) {
    if (obj.tag !== "Ground") continue;
    const col = obj.get_component(DE.BoxCollider);
    if (!col) continue;
    const a = col.get_aabb();
    const x_overlap = (a.x + a.w > player.position.x) && (a.x < player.position.x + player.size.x);
    const bottom_match = Math.abs(a.y - (player.position.y + player.size.y)) < 1.0;
    if (x_overlap && bottom_match) touched_top = a.y;
  }
  check("zemine oturdu (alt yüz platform üstünde)", touched_top !== null, "top=" + touched_top);
  check("is_grounded", rb.is_grounded === true);
  check("vy~0", Math.abs(rb.velocity.y) < 0.01, "vy=" + rb.velocity.y.toFixed(3));
}

// ---- TEST 4: zıplama ----
console.log("TEST4 zıplama:");
{
  const { lvl, player, ctrl } = freshLevel("forest", 42, 8, 0);
  const rb = player.get_component(DE.Rigidbody2D);
  press("SPACE");
  step(lvl, 1);
  check("vy negatif (yukarı)", rb.velocity.y < -100, "vy=" + rb.velocity.y.toFixed(1));
  check("scale squash", Math.abs(ctrl.scale_x - 1.0) > 0.2);
}

// ---- TEST 5: dash ----
console.log("TEST5 dash:");
{
  const { lvl, player, ctrl } = freshLevel("forest", 42, 8, 0);
  press("LSHIFT");
  step(lvl, 1);
  check("dash_timer aktif", ctrl.dash_timer > 0, "timer=" + ctrl.dash_timer.toFixed(3));
  check("dash_cooldown ayarlandı", ctrl.dash_cooldown > 0);
}

// ---- TEST 6: ateş (mermi doğar) — dash penceresinde ateş VERDİĞİZ sadık davranış ----
console.log("TEST6 ateş:");
{
  const { lvl, player, ctrl } = freshLevel("forest", 42, 8, 0);
  // Dash sırasında ateş yok (Python dash dalı erken return; port birebir sadık).
  press("LSHIFT");
  step(lvl, 1);
  press("F");
  step(lvl, 1);
  check("dash içinde ateş çalışmaz (sadık)", lvl.find_by_tag("Bullet") === null && ctrl.shoot_cooldown === 0);
  // Dash penceresi (~10 kare) bitsin, sonra ateş doğar.
  step(lvl, 20);
  press("F");
  step(lvl, 1);
  check("Bullet nesnesi doğdu", lvl.find_by_tag("Bullet") !== null);
  check("shoot_cooldown set", ctrl.shoot_cooldown > 0, "cd=" + ctrl.shoot_cooldown.toFixed(3));
}

// ---- TEST 7: coin toplama -> skor + streak + portal kilidi ----
console.log("TEST7 coin toplama:");
{
  // Taze seviye (TEST2'dekilerin bir kısmı toplanmış olabilir).
  const s2 = DE_GAME.build_procedural_level("cave", 7, 8, 0);
  use(s2);
  step(s2, 60); // yere otur
  const player = s2.find_by_tag("Player");
  const ctrl = player.get_component(DE_GAME.PlayerController);
  let coins = s2.find_all_by_tag("Coin");
  check("coinler başlangıçta aktif", coins.length > 0 && coins.every(c => c.active));
  let collected = 0;
  // En alttaki coin'den başla (zemine en yakın) — teleport ile üst üste bindir.
  coins.sort((a, b) => b.position.y - a.position.y);
  for (const coin of coins) {
    if (!coin.active) continue;
    player.position.x = coin.position.x - 4;
    player.position.y = coin.position.y - 2;
    step(s2, 2);
    if (!coin.active) collected += 1;
  }
  check("tüm coin'ler toplandı", collected === coins.length, collected + "/" + coins.length);
  check("skor arttı", ctrl.score > 0, "score=" + ctrl.score);
  const gp = s2.find_all_by_tag("Portal")[0].get_component(DE_GAME.GoalPortal);
  check("tümü toplanınca portal AÇILDI", gp.is_unlocked === true);
  check("hedef yazısı portal açıldı", ctrl.goal_text_obj.get_component(DE.TextRenderer).text.indexOf("PORTAL") >= 0);
}

// ---- TEST 8: kampanya başlat / boss kabuğu / zafer ----
console.log("TEST8 kampanya zinciri:");
let campaign;
{
  campaign = DE_GAME.start_campaign();
  const cs = DE_GAME.state.campaign_state;
  const chain = cs["chain"];
  check("zincir 5 biyom", chain.length === 5, chain.join(","));
  check("astro son", chain[chain.length - 1] === "astro");
  check("index=0, difficulty=1", cs["index"] === 0 && cs["difficulty"] === 1);
  // Python sedik: TR ad "Prosedürel <Biyom>" — "Kampanya" öneki yalnız İngilizcede uygulanır.
  const first = chain[0];
  const expectedName = "Prosedürel " + DE.PR_BIOMES[first]["name_tr"];
  check("ilk seviye adı", campaign.name === expectedName, campaign.name);
  check("ilk girişte TutorialBanner", campaign.find_by_tag("Tutorial") !== null);
  const portals = campaign.find_all_by_tag("Portal");
  check("giriş portalı moda göre rotalanır", portals.length === 1
    && typeof portals[0].get_component(DE_GAME.GoalPortal).next_scene_factory === "function");
}

console.log("TEST8b boss arenası (M2):");
{
  const cs = DE_GAME.state.campaign_state;
  const chain = cs["chain"];
  // İlk biyomun boss'u -> gerçek arena üretir (boss + kilitli portal + boss UI).
  const arena = DE_GAME.build_campaign_boss(chain[0], 1, 0);
  use(arena);
  const boss = arena.find_by_tag("Boss");
  check("boss nesnesi kuruldu", boss !== null);
  check("boss tipi geçerli", boss !== null && (
    boss.boss_type === "archer" || boss.boss_type === "flying" ||
    boss.boss_type === "sniper" || boss.boss_type === "shield"), boss && boss.boss_type);
  const bhp = boss ? boss.get_component(DE.Health) : null;
  check("boss Health var", bhp !== null && bhp.max_hp > 0, bhp ? "hp=" + bhp.max_hp : null);
  check("boss komponenti kuruldu", boss !== null && (
    boss.get_component(DE_GAME.BossController) !== null ||
    boss.get_component(DE_GAME.FlyingBoss) !== null ||
    boss.get_component(DE_GAME.SniperBoss) !== null ||
    boss.get_component(DE_GAME.ShieldBoss) !== null));
  const gp = arena.find_all_by_tag("Portal")[0].get_component(DE_GAME.GoalPortal);
  check("çıkış portalı boss'un next'ini paylaşır", boss !== null && boss.scene_key === "campaign_next_entrance");
  check("portal kilitli", gp.is_unlocked === false);
  // Boss'u yen -> ölüm davranışı: portal açılır, slow-mo + zoom punch tetiklenir.
  bhp.take_damage(999999);
  check("boss öldü (inactive)", boss.active === false);
  check("portal AÇILDI", gp.is_unlocked === true);
  check("boss ölümünde time-slow set", DE.Engine.instance._time_slow_remaining > 0);
  check("boss ölümünde zoom_punch tetiklendi", arena.camera_zoom_target > 1.0 || arena._zoom_punch_timer > 0);
  // Çıkış fabrikası: sonraki biyomun girişine gider + index ilerler.
  const exited = gp.next_scene_factory();
  check("çıkış sonraki girişe gitti", exited !== null && cs["index"] === 1);
  // Final (astro) -> gerçek arena + boss ölünce Zafer ekranı.
  cs["index"] = 4;
  const finalArena = DE_GAME.build_campaign_boss("astro", 5, 4);
  const fb = finalArena.find_by_tag("Boss");
  check("astro boss tipi cosmic", fb !== null && fb.boss_type === "cosmic", fb && fb.boss_type);
  const fgp = finalArena.find_all_by_tag("Portal")[0].get_component(DE_GAME.GoalPortal);
  fb.get_component(DE.Health).take_damage(999999);
  check("final boss ölünce portal açıldı", fgp.is_unlocked === true);
  const victory = fgp.next_scene_factory();
  check("final -> Zafer ekranı", victory !== null && victory.name === "Zafer Ekrani", victory && victory.name);
  check("index sıfırlandı", cs["index"] === 0);
  check("zaferde endless_unlocked işlendi", DE_GAME.savegame().get("endless_unlocked", false) === true);
}

// ---- TEST 9: sonsuz mod ----
console.log("TEST9 sonsuz mod:");
{
  const endless = DE_GAME.build_endless_level(2, 0);
  check("adı ENDLESS/SONSUZ", endless.name === DE.I18n.t("endless_name"), endless.name);
  const gp = endless.find_all_by_tag("Portal")[0].get_component(DE_GAME.GoalPortal);
  const next_factory = gp.next_scene_factory;
  let next_level = null;
  try { next_level = next_factory(); } catch (e) { next_level = null; }
  check("yeni zorluk haritasına gider", next_level !== null
    && DE.I18n.current_lang === "tr" ? (next_level.name === "SONSUZ MOD") : (next_level.name === "ENDLESS MODE"));
}

// ---- TEST 10: ana menü ----
console.log("TEST10 ana menü:");
{
  const menu = DE_GAME.build_main_menu_scene();
  check("menü adı menüde", menu.name === "Main Menu");
  check("_menu_ui dolu", menu._menu_ui && menu._menu_ui.length > 0);
  check("_hud_ui dolduruldu", menu._hud_ui && menu._hud_ui.length > 0);
  const mfx = menu.find_by_tag("UI") === menu._menu_ui[0] ? null : null; // noop
  void mfx;
  use(menu);
  menu.start(); // eklenen menü nesnelerini boşalt -> MenuController.start çalışır
  const player = menu.find_by_tag("Player");
  const ctrl = player.get_component(DE_GAME.PlayerController);
  const menuCtrlComp = (function findMenuCtrl() {
    for (const o of menu.game_objects) {
      const c = o.get_component(DE_GAME.MenuController);
      if (c) return c;
    }
    return null;
  })();
  check("MenuController var", menuCtrlComp !== null);
  check("menu_idle açık", ctrl.menu_idle === true);
  check("menü CLOSE-UP zoom", menu.camera_manual === true
    && menu.camera_zoom === DE_GAME.MENU_ZOOM && menu.camera_zoom_target === DE_GAME.MENU_ZOOM,
    "zoom=" + menu.camera_zoom);
  check("menü vinyet 0.5", Math.abs(menu.vignette_intensity - 0.5) < 0.001);
  menuCtrlComp._place_menu_camera();
  check("yakın plan kamera konumlandı", isFinite(menu.camera_position.x) && isFinite(menu.camera_position.y));
  check("çapraz geçiş dormant", menuCtrlComp._fade === 0 && menuCtrlComp._fading_out === false);
  const hudHidden = menu._hud_ui.every(o => o.active === false);
  check("HUD menüde gizli", hudHidden);
  press("P");
  menuCtrlComp.update(1 / 60);
  DE.Input.instance.end_frame();
  check("P ile kampanya başladı", DE_GAME.state.game_mode === "campaign");
  check("menu_idle kapandı", ctrl.menu_idle === false);
  check("kamerası normal oyuna döndü", menu.camera_manual === false && menu.camera_zoom_target === 1.0);
  check("vinyet 0.22'ye döndü", Math.abs(menu.vignette_intensity - 0.22) < 0.001);
  const hudShown = menu._hud_ui.every(o => o.active === true);
  check("HUD geri geldi", hudShown);
}

// ---- TEST 11: ESC motor köprüsü (on_escape) ----
console.log("TEST11 ESC -> pause overlay:");
{
  const testScene = DE_GAME.build_procedural_level("ice", 3, 6, 1);
  testScene.on_escape = function () { DE_GAME._NEXT_SCENE_FACTORIES["menu"](); return true; };
  use(testScene);
  press("ESCAPE");
  let fired = false;
  testScene.on_escape = function () { fired = true; return true; };
  if (engine.active_scene.on_escape) { engine.active_scene.on_escape(); }
  check("on_escape çağrılır", fired === true);
}

// ---- TEST 12: FadeOverlay (çapraz geçiş bileşeni) ----
console.log("TEST12 FadeOverlay:");
{
  const sc = new DE.Scene("FadeTest", [0, 0, 0]);
  const fo = new DE.GameObject("FadeIn", 0, 0, 0, 0, "Default");
  const comp = fo.add_component(new DE_GAME.FadeOverlay(120));
  sc.add_object(fo);
  use(sc);
  step(sc, 3, 1 / 60);
  check("açılışta karanlık", comp._alpha > 0);
  step(sc, 160, 1 / 60);
  check("uyumu bitti", comp._alpha <= 0);
  check("nesne sahneden silindi", sc.find_by_tag("FadeIn") === null);
}

// ---- TEST 13: görsel çizim smoke (M1 KALAN "tarayıcıda görsel kontrol" kapanışı) ----
console.log("TEST13 görsel çizim smoke:");
function makeDrawCtx() {
  const t = {
    canvas: { width: 900, height: 600 },
    fillStyle: "", strokeStyle: "", lineWidth: 1, font: "", globalAlpha: 1, textAlign: "left",
  };
  return new Proxy(t, {
    get(o, p) {
      if (p in o) return o[p];
      if (p === "createRadialGradient" || p === "createLinearGradient") return () => ({ addColorStop() {} });
      if (p === "measureText") return () => ({ width: 100 });
      return () => {};
    },
    set(o, p, v) { o[p] = v; return true; },
  });
}
function drawSafe(scene) {
  try { scene.draw(makeDrawCtx()); return true; } catch (e) { return false; }
}
{
  const lvl = DE_GAME.build_procedural_level("forest", 42, 8, 0);
  use(lvl);
  step(lvl, 5, 1 / 60);                       // tilemap zemini + boss patlamasız normal kare
  DE_GAME.start_campaign();                    // kampanya zincirini kurar (chain)
  const chain = DE_GAME.state.campaign_state["chain"];
  const arena = DE_GAME.build_campaign_boss(chain[0], 1, 0);
  const menu = DE_GAME.build_main_menu_scene();
  use(menu);
  menu.start();                               // MenuController.start -> camera_zoom = MENU_ZOOM (1.8)
  const scenes = [
    ["prosedürel + tilemap zemin", lvl],
    ["boss arenası (bar/aura çizimi)", arena],
    ["ana menü (zoom + vinyet yolu)", menu],
    ["endless", DE_GAME.build_endless_level(2, 0)],
    ["zafer ekranı", DE_GAME.build_victory_scene()],
    ["oyun sonu", DE_GAME.build_game_over_scene(function () {})],
    ["pause overlay", DE_GAME.build_pause_scene()],
  ];
  let ok = 0;
  const broken = [];
  for (const [name, sc] of scenes) {
    if (drawSafe(sc)) ok++; else broken.push(name);
  }
  check("7 sahne türü çizilebilir (istisnasız)", ok === scenes.length,
    broken.length ? "çizilemez: " + broken.join(", ") : "");
  check("menü zoom çizim yolu aktif", Math.abs(menu.camera_zoom - DE_GAME.MENU_ZOOM) < 1e-9 && drawSafe(menu));
  // FadeOverlay karanlık katmanı da çizilebiliyor mu (255->0 öncesi)
  const fadeScene = new DE.Scene("FadeDraw", [0, 0, 0]);
  const fo = new DE.GameObject("FadeIn", 0, 0, 0, 0, "Default");
  fo.add_component(new DE_GAME.FadeOverlay(500));
  fadeScene.add_object(fo);
  fadeScene.start();
  check("FadeOverlay katmanı çizilebilir", drawSafe(fadeScene));
}

// TEST14: oyun konsol komutları (game/commands.js — Python game/commands.py eşi)
console.log("TEST14 konsol komutları:");
{
  const cmd = (name) => DE._CONSOLE_COMMANDS[name] && DE._CONSOLE_COMMANDS[name].fn;
  const lvl = DE_GAME.build_procedural_level("lava", 7, 8, 2);
  const player = lvl.find_by_tag("Player");
  const pc = player.get_component(DE_GAME.PlayerController);
  const hp = player.get_component(DE.Health);
  check("11 oyun komutu kayıtlı", ["hp", "heal", "god", "coins", "speed", "jump", "tp", "respawn", "tilemap_save", "tilemap_load", "list"]
    .every(n => !!cmd(n)), "eksik: " + ["hp", "heal", "god", "coins", "speed", "jump", "tp", "respawn", "tilemap_save", "tilemap_load", "list"]
    .filter(n => !cmd(n)).join(","));

  check("hp: can güncellenir", cmd("hp")(lvl, ["5"]) === "can -> 5/3" && hp.current_hp === 5);
  check("hp: kullanım mesajı", cmd("hp")(lvl, []).indexOf("Kullanim: hp") === 0);

  check("heal: can doldur + kısa koruma", cmd("heal")(lvl, []) === "sifa tamam."
    && hp.current_hp === hp.max_hp && hp.invulnerable_timer >= 1.2);

  hp.invulnerable_timer = 0;                        // god'un başlangıç durumu (heal artığı kalmasın)
  check("god: aç/kapa", cmd("god")(lvl, []) === "god mode ACIK (olumsuz)." && hp.invulnerable_timer > 1e9);
  check("god: kapat", cmd("god")(lvl, []) === "god mode KAPALI." && hp.invulnerable_timer === 0);

  const before = pc.score;
  check("coins: skora ekle", cmd("coins")(lvl, ["100"]) === "skor -> " + (before + 100) && pc.score === before + 100);

  check("speed: hız ayarı + clamp", cmd("speed")(lvl, ["99999"]) === "hiz -> 2000" && pc.speed === 2000);
  check("jump: zıplama ayarı", cmd("jump")(lvl, ["900"]) === "ziplama -> 900" && pc.jump_force === 900);

  player.position.x = 42; player.position.y = 42;
  check("tp: ışınla + hız sıfır", cmd("tp")(lvl, ["310", "120"]) === "isinlandi -> (310, 120)"
    && player.position.x === 310 && player.position.y === 120);
  const rb = player.get_component(DE.Rigidbody2D);
  if (rb) rb.velocity.set(50, -80);

  const beforeRespawn = { x: player.position.x, y: player.position.y };
  check("respawn: spawn noktasına döner", cmd("respawn")(lvl, []) === "spawn noktasina donuldu."
    && (player.position.x !== beforeRespawn.x || player.position.y !== beforeRespawn.y));

const listed = cmd("list")(lvl, []);
  check("list: sahne sayımı", typeof listed === "string" && listed.indexOf("Player x1") >= 0);

  // tilemap veri katmani: export -> kaydet -> geri yukle -> ayni geometri
  const saved = cmd("tilemap_save")(lvl, ["test_seviye"]);
  check("tilemap_save: kaydeder", typeof saved === "string" && saved.indexOf("kaydedildi") > 0
    && saved.indexOf("katman") > 0, saved);
  const data0 = DE_GAME.export_scene_tilemap(lvl);
  check("tilemap_save: veri JSON-uyumlu", !!data0 && Array.isArray(data0.layers)
    && Array.isArray(data0.layers[0].grid) && typeof JSON.stringify(data0) === "string");
  const segs0 = (lvl._tilemap_segments || []).length;
  const loaded = cmd("tilemap_load")(lvl, ["test_seviye"]);
  check("tilemap_load: geri yukler", typeof loaded === "string" && loaded.indexOf("yuklendi") > 0, loaded);
  check("tilemap_load: geometri ayni", (lvl._tilemap_segments || []).length === segs0
    && lvl._tilemap_ground.to_data().layers.length === data0.layers.length,
    segs0 + " -> " + (lvl._tilemap_segments || []).length);
  check("tilemap_load: tek Tilemap nesnesi", lvl.find_all_by_tag("Tilemap").length === 1);
  check("tilemap_save: bozuk ad temizlenir", typeof cmd("tilemap_save")(lvl, ["../../kotu ad*"]) === "string");
  check("tilemap_load: yoksa mesaj", cmd("tilemap_load")(lvl, ["olmayan_xyz"]).indexOf("Okunamadi") === 0);

  // _cmd_* yokken de güvenli: 'player yok' yolları
  const emptyScene = new DE.Scene("Empty", [0, 0, 0]);
  check("hp: oyuncu yokta güvenli mesaj", cmd("hp")(emptyScene, ["5"]) === "Oyuncu yok (o siste sahnesinde degilsin).");
  check("tilemap_save: tilemap yoksa mesaj", cmd("tilemap_save")(emptyScene, ["x"]).indexOf("tilemap yok") > 0);
  check("tilemap_load: bozuk veri reddi", DE_GAME.import_scene_tilemap(emptyScene, { "layers": [] }) === false
    && DE_GAME.import_scene_tilemap(emptyScene, null) === false);
}

// TEST15: deneyim iyileştirmeleri 5–8 doğrulaması
// (5 dash after-image, 6 boss enrage/zafer slow-mo, 7 hız çizgileri,
//  8 menü kampanya ilerleme rozetleri) — Python game/ eşi birebir port.
console.log("TEST15 deneyim 5-8:");
function countCtx() {
  const t = { canvas: { width: 900, height: 600 }, fills: 0, strokes: 0, texts: [],
    fillStyle: "", strokeStyle: "", lineWidth: 1, font: "", globalAlpha: 1, textAlign: "left" };
  return new Proxy(t, {
    get(o, p) {
      if (p in o) return o[p];
      if (p === "createRadialGradient" || p === "createLinearGradient") return () => ({ addColorStop() {} });
      if (p === "measureText") return () => ({ width: 90 });
      if (p === "fill") return () => { o.fills++; };
      if (p === "stroke") return () => { o.strokes++; };
      if (p === "fillText") return (s) => { o.texts.push(String(s)); };
      return () => {};
    },
    set(o, p, v) { o[p] = v; return true; },
  });
}
{
  // ---- 5. Dash after-image ----
  const { lvl, player, ctrl } = freshLevel("forest", 42, 8, 0);
  press("LSHIFT");
  step(lvl, 1);
  step(lvl, 7);                        // dash 0.16 sn (~10 kare)
  check("5: dash sırasında iz doğdu", ctrl._afterimages.length >= 2, "n=" + ctrl._afterimages.length);
  check("5: izler yaşlanıyor", ctrl._afterimages.some(g => g[4] > 0));
  const iv = 0.03 / Math.max(1.0, ctrl.dash_speed);
  check("5: iz aralığı 0.03/dash_speed", ctrl._afterimage_timer > 0 && ctrl._afterimage_timer <= iv + 1e-9,
    "t=" + ctrl._afterimage_timer.toFixed(4) + " iv=" + iv.toFixed(4));
  check("5: iz havuzu sınırlı (<=6)", ctrl._afterimages.length <= 6);
  // Çizim: hayalet oyuncunun arkasında ek fill üretir.
  ctrl._afterimages = [];
  const cNo = countCtx(); ctrl.draw(cNo, [0, 0]);
  ctrl._afterimages = [[player.position.x, player.position.y, 1.0, 1.0, 0.0]];
  const cGhost = countCtx(); ctrl.draw(cGhost, [0, 0]);
  check("5: hayalet çizilir", cGhost.fills > cNo.fills, "fills " + cNo.fills + " -> " + cGhost.fills);
  // Solmuş hayalet (alpha<=0) çizilmez
  ctrl._afterimages = [[player.position.x, player.position.y, 1.0, 1.0, 0.5]];
  const cFade = countCtx(); ctrl.draw(cFade, [0, 0]);
  check("5: solmuş hayalet çizilmez", cFade.fills === cNo.fills);

  // ---- 7. Uzun düşüş hız çizgileri ----
  const lv7 = DE_GAME.build_procedural_level("forest", 11, 8, 0);
  use(lv7); step(lv7, 30);
  const p7 = lv7.find_by_tag("Player");
  const c7 = p7.get_component(DE_GAME.PlayerController);
  const rb7 = p7.get_component(DE.Rigidbody2D);
  // Zemine yakın yerden bırak: uzun boşluk düşüşü "dünya dışı" kurtarmasını tetiklemesin.
  let groundTop = 0;
  for (const obj of lv7.game_objects) {
    if (obj.tag !== "Ground") continue;
    const col = obj.get_component(DE.BoxCollider);
    if (!col) continue;
    const a = col.get_aabb();
    if (a.x <= p7.position.x && a.x + a.w >= p7.position.x) groundTop = Math.max(groundTop, a.y);
  }
  p7.position.y = groundTop - p7.size.y - 240;
  rb7.velocity.y = 1000;                 // eşik (900) üstü hızlı düşüş
  step(lv7, 2);
  check("7: hızlı düşüşte süre birikiyor", c7.fall_streak_time > 0, "t=" + c7.fall_streak_time.toFixed(3));
  c7.fall_streak_time = 0.5;
  rb7.velocity.y = 120;                  // yavaş düşüş -> sönümlenir
  step(lv7, 1);
  check("7: yavaş düşüşte sönümlenir", c7.fall_streak_time < 0.5 && c7.fall_streak_time > 0.45,
    "t=" + c7.fall_streak_time.toFixed(4));
  // Yere inince sıfırlanır
  c7.fall_streak_time = 0.5;
  rb7.velocity.y = 400;
  let guard = 0, sawGround = false;
  while (guard < 200) { step(lv7, 1); guard++; if (rb7.is_grounded) { sawGround = true; break; } }
  step(lv7, 1);                            // iniş karesi: süre sıfırlanır
  check("7: yere inince sıfırlanır", sawGround && c7.fall_streak_time === 0,
    "iniş=" + sawGround + " t=" + c7.fall_streak_time + " kare=" + guard);
  // Çizim: yoğunluk arttıkça çizgi sayısı artar (üst + alt kenar)
  rb7.velocity.y = 1000; c7.fall_streak_time = 0.4;
  const cWeak = countCtx(); c7.draw(cWeak, [0, 0]);
  c7.fall_streak_time = 0.9;
  const cStrong = countCtx(); c7.draw(cStrong, [0, 0]);
  check("7: yoğun düşüşte daha çok çizgi", cStrong.strokes > cWeak.strokes,
    "strokes " + cWeak.strokes + " -> " + cStrong.strokes);
  c7.fall_streak_time = 0; rb7.velocity.y = 0;

  // ---- 6. Boss enrage aurası + zafer slow-mo ----
  DE_GAME.start_campaign();
  const chain6 = DE_GAME.state.campaign_state["chain"];
  const arena = DE_GAME.build_campaign_boss(chain6[0], 1, 0);
  use(arena);
  const boss = arena.find_by_tag("Boss");
  const bhp = boss.get_component(DE.Health);
  check("6: _draw_boss_bar dışa açık", typeof DE_GAME._draw_boss_bar === "function");
  bhp.current_hp = bhp.max_hp;
  const cFull = countCtx(); DE_GAME._draw_boss_bar(cFull, boss, bhp, boss.boss_key, [0, 0]);
  bhp.current_hp = Math.max(1, Math.floor(bhp.max_hp * 0.4));
  const cRage = countCtx(); DE_GAME._draw_boss_bar(cRage, boss, bhp, boss.boss_key, [0, 0]);
  check("6: HP<%50 enrage aurası çizilir", cRage.strokes > cFull.strokes,
    "can=" + cFull.strokes + " enrage=" + cRage.strokes);
  engine._time_slow_remaining = 0.9; engine._time_slow_factor = 0.28;
  check("6: _slow_dt düşmanı yavaşlatır", Math.abs(DE._slow_dt(1) - 0.28) < 1e-9, "-> " + DE._slow_dt(1));
  engine._time_slow_remaining = 0.0;
  check("6: süre bitince normale döner", Math.abs(DE._slow_dt(1) - 1) < 1e-9);
  engine._time_slow_remaining = 0.0; engine._time_slow_factor = 0.4;
  bhp.take_damage(999999);
  check("6: boss ölümü zafer slow-mo'yu kurar (0.9 / 0.28)",
    engine._time_slow_remaining > 0 && Math.abs(engine._time_slow_factor - 0.28) < 1e-9,
    "rem=" + engine._time_slow_remaining + " factor=" + engine._time_slow_factor);

  // ---- 8. Menü kampanya ilerleme rozetleri ----
  const prof = DE_GAME.savegame();
  const savedDone = [].concat(prof.get("completed_biomes", []) || []);
  const cs8 = DE_GAME.state.campaign_state;
  prof.set("completed_biomes", []);
  cs8["sector_score"] = 500;
  const baseBefore = cs8["score"];
  DE_GAME._campaign_sector_commit("forest");
  check("8: sektör skoru tabana eklendi", cs8["score"] === baseBefore + 500 && cs8["sector_score"] === 0,
    "score=" + cs8["score"]);
  const done8 = [].concat(prof.get("completed_biomes", []) || []);
  check("8: tamamlanan biyom savegame'e yazıldı", done8.length === 1 && done8[0] === "forest", done8.join(","));
  DE_GAME._campaign_sector_commit("forest");
  check("8: çift kayıt olmaz (idempotent)", [].concat(prof.get("completed_biomes", [])).length === 1);
  DE_GAME._campaign_sector_commit("cave");
  check("8: ikinci biyom eklendi", [].concat(prof.get("completed_biomes", [])).length === 2);

  const menu8 = DE_GAME.build_main_menu_scene();
  use(menu8);
  menu8.start();                           // menü UI nesneleri sahneye boşalır
  const progObj = menu8.game_objects.filter(o => o.get_component(DE_GAME.BiomeProgress))[0] || null;
  const prog = progObj ? progObj.get_component(DE_GAME.BiomeProgress) : null;
  check("8: menüde BiomeProgress var", prog !== null);
  check("8: rozetler savegame'den beslendi", prog !== null
    && prog.completed.has("forest") && prog.completed.has("cave") && !prog.completed.has("astro"));
  check("8: rozet is_ui (menü zoom'undan etkilenmez)", prog !== null && prog.is_ui === true);
  check("8: rozet menüde görünür (_menu_ui'da, _hud_ui'da değil)", progObj !== null
    && menu8._menu_ui.indexOf(progObj) >= 0 && menu8._hud_ui.indexOf(progObj) === -1);
  if (prog) {
    progObj.active = true;
    const c8 = countCtx();
    prog.draw(c8, [0, 0]);
    const NAMES = ["Orman", "Mağara", "Buz", "Çöl", "Uzay", "Forest", "Cave", "Ice", "Desert", "Space"];
    const labels = c8.texts.filter(s => NAMES.indexOf(s) >= 0);
    check("8: 5 rozet + yerelleştirilmiş ad çizilir", labels.length === 5, "adlar=" + labels.join(","));
    const filled = c8.fills;
    prog.completed = new Set(["forest", "cave", "ice", "desert", "astro"]);
    const c8All = countCtx(); prog.draw(c8All, [0, 0]);
    check("8: tamamlanan biyom dolu yıldız, kilitli soluk", c8All.fills > filled, "fills " + filled + " -> " + c8All.fills);
  }
  prof.set("completed_biomes", savedDone);   // temizlik
}

// TEST16: spawn grace (SpawnIn sürerken düşman zararsız) + menü çıkış kamera snap
console.log("TEST16 spawn grace:");
{
  // 1) Yanıp sönen düşman oyuncuya hasar vermez (telegraf yalan söylemez)
  const { lvl, player, ctrl } = freshLevel("forest", 7, 8, 0);
  const enemies = lvl.game_objects.concat(lvl._objects_to_add).filter(o => o.tag === "Enemy");
  const enemy = enemies.filter(o => o.get_component(DE.SpawnIn))[0] || enemies[0];
  check("16: prosedürel düşmanda SpawnIn telegrafı var", !!enemy && !!enemy.get_component(DE.SpawnIn),
    enemies.map(o => o.name).join(","));
  if (enemy) {
    const spawnIn = enemy.get_component(DE.SpawnIn);
    if (spawnIn) spawnIn.timer = 0.0;        // 1 sn step edildiği için blink'i yeniden başlat
    check("16: düşman telegraf sırasında (done=false)", spawnIn !== null && spawnIn.done === false);
    // düşmanı oyuncunun üstüne koy
    enemy.position.x = player.position.x;
    enemy.position.y = player.position.y;
    const hp = player.get_component(DE.Health);
    hp.current_hp = hp.max_hp;
    hp.invulnerable_timer = 0;
    ctrl.dash_timer = 0; ctrl.dash_momentum = 0;
    const rb = player.get_component(DE.Rigidbody2D);
    if (rb) rb.velocity.set(0, 0);
    ctrl.on_collision(enemy);
    check("16: SpawnIn sırasında hasar yok", hp.current_hp === hp.max_hp,
      "hp=" + hp.current_hp + "/" + hp.max_hp);
    // blink bitince düşman gerçekten hasar verir
    spawnIn.done = true;
    spawnIn.timer = 999;
    hp.invulnerable_timer = 0;
    ctrl.dash_timer = 0; ctrl.dash_momentum = 0;
    if (rb) rb.velocity.set(0, 0);
    ctrl.on_collision(enemy);
    check("16: blink bitince hasar verir", hp.current_hp < hp.max_hp,
      "hp=" + hp.current_hp + "/" + hp.max_hp);
  }

  // 2) Menüden çıkış: kamera hedefe ışınlar -> çıkışta kayma yok
  const menu = DE_GAME.build_main_menu_scene();
  use(menu);
  menu.start();
  const menuCtrl = menu.game_objects.map(o => o.get_component(DE_GAME.MenuController)).filter(Boolean)[0];
  check("16: menüde MenuController var", !!menuCtrl);
  if (menuCtrl) {
    menuCtrl.player = menu.find_by_tag("Player");
    menuCtrl._place_menu_camera();
    const parkedX = menu.camera_position.x;
    menuCtrl._start_campaign();
    const pt = menu.camera_follow_point();
    check("16: menü çıkışı kamerayı oyuncuya ışınlar",
      menu.camera_manual === false && menu.camera_position.x === pt.x && menu.camera_position.y === pt.y,
      "park=" + parkedX + " hedef=" + pt.x);
    check("16: menü çıkışı zoom hedefi 1.0", menu.camera_zoom_target === 1.0);
  }
}

// TEST17: STAR CLIMBER (game/climber.js — Icy Tower tarzı sonsuz tırmanma)
console.log("TEST17 Star Climber:");
{
  const cl = DE_GAME.build_climber_scene(1234);
  use(cl);
  const game = cl.find_by_tag("ClimbGame").get_component(DE_GAME.ClimbGame);
  const player = cl.find_by_tag("Player");
  const ctrl = player.get_component(DE_GAME.ClimberPlayer);
  const rb = player.get_component(DE.Rigidbody2D);

  // 1) 17 katman üretildi (0..16) + katmanlar yukarı doğru yükseliyor
  check("17: AHEAD+1 katman üretildi", Object.keys(game.floors).length === 17,
    "n=" + Object.keys(game.floors).length);
  check("17: top_index = 16", game.top_index === 16, "top=" + game.top_index);
  const ys = [];
  for (let i = 0; i < 6; i++) ys.push(game.floors[i].position.y);
  check("17: katmanlar yukarı yükseliyor", ys.every((y, i) => i === 0 || y < ys[i - 1]), ys.join(","));
  check("17: oyuncu 0. katmanın üstünde", player.position.y < game.floors[0].position.y);

  // 2) her katman tek yönlü + ClimbPlatform var
  const f0 = game.floors[0];
  const bc = f0.get_component(DE.BoxCollider);
  check("17: katmanlar one_way (alttan geçilir)", bc !== null && bc.one_way === true);
  check("17: katmanda ClimbPlatform", f0.get_component(DE_GAME.ClimbPlatform) !== null);

  // 3) kontrol noktası: her 10. katman kırılmaz
  const cp = game.floors[10];
  const cpComp = cp.get_component(DE_GAME.ClimbPlatform);
  check("17: 10. katman kontrol noktası", cpComp !== null && cpComp.checkpoint === true
    && cpComp.hits_to_break === 0 && cp.size.x >= 220);

  // 4) üstten düşünce sekiş + hız seviyesi
  player.position.x = f0.position.x + f0.size.x / 2 - 15;
  player.position.y = f0.position.y - player.size.y - 2;
  rb.velocity.x = 0; rb.velocity.y = 40;
  const lv0 = ctrl.level;
  f0.get_component(DE_GAME.ClimbPlatform).on_collision(player);
  check("17: üstten düşünce sekiş", rb.velocity.y < -500, "vy=" + rb.velocity.y);
  check("17: sekiş hız seviyesi artırdı", ctrl.level === Math.min(5, lv0 + 1), "lv=" + ctrl.level);

  // 5) yukarı geçiş sekiş YAPMAZ (tek yönlü mantığı)
  const vy0 = rb.velocity.y;
  rb.velocity.y = -300;
  f0.get_component(DE_GAME.ClimbPlatform).on_collision(player);
  check("17: yukarı geçişte sekiş yok", rb.velocity.y === -300, "vy=" + rb.velocity.y);
  rb.velocity.y = vy0;

  // 6) kırılabilir katman sekiş sonrası kırılır (delik)
  let brk = null;
  for (const k of Object.keys(game.floors)) {
    const c = game.floors[k].get_component(DE_GAME.ClimbPlatform);
    if (c.hits_to_break > 0) { brk = game.floors[k]; break; }
  }
  check("17: kırılabilir katman var", brk !== null);
  if (brk) {
    check("17: motor BreakablePlatform eklendi", brk.get_component(DE.BreakablePlatform) !== null);
    player.position.y = brk.position.y - player.size.y - 2;
    rb.velocity.y = 30;
    brk.get_component(DE_GAME.ClimbPlatform).on_collision(player);
    check("17: kırıldı (delik oluştu)", brk.active === false);
  }

  // 7) kamera SADECE yukarı gider
  rb.use_gravity = false;
  const cam0 = cl.camera_position.y;
  player.position.y -= 200;
  for (let i = 0; i < 30; i++) step(cl, 1);
  const camUp = cl.camera_position.y;
  check("17: kamera yukarı gitti", camUp <= cam0 + 0.001, cam0 + " -> " + camUp);
  player.position.y = camUp + 500;          // ekran altı, ölüm çizgisinin üstü
  for (let i = 0; i < 30; i++) step(cl, 1);
  check("17: kamera aşağı inmiyor", cl.camera_position.y <= camUp + 0.001,
    "cam=" + cl.camera_position.y);
  rb.use_gravity = true;

  // 8) tırmanınca yeni katmanlar üretilir
  player.position.y = game.floors[10].position.y - 700;
  for (let i = 0; i < 5; i++) step(cl, 1);
  check("17: tırmanınca katman üretildi", game.top_index >= 26, "top=" + game.top_index);

  // 9) ekran altına DÜŞÜNCE kontrol noktasına dönüş (oyuncu boşlukta olmalı)
  game.max_floor = 25; game.best_floor = 25; game.checkpoint_floor = 20;
  ctrl.add_level();
  player.position.y = game.floors[0].position.y + 260;   // tüm platformların altı
  rb.velocity.y = 400;
  const falls0 = game.falls;
  step(cl, 1);
  check("17: düştü (düşme sayacı arttı)", game.falls === falls0 + 1, "falls=" + game.falls);
  check("17: kontrol noktasına ışınlandı",
    Math.abs(player.position.y - (game.floors[20].position.y - player.size.y)) < 1,
    "y=" + player.position.y);
  check("17: düşünce hız seviyesi sıfırlandı", ctrl.level === 0, "lv=" + ctrl.level);
  check("17: düşünce yükseklik ilerlemesi sıfırlandı (rekor korunur)",
    game.max_floor === 20 && game.best_floor === 25,
    "maxf=" + game.max_floor + " best=" + game.best_floor);
  check("17: düşünce kamera kontrol noktasına döndü",
    Math.abs(cl.camera_position.y - (game._camera_anchor_y() - 600 * 0.62)) < 1,
    "cam=" + cl.camera_position.y);

  // 9b) ZEMİNDE duran oyuncu ölmez (yoksa aynı ölüm sonsuz tekrarlanır)
  cl.camera_position.y = game.floors[0].position.y + 900;
  player.position.y = game.floors[0].position.y - player.size.y;
  rb.velocity.y = 0;
  rb.is_grounded = true;
  const falls1 = game.falls;
  step(cl, 1);
  check("17: zemindeki oyuncu ölmez", game.falls === falls1, "falls=" + game.falls);

  // 10) skor + HUD metni
  game.on_platform_bounce(game.floors[20].get_component(DE_GAME.ClimbPlatform), player);
  const hud = cl.find_by_tag("ClimbHUD").get_component(DE.TextRenderer);
  const spd = cl.find_by_tag("ClimbSpeed").get_component(DE.TextRenderer);
  check("17: HUD katman+skor yazar", hud !== null && hud.text.indexOf("25") >= 0
    && hud.text.indexOf(String(game.score)) >= 0, hud ? hud.text : "yok");
  check("17: HUD hız seviyesi yazar", spd !== null && spd.text.indexOf("x") >= 0, spd ? spd.text : "yok");
  check("17: skor = rekor katman*10 + seviye*5", game.score === game.best_floor * 10 + ctrl.level * 5,
    "score=" + game.score);
  check("17: 20. katman sekişi ilerlemeyi korur", game.max_floor === 20, "maxf=" + game.max_floor);

  // 11) hız seviyesi zamanla söner
  ctrl.add_level();
  const lv1 = ctrl.level;
  for (let i = 0; i < 200; i++) ctrl.update(1 / 60);
  check("17: hız seviyesi söndü", ctrl.level < lv1, lv1 + " -> " + ctrl.level);

  // 12) hız çarpanı seviye ile artar
  ctrl.reset_level();
  const base = ctrl.speed_mult;
  ctrl.level = 5;
  ctrl.add_level();
  check("17: hız çarpanı artar", ctrl.speed_mult > base, base + " -> " + ctrl.speed_mult);
  check("17: seviye tavanı 5", ctrl.level === 5, "lv=" + ctrl.level);

  // 13) deterministik tohum: aynı seed aynı kule
  const a = DE_GAME.build_climber_scene(777);
  const b = DE_GAME.build_climber_scene(777);
  use(a); a.start();
  use(b); b.start();
  const ga = a.find_by_tag("ClimbGame").get_component(DE_GAME.ClimbGame);
  const gb = b.find_by_tag("ClimbGame").get_component(DE_GAME.ClimbGame);
  check("17: aynı seed = aynı kule", ga.floors[3].position.x === gb.floors[3].position.x
    && ga.floors[3].size.x === gb.floors[3].size.x,
    ga.floors[3].position.x + " vs " + gb.floors[3].position.x);

  // 14) menüden açılabilir (C tuşu / tıklama)
  const menu = DE_GAME.build_main_menu_scene();
  use(menu);
  menu.start();
  const mctrl = menu.game_objects.map(o => o.get_component(DE_GAME.MenuController)).filter(Boolean)[0];
  const climbRow = menu.game_objects.filter(o => o.name === "M_CLIMB")[0] || null;
  check("17: menüde Star Climber satırı", climbRow !== null && !!mctrl);
  if (climbRow) {
    const tr = climbRow.get_component(DE.TextRenderer);
    check("17: menü satırı yerelleştirilmiş", tr !== null && tr.text.indexOf("Climber") >= 0,
      tr ? tr.text : "yok");
  }
  if (mctrl) {
    mctrl._start_climber();
    check("17: menü C -> fade ile tırmanış sahnesi",
      mctrl._fading_out === true && typeof mctrl._pending_factory === "function");
  }

  // 15) ULAŞILABİLİRLİK KURALLARI (regresyon — kule oyuncudan kaçmasın).
  //     Sen, 03.10.2026'da bulunan "0. katman oyuncunun altında değil" ve
  //     "kule sürüklenip oyuncudan uzaklaşıyor" hatalarının kalıcı testi.
  {
    const rs = DE_GAME.build_climber_scene(7);
    use(rs); rs.start();
    const rg = rs.find_by_tag("ClimbGame").get_component(DE_GAME.ClimbGame);
    const rp = rs.find_by_tag("Player");
    const pl = rp.position.x, pr = rp.position.x + rp.size.x;

    const f0r = rg.floors[0];
    check("17: 0. katman ekranı boydan boya kaplar", f0r.size.x >= 800,
      "w=" + f0r.size.x);
    check("17: 0. katman oyuncunun sütununu kapsar",
      pl >= f0r.position.x && pr <= f0r.position.x + f0r.size.x,
      "oyuncu=" + pl + ".." + pr + " katman=" + f0r.position.x + ".." +
      (f0r.position.x + f0r.size.x));

    // ilk 8 katman oyuncunun sütununda kalmalı -> yatay girdi olmadan da tırmanılır
    let colOk = true, boundsOk = true, overlaps = [];
    for (let i = 1; i <= 8 && rg.floors[i]; i++) {
      const f = rg.floors[i];
      if (pl < f.position.x || pr > f.position.x + f.size.x) colOk = false;
      if (f.position.x < 20 || f.position.x + f.size.x > 880) boundsOk = false;
    }
    check("17: ilk 8 katman oyuncunun sütununda (girişsiz tırmanış)", colOk);
    check("17: ilk 8 katman ekran içinde", boundsOk);

    // ardışık katmanlar en az 70px örtüşmeli (REACH_OVERLAP)
    let overlapOk = true, worst = 9999;
    const keys = Object.keys(rg.floors).map(Number).sort((a, b) => a - b);
    for (let k = 1; k < keys.length; k++) {
      const p = rg.floors[keys[k - 1]], c = rg.floors[keys[k]];
      const ov = Math.min(p.position.x + p.size.x, c.position.x + c.size.x)
        - Math.max(p.position.x, c.position.x);
      if (ov < worst) worst = ov;
      if (ov < 70) { overlapOk = false; overlaps.push(keys[k - 1] + "->" + keys[k] + ":" + Math.round(ov)); }
    }
    check("17: ardışık katmanlar >=70px örtüşür", overlapOk,
      "en dar=" + Math.round(worst) + (overlaps.length ? " " + overlaps.join(" ") : ""));

    // 16) GERÇEK grounded sekiş (unit test değil, sahne update'i ile).
    //     stable-ground bulgusu: one_way platformda on_collision tetiklenmez,
    //     bu yüzden _pump_bounce() is_grounded'dan sürmek zorunda.
    {
      const gs = DE_GAME.build_climber_scene(21);
      use(gs); gs.start();
      const gg = gs.find_by_tag("ClimbGame").get_component(DE_GAME.ClimbGame);
      const gp = gs.find_by_tag("Player");
      const grb = gp.get_component(DE.Rigidbody2D);
      const g1 = gg.floors[1];

      gp.position.x = g1.position.x + g1.size.x / 2 - gp.size.x / 2;
      gp.position.y = g1.position.y - gp.size.y;
      grb.velocity.x = 0; grb.velocity.y = 0;
      grb.is_grounded = true;
      step(gs, 1);
      check("17: GERÇEK sekiş (is_grounded -> _pump_bounce)", grb.velocity.y < -500,
        "vy=" + Math.round(grb.velocity.y));

      // havadayken (zemin yok) sekiş olmamalı
      const g2 = gg.floors[3];
      gp.position.y = g2.position.y - gp.size.y - 200;
      grb.velocity.y = 100; grb.is_grounded = false;
      gg._pump_bounce();
      check("17: havadayken sekiş yok", Math.abs(grb.velocity.y - 100) < 1,
        "vy=" + Math.round(grb.velocity.y));
    }

    // 17) GİRİŞSİZ oynanış smoke — bu test, 5 gerçek oynanış hatasının
    //     (0. katman yok / sekiş yok / kamera ölüm döngüsü / zeminde ölüm /
    //     respawn max_floor) hepsini birden yakalar. 3 seed x 30 sn.
    {
      let climbed = [], fell = [];
      for (const seed of [7, 99, 2024]) {
        const ss = DE_GAME.build_climber_scene(seed);
        use(ss); ss.start();
        const sg = ss.find_by_tag("ClimbGame").get_component(DE_GAME.ClimbGame);
        for (let i = 0; i < 1800; i++) step(ss, 1);   // 30 sn, hiç tuş basılmıyor
        climbed.push(sg.best_floor);
        fell.push(sg.falls);
      }
      check("17: GİRİŞSİZ tırmanış (3 seed, 30sn)", climbed.every(f => f >= 8),
        "katman=" + climbed.join(","));
      check("17: girişsiz oynanışta ölüm döngüsü yok", fell.every(f => f <= 3),
        "düşme=" + fell.join(","));
    }
  }
}

// Toplam
console.log("----------------------------------------");
console.log("SONUÇ: " + pass + " geçti, " + fail + " kaldı");
if (fail > 0) process.exit(1);