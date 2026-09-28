/* webpanel.js — DerinEngine yerel tarayıcı kontrol paneli + mini seviye editörü.
   Felçli Python karşılığı: tools/webpanel.py (127.0.0.1:8765).
   Bu Node sürümü 127.0.0.1:8766'da çalışır ve deep-tool.js'i AYNI SÜREÇTE çağırır
   (subprocess değil) — ama /api/run / /api/launch / /api/script hâlâ python ister
   (oyun + script çalıştırma doğal olarak Python tarafındadır: henüz JS'e port
   edilmedi). Dependencies: yalnızca Node standart kütüphanesi (http).

   YAPI
   - webpanel.html  : gömülü arayüz (PAGE) — ayrı dosya, %PORT% %TEMPLATES%
                      %SCHEMAS% %THEMES% %GRID% yer tutucuları sunucu tarafında doldurulur.
   - deep-tool.js   : tarayıcı editörü + deep-tool modülleri aynı panelde.
   Kullanım:  node tools\webpanel.js   (veya tools\webpanel.js --no-open)
*/
"use strict";

const http = require("http");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");

const ROOT = path.join(__dirname, "..");
const PORT = 8766;
const W64 = process.env.ProgramW6432 || "";
const NODE_BIN = process.execPath;          // kendimiz (python gerektiren çağrılar)
const PAGE_PATH = path.join(__dirname, "webpanel.html");
const DEEPT = path.join(__dirname, "deep-tool.js");

let _deept = null;
function deept() {
  if (_deept) return _deept;
  _deept = require(DEEPT);                  // aynı süreçte çalışır (modül taraması)
  return _deept;
}

/* user_data_dir — Python deep_engine.user_data_dir ile aynı davranış:
   ~/Documents (pygame legacy) yerine, oyun %APPDATA%/DerinEngine kullanır.
   Norveç: Python tarafında deep_engine/savegame normalde Documents seçer; ama
   webpanel DATA_DIR fallback ROOT idi (import başarısız olursa). Biz sabit
   olarak ROOT kullanırız: custom_levels/ proje kökündedir (custom_levels/ klasörü). */
function user_data_dir() {
  return ROOT;
}
const DATA_DIR = user_data_dir();
const LEVELS_DIR = path.join(DATA_DIR, "custom_levels");
const TEMPLATE_PATH = path.join(ROOT, "custom_level.json");

/* ---------------- level helpers (py parity) ---------------- */
function _safe_name(name) {
  if (name == null) name = "";
  name = String(name).trim().replace(/\.json$/i, "");
  if (!name) return null;
  if (/[\\/]/.test(name) || name === "." || name === "..") return null;
  return name + ".json";
}

function _ensure_levels_dir() {
  if (!fs.existsSync(LEVELS_DIR)) {
    try { fs.mkdirSync(LEVELS_DIR, { recursive: true }); } catch (e) { /* noqa */ }
  }
  const def = path.join(LEVELS_DIR, "default.json");
  if (fs.existsSync(def)) return;
  if (fs.existsSync(TEMPLATE_PATH)) {
    try { fs.copyFileSync(TEMPLATE_PATH, def); return; } catch (e) { /* noqa */ }
  }
  try {
    fs.writeFileSync(def, JSON.stringify({ meta: { name: "Custom Level",
      background_color: [16, 24, 34], parallax_theme: "forest",
      format: "derinengine-level", version: 1 }, objects: [] }, null, 2), "utf8");
  } catch (e) { /* noqa */ }
}

function _list_levels() {
  _ensure_levels_dir();
  if (!fs.existsSync(LEVELS_DIR)) return [];
  return fs.readdirSync(LEVELS_DIR).filter(n => /\.json$/i.test(n)).sort();
}

