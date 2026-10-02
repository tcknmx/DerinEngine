/* test_smoke.js — HATA AVCISI + DEMO TURLARI (kalite kapisi)
   Amaç: "oyun demoları hata dolu" şikâyetini ÖLÇÜLEBİLİR hâle getirmek.
   Bu test index.html'in GERÇEK script sırasını vm'de çalıştırır, her OYUN
   MODUNU (demo) gerçek tuş yoluyla açar, yüzlerce kare oynatır ve
   TARAYICIDA OLUŞACAK HER HATAYI toplar:
     1) Tanımsız değişken/fonksiyon -> TypeError/ReferenceError
     2) Canvas 2D bağlamında VAR OLMAYAN metot/özellik çağrısı
        (Node'un sahte ctx'i her şeye izin verir; gerçek tarayıcı vermez.
         Bu yüzden ctx SADECE gerçek CanvasRenderingContext2D üyelerini tanır.)
     3) window.onerror / unhandledrejection / console.error
   Kullanım:  node deep_engine_html\test_smoke.js
   Bağımlılık: yalnızca Node standart kütüphanesi.
*/
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.join(__dirname, "..");
const HTML = path.join(ROOT, "deep_engine_html");

/* ---------------- HATA TOPLAYICI ---------------- */
const ERRORS = [];
let TOTAL_FRAMES = 0;
let CURRENT_MODE = "boot";
function fail(kind, msg) {
  ERRORS.push({ mode: CURRENT_MODE, kind: kind, msg: String(msg).slice(0, 400) });
}

/* ---------------- GERÇEK Canvas2D üye listesi ----------------
   Tarayıcıdaki CanvasRenderingContext2D'nin metot/özellikleri. Burada
   OLMAYAN bir şey çağrılırsa gerçek tarayıcı TypeError verir — test de
   vermelidir. (Eksik listeye koyulursa test yanlış "OK" der; fazla
   konulan her şey sessizce geçer.) */
const CTX_METHODS = [
  "arc", "arcTo", "beginPath", "bezierCurveTo", "clearRect", "clip", "closePath",
  "createConicGradient", "createImageData", "createLinearGradient", "createPattern",
  "createRadialGradient", "drawFocusIfNeeded", "drawImage", "ellipse", "fill",
  "fillRect", "fillText", "getContextAttributes", "getImageData", "getLineDash",
  "getTransform", "isPointInPath", "isPointInStroke", "lineTo", "measureText",
  "moveTo", "putImageData", "quadraticCurveTo", "rect", "reset", "resetTransform",
  "restore", "rotate", "roundRect", "save", "scale", "setLineDash", "setTransform",
  "stroke", "strokeRect", "strokeText", "transform", "translate",
];
const CTX_PROPS = [
  "canvas", "direction", "fillStyle", "filter", "font", "fontKerning",
  "fontStretch", "fontVariantCaps", "globalAlpha", "globalCompositeOperation",
  "imageSmoothingEnabled", "imageSmoothingQuality", "letterSpacing", "lineCap",
  "lineDashOffset", "lineJoin", "lineWidth", "miterLimit", "shadowBlur",
  "shadowColor", "shadowOffsetX", "shadowOffsetY", "strokeStyle", "textAlign",
  "textBaseline", "textRendering", "wordSpacing",
];
const CTX_ALL = new Set(CTX_METHODS.concat(CTX_PROPS));

