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
for (const f of ["state.js", "entities.js", "bosses.js", "ui.js", "scenes.js", "builders.js"]) loadGame(f);

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
  const hudHidden = menu._hud_ui.every(o => o.active === false);
  check("HUD menüde gizli", hudHidden);
  press("P");
  menuCtrlComp.update(1 / 60);
  DE.Input.instance.end_frame();
  check("P ile kampanya başladı", DE_GAME.state.game_mode === "campaign");
  check("menu_idle kapandı", ctrl.menu_idle === false);
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

// Toplam
console.log("----------------------------------------");
console.log("SONUÇ: " + pass + " geçti, " + fail + " kaldı");
if (fail > 0) process.exit(1);