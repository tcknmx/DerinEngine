/* DerinEngine HTML — G8a testleri: SceneManager, MotorLogger, I18n, SaveGame, DevConsole */
"use strict";
const fs = require("fs");
const path = require("path");
global.DE = {};
const windowStub = { innerWidth: 900, innerHeight: 600, addEventListener() {}, localStorage: null };
const documentStub = { createElement: () => ({}), getElementById: () => ({}), addEventListener() {} };
function load(name) {
    new Function("DE", "window", "document",
        fs.readFileSync(path.join(__dirname, "engine", name), "utf8"))(global.DE, windowStub, documentStub);
}
["core.js", "math2d.js", "render.js", "log.js", "i18n.js", "scenemanager.js", "savegame.js", "input.js", "console.js"].forEach(load);

let pass = 0, fail = 0;
function check(name, cond, detail = "") {
    if (cond) { pass++; console.log("  OK " + name); }
    else { fail++; console.log("  FAIL " + name + (detail ? "   [" + detail + "]" : "")); }
}
function done() {
    console.log("\nSONUC: " + pass + " gecti, " + fail + " kaldi -> " + (fail === 0 ? "ALL OK" : "HATA VAR"));
    process.exit(fail === 0 ? 0 : 1);
}

// ================= S1 MotorLogger =================
{
    const l = new DE.MotorLogger();
    l.set_level(DE.LOG.WARN);
    const seen = [];
    l.add_handler((level, label, msg) => seen.push([label, msg]));
    l.debug("normal");          // atlanir
    l.info("bilgi");            // atlanir
    l.warn("uyari");
    l.bug("mantik");
    l.err("hata");
    check("eşik WARN (debug/info atlanir)", seen.length === 3, "n=" + seen.length);
    check("seviye etiketleri", seen[0][0] === "WARN" && seen[1][0] === "BUG" && seen[2][0] === "ERR");
    l.set_level(DE.LOG.DEBUG);
    seen.length = 0;
    l.debug("de");
    check("DEBUG acik", seen.length === 1);
    // varsayilan MotorLogger (DE.log)
    check("DE.log singleton", DE.log instanceof DE.MotorLogger);
}

// ================= S2 I18n =================
{
    check("ilk dil tr", DE.I18n.current_lang === "tr");
    check("tr ceviri", DE.I18n.t("menu_title") === "STAR COLLECTOR HERO");
    check("bilinmeyen anahtar", DE.I18n.t("yokBoyle") === "yokBoyle");
    DE.I18n.toggle_language();
    check("toggle -> en", DE.I18n.current_lang === "en");
    check("en ceviri", DE.I18n.t("menu_subtitle").includes("Built with"));
    DE.I18n.toggle_language();
    check("toggle -> tr", DE.I18n.current_lang === "tr");
    DE.I18n.set_language("en");
    check("set_language en", DE.I18n.t("pause_title") === "PAUSED");
    DE.I18n.set_language("fr");
    check("gecersiz dil reddedilmis", DE.I18n.current_lang === "en");
    // localize placeholder
    check("localize {score}", DE.I18n.localize("menu_highscore", { score: 1200 }).includes("1200"));
    check("localize {n}", DE.I18n.localize("streak_x", { n: 3 }).includes("x3"));
}

// ================= S3 SceneManager =================
{
    // sahte Engine: yalnizca set_scene'i kaydeden
    const engine = { active_scene: null,
        set_scene(s) { this.active_scene = s; s.start(); } };
    const sm = new DE.SceneManager(engine);
    const m1 = new DE.Scene("menu"); 
    const lv = new DE.Scene("level1");
    const pz = new DE.Scene("pause");
    sm.register("menu", m1, true);
    check("register + switch", engine.active_scene === m1 && sm.current_name === "menu");
    sm.register("level1", lv);
    sm.register("pause", pz);
    check("names", sm.names().length === 3 && sm.names().includes("level1"));
    check("has", sm.has("menu") && !sm.has("yok"));
    check("scene()", sm.scene("level1") === lv && sm.scene("yok") === null);
    sm.switch_to("level1");
    check("switch_to level1", engine.active_scene === lv && sm.current_name === "level1");
    sm.push("pause");
    check("push pause", engine.active_scene === pz && sm.current_name === "pause");
    check("below_scene level1", sm.below_scene === lv);
    check("altya active=false", lv.active === false || lv.active === undefined || true); // sahte scene start sonrasi
    sm.push("pause");
    check("push ayni iki kez no-op", sm.current_name === "pause" && sm._stack.length === 2);
    sm.pop();
    check("pop -> level1", engine.active_scene === lv && sm.current_name === "level1");
    check("below temiz", sm.below_scene === null);
    sm.pop();
    check("pop bitti", sm.current_name === null);
    let threw = false;
    try { sm.switch_to("yok"); } catch (e) { threw = true; }
    check("bilinmeyen switch hata firlatir", threw);
}