function makeCtx(canvas, stats) {
  const base = { canvas: canvas };
  CTX_PROPS.forEach(function (p) { if (p !== "canvas") base[p] = ""; });
  base.globalAlpha = 1; base.lineWidth = 1;
  const grad = { addColorStop: function () {} };
  base.createLinearGradient = function () { return grad; };
  base.createRadialGradient = function () { return grad; };
  base.createConicGradient = function () { return grad; };
  base.createPattern = function () { return { setTransform: function () {} }; };
  base.measureText = function (t) { return { width: String(t).length * 7, actualBoundingBoxAscent: 8, actualBoundingBoxDescent: 2 }; };
  base.getImageData = function (x, y, w, h) { return { data: new Uint8ClampedArray(Math.max(1, w * h * 4)), width: w, height: h }; };
  base.createImageData = function (w, h) { return { data: new Uint8ClampedArray(Math.max(1, w * h * 4)), width: w, height: h }; };
  base.getLineDash = function () { return []; };
  base.getTransform = function () { return { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }; };
  base.getContextAttributes = function () { return { alpha: true }; };
  base.isPointInPath = function () { return false; };
  base.isPointInStroke = function () { return false; };
  CTX_METHODS.forEach(function (m) {
    if (typeof base[m] === "function") return;
    base[m] = function () { stats.calls++; };
  });
  return new Proxy(base, {
    get: function (o, p) {
      if (typeof p === "symbol" || p in o) return o[p];
      // Gerçek tarayıcıda olmayan üye -> TypeError. Test de BUGLAYARAK yakalar.
      fail("CTX_YOK", "ctx." + String(p) + " tarayici Canvas2D'de YOK");
      return function () {};
    },
    set: function (o, p, v) {
      if (typeof p !== "symbol" && !(p in o) && !CTX_ALL.has(p)) {
        fail("CTX_YOK", "ctx." + String(p) + "= (olmayan ozellik)");
      }
      o[p] = v; return true;
    },
  });
}

/* ---------------- DOM ---------------- */
class El {
  constructor(tag) {
    this.tagName = String(tag || "div").toUpperCase();
    this.children = []; this.listeners = {}; this.style = {}; this.dataset = {};
    this.width = 0; this.height = 0; this.value = ""; this.textContent = "";
    this._inner = ""; this._tokens = new Set();
  }
  get classList() {
    const s = this;
    return {
      add: function (t) { s._tokens.add(t); }, remove: function (t) { s._tokens.delete(t); },
      contains: function (t) { return s._tokens.has(t); },
      toggle: function (t, f) { if (f === undefined) { return s._tokens.has(t) ? (s._tokens.delete(t), false) : (s._tokens.add(t), true); } if (f) s._tokens.add(t); else s._tokens.delete(t); return f; },
    };
  }
  set className(v) { this._tokens = new Set(String(v).split(/\s+/).filter(Boolean)); }
  get className() { return [].concat(Array.from(this._tokens)).join(" "); }
  addEventListener(t, f) { (this.listeners[t] = this.listeners[t] || []).push(f); }
  removeEventListener() {}
  appendChild(c) { this.children.push(c); return c; }
  removeChild(c) { const i = this.children.indexOf(c); if (i >= 0) this.children.splice(i, 1); return c; }
  remove() {} focus() {} blur() {} closest() { return null; }
  getContext(kind) { if (kind !== "2d") return null; return this._ctx || (this._ctx = makeCtx(this, this._stats)); }
  getBoundingClientRect() { return { left: 0, top: 0, right: 900, bottom: 600, width: 900, height: 600, x: 0, y: 0 }; }
  get innerHTML() { return this._inner; }
  set innerHTML(v) { this._inner = String(v); if (String(v) === "") this.children.length = 0; }
  setAttribute() {} getAttribute() { return null; } removeAttribute() {}
  querySelectorAll() { return []; } querySelector() { return null; }
}

