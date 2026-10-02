"""
parity_check.py - DerinEngine Python <-> JS motor parite denetimi

Amacı: "JS motoru Python ile aynı denklikte" kuralını KALICI ve OTOMATIK
kılmak. İki tarafı GERÇEKTEN yükleyip kendi API'sini çıkarır (tahmin yok):
  * Python tarafı: ast ile sınıflar / public metotlar / public fonksiyonlar
  * JS tarafı:    Node içinde engine/*.js yüklenir, DE.* nesneleri
                   introspect edilir (prototype + static). game/*.js için
                   DE_GAME.* atamaları tarayıcı/canvas gerektirmeyen bir
                   çözümleyiciyle okunur.

Kullanım:
    python tools/parity_check.py            # rapor + kacis kodu
    python tools/parity_check.py --json     # makine okunur
Çıkış kodu: 0 = parite tam, 1 = en az 1 boşluk.
"""
import argparse
import ast
import json
import os
import subprocess
import sys
import tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PY_ENGINE = os.path.join(ROOT, "deep_engine")
PY_GAME = os.path.join(ROOT, "game")
JS_ROOT = os.path.join(ROOT, "deep_engine_html")
JS_ENGINE = os.path.join(JS_ROOT, "engine")
JS_GAME = os.path.join(JS_ROOT, "game")

# index.html'deki gercek yukleme sirasi (parite icin onemli: moduller birbirine
# bagimli, yanlis sirada yuklenince API eksik gorunur).
ENGINE_ORDER = [
    "core.js", "math2d.js", "render.js", "parallax.js", "physics.js",
    "particles.js", "components.js", "tween.js", "lighting.js", "tilemap.js",
    "levelfile.js", "ui.js", "log.js", "scenemanager.js", "i18n.js",
    "savegame.js", "console.js", "audio.js", "procedural.js", "input.js",
]
GAME_ORDER = [
    "state.js", "entities.js", "bosses.js", "ui.js", "scenes.js",
    "builders.js", "climber.js", "commands.js", "main.js",
]

# JS tarafinda sonek almis isimler (parite takma adlari motor tarafinda tanimli)
ALIASES = {
    "generate": "procedural_generate",
    "pick_biome": "procedural_pick_biome",
    "generate_boss_arena": "procedural_generate_boss_arena",
}

# BILINEN, KASTEN farklar (bosluk degil): gerekce yazili, raporun sonunda
# listelenir. Silmek pariteyi bozar; eklemek gerekceyi gosterir.
KNOWN_EXCEPTIONS = {
    ("game/commands.py", "ensure_dir()"):
        "Python yalnizca disk yazan yardimci; tarayicida localStorage var, dosya yok.",
}

