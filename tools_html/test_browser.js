/* test_browser.js — TARAYICI DAVRANIŞI TESTİ (kalite kontrolü)
   Amaç: kod statik kontrolünün ötesinde, sayfa/demo GERÇEKTEN tarayıcı gibi
   çalışıyor mu? vm tabanlı hafif DOM benzetmesi ile:
     - demo oyunu: input (keydown) → zıplama gerçekten çalışıyor mu;
       get_key_down one-shot kare tüketimi doğru mu; is_grounded doğru mu.
     - webpanel: boot + sekme tıklamaları + Farklı Kaydet modalı (= gerçek
       HTTP sunucusu ile round-trip); file:// senaryosunda sayfa ÖLMÜYOR mu.
   Kullanım:  node tools_html\test_browser.js
   Bağımlılık: yalnızca Node standart kütüphanesi.
*/
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const http = require("http");
const os = require("os");

const ROOT = path.join(__dirname, "..");
const HTML = path.join(ROOT, "deep_engine_html");
const WP = path.join(__dirname, "webpanel.js");
const WP_HTML = path.join(__dirname, "webpanel.html");

let PASS = 0, FAIL = 0;
function check(name, cond, extra) {
  if (cond) { PASS++; console.log("  OK   " + name); }
  else { FAIL++; console.log("  FAIL " + name + (extra ? "  (" + extra + ")" : "")); }
}

/* ---------------- fake 2d context ---------------- */
function fakeCtx(canvasEl) {
  const t = {
    canvas: canvasEl, fillStyle: "", strokeStyle: "", lineWidth: 1,
    font: "", globalAlpha: 1, textAlign: "left",
    save() {}, restore() {}, beginPath() {}, moveTo() {}, lineTo() {},
    stroke() {}, fill() {}, fillRect() {}, strokeRect() {}, clearRect() {},
    fillText() {}, strokeText() {}, arc() {}, translate() {}, rotate() {},
    scale() {}, setTransform() {}, drawImage() {}, clip() {},
    createLinearGradient() { return { addColorStop() {} }; },
    measureText() { return { width: 0 }; },
  };
  return new Proxy(t, {
    get(o, p) { if (p in o) return o[p]; return () => {}; },
    set(o, p, v) { o[p] = v; return true; },
  });
}

/* ---------------- DOM eleman stub ---------------- */
class El {
  constructor(tag = "div") {
    this.tagName = String(tag).toUpperCase();
    this.children = [];
    this.listeners = {};
    this._tokens = new Set();
    this.style = {};
    this.dataset = {};
    this.value = "";
    this.textContent = "";
    this.title = "";
    this.disabled = false;
    this.checked = false;
    this.selected = false;
    this._inner = "";
    this.draggable = false;
    this.onclick = null;
    this.ondragstart = null;
    this.ondragover = null;
    this.ondrop = null;
    this.ondragend = null;
    this.type = "";
  }
  get classList() {
    const s = this;
    return {
      add: (t) => s._tokens.add(t),
      remove: (t) => s._tokens.delete(t),
      contains: (t) => s._tokens.has(t),
      toggle: (t, force) => {
        if (force === undefined) {
          if (s._tokens.has(t)) { s._tokens.delete(t); return false; }
          s._tokens.add(t); return true;
        }
        if (force) s._tokens.add(t); else s._tokens.delete(t);
        return force;
      },
    };
  }
  get className() { return [...this._tokens].join(" "); }
  set className(v) { this._tokens = new Set(String(v).split(/\s+/).filter(Boolean)); }
  addEventListener(t, f) { (this.listeners[t] = this.listeners[t] || []).push(f); }
  appendChild(c) { this.children.push(c); return c; }
  remove() {}
  focus() {}
  closest() { return null; }
  getContext() { return fakeCtx(this); }
  getBoundingClientRect() { return { left: 0, top: 0, width: 640, height: 560, right: 640, bottom: 560 }; }
  get innerHTML() { return this._inner; }
  set innerHTML(v) { this._inner = String(v); if (String(v) === "") this.children.length = 0; }
}

