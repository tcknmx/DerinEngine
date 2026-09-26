"""
===============================================================================
 DeepTool  (deep-tool)  -  DerinEngine development / scan / analysis tool
===============================================================================
A single CLI tool that scans every folder and .py game file in the DerinEngine
root directory from start to finish, reporting problems/omissions/conflicts.

Scan modules (selected from the menu):
  [1] MOTOR CONSOLE    : syntax/import/pattern/media/smoke (internal engine)
  [2] IMPORT GRAPH     : who imports whom; unused imports;
                         circular import (A->B->A) detection
  [3] BUILDER/EXTRACTOR: register_builder/register_extractor mapping;
                         missing/excess registrations
  [4] i18n CHECK       : missing/unequal tr/en translation keys (parity)
  [5] ASSET EXISTENCE  : are all files referenced in code (sound/image/level/
                         config) present on disk
  [6] PERFORMANCE      : O(n^2) double loops, in-loop asset loading and other
                         costly-pattern warnings
  [7] AST / DEAD-CODE : AST-based scan (unreachable/unused, dead literals)
  [8] ENGINE PURITY    : deep_engine -> game leak (forbidden imports)
  [9] REGRESSION       : seed determinism / data / WARN trend
  [10] SECRET SCAN     : credentials / api keys / tokens / .env
  [11] DEAD CODE       : top-level functions/classes defined but never called
  [12] COMPLEXITY      : biggest files and longest structures (cleanup compass)
  [13] CRASH TREND     : recurring traceback functions in motor.log
  [20] SCAN ALL        : runs all of the above consecutively

Usage:
  python deep-tool.py                 -> interactive menu: language + main menu
  python deep-tool.py --lang en all   -> English, all scan modules (direct)
  python deep-tool.py --lang tr 1 4   -> Turkish, modules 1 and 4
  python deep-tool.py find <kw>       -> locate file/line by keyword (read-only)
  python deep-tool.py new script <p>  -> generate a script template ('dir' for folders)
  python deep-tool.py run <target>    -> run a known script ('game'/'webpanel'/'tool' or .py)
===============================================================================
"""

import os
import sys
import re
import ast
import time
import traceback
import importlib.util
import collections
import io
import subprocess
import json

# pygame'in sürüm satırı hem CLI hem --api JSON çıktısını kirletir; hep gizle.
os.environ.setdefault("PYGAME_HIDE_SUPPORT_PROMPT", "1")

# Source directory detection: deep-tool.py may sit in the root directory or under tools/.
# The DerinEngine root is the directory containing the 'deep_engine/' and 'game/' folders.
_BASE = os.path.dirname(os.path.abspath(__file__))
if os.path.isdir(os.path.join(_BASE, "deep_engine")) and os.path.isdir(os.path.join(_BASE, "game")):
    ROOT = _BASE
else:
    ROOT = os.path.dirname(_BASE)  # if inside tools/, go one level up -> root
os.chdir(ROOT)
sys.path.insert(0, ROOT)


# ===========================================================================
#  TRANSLATION / LANGUAGE
# ===========================================================================
# --lang tr|en  (default tr). UI texts are chosen according to LANG.
LANG = "tr"

# EN : English (ASCII-safe base)
EN = {
    "banner_title": "DeepTool - DerinEngine scan & checkup tool",
    "banner_sub": "Scans all folders and .py files from start to finish, reporting problems/omissions/conflicts.",
    "banner_sub_en": "Scans all folders and .py files from start to finish, reporting problems/omissions/conflicts.",
    "lang_prompt": "Choose language / Dil secin (tr/en): ",
    "menu_title": "Select a scan module:",
    "menu_1": "[1] Motor Console (syntax / import / patterns / media / smoke)",
    "menu_2": "[2] Import Graph (unused imports, circular imports)",
    "menu_3": "[3] Builder/Extractor consistency",
    "menu_4": "[4] i18n key check (tr/en parity)",
    "menu_5": "[5] Asset/media existence",
    "menu_6": "[6] Performance / costly patterns",
    "menu_q": "[Q] Quit",
    "menu_prompt": "Your choice (comma-separated, e.g. 1,4 or 7): ",
    "invalid": "Invalid choice, try again.",
    "running": "Running module {n}: {name} ...",
    "done": "done.",
    "result_title": "=== RESULT ===",
    "no_issues": "Clean - no issues found.",
    "err": "[ERR]",
    "warn": "[WARN]",
    "bug": "[BUG]",
    "ok": "OK",
    "header_files": "Files scanned: {n}",
    "summary": "Summary: {w} WARN, {b} BUG, {e} ERR",
    "goodbye": "Goodbye.",
    # 1 - motor console
    "mc_py": ".py files found: {n}",
    "mc_syntax": "Syntax: {ok}/{total} OK",
    "mc_import": "Import: {ok}/{total} OK",
    "mc_smoke_start": "Running headless smoke test...",
    "mc_smoke_ok": "Smoke OK",
    # 2 - import graph
    "ig_header": "Import graph",
    "ig_files": "Parsed {n} files",
    "ig_unused": "Possibly unused import",
    "ig_circular": "CIRCULAR IMPORT CHAIN",
    "ig_chain": "  chain: {chain}",
    # 3 - builder/extractor
    "be_builtin": "Builtin __main__ block NOT guarded (check manually)",
    "be_reg": "register_builder calls: {n}",
    "be_ext": "register_extractor calls: {n}",
    "be_missing_builder": "tag has extractor but NO builder",
    "be_missing_extractor": "tag has builder but NO extractor",
    "be_missing_register": "tag referenced but not registered",
    # 4 - i18n
    "i18n_no_file": "i18n.py not found, skipped.",
    "i18n_tr": "Turkish keys",
    "i18n_en": "English keys",
    "i18n_missing_en": "key missing in EN",
    "i18n_missing_tr": "key missing in TR",
    # 5 - asset
    "asset_missing": "referenced file NOT on disk",
    "asset_checked": "Asset references checked: {n}",
    # 6 - performance
    "perf_nested_loop": "nested double loop (O(n^2) risk)",
    "perf_file_loop": "file/resource open inside loop",
    "perf_perf_loop": "asset/resource load inside loop",
    # main (alt-tool) menu
    "main_menu_title": "Select a tool:",
    "main_check": "check   - run scan/detect modules",
    "main_new": "new     - create file/dir + script template",
    "main_find": "find    - locate file/line by keyword (read-only)",
    "main_run": "run     - execute an existing script",
    "main_quit": "q       - quit",
    "main_prompt": "Your choice (check / new / find / run / q): ",
    "main_unknown": "Unknown tool, try again.",
    "find_prompt": "Keyword to search (empty = back): ",
    "find_no": "no match for '{kw}'",
    "find_n": "{n} total matches (showing up to {max}):",
    "new_type": "Create type (script / dir, empty = back): ",
    "new_path": "New {kind} path (project-relative or absolute): ",
    "new_exists": "already exists - nothing created: {p}",
    "new_created": "created: {p}",
    "new_script_hint": "script template written to {p}",
    "run_list": "Available scripts:",
    "run_which": "Which script (game / webpanel / tool) or a .py path (q = back): ",
    "run_bad": "not found / unknown: {s}",
    "run_start": "starting: {cmd}",
    # check (module) menu
    "check_menu_title": "Select scan/check module:",
    "menu_7": "[7] AST / dead-code analysis",
    "menu_8": "[8] Engine purity (deep_engine -> game leak)",
    "menu_9": "[9] Regression (seed determinism / data / WARN trend)",
    "menu_10": "[10] Secret scan (keys / tokens / credentials)",
    "menu_11": "[11] Dead code (defined but never called)",
    "menu_12": "[12] Complexity snapshot (biggest files / functions)",
    "menu_13": "[13] Crash trend (motor.log)",
    "menu_20": "[20] Scan ALL",
    "menu_b": "[b] Back to main menu",
    "menu_prompt": "Your choice (comma-separated, e.g. 1,4 / 10 / b / q): ",
    "tbc": "[coming soon] module {n} is a placeholder, not implemented yet.",
    # 7 - AST / dead code
    "ast_hdr": "AST / dead-code analysis",
    "ast_unused_import": "unused import",
    "ast_unreachable": "unreachable code (after {kw})",
    "ast_empty_except": "empty except block",
    "ast_maybe_undefined": "maybe-undefined name (NameError risk)",
    "press_enter": "Press ENTER to close this window...",
    # 8 - Engine purity
    "pur_hdr": "Engine purity (deep_engine -> game leak)",
    "pur_leak": "engine imports game/main (layering violation)",
    "pur_import": "engine module imports non-engine: {target}",
    "pur_cycle": "possible cyclic import at runtime: {modules}",
    "pur_ok": "engine layer is clean (no game/main references)",
    # 9 - Regression
    "reg_hdr": "Regression (seed determinism / data / trend)",
    "reg_seed_ok": "procedural: same seed -> same level ({seed})",
    "reg_seed_bad": "NON-DETERMINISTIC: seed {seed} produced different levels",
    "reg_seed_err": "procedural.generate could not be verified: {err}",
    "reg_save_ok": "savegame.json is valid JSON",
    "reg_save_bad": "savegame.json is invalid/missing: {err}",
    "reg_trend": "motor.log WARN/ERR total: {n}",
    "reg_trend_missing": "motor.log not found (no log yet)",
}