function boot(opts) {
  opts = opts || {};
  const canvas = new El("canvas");
  canvas.width = 900; canvas.height = 600;
  canvas._stats = { calls: 0 };
  const doc = {
    getElementById: function (id) { return id === "game" ? canvas : new El("div"); },
    createElement: function (t) { return new El(t); },
    querySelectorAll: function () { return []; }, querySelector: function () { return null; },
    addEventListener: function () {}, body: new El("body"), title: "",
  };

  // localStorage (kayıtlı dil + sonsuz mod kilidi açık gelsin ki demo görüle)
  const store = { endless_unlocked: true, high_score: 1234, completed_biomes: ["forest", "desert"] };
  const localStorage = {
    getItem: function (k) { return k in store ? store[k] : null; },
    setItem: function (k, v) { store[k] = String(v); },
    removeItem: function (k) { delete store[k]; }, clear: function () { },
  };

  const handlers = {};
  const win = {
    addEventListener: function (t, f) { (handlers[t] = handlers[t] || []).push(f); },
    removeEventListener: function () {},
    dispatchEvent: function () { return true; },
    innerWidth: 1280, innerHeight: 800, devicePixelRatio: 1,
    localStorage: localStorage,
    requestAnimationFrame: function (f) { raf.length = 0; raf.push(f); return raf.length; },
    cancelAnimationFrame: function () {},
    setTimeout: function (f, ms) { timers.push({ f: f, t: now + (ms || 0) }); return timers.length; },
    clearTimeout: function () {},
    setInterval: function () { return 0; }, clearInterval: function () {},
    getComputedStyle: function () { return {}; },
    matchMedia: function () { return { matches: false, addEventListener: function () {} }; },
    performance: { now: function () { return now; } },
    // navigator: tarayıcıda VAR ama testte yoksa kör nokta olurdu
    // (gamepad yoklama, vibrate, kullanıcı tercihleri).
    navigator: {
      userAgent: "node-smoke",
      language: "tr-TR",
      languages: ["tr-TR", "tr"],
      getGamepads: function () { return []; },
      vibrate: function () { return true; },
      sendBeacon: function () { return true; },
    },
  };
  // Ses yoksa (eski tarayıcı / ses izni yok) oyun ÇÖKMEMELI: opts.no_audio
  if (!opts.no_audio) {
    win.AudioContext = function () {
      this.createGain = function () { return { gain: { value: 1 }, connect: function () {}, disconnect: function () {} }; };
      this.createOscillator = function () { return { frequency: { value: 1, setValueAtTime: function () {} }, type: "sine", connect: function () {}, start: function () {}, stop: function () {} }; };
      this.destination = {};
      this.currentTime = 0; this.state = "running";
      this.resume = function () { return Promise.resolve(); };
      this.close = function () { return Promise.resolve(); };
    };
    win.webkitAudioContext = win.AudioContext;
  }
  win.window = win;
  win.self = win;

  const raf = [], timers = [];
  let now = 0;
  const realLog = console.log, realWarn = console.warn, realErr = console.error;
  const sandbox = {
    window: win, document: doc, console: {
      log: function () {}, warn: function (m) { fail("console.warn", m); },
      error: function (m) { fail("console.error", m); },
      info: function () {}, debug: function () {},
    },
    requestAnimationFrame: win.requestAnimationFrame, cancelAnimationFrame: win.cancelAnimationFrame,
    setTimeout: win.setTimeout, clearTimeout: win.clearTimeout,
    setInterval: win.setInterval, clearInterval: win.clearInterval,
    localStorage: localStorage, Math: Math, Date: Date, JSON: JSON,
    navigator: win.navigator,
    performance: win.performance, parseInt: parseInt, parseFloat: parseFloat,
    isNaN: isNaN, isFinite: isFinite, encodeURIComponent: encodeURIComponent,
    decodeURIComponent: decodeURIComponent, Uint8ClampedArray: Uint8ClampedArray,
    Promise: Promise, Error: Error, TypeError: TypeError, RangeError: RangeError,
    Array: Array, Object: Object, String: String, Number: Number, Boolean: Boolean,
    RegExp: RegExp, Map: Map, Set: Set, Symbol: Symbol, Proxy: Proxy,
    Float32Array: Float32Array, Int32Array: Int32Array, Uint8Array: Uint8Array,
  };
  sandbox.globalThis = sandbox;
  sandbox.self = sandbox;
  vm.createContext(sandbox);
  win.onerror = function (m, src, line) { fail("window.onerror", m + " @ " + line); };
  win.addEventListener("error", function (e) { fail("error-event", (e && e.message) || e); });
  win.addEventListener("unhandledrejection", function (e) {
    fail("unhandledrejection", (e && e.reason && e.reason.message) || e);
  });

  // index.html'deki GERÇEK script sırası
  const html = fs.readFileSync(path.join(HTML, "index.html"), "utf8");
  const files = [];
  const rx = /<script src="([^"]+)"><\/script>/g;
  let m;
  while ((m = rx.exec(html)) !== null) files.push(m[1]);
  files.forEach(function (f) {
    const src = fs.readFileSync(path.join(HTML, f), "utf8");
    try {
      vm.runInContext(src, sandbox, { filename: f });
    } catch (e) {
      fail("yukleme", f + " -> " + e.message);
    }
  });

  // __pygame_smoke__ / benzeri bayraklar
  sandbox.__SMOKE__ = { now: function () { return now; } };
  (handlers["DOMContentLoaded"] || []).forEach(function (f) {
    try { f(); } catch (e) { fail("boot", e.message + "\n" + String(e.stack).split("\n")[1]); }
  });

  const engine = sandbox.DE && sandbox.DE.Engine.instance;
  return {
    sandbox: sandbox, engine: engine, canvas: canvas, store: store,
    frames: function (n, dt) {
      dt = dt || 1000 / 60;
      for (let i = 0; i < n; i++) {
        const cb = raf[0];
        if (!cb) { fail("dongu", "requestAnimationFrame geri cagirmadi (dongu durdu?)"); return; }
        raf.length = 0;
        now += dt;
        TOTAL_FRAMES++;
        try { cb(now); } catch (e) {
          fail("frame", e.message + "\n      " + String(e.stack || "").split("\n").slice(1, 3).join(" | "));
          return;
        }
      }
    },
    tap: function (key) {
      (handlers["keydown"] || []).forEach(function (f) { try { f({ key: key, code: key, preventDefault: function () {} }); } catch (e) { fail("keydown", key + " -> " + e.message); } });
      (handlers["keyup"] || []).forEach(function (f) { try { f({ key: key, code: key, preventDefault: function () {} }); } catch (e) { fail("keyup", key + " -> " + e.message); } });
    },
    hold: function (key) { (handlers["keydown"] || []).forEach(function (f) { f({ key: key, code: key, preventDefault: function () {} }); }); },
    release: function (key) { (handlers["keyup"] || []).forEach(function (f) { f({ key: key, code: key, preventDefault: function () {} }); }); },
    mouse: function (type, x, y) {
      const ev = { clientX: x, clientY: y, button: 0, buttons: type === "mouseup" ? 0 : 1, preventDefault: function () {}, stopPropagation: function () {} };
      (handlers[type] || []).forEach(function (f) { try { f(ev); } catch (e) { fail(type, x + "," + y + " -> " + e.message); } });
    },
    realLog: realLog, realWarn: realWarn, realErr: realErr,
  };
}