/* ---------------- document / window hub ---------------- */
function makeDom() {
  const byId = {};
  const registry = [];
  const tagIndex = {};   // token -> element listesi
  function track(el) {
    registry.push(el);
    tagIndex[el.tagName.toLowerCase()] = (tagIndex[el.tagName.toLowerCase()] || []).push(el) && tagIndex[el.tagName.toLowerCase()];
    return el;
  }
  function tokenize(el, tokens) {
    tokens.forEach(t => el._tokens.add(t));
    tagIndex[""] = null;
    return el;
  }
  function getId(id) {
    if (!byId[id]) { const el = new El("div"); el.dataset.id = id; byId[id] = track(el); }
    return byId[id];
  }
  const document = {
    getElementById: getId,
    createElement(tag) { return track(new El(tag)); },
    querySelectorAll(sel) {
      const toks = String(sel).replace(/^\./, "").split(/\s+/).filter(Boolean);
      return registry.filter(el => toks.every(t => el._tokens.has(t)));
    },
    addEventListener() {},
    body: track(new El("body")),
  };
  // Önceden tanımlı sekmeler + paneller
  const tabNames = ["editor", "scan", "log", "script", "game"];
  const tabs = tabNames.map(n => { const el = new El("div"); el.dataset.tab = n; tokenize(el, ["tab"]); el._name = "tab:" + n; return track(el); });
  const panels = tabNames.map(n => { const el = getId(n); tokenize(el, ["panel"]); el._name = "panel:" + n; return el; });
  const window = {
    addEventListener() {},
    dispatchEvent() {},
    innerWidth: 1280, innerHeight: 800,
  };
  return { document, window, byId, tabs, panels, registry };
}

/* ---------------- vm dünyası: demo oyunu ---------------- */
function bootDemo() {
  const dom = makeDom();
  const canvas = new El("canvas");
  canvas.width = 900; canvas.height = 600;
  dom.byId["game"] = canvas;
  const rAF = [];
  const handlers = {};
  dom.window.addEventListener = (t, f) => { (handlers[t] = handlers[t] || []).push(f); };
  dom.window.requestAnimationFrame = (f) => { rAF.length = 0; rAF.push(f); };
  const sandbox = {
    window: dom.window, document: dom.document, console,
    requestAnimationFrame: dom.window.requestAnimationFrame,
  };
  sandbox.window.window = sandbox.window;
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  const order = [
    "engine/core.js", "engine/math2d.js", "engine/render.js", "engine/parallax.js",
    "engine/physics.js", "engine/particles.js", "engine/components.js", "engine/tween.js",
    "engine/lighting.js", "engine/tilemap.js", "engine/levelfile.js", "engine/ui.js",
    "engine/log.js", "engine/scenemanager.js", "engine/i18n.js", "engine/savegame.js",
    "engine/console.js", "engine/audio.js", "engine/procedural.js", "engine/input.js",
    "demo/main.js",
  ];
  order.forEach(f => {
    const src = fs.readFileSync(path.join(HTML, f), "utf8");
    vm.runInContext(src, sandbox, { filename: f });
  });
  // DOMContentLoaded → demo kurulumu
  (handlers["DOMContentLoaded"] || []).forEach(f => f());
  if (!sandbox.DE || !sandbox.DE.Engine.instance) throw new Error("demo motor kurulamadi");
  const engine = sandbox.DE.Engine.instance;
  let cur = 0;
  return {
    sandbox, engine, rAF, handlers,
    pump(dtms) {
      const cb = rAF[0];
      if (!cb) throw new Error("rAF beklemede yok");
      rAF.length = 0;
      cur += (dtms === undefined ? 1000 / 60 : dtms);
      cb(cur);
    },
    press(key) {
      (handlers["keydown"] || []).forEach(f => f({ key, preventDefault() {} }));
    },
    release(key) {
      (handlers["keyup"] || []).forEach(f => f({ key, preventDefault() {} }));
    },
  };
}