DUMPER = r"""
const fs = require("fs"), path = require("path");
const DIR = process.argv[2];
const ENGINE_ORDER = JSON.parse(process.argv[3]);
const GAME_ORDER = JSON.parse(process.argv[4]);
global.DE = {};
global.DE_GAME = {};
const skip = new Set(["main.js"]);
for (const f of ENGINE_ORDER) {
    const p = path.join(DIR, "engine", f);
    if (!fs.existsSync(p)) { console.error("eksik: " + f); process.exit(2); }
    const code = fs.readFileSync(p, "utf8");
    try {
        new Function("DE", "DE_GAME", "window", "document", "localStorage",
            "AudioContext", "navigator", "performance", code)(
            global.DE, global.DE_GAME, global, undefined, undefined,
            undefined, undefined, undefined, undefined);
    } catch (e) {
        console.error("YUKLEME HATASI engine/" + f + ": " + e.message);
        process.exit(2);
    }
}
function introspect(ns) {
    const classes = {}, consts = [];
    for (const k of Object.keys(ns)) {
        const v = ns[k];
        if (typeof v === "function") {
            const methods = v.prototype
                ? Object.getOwnPropertyNames(v.prototype).filter(n => n !== "constructor")
                : [];
            const statics = Object.getOwnPropertyNames(v).filter(n =>
                !["length", "name", "prototype", "caller", "arguments"].includes(n)
                && n.charAt(0) !== "_");
            classes[k] = methods.concat(statics);
        } else if (v && typeof v === "object") {
            classes[k] = Object.keys(v);
        } else {
            consts.push(k);
        }
    }
    return { classes: classes, consts: consts };
}
// game/*.js tarayici/canvas gerektirir; yalnizca DE_GAME atamalarini cozumle
function scanGame(ns) {
    const classes = {};
    for (const f of GAME_ORDER) {
        if (skip.has(f)) continue;
        const p = path.join(DIR, "game", f);
        if (!fs.existsSync(p)) continue;
        const src = fs.readFileSync(p, "utf8");
        const re = /DE_GAME\.([A-Za-z_][A-Za-z0-9_]*)\s*=\s*class\s+([A-Za-z0-9_]*)/g;
        let m;
        while ((m = re.exec(src)) !== null) {
            const name = m[2] || m[1];
            if (name.charAt(0) === "_") continue;
            let i = src.indexOf("{", m.index), depth = 0, j = i;
            while (j < src.length) {
                if (src[j] === "{") depth++;
                else if (src[j] === "}") { depth--; if (depth === 0) break; }
                j++;
            }
            const body = src.slice(i, j);
            const meths = body.match(/^\s{4}(?:static\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*\(/gm) || [];
            const names = meths.map(s => s.replace(/^\s{4}(static\s+)?/, "")
                .replace(/\s*\($/, "")).filter(n =>
                    !["constructor", "if", "for", "while", "switch", "catch", "return"]
                        .includes(n));
            classes[name] = names;
        }
        const fre = /DE_GAME\.([A-Za-z_][A-Za-z0-9_]*)\s*=\s*function/g;
        while ((m = fre.exec(src)) !== null) {
            if (m[1].charAt(0) === "_") continue;
            classes[m[1]] = [];
        }
        // "DE_GAME.X = X;" deseni: sinif/fonksiyon dosyada YEREL olarak
        // tanimlanip sonra disariya atanir (bosses.js, scenes.js boyle yapar).
        const are = /DE_GAME\.([A-Za-z_][A-Za-z0-9_]*)\s*=\s*([A-Za-z_][A-Za-z0-9_]*)\s*;/g;
        while ((m = are.exec(src)) !== null) {
            const name = m[1], local = m[2];
            if (name.charAt(0) === "_") continue;
            const lc = new RegExp("class\\s+" + local + "\\b[^{]*\\{").exec(src);
            if (lc) {
                let i = src.indexOf("{", lc.index), depth = 0, j = i;
                while (j < src.length) {
                    if (src[j] === "{") depth++;
                    else if (src[j] === "}") { depth--; if (depth === 0) break; }
                    j++;
                }
                const body = src.slice(i, j);
                const meths = body.match(/^\s{4}(?:static\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*\(/gm) || [];
                classes[name] = meths.map(s => s.replace(/^\s{4}(static\s+)?/, "")
                    .replace(/\s*\($/, "")).filter(n =>
                        !["constructor", "if", "for", "while", "switch", "catch", "return"]
                            .includes(n));
            } else if (new RegExp("function\\s+" + local + "\\b").test(src)) {
                classes[name] = [];
            }
        }
    }
    return { classes: classes, consts: [] };
}
const engine = introspect(global.DE);
const game = scanGame(global.DE_GAME);
process.stdout.write(JSON.stringify({ engine: engine, game: game }));
"""


def python_inventory(path):
    """(siniflar{ad:[metotlar]}, public fonksiyonlar)"""
    with open(path, encoding="utf-8") as fh:
        tree = ast.parse(fh.read())
    classes, funcs = {}, set()
    for node in tree.body:
        if isinstance(node, ast.ClassDef):
            meths = set()
            props = set()
            for sub in node.body:
                if not isinstance(sub, (ast.FunctionDef, ast.AsyncFunctionDef)):
                    continue
                if sub.name.startswith("_"):
                    continue
                deco = [getattr(d, "id", "") for d in getattr(sub, "decorator_list", [])]
                if "property" in deco or "cached_property" in deco or \
                        any(d.startswith("set_") and d != "set_name" for d in deco):
                    props.add(sub.name)          # @property -> alan, metot degil
                else:
                    meths.add(sub.name)
            classes[node.name] = {"methods": meths, "props": props}
        elif isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            if not node.name.startswith("_"):
                funcs.add(node.name)
    return classes, funcs