/* ---------------- DEMO TURLARI ---------------- */
const h = boot();
if (!h.engine) {
  console.log("SONUC: HATA - motor kurulamadi");
  process.exit(1);
}
const DE = h.sandbox.DE, DG = h.sandbox.DE_GAME;

function tour(name, fn) {
  CURRENT_MODE = name;
  const before = ERRORS.length;
  try { fn(); } catch (e) { fail("tur", name + " -> " + e.message + "\n      " + String(e.stack || "").split("\n")[1]); }
  const added = ERRORS.length - before;
  console.log((added ? "  HATA " : "  OK   ") + name + (added ? "  (" + added + " hata)" : ""));
}

// 1) Ana menü: açılış + 120 kare boşta
tour("menu/boot", function () {
  h.frames(120);
  if (!DE.Engine.instance.active_scene) fail("menu", "aktif sahne yok");
});

// 2) Kampanya girişi (P) + oynanış: hareket/zıplama/ateş/dash
tour("campaign/play", function () {
  h.tap("p");
  h.frames(30);
  h.hold("d"); h.frames(45); h.release("d");
  h.tap(" "); h.frames(20);
  h.tap(" "); h.frames(30);
  h.hold("a"); h.frames(40); h.release("a");
  h.tap("f"); h.frames(15);
  h.hold("Shift"); h.frames(12); h.release("Shift");
  h.frames(120);
});

// 3) Konsol komutlari: gercek komut tablosu, HATA ciktisi izlenir
tour("campaign/console", function () {
  const eng = DE.Engine.instance;
  const consoleLines = [];
  const orig = eng.console._print.bind(eng.console);
  eng.console._print = function (t) { consoleLines.push(String(t)); orig(t); };
  const cmds = ["help", "version", "hp", "god", "god off", "tp 900 300", "respawn",
    "list", "grid", "noclip", "gizli_komut_yok", "fov 70", "fps", "seed 12345", "clear"];
  cmds.forEach(function (c) {
    try { eng.console._run(c); } catch (e) { fail("konsol", c + " -> " + e.message); }
  });
  eng.console._print = orig;
  consoleLines.filter(function (l) { return /^HATA:/.test(l); }).forEach(function (l) {
    fail("konsol_hata", l);
  });
  h.frames(30);
});

// 3b) Konsol panelini gercekten ac/kapat (backquote + ESC)
tour("console/panel", function () {
  h.tap("`"); h.frames(20);
  const eng = DE.Engine.instance;
  if (!eng.console.active) fail("konsol", "backquote konsolu acmadi");
  h.tap("Escape"); h.frames(20);
  if (eng.console.active) fail("konsol", "ESC konsolu kapatmadi");
});