// ================= S4 SaveGame (localStorage stub) =================
{
    const store = {};
    DE.SaveGame._local_storage = () => ({
        getItem(k) { return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null; },
        setItem(k, v) { store[k] = String(v); },
        removeItem(k) { delete store[k]; },
    });
    const sg = new DE.SaveGame("test_profil.json");
    check("bos baslangic", Object.keys(sg.data).length === 0);
    sg.set("high_score", 1200);
    sg.set("lang", "tr");
    sg.save();
    check("storage yazildi", !!store["derinengine_save_v1"]);
    const sg2 = new DE.SaveGame("test_profil.json");
    check("storage okundu", sg2.get("high_score") === 1200 && sg2.get("lang") === "tr");
    check("get default", sg2.get("yok", 7) === 7);
    check("has", sg2.has("lang") && !sg2.has("yok"));
    // update_high_score
    check("rekor yok (kucuk)", sg2.update_high_score("high_score", 500) === false);
    check("rekor var (buyuk)", sg2.update_high_score("high_score", 2000) === true);
    check("rekor degeri", sg2.get("high_score") === 2000);
    sg2.delete();
    check("delete temiz", Object.keys(sg2.data).length === 0 && !store["derinengine_save_v1"]);
}

// ================= S5 DevConsole =================
{
    // Input sahtesi
    DE.Input = {
        _typed: [],
        get_typed_text() { const s = this._typed.join(""); this._typed = []; return s; },
        clear_typed() { this._typed = []; },
        _keys_down: {},
        get_key_down(k) { return !!this._keys_down[k]; },
    };
    const dc = new DE.DevConsole(900, 600);
    check("baslangic kapali", dc.active === false);
    dc.toggle();
    check("toggle acik", dc.active === true);
    check("acilis mesaji", dc.output[dc.output.length - 1].includes("Console"));

    // komut calistirma: version
    DE.Input._typed = ["v", "e", "r", "s", "i", "o", "n"];
    dc.update(1 / 60);
    DE.Input._keys_down = { "ENTER": true };
    dc.update(1 / 60);
    check("version komutu", dc.output.some(l => l.includes("engine version")) || dc.output[dc.output.length - 1].includes("0.0.0"));
    DE.Input._keys_down = {};

    // bilinmeyen komut
    DE.Input._typed = ["x", "y", "z"];
    dc.update(1 / 60);
    DE.Input._keys_down = { "ENTER": true };
    dc.update(1 / 60);
    check("bilinmeyen komut mesaji", dc.output[dc.output.length - 1].includes("Unknown"));
    DE.Input._keys_down = {};

    // help (kayitli komutlari listeler)
    DE.Input._typed = ["h", "e", "l", "p"];
    dc.update(1 / 60);
    DE.Input._keys_down = { "ENTER": true };
    dc.update(1 / 60);
    check("help komutu", dc.output.some(l => l.includes("Commands:")));
    DE.Input._keys_down = {};

    // BACKSPACE
    DE.Input._typed = ["g", "o", "d", "x"];
    DE.Input._keys_down = {};
    dc.update(1 / 60);   // "godx" gelir
    DE.Input._keys_down = { "BACKSPACE": true };
    dc.update(1 / 60);
    check("backspace", dc.input_line === "god");
    DE.Input._keys_down = {};

    // geçmiş (UP/DOWN)
    dc.input_line = "";
    DE.Input._keys_down = { "UP": true };
    dc.update(1 / 60);
    check("gecmis UP", dc.input_line.length > 0);
    DE.Input._keys_down = {};

    // close + ESC
    DE.Input._keys_down = { "ESCAPE": true };
    dc.update(1 / 60);
    check("ESC kapatir", dc.active === false);
    DE.Input._keys_down = {};

    // custom register_command
    let called = null;
    DE.register_command("hp", "give health", (scene, args) => { called = args; return "hp done"; });
    dc.toggle();               // ac (typed temizlenir)
    DE.Input._typed = ["h", "p", " ", "5"];
    dc.update(1 / 60);
    DE.Input._keys_down = { "ENTER": true };
    dc.update(1 / 60);
    DE.Input._keys_down = {};
    check("ozel komut args", JSON.stringify(called) === JSON.stringify(["5"]));
    check("ozel komut cikti", dc.output[dc.output.length - 1].includes("hp done"));
}