# TR : Turkish  (filled explicitly here, since it is edit-safe)
_TR_DATA = {
    "banner_title": "DeepTool - DerinEngine tarama ve checkup aracı",
    "banner_sub": "Ana dizindeki tum klasorleri ve .py dosyalarini bastan sona tarar; sorun/eksiklik/cakismayi raporlar.",
    "banner_sub_en": "Scans all folders and .py files from start to finish, reporting problems/omissions/conflicts.",
    "lang_prompt": "Dil secin/Dil seçin (tr/en): ",
    "menu_title": "Tarama modulunu secin:",
    "menu_1": "[1] Motor Konsolu (syntax / import / desen / medya / smoke)",
    "menu_2": "[2] Import Grafı (kullanilmayan import, dongusel import)",
    "menu_3": "[3] Builder/Extractor tutarliligi",
    "menu_4": "[4] i18n anahtar denetimi (tr/en parity)",
    "menu_5": "[5] Asset/medya varlık kontrolü",
    "menu_6": "[6] Performans / maliyetli kalıplar",
    "menu_q": "[Q] Cikis",
    "menu_prompt": "Seciminiz (virgulle ayirin, or. 1,4 veya 7): ",
    "invalid": "Gecersiz secim, tekrar deneyin.",
    "running": "{n} numarali modul calistiriliyor: {name} ...",
    "done": "tamam.",
    "result_title": "SONUC",
    "no_issues": "Temiz! Sorun bulunamadi.",
    "err": "[ERR]",
    "warn": "[WARN]",
    "bug": "[BUG]",
    "ok": "OK",
    "header_files": "Taranan dosya: {n}",
    "summary": "OZET: {w} WARN, {b} BUG, {e} ERR",
    "goodbye": "Gorusuruz, iyi oyunlar!",
    # 1 - motor console
    "mc_py": "Bulunan .py dosyasi: {n}",
    "mc_syntax": "Sozdizimi: {ok}/{total} OK",
    "mc_import": "Import: {ok}/{total} OK",
    "mc_smoke_start": "Headless smoke testi calistiriliyor...",
    "mc_smoke_ok": "Smoke OK",
    # 2 - import graph
    "ig_header": "Import grafı",
    "ig_files": "{n} dosya ayristirildi",
    "ig_unused": "Muhtemel kullanilmayan import",
    "ig_circular": "DONGUSEL IMPORT ZINCIRI",
    "ig_chain": "  zincir: {chain}",
    # 3 - builder/extractor
    "be_builtin": "Gomulu __main__ blogu korunmamis (elle kontrol)",
    "be_reg": "register_builder cagrisi: {n}",
    "be_ext": "register_extractor cagrisi: {n}",
    "be_missing_builder": "tag kayitli ama builder YOK",
    "be_missing_extractor": "tag kayitli ama extractor YOK",
    "be_missing_register": "tag kullanilmis ama kayit edilmemis",
    # 4 - i18n
    "i18n_no_file": "i18n.py bulunamadi, atlandi.",
    "i18n_tr": "Turkce anahtar",
    "i18n_en": "Ingilizce anahtar",
    "i18n_missing_en": "EN'de eksik anahtar",
    "i18n_missing_tr": "TR'de eksik anahtar",
    # 5 - asset
    "asset_missing": "basvurulan dosya diskte YOK",
    "asset_checked": "Kontrol edilen asset referansi: {n}",
    # 6 - performance
    "perf_nested_loop": "ic ice cift dongu (O(n^2) riski)",
    "perf_file_loop": "dongu icinde dosya/kaynak acma",
    "perf_perf_loop": "dongu icinde asset/kaynak yukleme",
    # main (alt-tool) menu
    "main_menu_title": "Bir alt-arac secin:",
    "main_check": "check   - tarama/tespit modullerini calistir",
    "main_new": "new     - dosya/dizin + script sablonu uret",
    "main_find": "find    - anahtar kelimeyle dosya/satir bul (salt okunur)",
    "main_run": "run     - var olan bir script'i calistir",
    "main_quit": "q       - cikis",
    "main_prompt": "Seciminiz (check / new / find / run / q): ",
    "main_unknown": "Bilinmeyen alt-arac, tekrar deneyin.",
    "find_prompt": "Aranacak kelime (bos = geri): ",
    "find_no": "'{kw}' icin sonuc yok",
    "find_n": "Toplam {n} eslesme (en fazla {max} gosteriliyor):",
    "new_type": "Uretim turu (script / dir, bos = geri): ",
    "new_path": "Yeni {kind} yolu (projeye goreli veya tam yol): ",
    "new_exists": "zaten var - hicbir sey uretilmedi: {p}",
    "new_created": "olusturuldu: {p}",
    "new_script_hint": "script sablonu yazildi: {p}",
    "run_list": "Calistirilabilir scriptler:",
    "run_which": "Hangi script (game / webpanel / tool) veya .py yolu (q = geri): ",
    "run_bad": "bulunamadi / bilinmiyor: {s}",
    "run_start": "baslatiliyor: {cmd}",
    # check (module) menu
    "check_menu_title": "Tarama/check modulunu secin:",
    "menu_7": "[7] AST / olu-kod analizi",
    "menu_8": "[8] Motor safligi (deep_engine -> game sizintisi)",
    "menu_9": "[9] Regression (seed determinizm / veri / WARN trendi)",
    "menu_10": "[10] Gizli bilgi taramasi (anahtar/token/sifre)",
    "menu_11": "[11] Olu kod (tanimli ama cagrilmayan)",
    "menu_12": "[12] Karmasiklik ozeti (en buyuk dosya/fonksiyon)",
    "menu_13": "[13] Cokme trendi (motor.log)",
    "menu_20": "[20] TUMUNU TARA",
    "menu_b": "[b] Ana menuye geri don",
    "menu_prompt": "Seciminiz (virgullu, orn. 1,4 / 10 / b / q): ",
    "tbc": "[yakinda] {n} numarali modul yer tutucu, henuz uygulanmadi.",
    # 7 - AST / dead-code
    "ast_hdr": "AST / olu-kod analizi",
    "ast_unused_import": "kullanilmayan import (gercek olu kod)",
    "ast_unreachable": "erisilemeyen kod (sonrasi {kw})",
    "ast_empty_except": "bos except blogu",
    "ast_maybe_undefined": "muhtemel tanimsiz isim (NameError riski)",
    "press_enter": "Pencereyi kapatmak icin ENTER'a basin...",
    # 8 - Engine purity
    "pur_hdr": "Motor safligi (deep_engine -> game sizintisi)",
    "pur_leak": "motor, game/main import ediyor (katman ihlali)",
    "pur_import": "motor modulu oyun-disina bagimli: {target}",
    "pur_cycle": "runtime'da olasi dongusel import: {modules}",
    "pur_ok": "motor katmani temiz (game/main referansi yok)",
    # 9 - Regression
    "reg_hdr": "Regression (seed determinizm / veri / trend)",
    "reg_seed_ok": "procedural: ayni seed -> ayni seviye ({seed})",
    "reg_seed_bad": "DETERMINISTIK DEGIL: {seed} farkli seviyeler uretti",
    "reg_seed_err": "procedural.generate dogrulanamadi: {err}",
    "reg_save_ok": "savegame.json gecerli JSON",
    "reg_save_bad": "savegame.json gecersiz/eksik: {err}",
    "reg_trend": "motor.log WARN/ERR toplami: {n}",
    "reg_trend_missing": "motor.log bulunamadi (henuz log yok)",
}

TR = dict(_TR_DATA)


def t(key, **kw):
    """Translates a key into the selected language; unknown keys return themselves."""
    d = TR if LANG == "tr" and key in TR else EN
    s = d.get(key, key)
    try:
        return s.format(**kw)
    except Exception:
        return s


def set_lang(code):
    global LANG
    LANG = "tr" if code not in ("en",) else "en"


# ===========================================================================
#  COMMON HELPERS
# ===========================================================================
def _py_project_files():
    """All *.py except build/dist/__pycache__ (root included, recursive)."""
    out = []
    for dirpath, dirnames, filenames in os.walk(ROOT):
        dirnames[:] = [d for d in dirnames
                       if d not in ("build", "dist", "__pycache__", ".git")]
        for fn in filenames:
            if fn.endswith(".py"):
                p = os.path.join(dirpath, fn)
                if os.path.basename(p) == "deep-tool.py":
                    continue
                out.append(p)
    return sorted(out)