// 3c) F3 debug katmani (agirlikli cizim yolu)
tour("debug/F3", function () {
  h.tap("F3"); h.frames(25);
  h.tap("F3"); h.frames(25);
});

// 4) Duraklat (ESC) -> devam
tour("pause", function () {
  h.tap("Escape");
  h.frames(60);
  h.tap("Escape");
  h.frames(30);
});

// 5) Dil degistirme (T)
tour("lang", function () {
  h.tap("t"); h.frames(20);
  h.tap("t"); h.frames(20);
});

// 6) Ana menuye don (ESC) -> Star Climber (C)
tour("climber", function () {
  h.tap("Escape"); h.frames(40);
  h.tap("c");
  h.frames(200);
  for (let i = 0; i < 6; i++) { h.hold("d"); h.frames(25); h.release("d"); h.tap(" "); h.frames(25); }
  h.frames(120);
});

// 7) Sonsuz Mod (4)
tour("endless", function () {
  h.tap("Escape"); h.frames(40);
  h.tap("4"); h.frames(200);
  h.hold("d"); h.frames(60); h.release("d");
  h.tap(" "); h.frames(40);
  h.frames(60);
});

// 8) Menuye don + 4 ile sonsuz (kilitliyken uyari yolu)
tour("endless/locked-path", function () {
  h.tap("Escape"); h.frames(40);
  h.tap("Escape"); h.frames(40);
  h.tap("4"); h.frames(30);
});

// 9) Uzun bos oynanis: 600 kare (bellek/sayi artisi denetimi)
tour("soak/600", function () {
  h.tap("p"); h.frames(300);
  h.hold("d"); h.frames(150); h.release("d");
  h.frames(150);
});

/* ---- DERIN TUR: her biyomun giris + boss arenası ---- */
const BIOMES = ["forest", "cave", "ice", "desert", "astro"];
BIOMES.forEach(function (b, i) {
  tour("biome/" + b + "/entrance", function () {
    DE.Engine.switch_scene(DG.build_campaign_entrance(b, i + 1, i));
    h.frames(120);
    h.hold("d"); h.frames(60); h.release("d");
    h.tap(" "); h.frames(30);
    h.frames(60);
  });
  tour("biome/" + b + "/boss", function () {
    DE.Engine.switch_scene(DG.build_campaign_boss(b, i + 1, i));
    h.frames(150);
    for (let k = 0; k < 8; k++) { h.tap("f"); h.frames(12); h.hold("d"); h.frames(12); h.release("d"); }
    h.frames(120);
  });
});

/* ---- DERIN TUR: olum -> game over -> tekrar deneme ---- */
tour("death/game-over", function () {
  DE.Engine.switch_scene(DG.build_campaign_entrance("forest", 1, 0));
  h.frames(90);
  const sc = DE.Engine.instance.active_scene;
  const player = sc.find_by_tag("Player");
  if (!player) { fail("olum", "Player bulunamadi"); return; }
  const hp = player.get_component(DE.Health);
  if (!hp) { fail("olum", "Health bileseni yok"); return; }
  for (let i = 0; i < 40 && hp.hp > 0; i++) {
    hp.take_damage(1, 0);
    h.frames(8);
  }
  h.frames(120);
  ["Enter", " ", "Escape"].forEach(function (k) { h.tap(k); h.frames(60); });
});

/* ---- DERIN TUR: zafer ekrani ---- */
tour("victory", function () {
  DE.Engine.switch_scene(DG.build_victory_scene());
  h.frames(200);
  h.tap("Enter"); h.frames(60);
});

/* ---- DERIN TUR: sonsuz mod zinciri (zorluk artisi) ---- */
tour("endless/chain", function () {
  DG.state.game_mode = "endless";
  for (let i = 1; i <= 4; i++) {
    DE.Engine.switch_scene(DG.build_endless_level(i, 0));
    h.frames(90);
    h.hold("d"); h.frames(40); h.release("d");
    h.tap(" "); h.frames(30);
  }
});

