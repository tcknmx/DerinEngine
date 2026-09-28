/* DerinEngine HTML — ui.js testleri (UITheme, Panel, Button, ScrollContainer, Scene is_ui) */
"use strict";
const fs = require("fs");
const path = require("path");
const B = path.join(__dirname, "engine");

let pass = 0, fail = 0;
function check(name, cond, detail = "") {
    if (cond) { pass++; console.log("  OK " + name); }
    else { fail++; console.log("  FAIL " + name + (detail ? "   [" + detail + "]" : "")); }
}
function ctx_stub() {
    const calls = { fillRect: 0, fillText: 0, fill: 0, stroke: 0, arc: 0, moveTo: 0, lineTo: 0, clip: 0 };
    return {
        calls,
        fillStyle: "", strokeStyle: "", lineWidth: 1, font: "", textBaseline: "alphabetic",
        beginPath() {}, closePath() {},
        fillRect() { calls.fillRect++; }, rect() {},
        arc() { calls.arc++; }, fill() { calls.fill++; },
        stroke() { calls.stroke++; },
        moveTo() { calls.moveTo++; }, lineTo() { calls.lineTo++; },
        arcTo() {}, clip() { calls.clip++; },
        measureText() { return { width: 40 }; },
        fillText() { calls.fillText++; },
        save() { this._saved = true; }, restore() {},
        canvas: { width: 900, height: 600 },
    };
}

// --- Ortam ---
global.DE = {};
const windowStub = { innerWidth: 900, innerHeight: 600, addEventListener() {}, };
const documentStub = { createElement: () => ({}), getElementById: () => ({}), addEventListener() {} };
function load(name) {
    new Function("DE", "window", "document",
        fs.readFileSync(path.join(B, name), "utf8"))(global.DE, windowStub, documentStub);
}
["core.js", "math2d.js", "render.js", "input.js", "ui.js"].forEach(load);
function done() {
    console.log("\nSONUC: " + pass + " gecti, " + fail + " kaldi -> " + (fail === 0 ? "ALL OK" : "HATA VAR"));
    process.exit(fail === 0 ? 0 : 1);
}

// --- Input sahtesi (gerçek window eventleri yok; TestInput ile driver) ---
class FakeInput {
    constructor() { this._mpos = [0, 0]; this._held = false; this._down = 0; this._scroll = 0; this._keys_down = {}; }
    get_mouse_position() { const p = new DE.Vector2(this._mpos[0], this._mpos[1]); return { x: p.x, y: p.y }; }
    get_mouse_button(b) { return b === 0 && this._held; }
    get_mouse_button_down(b) { return b === 0 && this._down === 1; }
    get_mouse_scroll() { return this._scroll; }
    is_controller_active() { return false; }
    _gamepad_a_down() { return false; }
    get_key_down(name) { return !!this._keys_down[name]; }
}
const input = new FakeInput();
DE.Input = input;

// ================= U1 UITheme =================
{
    const t = new DE.UITheme();
    check("defaults button_bg", Array.isArray(t.get("button_bg")) && t.get("button_bg")[0] === 50);
    check("default panic", t.get("font_size") === 22);
    const t2 = new DE.UITheme({ font_size: 30, button_bg: [1, 2, 3] });
    check("override font_size", t2.get("font_size") === 30);
    check("override button_bg", t2.get("button_bg")[0] === 1);
    check("t degismedi", t.get("font_size") === 22);
}

// ================= U2 Panel =================
{
    const go = new DE.GameObject("panel", 10, 20, 100, 50);
    const p = go.add_component(new DE.Panel(null, null, null, null, 255));
    const c = ctx_stub();
    p.draw(c, new DE.Vector2(0, 0));
    check("panel cizdi (fill)", c.calls.fill > 0 && c.calls.stroke > 0);
    const p2 = go.add_component(new DE.Panel(null, [1, 2, 3], [4, 5, 6], 8, 100));
    const c2 = ctx_stub();
    p2.draw(c2, new DE.Vector2(0, 0));
    check("apanel alpha cizdi", c2.calls.fill > 0);
}