/* ---------------- vm dünyası: webpanel sayfası ---------------- */
function bootPanel(html, { offline = false, port } = {}) {
  const dom = makeDom();
  const gid = (id) => dom.document.getElementById(id);
  // panel-data etiketi içeriğini HTML'den al (served → gerçek JSON, raw → "%DATA%")
  const dm = html.match(/<script id="panel-data" type="application\/json">([\s\S]*?)<\/script>/);
  gid("panel-data").textContent = dm ? dm[1] : "%DATA%";
  // canvas sabit boyutlar (sayfanın alacağı AYNI element)
  const gcv = gid("cv");
  gcv.width = 1280; gcv.height = 560;
  // fetch stub — offline değilse gerçek HTTP sunucuya gider
  const fetchStub = async (url, opts) => {
    if (offline) { const err = new Error("offline (file://) — fetch basarisiz"); err.oldOffline = true; throw err; }
    const reqOpts = {
      method: (opts && opts.method) || "GET",
      path: url, port: port, host: "127.0.0.1",
      headers: (opts && opts.headers) || {},
    };
    const body = (opts && opts.body) ? Buffer.from(opts.body) : null;
    return new Promise((resolve, reject) => {
      const r = http.request(reqOpts, (res) => {
        let data = "";
        res.on("data", d => data += d);
        res.on("end", () => {
          resolve({
            ok: res.statusCode === 200,
            async json() { try { return JSON.parse(data); } catch (e) { return {}; } },
            text: data,
          });
        });
      });
      r.on("error", reject);
      if (body) r.write(body);
      r.end();
    });
  };
  const sandbox = {
    window: dom.window, document: dom.document, console, fetch: fetchStub,
    confirm: () => true, encodeURIComponent, setTimeout, clearTimeout,
    setInterval, clearInterval,
  };
  sandbox.globalThis = sandbox;
  sandbox.window.window = sandbox.window;
  vm.createContext(sandbox);
  const m = html.match(/<script>\s*\/\* ---------- shared state[\s\S]*?<\/script>/);
  if (!m) throw new Error("panel scripti bulunamadi");
  const src = m[0].replace(/^<script>\s*/, "").replace(/<\/script>$/, "");
  let thrown = null;
  try { vm.runInContext(src, sandbox, { filename: "webpanel-inline.js" }); }
  catch (e) { thrown = e; }
  return { sandbox, dom, thrown };
}

/* ================= TESTLER ================= */

/* ---------- BÖLÜM 1: demo oyunu (motor gerçek çalışıyor mu) ---------- */
console.log("=== 1) demo: input one-shot + gercek zip lama (SPACE) ===");
{
  let d;
  try { d = bootDemo(); check("demo kuruldu", true); }
  catch (e) { check("demo kuruldu", false, String(e)); }
  if (d) {
    const DE = d.sandbox.DE;
    const scene = d.engine.active_scene;
    check("sahne kuruldu", !!scene);
    const player = scene.find_by_tag("Player");
    check("oyuncu var", !!player);

    // ilk kare: motor bir kez dönsün; sonra tuşa bas
    d.pump();
    d.press(" ");
    const input = DE.Input.instance;
    check("keydown sonrasi get_key_down(SPACE) true", input.get_key_down("SPACE") === true);
    d.pump();   // bu kare sonunda end_frame _down'u temizler
    check("end_frame sonrasi get_key_down(SPACE) false", input.get_key_down("SPACE") === false);
    d.release(" ");

    // yere düşene kadar kare it (düşme hızıyla 60-100 kare yeter)
    const rb = player.get_component(DE.Rigidbody2D);
    let grounded = false;
    for (let i = 0; i < 400; i++) {
      d.pump();
      if (rb.is_grounded) { grounded = true; break; }
    }
    check("oyuncu yere indi (is_grounded)", grounded);
    check("zemin seviyesinde duruyor", Math.abs(player.position.y - (560 - player.size.y)) < 2);

    // zıpla: yere basılı dururken SPACE
    d.press(" ");
    d.pump();
    check("yere basiliyken SPACE -> hiz yukari (vy<0)", rb.velocity.y < 0);
    const yAtJump = player.position.y;
    d.pump();
    check("gerceten yukseldi (y azaldi)", player.position.y < yAtJump - 1);
    d.release(" ");
  }
}