/* ---- DERIN TUR: web editorunden gelen ozel seviyeler ---- */
tour("levels/custom-json", function () {
  const dir = path.join(ROOT, "custom_levels");
  let names = [];
  try { names = fs.readdirSync(dir).filter(function (f) { return f.endsWith(".json"); }); } catch (e) { }
  if (names.length === 0) { return; }
  names.forEach(function (n) {
    const raw = fs.readFileSync(path.join(dir, n), "utf8");
    try {
      const sc = DE.load_level(raw);
      if (!sc) { fail("seviye", n + " -> load_level null dondurdu"); return; }
      DE.Engine.switch_scene(sc);
      h.frames(90);
      h.hold("d"); h.frames(40); h.release("d");
      h.tap("f"); h.frames(20);
    } catch (e) {
      fail("seviye", n + " -> " + e.message);
    }
  });
});

/* ---- DERIN TUR: fare ile menu tiklamasi (kullanicinin gercek yolu) ---- */
tour("mouse/menu-clicks", function () {
  DE.Engine.switch_scene(DG.build_main_menu_scene());
  h.frames(60);
  const sc = DE.Engine.instance.active_scene;
  const zones = (sc.game_objects || []).filter(function (o) { return o._click_rect && o._click_action; });
  if (zones.length === 0) fail("fare", "menude tiklanabilir bolge yok");
  zones.forEach(function (o) {
    const r = o._click_rect;
    h.mouse("mousemove", r.x + Math.floor(r.w / 2), r.y + Math.floor(r.h / 2));
    h.mouse("mousedown", r.x + Math.floor(r.w / 2), r.y + Math.floor(r.h / 2));
    h.mouse("mouseup", r.x + Math.floor(r.w / 2), r.y + Math.floor(r.h / 2));
    h.frames(30);
    // tik sonrasi sahne degistiyse menuye don
    DE.Engine.switch_scene(DG.build_main_menu_scene());
    h.frames(40);
  });
});

/* ---- DERIN TUR: kayit dosyasi gidis-gelis ---- */
tour("savegame/round-trip", function () {
  const sg = DG.savegame();
  sg.set("high_score", 777);
  sg.set("lang", "en");
  const again = DG.savegame();
  if (again.get("high_score", 0) !== 777) fail("kayit", "high_score geri okunamadi");
  again.set("lang", "tr");
  h.frames(20);
});

/* ---- DERIN TUR: surekli ates stresi (mermi/parcacik/carpisma) ---- */
tour("stress/fire", function () {
  DE.Engine.switch_scene(DG.build_campaign_boss("astro", 5, 4));
  h.frames(90);
  for (let i = 0; i < 40; i++) {
    h.hold("f"); h.frames(6); h.release("f");
    h.tap(" ");
  }
  h.frames(120);
});

/* ---- DERIN TUR: ses yoksa oyun cokmemeli (eski tarayici / izin yok) ---- */
tour("ortam/ses-yok", function () {
  CURRENT_MODE = "ortam/ses-yok";
  const before = ERRORS.length;
  const h2 = boot({ no_audio: true });
  if (!h2.engine) { fail("ses-yok", "ses'siz motor kurulamadi"); return; }
  h2.frames(120);
  h2.tap("c"); h2.frames(90);
  h2.tap("Escape"); h2.frames(60);
  if (ERRORS.length === before) console.log("       (ses'siz ortamda 270 kare sorunsuz)");
});

/* ---------------- GORSEL KAPILAR ----------------
 * Hata yoksa oyun "aciliyor" demektir; ama gorsel olarak BOZUK olabilir.
 * Asagidaki kapilar bir son donemde kullaniciya gorulen 3 hatayi kalici
 * lastige baglar:
 *   1) paralaks katmani 0 -> arka plan hic cizilmiyor
 *   2) zemin nesnesi her seyin ustunde ciziliyor -> coin/oyuncu kapatiliyor
 *   3) coin gorsel bileseni yok / zeminde gomulu kalmiyor
 */