function _load_level(name) {
  _ensure_levels_dir();
  if (name == null) name = "default.json";
  const safe = _safe_name(name) || "default.json";
  const p = path.join(LEVELS_DIR, safe);
  const fallback = { meta: { name: "Custom Level", background_color: [16, 24, 34],
    parallax_theme: "forest", format: "derinengine-level", version: 1 },
    objects: [], _name: "default.json" };
  if (fs.existsSync(p)) {
    try {
      const data = JSON.parse(fs.readFileSync(p, "utf8"));
      data._name = safe;
      return data;
    } catch (e) { return fallback; }
  }
  return fallback;
}

function _save_level(data, name) {
  if (!data || !data.objects || !data.meta) return { ok: false, error: "meta/objects eksik" };
  _ensure_levels_dir();
  const target = _safe_name(name);
  if (target === null || target === "default.json")
    return { ok: false, error: "Lutfen bir dosya adi yaz (default.json korunur)" };
  const p = path.join(LEVELS_DIR, target);
  fs.writeFileSync(p, JSON.stringify(data, null, 2), "utf8");
  return { ok: true, name: target };
}

/* ---------------- subprocess (python için) ---------------- */
function _run(cmd, cwd, timeoutMs) {
  return new Promise((resolve) => {
    let out = "", err = "", code = null;
    let done = false;
    try {
      const child = spawn(cmd[0], cmd.slice(1), { cwd: cwd || ROOT, windowsHide: true });
      child.stdout.on("data", d => out += d.toString("utf8"));
      child.stderr.on("data", d => err += d.toString("utf8"));
      child.on("close", c => { code = c; resolve({ out, err, code, timed: false }); });
      const t = setTimeout(() => {
        if (!done) { done = true; try { child.kill(); } catch (e) { } resolve({ out, err, code, timed: true }); }
      }, timeoutMs || 60000);
      child.on("close", () => clearTimeout(t));
    } catch (e) { resolve({ out, err: "ERROR: " + e, code: 1, timed: false }); }
  });
}

function _tail_log(n) {
  const lp = path.join(ROOT, "motor.log");
  if (!fs.existsSync(lp)) return "(motor.log yok - oyun hiç çalışmadı ya da yeni başlatıldı)";
  const s = fs.readFileSync(lp, "utf8");
  const lines = s.split(/\r?\n/);
  return lines.slice(-(n || 200)).join("\n");
}

/* ---------------- HTTP server ---------------- */
function sendRaw(res, code, body, ctype) {
  const data = Buffer.isBuffer(body) ? body : Buffer.from(String(body), "utf8");
  res.writeHead(code, {
    "Content-Type": ctype || "text/html; charset=utf-8",
    "Content-Length": data.length,
    "Cache-Control": "no-store",
  });
  res.end(data);
}
function sendJson(res, code, obj) {
  sendRaw(res, code, JSON.stringify(obj), "application/json");
}
function readBody(req) {
  return new Promise((resolve) => {
    let raw = "";
    req.on("data", d => raw += d);
    req.on("end", () => {
      try { resolve(JSON.parse(raw || "{}")); }
      catch (e) { resolve({}); }
    });
  });
}

function page_html() {
  const data = JSON.stringify({
    grid: 8,
    templates: requireSafeTemplates(),
    schemas: requireSafeSchemas(),
    themes: ["none", "forest", "lava", "cave", "ice", "desert", "astro"],
  });
  return fs.readFileSync(PAGE_PATH, "utf8")
    .replaceAll("%PORT%", String(PORT))
    .replaceAll("%DATA%", data)
    .replaceAll("%GRID%", "8");
}

function requireSafeTemplates() { return TEMPLATES; }
function requireSafeSchemas() { return FIELD_SCHEMAS; }

