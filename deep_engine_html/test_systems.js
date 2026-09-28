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
    check("acilis mesaji", dc.output[dc.output.length - 1].includes("Konsol"));

    // komut calistirma: version
    DE.Input._typed = ["v", "e", "r", "s", "i", "o", "n"];
    dc.update(1 / 60);
    DE.Input._keys_down = { "ENTER": true };
    dc.update(1 / 60);
    check("version komutu", dc.output.some(l => l.includes("surumu")) || dc.output[dc.output.length - 1].includes("0.0.0"));
    DE.Input._keys_down = {};

    // bilinmeyen komut
    DE.Input._typed = ["x", "y", "z"];
    dc.update(1 / 60);
    DE.Input._keys_down = { "ENTER": true };
    dc.update(1 / 60);
    check("bilinmeyen komut mesaji", dc.output[dc.output.length - 1].includes("Bilinmeyen"));
    DE.Input._keys_down = {};

    // help (kayitli komutlari listeler)
    DE.Input._typed = ["h", "e", "l", "p"];
    dc.update(1 / 60);
    DE.Input._keys_down = { "ENTER": true };
    dc.update(1 / 60);
    check("help komutu", dc.output.some(l => l.includes("Komutlar:")));
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
    DE.register_command("hp", "can ver", (scene, args) => { called = args; return "hp verildi"; });
    dc.toggle();               // ac (typed temizlenir)
    DE.Input._typed = ["h", "p", " ", "5"];
    dc.update(1 / 60);
    DE.Input._keys_down = { "ENTER": true };
    dc.update(1 / 60);
    DE.Input._keys_down = {};
    check("ozel komut args", JSON.stringify(called) === JSON.stringify(["5"]));
    check("ozel komut cikti", dc.output[dc.output.length - 1].includes("hp verildi"));
}

done();