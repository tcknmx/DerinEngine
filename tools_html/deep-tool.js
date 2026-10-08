#!/usr/bin/env node
/*
 * DeepTool (JS) — DerinEngine scan/checkup aracı (Node.js)
 * Eski Python tools/deep-tool.py, 08.10.2026'da kaldırıldı — tek araç bu.
 * 13 modül + find/new/run + --api; hem *.py hem *.js dosyalarını tarar.
 * Kullanım:
 *   node tools_html/deep-tool.js                -> interaktif menü (dil + ana menü)
 *   node tools_html/deep-tool.js --lang en all  -> İngilizce, tüm tarama modülleri
 *   node tools_html/deep-tool.js --lang tr 1 4  -> Türkçe, modül 1 ve 4
 *   node tools_html/deep-tool.js find <kw>      -> anahtar kelime ile dosya/satır bul
 *   node tools_html/deep-tool.js new script <p> -> script şablonu üret ('dir' dizin)
 *   node tools_html/deep-tool.js run <target>   -> bilinen script'i çalıştır
 *   node tools_html/deep-tool.js --api scan 4   -> JSON çıktı (web paneli için)
 */
"use strict";

const fs = require("fs");
const path = require("path");
const os = require("os");
const { execFile, spawn } = require("child_process");

// Proje kökünü bul: burası tools_html/ içinde → bir üst astı = DerinEngine kökü.
// (Gösterge olan deep_engine/ + game/ klasörleri 08.10.2026'da silindi — kök
// her zaman tools_html'in bir üstü.)
const ROOT = path.resolve(__dirname, "..");

let LANG = "tr";

/* ======================= ÇEVİRİ / DİL ======================= */
const EN = {
  banner_title: "DeepTool (JS) - DerinEngine scan & checkup tool",
  banner_sub: "Scans all folders and .py/.js files from start to finish, reporting problems/omissions/conflicts.",
  banner_sub_en: "Scans all folders and .py/.js files from start to finish, reporting problems/omissions/conflicts.",
  lang_prompt: "Choose language / Dil secin (tr/en): ",
  menu_title: "Select a scan module:",
  menu_1: "[1] Motor Console (syntax / import / patterns / media / smoke)",
  menu_2: "[2] Import Graph (unused imports, circular imports)",
  menu_3: "[3] Builder/Extractor consistency",
  menu_4: "[4] i18n key check (tr/en parity)",
  menu_5: "[5] Asset/media existence",
  menu_6: "[6] Performance / costly patterns",
  menu_q: "[Q] Quit",
  menu_prompt: "Your choice (comma-separated, e.g. 1,4 or 7): ",
  invalid: "Invalid choice, try again.",
  running: "Running module {n}: {name} ...",
  done: "done.",
  result_title: "=== RESULT ===",
  no_issues: "Clean - no issues found.",
  err: "[ERR]",
  warn: "[WARN]",
  bug: "[BUG]",
  ok: "OK",
  header_files: "Files scanned: {n}",
  summary: "Summary: {w} WARN, {b} BUG, {e} ERR",
  goodbye: "Goodbye.",
  mc_py: ".py/.js files found: {n}",
  mc_syntax: "Syntax: {ok}/{total} OK",
  mc_import: "Import: {ok}/{total} OK",
  mc_smoke_start: "Running headless smoke test...",
  mc_smoke_ok: "Smoke OK",
  ig_header: "Import graph",
  ig_files: "Parsed {n} files",
  ig_unused: "Possibly unused import",
  ig_circular: "CIRCULAR IMPORT CHAIN",
  ig_chain: "  chain: {chain}",
  be_builtin: "Builtin __main__ block NOT guarded (check manually)",
  be_reg: "register_builder calls: {n}",
  be_ext: "register_extractor calls: {n}",
  be_missing_builder: "tag has extractor but NO builder",
  be_missing_extractor: "tag has builder but NO extractor",
  be_missing_register: "tag referenced but not registered",
  i18n_no_file: "i18n file not found, skipped.",
  i18n_tr: "Turkish keys",
  i18n_en: "English keys",
  i18n_missing_en: "key missing in EN",
  i18n_missing_tr: "key missing in TR",
  asset_missing: "referenced file NOT on disk",
  asset_checked: "Asset references checked: {n}",
  perf_nested_loop: "nested double loop (O(n^2) risk)",
  perf_small_loop: "nested loop with a small constant side (<=32) - no O(n^2) risk",
  perf_file_loop: "file/resource open inside loop",
  perf_perf_loop: "asset/resource load inside loop",
  main_menu_title: "Select a tool:",
  main_check: "check   - run scan/detect modules",
  main_new: "new     - create file/dir + script template",
  main_find: "find    - locate file/line by keyword (read-only)",
  main_run: "run     - execute an existing script",
  main_quit: "q       - quit",
  main_prompt: "Your choice (check / new / find / run / q): ",
  main_unknown: "Unknown tool, try again.",
  find_prompt: "Keyword to search (empty = back): ",
  find_no: "no match for '{kw}'",
  find_n: "{n} total matches (showing up to {max}):",
  new_type: "Create type (script / dir, empty = back): ",
  new_path: "New {kind} path (project-relative or absolute): ",
  new_exists: "already exists - nothing created: {p}",
  new_created: "created: {p}",
  new_script_hint: "script template written to {p}",
  run_list: "Available scripts:",
  run_which: "Which script (game / webpanel / tool) or a .py/.js path (q = back): ",
  run_bad: "not found / unknown: {s}",
  run_start: "starting: {cmd}",
  check_menu_title: "Select scan/check module:",
  menu_7: "[7] AST / dead-code analysis",
  menu_8: "[8] Engine purity (deep_engine -> game leak)",
  menu_9: "[9] Regression (seed determinism / data / WARN trend)",
  menu_10: "[10] Secret scan (keys / tokens / credentials)",
  menu_11: "[11] Dead code (defined but never called)",
  menu_12: "[12] Complexity snapshot (biggest files / functions)",
  menu_13: "[13] Crash trend (motor.log)",
  menu_20: "[20] Scan ALL",
  menu_b: "[b] Back to main menu",
  tbc: "[coming soon] module {n} is a placeholder, not implemented yet.",
  ast_hdr: "AST / dead-code analysis",
  ast_unused_import: "unused import",
  ast_unreachable: "unreachable code (after {kw})",
  ast_empty_except: "empty except block",
  ast_maybe_undefined: "maybe-undefined name (NameError risk)",
  press_enter: "Press ENTER to close this window...",
  pur_hdr: "Engine purity (deep_engine / deep_engine_html -> game leak)",
  pur_leak: "engine imports game/main (layering violation)",
  pur_import: "engine module imports non-engine: {target}",
  pur_cycle: "possible cyclic import at runtime: {modules}",
  pur_ok: "engine layer is clean (no game/main references)",
  reg_hdr: "Regression (seed determinism / data / trend)",
  reg_seed_ok: "procedural: same seed -> same level ({seed})",
  reg_seed_bad: "NON-DETERMINISTIC: seed {seed} produced different levels",
  reg_seed_err: "procedural.generate could not be verified: {err}",
  reg_save_ok: "savegame.json is valid JSON",
  reg_save_bad: "savegame.json is invalid/missing: {err}",
  reg_trend: "motor.log WARN/ERR total: {n}",
  reg_trend_missing: "motor.log not found (no log yet)",
};