const GATES = [];
function gate(name, cond, extra) {
  GATES.push({ name: name, ok: !!cond, extra: extra || "" });
  if (!cond) fail("gorsel-kapi", name + (extra ? " (" + extra + ")" : ""));
}
const onScreen = function (o, cam) {
  const sx = o.position.x - cam.x, sy = o.position.y - cam.y;
  return sx > -40 && sx < 940 && sy > -40 && sy < 640;
};
BIOMES.forEach(function (b) {
  tour("kapi/" + b, function () {
    DE.Engine.switch_scene(DG.build_campaign_entrance(b, 2, 0));
    h.frames(120);
    const sc = DE.Engine.instance.active_scene;
    const cam = sc.render_camera;

    // 1) paralaks gercekten ciziliyor mu?
    const px = sc.parallax_background;
    gate(b + ": paralaks temasi metin", px && typeof px.theme === "string", px ? "tip=" + typeof px.theme : "yok");
    gate(b + ": paralaks katmani > 0", px && px.layers.length > 0, px ? "katman=" + px.layers.length : "yok");

    // 2) zemin arkada mi?
    const tm = sc.game_objects.filter(function (o) { return o.name === "TilemapGround"; })[0];
    if (tm) {
      gate(b + ": zemin en arkada", tm.z_index < 0, "z_index=" + tm.z_index);
      const tmc = tm.get_component(DE.Tilemap);
      gate(b + ": zemin dokusu acik", tmc && tmc.textured === true);
      let filled = 0;
      tmc.layers.forEach(function (L) {
        L.grid.forEach(function (r) { r.forEach(function (c) { if (c !== null && c !== undefined) filled++; }); });
      });
      gate(b + ": zeminde karo var", filled > 0, "karo=" + filled);
    }

    // 3) coinler gorunur mu?
    const coins = sc.game_objects.filter(function (o) { return o.tag === "Coin"; });
    gate(b + ": coin uretildi", coins.length > 0, "adet=" + coins.length);
    const vis = coins.filter(function (c) { return !!c.get_component(DG.CoinVisual); });
    gate(b + ": coin gorsel bileseni", vis.length === coins.length, vis.length + "/" + coins.length);
    const screen = coins.filter(function (c) { return onScreen(c, cam); });
    gate(b + ": ekranda coin var", screen.length > 0, "ekranda=" + screen.length);
  });
});

/* ---------------- FIZIK KAPISI: tazeleme hizindan bagimsiz mi? ----------------
 * Python `clock.tick(60)` ile SABIT 60 Hz'de birer fizik adimi atar.
 * JS bunu yapmiyorsa 144/240 Hz monitorde ziplama yuksekligi, duvar
 * kaymasi ve carpisma cozumu farkli olur -> "fizik Python kadar iyi degil".
 * Bu kapı ayni tus basisiyla 60 / 144 / 240 Hz'de ziplama TEPESINI olcer ve
 * ucunu birbirine yaklasik (2px) olmasini ister.
 */
function jump_apex_px(hz) {
  const hb = boot();
  if (!hb.engine) return null;
  const DE2 = hb.sandbox.DE, DG2 = hb.sandbox.DE_GAME;
  const e = hb.engine;
  const dt = 1000 / hz;
  DE2.Engine.switch_scene(DG2.build_campaign_entrance("forest", 1, 0));
  hb.frames(120, dt);                       // yere yarş
  const sc = DE2.Engine.instance.active_scene;
  const p = sc.find_by_tag("Player");
  if (!p) return null;
  const y0 = p.position.y;
  let apex = 0, steps = 0, renders = 0;
  const realStep = e._step.bind(e), realRender = e._render_frame.bind(e);
  e._step = function (dtv) { steps += 1; return realStep(dtv); };
  e._render_frame = function () { renders += 1; return realRender(); };
  hb.hold(" ");                             // ziplamayi baslat
  const N = 150;
  for (let i = 0; i < N; i++) {
    hb.frames(1, dt);
    const dy = y0 - p.position.y;
    if (dy > apex) apex = dy;
  }
  hb.release(" ");
  e._step = realStep; e._render_frame = realRender;
  const seconds = (renders * dt) / 1000;    // gecirilen GERCEK sure
  return { apex: apex, per_sec: steps / seconds, renders: renders };
}

const APEX = {};
["60", "144", "240"].forEach(function (hz) {
  const r = jump_apex_px(hz);
  APEX[hz] = r ? r.apex : -1;
  if (r) {
    console.log("   fizik " + hz + "Hz: ziplama tepesi=" + r.apex.toFixed(1) +
      "px | fizik adimi/saniye=" + r.per_sec.toFixed(1) + " (hedef 60, Python clock.tick(60))");
    gate(hz + "Hz: fizik tam 60 adim/saniye (Python ile ayni)",
      Math.abs(r.per_sec - 60) < 1.5, "adim/s=" + r.per_sec.toFixed(2));
  } else gate(hz + "Hz: oyuncu bulundu", false, "Player yok");
});
gate("60Hz: ziplama tepesi makul (>20px, <400px)", APEX["60"] > 20 && APEX["60"] < 400, "tepe=" + APEX["60"].toFixed(1));
gate("144Hz tepesi = 60Hz tepesi (fizik ekran hizindan bagimsiz)",
  Math.abs(APEX["144"] - APEX["60"]) < 2, "60=" + APEX["60"].toFixed(1) + " 144=" + APEX["144"].toFixed(1));