/* Palette + field schemas — tools/webpanel.py ile aynı. */
const TEMPLATES = [
  { tag: "Ground", name: "Platform", w: 200.0, h: 40.0, color: [60, 90, 130], shape: "rect" },
  { tag: "Breakable", name: "Breakable", w: 64.0, h: 64.0, color: [150, 110, 60], hits: 1 },
  { tag: "Coin", name: "Coin", w: 24.0, h: 24.0, color: [255, 210, 40] },
  { tag: "Spring", name: "Spring", w: 40.0, h: 20.0, color: [230, 130, 40], bounce: 850.0 },
  { tag: "Portal", name: "Portal", w: 40.0, h: 60.0, color: [70, 70, 90], next: "victory" },
  { tag: "Enemy", name: "Enemy", w: 48.0, h: 48.0, color: [220, 60, 50], patrol_distance: 90.0,
    speed: 65.0, hp: 25 },
  { tag: "Flyer", name: "Flyer", w: 48.0, h: 48.0, color: [200, 120, 220], patrol_distance: 160.0,
    speed: 55.0, hp: 20 },
  { tag: "Hopper", name: "Hopper", w: 48.0, h: 48.0, color: [140, 200, 90], hop_force: 430.0,
    hop_interval: 1.1, speed: 40.0, hp: 22 },
  { tag: "Turret", name: "Turret", w: 48.0, h: 48.0, color: [80, 80, 120], fire_interval: 2.0,
    bullet_speed: 240.0, bullet_damage: 25, range: 600.0, hp: 30 },
  { tag: "SniperEnemy", name: "SniperEnemy", w: 40.0, h: 40.0, color: [120, 200, 90],
    fire_interval: 2.8, hp: 30 },
  { tag: "Spikes", name: "Spikes", w: 48.0, h: 24.0, color: [190, 190, 200] },
  { tag: "PowerUp", name: "PowerUp", w: 32.0, h: 32.0, color: [90, 200, 255], power_type: "magnet",
    duration: 8.0 },
  { tag: "Player", name: "Player", w: 32.0, h: 32.0, color: [255, 120, 60] },
  { tag: "Boss", name: "Boss", w: 80.0, h: 80.0, color: [200, 40, 200], hp: 100,
    boss_type: "archer", patrol_distance: 160.0, speed: 65.0 },
];

const FIELD_SCHEMAS = {
  "Ground": [["w", "Genişlik", "num", 1, 4000], ["h", "Yükseklik", "num", 1, 1000],
    ["color", "Renk", "color"], ["one_way", "Tek yönlü platform", "bool"]],
  "Breakable": [["hits", "Kırılmak için darbe", "int", 1, 50], ["trigger", "Trigger", "bool"]],
  "Coin": [["color", "Renk", "color"]],
  "Spring": [["bounce", "Fırlatma gücü", "int", 100, 3000]],
  "Portal": [["next", "Sonraki sahne", "text"]],
  "Enemy": [["patrol_distance", "Devriye mesafesi", "int", 0, 2000], ["speed", "Hız", "int", 1, 500],
    ["hp", "Can", "int", 1, 999]],
  "Flyer": [["patrol_distance", "Devriye mesafesi", "int", 0, 2000], ["speed", "Hız", "int", 1, 500],
    ["hp", "Can", "int", 1, 999]],
  "Hopper": [["hop_force", "Zıplama gücü", "int", 100, 2000], ["hop_interval", "Zıplama aralığı", "num", 0.2, 5],
    ["speed", "Hız", "int", 1, 500], ["hp", "Can", "int", 1, 999]],
  "Turret": [["fire_interval", "Ateş aralığı", "num", 0.3, 10], ["bullet_speed", "Mermi hızı", "int", 50, 1000],
    ["bullet_damage", "Mermi hasarı", "int", 1, 200], ["range", "Menzil", "int", 50, 2000],
    ["hp", "Can", "int", 1, 999]],
  "SniperEnemy": [["fire_interval", "Ateş aralığı", "num", 0.3, 10], ["hp", "Can", "int", 1, 999]],
  "Spikes": [],
  "PowerUp": [["power_type", "Güç tipi", "select", ["magnet", "triple", "shield", "speed", "slow"]],
    ["duration", "Süre (sn)", "num", 1, 60]],
  "Player": [],
  "Boss": [["hp", "Can", "int", 1, 3000], ["boss_type", "Boss tipi", "select",
    ["archer", "flying", "sniper", "shield", "cosmic"]],
    ["patrol_distance", "Devriye mesafesi", "int", 0, 2000], ["speed", "Hız", "int", 1, 500]],
};

