/* test_tools.js — deep-tool.js + webpanel.js doğrulama testleri.
   Çalıştır:  node tools_html/test_tools.js
   Kapsam:
   - deep-tool.js modüllerinin tümünün JSON şeklinde hatasız çalışması (--api parity)
   - webpanel.js: level save/load/delete round-trip + script/run/scan/find/new API'leri
*/
"use strict";

const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const DEEPT = path.join(__dirname, "deep-tool.js");
const WEB = path.join(__dirname, "webpanel.js");

let pass = 0, fail = 0;
function check(name, cond, extra) {
  if (cond) { pass++; console.log("  OK   " + name); }
  else { fail++; console.log("  FAIL " + name + (extra ? "  -> " + extra : "")); }
}

function callApi(port, method, url, body) {
  return new Promise((resolve) => {
    const u = new URL(url);
    const data = body != null ? Buffer.from(JSON.stringify(body)) : null;
    const req = http.request({
      host: u.hostname, port: u.port, path: u.pathname + u.search, method,
      headers: data ? { "Content-Type": "application/json", "Content-Length": data.length } : {},
    }, (res) => {
      let raw = "";
      res.on("data", d => raw += d);
      res.on("end", () => {
        let obj = null;
        try { obj = JSON.parse(raw); } catch (e) { obj = { raw }; }
        resolve({ status: res.statusCode, body: obj });
      });
    });
    req.on("error", (e) => resolve({ status: 0, body: { error: String(e) } }));
    if (data) req.write(data);
    req.end();
  });
}

async function main() {
  console.log("=== 1) deep-tool.js --api scan (tum moduller) ===");
  const dt = require(DEEPT);
  let result = null;
  try { result = dt.api_dispatch("scan", ["all"]); }
  catch (e) { check("api_dispatch scan hata vermedi", false, String(e)); }
  check("scan ok", result && result.ok === true);
  check("13 modul calisti", result && result.modules.length === 13, result && "got " + result.modules.length);
  const names = result && result.modules.map(m => m.num + ":" + m.name).join(", ");
  check("isimler dolu", result && result.modules.every(m => m.name && m.name.length > 2), names);

  console.log("=== 2) modul bazli parity (secilmis) ===");
  for (const n of [8, 10, 13]) {
    try {
      const r = dt.api_dispatch("scan", [String(n)]);
      check("modul " + n + " temiz calisti", r && r.ok && r.modules.length === 1);
    } catch (e) { check("modul " + n + " temiz calisti", false, String(e)); }
  }
  // modul 8: motor sagligi aranir — bir engine dosyasinda game/main leak'i YOK olmali
  const r8 = dt.api_dispatch("scan", ["8"]);
  const leak = r8.modules[0].findings.filter(f => f.lvl === "ERR");
  check("modul 8: engine leak yok", leak.length === 0, JSON.stringify(leak.slice(0, 2)));

  console.log("=== 3) api_find + api_modules ===");
  const fm = dt.api_dispatch("modules", []);
  check("modules 13 maddeli", fm.ok && fm.modules.length === 13);
  const ff = dt.api_dispatch("find", ["GameObject", "deep_engine"]);
  check("find eşleşme buldu", ff.ok && ff.total > 0, "total=" + (ff && ff.total));

  console.log("=== 4) webpanel.js HTTP round-trip ===");
  const wp = require(WEB);
  const port = 8799;
  await new Promise((resolve) => {
    wp.server.listen(port, "127.0.0.1", resolve);
  });

  // ana sayfa + placeholder dolgusu
  const home = await callApi(port, "GET", "http://127.0.0.1:" + port + "/");
  check("/ 200", home.status === 200);
  const pageRaw = await new Promise((resolve) => {
    http.get({ host: "127.0.0.1", port, path: "/" }, (res) => {
      let s = ""; res.on("data", d => s += d); res.on("end", () => resolve(s));
    });
  });
  check("placeholder %PORT% doldu", pageRaw.includes(":" + wp.PORT) && !pageRaw.includes("%PORT%"));
  check("template JSON gomulu", pageRaw.includes('"Ground"'));

  // level save -> load -> delete round-trip
  const nm = "test_js_parity.json";
  const lvl = { name: nm, meta: { name: "P", background_color: [1, 2, 3], parallax_theme: "forest", format: "derinengine-level", version: 1 }, objects: [{ tag: "Coin", x: 4, y: 8, w: 24, h: 24 }] };
  const sv = await callApi(port, "POST", "http://127.0.0.1:" + port + "/api/level/save", lvl);
  check("save ok", sv.status === 200 && sv.body.ok === true && sv.body.name === nm);
  const ld = await callApi(port, "GET", "http://127.0.0.1:" + port + "/api/level?name=" + nm);
  check("load ok", ld.body.ok && ld.body.level && ld.body.level._name === nm && ld.body.level.objects.length === 1);
  check("load veri esit", ld.body.level.objects[0].x === 4);
  const dl = await callApi(port, "POST", "http://127.0.0.1:" + port + "/api/level/delete", { name: nm });
  check("delete ok", dl.body.ok === true);
  const gone = await new Promise(r => fs.exists(path.join(ROOT, "custom_levels", nm), e => r(!e)));
  check("dosya silindi", gone);

  // scan/find/new/log/script API
  const sc = await callApi(port, "POST", "http://127.0.0.1:" + port + "/api/scan", { lang: "tr", mods: ["1"] });
  check("api/scan modul 1", sc.status === 200 && sc.body.ok && sc.body.result.ok && sc.body.result.modules.length === 1);
  const fi = await callApi(port, "POST", "http://127.0.0.1:" + port + "/api/find", { kw: "GameObject" });
  check("api/find", fi.body.ok && fi.body.result.total > 0);
  const nw = await callApi(port, "POST", "http://127.0.0.1:" + port + "/api/new", { kind: "dir", path: "js_tool_parity_dir" });
  check("api/new dir olusturdu", nw.body.ok && nw.body.result.ok === true && nw.body.result.exists !== true,
    JSON.stringify(nw.body));
  const fs2 = require("fs");
  const dirExists = fs2.existsSync(path.join(ROOT, "js_tool_parity_dir"));
  check("dizin diske yazildi", dirExists);
  if (dirExists) fs2.rmdirSync(path.join(ROOT, "js_tool_parity_dir"));
  const dup = await callApi(port, "POST", "http://127.0.0.1:" + port + "/api/script", { src: "print(1+1)" });
  check("api/script", dup.body.ok === true && (dup.body.stdout || "").includes("2"));
  const lg = await callApi(port, "GET", "http://127.0.0.1:" + port + "/api/log");
  check("api/log", typeof lg.body.log === "string");
  const lv = await callApi(port, "GET", "http://127.0.0.1:" + port + "/api/levels");
  check("api/levels liste", Array.isArray(lv.body.levels) && lv.body.levels.includes("default.json"));

  wp.server.close();

  console.log("\n========================================");
  console.log("  SONUC: " + pass + " gecti, " + fail + " basarisiz");
  console.log("========================================");
  process.exit(fail ? 1 : 0);
}

main();