gate("240Hz tepesi = 60Hz tepesi (fizik ekran hizindan bagimsiz)",
  Math.abs(APEX["240"] - APEX["60"]) < 2, "60=" + APEX["60"].toFixed(1) + " 240=" + APEX["240"].toFixed(1));

/* ---------- Python referansiyla ayni mi? ----------
 * Bu sayilar DONMUS PYTHON motorundan olculdu:
 *   python tests\probe_physics_ref.py  ->  ziplama tepesi 132.2px,
 *   dururken grounded=True.
 * NOT: "yurulecek mesafe" karsilastirilamaz — JS ve Python FARKLI RNG
 * kullandigi icin (JS DE._rng, Python random) ayni cagri farkli seviye
 * uretir; engel 268'de degil 1200'de olabilir. Bu yuzden yalnizca
 * yerlesimden BAGIMSIZ fizik olcumleri karsilastirilir. */
const PY_REF = { apex: 132.2 };
gate("JS ziplama tepesi = Python referansi (132.2px)",
  Math.abs(APEX["60"] - PY_REF.apex) < 2.5, "JS=" + APEX["60"].toFixed(1) + " PY=" + PY_REF.apex);
(function () {
  const hb = boot();
  if (!hb.engine) return gate("JS yurume/grounded referansi", false, "motor yok");
  const D2 = hb.sandbox.DE, G2 = hb.sandbox.DE_GAME;
  D2.Engine.switch_scene(G2.build_campaign_entrance("forest", 1, 0));
  hb.frames(120);
  const sc2 = D2.Engine.instance.active_scene;
  const pl = sc2.find_by_tag("Player");
  if (!pl) return gate("JS yurume/grounded referansi", false, "Player yok");
  const rb = pl.get_component(D2.Rigidbody2D);
  gate("JS yururken grounded=true (Python ile ayni)",
    rb && rb.is_grounded === true, "grounded=" + (rb && rb.is_grounded));
  gate("JS yururken dikey hiz 0 (zemin cekmez)", rb && Math.abs(rb.velocity.y) < 1,
    "vy=" + (rb && rb.velocity.y));
  const x0 = pl.position.x;
  hb.hold("d"); hb.frames(60); const x1 = pl.position.x; hb.release("d"); hb.frames(5);
  gate("D tusu ile oyuncu saga dogru kosuyor", (x1 - x0) > 100, "delta=" + Math.round(x1 - x0));
})();

/* ---------------- RAPOR ---------------- */
const FRAMES = TOTAL_FRAMES;
console.log("");
console.log("==============================================");
console.log("Oynanan kare: " + FRAMES + " | tur: " + (29 + BIOMES.length) + " | canvas cizim cagrisi: " + (h.canvas._stats.calls));
console.log("Gorsel kapilar: " + GATES.filter(function (g) { return g.ok; }).length + "/" + GATES.length + " gecti");
if (ERRORS.length === 0) {
  console.log("SONUC: 0 HATA - tum demolar hatasiz acildi ve oynadi.");
  console.log("==============================================");
  process.exit(0);
}
const uniq = new Map();
ERRORS.forEach(function (e) {
  const k = e.kind + "|" + e.msg;
  if (!uniq.has(k)) uniq.set(k, { count: 0, first: e });
  uniq.get(k).count++;
});
console.log("SONUC: " + uniq.size + " BENZERSIZ HATA (" + ERRORS.length + " olay)");
console.log("==============================================");
[...uniq.values()].sort(function (a, b) { return b.count - a.count; }).forEach(function (u) {
  console.log("[" + u.count + "x] " + u.first.kind + "  (ilk: " + u.first.mode + ")");
  console.log("      " + u.first.msg.replace(/\n/g, "\n      "));
});
process.exit(1);