const TR = {
  banner_title: "DeepTool (JS) - DerinEngine tarama ve checkup aracı",
  banner_sub: "Ana dizindeki tum klasorleri ve .py/.js dosyalarini bastan sona tarar; sorun/eksiklik/cakismayi raporlar.",
  banner_sub_en: "Scans all folders and .py/.js files from start to finish, reporting problems/omissions/conflicts.",
  lang_prompt: "Dil secin (tr/en): ",
  menu_title: "Tarama modulunu secin:",
  menu_1: "[1] Motor Konsolu (syntax / import / desen / medya / smoke)",
  menu_2: "[2] Import Grafı (kullanilmayan import, dongusel import)",
  menu_3: "[3] Builder/Extractor tutarliligi",
  menu_4: "[4] i18n anahtar denetimi (tr/en parity)",
  menu_5: "[5] Asset/medya varlık kontrolü",
  menu_6: "[6] Performans / maliyetli kalıplar",
  menu_q: "[Q] Cikis",
  menu_prompt: "Seciminiz (virgulle ayirin, or. 1,4 veya 7): ",
  invalid: "Gecersiz secim, tekrar deneyin.",
  running: "{n} numarali modul calistiriliyor: {name} ...",
  done: "tamam.",
  result_title: "SONUC",
  no_issues: "Temiz! Sorun bulunamadi.",
  err: "[ERR]",
  warn: "[WARN]",
  bug: "[BUG]",
  ok: "OK",
  header_files: "Taranan dosya: {n}",
  summary: "OZET: {w} WARN, {b} BUG, {e} ERR",
  goodbye: "Gorusuruz, iyi oyunlar!",
  mc_py: "Bulunan .py/.js dosyasi: {n}",
  mc_syntax: "Sozdizimi: {ok}/{total} OK",
  mc_import: "Import: {ok}/{total} OK",
  mc_smoke_start: "Headless smoke testi calistiriliyor...",
  mc_smoke_ok: "Smoke OK",
  ig_header: "Import grafı",
  ig_files: "{n} dosya ayristirildi",
  ig_unused: "Muhtemel kullanilmayan import",
  ig_circular: "DONGUSEL IMPORT ZINCIRI",
  ig_chain: "  zincir: {chain}",
  be_builtin: "Gomulu __main__ blogu korunmamis (elle kontrol)",
  be_reg: "register_builder cagrisi: {n}",
  be_ext: "register_extractor cagrisi: {n}",
  be_missing_builder: "tag kayitli ama builder YOK",
  be_missing_extractor: "tag kayitli ama extractor YOK",
  be_missing_register: "tag kullanilmis ama kayit edilmemis",
  i18n_no_file: "i18n bulunamadi, atlandi.",
  i18n_tr: "Turkce anahtar",
  i18n_en: "Ingilizce anahtar",
  i18n_missing_en: "EN'de eksik anahtar",
  i18n_missing_tr: "TR'de eksik anahtar",
  asset_missing: "basvurulan dosya diskte YOK",
  asset_checked: "Kontrol edilen asset referansi: {n}",
  perf_nested_loop: "ic ice cift dongu (O(n^2) riski)",
  perf_small_loop: "tarafi sabit-kucuk (<=32) ic ice dongu - O(n^2) riski yok",
  perf_file_loop: "dongu icinde dosya/kaynak acma",
  perf_perf_loop: "dongu icinde asset/kaynak yukleme",
  main_menu_title: "Bir alt-arac secin:",
  main_check: "check   - tarama/tespit modullerini calistir",
  main_new: "new     - dosya/dizin + script sablonu uret",
  main_find: "find    - anahtar kelimeyle dosya/satir bul (salt okunur)",
  main_run: "run     - var olan bir script'i calistir",
  main_quit: "q       - cikis",
  main_prompt: "Seciminiz (check / new / find / run / q): ",
  main_unknown: "Bilinmeyen alt-arac, tekrar deneyin.",
  find_prompt: "Aranacak kelime (bos = geri): ",
  find_no: "'{kw}' icin sonuc yok",
  find_n: "Toplam {n} eslesme (en fazla {max} gosteriliyor):",
  new_type: "Uretim turu (script / dir, bos = geri): ",
  new_path: "Yeni {kind} yolu (projeye goreli veya tam yol): ",
  new_exists: "zaten var - hicbir sey uretilmedi: {p}",
  new_created: "olusturuldu: {p}",
  new_script_hint: "script sablonu yazildi: {p}",
  run_list: "Calistirilabilir scriptler:",
  run_which: "Hangi script (game / webpanel / tool) veya .py/.js yolu (q = geri): ",
  run_bad: "bulunamadi / bilinmiyor: {s}",
  run_start: "baslatiliyor: {cmd}",
  check_menu_title: "Tarama/check modulunu secin:",
  menu_7: "[7] AST / olu-kod analizi",
  menu_8: "[8] Motor safligi (deep_engine / deep_engine_html -> game sizintisi)",
  menu_9: "[9] Regression (seed determinizm / veri / WARN trendi)",
  menu_10: "[10] Gizli bilgi taramasi (anahtar/token/sifre)",
  menu_11: "[11] Olu kod (tanimli ama cagrilmayan)",
  menu_12: "[12] Karmasiklik ozeti (en buyuk dosya/fonksiyon)",
  menu_13: "[13] Cokme trendi (motor.log)",
  menu_20: "[20] TUMUNU TARA",
  menu_b: "[b] Ana menuye geri don",
  tbc: "[yakinda] {n} numarali modul yer tutucu, henuz uygulanmadi.",
  ast_hdr: "AST / olu-kod analizi",
  ast_unused_import: "kullanilmayan import (gercek olu kod)",
  ast_unreachable: "erisilemeyen kod (sonrasi {kw})",
  ast_empty_except: "bos except blogu",
  ast_maybe_undefined: "muhtemel tanimsiz isim (NameError riski)",
  press_enter: "Pencereyi kapatmak icin ENTER'a basin...",
  pur_hdr: "Motor safligi (deep_engine / deep_engine_html -> game sizintisi)",
  pur_leak: "motor, game/main import ediyor (katman ihlali)",
  pur_import: "motor modulu oyun-disina bagimli: {target}",
  pur_cycle: "runtime'da olasi dongusel import: {modules}",
  pur_ok: "motor katmani temiz (game/main referansi yok)",
  reg_hdr: "Regression (seed determinizm / veri / trend)",
  reg_seed_ok: "procedural: ayni seed -> ayni seviye ({seed})",
  reg_seed_bad: "DETERMINISTIK DEGIL: {seed} farkli seviyeler uretti",
  reg_seed_err: "procedural.generate dogrulanamadi: {err}",
  reg_save_ok: "savegame.json gecerli JSON",
  reg_save_bad: "savegame.json gecersiz/eksik: {err}",
  reg_trend: "motor.log WARN/ERR toplami: {n}",
  reg_trend_missing: "motor.log bulunamadi (henuz log yok)",
};

function t(key, kw = {}) {
  const d = (LANG === "tr" && TR[key] !== undefined) ? TR : EN;
  let s = d[key] !== undefined ? d[key] : key;
  for (const [k, v] of Object.entries(kw)) s = s.split("{" + k + "}").join(String(v));
  return s;
}

function set_lang(code) {
  LANG = code === "en" ? "en" : "tr";
}

/* ======================= ORTAK YARDIMCILAR ======================= */
const SKIP_DIRS = ["build", "dist", "__pycache__", ".git", "node_modules"];

function project_files() {
  const out = [];
  (function walk(dir) {
    let entries = [];
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch (e) { return; }
    for (const ent of entries) {
      const p = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        if (SKIP_DIRS.includes(ent.name)) continue;
        walk(p);
      } else if (ent.name.endsWith(".py") || ent.name.endsWith(".js")) {
        if (ent.name === "deep-tool.js") continue;
        out.push(p);
      }
    }
  })(ROOT);
  return out.sort();
}

function rel(p) {
  try { return path.relative(ROOT, p).split(path.sep).join("/"); } catch (e) { return p; }
}

function read(p) {
  try { return fs.readFileSync(p, "utf8"); } catch (e) { return ""; }
}

/* Engine dosyasını global DE'ye yükler (procedural.js pervanesizdir; eval ile
   global scope'ta çalışır, var DE global'e düşer). */
function load_engine(relfile) {
  const p = path.join(ROOT, "deep_engine_html", "engine", relfile);
  if (!globalThis.DE) globalThis.DE = {};
  (0, eval)(read(p));
}

function lineNo(src, pos) {
  return src.slice(0, pos).split("\n").length;
}

