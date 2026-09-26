"""webpanel.py — local browser control panel + mini level editor for DerinEngine.

Serves a small HTML page on http://127.0.0.1:8765:
- Editor: a Godot/Unity-style but very simple level editor. Works directly on
  the custom_levels/ folder: every level is a named JSON file. "Farklı Kaydet"
  asks you for the level's name and saves it there. The pristine template
  (custom_levels/default.json) is never overwritten.
- deep-tool: run the project scanner and show its report
- Log: tail motor.log (the engine's runtime log)
- Script: run a short Python snippet and see its output
- Game: launch main.py as a subprocess

Dependencies: only the Python standard library (http.server). No pip packages.
The page is plain HTML/CSS/JS, no external CDN, offline.
IMPORTANT: the file is UTF-8. Never rewrite it through a PowerShell
Get-Content/Set-Content roundtrip (ANSI mangling). Use a UTF-8 editor.
"""

import http.server
import json
import os
import shutil
import subprocess
import sys
import urllib.parse

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
# The game's data folder (same folder the game writes next to the exe).
try:
    from deep_engine import user_data_dir as _udd
    DATA_DIR = _udd()
except Exception:  # noqa: BLE001 - fall back to the project root as before
    DATA_DIR = ROOT
PORT = 8765
PYTHON = sys.executable
# Custom levels folder: every level = one named JSON file. Created on first run.
LEVELS_DIR = os.path.join(DATA_DIR, "custom_levels")
# The pristine template source (shipped with the project, never written over).
TEMPLATE_PATH = os.path.join(ROOT, "custom_level.json")

# Palette: every object type the builders understand. Defaults match builders.py.
TEMPLATES = [
    {"tag": "Ground", "name": "Platform", "w": 200.0, "h": 40.0, "color": [60, 90, 130], "shape": "rect"},
    {"tag": "Breakable", "name": "Breakable", "w": 64.0, "h": 64.0, "color": [150, 110, 60], "hits": 1},
    {"tag": "Coin", "name": "Coin", "w": 24.0, "h": 24.0, "color": [255, 210, 40]},
    {"tag": "Spring", "name": "Spring", "w": 40.0, "h": 20.0, "color": [230, 130, 40], "bounce": 850.0},
    {"tag": "Portal", "name": "Portal", "w": 40.0, "h": 60.0, "color": [70, 70, 90], "next": "victory"},
    {"tag": "Enemy", "name": "Enemy", "w": 48.0, "h": 48.0, "color": [220, 60, 50], "patrol_distance": 90.0,
     "speed": 65.0, "hp": 25},
    {"tag": "Flyer", "name": "Flyer", "w": 48.0, "h": 48.0, "color": [200, 120, 220], "patrol_distance": 160.0,
     "speed": 55.0, "hp": 20},
    {"tag": "Hopper", "name": "Hopper", "w": 48.0, "h": 48.0, "color": [140, 200, 90], "hop_force": 430.0,
     "hop_interval": 1.1, "speed": 40.0, "hp": 22},
    {"tag": "Turret", "name": "Turret", "w": 48.0, "h": 48.0, "color": [80, 80, 120], "fire_interval": 2.0,
     "bullet_speed": 240.0, "bullet_damage": 25, "range": 600.0, "hp": 30},
    {"tag": "SniperEnemy", "name": "SniperEnemy", "w": 40.0, "h": 40.0, "color": [120, 200, 90],
     "fire_interval": 2.8, "hp": 30},
    {"tag": "Spikes", "name": "Spikes", "w": 48.0, "h": 24.0, "color": [190, 190, 200]},
    {"tag": "PowerUp", "name": "PowerUp", "w": 32.0, "h": 32.0, "color": [90, 200, 255], "power_type": "magnet",
     "duration": 8.0},
    {"tag": "Player", "name": "Player", "w": 32.0, "h": 32.0, "color": [255, 120, 60]},
    {"tag": "Boss", "name": "Boss", "w": 80.0, "h": 80.0, "color": [200, 40, 200], "hp": 100,
     "boss_type": "archer", "patrol_distance": 160.0, "speed": 65.0},
]

# Field schemas per tag: what the property panel offers.
# Entry format: (key, label, type, min, max) — or (key, label, "select", [options]) /
# (key, label, "color") / (key, label, "text") / (key, label, "bool").
FIELD_SCHEMAS = {
    "Ground": [("w", "Genişlik", "num", 1, 4000), ("h", "Yükseklik", "num", 1, 1000),
               ("color", "Renk", "color"), ("one_way", "Tek yönlü platform", "bool")],
    "Breakable": [("hits", "Kırılmak için darbe", "int", 1, 50), ("trigger", "Trigger", "bool")],
    "Coin": [("color", "Renk", "color")],
    "Spring": [("bounce", "Fırlatma gücü", "int", 100, 3000)],
    "Portal": [("next", "Sonraki sahne", "text")],
    "Enemy": [("patrol_distance", "Devriye mesafesi", "int", 0, 2000), ("speed", "Hız", "int", 1, 500),
              ("hp", "Can", "int", 1, 999)],
    "Flyer": [("patrol_distance", "Devriye mesafesi", "int", 0, 2000), ("speed", "Hız", "int", 1, 500),
              ("hp", "Can", "int", 1, 999)],
    "Hopper": [("hop_force", "Zıplama gücü", "int", 100, 2000), ("hop_interval", "Zıplama aralığı", "num", 0.2, 5),
               ("speed", "Hız", "int", 1, 500), ("hp", "Can", "int", 1, 999)],
    "Turret": [("fire_interval", "Ateş aralığı", "num", 0.3, 10), ("bullet_speed", "Mermi hızı", "int", 50, 1000),
               ("bullet_damage", "Mermi hasarı", "int", 1, 200), ("range", "Menzil", "int", 50, 2000),
               ("hp", "Can", "int", 1, 999)],
    "SniperEnemy": [("fire_interval", "Ateş aralığı", "num", 0.3, 10), ("hp", "Can", "int", 1, 999)],
    "Spikes": [],
    "PowerUp": [("power_type", "Güç tipi", "select", ["magnet", "triple", "shield", "speed", "slow"]),
                ("duration", "Süre (sn)", "num", 1, 60)],
    "Player": [],
    "Boss": [("hp", "Can", "int", 1, 3000), ("boss_type", "Boss tipi", "select",
             ["archer", "flying", "sniper", "shield", "cosmic"]),
             ("patrol_distance", "Devriye mesafesi", "int", 0, 2000), ("speed", "Hız", "int", 1, 500)],
}