/* route matches: pathname without query */
function getPath(u) {
  const i = u.indexOf("?");
  return i >= 0 ? u.slice(0, i) : u;
}
function qs(u) {
  const i = u.indexOf("?");
  const o = {};
  if (i >= 0) new URLSearchParams(u.slice(i + 1)).forEach((v, k) => { o[k] = o[k] ? [v] : [v]; });
  return o;
}

const server = http.createServer(async (req, res) => {
  const url = req.url || "/";
  const p = getPath(url);
  const params = qs(url);
  try {
    if (req.method === "GET") {
      if (p === "/") { sendRaw(res, 200, page_html()); }
      else if (p === "/api/level") {
        const name = (params.name || [null])[0];
        sendJson(res, 200, { ok: true, level: _load_level(name), levels: _list_levels() });
      } else if (p === "/api/levels") {
        sendJson(res, 200, { ok: true, levels: _list_levels() });
      } else if (p === "/api/log") {
        sendJson(res, 200, { log: _tail_log() });
      } else if (p === "/api/modules") {
        const lang = (params.lang || ["tr"])[0];
        try {
          deept().set_lang(lang === "en" ? "en" : "tr");
          const result = deept().api_dispatch("modules", []);
          sendJson(res, 200, { ok: Boolean(result && result.ok), result });
        } catch (e) {
          sendJson(res, 200, { ok: false, result: { ok: false, error: String(e) } });
        }
      } else if (p === "/api/scan") {
        try {
          deept().set_lang("tr");
          const result = deept().api_dispatch("scan", []);
          sendJson(res, 200, { ok: Boolean(result && result.ok), result });
        } catch (e) {
          sendJson(res, 200, { ok: false, result: { ok: false, error: String(e) } });
        }
      } else {
        sendJson(res, 404, { ok: false, error: "not found" });
      }
    } else if (req.method === "POST") {
      const body = await readBody(req);
      if (p === "/api/level/save") {
        try {
          const result = _save_level(body, body.name);
          sendJson(res, result.ok ? 200 : 400, result);
        } catch (e) { sendJson(res, 500, { ok: false, error: String(e) }); }
      } else if (p === "/api/level/reset") {
        sendJson(res, 200, { ok: true, level: _load_level("default.json") });
      } else if (p === "/api/level/delete") {
        try {
          const target = _safe_name(body.name);
          if (target === null) { sendJson(res, 400, { ok: false, error: "gecersiz ad" }); return; }
          if (target === "default.json") { sendJson(res, 400, { ok: false, error: "default.json silinemez" }); return; }
          const p2 = path.join(LEVELS_DIR, target);
          if (fs.existsSync(p2)) fs.unlinkSync(p2);
          sendJson(res, 200, { ok: true });
        } catch (e) { sendJson(res, 500, { ok: false, error: String(e) }); }
      } else if (p === "/api/script") {
        const src = body.src || "";
        const r = await _run([py(), "-c", src], ROOT, 30000);
        sendJson(res, 200, { ok: r.code === 0, code: r.code, stdout: r.out, stderr: r.err });
      } else if (p === "/api/scan") {
        const lang = body.lang || "tr";
        let mods = body.mods || "all";
        if (!Array.isArray(mods)) mods = mods === "all" ? ["all"] : [String(mods)];
        try {
          deept().set_lang(lang === "en" ? "en" : "tr");
          const result = deept().api_dispatch("scan", mods);
          sendJson(res, 200, { ok: Boolean(result && result.ok), result });
        } catch (e) {
          sendJson(res, 200, { ok: false, result: { ok: false, error: "deep-tool yaniti: " + String(e) } });
        }
      } else if (p === "/api/find") {
        const kw = (body.kw || "").trim();
        const folder = (body.folder || "").trim();
        if (!kw) { sendJson(res, 400, { ok: false, error: "kw bos" }); return; }
        try {
          const result = deept().api_dispatch("find", [kw, folder]);
          sendJson(res, 200, { ok: Boolean(result && result.ok), result });
        } catch (e) {
          sendJson(res, 200, { ok: false, result: { ok: false, error: String(e) } });
        }
      } else if (p === "/api/new") {
        const kind = (body.kind || "").trim();
        const pth = (body.path || "").trim();
        if (kind !== "script" && kind !== "dir" || !pth) {
          sendJson(res, 400, { ok: false, error: "kind (script|dir) ve path gerekli" }); return;
        }
        try {
          const result = deept().api_dispatch("new", [kind, pth]);
          sendJson(res, 200, { ok: Boolean(result && result.ok), result });
        } catch (e) {
          sendJson(res, 200, { ok: false, result: { ok: false, error: String(e) } });
        }
      } else if (p === "/api/run") {
        const pth = (body.path || "").trim();
        if (!/\.py$/.test(pth)) { sendJson(res, 400, { ok: false, error: "sadece .py dosyasi calistirilir" }); return; }
        const r = await _run([py(), pth], ROOT, 120000);
        sendJson(res, 200, { ok: r.code === 0, code: r.code, stdout: r.out, stderr: r.err });
      } else if (p === "/api/launch") {
        const r = await _run([py(), "main.py"], ROOT, 120000);
        sendJson(res, 200, { ok: r.code === 0, code: r.code, stdout: r.out, stderr: r.err });
      } else {
        sendJson(res, 404, { ok: false, error: "not found" });
      }
    } else if (req.method === "OPTIONS") {
      sendRaw(res, 204, "");
    } else {
      sendJson(res, 405, { ok: false, error: "method" });
    }
  } catch (e) {
    sendJson(res, 500, { ok: false, error: String(e && e.stack || e) });
  }
});