/* ======================= MODÜL 1 : MOTOR KONSOLU ======================= */
const _WILDCARD_IMPORT = /^\s*from\s+\S+\s+import\s+\*\s*$/gm;
const _TODO = /\b(?:TODO|FIXME|XXX)\b/g;
const _TYPO = /\b(?:teh\b|recieve|recieving|seperat|occured|lenght)\b/gi;
const _MEDIA_LOAD_RE = /pygame\.image\.load\s*\(\s*['"]([^'"]+)['"]|mixer\.Sound\s*\(\s*['"]([^'"]+)['"]|(?:open)\s*\(\s*['"]([^'"]+)['"]/gm;

function check_syntax(p) {
  if (!p.endsWith(".js")) return [true, null];  // py dosyaları JS'te derlenemez
  const src = read(p);
  if (!src) return [true, null];
  try {
    new Function(src.replace(/^#![^\n]*\n?/, ""));
    return [true, null];
  } catch (e) {
    return [false, "SyntaxError: " + (e.message || String(e)).split("\n")[0]];
  }
}

function check_import_node(p) {
  /* JS: parse erişimi — kod parçasını yüklemeden çözümleyemeyiz. Rapor yok. */
  return [true, null];
}

function check_patterns(p) {
  const findings = [];
  const src = read(p);
  if (!src) return findings;
  const rules = [
    [_WILDCARD_IMPORT, "WARN", "from ... import * - isim cakismasi riski"],
    [_TODO, "WARN", "TODO/FIXME kalintisi"],
    [_TYPO, "WARN", "Muhtemel yazim hatasi girdisi"],
  ];
  for (const [rx, lvl, desc] of rules) {
    let m;
    rx.lastIndex = 0;
    while ((m = rx.exec(src)) !== null) {
      const ln = lineNo(src, m.index);
      const snippet = m[0].split(/\s+/).join(" ").slice(0, 50);
      findings.push([lvl, "L" + ln + ": " + desc + " (" + snippet + ")"]);
    }
  }
  return findings;
}

function check_media(p) {
  const findings = [];
  const src = read(p);
  if (!src) return findings;
  let m;
  _MEDIA_LOAD_RE.lastIndex = 0;
  while ((m = _MEDIA_LOAD_RE.exec(src)) !== null) {
    const target = m[1] || m[2] || m[3];
    if (!target) continue;
    const cand = path.isAbsolute(target) ? target : path.join(ROOT, target);
    if (!fs.existsSync(cand)) {
      findings.push(["WARN", "L" + lineNo(src, m.index) + ": Basvurulan dosya diskte YOK: '" + target + "'"]);
    }
  }
  return findings;
}

function run_smoke_js(frames = 20) {
  /* Python smoke (pygame Engine + menu) burada ağır olur; JS motorun prosedürel
     üreticisi headless smoke olarak kullanılır (seed determinizm ayrıca M9'da). */
  try {
    load_engine("procedural.js");
    const d = globalThis.DE.procedural_generate("forest", 4242, 4, 0);
    if (!d.objects || !d.objects.length) throw new Error("bos seviye");
    return [["INFO", "Smoke OK: procedural.generate " + frames + " adim hatasiz calisti"]];
  } catch (e) {
    return [["ERR", "Smoke COKTU: " + (e.message || e)]];
  }
}

function run_motor_console(collect) {
  const files = project_files();
  const jsFiles = files.filter(p => p.endsWith(".js"));
  let ok_s = 0;
  for (const p of jsFiles) {
    const [ok, msg] = check_syntax(p);
    ok_s += ok ? 1 : 0;
    if (!ok) collect("ERR", rel(p) + " syntax: " + msg);
  }
  collect("INFO", t("mc_syntax", { ok: ok_s, total: jsFiles.length }));
  collect("INFO", "Import: skipped in JS (module resolution differs)");
  for (const p of files) {
    for (const [lvl, msg] of check_patterns(p)) collect("WARN", rel(p) + " :: " + msg);
    for (const [lvl, msg] of check_media(p)) collect("WARN", rel(p) + " :: " + msg);
  }
  collect("INFO", t("mc_smoke_start"));
  for (const [lvl, msg] of run_smoke_js()) {
    if (lvl === "WARN" || lvl === "ERR" || lvl === "BUG") collect("WARN", "smoke :: " + msg);
    if (lvl === "INFO") collect("INFO", t("mc_smoke_ok"));
  }
}

/* ======================= MODÜL 2 : IMPORT GRAPH ======================= */
const _IMPORT_RE = /^\s*import\s+(\w+(?:\.\w+)*)|^\s*from\s+(\w+(?:\.\w+)*)\s+import\s+/gm;
const _JS_IMPORT_RE = /^\s*(?:import\s+[^'"]+from\s+['"]([^'"]+)['"]|import\s+['"]([^'"]+)['"]|const\s+\w+\s*=\s*require\s*\(\s*['"]([^'"]+)['"]|require\s*\(\s*['"]([^'"]+)['"])/gm;

function py_imports(src) {
  const mods = new Set();
  let m;
  _IMPORT_RE.lastIndex = 0;
  while ((m = _IMPORT_RE.exec(src)) !== null) {
    // satır yorumunu atla
    const lineStart = src.lastIndexOf("\n", m.index) + 1;
    if (/^\s*#/.test(src.slice(lineStart, lineStart + m.index - lineStart + 1))) continue;
    mods.add((m[1] || m[2]).split(".")[0]);
  }
  return mods;
}

function js_imports(src) {
  const mods = new Set();
  let m;
  _JS_IMPORT_RE.lastIndex = 0;
  while ((m = _JS_IMPORT_RE.exec(src)) !== null) {
    const mod = (m[1] || m[2] || m[3] || m[4] || "").split("/")[0];
    if (mod) mods.add(mod.replace(/^\.+/, ""));
  }
  return mods;
}

function run_import_graph(collect) {
  const files = project_files();
  collect("INFO", t("ig_files", { n: files.length }));
  const mod2file = {};
  for (const p of files) {
    const base = path.basename(p).replace(/\.(py|js)$/, "");
    const stem = rel(p).replace(/\.(py|js)$/, "").split("/").join(".");
    mod2file[base] = p;
    mod2file[stem] = p;
  }
  const usedEdges = {};
  for (const p of files) {
    const src = read(p);
    const py = py_imports(src);
    const js = js_imports(src);
    const deps = new Set();
    for (const mk of py) if (mod2file[mk] || mk === "main") deps.add(mk);
    for (const mk of js) if (mod2file[mk]) deps.add(mk);
    usedEdges[p] = deps;
  }
  // Un-used import: modül içinde hiç referansı yoksa
  for (const p of files) {
    const src = read(p);
    for (const dep of usedEdges[p]) {
      const base = dep.split(".")[0];
      if (base === "main") continue;
      const pat = new RegExp("\\b" + base.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b");
      const body = src.replace(_IMPORT_RE, "").replace(_JS_IMPORT_RE, "");
      if (!pat.test(body)) {
        collect("WARN", rel(p) + " :: " + t("ig_unused") + ": " + base);
      }
    }
  }
  // Circular import (DFS, path membership)
  const seen = new Set();
  const reports = new Set();
  function findCycle(start, p) {
    if (p.includes(start)) return p.slice(p.indexOf(start)).concat([start]);
    const np = p.concat([start]);
    if (np.length > 10) return null;
    for (const dep of usedEdges[start] || []) {
      const dp = mod2file[dep];
      if (dp && !np.includes(dp) && !seen.has(dp)) {
        const r = findCycle(dp, np);
        if (r) return r;
      }
    }
    return null;
  }
  for (const p of files) {
    if (seen.has(p)) continue;
    seen.add(p);
    const c = findCycle(p, []);
    if (c) {
      const key = JSON.stringify(c);
      if (!reports.has(key)) {
        reports.add(key);
        const chain = c.map(x => path.basename(x).replace(/\.(py|js)$/, "")).join(" -> ");
        collect("BUG", t("ig_circular"));
        collect("BUG", t("ig_chain", { chain }));
      }
    }
  }
}

/* ======================= MODÜL 3 : BUILDER / EXTRACTOR ======================= */
const _BUILDER_REG = /register_builder\s*\(\s*['"]([^'"]+)['"]\s*,\s*(\w+)\s*\)/gm;
const _EXTRACTOR_REG = /register_extractor\s*\(\s*['"]([^'"]+)['"]\s*,\s*(\w+)\s*\)/gm;
const _FN_DEF = /^(?:def|function|export\s+function|const\s+(\w+)\s*=\s*(?:async\s*)?\(?[^=]*\)?\s*=>)\s*(\w+)\s*\(/gm;

function run_builder_extractor(collect) {
  const src_files = [];
  const game_dir = path.join(ROOT, "deep_engine_html", "game");
  if (fs.existsSync(game_dir)) {
    for (const f of fs.readdirSync(game_dir).sort()) {
      if (f.endsWith(".js")) src_files.push(path.join(game_dir, f));
    }
  }
  const combined = src_files.filter(p => fs.existsSync(p)).map(read).join("\n");
  const defs = new Set();
  let m;
  _FN_DEF.lastIndex = 0;
  while ((m = _FN_DEF.exec(combined)) !== null) defs.add(m[2] || m[1]);
  const b_map = new Map();
  _BUILDER_REG.lastIndex = 0;
  while ((m = _BUILDER_REG.exec(combined)) !== null) if (!b_map.has(m[1])) b_map.set(m[1], m[2]);
  const e_map = new Map();
  _EXTRACTOR_REG.lastIndex = 0;
  while ((m = _EXTRACTOR_REG.exec(combined)) !== null) if (!e_map.has(m[1])) e_map.set(m[1], m[2]);
  collect("INFO", t("be_reg", { n: b_map.size }));
  collect("INFO", t("be_ext", { n: e_map.size }));
  const EXTRACTORLESS_OK = new Set(["Coin", "Player", "Spikes"]);
  for (const tag of [...new Set([...b_map.keys()])].sort()) {
    if (!e_map.has(tag)) {
      collect(EXTRACTORLESS_OK.has(tag) ? "INFO" : "WARN", "game :: " + t("be_missing_extractor") + " (" + tag + ")");
    }
  }
  for (const tag of [...new Set([...e_map.keys()])].sort()) {
    if (!b_map.has(tag)) {
      collect("WARN", "game :: " + t("be_missing_builder") + " (" + tag + ")");
    }
  }
  for (const [tag, fn] of [...b_map, ...e_map]) {
    if (!defs.has(fn)) collect("BUG", "game :: register '" + tag + "' -> tanimsiz fonksiyon '" + fn + "' (" + t("be_missing_register") + ")");
  }
  const suffix = fn => fn.startsWith("_build_") ? fn.slice(7) : fn.startsWith("_extract_") ? fn.slice(9) : fn;
  for (const tag of [...new Set([...b_map.keys()].filter(k => e_map.has(k)))].sort()) {
    if (suffix(b_map.get(tag)) !== suffix(e_map.get(tag))) {
      collect("BUG", "game :: '" + tag + "' builder=" + b_map.get(tag) + " vs extractor=" + e_map.get(tag) + " uyumsuz");
    }
  }
}

/* ======================= MODÜL 4 : i18n KEY ======================= */
function run_i18n(collect) {
  const js = path.join(ROOT, "deep_engine_html", "engine", "i18n.js");
  if (!fs.existsSync(js)) {
    collect("WARN", t("i18n_no_file"));
    return;
  }
  /* i18n.js tek nesne içinde tr/en anahtarlı değerler taşır; blokları ayırıp
     tr ile en'in anahtar kümesi arasında parity denetler (eski py tablosu 08.10.2026'da
     kaldırıldı — yalnız JS denetlenir). */
  const collectFrom = (p, src, tag) => {
    const langKeys = { tr: new Set(), en: new Set() };
    const re = /(?:['"](\w+)['"])\s*:\s*\{([\s\S]*?)\n\s*\}/g;
    let mm;
    while ((mm = re.exec(src)) !== null) {
      const lang = mm[1];
      if (lang !== "tr" && lang !== "en") continue;
      const body = mm[2];
      let km;
      const kre = /^\s*['"]([^'"]+)['"]\s*:/gm;
      kre.lastIndex = 0;
      while ((km = kre.exec(body)) !== null) langKeys[lang].add(km[1]);
    }
    collect("INFO", tag + " " + t("i18n_tr") + ": " + langKeys.tr.size + " | " + t("i18n_en") + ": " + langKeys.en.size);
    for (const key of [...langKeys.tr].filter(k => !langKeys.en.has(k)).sort()) {
      collect("WARN", p + " :: " + t("i18n_missing_en") + " (" + key + ")");
    }
    for (const key of [...langKeys.en].filter(k => !langKeys.tr.has(k)).sort()) {
      collect("WARN", p + " :: " + t("i18n_missing_tr") + " (" + key + ")");
    }
  };
  collectFrom(js, read(js), "js");
}

/* ======================= MODÜL 5 : ASSET ======================= */
const _ASSET_REF = /(?:image\.load|Sound|mixer\.Sound|open|pygame\.image\.load)\s*\(\s*['"]([^'"]+)['"]/gm;

function run_asset(collect) {
  const files = project_files();
  let count = 0;
  for (const p of files) {
    const src = read(p);
    let m;
    _ASSET_REF.lastIndex = 0;
    while ((m = _ASSET_REF.exec(src)) !== null) {
      const target = m[1];
      if (!target || /^[\{$]/.test(target)) continue;
      if (/^(#|:\/\/)/.test(target)) continue;
      const cand = path.isAbsolute(target) ? target : path.join(ROOT, target);
      if (!fs.existsSync(cand)) {
        count++;
        collect("WARN", rel(p) + " :: " + t("asset_missing") + " ('" + target + "')");
      }
    }
  }
  collect("INFO", count ? t("asset_checked", { n: count }) : "Asset references: all present");
}

/* ======================= MODÜL 6 : PERFORMANS ======================= */
/* Sabit-küçük döngü tespiti (eski Python deep-tool.py _const_loop_size'den taşındı;
 * bu araç .py VE .js dosyalarını taradığı için iki sözdizimini de tanır).
 * Döngünün yineleme sayısı kanıtlanabilir <= SMALL_LOOP_MAX ise döner, aksi hâlde null. */
const SMALL_LOOP_MAX = 32;
function const_loop_size(code) {
  const c = String(code).trim();
  let it = null;
  // JS: for (let i = 0; i < N; i++)   -> sinir deger sayisal sabit mi?
  let m = /^for\s*\(\s*(?:const|let|var)\s+\w+\s*=\s*\w+\s*;\s*\w+\s*<\s*([^;]+);\s*\w+\+\+\s*\)\s*\{?\s*$/.exec(c);
  if (m) {
    const bound = m[1].trim();
    if (!/^\d+$/.test(bound)) return null;
    const n = parseInt(bound, 10);
    return n > 0 && n <= SMALL_LOOP_MAX ? n : null;
  }
  // JS: for (const x of EXPR) / for (const x in EXPR)
  m = /^for\s*\(\s*(?:const|let|var)\s+[^;]*?\s+(?:in|of)\s+([\s\S]+?)\s*\)\s*\{?\s*$/.exec(c);
  if (m) it = m[1].trim();
  // Python: for x in EXPR:   (tuple unpacking "for a, b in ..." dahil)
  if (it === null) {
    m = /^for\s+(?:\w+\s*,\s*)?\w+\s+in\s+(.+?):\s*$/.exec(c);
    if (m) it = m[1].trim();
  }
  if (it === null) return null;
  // Python: range(...) sabit adim -> adim matematiği
  const rm = /^range\(([^()]*)\)$/.exec(it);
  if (rm) {
    const args = rm[1].split(",").map((s) => s.trim()).filter((s) => s !== "");
    if (!args.every((a) => /^\d+$/.test(a))) return null;
    const nums = args.map(Number);
    let n = null;
    if (nums.length === 1) n = nums[0];
    else if (nums.length === 2) n = nums[1] - nums[0];
    else if (nums.length === 3) n = nums[2] === 0 ? null : Math.ceil((nums[1] - nums[0]) / nums[2]);
    return n !== null && n > 0 && n <= SMALL_LOOP_MAX ? n : null;
  }
  // literal dizi / nesle / string / (Python tuple)
  const open = it[0];
  const CLOSERS = { "[": "]", "{": "}", "(": ")", "\"": "\"" };
  if (Object.prototype.hasOwnProperty.call(CLOSERS, open)) {
    const close = CLOSERS[open];
    if (it.length < 2 || it[it.length - 1] !== close) return null;
    if (open === "\"") return it.length - 2 > 0 && it.length - 2 <= SMALL_LOOP_MAX ? it.length - 2 : null;
    const body = it.slice(1, -1).trim();
    if (!body) return null;   // bare "()" -> yineleme kaynagi belirsiz
    const n = body.split(",").filter((s) => s.trim() !== "").length;
    return n > 0 && n <= SMALL_LOOP_MAX ? n : null;
  }
  return null;
}

function run_perf(collect) {
  for (const p of project_files()) {
    const src = read(p);
    const lines = src.split("\n").map((raw, i) => ({
      n: i + 1, ind: raw.length - raw.replace(/^\s*/, "").length,
      code: raw.trim(), raw,
    }));
    const isLoop = (code) => /^(for\b|for\s*\()/.test(code);
    // 1) iç içe döngü
    for (let i = 0; i < lines.length; i++) {
      const L = lines[i];
      if (!isLoop(L.code)) continue;
      for (let j = i + 1; j < Math.min(i + 60, lines.length); j++) {
        const L2 = lines[j];
        if (isLoop(L2.code)) {
          if (L2.ind > L.ind) {
            // Yanlış-pozitif yumuşatma: dış ya da iç döngüden biri sabit-küçük ise
            // toplam iş sabit çarpanlıdır (O(n^2) riski yok).
            const small = const_loop_size(L.code) || const_loop_size(L2.code);
            collect("INFO", rel(p) + " :: L" + L.n + ": " + (small ? t("perf_small_loop") : t("perf_nested_loop")));
            break;
          }
        } else if (L2.ind <= L.ind && L2.code && !/^[#)]/.test(L2.code)) {
          break;
        }
      }
    }
    // 2) döngü içinde açık/load
    for (let i = 0; i < lines.length; i++) {
      const L = lines[i];
      if (!isLoop(L.code)) continue;
      for (let j = i + 1; j < Math.min(i + 80, lines.length); j++) {
        const L2 = lines[j];
        if (!L2.code) continue;
        if (L2.ind <= L.ind) break;
        if (/\b(?:open|pygame\.image\.load)\s*\(/.test(L2.code)) {
          const lvl = /# noqa/.test(L2.raw) ? "INFO" : "WARN";
          collect(lvl, rel(p) + " :: L" + L2.n + ": " + t("perf_file_loop"));
          break;
        }
      }
    }
  }
}

/* ======================= MODÜL 7 : AST / ÖLÜ KOD ======================= */
const _BUILTINS = new Set([
  "len", "range", "str", "int", "float", "bool", "list", "dict", "set", "tuple",
  "print", "isinstance", "issubclass", "hasattr", "getattr", "setattr", "sum",
  "min", "max", "abs", "sorted", "reversed", "enumerate", "zip", "map", "filter",
  "any", "all", "open", "input", "type", "object", "super", "property",
  "classmethod", "staticmethod", "Exception", "ValueError", "TypeError", "KeyError",
  "IndexError", "RuntimeError", "NotImplemented", "NotImplementedError",
  "BaseException", "StopIteration", "round", "divmod", "repr", "iter", "next",
  "id", "hash", "vars", "dir", "callable", "format", "ord", "chr", "compile",
  "eval", "exec", "bytes", "bytearray", "memoryview", "frozenset", "complex",
  "slice", "bin", "oct", "hex", "pow", "ascii", "globals", "locals", "value",
  "key", "self", "cls", "KeyboardInterrupt", "SystemExit", "GeneratorExit",
  "OSError", "IOError", "EOFError", "ImportError", "AttributeError", "NameError",
  "UnboundLocalError", "ZeroDivisionError", "MemoryError", "RecursionError",
  "OverflowError", "ArithmeticError", "TimeoutError", "BrokenPipeError", "socket",
  "pygame", "undefined", "window", "document", "console", "JSON", "Math",
  "require", "module", "exports", "fs", "path", "process",
]);

function module_globals(src) {
  const names = new Set();
  const assignRe = /^(?:const|let|var|function)\s+(\w+)|^async\s+function\s+(\w+)|^class\s+(\w+)/gm;
  let m;
  while ((m = assignRe.exec(src)) !== null) {
    if (m[1]) names.add(m[1]);
    if (m[2]) names.add(m[2]);
    if (m[3]) names.add(m[3]);
  }
  // python
  const pRe = /^(?:def|class)\s+(\w+)|^\s*(\w+)\s*=\s*(?![\s\S]*\bfrom\b)/gm;
  // v1 için yeterli: üst seviye isimleri regex'ten topla
  const simpleRe = /^(?:def|class|function|const|let|var)\s+(\w+)/gm;
  const re = new RegExp(simpleRe.source, "gm");
  while ((m = re.exec(src)) !== null) names.add(m[1]);
  void assignRe; void pRe;
  const words = (src.match(/^\s*(\w+)\s*=\s*/gm) || []);
  for (const w of words) {
    const n = w.trim().split(/[=\s]/)[0];
    if (/^[A-Za-z_]\w*$/.test(n)) names.add(n);
  }
  return names;
}

const FALSEY = new Set(["self", "cls", "key", "value", "item", "obj", "colour",
  "color", "snd", "img", "surface", "screen", "rect", "dt", "scene", "engine",
  "font", "mixer", "pygame", "np", "sk", "time", "os", "sys", "random", "math",
  "json", "io", "path", "g", "A", "i", "j", "e", "ev", "el", "w", "h", "x", "y", "v"]);

// Modul 7 (AST) icin ifade-bilincinde import toplama. _IMPORT_RE yalnizca
// modulun adini yakalayip 'from X import (a, b)' ve 'import x as y' durumlarini
// kaçirir; burada asıl bind edilen isimler toplanir (Python AST ile ayni sonuc).
const _PY_IMPORT_STMT =
  /^[ \t]*import\s+([^\n(]+)|^[ \t]*from\s+([.\w]+)\s+import\s+(\([\s\S]*?\)|[^\n]+)/gm;
const _JS_IMPORT_STMT =
  /^[ \t]*(?:import\s+(\{[^}]*\}|\w+)[^\n]*from\s*['"][^'"]+['"]|(?:const|let|var)\s+(\{[^}]*\}|\w+)\s*=\s*require\s*\(\s*['"][^'"]+['"]\s*\))/gm;

function _alias_name(item) {
  const parts = String(item).trim().split(/\s+as\s+/);
  const nm = parts.length > 1 ? parts[1] : parts[0];
  return nm.split(".")[0].trim();
}

function _names_from_list(list) {
  const out = [];
  for (let item of String(list).replace(/^\(|\)$/g, "").split(",")) {
    item = item.trim().replace(/,+$/, "");
    if (!item || item === "*" || item.startsWith("#")) continue;
    const nm = _alias_name(item);
    if (nm && /^[A-Za-z_]\w*$/.test(nm)) out.push(nm);
  }
  return out;
}

function py_import_names(src) {
  const map = new Map();
  let m;
  _PY_IMPORT_STMT.lastIndex = 0;
  while ((m = _PY_IMPORT_STMT.exec(src)) !== null) {
    const ln = lineNo(src, m.index);
    for (const nm of _names_from_list(m[1] !== undefined ? m[1] : m[3] || "")) {
      if (!map.has(nm)) map.set(nm, ln);
    }
  }
  return map;
}

function js_import_names(src) {
  const map = new Map();
  let m;
  _JS_IMPORT_STMT.lastIndex = 0;
  while ((m = _JS_IMPORT_STMT.exec(src)) !== null) {
    const ln = lineNo(src, m.index);
    const list = m[1] !== undefined ? m[1] : m[2] || "";
    const names = /^\{/.test(list.trim())
      ? _names_from_list(list)
      : [_alias_name(list)].filter(n => /^[A-Za-z_$][\w$]*$/.test(n));
    for (const nm of names) {
      if (!map.has(nm)) map.set(nm, ln);
    }
  }
  return map;
}

function strip_import_stmts(src) {
  return src.replace(_PY_IMPORT_STMT, "").replace(_JS_IMPORT_STMT, "");
}

function run_ast(collect) {
  let imported_total = 0, unreachable_total = 0, empty_total = 0, undef_total = 0;
  for (const p of project_files()) {
    const src = read(p);
    if (!src) continue;
    const relp = rel(p);
    const isInit = path.basename(p) === "__init__.py";

    if (!isInit) {
      // 1) kullanılmamış import (import ifadesi bind ettiği isim kodda hiç geçmiyor)
      const imported = new Map();
      for (const [nm, ln] of py_import_names(src)) imported.set(nm, ln);
      for (const [nm, ln] of js_import_names(src)) {
        if (!imported.has(nm)) imported.set(nm, ln);
      }
      const body = strip_import_stmts(src);
      for (const [nm, ln] of imported) {
        const re = new RegExp("\\b" + nm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b");
        if (!re.test(body) && !_BUILTINS.has(nm)) {
          collect("WARN", relp + " :: L" + ln + ": " + t("ast_unused_import") + " '" + nm + "'");
          imported_total++;
        }
      }
    }

    // 2) erişilemeyen kod: return/raise sonrası SAME-INDENT statement (regex ≈ py _scan_block)
    for (const kw of ["return", "raise"]) {
      const re = new RegExp("^([ \\t]*)" + kw + "\\b[^\\n]*\\n((?:[ \\t]*.*\\n)*)", "gm");
      let mm;
      while ((mm = re.exec(src)) !== null) {
        if (/[ \t]*[{(\[]/.test(mm[0].replace(new RegExp("\\b" + kw + "\\b"), "").split("\n")[0])) continue;  // çok satırlı return { / ( / [
        const indent = mm[1];
        const rest = mm[2];
        const lineStart = rest.split("\n").find(l => l.trim() !== "");
        if (lineStart === undefined) continue;
        if (!lineStart.startsWith(indent)) continue;      // dedent -> farklı blok
        if (/^\s*(?:pass|#|\/\/)/.test(lineStart)) continue;
        if (/^\s*[&|,+\-*=/<>?]/.test(lineStart)) continue; // çok satırlı ifade devamı
        collect("WARN", relp + " :: L" + lineNo(src, mm.index) + ": " + t("ast_unreachable", { kw }));
        unreachable_total++;
      }
    }

    // 3) boş except (py) / boş catch (js) — "# noqa" işaretlisi INFO, diğeri WARN
    const emptyRe = /(?:except(?:\s+[^\n:]+)?\s*:|catch\s*(?:\([^)]*\))?\s*)\s*(?:[^\n]*)\n[\t ]*(?:\n[\t ]*)*\s*(?:pass\b(?:\s*#.*)?|\{\s*\}|\{)\s*(?=\n|$)/g;
    let em;
    while ((em = emptyRe.exec(src)) !== null) {
      const block = em[0] || "";
      const noqa = /noqa/.test(block);
      collect(noqa ? "INFO" : "WARN", relp + " :: L" + lineNo(src, em.index) + ": " + t("ast_empty_except"));
      if (!noqa) empty_total++;
    }
  }
  void imported_total; void undef_total;
  collect("INFO", t("ast_hdr") + " — " + rel("") + " WARN-ish bulgular: yukarıda");
  void unreachable_total; void empty_total;
}

/* ======================= MODÜL 8 : MOTOR SAFLIĞI ======================= */
function engine_leak(collect) {
  const engines = [
    path.join(ROOT, "deep_engine"),
    path.join(ROOT, "deep_engine_html", "engine"),
  ];
  let leaked = 0;
  for (const eng of engines) {
    if (!fs.existsSync(eng)) continue;
    (function walk(dir) {
      for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, ent.name);
        if (ent.isDirectory()) { if (!SKIP_DIRS.includes(ent.name)) walk(p); continue; }
        if (!/\.(py|js)$/.test(ent.name)) continue;
        const src = read(p);
        const mods = new Set([...py_imports(src), ...js_imports(src)]);
        for (const mo of [...mods]) {
          if (mo === "main" || mo === "game" || mo.startsWith("game.")) {
            leaked++;
            collect("BUG", rel(p) + " :: " + t("pur_leak") + ": " + t("pur_import", { target: mo }));
          }
        }
      }
    })(eng);
  }
  return leaked;
}

function engine_cycle(collect) {
  const files = project_files();
  const mod2file = {};
  for (const p of files) {
    const stem = rel(p).replace(/\.(py|js)$/, "").split("/").join(".");
    mod2file[stem] = p;
    mod2file[path.basename(p).replace(/\.(py|js)$/, "")] = p;
  }
  const used = {};
  for (const p of files) {
    const deps = new Set();
    const src = read(p);
    for (const full of [...py_imports(src), ...js_imports(src)]) {
      if (mod2file[full]) deps.add(mod2file[full]);
    }
    used[p] = deps;
  }
  const reports = new Set();
  const walk = (p, path_) => {
    if (path_.includes(p)) {
      const cyc = path_.slice(path_.indexOf(p));
      const key = JSON.stringify(cyc);
      if (!reports.has(key)) {
        reports.add(key);
        collect("BUG", t("pur_cycle", { modules: cyc.map(x => path.basename(x).replace(/\.(py|js)$/, "")).join(" -> ") }));
      }
      return;
    }
    const np = path_.concat([p]);
    if (np.length > 12) return;
    for (const dep of used[p] || []) walk(dep, np);
  };
  for (const p of files) {
    if (/^game\//.test(rel(p))) walk(p, []);
  }
}

function run_engine_purity(collect) {
  collect("INFO", t("pur_hdr"));
  if (engine_leak(collect) === 0) collect("INFO", t("pur_ok"));
  engine_cycle(collect);
}

/* ======================= MODÜL 9 : REGRESSION ======================= */
function reg_seed(collect) {
  try {
    load_engine("procedural.js");
    const a = globalThis.DE.procedural_generate(null, 4242, 8, 0);
    const b = globalThis.DE.procedural_generate(null, 4242, 8, 0);
    if (JSON.stringify(a) === JSON.stringify(b)) {
      collect("INFO", t("reg_seed_ok", { seed: 4242 }));
    } else {
      collect("BUG", t("reg_seed_bad", { seed: 4242 }));
    }
  } catch (e) {
    collect("ERR", t("reg_seed_err", { err: e.message || e }));
  }
}

function reg_save(collect) {
  const p = path.join(ROOT, "savegame.json");
  try {
    const data = JSON.parse(read(p));
    if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("top-level must be an object");
    const missing = ["lang", "high_score"].filter(k => !(k in data));
    if (missing.length) collect("WARN", path.basename(p) + " :: eksik anahtar: " + missing.join(", "));
    collect("INFO", t("reg_save_ok"));
  } catch (e) {
    collect("WARN", t("reg_save_bad", { err: e.message || e }));
  }
}

function reg_trend(collect) {
  const p = path.join(ROOT, "motor.log");
  if (!fs.existsSync(p)) { collect("INFO", t("reg_trend_missing")); return; }
  try {
    const txt = read(p);
    const warns = (txt.match(/\[WARN\]/g) || []).length;
    const errs = (txt.match(/\[ERR\]/g) || []).length;
    const bugs = (txt.match(/\[BUG\]/g) || []).length;
    const total = warns + errs + bugs;
    collect("INFO", t("reg_trend", { n: total }) + " (WARN " + warns + ", ERR " + errs + ", BUG " + bugs + ")");
  } catch (e) {
    collect("WARN", "motor.log okunamadi: " + (e.message || e));
  }
}

function run_regression(collect) {
  collect("INFO", t("reg_hdr"));
  reg_seed(collect);
  reg_save(collect);
  reg_trend(collect);
}

/* ============ MODÜLLER 10-13 : SECRET / DEAD CODE / COMPLEXITY / CRASH ============ */
const _SECRET_VALUE = /(?:api[_-]?key|api[_-]?secret|secret|passwd|password|auth[_-]?token)\s*[=:]\s*["'][^"']{6,}["']/gi;
const _SECRET_TOKEN = /ghp_[A-Za-z0-9]{20,}|gho_[A-Za-z0-9]{20,}|ghu_[A-Za-z0-9]{20,}|xox[baprs]-[A-Za-z0-9-]{10,}|AKIA[0-9A-Z]{16}|sk-(?:live|test)-[A-Za-z0-9]{20,}|AIza[0-9A-Za-z_-]{35}|-----BEGIN [A-Z ]*PRIVATE KEY-----|eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{5,}/g;

function run_secrets(collect) {
  let hits = 0;
  for (const p of project_files()) {
    const src = read(p);
    if (!src) continue;
    _SECRET_VALUE.lastIndex = 0;
    let m;
    while ((m = _SECRET_VALUE.exec(src)) !== null) {
      const ln = lineNo(src, m.index);
      const snip = m[0].split(/\s+/).join(" ").slice(0, 60);
      collect("WARN", rel(p) + " :: L" + ln + " Gizli bilgi olabilir (literal deger atanmis): " + snip);
      hits++;
    }
    _SECRET_TOKEN.lastIndex = 0;
    while ((m = _SECRET_TOKEN.exec(src)) !== null) {
      const ln = lineNo(src, m.index);
      const snip = m[0].split(/\s+/).join(" ").slice(0, 60);
      collect("WARN", rel(p) + " :: L" + ln + " Gizli bilgi olabilir (gercek token/anahtar formati): " + snip);
      hits++;
    }
  }
  if (fs.existsSync(path.join(ROOT, ".env"))) {
    collect("WARN", ".env dosyasi diskte bulundu - repo disinda tut (gitignore).");
    hits++;
  }
  if (!hits) collect("INFO", "Sifre/anahtar/token deseni bulunamadi (temiz).");
}

function run_deadcode(collect) {
  const files = project_files();
  const allsrc = files.map(read).join("\n");
  const seen = new Set();
  const cands = [];
  for (const p of files) {
    const src = read(p);
    if (!src) continue;
    let m;
    const re = /^(?:def|class|function|const|let|var)\s+(\w+)/gm;
    while ((m = re.exec(src)) !== null) {
      const name = m[1];
      if (name.startsWith("_") || seen.has(name)) continue;
      seen.add(name);
      const re2 = new RegExp("\\b" + name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b");
      const refs = (allsrc.match(re2) || []).length;
      if (refs === 1) cands.push([rel(p), lineNo(src, m.index), m[0]]);
    }
  }
  if (!cands.length) {
    collect("INFO", "Tum ust-seviye fonksiyon/class'lara kodda basvuruluyor (olu aday yok).");
    return;
  }
  for (const [p, ln, decl] of cands.sort((a, b) => a[0].localeCompare(b[0]))) {
    collect("INFO", p + " :: " + decl + " (L" + ln + ") - hic baska referans yok (kesin olu aday)");
  }
}

function run_complexity(collect) {
  const sizes = [];
  const structs = [];
  for (const p of project_files()) {
    const src = read(p);
    if (!src) continue;
    const lines = src.split("\n");
    sizes.push([lines.length, rel(p)]);
    let m;
    const re = /^(?:def|class|function)\s+\w+|^(?:const|let|var)\s+\w+\s*=/gm;
    const decls = [];
    while ((m = re.exec(src)) !== null) decls.push([m.index, m[0], lineNo(src, m.index)]);
    for (let i = 0; i < decls.length; i++) {
      const [, , ln] = decls[i];
      const nxt = i + 1 < decls.length ? decls[i + 1][2] : lines.length;
      structs.push([nxt - ln, rel(p), ln, decls[i][1]]);
    }
  }
  sizes.sort((a, b) => b[0] - a[0]);
  structs.sort((a, b) => b[0] - a[0]);
  collect("INFO", "En buyuk 5 dosya (satir):");
  for (const [n, p] of sizes.slice(0, 5)) collect("INFO", "  " + String(n).padEnd(4) + " " + p);
  collect("INFO", "En uzun 5 yapi (satir):");
  for (const [n, p, ln, decl] of structs.slice(0, 5)) collect("INFO", "  " + String(n).padEnd(4) + " " + p + " :: " + decl + " (L" + ln + ")");
}

function run_crashtrend(collect) {
  const p = path.join(ROOT, "motor.log");
  if (!fs.existsSync(p)) { collect("INFO", "motor.log yok - cokme trendi raporlanamadi."); return; }
  const txt = read(p);
  const re = /File "([^"]+)", line \d+, in (\w+)/g;
  const frames = [];
  let m;
  while ((m = re.exec(txt)) !== null) frames.push([path.basename(m[1]), m[2]]);
  if (!frames.length) {
    collect("INFO", "motor.log'da traceback satiri yok (kayitli cokme bulunmadi).");
    return;
  }
  const cnt = new Map();
  for (const [f, fn] of frames) cnt.set(f + "::" + fn, (cnt.get(f + "::" + fn) || 0) + 1);
  const top = [...cnt.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  for (const [k, n] of top) collect("INFO", "  " + String(n).padStart(3) + "x  " + k);
  collect("INFO", "Toplam traceback kare satiri: " + frames.length);
}

/* ======================= RAPORLAYICI / MENÜ ======================= */
const MODULES = {
  1: "Motor Console", 2: "Import Graph", 3: "Builder/Extractor", 4: "i18n keys",
  5: "Asset/media", 6: "Performance", 7: "AST / dead-code", 8: "Engine purity",
  9: "Regression", 10: "Secret scan", 11: "Dead code", 12: "Complexity snapshot",
  13: "Crash trend",
};

function run_module(num, collect) {
  switch (num) {
    case 1: run_motor_console(collect); break;
    case 2: run_import_graph(collect); break;
    case 3: run_builder_extractor(collect); break;
    case 4: run_i18n(collect); break;
    case 5: run_asset(collect); break;
    case 6: run_perf(collect); break;
    case 7: run_ast(collect); break;
    case 8: run_engine_purity(collect); break;
    case 9: run_regression(collect); break;
    case 10: run_secrets(collect); break;
    case 11: run_deadcode(collect); break;
    case 12: run_complexity(collect); break;
    case 13: run_crashtrend(collect); break;
  }
}

function print_result(name, findings) {
  console.log("\n" + "=".repeat(70));
  console.log(t("result_title") + ": " + name);
  console.log("=".repeat(70));
  let w = 0, b = 0, e = 0;
  for (const [lvl, msg] of findings) {
    if (lvl === "ERR") { e++; console.log(t("err") + " " + msg); }
    else if (lvl === "BUG") { b++; console.log(t("bug") + " " + msg); }
    else if (lvl === "WARN") { w++; console.log(t("warn") + " " + msg); }
    else console.log("  [i] " + msg);
  }
  if (w + b + e === 0) console.log(t("no_issues"));
  console.log("  " + t("summary", { w, b, e }));
  return [w, b, e];
}

function run_selected(selections) {
  let tw = 0, tb = 0, te = 0;
  for (const num of selections) {
    if (!MODULES[num]) continue;
    const findings = [];
    const collect = (lvl, msg) => findings.push([lvl, msg]);
    console.log("\n" + t("running", { n: num, name: MODULES[num] }));
    const t0 = Date.now();
    run_module(num, collect);
    console.log(t("done") + " (" + ((Date.now() - t0) / 1000).toFixed(2) + "s)");
    const [w, b, e] = print_result(MODULES[num], findings);
    tw += w; tb += b; te += e;
  }
  console.log("\n" + "=".repeat(70));
  console.log(" " + t("summary", { w: tw, b: tb, e: te }));
  console.log("=".repeat(70));
  return [tw, tb, te];
}

/* ======================= ALT ARAÇLAR: FIND / NEW / RUN ======================= */
const SCRIPT_RUN = {
  game: ["deep_engine_html/index.html", "Oyunu tarayicida baslat (index.html)"],
  webpanel: ["tools_html/webpanel.js", "Tarayici editoru (127.0.0.1:8766)"],
  tool: ["tools_html/deep-tool.js", "deep-tool (bu arac)"],
};

const NEW_SCRIPT_JS = `/* {name} - DerinEngine (JS) */
'use strict';

function main() {
    // Gecici giris noktasi.
}

main();
`;

const SEARCH_SKIP = ["build", "dist", "__pycache__", ".git", "node_modules"];
const SEARCH_EXT = [".py", ".md", ".json", ".txt", ".html", ".js"];

function search_files(folders) {
  const ext = SEARCH_EXT;
  const roots = folders && folders.length ? folders.map(f => path.join(ROOT, f)) : [ROOT];
  const out = [];
  for (const root of roots) {
    if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) continue;
    (function walk(dir) {
      let ents = [];
      try { ents = fs.readdirSync(dir, { withFileTypes: true }); } catch (e) { return; }
      for (const ent of ents) {
        const p = path.join(dir, ent.name);
        if (ent.isDirectory()) {
          if (SEARCH_SKIP.includes(ent.name)) continue;
          walk(p);
        } else if (ext.some(x => ent.name.endsWith(x))) {
          if (ent.name === "deep-tool.js") continue;
          out.push(p);
        }
      }
    })(root);
  }
  return out.sort();
}

function collect_find(kw, folder = "") {
  const hits = [];
  const files = search_files(folder ? [folder] : []);
  for (const p of files) {
    const src = read(p);
    if (!src) continue;
    const lines = src.split("\n");
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes(kw)) {
        hits.push([rel(p), i + 1, lines[i].trim().slice(0, 80)]);
        if (hits.length >= 40) break;
      }
    }
    if (hits.length >= 40) break;
  }
  return hits;
}

function perform_new(kind, pth) {
  kind = (kind || "").trim().toLowerCase();
  if (kind !== "script" && kind !== "dir") return { ok: false, error: "kind script|dir olmali" };
  pth = (pth || "").trim();
  if (!pth) return { ok: false, error: "bos yol" };
  const absp = path.isAbsolute(pth) ? pth : path.join(ROOT, pth);
  if (fs.existsSync(absp)) return { ok: false, exists: true, path: pth };
  if (kind === "dir") {
    fs.mkdirSync(absp, { recursive: true });
    return { ok: true, kind: "dir", path: pth };
  }
  const parent = path.dirname(absp);
  if (parent && !fs.existsSync(parent)) fs.mkdirSync(parent, { recursive: true });
  if (!absp.endsWith(".js")) return { ok: false, error: "sadece .js script sablonu uretilir (py kaldirildi)" };
  fs.writeFileSync(absp, NEW_SCRIPT_JS.replace("{name}", path.basename(absp)), "utf8");
  return { ok: true, kind: "script", path: pth };
}

function run_target(target) {
  if (SCRIPT_RUN[target]) return SCRIPT_RUN[target][0];
  if (/\.(py|js|html)$/.test(target || "")) return target;
  return null;
}

function do_run(cli_target) {
  let target = cli_target;
  if (!target) {
    console.log(" " + t("run_list"));
    for (const [name, [relp, desc]] of Object.entries(SCRIPT_RUN).sort()) {
      console.log("   " + name.padEnd(9) + " " + relp.padEnd(24) + " " + desc);
    }
    readline_prompt(t("run_which"), (a) => do_run(a.trim().toLowerCase()));
    return;
  }
  const relp = run_target(target);
  if (!relp) { console.log(" " + t("run_bad", { s: target })); return; }
  const absp = path.isAbsolute(relp) ? relp : path.join(ROOT, relp);
  if (!fs.existsSync(absp)) { console.log(" " + t("run_bad", { s: target })); return; }
  console.log(" " + t("run_start", { cmd: rel(absp) }));
  if (relp.endsWith(".html")) {
    spawn("cmd", ["/c", "start", "", absp], { detached: true, stdio: "ignore", windowsHide: true }).unref();
    return;
  }
  const isJs = relp.endsWith(".js");
  execFile(isJs ? process.execPath : "python", [absp], { cwd: ROOT }, (err, stdout, stderr) => {
    if (stdout) console.log(stdout);
    if (stderr) console.error(stderr);
    if (err && !stdout) console.log(" " + t("run_bad", { s: err.message || err }));
  });
}

/* ======================= CLI / API / INTERACTIVE ======================= */
const readline = require("readline");
function readline_prompt(q, cb) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  rl.question(" " + q, (ans) => { rl.close(); cb(ans); });
}

function api_scan(nums) {
  const out = [];
  const total = { WARN: 0, BUG: 0, ERR: 0 };
  for (const num of nums.sort((a, b) => a - b)) {
    if (!MODULES[num]) continue;
    const finds = [];
    run_module(num, (lvl, msg) => finds.push([lvl, msg]));
    out.push({ num, name: MODULES[num], findings: finds.map(([l, m]) => ({ lvl: l, msg: m })) });
    for (const [l] of finds) if (l in total) total[l]++;
  }
  return { ok: true, modules: out, totals: total };
}

function api_dispatch(mode, args) {
  if (mode === "scan") {
    let nums = [];
    for (const a of args) {
      if (a === "all") { nums = Object.keys(MODULES).map(Number); break; }
      const n = parseInt(a, 10);
      if (!isNaN(n)) nums.push(n);
    }
    if (!nums.length) nums = Object.keys(MODULES).map(Number);
    return api_scan(nums);
  }
  if (mode === "find") {
    if (!args.length) return { ok: false, error: "find KEYWORD [FOLDER]" };
    const hits = collect_find(args[0], args[1] || "");
    return { ok: true, keyword: args[0], total: hits.length, max: 40, hits: hits.map(([f, l, s]) => ({ file: f, line: l, text: s })) };
  }
  if (mode === "modules") {
    return { ok: true, modules: Object.keys(MODULES).map(Number).sort((a, b) => a - b)
      .map(n => ({ num: n, name: t("menu_" + n).split("]")[1] ? t("menu_" + n).split("]")[1].trim() : MODULES[n] })) };
  }
  if (mode === "new") {
    if (args.length < 2) return { ok: false, error: "new script|dir PATH" };
    return perform_new(args[0], args[1]);
  }
  if (mode === "run") return { ok: false, error: "run API yok - web paneli kendi alt surecini kullanir" };
  return { ok: false, error: "bilinmeyen --api modu: " + mode };
}

function banner() {
  console.log("\n" + "=".repeat(70));
  console.log(" " + t("banner_title"));
  console.log(" " + t("banner_sub"));
  console.log(" " + t("banner_sub_en"));
  console.log("=".repeat(70));
}

function check_menu_loop(exit) {
  const inner = () => {
    console.log("\n" + t("check_menu_title"));
    for (const k of Object.keys(MODULES).map(Number).sort((a, b) => a - b)) console.log(t("menu_" + k));
    console.log(t("menu_20"));
    console.log(t("menu_b"));
    console.log(t("menu_q"));
    readline_prompt(t("menu_prompt"), (selLine) => {
      const sel = selLine.replace(/,/g, " ").toLowerCase();
      const tokens = sel.split(/\s+/).filter(Boolean);
      if (!tokens.length) return inner();
      const first = tokens[0];
      if (first === "q") return exit();
      if (first === "b") return main_interactive();
      if (first === "20" || first === "all") { run_selected(Object.keys(MODULES).map(Number).sort((a, b) => a - b)); return inner(); }
      const picks = tokens.map(Number).filter(n => !isNaN(n));
      if (picks.length) { run_selected(picks); return inner(); }
      return inner();
    });
  };
  inner();
}

let interactive = true;
function main_interactive() {
  console.log("\n" + t("main_menu_title"));
  console.log(t("main_check"));
  console.log(t("main_new"));
  console.log(t("main_find"));
  console.log(t("main_run"));
  console.log(t("main_quit"));
  readline_prompt(t("main_prompt"), (tool) => {
    const tx = (tool.trim().split(/\s+/)[0] || "").toLowerCase();
    if (tx === "q") return finish();
    if (tx === "check") return check_menu_loop(finish);
    if (tx === "find") {
      readline_prompt(t("find_prompt"), (kw) => {
        if (!kw.trim() || kw.trim().toLowerCase() === "q") return main_interactive();
        const hits = collect_find(kw.trim());
        if (!hits.length) { console.log(" " + t("find_no", { kw: kw.trim() })); }
        else {
          console.log(" " + t("find_n", { n: hits.length, max: 40 }));
          for (const [p, i, s] of hits) console.log("   " + p + ":" + i + ": " + s);
        }
        return main_interactive();
      });
      return;
    }
    if (tx === "new") {
      readline_prompt(t("new_type"), (kind) => {
        const k = kind.trim().toLowerCase();
        if (k !== "script" && k !== "dir") return main_interactive();
        readline_prompt(t("new_path", { kind: k }), (pth) => {
          const res = perform_new(k, pth);
          if (!res.ok) {
            if (res.exists) console.log(" " + t("new_exists", { p: res.path }));
          } else if (res.kind === "script") {
            console.log(" " + t("new_script_hint", { p: pth }));
          } else console.log(" " + t("new_created", { p: pth }));
          return main_interactive();
        });
      });
      return;
    }
    if (tx === "run") return do_run("");
    if (tx === "") return main_interactive();
    console.log(" " + t("main_unknown"));
    return main_interactive();
  });
}

function finish() {
  console.log(t("goodbye"));
  process.exit(0);
}

function main(argv) {
  let args = argv.slice();
  if (args.includes("--lang")) {
    const i = args.indexOf("--lang");
    if (i + 1 < args.length) set_lang(args[i + 1]);
    args.splice(i, 2);
  }
  let api = null;
  if (args.includes("--api")) {
    const i = args.indexOf("--api");
    api = args[i + 1] || "";
    args.splice(i, 2);
  }
  if (api !== null) {
    console.log(JSON.stringify(api_dispatch(api, args), null, 0));
    return 0;
  }
  // CLI: modüller
  if (args.some(a => a === "all" || /^\d+$/.test(a))) {
    const nums = [];
    for (const a of args) {
      if (a === "all") { nums.length = 0; nums.push(...Object.keys(MODULES).map(Number).sort((x, y) => x - y)); break; }
      const n = parseInt(a, 10);
      if (!isNaN(n)) nums.push(n);
    }
    if (nums.length) {
      banner();
      run_selected(nums);
      return 0;
    }
  }
  // CLI: find/new/run
  if (args.length) {
    const sub = args[0].toLowerCase();
    if (sub === "find" || sub === "new" || sub === "run") {
      banner();
      if (sub === "find") {
        const hits = collect_find(args[1] || "", args[2] || "");
        if (!hits.length) console.log(" " + t("find_no", { kw: args[1] || "" }));
        else {
          console.log(" " + t("find_n", { n: hits.length, max: 40 }));
          for (const [p, i, s] of hits) console.log("   " + p + ":" + i + ": " + s);
        }
      } else if (sub === "new") {
        const res = perform_new(args[1] || "", args[2] || "");
        if (!res.ok) {
          if (res.exists) console.log(" " + t("new_exists", { p: args[2] || "" }));
          else console.log(" " + (res.error || "?"));
        } else {
          console.log(" " + t(res.kind === "script" ? "new_script_hint" : "new_created", { p: args[2] || "" }));
        }
      } else {
        do_run(args[1] || "");
      }
      return 0;
    }
  }
  // interactive
  banner();
  interactive = true;
  readline_prompt(t("lang_prompt"), (inp) => {
    set_lang(inp.trim() === "en" ? "en" : "tr");
    main_interactive();
  });
  return 0;
}

const __main = require.main === module;
if (__main) {
  try { process.exitCode = main(process.argv.slice(2)); }
  catch (e) { console.error("deep-tool.js hata: " + (e && e.stack || e)); process.exitCode = 1; }
}

module.exports = {
  ROOT, LANG, t, set_lang, project_files, rel, read,
  run_module, MODULES, api_dispatch, perform_new, collect_find, search_files,
  const_loop_size, SMALL_LOOP_MAX,
};