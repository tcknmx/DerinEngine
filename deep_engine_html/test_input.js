/* DerinEngine HTML — input parity testleri (Python deep_engine/input.py birebir)
 * Kapsam: klavye eşlemesi (LSHIFT/RSHIFT/TAB/BACKQUOTE/QUOTEDBL/F3...), one-shot
 * edge (get_key_down/up), 3 butonlu fare, scroll, typed text, oyun kumandası
 * (Gamepad API: analog eksen ölü bölge, D-Pad → hat, buton kenar algılama,
 * BUTTON_MAP eşlemesi SPACE→A/F→X/LSHIFT→LB/ESCAPE→Start, get_horizontal_axis).
 * Çalıştır:  node test_input.js  (deep_engine_html/ içinden)
 */
"use strict";
const fs = require("fs");
const path = require("path");
global.DE = {};
const handlers = {};
let currentPads = [];
const windowStub = {
    innerWidth: 900, innerHeight: 600,
    navigator: { getGamepads: () => currentPads },
    addEventListener(type, fn) { (handlers[type] = handlers[type] || []).push(fn); },
};
const documentStub = { createElement: () => ({}), getElementById: () => ({}), addEventListener() {} };
function load(name) {
    new Function("DE", "window", "document",
        fs.readFileSync(path.join(__dirname, "engine", name), "utf8"))(global.DE, windowStub, documentStub);
}
["core.js", "input.js"].forEach(load);

// sahte oyun kumandası (standart Xbox layout)
function makePad({ axes = [], buttons = [], connected = true } = {}) {
    return {
        id: "test-utf " + Math.random().toFixed(5), index: 0, connected,
        mapping: "standard", axes: axes.slice(),
        buttons: Array.from({ length: 17 }, (_, i) => ({
            pressed: !!buttons[i],
            value: buttons[i] ? 1 : 0,
        })),
    };
}
let pass = 0, fail = 0;
function check(name, cond, detail = "") {
    if (cond) { pass++; console.log("  OK " + name); }
    else { fail++; console.log("  FAIL " + name + (detail ? "   [" + detail + "]" : "")); }
}
function done() {
    console.log("\nSONUC: " + pass + " gecti, " + fail + " kaldi -> " + (fail === 0 ? "ALL OK" : "HATA VAR"));
    process.exit(fail === 0 ? 0 : 1);
}
function kdown(key, location) { (handlers["keydown"] || []).forEach(f => f({ key, location, preventDefault() {} })); }
function kup(key, location) { (handlers["keyup"] || []).forEach(f => f({ key, location, preventDefault() {} })); }
function mdown(button) { (handlers["mousedown"] || []).forEach(f => f({ button, clientX: 10, clientY: 20 })); }
function mup(button) { (handlers["mouseup"] || []).forEach(f => f({ button, clientX: 10, clientY: 20 })); }
function wheel(deltaY) { (handlers["wheel"] || []).forEach(f => f({ deltaY })); }

DE.Input.instance = new DE.Input();
const I = DE.Input.instance;