// ================= U3 Button =================
{
    const go = new DE.GameObject("btn", 100, 100, 160, 44);
    let clicked = 0;
    const b = go.add_component(new DE.Button("Start", () => clicked++, null, 20));
    check("baslangic enabled/focused", b.enabled && !b.focused && !b.hovered);

    // hover + click (basilip birakilinca)
    input._mpos = [140, 120];
    input._held = true; input._down = 1;
    b.update(1 / 60);
    check("hover oldu", b.hovered === true);
    check("pressed oldu", b.pressed === true);
    check("henuz tik yok", clicked === 0);
    input._held = false; input._down = 0;
    b.update(1 / 60);
    check("click tetiklendi", clicked === 1);
    check("pressed sifirlandi", b.pressed === false);

    // enabled=false iken tik olmaz
    b.enabled = false;
    input._mpos = [140, 120];
    input._held = true; input._down = 1;
    b.update(1 / 60);
    input._held = false; input._down = 0;
    b.update(1 / 60);
    check("disabled'ta tik yok", clicked === 1);

    // focused + ENTER
    b.enabled = true; b.focused = true;
    input._keys_down["ENTER"] = true;
    input._mpos = [0, 0]; // disarida
    b.update(1 / 60);
    check("ENTER ile aktivasyon", clicked === 2);
    input._keys_down = {};

    // dısında basıp bırakınca tik yok
    b.focused = false;
    input._mpos = [500, 500];
    input._held = true; input._down = 1;
    b.update(1 / 60);
    input._held = false; input._down = 0;
    b.update(1 / 60);
    check("dısarda tik yok", clicked === 2);

    // draw
    const c = ctx_stub();
    b.draw(c, new DE.Vector2(0, 0));
    check("button cizildi", c.calls.fill > 0 && c.calls.fillText > 0);

    // set_text boyut gunceller
    const c2 = ctx_stub();
    b.set_text("UzunBaslik", c2);
    check("set_text boyut", go.size.x > 10 && go.size.y > 5);
}

// ================= U4 ScrollContainer =================
{
    const items = ["Istanbul", "Ankara", "Izmir", "Bursa", "Antalya", "Trabzon", "Eskisehir", "Konya", "Gaziantep", "Adana"];
    const go = new DE.GameObject("list", 100, 100, 200, 100);
    let picked = -1;
    const sc = go.add_component(new DE.ScrollContainer(items, null, i => picked = i, 30));
    check("content_height", sc.content_height() === 300);
    check("scroll 0", sc.scroll === 0.0);
    check("hovered -1", sc.hovered_index === -1);

    // row_rect
    const r0 = sc.row_rect(0);
    check("row0 y", r0.y === 100);
    const r1 = sc.row_rect(1);
    check("row1 y", r1.y === 130 && r1.h === 30);

    // Fare 3. satır üzerinde (glz: 100+60=160..190)
    input._mpos = [110, 172];
    sc.update(1 / 60);
    check("hovered satir 2", sc.hovered_index === 2, "i=" + sc.hovered_index);
    // tıkla → on_pick(2)
    input._down = 1;
    sc.update(1 / 60);
    input._down = 0;
    check("pick oldu", picked === 2, "n=" + picked);

    // tekerlek ile scroll (deltaY>0 = asagi kaydir; tek kademe ~100 tarayici da)
    sc.scroll = 0.5;
    const before = sc.scroll;
    input._scroll = 100;
    input._mpos = [110, 150];
    sc.update(1 / 60);
    input._scroll = 0;
    check("tekerlek scroll", sc.scroll > before, sc.scroll.toFixed(3) + " vs " + before.toFixed(3));

    // tutamaç drag (arttır)
    const hh = sc._handle_rect();
    input._held = true; input._down = 1;
    input._mpos = [hh.x + 4, hh.y + 4];
    sc.update(1 / 60);
    input._held = false; input._down = 0;
    check("drag basladi", sc._dragging === true, "drag=" + sc._dragging);
    // scroll degisse de clamp 1.0
    check("scroll clamped <=1", sc.scroll >= 0 && sc.scroll <= 1.0);

    // draw (scroll 0'a dön, en üstten çizilecek)
    sc.scroll = 0;
    const c = ctx_stub();
    sc.draw(c, new DE.Vector2(0, 0));
    check("list cizildi", c.calls.clip > 0 && c.calls.fillText > 0);
}

// ================= U5 Scene is_ui (üstte, kameradan bağımsız) =================
{
    const sc = new DE.Scene("UI", [10, 20, 30]);
    const world = new DE.GameObject("worldObj", 500, 500, 50, 50);
    world.add_component(new DE.SpriteRenderer([200, 200, 200]));
    const uigo = new DE.GameObject("uiObj", 400, 300, 120, 40);
    const ui = uigo.add_component(new DE.Button("OK", null));
    sc.add_object(world);
    sc.add_object(uigo);
    sc.start();
    sc.camera_position.set(300, 200);
    const c = ctx_stub();
    sc.draw(c);
    // is_ui'yi ayirt eden hicbir cizim sayilanmaz ama en az 1 UI okunmali (fillText yok button.draw kullanir)
    check("scene is_ui tespit", sc._is_ui_object(uigo) === true && sc._is_ui_object(world) === false);
    check("scene draw UI sirayla (hata yok)", c.calls.fill > 0);
}

done();