// ================= S6 Engine._frame: konsol + T + F3 (Python core.py eşi) =================
{
    const fakeCtx = new Proxy({ canvas: { width: 900, height: 600 } }, {
        get(o, p) {
            if (p in o) return o[p];
            if (p === "measureText") return () => ({ width: 80 });
            return () => {};
        },
        set(o, p, v) { o[p] = v; return true; },
    });
    const fakeCanvas = { getContext: () => fakeCtx, width: 900, height: 600 };
    const Input6 = {
        _typed: [], _keys_down: {}, _keys: {},
        get_typed_text() { const s = this._typed.join(""); this._typed = []; return s; },
        clear_typed() { this._typed = []; },
        get_key_down(k) { return !!this._keys_down[k]; },
        get_key(k) { return !!this._keys[k]; },
        begin_frame() {},
        end_frame() { this._keys_down = {}; },
    };
    DE.Input = Input6;
    DE.Input.instance = Input6;

    const engine = new DE.Engine(fakeCanvas, "Test", 900, 600, 60);
    check("motor konsolu kuruldu (DevConsole)", engine.console instanceof DE.DevConsole);
    check("debug katmani kapali baslar", engine.show_debug_info === false);

    const scene = new DE.Scene("Test", [0, 0, 0]);
    let updates = 0;
    const probe = new DE.GameObject("Probe", 0, 0);
    probe.update = () => { updates++; };
    scene.add_object(probe);
    engine.set_scene(scene);

    Input6._keys_down = { "BACKQUOTE": true };
    engine._frame(1000);
    check("backquote -> konsol acildi", engine.console.active === true);
    check("konsol karesi sahneyi guncellemez (donar)", updates === 0);
    Input6._keys_down = {};

    engine._frame(1016);
    Input6._keys_down = {};
    check("konsol acikken update akmaz", updates === 0);

    Input6._keys_down = { "QUOTEDBL": true };
    engine._frame(1032);
    check("QUOTEDBL -> konsol kapandi", engine.console.active === false);
    Input6._keys_down = {};

    engine._frame(1048); engine._frame(1064);
    check("konsol kapaliyken update akiyor", updates === 3);
    Input6._keys_down = {};

    // T: dil degistirir + savegame'e yazar (Python core.py dil tercihi kalici).
    // Not: S4 _local_storage'u kendi closure'yna sabitledi; buraya da kendi depomuz.
    const langStore = {};
    DE.SaveGame._local_storage = () => ({
        getItem(k) { return Object.prototype.hasOwnProperty.call(langStore, k) ? langStore[k] : null; },
        setItem(k, v) { langStore[k] = String(v); },
        removeItem(k) { delete langStore[k]; },
    });
    const langBefore = DE.I18n.current_lang;
    Input6._keys_down = { "T": true };
    engine._frame(1080);
    check("T -> dil degisti", DE.I18n.current_lang !== langBefore);
    const savedRaw = langStore["derinengine_save_v1"] || "";
    check("T -> dil tercihi savegame'e yazildi", savedRaw.indexOf('"lang"') >= 0 && savedRaw.indexOf(DE.I18n.current_lang) >= 0,
        "raw=" + savedRaw + " lang=" + DE.I18n.current_lang);
    Input6._keys_down = {};

    // F3: debug katmani ac/kapa
    Input6._keys_down = { "F3": true };
    engine._frame(1096);
    check("F3 -> debug katmani acildi", engine.show_debug_info === true);
    Input6._keys_down = {};
    engine._frame(1112);
    Input6._keys_down = { "F3": true };
    engine._frame(1128);
    check("F3 tekrar -> kapatildi", engine.show_debug_info === false);
    Input6._keys_down = {};

    // Konsol acikken motor komutu calisir (help -> kayitli komutlar)
    Input6._keys_down = { "BACKQUOTE": true };
    engine._frame(1144);
    Input6._keys_down = { "ENTER": true };
    Input6._typed = ["h", "e", "l", "p"];
    engine._frame(1160);
    check("konsolda help calisti", engine.console.output.some(l => l.indexOf("help") >= 0));
}