/* ---------- BÖLÜM 2: webpanel (served) — sekme + modal + gerçek HTTP ---------- */
console.log("=== 2) webpanel served: tiklama/gizlenme + modal + round-trip ===");
{
  // gerçek sunucu başlat (geçici port)
  const wp = require(WP);
  const port = 8798;
  const server = wp.server;
  let p;
  try {
    p = new Promise((resolve) => {
      server.on("error", (e) => resolve(e));   // zaten açıksa
      if (server.listening) resolve(null);
      else server.listen(port, "127.0.0.1", () => resolve(null));
    });
  } catch (e) { /* */ }

  (async () => {
    try {
      await Promise.race([p || Promise.resolve(null), new Promise(r => setTimeout(r, 1500))]);
      if (!server.listening) {
        check("webpanel sunucusu dinlemiyor (8766 kullaniliyor olabilir)", false);
        finish(); return;
      }
      const html = wp.page_html();
      const panel = bootPanel(html, { port });
      check("sayfa JS calisti (thrown yok)", panel.thrown === null, panel.thrown && String(panel.thrown));
      if (panel.thrown === null) {
        const ctx = panel.sandbox, dom = panel.dom;
        const gid = (id) => dom.document.getElementById(id);
        await new Promise(r => setTimeout(r, 300));   // boot fetch'leri bekle

        // palette dolu mu (TEMPLATES 14)
        const pal = gid("palette");
        check("palet 14 nesne ile doldu", pal.children.length === 14, "children=" + pal.children.length);
        // level select dolu mu (gerçek sunucu listeleri)
        check("seviye listesi geldi (HTTP round-trip)", gid("levelSelect").children.length >= 1);

        // sekme tıklaması: Editör aktif → deep-tool'a geç
        const [tabEdit, tabScan] = [dom.tabs[0], dom.tabs[1]];
        check("baslangicta editor paneli gorunur (gizli degil)", gid("editor").style.display !== "none");
        tabScan.onclick();
        check("deep-tool sekmesine tiklandi -> scan paneli aktif", gid("scan")._tokens.has("active"));
        check("editor paneli artik aktif degil", !gid("editor")._tokens.has("active"));
        // tekrar editöre dön ve bu sefer draw'suz donmuyor mu (level ayarli)
        tabEdit.onclick();
        check("editore geri donus OK", gid("editor")._tokens.has("active"));

        // Farklı Kaydet modalı aç/kapa
        check("modal baslangicta kapali (flex degil)", gid("saveAsModal").style.display !== "flex");
        ctx.saveLevelAs();
        check("saveLevelAs() -> modal acildi (flex)", gid("saveAsModal").style.display === "flex");
        ctx.closeSaveAs();
        check("closeSaveAs() -> modal kapandi (none)", gid("saveAsModal").style.display === "none");
      }
      // sunucuyu kapat
      server.close();
      finish();
    } catch (e) {
      check("bolum 2 hata vermeden bitti", false, String(e && e.stack || e));
      try { server.close(); } catch (e2) { }
      finish();
    }
  })();
}

/* ---------- BÖLÜM 3: webpanel file:// — sayfa ÖLMEMELİ ---------- */
function finish() {
  console.log("=== 3) webpanel file:// (dogrudan acilan HTML) ===");
  const raw = fs.readFileSync(WP_HTML, "utf8");
  const panel = bootPanel(raw, { offline: true });
  check("ham dosya JS parse edildi (syntax hatasi yok)", panel.thrown === null,
    panel.thrown && String(panel.thrown));
  if (panel.thrown === null) {
    const dom = panel.dom, ctx = panel.sandbox;
    const gid = (id) => dom.document.getElementById(id);
    // boot'un async fallback'i settle olsun
    setTimeout(() => {
      const st = gid("edStatus").textContent || "";
      check("sunucu yokken editör yine de basladi (durum mesaji)", /Sunucuya bağlanılamadı/.test(st), st);
      check("palet guvenli varsayilan (bos) — `%` hata üretmedi", gid("palette").children.length === 0);
      const tabScan = dom.tabs[1];
      tabScan.onclick();
      check("file:// iken sekme yine tiklaniyor", gid("scan")._tokens.has("active"));
      finish2();
    }, 300);
  } else {
    finish2();
  }
}

let done = false;
function finish2() {
  if (done) return;
  done = true;
  console.log("\n========================================");
  console.log("  SONUC: " + PASS + " gecti, " + FAIL + " basarisiz");
  console.log("========================================");
  process.exit(FAIL ? 1 : 0);
}

// Bölüm 2'yi async başlat; bitiş finish2 üzerinden.
/* (Bölüm 2'nin async fonksiyonu sunucu kapanınca finish() çağırır → Bölüm 3 çalışır) */