def _rel(path):
    try:
        return os.path.relpath(path, ROOT)
    except Exception:
        return path


def _find_tags(text, pattern):
    """pattern: 'register_builder\\s*\\(\\s*[\\'\"](\\w+)[\\'\"]' -> tag set"""
    return set(re.findall(pattern, text))


def _read(path):
    try:
        with open(path, "r", encoding="utf-8-sig") as f:
            return f.read()
    except Exception:
        return ""


# ===========================================================================
#  MOTOR CONSOLE CORE  (old motorconsole.py — deep-tool's internal engine)
#  Module 1 uses these functions. There is no separate motorconsole.py.
# ===========================================================================
# Log level constants (same values as deep_engine.log)
DEBUG = 0
INFO = 1
WARN = 2
BUG = 3
ERR = 4
# NOTE: "silent except" is intentionally NOT scanned here: the AST module
# (empty except block) already reports those, and counting the same spot
# twice inflated the totals (deliberate fallbacks are marked "# noqa").
_WILDCARD_IMPORT = re.compile(r"^\s*from\s+\S+\s+import\s+\*\s*$", re.M)
_TODO = re.compile(r"\b(?:TODO|FIXME|XXX)\b")
_TYPO = re.compile(r"\b(?:teh?|recieve|recieving|seperat|occured|lenght)\b", re.I)
_MEDIA_LOAD_RE = re.compile(
    r"pygame\.image\.load\s*\(\s*['\"]([^'\"]+)['\"]|"
    r"mixer\.Sound\s*\(\s*['\"]([^'\"]+)['\"]|"
    r"open\s*\(\s*['\"]([^'\"]+)['\"]",
    re.M,
)


def _mc_module_name(path):
    return _rel(path).replace(".py", "").replace("\\", ".").replace("/", ".")


def check_syntax(path):
    try:
        with open(path, "r", encoding="utf-8-sig") as f:
            src = f.read()
        compile(src, path, "exec")
        return True, None
    except SyntaxError as e:
        return False, "SyntaxError: %s (satir %s)" % (e.msg, e.lineno)
    except Exception as e:
        return False, "Derleme hatasi: %r" % (e,)


def check_patterns(path):
    findings = []
    src = _read(path)
    if not src:
        return [(ERR, "Dosya okunamadi")] if not os.path.exists(path) else findings
    rs = [(_WILDCARD_IMPORT, WARN, "from ... import * - isim cakismasi riski"),
          (_TODO, WARN, "TODO/FIXME kalintisi"),
          (_TYPO, WARN, "Muhtemel yazim hatasi girdisi")]
    for rx, lvl, desc in rs:
        for m in rx.finditer(src):
            ln = src[: m.start()].count("\n") + 1
            snippet = " ".join(m.group(0).split())
            findings.append((lvl, "L%s: %s (%s)" % (ln, desc, snippet[:50])))
    return findings


def check_media(path):
    findings = []
    src = _read(path)
    if not src:
        return findings
    for m in _MEDIA_LOAD_RE.finditer(src):
        target = next((g for g in m.groups() if g), None)
        if not target:
            continue
        candidate = target if os.path.isabs(target) else os.path.join(ROOT, target)
        if not os.path.exists(candidate):
            ln = src[: m.start()].count("\n") + 1
            findings.append((WARN, "L%s: Basvurulan dosya diskte YOK: %r" % (ln, target)))
    return findings


def check_imports(path):
    """Parses multi-line from-imports correctly; writes real duplicate imports to INFO."""
    findings = []
    lines = _read(path).splitlines()
    names_by_line = []  # (line, name)
    i = 0
    n = len(lines)
    while i < n:
        ln_no = i + 1
        line = lines[i]
        if re.match(r"^\s*#", line) or line.strip() == "":
            i += 1
            continue
        m = re.match(r"^\s*from\s+(\S+)\s+import\s+", line)
        if m:
            rest = line[m.end():].strip()
            if rest.startswith("("):
                buf = rest
                i += 1
                while i < n and ")" not in buf:
                    buf += lines[i]
                    i += 1
                body = buf
            else:
                body = rest
                i += 1
            for part in re.split(r"\s*,\s*", body.replace("(", " ").replace(")", " ").strip()):
                part = part.strip()
                if not part:
                    continue
                if " as " in part:
                    part = part.split(" as ", 1)[1].strip()
                if part and part != "*":
                    names_by_line.append((ln_no, part))
        else:
            i += 1
    for (ln, name) in names_by_line:
        dups = [l for (l, nm) in names_by_line if nm == name and l != ln]
        if dups:
            findings.append((INFO, "L%s: '%s' birden cok import edilmis (%s)"
                            % (ln, name, ", ".join("L%d" % l for l in dups))))
    return findings


def check_import(path):
    rel = _rel(path)
    if rel in ("main.py",) or rel.startswith("deep_engine/"):
        try:
            if rel == "main.py":
                import main  # noqa: F401  (module __main__ block must be guarded)
            else:
                name = _mc_module_name(path)
                spec = importlib.util.find_spec(name)
                if spec is not None:
                    importlib.import_module(name)
            return True, None
        except Exception as e:
            tb = traceback.format_exc(limit=3).strip().splitlines()
            return False, "Import hatasi: %r (%s)" % (e, tb[-1] if tb else "?")
    return True, None


def run_smoke(frames=20):
    import os as _os
    _os.environ.setdefault("SDL_VIDEODRIVER", "dummy")
    _os.environ.setdefault("SDL_AUDIODRIVER", "dummy")
    _os.environ.setdefault("PYGAME_HIDE_SUPPORT_PROMPT", "1")
    try:
        import pygame
        from deep_engine import Engine
        from game.ui import build_main_menu_scene
        pygame.init()
        eng = Engine(title="deep-tool-smoke", width=900, height=600, target_fps=60)
        menu = build_main_menu_scene()
        eng.set_scene(menu)
        for _ in range(frames):
            eng._frame(1 / 60)
        pygame.quit()
        return [(INFO, "Smoke OK: %d kare menu hatasiz calisti" % frames)]
    except Exception as e:
        tb = traceback.format_exc(limit=6).strip().splitlines()
        return [(ERR, "Smoke COKTU: %r\n%s" % (e, "\n".join(tb[-4:])))]


# ===========================================================================
#  MODULE 1 : MOTOR CONSOLE
# ===========================================================================
def run_motor_console(collect):
    files = _py_project_files()
    ok_s = 0
    for p in files:
        ok, _msg = check_syntax(p)
        ok_s += 1 if ok else 0
        if not ok:
            collect("ERR", "%s syntax: %s" % (_rel(p), _msg))
    collect("INFO", t("mc_syntax", ok=ok_s, total=len(files)))
    ok_i = 0
    for p in files:
        ok, msg = check_import(p)
        ok_i += 1 if ok else 0
        if not ok:
            collect("ERR", "%s import: %s" % (_rel(p), msg))
    collect("INFO", t("mc_import", ok=ok_i, total=len(files)))
    for p in files:
        for lvl, msg in check_patterns(p):
            collect("WARN", "%s :: %s" % (_rel(p), msg))
        for lvl, msg in check_media(p):
            collect("WARN", "%s :: %s" % (_rel(p), msg))
    collect("INFO", t("mc_smoke_start"))
    for lvl, msg in run_smoke():
        if lvl >= WARN:
            collect("WARN", "smoke :: %s" % msg)
        if lvl == INFO:
            collect("INFO", t("mc_smoke_ok"))


# ===========================================================================
#  MODULE 2 : IMPORT GRAPH
# ===========================================================================
_IMPORT_RE = re.compile(
    r"^\s*import\s+([\w\.]+)|"
    r"^\s*from\s+([\w\.]+)\s+import\s+",
    re.M,
)


def _imports_of(src):
    """AST-based: real import statements (comments/docstrings EXCLUDED)."""
    try:
        tree = ast.parse(src)
    except Exception:
        return set()
    mods = set()
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            for al in node.names:
                mods.add(al.name.split(".")[0])
        elif isinstance(node, ast.ImportFrom) and node.level == 0:
            if node.module:
                mods.add(node.module.split(".")[0])
    return mods


def _import_pairs(src):
    """Returns (fullname, root) import pairs; e.g. ('game.ui','game').
    AST-based: does not catch fake imports inside docstrings/comments."""
    try:
        tree = ast.parse(src)
    except Exception:
        return set()
    pairs = set()
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            for al in node.names:
                pairs.add((al.name, al.name.split(".")[0]))
        elif isinstance(node, ast.ImportFrom) and node.level == 0 and node.module:
            pairs.add((node.module, node.module.split(".")[0]))
    return pairs