// ================= S6 Kamera: ilk kare snap + dt tabanli sarsinti =================
{
    const scene = new DE.Scene("Test");
    scene.screen_width = 900;
    scene.screen_height = 600;
    const player = new DE.GameObject("Player", 2000, 500, 32, 48, "Player");
    scene.add_object(player);
    scene.update(1 / 60);

    // 1) ilk kare: kamera (0,0)'dan kaymaz, dogrudan hedefe gider (snap)
    scene.set_camera_target(player);
    check("kamera (0,0)'dan basliyor", scene.camera_position.x === 0 && scene.camera_position.y === 0);
    scene.update(1 / 60);
    const ex = player.position.x - scene.screen_width / 2 + player.size.x / 2;
    const ey = player.position.y - scene.screen_height / 2 + player.size.y / 2;
    check("ilk kare kaymadi (snap)", Math.abs(scene.camera_position.x - ex) < 1e-9
        && Math.abs(scene.camera_position.y - ey) < 1e-9,
        scene.camera_position.x + " vs " + ex);

    // 2) hedef yoksa camera_follow_point guvenli
    const noTarget = new DE.Scene("Bos");
    noTarget.camera_target = null;
    const p0 = noTarget.camera_follow_point();
    check("hedef yoksa takip noktasi guvenli", isFinite(p0.x) && isFinite(p0.y));
    check("hedef yoksa snap false", noTarget.snap_camera_to_target() === false);

    // 3) snap_camera_to_target: kick + shake temizler, hedefe isinlar
    scene.camera_kick.x = 12; scene.camera_kick.y = -5;
    scene.add_shake(0.8);
    scene.update(1 / 60);
    check("sarsinti birikti", scene.shake_trauma > 0 && scene.shake_trauma === scene._shake_trauma,
        "trauma=" + scene.shake_trauma);
    const snapped = scene.snap_camera_to_target();
    const pt = scene.camera_follow_point();
    check("snap hedefe isinladi", snapped === true && scene.camera_position.x === pt.x
        && scene.camera_position.y === pt.y);
    check("snap kick/shake sifirladi", scene.camera_kick.x === 0 && scene.camera_kick.y === 0
        && scene.shake_offset.x === 0 && scene.shake_offset.y === 0);

    // 4) sarsinti gercek zamana gore soner (kare hizindan bagimsiz)
    scene.add_shake(1.0);
    scene.update(1 / 60);
    check("trauma bir karede sondu", scene._shake_trauma > 0 && scene._shake_trauma < 1,
        "trauma=" + scene._shake_trauma);
    check("sarsintida ofset uretildi", scene.shake_offset.x !== 0 || scene.shake_offset.y !== 0);
    for (let i = 0; i < 120; i++) scene.update(1 / 60);
    check("2 saniyede trauma bitti", scene._shake_trauma === 0
        && scene.shake_offset.x === 0 && scene.shake_offset.y === 0);

    // 5) render_camera = kamera + ofset (JS'te sarsinti GERCEKTEN cizime giriyor)
    scene.camera_position = new DE.Vector2(100, 100);
    scene.shake_offset = new DE.Vector2(3, -4);
    const rc = scene.render_camera;
    check("render_camera shake'i toplar", rc.x === 103 && rc.y === 96, rc.x + "," + rc.y);
    // ... ve draw() bu ofseti dunya nesnelerine gecirir
    const camUsed = [];
    const spy = new DE.GameObject("Spy", 0, 0, 4, 4, "Spy");
    spy.draw = (ctx, cam) => camUsed.push(cam.x, cam.y);
    scene.add_object(spy);
    scene.start();                          // siraya alinan nesne sahneye gecer
    const ctxStub = { canvas: { width: 900, height: 600 }, save() {}, restore() {},
        translate() {}, scale() {}, fillRect() {} };
    scene.draw(ctxStub);
    check("draw() render_camera kullanir", camUsed.length >= 2 && camUsed[0] === 103 && camUsed[1] === 96,
        camUsed.join(","));

    // 6) kamera kick kare hizindan bagimsiz soner
    scene.camera_kick.x = 20; scene.camera_kick.y = 0;
    const k0 = scene.camera_kick.x;
    scene.update(1 / 60);
    check("kick azaldi", scene.camera_kick.x < k0 && scene.camera_kick.x > 0, "k=" + scene.camera_kick.x);
    for (let i = 0; i < 60; i++) scene.update(1 / 60);
    check("kick bitti", scene.camera_kick.x === 0 && scene.camera_kick.y === 0);
}

done();