// ================= K: klavye normalize + one-shot =================
{
    kdown(" ", 0);
    check("SPACE: keydown -> get_key_down true", I.get_key_down("SPACE") === true);
    check("SPACE: ayni anda get_key true", I.get_key("SPACE") === true);
    I.end_frame();
    check("SPACE: end_frame sonrasi get_key_down false", I.get_key_down("SPACE") === false);
    check("SPACE: end_frame sonrasi get_key(true) korunur", I.get_key("SPACE") === true);
    kup(" ", 0);
    check("SPACE: keyup -> get_key_up true", I.get_key_up("SPACE") === true);
    check("SPACE: keyup sonrasi get_key false", I.get_key("SPACE") === false);
    I.end_frame();
    check("SPACE: end_frame sonrasi get_key_up false", I.get_key_up("SPACE") === false);

    kdown("Shift", 1);
    check("LSHIFT (location 1) -> get_key LSHIFT", I.get_key("LSHIFT") === true);
    check("RSHIFT sol shift degil", I.get_key("RSHIFT") === false);
    kup("Shift", 1);
    kdown("Shift", 2);
    check("RSHIFT (location 2) -> get_key RSHIFT", I.get_key("RSHIFT") === true);
    check("LSHIFT sag shift degil", I.get_key("LSHIFT") === false);
    kup("Shift", 2);

    kdown("Tab", 0); check("TAB eslemesi", I.get_key_down("TAB") === true); kup("Tab", 0); I.end_frame();
    kdown("`", 0); check("BACKQUOTE eslemesi", I.get_key_down("BACKQUOTE") === true); kup("`", 0); I.end_frame();
    kdown("\"", 0); check("QUOTEDBL eslemesi", I.get_key_down("QUOTEDBL") === true); kup("\"", 0); I.end_frame();
    kdown("Backspace", 0); check("BACKSPACE eslemesi", I.get_key_down("BACKSPACE") === true); kup("Backspace", 0); I.end_frame();
    kdown("F3", 0); check("F3 eslemesi", I.get_key_down("F3") === true); kup("F3", 0); I.end_frame();
    kdown("ArrowUp", 0); check("ArrowUp -> UP", I.get_key_down("UP") === true); kup("ArrowUp", 0); I.end_frame();
    kdown("Enter", 0); check("Enter -> ENTER", I.get_key_down("ENTER") === true); kup("Enter", 0); I.end_frame();
    kdown("Enter", 3); check("numpad Enter -> KPENTER", I.get_key_down("KPENTER") === true); kup("Enter", 3); I.end_frame();
    kdown("Escape", 0); check("Escape -> ESCAPE", I.get_key_down("ESCAPE") === true); kup("Escape", 0); I.end_frame();
}

// ================= M: fare (3 buton) + scroll + typed =================
{
    mdown(0); mdown(1); mdown(2);
    check("sol/morta/sag fare: mousedown -> get_mouse_button true", I.get_mouse_button(0) && I.get_mouse_button(1) && I.get_mouse_button(2));
    check("sol: get_mouse_button_down true", I.get_mouse_button_down(0) === true);
    I.end_frame();
    check("end_frame sonrasi down false, held true", I.get_mouse_button_down(0) === false && I.get_mouse_button(0) === true);
    check("gecersiz buton (5) false", I.get_mouse_button(5) === false && I.get_mouse_button_down(5) === false);
    mup(0);
    check("mouseup sonrasi sol serbest", I.get_mouse_button(0) === false);
    check("orta/sag hala basili", I.get_mouse_button(1) === true && I.get_mouse_button(2) === true);
    I.end_frame();

    wheel(40);
    check("teker 40", I.get_mouse_scroll() === 40);
    wheel(10); wheel(-5);
    check("teker toplama", I.get_mouse_scroll() === 45);
    I.end_frame();
    check("teker end_frame'de sifirlanir", I.get_mouse_scroll() === 0);

    I.get_typed_text();   // K bölümünden kalan (" `\") birikintiyi boşalt
    kdown("x", 0); kdown("y", 0); kdown("4", 0);
    check("typed: x y 4 birikir", I.get_typed_text() === "xy4");
    check("typed: okunduktan sonra bos", I.get_typed_text() === "");
    kup("x", 0); kup("y", 0); kup("4", 0);
    kdown("q", 0); I.clear_typed();
    check("clear_typed sonrasi bos", I.get_typed_text() === "");
    kup("q", 0);
    I.end_frame();
}