def run_import_graph(collect):
    files = _py_project_files()
    collect("INFO", t("ig_files", n=len(files)))
    # module name -> file path map
    mod2file = {}
    for p in files:
        base = os.path.splitext(os.path.basename(p))[0]
        stem = _rel(p).replace(os.sep, ".").replace(".py", "")
        mod2file[base] = p
        mod2file[stem] = p
    # internal project modules imported by each file
    used_edges = {}  # importer_file -> set(internal project modules)
    for p in files:
        mods = _imports_of(_read(p))
        deps = set()
        for mk in mods:
            if mk in mod2file or mk == "main":
                deps.add(mk)
        used_edges[p] = deps
    # unused import (no reference in code): simple check
    for p in files:
        src = _read(p)
        for dep in used_edges[p]:
            base = dep.split(".")[0]
            # reference check: 'dep.', 'dep(', 'dep ' or end-of-line
            if base == "main":
                continue
            pat = re.compile(r"\b" + re.escape(base) + r"\b")
            # strip the import line itself
            body = _IMPORT_RE.sub("", src)
            if not pat.search(body):
                collect("WARN", "%s :: %s: %s" % (
                    _rel(p), t("ig_unused"), base))
    # circular imports (fast & guaranteed via global visited + path membership)
    cycle_reports = set()

    def _find_cycle(start, path):
        # present in path -> real cycle (self-repeating visit)
        if start in path:
            cyc = tuple(path[path.index(start):] + [start])
            return cyc
        visit_path = path + [start]
        if len(visit_path) > 10:
            return None
        for dep in used_edges.get(start, set()):
            dp = mod2file.get(dep) if dep != "main" else None
            if dp and dp not in visit_path:
                if dp in _global_seen:
                    continue
                r = _find_cycle(dp, visit_path)
                if r:
                    return r
        return None

    _global_seen = set()
    for p in files:
        if p in _global_seen:
            continue
        _global_seen.add(p)
        c = _find_cycle(p, [])
        if c:
            cyc_key = tuple(c)
            if cyc_key not in cycle_reports:
                cycle_reports.add(cyc_key)
                chain = " -> ".join(os.path.splitext(os.path.basename(x))[0]
                                    for x in c)
                collect("BUG", t("ig_circular"))
                collect("BUG", t("ig_chain", chain=chain))


# ===========================================================================
#  MODULE 3 : BUILDER / EXTRACTOR CONSISTENCY
# ===========================================================================
# register_builder("Tag", _fn) / register_extractor("Tag", _fn) pair
_BUILDER_REG = re.compile(
    r"register_builder\s*\(\s*['\"]([^'\"]+)['\"]\s*,\s*(\w+)\s*\)", re.M)
_EXTRACTOR_REG = re.compile(
    r"register_extractor\s*\(\s*['\"]([^'\"]+)['\"]\s*,\s*(\w+)\s*\)", re.M)
_FN_DEF = re.compile(r"^def\s+(\w+)\s*\(", re.M)


def run_builder_extractor(collect):
    # Builder/extractor source is now both main.py (old) and the game/ package.
    # The scan merges all relevant .py sources (tags may span multiple files).
    src_files = [os.path.join(ROOT, "main.py")]
    game_dir = os.path.join(ROOT, "game")
    if os.path.isdir(game_dir):
        src_files.extend(
            os.path.join(game_dir, f) for f in sorted(os.listdir(game_dir))
            if f.endswith(".py")
        )
    combined = "\n".join(_read(p) for p in src_files if os.path.exists(p))
    defs = set(_FN_DEF.findall(combined))
    b_map = {}  # tag -> fn
    for tag, fn in _BUILDER_REG.findall(combined):
        b_map.setdefault(tag, fn)
    e_map = {}
    for tag, fn in _EXTRACTOR_REG.findall(combined):
        e_map.setdefault(tag, fn)
    collect("INFO", t("be_reg", n=len(b_map)))
    collect("INFO", t("be_ext", n=len(e_map)))
    # Deliberate builder-only tags: not editable in the web panel, so their
    # extractor (for round-tripping) is intentionally omitted.
    _EXTRACTORLESS_OK = {"Coin", "Player", "Spikes"}
    # 1) symmetry: builder without extractor (and vice versa)
    for tag in sorted(set(b_map) - set(e_map)):
        if tag in _EXTRACTORLESS_OK:
            collect("INFO", "game :: %s (%s)"
                    % (t("be_missing_extractor"), tag))
        else:
            collect("WARN", "game :: %s (%s)" % (t("be_missing_extractor"), tag))
    for tag in sorted(set(e_map) - set(b_map)):
        collect("WARN", "game :: %s (%s)" % (t("be_missing_builder"), tag))
    # 2) reference to an undefined function (runtime crash risk = BUG)
    for tag, fn in list(b_map.items()) + list(e_map.items()):
        if fn not in defs:
            collect("BUG", "game :: register '%s' -> tanimsiz fonksiyon %r (%s)"
                    % (tag, fn, t("be_missing_register")))
    # 3) builder/extractor suffix mismatch for the same tag (real inconsistency)
    def _suffix(fn):
        if fn.startswith("_build_"):
            return fn[len("_build_"):]
        if fn.startswith("_extract_"):
            return fn[len("_extract_"):]
        return fn

    for tag in sorted(set(b_map) & set(e_map)):
        if _suffix(b_map[tag]) != _suffix(e_map[tag]):
            collect("BUG", "game :: '%s' builder=%s vs extractor=%s uyumsuz"
                    % (tag, b_map[tag], e_map[tag]))


# ===========================================================================
#  MODULE 4 : i18n KEY CHECK  (tr/en parity)
# ===========================================================================
_I18N_DICT_RE = re.compile(r"TRANSLATIONS\s*=\s*\{")
_I18N_KEY = re.compile(r"^\s*['\"]([^'\"]+)['\"]\s*:")


def _i18n_keys_by_lang(src):
    """Separates the TRANSLATIONS = { 'tr': {...}, 'en': {...} } blocks."""
    idx = _I18N_DICT_RE.search(src)
    result = {}
    if not idx:
        return result
    tree = None
    try:
        tree = ast.parse(src)
    except Exception:
        return result
    for node in ast.walk(tree):
        if isinstance(node, ast.Assign):
            for tgt in node.targets:
                if isinstance(tgt, ast.Name) and tgt.id == "TRANSLATIONS":
                    if isinstance(node.value, ast.Dict):
                        for k, v in zip(node.value.keys, node.value.values):
                            if isinstance(k, ast.Constant) and isinstance(v, ast.Dict):
                                lang = k.value
                                keys = set()
                                for kk in v.keys:
                                    if isinstance(kk, ast.Constant):
                                        keys.add(kk.value)
                                result[lang] = keys
    return result


def run_i18n(collect):
    p = os.path.join(ROOT, "deep_engine", "i18n.py")
    if not os.path.exists(p):
        collect("WARN", t("i18n_no_file"))
        return
    langs = _i18n_keys_by_lang(_read(p))
    trk = langs.get("tr", set())
    enk = langs.get("en", set())
    collect("INFO", "%s: %d | %s: %d" % (t("i18n_tr"), len(trk), t("i18n_en"), len(enk)))
    for key in sorted(trk - enk):
        collect("WARN", "%s :: %s (%s)" % (_rel(p), t("i18n_missing_en"), key))
    for key in sorted(enk - trk):
        collect("WARN", "%s :: %s (%s)" % (_rel(p), t("i18n_missing_tr"), key))


# ===========================================================================
#  MODULE 5 : ASSET / MEDIA EXISTENCE
# ===========================================================================
_ASSET_REF = re.compile(
    r"(?:image\.load|Sound|mixer\.Sound|open|pygame\.image\.load)\s*\(\s*['\"]([^'\"]+)['\"]",
    re.M,
)
# deliberate synthesis / placeholders (do not require a real file)
_SKIP = {"", ".", "..", "~", "$"}


def run_asset(collect):
    files = _py_project_files()
    count = 0
    for p in files:
        src = _read(p)
        for m in _ASSET_REF.finditer(src):
            target = m.group(1)
            if not target or target[0] in "{$":
                continue
            if target.startswith(("#", "://")):
                continue
            cand = target if os.path.isabs(target) else os.path.join(ROOT, target)
            if not os.path.exists(cand):
                count += 1
                collect("WARN", "%s :: %s (%r)" % (_rel(p), t("asset_missing"), target))
    collect("INFO", t("asset_checked", n=count) if count else
            "Asset references: all present")


# ===========================================================================
#  MODULE 6 : PERFORMANCE WARNINGS
# ===========================================================================
#  MODULE 6 : PERFORMANCE WARNINGS (safe, line-based - no regex backtracking)
# ===========================================================================


def _iter_code_lines(src):
    """Splits code into lines; returns indent (whitespace) count + line content."""
    for ln, raw in enumerate(src.splitlines(), 1):
        st = raw if raw else ""
        indent = len(st) - len(st.lstrip())
        yield ln, indent, st.strip(), raw