server.on("error", (e) => {
  if (e.code === "EADDRINUSE") {
    console.log("[webpanel] " + PORT + " zaten acik - panel zaten calisiyor. Tarayicida adres: http://127.0.0.1:" + PORT);
  } else {
    console.error("[webpanel] sunucu hatasi:", e);
  }
  process.exit(0);
});

function py() {
  /* Oyun / .py çalıştırma hâlâ Python gerektirir — PATH'te python, yoksa
     %ProgramW6432%\Python* alt dizinlerine bak. */
  if (process.env.PYTHON) return process.env.PYTHON;
  try { require("child_process").execSync("python --version", { stdio: "ignore", windowsHide: true }); return "python"; }
  catch (e) { }
  if (W64) {
    try {
      const dirs = fs.readdirSync(path.join(W64, "Python"));
      const picks = dirs.filter(d => /^Python/.test(d)).sort().reverse();
      if (picks.length) return path.join(W64, "Python", picks[0], "python.exe");
    } catch (e) { }
  }
  return "python";
}

function openBrowser() {
  try {
    const u = "http://127.0.0.1:" + PORT;
    require("child_process").spawn("cmd", ["/c", "start", "", u], { detached: true, stdio: "ignore", windowsHide: true }).unref();
  } catch (e) { /* noqa */ }
}

if (require.main === module) {
  const noOpen = process.argv.includes("--no-open");
  server.listen(PORT, "127.0.0.1", () => {
    console.log("[webpanel] DerinEngine paneli: http://127.0.0.1:" + PORT + "  (kapatmak için: Ctrl+C)");
    if (!noOpen) openBrowser();
  });
}

module.exports = { server, PORT, ROOT, _load_level, _list_levels, _save_level, _safe_name, _ensure_levels_dir, _tail_log, page_html };