THEMES = ["none", "forest", "lava", "cave", "ice", "desert", "astro"]
GRID = 8  # pixels per grid unit


def _run(cmd, cwd=ROOT, timeout=60):
    """Run a subprocess and return (stdout, stderr, returncode)."""
    try:
        proc = subprocess.run(
            cmd,
            cwd=cwd,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=timeout,
        )
        return proc.stdout, proc.stderr, proc.returncode
    except subprocess.TimeoutExpired:
        return "", "TIMEOUT after %ds" % timeout, 124
    except Exception as e:  # noqa: BLE001 - surface any local error in the panel
        return "", "ERROR: %r" % (e,), 1


def _tail_log(n=200):
    log_path = os.path.join(ROOT, "motor.log")
    if not os.path.exists(log_path):
        return "(motor.log yok - oyun hiç çalışmadı ya da yeni başlatıldı)"
    with open(log_path, "r", encoding="utf-8", errors="replace") as f:
        lines = f.readlines()
    return "".join(lines[-n:])


def _ensure_levels_dir():
    """Creates custom_levels/ and copies the pristine template to default.json."""
    if not os.path.isdir(LEVELS_DIR):
        try:
            os.makedirs(LEVELS_DIR, exist_ok=True)
        except Exception:  # noqa: BLE001
            pass
    default_path = os.path.join(LEVELS_DIR, "default.json")
    if os.path.exists(default_path):
        return
    if os.path.exists(TEMPLATE_PATH):
        try:
            shutil.copyfile(TEMPLATE_PATH, default_path)
            return
        except Exception:  # noqa: BLE001
            pass
    # Fallback: a small blank level.
    try:
        with open(default_path, "w", encoding="utf-8") as f:
            json.dump({"meta": {"name": "Custom Level", "background_color": [16, 24, 34],
                                "parallax_theme": "forest", "format": "derinengine-level",
                                "version": 1}, "objects": []}, f, ensure_ascii=False, indent=2)
    except Exception:  # noqa: BLE001
        pass


def _safe_name(name):
    """Validates a custom-level file name and returns "<name>.json" or None."""
    name = (name or "").strip().rsplit(".json", 1)[0].strip()
    if not name:
        return None
    if any(ch in name for ch in "/\\") or name in (".", ".."):
        return None
    return name + ".json"


def _list_levels():
    """Returns the sorted *.json level names inside custom_levels/."""
    _ensure_levels_dir()
    if not os.path.isdir(LEVELS_DIR):
        return []
    return sorted(n for n in os.listdir(LEVELS_DIR) if n.lower().endswith(".json"))


def _load_level(name=None):
    """Loads a named level from custom_levels/ (default: default.json)."""
    _ensure_levels_dir()
    if name is None:
        name = "default.json"
    safe = _safe_name(name) or "default.json"
    path = os.path.join(LEVELS_DIR, safe)
    if os.path.exists(path):
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        data["_name"] = safe
        return data
    return {"meta": {"name": "Custom Level", "background_color": [16, 24, 34],
                     "parallax_theme": "forest", "format": "derinengine-level", "version": 1},
            "objects": [], "_name": "default.json"}


def _reset_level():
    """Restores the pristine template into the editor (default.json is never written)."""
    return {"ok": True, "level": _load_level("default.json")}


def _save_level(data, name=None):
    """Saves the level into custom_levels/<name>.json (default: a new named file)."""
    if not data.get("objects") or not data.get("meta"):
        return {"ok": False, "error": "meta/objects eksik"}
    _ensure_levels_dir()
    target = _safe_name(name)
    if target is None or target == "default.json":
        return {"ok": False, "error": "Lutfen bir dosya adi yaz (default.json korunur)"}
    path = os.path.join(LEVELS_DIR, target)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    return {"ok": True, "name": target}