def run_perf(collect):
    files = _py_project_files()
    for p in files:
        src = _read(p)
        lines = list(_iter_code_lines(src))
        # 1) nested double loop: a deeper for following a for line
        for i in range(len(lines)):
            _ln, ind, code, _raw = lines[i]
            if not code.startswith("for ") and not code.startswith("for("):
                continue
            # look for a nested for on later lines (within this block depth)
            for j in range(i + 1, min(i + 60, len(lines))):
                ln2, ind2, code2, _ = lines[j]
                if code2.startswith("for ") or code2.startswith("for("):
                    if ind2 > ind:  # deeper indent = nested loop
                        collect("INFO", "%s :: L%s: %s"
                                % (_rel(p), _ln, t("perf_nested_loop")))
                        break
                elif ind2 <= ind and code2 and not code2.startswith(("#", ")")):
                    break  # end of outer block
        # 2) resource opened inside a loop (open/Image/Sound file path)
        for i in range(len(lines)):
            _ln, ind, code, _raw = lines[i]
            if not (code.startswith("for ") or code.startswith("for(")):
                continue
            for j in range(i + 1, min(i + 80, len(lines))):
                ln2, ind2, code2, raw2 = lines[j]
                if not code2:
                    continue
                if ind2 <= ind:
                    break
                if re.search(r"\b(?:open|pygame\.image\.load)\s*\(", code2):
                    lvl = "INFO" if "# noqa" in (raw2 or "") else "WARN"
                    collect(lvl, "%s :: L%s: %s"
                            % (_rel(p), ln2, t("perf_file_loop")))
                    break


# ===========================================================================
#  MODULE 7 : AST / DEAD-CODE ANALYSIS
#  (ast-based; static, read-only. Reports, does not fix.)
# ===========================================================================
_BUILTINS = set(dir({}.__len__))
for _b in ("len", "range", "str", "int", "float", "bool", "list", "dict",
           "set", "tuple", "print", "isinstance", "issubclass", "hasattr",
           "getattr", "setattr", "sum", "min", "max", "abs", "sorted",
           "reversed", "enumerate", "zip", "map", "filter", "any", "all",
           "open", "input", "type", "object", "super", "property", "classmethod",
           "staticmethod", "Exception", "ValueError", "TypeError", "KeyError",
           "IndexError", "RuntimeError", "NotImplemented", "NotImplementedError",
           "BaseException", "StopIteration", "round", "divmod", "repr", "iter",
           "next", "id", "hash", "vars", "dir", "callable", "format", "ord",
           "chr", "compile", "eval", "exec", "bytes", "bytearray", "memoryview",
           "frozenset", "complex", "tuple", "slice", "bin", "oct", "hex",
           "pow", "ascii", "globals", "locals", "value", "key", "self", "cls",
           # Base exception hierarachy + common builtins used in "except <name>:"
           "KeyboardInterrupt", "SystemExit", "GeneratorExit", "OSError", "IOError",
           "EOFError", "ImportError", "AttributeError", "NameError", "UnboundLocalError",
           "ZeroDivisionError", "MemoryError", "RecursionError", "OverflowError",
           "ArithmeticError", "TimeoutError", "BrokenPipeError", "socket", "pygame"):
    _BUILTINS.add(_b)


def _module_globals(tree):
    """Names defined at module top-level: assign / def / class / import / arg."""
    names = set()
    for node in tree.body:
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef,
                             ast.ClassDef)):
            names.add(node.name)
        elif isinstance(node, ast.Import):
            for a in node.names:
                names.add((a.asname or a.name).split(".")[0])
        elif isinstance(node, ast.ImportFrom):
            for a in node.names:
                if a.name != "*":
                    names.add(a.asname or a.name)
        elif isinstance(node, ast.Assign):
            for t in node.targets:
                if isinstance(t, ast.Name):
                    names.add(t.id)
        elif isinstance(node, ast.AnnAssign) and isinstance(node.target, ast.Name):
            names.add(node.target.id)
        elif isinstance(node, ast.AugAssign) and isinstance(node.target, ast.Name):
            names.add(node.target.id)
    return names


def _fn_locals_and_params(func):
    """Names STORED (locals) in the function body + parameter names."""
    local = set()
    for node in ast.walk(func):
        if isinstance(node, ast.Name) and isinstance(node.ctx, ast.Store):
            local.add(node.id)
        elif isinstance(node, (ast.Import, ast.ImportFrom)):
            if isinstance(node, ast.Import):
                for a in node.names:
                    local.add((a.asname or a.name).split(".")[0])
            else:
                for a in node.names:
                    if a.name != "*":
                        local.add(a.asname or a.name)
        elif isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef,
                               ast.ClassDef, ast.Lambda)):
            # inner functions: count their names as locals (shadowing)
            if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef,
                                 ast.ClassDef)):
                local.add(node.name)
        elif isinstance(node, ast.ExceptHandler) and isinstance(node.name, str):
            # 'except X as e' -> e is a local alias
            local.add(node.name)
    params = set()
    for arg in list(func.args.args) + list(func.args.kwonlyargs) + list(func.args.posonlyargs):
        params.add(arg.arg)
    if func.args.vararg:
        params.add(func.args.vararg.arg)
    if func.args.kwarg:
        params.add(func.args.kwarg.arg)
    return local | params


def run_ast(collect):
    files = _py_project_files()
    imported_total = unreachable_total = empty_total = undef_total = 0

    for p in files:
        src = _read(p)
        if not src:
            continue
        try:
            tree = ast.parse(src, filename=p)
        except SyntaxError:
            continue

        rel = _rel(p)
        is_init = os.path.basename(p) == "__init__.py"

        if not is_init:
            # --- 1) Unused import (never used across the module) ---
            used_names = set()
            imported = {}   # name -> line
            for node in ast.walk(tree):
                if isinstance(node, ast.Name):
                    if isinstance(node.ctx, (ast.Load, ast.Del)):
                        used_names.add(node.id)
            for node in ast.walk(tree):
                if isinstance(node, ast.Import):
                    for a in node.names:
                        nm = (a.asname or a.name).split(".")[0]
                        imported[nm] = imported.get(nm, node.lineno)
                elif isinstance(node, ast.ImportFrom):
                    for a in node.names:
                        if a.name == "*":
                            continue
                        nm = a.asname or a.name
                        if nm not in imported:
                            imported[nm] = node.lineno
            for nm, ln in sorted(imported.items(), key=lambda kv: kv[1]):
                if nm not in used_names:
                    # count as used if the import name also appears as an attr.cattr
                    if nm not in _attr_names(tree):
                        collect("WARN", "%s :: L%s: %s '%s'"
                                % (rel, ln, t("ast_unused_import"), nm))
                        imported_total += 1

        # --- 2) Unreachable code (after return/raise in the same block) ---
        for body in _all_bodies(tree):
            unreachable_total += _scan_block(body, rel, collect)

        # --- 3) Empty except block (deliberate fallbacks are marked "# noqa") ---
        src_lines = src.splitlines()
        for node in ast.walk(tree):
            if isinstance(node, ast.ExceptHandler):
                body = [s for s in node.body if not isinstance(s, ast.Pass)]
                if not body:
                    lm = node.type.lineno if node.type else node.lineno
                    last = node.body[-1].lineno if node.body else node.lineno
                    noqa = any("# noqa" in src_lines[k]
                               for k in range(node.lineno - 1, min(last, len(src_lines))))
                    if noqa:
                        collect("INFO", "%s :: L%s: %s"
                                % (rel, lm, t("ast_empty_except")))
                    else:
                        collect("WARN", "%s :: L%s: %s"
                                % (rel, lm, t("ast_empty_except")))
                        empty_total += 1

        # --- 4) Possibly undefined name (scope-aware; including nested funcs) ---
        globals_set = _module_globals(tree)
        for stmt in tree.body:
            if isinstance(stmt, (ast.FunctionDef, ast.AsyncFunctionDef)):
                try:
                    _check_undefined(stmt, globals_set, rel, collect)
                except Exception:
                    continue

    return imported_total, unreachable_total, empty_total, undef_total


def _all_bodies(tree):
    """Collects module + function + if/for/while/try/with bodies."""
    out = [tree.body]
    for node in ast.walk(tree):
        if node is tree:
            continue
        for f in ("body", "orelse"):
            b = getattr(node, f, None)
            if isinstance(b, list):
                out.append(b)
    return out


def _attr_names(tree):
    """All Attribute.attr names in the AST (imported obj.attr usage)."""
    out = set()
    for node in ast.walk(tree):
        if isinstance(node, ast.Attribute):
            out.add(node.attr)
    return out


_UNDEF_SEEN = set()