def js_inventory():
    """Node ile JS tarafini gercek yukleyip introspect eder."""
    tmp = tempfile.NamedTemporaryFile("w", suffix=".js", delete=False,
                                     encoding="utf-8")
    tmp.write(DUMPER)
    tmp.close()
    try:
        proc = subprocess.run(
            ["node", tmp.name, JS_ROOT,
             json.dumps(ENGINE_ORDER), json.dumps(GAME_ORDER)],
            capture_output=True, text=True, encoding="utf-8", timeout=120)
        if proc.returncode != 0:
            sys.stderr.write("JS yukleme hatasi:\n" + (proc.stderr or ""))
            raise SystemExit(2)
        return json.loads(proc.stdout)
    except OSError:
        sys.stderr.write("HATA: 'node' bulunamadi. Parite denetimi icin Node.js "
                         "gerekir (JS testleri de ayni sekilde).\n")
        raise SystemExit(2)
    finally:
        os.unlink(tmp.name)


def _norm(names):
    return {n for n in names}


def compare(js_side, py_files, label):
    """js_side: {sinif: [metotlar], ...}  -> boşluk listesi"""
    gaps = []
    for fn in py_files:
        py_path = os.path.join(ROOT, fn)
        if not os.path.exists(py_path):
            continue
        classes, funcs = python_inventory(py_path)
        for cname, info in sorted(classes.items()):
            key = cname if cname in js_side else ALIASES.get(cname)
            if key is None or key not in js_side:
                gaps.append((fn, cname, "SINIF_YOK",
                             "Python sinifi JS tarafinda yok"))
                continue
            jnames = _norm(js_side[key])
            missing = sorted(info["methods"] - jnames - info["props"])
            if missing:
                gaps.append((fn, cname, "METOT_YOK", ", ".join(missing)))
        for fname in sorted(funcs):
            if fname in js_side:
                continue
            alias = ALIASES.get(fname)
            if alias and alias in js_side:
                continue
            if (fn, fname + "()") in KNOWN_EXCEPTIONS:
                continue
            gaps.append((fn, fname + "()", "FONKSIYON_YOK",
                         "Python modul fonksiyonu JS tarafinda yok"))
    return gaps


def main():
    ap = argparse.ArgumentParser(description="Python <-> JS motor parite denetimi")
    ap.add_argument("--json", action="store_true", help="makine okunur cikti")
    args = ap.parse_args()

    if not os.path.isdir(JS_ENGINE):
        sys.stderr.write("HATA: %s bulunamadi\n" % JS_ENGINE)
        return 2
    js = js_inventory()

    engine_files = ["deep_engine/" + f for f in sorted(os.listdir(PY_ENGINE))
                    if f.endswith(".py") and f != "__init__.py"]
    game_files = ["game/" + f for f in sorted(os.listdir(PY_GAME))
                  if f.endswith(".py") and f != "__init__.py"]

    gaps = compare(js["engine"]["classes"], engine_files, "engine")
    gaps += compare(js["game"]["classes"], game_files, "game")

    if args.json:
        print(json.dumps({
            "engine_symbols": len(js["engine"]["classes"]),
            "game_symbols": len(js["game"]["classes"]),
            "gaps": [{"file": g[0], "symbol": g[1], "kind": g[2], "detail": g[3]}
                     for g in gaps],
            "ok": not gaps,
        }, ensure_ascii=False, indent=1))
    else:
        print("=" * 74)
        print("PARITE DENETIMI: Python deep_engine/ + game/  <->  "
              "deep_engine_html/")
        print("=" * 74)
        print("JS motor sembolleri: %d   JS oyun sembolleri: %d"
              % (len(js["engine"]["classes"]), len(js["game"]["classes"])))
        print("Python dosyalari: motor %d, oyun %d"
              % (len(engine_files), len(game_files)))
        print("-" * 74)
        if not gaps:
            print("SONUC: PARITE TAM - Python API'sinin tamami JS tarafinda var.")
        else:
            for f, sym, kind, detail in gaps:
                print("[%s] %s :: %s -> %s" % (kind, f, sym, detail))
            print("-" * 74)
            print("SONUC: %d bosluk var." % len(gaps))
        if KNOWN_EXCEPTIONS:
            print("BILINEN, KASTEN farklar (%d):" % len(KNOWN_EXCEPTIONS))
            for (f, sym), why in sorted(KNOWN_EXCEPTIONS.items()):
                print("  - %s :: %s -> %s" % (f, sym, why))
        print("-" * 74)
    return 0 if not gaps else 1


if __name__ == "__main__":
    raise SystemExit(main())