PAGE = r"""<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>DerinEngine Panel</title>
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body { font-family: system-ui, Segoe UI, sans-serif; background: #111318; color: #e8e8e8; margin: 0; padding: 16px; }
  h1 { font-size: 18px; margin: 0 0 12px; }
  h1 small { color: #888; font-weight: normal; }
  .tabs { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 12px; }
  .tab { padding: 8px 14px; border-radius: 8px; background: #1d2129; cursor: pointer; border: 1px solid #2c313c; }
  .tab.active { background: #3b6ef0; border-color: #3b6ef0; }
  .panel { display: none; }
  .panel.active { display: block; }
  pre { background: #0b0d11; border: 1px solid #2c313c; border-radius: 8px; padding: 12px; min-height: 200px; max-height: 70vh; overflow: auto; font-size: 12px; line-height: 1.45; white-space: pre-wrap; color: #cfd6e6; }
  button { background: #3b6ef0; color: #fff; border: none; padding: 8px 14px; border-radius: 8px; cursor: pointer; font-size: 14px; }
  button.secondary { background: #2c313c; }
  button.run { background: #2da44e; }
  button.danger { background: #b3362c; }
  textarea { width: 100%; background: #0b0d11; border: 1px solid #2c313c; color: #dfe6f2; border-radius: 8px; padding: 10px; font-family: Consolas, monospace; font-size: 13px; min-height: 120px; }
  .row { display: flex; gap: 8px; align-items: center; margin-bottom: 8px; }
  .status { color: #9aa4b5; font-size: 12px; }
  .ok { color: #2da44e; } .err { color: #f47067; }

  /* ---- editor layout ---- */
  .ed-wrap { display: flex; gap: 12px; align-items: flex-start; }
  .ed-left { width: 140px; flex-shrink: 0; }
  .ed-center { flex: 1; min-width: 0; }
  .ed-right { width: 220px; flex-shrink: 0; }
  .ed-panel { background: #181c24; border: 1px solid #2c313c; border-radius: 10px; padding: 10px; }
  .ed-panel h3 { margin: 0 0 8px; font-size: 13px; color: #9aa4b5; text-transform: uppercase; letter-spacing: .5px; }
  .tool-btn { display: block; width: 100%; text-align: left; margin-bottom: 4px; padding: 6px 8px; background: #20242e; border: 1px solid #2c313c; border-radius: 6px; font-size: 13px; color: #dfe6f2; cursor: pointer; }
  .tool-btn:hover { border-color: #3b6ef0; }
  .tool-btn.active { background: #3b6ef0; border-color: #3b6ef0; }
  .tool-dot { display: inline-block; width: 10px; height: 10px; border-radius: 3px; margin-right: 6px; vertical-align: middle; }
  canvas { background: #0b0d11; border: 1px solid #2c313c; border-radius: 10px; width: 100%; height: 560px; cursor: crosshair; display: block; touch-action: none; }
  .prop { margin-bottom: 8px; }
  .prop label { display: block; font-size: 12px; color: #9aa4b5; margin-bottom: 2px; }
  .prop input, .prop select { width: 100%; background: #0b0d11; border: 1px solid #2c313c; color: #dfe6f2; border-radius: 6px; padding: 5px 8px; font-size: 13px; }
  .prop input[type=color] { height: 30px; padding: 2px; }
  .ed-bar { display: flex; gap: 8px; align-items: center; margin-bottom: 8px; flex-wrap: wrap; }
  .hint { font-size: 12px; color: #7d8699; margin-top: 6px; line-height: 1.5; }
  .objlist { max-height: 300px; overflow: auto; }
  .objitem { padding: 5px 8px; border-radius: 6px; cursor: pointer; font-size: 12px; color: #cfd6e6; }
  .objitem:hover { background: #20242e; }
  .objitem.active { background: #3b6ef0; }
  .objitem span { color: #7d8699; font-size: 11px; }
</style>
</head>
<body>
<h1>DerinEngine Panel <small>127.0.0.1:%PORT%</small></h1>
<div class="tabs">
  <div class="tab active" data-tab="editor">Editör</div>
  <div class="tab" data-tab="scan">deep-tool</div>
  <div class="tab" data-tab="log">motor.log</div>
  <div class="tab" data-tab="script">Kod</div>
  <div class="tab" data-tab="game">Oyun</div>
</div>

<!-- ============ EDITOR ============ -->
<div class="panel active" id="editor">
  <div class="ed-bar">
    <span class="status" style="margin-right:4px">Seviye:</span>
    <select id="levelSelect" onchange="openLevel(this.value)" style="background:#0b0d11;border:1px solid #2c313c;color:#dfe6f2;border-radius:8px;padding:8px"></select>
    <button class="run" onclick="saveLevelAs()">Farklı Kaydet…</button>
    <button class="secondary" onclick="loadLevel()">Yeniden Yükle</button>
    <button class="secondary" onclick="resetLevel()">Şablona Sıfırla</button>
    <button class="danger" onclick="deleteLevel()">Seviyeyi Sil</button>
    <span class="status" id="edStatus"></span>
  </div>
  <div class="hint" style="margin-bottom:8px">Editör <b>custom_levels/</b> klasöründe çalışır: her seviye ayrı isimli bir dosyadır.
    <b>Farklı Kaydet</b> senin isim vermeni ister (örn. <i>benim_bolum.json</i>). <b>default.json</b> hep sabit duran
    "sıfır şablon"dur, asla ezilmez.</div>
  <div class="ed-wrap">
    <div class="ed-left ed-panel">
      <h3>Nesneler</h3>
      <div id="palette"></div>
    </div>
    <div class="ed-center">
      <canvas id="cv" width="1280" height="560"></canvas>
      <div class="hint">Tıkla = nesne yerleştir, sürükle = taşı, seçili nesnede köşelerden = boyut,
      teker = yakınlaş (imleç üzerinde), ok tuşları = gez, boşluğa tıkla = seçimi bırak.
      Izgara %GRID% px.</div>
    </div>
    <div class="ed-right">
      <div class="ed-panel" style="margin-bottom:10px">
        <h3>Özellikler</h3>
        <div id="props">Bir nesne seç.</div>
      </div>
      <div class="ed-panel">
        <h3>Seviye (meta)</h3>
        <div class="prop"><label>Ad</label><input id="metaName" type="text"></div>
        <div class="prop"><label>Arka plan rengi</label><input id="metaBg" type="color" value="#101822"></div>
        <div class="prop"><label>Parallax teması</label><select id="metaTheme"></select></div>
        <div class="prop"><label>Izgara duyarlılığı</label><select id="metaGrid">
          <option value="4">4 px</option><option value="8" selected>8 px</option>
          <option value="16">16 px</option><option value="32">32 px</option></select></div>
      </div>
    </div>
  </div>
  <div class="ed-panel objlist" style="margin-top:10px">
    <h3>Nesne listesi</h3>
    <div id="objlist"></div>
  </div>
</div>

<!-- ============ SCAN ============ -->
<div class="panel" id="scan">
  <div class="row">
    <select id="scanLang"><option value="tr">Türkçe</option><option value="en">English</option></select>
    <input id="scanArgs" placeholder="modül (boş = all)" size="12" style="background:#0b0d11;border:1px solid #2c313c;color:#dfe6f2;border-radius:8px;padding:8px">
    <button class="run" onclick="runScan()">Tarama yap</button>
    <span class="status" id="scanStatus"></span>
  </div>
  <pre id="scanOut">Tarama henüz çalışmadı.</pre>
</div>

<div class="panel" id="log">
  <div class="row">
    <button class="secondary" onclick="loadLog()">Yenile</button>
    <span class="status">motor.log son 200 satır</span>
  </div>
  <pre id="logOut">Yükleniyor...</pre>
</div>

<div class="panel" id="script">
  <div class="row"><span class="status">Kısa bir Python komutu koş - çıktıyı burada gör.</span></div>
  <textarea id="scriptSrc">import deep_engine
print("DerinEngine", deep_engine.__version__)</textarea>
  <div class="row" style="margin-top:8px">
    <button class="run" onclick="runScript()">Çalıştır</button>
    <span class="status" id="scriptStatus"></span>
  </div>
  <pre id="scriptOut"></pre>
</div>

<div class="panel" id="game">
  <div class="row">
    <button class="run" onclick="launchGame()">main.py başlat</button>
    <span class="status">Oyun ayrı bir pencere/pygame olarak açılır.</span>
  </div>
  <pre id="gameOut"></pre>
</div>

<!-- Save As dialog: names the current level and saves into custom_levels/ -->
<div id="saveAsModal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:50;align-items:center;justify-content:center">
  <div class="ed-panel" style="width:380px">
    <h3>Farklı Kaydet (custom_levels/)</h3>
    <div class="prop"><label>Seviye adı (uzantısız, örn: benim_bolum)</label>
      <input id="saveAsName" type="text" placeholder="benim_bolum"></div>
    <div class="hint">Kaydedilir: <b>custom_levels/<span id="saveAsPreview">benim_bolum</span>.json</b><br>
      Aynı isimde seviye varsa üzerine yazılır. default.json korunur.</div>
    <div style="display:flex;gap:8px">
      <button class="run" onclick="doSaveAs()">Kaydet</button>
      <button class="secondary" onclick="closeSaveAs()">Vazgeç</button>
    </div>
  </div>
</div>

<script>
/* ---------- shared state ---------- */
let level = null;       // {meta, objects}
let sel = -1;           // index of selected object, -1 = none
let currentTool = null; // template object to place
let gridSize = 8;
// camera offset in world px (origin at top-left of the canvas view)
let camX = 0, camY = 0, zoom = 1;
const GRID = %GRID%;
const TEMPLATES = %TEMPLATES%;
const SCHEMAS = %SCHEMAS%;
const THEMES = %THEMES%;

const tabs = document.querySelectorAll('.tab');
tabs.forEach(t => t.onclick = () => {
  tabs.forEach(x => x.classList.remove('active'));
  document.querySelectorAll('.panel').forEach(x => x.classList.remove('active'));
  t.classList.add('active');
  document.getElementById(t.dataset.tab).classList.add('active');
  if (t.dataset.tab === 'editor') draw();
});

/* ---------- palette ---------- */
function buildPalette() {
  const pal = document.getElementById('palette');
  pal.innerHTML = '';
  TEMPLATES.forEach((tpl) => {
    const b = document.createElement('button');
    b.className = 'tool-btn';
    const c = tpl.color || [200,200,200];
    b.innerHTML = '<span class="tool-dot" style="background:rgb(' + c.join(',') + ')"></span>' + tpl.name;
    b.onclick = () => {
      document.querySelectorAll('.tool-btn').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      currentTool = JSON.parse(JSON.stringify(tpl));
      sel = -1; updateProps(); updateList();
      draw();
    };
    pal.appendChild(b);
  });
}

/* ---------- object helpers ---------- */
function colorOf(o) { return o.color && o.color.length === 3 ? o.color : [180, 180, 190]; }
function rgbStr(c) { return 'rgb(' + Math.round(c[0]) + ',' + Math.round(c[1]) + ',' + Math.round(c[2]) + ')'; }
function snap(v) { return Math.round(v / gridSize) * gridSize; }
function keyOf(o) { return (o.tag || '') + ':' + (o.name || ''); }

/* ---------- rendering ---------- */
const cv = document.getElementById('cv');
const ctx = cv.getContext('2d');

function draw() {
  ctx.fillStyle = rgbStr(level.meta.background_color || [16,24,34]);
  ctx.fillRect(0, 0, cv.width, cv.height);
  // grid
  ctx.strokeStyle = 'rgba(255,255,255,0.06)';
  ctx.lineWidth = 1;
  const step = gridSize * zoom;
  for (let gx = ((camX % gridSize) * zoom); gx < cv.width; gx += step) {
    ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, cv.height); ctx.stroke();
  }
  for (let gy = ((camY % gridSize) * zoom); gy < cv.height; gy += step) {
    ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(cv.width, gy); ctx.stroke();
  }
  // world -> screen
  const sx = o => (o.x - camX) * zoom;
  const sy = o => (o.y - camY) * zoom;
  level.objects.forEach((o, i) => {
    const x = sx(o), y = sy(o), w = o.w * zoom, h = o.h * zoom;
    if (x + w < 0 || y + h < 0 || x > cv.width || y > cv.height) return;
    ctx.fillStyle = rgbStr(colorOf(o));
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = i === sel ? '#ffffff' : 'rgba(0,0,0,0.5)';
    ctx.lineWidth = i === sel ? 2 : 1;
    ctx.strokeRect(x, y, w, h);
    // label
    ctx.fillStyle = i === sel ? '#fff' : 'rgba(255,255,255,0.55)';
    ctx.font = '11px system-ui';
    ctx.fillText(o.name || o.tag, x + 3, y + 12);
    // selection handles
    if (i === sel) {
      ctx.fillStyle = '#fff';
      const hs = 5, pts = [[x,y],[x+w/2,y],[x+w,y],[x,y+h/2],[x+w,y+h/2],[x,y+h],[x+w/2,y+h],[x+w,y+h]];
      pts.forEach(p => { ctx.fillRect(p[0]-hs/2, p[1]-hs/2, hs, hs); });
    }
  });
}

/* ---------- mouse interaction ---------- */
let drag = null; // {mode:'move'|'resize'|'place', index, dx, dy, w, h, corner}
function evtPos(e) {
  const r = cv.getBoundingClientRect();
  const x = (e.clientX - r.left) * (cv.width / r.width);
  const y = (e.clientY - r.top) * (cv.height / r.height);
  return { wx: camX + x / zoom, wy: camY + y / zoom, sx: x, sy: y };
}
function hitIndex(wx, wy) {
  for (let i = level.objects.length - 1; i >= 0; i--) {
    const o = level.objects[i];
    if (wx >= o.x && wx <= o.x + o.w && wy >= o.y && wy <= o.y + o.h) return i;
  }
  return -1;
}
function cornerAt(wx, wy, o) {
  const tol = 6 / zoom;
  const c = o.x + o.w, r = o.y + o.h;
  const near = (a, b) => Math.abs(wx - a) < tol && Math.abs(wy - b) < tol;
  if (near(o.x, o.y)) return 'nw';
  if (near(c, o.y)) return 'ne';
  if (near(o.x, r)) return 'sw';
  if (near(c, r)) return 'se';
  return null;
}

cv.addEventListener('mousedown', e => {
  e.preventDefault();
  const p = evtPos(e);
  if (e.button === 1) { return; } // middle = reserved
  if (sel >= 0 && sel < level.objects.length) {
    const o = level.objects[sel];
    const corner = cornerAt(p.wx, p.wy, o);
    if (corner) {
      drag = { mode: 'resize', index: sel, corner, ox: o.x, oy: o.y, ow: o.w, oh: o.h };
      draw(); return;
    }
  }
  const i = hitIndex(p.wx, p.wy);
  if (i >= 0) {
    const o = level.objects[i];
    sel = i;
    drag = { mode: 'move', index: i, dx: p.wx - o.x, dy: p.wy - o.y };
    updateProps(); updateList();
  } else if (currentTool) {
    // place a new object snapped to grid
    const t = JSON.parse(JSON.stringify(currentTool));
    t.x = snap(p.wx);
    t.y = snap(p.wy);
    level.objects.push(t);
    sel = level.objects.length - 1;
    drag = { mode: 'place', index: sel };
    updateProps(); updateList();
  } else {
    sel = -1; updateProps(); updateList();
  }
  draw();
});
cv.addEventListener('mousemove', e => {
  const p = evtPos(e);
  if (drag) {
    if (drag.mode === 'move' || drag.mode === 'place') {
      const o = level.objects[drag.index];
      o.x = snap(p.wx - drag.dx);
      o.y = snap(p.wy - drag.dy);
    } else if (drag.mode === 'resize') {
      const o = level.objects[drag.index];
      let x1 = drag.ox, y1 = drag.oy, x2 = drag.ox + drag.ow, y2 = drag.oy + drag.oh;
      if (drag.corner.includes('w')) x1 = Math.min(p.wx, x2 - 4);
      if (drag.corner.includes('e')) x2 = Math.max(p.wx, x1 + 4);
      if (drag.corner.includes('n')) y1 = Math.min(p.wy, y2 - 4);
      if (drag.corner.includes('s')) y2 = Math.max(p.wy, y1 + 4);
      o.x = snap(x1); o.y = snap(y1); o.w = snap(x2) - o.x; o.h = snap(y2) - o.y;
      if (o.w < 4) o.w = 4; if (o.h < 4) o.h = 4;
    }
    updateProps(); draw();
  }
});
window.addEventListener('mouseup', () => { if (drag) updateProps(); drag = null; draw(); });
cv.addEventListener('wheel', e => {
  e.preventDefault();
  const p = evtPos(e);
  const f = e.deltaY < 0 ? 1.12 : 0.893;
  const nz = Math.min(3, Math.max(0.25, zoom * f));
  camX = p.wx - (p.sx / nz);
  camY = p.wy - (p.sy / nz);
  zoom = nz;
  draw();
}, { passive: false });
// canvas pan via arrow keys
document.addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') return;
  const mv = 40 / zoom;
  if (e.key === 'ArrowRight') camX += mv;
  else if (e.key === 'ArrowLeft') camX -= mv;
  else if (e.key === 'ArrowDown') camY += mv;
  else if (e.key === 'ArrowUp') camY -= mv;
  else if (e.key === 'Delete') { deleteSelected(); }
  else return;
  draw();
});

/* ---------- property panel ---------- */
function updateProps() {
  const box = document.getElementById('props');
  if (sel < 0 || !level.objects[sel]) { box.innerHTML = 'Bir nesne seç.'; return; }
  const o = level.objects[sel];
  const key = keyOf(o);
  const schema = SCHEMAS[key] || SCHEMAS[o.tag] || [];
  let html = '<div class="prop"><label>Tip</label><input value="' + (o.name || o.tag) + '" disabled></div>';
  html += '<div class="prop"><label>X</label><input type="number" value="' + o.x + '" onchange="setNum(' + sel + ',\'x\',this.value)"></div>';
  html += '<div class="prop"><label>Y</label><input type="number" value="' + o.y + '" onchange="setNum(' + sel + ',\'y\',this.value)"></div>';
  html += '<div class="prop"><label>Genişlik W</label><input type="number" value="' + o.w + '" onchange="setNum(' + sel + ',\'w\',this.value)"></div>';
  html += '<div class="prop"><label>Yükseklik H</label><input type="number" value="' + o.h + '" onchange="setNum(' + sel + ',\'h\',this.value)"></div>';
  if (key === 'Player:Player') {
    html += '<p class="hint">Tek Player olmalı: oyuncunun doğduğu yer (x, y). Eğer hiç yoksa oyun başlarken hata verir.</p>';
  }
  schema.forEach(f => {
    const [name, label, type, extra] = f;
    if (type === 'bool') {
      html += '<div class="prop"><label>' + label + '</label><select onchange="setVal(' + sel + ',\'' + name + '\',this.value === \'true\')"><option value="false"' + (o[name] ? '' : ' selected') + '>Kapalı</option><option value="true"' + (o[name] ? ' selected' : '') + '>Açık</option></select></div>';
    } else if (type === 'select') {
      html += '<div class="prop"><label>' + label + '</label><select onchange="setVal(' + sel + ',\'' + name + '\',this.value)">';
      extra.forEach(v => { html += '<option value="' + v + '"' + (o[name] === v ? ' selected' : '') + '>' + v + '</option>'; });
      html += '</select></div>';
    } else if (type === 'text') {
      html += '<div class="prop"><label>' + label + '</label><input value="' + (o[name] || '') + '" onchange="setVal(' + sel + ',\'' + name + '\',this.value)"></div>';
    } else if (type === 'num' || type === 'int') {
      const step = type === 'num' ? '0.1' : '1';
      const mn = typeof extra === 'number' ? ' min="' + extra + '"' : '';
      html += '<div class="prop"><label>' + label + '</label><input type="number" step="' + step + '"' + mn + ' value="' + (o[name] ?? '') + '" onchange="setNum(' + sel + ',\'' + name + '\',this.value)"></div>';
    } else if (type === 'color') {
      const c = colorOf(o);
      const hex = '#' + c.map(v => (Math.round(v).toString(16)).padStart(2, '0')).join('');
      html += '<div class="prop"><label>' + label + '</label><input type="color" value="' + hex + '" onchange="setColor(' + sel + ',this.value)"></div>';
    }
  });
  box.innerHTML = html;
}
window.setNum = (i, k, v) => { const n = parseFloat(v); if (!isNaN(n)) { level.objects[i][k] = n; draw(); } };
window.setVal = (i, k, v) => { level.objects[i][k] = v; draw(); };
window.setColor = (i, hex) => {
  const m = hex.match(/[a-f0-9]{2}/ig);
  level.objects[i].color = m.map(x => parseInt(x, 16));
  draw();
};
function deleteSelected() {
  if (sel >= 0 && sel < level.objects.length) {
    level.objects.splice(sel, 1);
    sel = -1;
    updateProps(); updateList(); draw();
    document.getElementById('edStatus').innerHTML = '<span class="ok">Nesne silindi.</span>';
  }
}

/* ---------- object list ---------- */
function updateList() {
  const box = document.getElementById('objlist');
  box.innerHTML = '';
  level.objects.forEach((o, i) => {
    const d = document.createElement('div');
    d.className = 'objitem' + (i === sel ? ' active' : '');
    d.innerHTML = (o.name || o.tag) + '<span> @ ' + Math.round(o.x) + ',' + Math.round(o.y) + '</span>';
    d.onclick = () => { sel = i; updateProps(); updateList(); draw(); };
    box.appendChild(d);
  });
}

/* ---------- meta ---------- */
function metaToControls() {
  document.getElementById('metaName').value = level.meta.name || '';
  const bg = level.meta.background_color || [16,24,34];
  document.getElementById('metaBg').value = '#' + bg.map(v => (Math.round(v).toString(16)).padStart(2, '0')).join('');
  const selTheme = document.getElementById('metaTheme');
  selTheme.innerHTML = '';
  THEMES.forEach(t => {
    const op = document.createElement('option');
    op.value = t; op.textContent = t;
    if ((level.meta.parallax_theme || 'none') === t) op.selected = true;
    selTheme.appendChild(op);
  });
}
function controlsToMeta() {
  if (!level) return;
  level.meta.name = document.getElementById('metaName').value || 'Custom Level';
  const hex = document.getElementById('metaBg').value.replace('#', '');
  level.meta.background_color = [parseInt(hex.slice(0,2),16), parseInt(hex.slice(2,4),16), parseInt(hex.slice(4,6),16)];
  level.meta.parallax_theme = document.getElementById('metaTheme').value;
}
document.getElementById('metaName').addEventListener('change', () => { controlsToMeta(); });
document.getElementById('metaBg').addEventListener('change', () => { controlsToMeta(); draw(); });
document.getElementById('metaTheme').addEventListener('change', () => { controlsToMeta(); draw(); });
document.getElementById('metaGrid').addEventListener('change', e => { gridSize = parseInt(e.target.value, 10); camX = Math.round(camX / gridSize) * gridSize; camY = Math.round(camY / gridSize) * gridSize; draw(); });

/* ---------- load / save ---------- */
function refreshLevelSelect(levels, keep) {
  const sel = document.getElementById('levelSelect');
  sel.innerHTML = '';
  (levels || []).forEach(n => {
    const op = document.createElement('option');
    op.value = n; op.textContent = n;
    if (n === keep) op.selected = true;
    sel.appendChild(op);
  });
}
function frameView() {
  let maxX = 1200, maxY = 480;
  level.objects.forEach(o => {
    if (o.x + o.w > maxX) maxX = o.x + o.w;
    if (o.y + o.h > maxY) maxY = o.y + o.h;
  });
  zoom = Math.min(cv.width / (maxX + 80), cv.height / (maxY + 80), 1.5);
  zoom = Math.max(0.25, zoom);
  camX = 0; camY = 0;
}
async function loadLevel() {
  const r = await fetch('/api/level');
  const d = await r.json();
  level = d.level;
  gridSize = 8;
  camX = 0; camY = 0; zoom = 1;
  frameView();
  sel = -1;
  refreshLevelSelect(d.levels, (d.level && d.level._name) || 'default.json');
  metaToControls();
  updateProps(); updateList();
  draw();
  document.getElementById('edStatus').textContent = '';
}
async function openLevel(name) {
  if (!name) return;
  const r = await fetch('/api/level?name=' + encodeURIComponent(name));
  const d = await r.json();
  if (!d.ok) { document.getElementById('edStatus').innerHTML = '<span class="err">HATA: ' + (d.error || '') + '</span>'; return; }
  level = d.level;
  refreshLevelSelect(d.levels, name);
  frameView();
  sel = -1;
  metaToControls(); updateProps(); updateList(); draw();
  document.getElementById('edStatus').innerHTML = '<span class="ok">Açıldı: ' + name + '</span>';
}
function saveLevelAs() {
  controlsToMeta();
  level._name = document.getElementById('levelSelect').value;
  document.getElementById('saveAsName').value = (level._name || '').replace(/\.json$/i, '');
  document.getElementById('saveAsModal').style.display = 'flex';
  document.getElementById('saveAsModal').style.alignItems = 'center';
  document.getElementById('saveAsModal').style.justifyContent = 'center';
  updateSavePreview();
  document.getElementById('saveAsName').focus();
}
function updateSavePreview() {
  const v = document.getElementById('saveAsName').value.trim();
  document.getElementById('saveAsPreview').textContent = (v || 'seviye');
}
document.getElementById('saveAsName').addEventListener('input', updateSavePreview);
function closeSaveAs() {
  document.getElementById('saveAsModal').style.display = 'none';
}
async function doSaveAs() {
  const name = document.getElementById('saveAsName').value.trim();
  if (!name) { document.getElementById('edStatus').innerHTML = '<span class="err">İsim boş olamaz.</span>'; return; }
  controlsToMeta();
  const body = JSON.parse(JSON.stringify(level));
  delete body._name;
  const r = await fetch('/api/level/save', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: name, meta: body.meta, objects: body.objects })
  });
  const d = await r.json();
  closeSaveAs();
  if (!d.ok) { document.getElementById('edStatus').innerHTML = '<span class="err">HATA: ' + (d.error || '') + '</span>'; return; }
  const lv = await (await fetch('/api/level?name=' + encodeURIComponent(d.name))).json();
  refreshLevelSelect(lv.levels, d.name);
  document.getElementById('edStatus').innerHTML = '<span class="ok">Kaydedildi: custom_levels/' + d.name + '</span>';
}
async function resetLevel() {
  const d = await postJson('/api/level/reset', {});
  if (!d.ok) { document.getElementById('edStatus').innerHTML = '<span class="err">' + (d.error || 'hata') + '</span>'; return; }
  level = d.level;
  refreshLevelSelect(d.levels || [], 'default.json');
  sel = -1;
  gridSize = 8; camX = 0; camY = 0; zoom = 1;
  frameView();
  metaToControls(); updateProps(); updateList(); draw();
  document.getElementById('edStatus').innerHTML = '<span class="ok">Şablon (default.json) editöre yüklendi — kaydetmedikçe diskte bir şey değişmez.</span>';
}
async function deleteLevel() {
  const cur = document.getElementById('levelSelect').value;
  if (!cur) { document.getElementById('edStatus').innerHTML = '<span class="err">Seviye seçili değil.</span>'; return; }
  if (cur === 'default.json') { document.getElementById('edStatus').innerHTML = '<span class="err">default.json şablonu silinemez.</span>'; return; }
  if (!confirm('"' + cur + '" seviyesini sil? İşlem geri alınamaz.')) return;
  const d = await postJson('/api/level/delete', { name: cur });
  document.getElementById('edStatus').innerHTML = d.ok ? '<span class="ok">Silindi: ' + cur + '</span>' : '<span class="err">' + (d.error || 'hata') + '</span>';
  loadLevel();
}

/* ---------- scan / log / script / game ---------- */
async function postJson(url, body) {
  const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  return r.json();
}
let scanId = 0;
async function runScan() {
  const out = document.getElementById('scanOut');
  const st = document.getElementById('scanStatus');
  const my = ++scanId;
  out.textContent = 'Tarama sürüyor...';
  st.textContent = '';
  const d = await postJson('/api/scan', { lang: document.getElementById('scanLang').value, args: document.getElementById('scanArgs').value });
  if (my !== scanId) return;
  out.textContent = d.stdout || d.stderr || '(çıktı yok)';
  st.innerHTML = d.ok ? '<span class="ok">tamamlandı</span>' : '<span class="err">hata</span>';
}
async function loadLog() {
  const out = document.getElementById('logOut');
  const d = await (await fetch('/api/log')).json();
  out.textContent = d.log;
}
async function runScript() {
  const out = document.getElementById('scriptOut');
  const st = document.getElementById('scriptStatus');
  const src = document.getElementById('scriptSrc').value;
  out.textContent = 'Çalışıyor...';
  st.textContent = '';
  const d = await postJson('/api/script', { src });
  out.textContent = (d.stdout || '') + (d.stderr ? '\n[stderr]\n' + d.stderr : '') || '(çıktı yok)';
  st.innerHTML = d.ok ? '<span class="ok">bitti (kod ' + d.code + ')</span>' : '<span class="err">hata kod ' + d.code + '</span>';
}
let gameId = 0;
async function launchGame() {
  const out = document.getElementById('gameOut');
  const my = ++gameId;
  out.textContent = 'main.py başlatılıyor... (konsol çıktısı)';
  const d = await postJson('/api/launch', {});
  if (my !== gameId) return;
  out.textContent = (d.stdout || '') + (d.stderr ? '\n[stderr]\n' + d.stderr : '') || '(konsol çıktısı yok)';
}

/* ---------- boot ---------- */
buildPalette();
loadLevel();
</script>
</body>
</html>
"""