def _is_likely_false(nm):
    # Field names/dunder/special flow names -> false-positive filter
    if nm.startswith("_") or nm.isupper():
        return True
    if nm in ("self", "cls", "key", "value", "item", "obj", "colour", "color",
              "snd", "img", "surface", "screen", "rect", "dt", "scene",
              "engine", "font", "mixer", "pygame", "np", "sk", "time", "os",
              "sys", "random", "math", "json", "io", "path", "g", "A"):
        return True
    return False


def _check_undefined(func, defined, rel, collect):
    """Name used in a function body but undefined in that scope -> WARN.
    Nested functions inherit the outer scope (closure) and add their own params/locals."""
    _walk_scope(func, set(defined), rel, collect)


def _walk_scope(node, scope, rel, collect):
    """Scope-aware recursive visitor. Outer scope is copied; inner functions
    recurse by adding their own params/locals."""
    global _UNDEF_SEEN
    if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef, ast.Lambda)):
        scope |= _fn_locals_and_params(node)
    for child in ast.iter_child_nodes(node):
        if isinstance(child, (ast.FunctionDef, ast.AsyncFunctionDef,
                              ast.Lambda, ast.ClassDef)):
            _walk_scope(child, set(scope), rel, collect)
            continue
        if isinstance(child, ast.Name) and isinstance(child.ctx, ast.Load):
            nm = child.id
            if nm in _BUILTINS or nm in scope or _is_likely_false(nm):
                pass
            else:
                key = (rel, child.lineno, nm)
                if key not in _UNDEF_SEEN:
                    _UNDEF_SEEN.add(key)
                    collect("WARN", "%s :: L%s: %s '%s'"
                            % (rel, child.lineno, t("ast_maybe_undefined"), nm))
        _walk_scope(child, set(scope), rel, collect)


def _scan_block(stmts, rel, collect):
    """Real statement after Return/Raise in a statement list -> WARN count."""
    count = 0
    for i, s in enumerate(stmts):
        if isinstance(s, (ast.Return, ast.Raise)):
            for after in stmts[i + 1:]:
                if isinstance(after, ast.Pass):
                    continue
                if isinstance(after, ast.Expr) and isinstance(
                        getattr(after.value, "value", None), str):
                    # a docstring can only be the first statement of a body, never after
                    continue
                kw = "return" if isinstance(s, ast.Return) else "raise"
                collect("WARN", "%s :: L%s: %s"
                        % (rel, s.lineno, t("ast_unreachable", kw=kw)))
                count += 1
                break
    return count


# ===========================================================================
#  MODULE 8 : ENGINE PURITY
# ===========================================================================
def _engine_purity_leak(collect):
    """Files under deep_engine/ must not depend on game/main."""
    eng_dir = os.path.join(ROOT, "deep_engine")
    if not os.path.isdir(eng_dir):
        collect("INFO", t("pur_ok"))
        return
    leaked = 0
    for dirpath, _dirs, fns in os.walk(eng_dir):
        if "__pycache__" in dirpath:
            continue
        for fn in fns:
            if not fn.endswith(".py"):
                continue
            p = os.path.join(dirpath, fn)
            src = _read(p)
            mods = _imports_of(src)
            bad = [m for m in mods
                   if m == "main" or m == "game" or m.startswith("game.")]
            for target in sorted(bad):
                leaked += 1
                collect("BUG", "%s :: %s: %s"
                        % (_rel(p), t("pur_leak"), t("pur_import", target=target)))
    if leaked == 0:
        collect("INFO", t("pur_ok"))


def _engine_purity_cycle(collect):
    """There must be no deep_engine -> game -> deep_engine runtime cycle.
    Verified via the import graph: the game depends on the engine; the engine does NOT depend on the game."""
    files = _py_project_files()
    mod2file = {}
    for p in files:
        stem = _rel(p).replace(os.sep, ".").replace(".py", "")
        mod2file[stem] = p
        mod2file[os.path.splitext(os.path.basename(p))[0]] = p
    used_edges = {}
    for p in files:
        deps = set()
        for full, _root in _import_pairs(_read(p)):
            if full in mod2file:
                deps.add(mod2file[full])
        used_edges[p] = deps
    # depth-first: report a real cycle that starts from the game (game/) and
    # returns to game after reaching an engine file
    cyc_reports = set()

    def _walk(p, path):
        if p in path:
            cyc = tuple(path[path.index(p):])
            if cyc not in cyc_reports:
                cyc_reports.add(cyc)
                chain = " -> ".join(os.path.splitext(
                    os.path.basename(x))[0] for x in cyc)
                collect("BUG", t("pur_cycle", modules=chain))
            return
        npath = path + [p]
        if len(npath) > 12:
            return
        for dep in used_edges.get(p, set()):
            _walk(dep, npath)

    for p in files:
        if _rel(p).replace(os.sep, "/").startswith("game/"):
            _walk(p, [])


def run_engine_purity(collect):
    collect("INFO", t("pur_hdr"))
    _engine_purity_leak(collect)
    _engine_purity_cycle(collect)


# ===========================================================================
#  MODULE 9 : REGRESSION
# ===========================================================================
def _reg_seed(collect):
    """Same seed -> same level (deterministic)."""
    try:
        import json
        from deep_engine.procedural import generate
        a = generate(biome=None, seed=4242, chunks=8)
        b = generate(biome=None, seed=4242, chunks=8)
        ha = json.dumps(a, sort_keys=True, ensure_ascii=False)
        hb = json.dumps(b, sort_keys=True, ensure_ascii=False)
        if ha == hb:
            collect("INFO", t("reg_seed_ok", seed=4242))
        else:
            collect("BUG", t("reg_seed_bad", seed=4242))
    except Exception as e:
        collect("ERR", t("reg_seed_err", err=e))


def _reg_save(collect):
    """Is savegame.json valid JSON, and are the expected keys present?"""
    import json as _json
    path = os.path.join(ROOT, "savegame.json")
    try:
        with open(path, encoding="utf-8-sig") as f:
            data = _json.load(f)
        if not isinstance(data, dict):
            raise ValueError("top-level must be an object")
        missing = [k for k in ("lang", "high_score") if k not in data]
        if missing:
            collect("WARN", "%s :: eksik anahtar: %s"
                    % (os.path.basename(path), ", ".join(missing)))
        collect("INFO", t("reg_save_ok"))
    except Exception as e:
        collect("WARN", t("reg_save_bad", err=e))


def _reg_trend(collect):
    """motor.log WARN/ERR trend (persistent record)."""
    path = os.path.join(ROOT, "motor.log")
    if not os.path.isfile(path):
        collect("INFO", t("reg_trend_missing"))
        return
    try:
        with open(path, encoding="utf-8", errors="replace") as f:
            txt = f.read()
        warns = txt.count("[WARN]")
        errs = txt.count("[ERR]")
        bugs = txt.count("[BUG]")
        total = warns + errs + bugs
        collect("INFO", t("reg_trend", n=total)
                + (" (WARN %d, ERR %d, BUG %d)" % (warns, errs, bugs)))
    except Exception as e:
        collect("WARN", "motor.log okunamadi: %s" % e)


def run_regression(collect):
    collect("INFO", t("reg_hdr"))
    _reg_seed(collect)
    _reg_save(collect)
    _reg_trend(collect)


# ===========================================================================
#  MODULES 10-13: SECRET / DEAD CODE / COMPLEXITY / CRASH TREND
# ===========================================================================
_SECRET_VALUE = re.compile(
    r"(?i)\b(?:api[_-]?key|api[_-]?secret|secret|passwd|password|auth[_-]?token)"
    r"\s*[=:]\s*[\"'][^\"']{6,}[\"']"
)
_SECRET_TOKEN = re.compile(
    r"ghp_[A-Za-z0-9]{20,}|gho_[A-Za-z0-9]{20,}|ghu_[A-Za-z0-9]{20,}|"
    r"xox[baprs]-[A-Za-z0-9-]{10,}|AKIA[0-9A-Z]{16}|"
    r"sk-(?:live|test)-[A-Za-z0-9]{20,}|AIza[0-9A-Za-z_-]{35}|"
    r"-----BEGIN [A-Z ]*PRIVATE KEY-----|"
    r"eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{5,}"
)


def run_secrets(collect):
    """[10] Sifre/anahtar/token gibi gizli bilgi desenlerini tara."""
    hits = 0
    for p in _py_project_files():
        src = _read(p)
        if not src:
            continue
        for rx, desc in ((_SECRET_VALUE, "literal deger atanmis"),
                         (_SECRET_TOKEN, "gercek token/anahtar formati")):
            for m in rx.finditer(src):
                ln = src[: m.start()].count("\n") + 1
                snip = " ".join(m.group(0).split())[:60]
                collect("WARN", "%s :: L%d Gizli bilgi olabilir (%s): %s"
                        % (_rel(p), ln, desc, snip))
                hits += 1
    if os.path.isfile(os.path.join(ROOT, ".env")):
        collect("WARN", ".env dosyasi diskte bulundu - repo disinda tut (gitignore).")
        hits += 1
    if not hits:
        collect("INFO", "Sifre/anahtar/token deseni bulunamadi (temiz).")