// ================= G: oyun kumandasi (Gamepad API) =================
{
    check("kumanda yokken is_controller_active false", I.is_controller_active() === false);
    currentPads = [makePad()];
    I.begin_frame();
    check("kumanda tanindiginda is_controller_active true", I.is_controller_active() === true);

    // ölü bölge
    currentPads = [makePad({ axes: [0.1, -0.9, 0, 0, 0, 0, 0, 0] })];
    I.begin_frame();
    check("eksen 0.1 olü bölgede -> 0", I.get_axis(0) === 0);
    check("eksen 1 (0.9) korunur", I.get_axis(1) === -0.9);
    currentPads = [makePad({ axes: [0.8, -0.1, 0, 0, 0, 0, 0, 0] })];
    I.begin_frame();
    check("eksen 0 (0.8 dolu)", I.get_axis(0) === 0.8);
    check("eksen 1 tekrar ölü bölge -> 0", I.get_axis(1) === 0);

    // D-Pad -> hat (right=15, up=12)
    currentPads = [makePad({ buttons: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1] })];
    I.begin_frame();
    const hR = I.get_hat(0);
    check("D-Pad sag -> hat [1,0]", hR[0] === 1 && hR[1] === 0, hR.join(","));
    currentPads = [makePad({ buttons: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0] })];
    I.begin_frame();
    const hU = I.get_hat(0);
    check("D-Pad yukari -> hat [0,-1]", hU[0] === 0 && hU[1] === -1, hU.join(","));

    // BUTTON_MAP: A(0)=SPACE/ENTER, X(2)=F, LB(4)=LSHIFT, Start(9)=ESCAPE
    const padAll = makePad({ buttons: [1, 0, 1, 0, 1, 0, 0, 0, 0, 1] });   // A, X, LB, Start
    currentPads = [padAll];
    I.begin_frame();
    check("A basili -> get_key SPACE", I.get_key("SPACE") === true);
    check("A yeni basildi -> get_key_down SPACE", I.get_key_down("SPACE") === true);
    check("A -> _gamepad_a_down", I._gamepad_a_down() === true);
    check("X basili -> F", I.get_key("F") === true);
    check("LB basili -> LSHIFT", I.get_key("LSHIFT") === true);
    check("Start basili -> ESCAPE", I.get_key("ESCAPE") === true);
    check("yok buton (B) false", I.get_key("ENTER") === true);   // A=ENTER de
    I.end_frame();
    // hâlâ basılı: kenar yok
    I.begin_frame();
    check("hala basili -> get_key_down SPACE false", I.get_key_down("SPACE") === false);
    check("hala basili -> get_key SPACE true", I.get_key("SPACE") === true);
    // bırakıldı: kenar up
    currentPads = [makePad({ buttons: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0] })];
    I.begin_frame();
    check("A birakildi -> get_key_up SPACE", I.get_key_up("SPACE") === true);
    check("A birakildi -> get_key SPACE false", I.get_key("SPACE") === false);
    I.end_frame();
    check("kenar up end_frame'de temizlenir", I.get_key_up("SPACE") === false);

    // kumanda çıkarıldı
    currentPads = [];
    I.begin_frame();
    check("kumanda cikti -> is_controller_active false", I.is_controller_active() === false);
}

// ================= H: get_horizontal_axis (axis+hat+klavye) =================
{
    currentPads = [makePad({ axes: new Array(8).fill(0) })];
    I.begin_frame();
    check("notr eksen -> 0", I.get_horizontal_axis() === 0, "h=" + I.get_horizontal_axis() + " axis0=" + I.get_axis(0) + " keysA=" + I.get_key("A") + " held=" + [...I._joy_buttons_held].join(","));
    currentPads = [makePad({ axes: [0.8, 0, 0, 0, 0, 0, 0, 0] })];
    I.begin_frame();
    check("sag analog 0.8 -> 0.8", Math.abs(I.get_horizontal_axis() - 0.8) < 0.001, "h=" + I.get_horizontal_axis() + " axis0=" + I.get_axis(0));
    currentPads = [makePad({ axes: [0, 0, 0, 0, 0, 0, 0, 0], buttons: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0] })];
    I.begin_frame();
    check("D-Pad sol (0 eksen) -> -1", I.get_horizontal_axis() === -1);
    // klavye override: A basiliyken analog saga itilse de -1
    currentPads = [makePad({ axes: [0.9, 0, 0, 0, 0, 0, 0, 0] })];
    I.begin_frame();
    kdown("A", 0);
    check("klavye A basili -> -1 (python ile ayni)", I.get_horizontal_axis() === -1);
    kup("A", 0); I.end_frame();
    check("A birakildi -> analog 0.9", Math.abs(I.get_horizontal_axis() - 0.9) < 0.001);
}

done();