class Handler(http.server.BaseHTTPRequestHandler):
    def _send(self, code, body, ctype="text/html; charset=utf-8"):
        data = body.encode("utf-8") if isinstance(body, str) else body
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(data)

    def _send_json(self, code, obj):
        self._send(code, json.dumps(obj, ensure_ascii=False), "application/json")

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == "/":
            page = (PAGE.replace("%PORT%", str(PORT))
                       .replace("%TEMPLATES%", json.dumps(TEMPLATES, ensure_ascii=True))
                       .replace("%SCHEMAS%", json.dumps(FIELD_SCHEMAS, ensure_ascii=True))
                       .replace("%THEMES%", json.dumps(THEMES))
                       .replace("%GRID%", str(GRID)))
            self._send(200, page)
        elif parsed.path == "/api/level":
            # Optional ?name=<level>.json — defaults to default.json
            qs = urllib.parse.parse_qs(parsed.query)
            name = qs.get("name", [None])[0]
            self._send_json(200, {"ok": True, "level": _load_level(name), "levels": _list_levels()})
        elif parsed.path == "/api/levels":
            self._send_json(200, {"ok": True, "levels": _list_levels()})
        elif parsed.path == "/api/log":
            self._send_json(200, {"log": _tail_log()})
        else:
            self._send_json(404, {"ok": False, "error": "not found"})

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        length = int(self.headers.get("Content-Length", 0))
        raw = self.rfile.read(length) if length else b"{}"
        try:
            body = json.loads(raw.decode("utf-8"))
        except Exception:
            body = {}
        if parsed.path == "/api/level/save":
            try:
                result = _save_level(body, body.get("name"))
                code = 200 if result.get("ok") else 400
                self._send_json(code, result)
            except Exception as e:  # noqa: BLE001
                self._send_json(500, {"ok": False, "error": repr(e)})
        elif parsed.path == "/api/level/reset":
            try:
                self._send_json(200, _reset_level())
            except Exception as e:  # noqa: BLE001
                self._send_json(500, {"ok": False, "error": repr(e)})
        elif parsed.path == "/api/level/delete":
            try:
                target = _safe_name(body.get("name"))
                if target is None:
                    self._send_json(400, {"ok": False, "error": "gecersiz ad"})
                    return
                if target == "default.json":
                    self._send_json(400, {"ok": False, "error": "default.json silinemez"})
                    return
                path = os.path.join(LEVELS_DIR, target)
                if os.path.exists(path):
                    os.remove(path)
                self._send_json(200, {"ok": True})
            except Exception as e:  # noqa: BLE001
                self._send_json(500, {"ok": False, "error": repr(e)})
        elif parsed.path == "/api/script":
            src = body.get("src", "")
            out, err, code = _run([PYTHON, "-c", src], cwd=ROOT, timeout=30)
            self._send_json(200, {"ok": code == 0, "code": code, "stdout": out, "stderr": err})
        elif parsed.path == "/api/scan":
            lang = body.get("lang", "tr")
            args = (body.get("args") or "").strip()
            extra = args.split() if args else ["all"]
            out, err, code = _run([PYTHON, "tools/deep-tool.py", "--lang", lang] + extra, timeout=120)
            self._send_json(200, {"ok": code == 0, "code": code, "stdout": out, "stderr": err})
        elif parsed.path == "/api/launch":
            out, err, code = _run([PYTHON, "main.py"], timeout=120)
            self._send_json(200, {"ok": code == 0, "code": code, "stdout": out, "stderr": err})
        else:
            self._send_json(404, {"ok": False, "error": "not found"})

    def log_message(self, *args):  # keep the console quiet
        pass


def main():
    server = http.server.ThreadingHTTPServer(("127.0.0.1", PORT), Handler)
    print("[webpanel] DerinEngine paneli: http://127.0.0.1:%d  (kapatmak için: Ctrl+C)" % PORT)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n[webpanel] durduruldu.")
        server.server_close()


if __name__ == "__main__":
    main()