def run_deadcode(collect):
    """[11] Tanimli ama hic cagrilmayan (ust-seviye) fonksiyon/class adaylari."""
    files = [p for p in _py_project_files() if os.path.isfile(p)]
    allsrc = "\n".join(_read(p) or "" for p in files)
    seen = set()
    cands = []
    for p in files:
        src = _read(p)
        if not src:
            continue
        for m in re.finditer(r"^(?:def|class)\s+(\w+)", src, re.M):
            name = m.group(1)
            if name.startswith("_") or name in seen:
                continue
            seen.add(name)
            refs = len(re.findall(r"\b%s\b" % re.escape(name), allsrc))
            if refs == 1:  # sadece kendi tanim satiri -> hicbir yerde kullanilmiyor
                cands.append((_rel(p), src[: m.start()].count("\n") + 1, m.group(0)))
    if not cands:
        collect("INFO", "Tum ust-seviye fonksiyon/class'lara kodda basvuruluyor (olu aday yok).")
        return
    for path, lnum, decl in sorted(cands):
        collect("INFO", "%s :: %s (L%d) - hic baska referans yok (kesin olu aday)"
                % (path, decl, lnum))


def run_complexity(collect):
    """[12] En buyuk dosyalar + en uzun yapilar (temizlik pusulasi)."""
    sizes = []
    structs = []
    for p in _py_project_files():
        src = _read(p)
        if not src:
            continue
        lines = src.splitlines()
        sizes.append((len(lines), _rel(p)))
        decls = [(m.start(), m.group(0)) for m in
                 re.finditer(r"^(?:def|class)\s+\w+", src, re.M)]
        for i, (start, decl) in enumerate(decls):
            nxt = len(lines)
            if i + 1 < len(decls):
                nxt = src[: decls[i + 1][0]].count("\n") + 1
            structs.append((nxt - src[: start].count("\n"), _rel(p),
                            src[: start].count("\n") + 1, decl))
    collect("INFO", "En buyuk 5 dosya (satir):")
    for n, path in sorted(sizes, reverse=True)[:5]:
        collect("INFO", "  %-4d %s" % (n, path))
    collect("INFO", "En uzun 5 yapi (satir):")
    for n, path, lnum, decl in sorted(structs, reverse=True)[:5]:
        collect("INFO", "  %-4d %s :: %s (L%d)" % (n, path, decl, lnum))


def run_crashtrend(collect):
    """[13] motor.log'daki tekrar eden traceback fonksiyon sayilari."""
    path = os.path.join(ROOT, "motor.log")
    if not os.path.isfile(path):
        collect("INFO", "motor.log yok - cokme trendi raporlanamadi.")
        return
    try:
        with open(path, encoding="utf-8", errors="replace") as f:
            txt = f.read()
    except Exception as e:
        collect("WARN", "motor.log okunamadi: %s" % e)
        return
    frames = re.findall(r'File "([^"]+)", line \d+, in (\w+)', txt)
    if not frames:
        collect("INFO", "motor.log'da traceback satiri yok (kayitli cokme bulunmadi).")
        return
    cnt = collections.Counter("%s::%s" % (os.path.basename(f), fn) for f, fn in frames)
    for key, n in cnt.most_common(8):
        collect("INFO", "  %3dx  %s" % (n, key))
    collect("INFO", "Toplam traceback kare satiri: %d" % len(frames))


# ===========================================================================
#  REPORTER / MENU
# ===========================================================================
def _print_result(name, findings):
    print()
    print("=" * 70)
    print("%s: %s" % (t("result_title"), name))
    print("=" * 70)
    w = b = e = info = 0
    for lvl, msg in findings:
        if lvl == "ERR":
            e += 1
            print("%s %s" % (t("err"), msg))
        elif lvl == "BUG":
            b += 1
            print("%s %s" % (t("bug"), msg))
        elif lvl == "WARN":
            w += 1
            print("%s %s" % (t("warn"), msg))
        else:
            info += 1
            print("  [i] %s" % msg)
    if w + b + e == 0:
        print(t("no_issues"))
    print("  " + t("summary", w=w, b=b, e=e))
    return w, b, e


def run_module(num, collect):
    if num == 1:
        run_motor_console(collect)
    elif num == 2:
        run_import_graph(collect)
    elif num == 3:
        run_builder_extractor(collect)
    elif num == 4:
        run_i18n(collect)
    elif num == 5:
        run_asset(collect)
    elif num == 6:
        run_perf(collect)
    elif num == 7:
        run_ast(collect)
    elif num == 8:
        run_engine_purity(collect)
    elif num == 9:
        run_regression(collect)
    elif num == 10:
        run_secrets(collect)
    elif num == 11:
        run_deadcode(collect)
    elif num == 12:
        run_complexity(collect)
    elif num == 13:
        run_crashtrend(collect)


MODULES = {
    1: "Motor Console",
    2: "Import Graph",
    3: "Builder/Extractor",
    4: "i18n keys",
    5: "Asset/media",
    6: "Performance",
    7: "AST / dead-code",
    8: "Engine purity",
    9: "Regression",
    10: "Secret scan",
    11: "Dead code",
    12: "Complexity snapshot",
    13: "Crash trend",
}


# ===========================================================================
#  SUB-TOOLS: FIND / NEW / RUN
# ===========================================================================
_SCRIPT_RUN = {
    "game": ("main.py", "Oyunu baslat (main.py)"),
    "webpanel": ("tools/webpanel.py", "Tarayici editoru (127.0.0.1:8765)"),
    "tool": ("tools/deep-tool.py", "deep-tool (bu aracin kendisi)"),
}

_NEW_SCRIPT = (
    '"""\n'
    '  %(name)s - DerinEngine\n'
    '"""\n'
    '\n'
    '\n'
    'def main():\n'
    '    """Gecici giris noktasi."""\n'
    '    pass\n'
    '\n'
    '\n'
    'if __name__ == "__main__":\n'
    '    main()\n'
)

_SEARCH_SKIP = ("build", "dist", "__pycache__", ".git", "node_modules")


def _search_files(folders=None):
    """Project text files (.py/.md/.json/.txt/.html/.js), skip build junk."""
    ext = (".py", ".md", ".json", ".txt", ".html", ".js")
    roots = [ROOT]
    if folders:
        roots = [os.path.join(ROOT, f) for f in folders if f]
    out = []
    for root in roots:
        if not os.path.isdir(root):
            continue
        for dp, dns, fns in os.walk(root):
            dns[:] = [d for d in dns if d not in _SEARCH_SKIP]
            for fn in fns:
                if fn.endswith(ext):
                    p = os.path.join(dp, fn)
                    if os.path.basename(p) == "deep-tool.py":
                        continue
                    out.append(p)
    return sorted(out)


def _collect_find(kw, folder=""):
    """find'in kalbi: dosya:satir:metin listesi dondurur (salt okunur)."""
    hits = []
    for p in _search_files([folder] if folder else None):
        src = _read(p)
        if not src:
            continue
        for i, line in enumerate(src.splitlines(), 1):
            if kw in line:
                hits.append((_rel(p), i, line.strip()[:80]))
                if len(hits) >= 40:
                    break
        if len(hits) >= 40:
            break
    return hits


def _perform_new(kind, path):
    """new'in kalbi: sonucu dict olarak dondurur (var olan yola dokunmaz)."""
    kind = (kind or "").strip().lower()
    if kind not in ("script", "dir"):
        return {"ok": False, "error": "kind script|dir olmali"}
    path = (path or "").strip()
    if not path:
        return {"ok": False, "error": "bos yol"}
    absp = path if os.path.isabs(path) else os.path.join(ROOT, path)
    if os.path.exists(absp):
        return {"ok": False, "exists": True, "path": path}
    if kind == "dir":
        os.makedirs(absp)
        return {"ok": True, "kind": "dir", "path": path}
    parent = os.path.dirname(absp)
    if parent and not os.path.isdir(parent):
        os.makedirs(parent)
    with io.open(absp, "w", encoding="utf-8", newline="\n") as f:
        f.write(_NEW_SCRIPT % {"name": os.path.basename(absp)})
    return {"ok": True, "kind": "script", "path": path}


def _do_find(interactive, cli_kw="", cli_folder=""):
    """find: anahtar kelimeyi dosya/satir satirlarinda ara (salt okunur)."""
    kw = cli_kw
    if not kw:
        try:
            kw = input(t("find_prompt")).strip()
        except EOFError:
            return
        if not kw or kw.lower() == "q":
            return
    hits = _collect_find(kw, cli_folder)
    if not hits:
        print(" " + t("find_no", kw=kw))
        return
    print(" " + t("find_n", n=len(hits), max=40))
    for p, i, line in hits:
        print("   %s:%d: %s" % (p, i, line))


def _do_new(interactive, cli_type="", cli_path=""):
    """new: script sablonu veya dizin olustur (var olan yola dokunmaz)."""
    kind = cli_type.strip().lower()
    if kind not in ("script", "dir"):
        try:
            kind = input(t("new_type")).strip().lower()
        except EOFError:
            return
        if kind not in ("script", "dir"):
            return
    path = cli_path.strip()
    if not path:
        try:
            path = input(t("new_path", kind=kind)).strip()
        except EOFError:
            return
        if not path:
            return
    res = _perform_new(kind, path)
    if not res.get("ok"):
        if res.get("exists"):
            print(" " + t("new_exists", p=res["path"]))
        return
    if res["kind"] == "script":
        print(" " + t("new_script_hint", p=res["path"]))
        return
    print(" " + t("new_created", p=res["path"]))


def _do_run(interactive, cli_target=""):
    """run: tanimli bir script'i veya verilen .py yolunu calistir."""
    target = cli_target
    if not target:
        print(" " + t("run_list"))
        for name, (rel, desc) in sorted(_SCRIPT_RUN.items()):
            print("   %-9s %-24s %s" % (name, rel, desc))
        try:
            target = input(t("run_which")).strip().lower()
        except EOFError:
            return
        if not target or target == "q":
            return
    if target in _SCRIPT_RUN:
        rel = _SCRIPT_RUN[target][0]
    elif target.endswith(".py"):
        rel = target
    else:
        print(" " + t("run_bad", s=target))
        return
    absp = rel if os.path.isabs(rel) else os.path.join(ROOT, rel)
    if not os.path.isfile(absp):
        print(" " + t("run_bad", s=target))
        return
    print(" " + t("run_start", cmd=_rel(absp)))
    try:
        subprocess.call([sys.executable, absp])
    except Exception as e:
        print(" " + t("run_bad", s="%s" % e))


_MAIN_TOOLS = ("check", "new", "find", "run")


def _print_banner():
    print()
    print("=" * 70)
    print(" %s" % t("banner_title"))
    print(" %s" % t("banner_sub"))
    print(" %s" % t("banner_sub_en"))
    print("=" * 70)


def _run_selected(selections):
    """Runs the given module numbers; returns (w, b, e) totals."""
    total_w = total_b = total_e = 0
    for num in selections:
        if num not in MODULES:
            continue
        findings = []
        collect = lambda lvl, msg: findings.append((lvl, msg))
        print()
        print(t("running", n=num, name=MODULES[num]), end=" ")
        t0 = time.time()
        run_module(num, collect)
        dt = time.time() - t0
        print(t("done") + " (%.2fs)" % dt)
        w, b, e = _print_result(MODULES[num], findings)
        total_w += w
        total_b += b
        total_e += e
    print()
    print("=" * 70)
    print(" %s" % t("summary", w=total_w, b=total_b, e=total_e))
    print("=" * 70)
    return total_w, total_b, total_e


def _prompt(interactive, key):
    if not interactive:
        raise EOFError
    try:
        return input(t(key)).strip()
    except EOFError:
        raise


def _check_menu_loop(interactive, press_enter):
    """CHECK sub-tool menu. Modules 1-9, 10 all, b back, q quit.
    Returns True if 'q' was pressed, False if 'b' was pressed (return to main menu)."""
    while True:
        print()
        print(t("check_menu_title"))
        for k in sorted(MODULES):
            print(t("menu_%d" % k))
        print(t("menu_20"))
        print(t("menu_b"))
        print(t("menu_q"))
        try:
            sel = _prompt(interactive, "menu_prompt").replace(",", " ").lower()
        except EOFError:
            sel = "q"
        tokens = sel.split()
        if not tokens:
            continue
        first = tokens[0]
        if first == "q":
            return True          # quit (entire app)
        if first == "b":
            return False         # return to main menu
        if first == "20" or first == "all":
            _run_selected(sorted(MODULES))
            continue
        picks = []
        for part in tokens:
            try:
                picks.append(int(part))
            except ValueError:
                pass
        if picks:
            _run_selected(picks)
            if interactive and press_enter:
                try:
                    input(t("press_enter"))
                except EOFError:
                    pass


def _api_scan(nums):
    """Runs module numbers and returns structured results (no printing)."""
    out = []
    total = {"WARN": 0, "BUG": 0, "ERR": 0}
    for num in nums:
        if num not in MODULES:
            continue
        finds = []
        run_module(num, lambda lvl, msg: finds.append((lvl, msg)))
        out.append({"num": num, "name": MODULES[num],
                    "findings": [{"lvl": l, "msg": m} for l, m in finds]})
        for l, m in finds:
            if l in total:
                total[l] += 1
    return {"ok": True, "modules": out, "totals": total}


def _api_dispatch(mode, args):
    """"--api" girisi: JSON-ayiklanabilir bir dict dondurur."""
    if mode == "scan":
        nums = []
        for a in args:
            if a == "all":
                nums = sorted(MODULES)
                break
            try:
                nums.append(int(a))
            except ValueError:
                pass
        if not nums:
            nums = sorted(MODULES)
        return _api_scan(nums)
    if mode == "find":
        if not args:
            return {"ok": False, "error": "find KEYWORD [FOLDER]"}
        hits = _collect_find(args[0], args[1] if len(args) > 1 else "")
        return {"ok": True, "keyword": args[0], "total": len(hits), "max": 40,
                "hits": [{"file": p, "line": i, "text": s} for p, i, s in hits]}
    if mode == "modules":
        return {"ok": True,
                "modules": [{"num": n, "name": t("menu_%d" % n).split("]", 1)[-1].strip()}
                            for n in sorted(MODULES)]}
    if mode == "new":
        if len(args) < 2:
            return {"ok": False, "error": "new script|dir PATH"}
        return _perform_new(args[0], args[1])
    if mode == "run":
        return {"ok": False, "error": "run API yok - web panel kendi alt-sureci kullanir"}
    return {"ok": False, "error": "bilinmeyen --api modu: %s" % mode}


def main(argv):
    global LANG
    args = list(argv)
    # --lang tr|en  (from the command line)
    if "--lang" in args:
        i = args.index("--lang")
        if i + 1 < len(args):
            set_lang(args[i + 1])
            del args[i:i + 2]

    # --api scan|find|new  (raw JSON output, used by tools/webpanel)
    api = None
    if "--api" in args:
        i = args.index("--api")
        api = args[i + 1] if i + 1 < len(args) else ""
        del args[i:i + 2]
    if api is not None:
        print(json.dumps(_api_dispatch(api, args), ensure_ascii=False))
        return 0

    # ===== COMMAND-LINE MODE (script/automation) =====
    # e.g.: deep-tool --lang tr 3   /   deep-tool --lang en all
    cli = [a for a in args if a not in ("all",) ]
    cli_nums = []
    for a in args:
        if a == "all":
            cli_nums = sorted(MODULES)
            break
        try:
            cli_nums.append(int(a))
        except ValueError:
            pass
    if cli_nums:
        _print_banner()
        _run_selected(cli_nums)
        return 0

    # ===== SUB-TOOL CLI: find / new / run =====
    if not cli_nums and args:
        sub = args[0].lower()
        if sub in ("find", "new", "run"):
            _print_banner()
            arg1 = args[1] if len(args) > 1 else ""
            arg2 = args[2] if len(args) > 2 else ""
            if sub == "find":
                _do_find(False, arg1, arg2)
            elif sub == "new":
                _do_new(False, arg1, arg2)
            else:
                _do_run(False, arg1)
            return 0

    # ===== INTERACTIVE MODE (language -> main menu -> check) =====
    _print_banner()
    interactive = True
    # Language selection
    try:
        inp = input(t("lang_prompt")).strip().lower()
        set_lang(inp if inp in ("tr", "en") else "tr")
    except EOFError:
        pass

    quitting = False
    while not quitting:
        print()
        print(t("main_menu_title"))
        print(t("main_check"))
        print(t("main_new"))
        print(t("main_find"))
        print(t("main_run"))
        print(t("main_quit"))
        try:
            tool = input(t("main_prompt")).strip().lower()
        except EOFError:
            tool = "q"
        tool = tool.split()[0] if tool.split() else ""
        if tool == "q":
            quitting = True
        elif tool == "check":
            quitting = _check_menu_loop(interactive, press_enter=True)
        elif tool == "find":
            _do_find(interactive)
        elif tool == "new":
            _do_new(interactive)
        elif tool == "run":
            _do_run(interactive)
        elif tool == "":
            continue
        else:
            print(" " + t("main_unknown"))

    print(t("goodbye"))
    try:
        input(t("press_enter"))
    except EOFError:
        pass
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
