/* DerinEngine HTML — G6 tilemap + levelfile testleri
 * Çalıştır: node deep_engine_html\test_tilemap_levelfile.js
 */
const fs = require("fs");
const path = require("path");
global.DE = {};
function load(name) {
    new Function("DE", "window", "document", "Image",
        fs.readFileSync(path.join(__dirname, "engine", name), "utf8"))(global.DE, global, undefined, undefined);
}
load("core.js");
load("render.js");
load("tilemap.js");
load("parallax.js");
load("levelfile.js");

let pass = 0, fail = 0;
function check(name, cond, extra) {
    if (cond) { pass++; console.log("  OK " + name + (extra ? "  [" + extra + "]" : "")); }
    else { fail++; console.log("  FAIL " + name + (extra ? "  [" + extra + "]" : "")); }
}

function make_ctx() {
    const calls = {};
    return {
        _calls: calls,
        canvas: { width: 320, height: 240 },
        fillStyle: "#fff",
        fillRect() { calls.fillRect = (calls.fillRect || 0) + 1; },
        clearRect() {}, beginPath() {}, arc() {}, moveTo() {}, lineTo() {},
        closePath() {}, fill() {}, stroke() {}, save() {}, restore() {}, translate() {}, scale() {},
        fillText() {}, measureText() { return { width: 10 }; }, drawImage() {},
    };
}

console.log("T1 Tilemap grid + tileset:");
{
    const go = new DE.GameObject("tm", 0, 0, 32, 32, "t");
    const tm = go.add_component(new DE.Tilemap(32));
    tm.set_tile_set({ 0: null, 1: [80, 200, 80], 2: [140, 140, 140] });
    tm.add_layer([
        [1, 2, null, null, null],
        [1, null, 2, null, null],
        [null, null, null, null, null],
    ], 0);
    tm.add_layer([[null, null, null], [0, 2, null]], 1);
    check("get_tile", tm.get_tile(0, 1, 0) === 2, String(tm.get_tile(0, 1, 0)));
    check("get_tile disi (null)", tm.get_tile(0, 9, 9) === null);
    check("layers_count=2", tm.layers_count === 2);
    check("solid_at dolgu", tm.solid_at(0, 0, 0) === true);
    tm.set_tile(0, 1, 1, 1);
    check("set_tile", tm.get_tile(0, 1, 1) === 1);
    tm.place_at_world(96, 32, 1, 0);   // col=3,row=1
    check("place_at_world", tm.get_tile(0, 3, 1) === 1);
    check("solid_at (katman-1=herhangi)", tm.solid_at(1, 0, -1) === true);
}

console.log("T2 seri degisiklik to_data/from_data:");
{
    const go = new DE.GameObject("tm", 0, 0, 32, 32, "t");
    const tm = go.add_component(new DE.Tilemap(16, [10, 20]));
    tm.set_tile_set({ 0: null, 1: [255, 0, 0], 2: [0, 255, 0] });
    tm.add_layer([[1, 2], [0, 1]], 1);
    const data = tm.to_data();
    check("tile_size", data.tile_size === 16);
    check("offset", data.offset[0] === 10 && data.offset[1] === 20);
    check("tile_set id cikti", data.tile_set["1"][0] === 255);
    const tm2 = DE.Tilemap.from_data(data);
    check("from layercount", tm2.layers_count === 1);
    check("from tile", tm2.get_tile(0, 0, 0) === 1);
    check("from offset", tm2.offset[0] === 10);
    check("from tileset", tm2.tile_set[2][1] === 255);
}

console.log("T3 to_segments (ic kenar kırpma):");
{
    const go = new DE.GameObject("tm", 0, 0, 32, 32, "t");
    const tm = go.add_component(new DE.Tilemap(32));
    tm.set_tile_set({ 0: null, 1: [100, 100, 100] });
    // 2x2 dolu blok — iç kenarlar cull, dış 8 kenar kalmalı
    tm.add_layer([[1, 1], [1, 1]]);
    const segs = tm.to_segments();
    check("2x2 blok = 8 segment", segs.length === 8, "n=" + segs.length);
    // Tek hücre = 4 segment
    const go2 = new DE.GameObject("tm2", 0, 0, 32, 32, "t");
    const tm2 = go2.add_component(new DE.Tilemap(32));
    tm2.set_tile_set({ 0: null, 1: [100, 100, 100] });
    tm2.add_layer([[1, null], [null, null]]);
    check("tek hucve = 4 segment", tm2.to_segments().length === 4, "n=" + tm2.to_segments().length);
}

console.log("T4 draw culling (görünür bölge):");
{
    const go = new DE.GameObject("tm", 0, 0, 32, 32, "t");
    const tm = go.add_component(new DE.Tilemap(32));
    tm.set_tile_set({ 0: null, 1: [100, 100, 100] });
    const big = [];
    for (let r = 0; r < 30; r++) big.push(new Array(30).fill(1));
    tm.add_layer(big);
    const ctx = make_ctx();
    tm.draw(ctx, new DE.Vector2(0, 0));   // tüm ekran 320x240 -> 10x7.5 hücre
    check("cull'dan once fillRect var", ctx._calls.fillRect > 0, "n=" + ctx._calls.fillRect);
    check("cull calisti (30x30 degil)", ctx._calls.fillRect < 30 * 30, "n=" + ctx._calls.fillRect);
}

console.log("L1 register_builder + place_object + save/load dongusu:");
{
    DE.register_builder("Platform", (scene, data) => {
        const o = new DE.GameObject("platform_" + data.name, data.x, data.y, data.w, data.h, "Platform");
        o.add_component(new DE.SpriteRenderer(data.color || [120, 120, 120], "rect"));
        scene.add_object(o);
        return o;
    });
    DE.register_builder("Enemy", (scene, data) => {
        const o = new DE.GameObject("enemy_" + data.name, data.x, data.y, data.w, data.h, "Enemy");
        o.add_component(new DE.SpriteRenderer(data.color || [255, 0, 0], "circle"));
        scene.add_object(o);
        return o;
    });
    const sc = new DE.Scene("TestLevel", [40, 50, 60]);
    sc.parallax_background = new DE.ParallaxBackground("lava");
    sc.add_object(new DE.GameObject("Player", 100, 200, 40, 50, "Player"));
    sc.add_object(new DE.GameObject("UI", 0, 0, 100, 30, "Default"));  // builder yok -> atlanir
    const p = DE.place_object(sc, { tag: "Platform", name: "A", x: 10, y: 20, w: 64, h: 32, color: [1, 2, 3] });
    check("place_object Platform dondurdu", !!p && p.tag === "Platform");
    sc.start();   // _objects_to_add -> game_objects (save_level oradan okur)
    const data = DE.save_level(sc);
    check("meta format", data.meta.format === "derinengine-level");
    check("meta tema (lava)", data.meta.parallax_theme === "lava");
    check("meta name", data.meta.name === "TestLevel");
    check("meta bg", data.meta.background_color[0] === 40);
    const tags = data.objects.map(o => o.tag);
    // Yalnız builder'ı olanlar kaydedilir (Platform); Player/UI builder'sız olduğu için atlanmalı
    check("objectler (yalniz Platform)", tags.length === 1 && tags[0] === "Platform", tags.join(","));
    const pf = data.objects.find(o => o.tag === "Platform");
    check("Platform verisi", pf.color[0] === 1 && pf.shape === "rect" && pf.x === 10);
    // JSON round-trip
    const json = JSON.stringify(data);
    const sc2 = DE.load_level(json, { from_editor: true });
    check("load sahne adi", sc2.name === "TestLevel");
    check("load parallax tema", sc2.parallax_background && sc2.parallax_background.theme === "lava");
    const pf2 = sc2.find_all_by_tag("Platform");
    check("load platformlar", pf2.length === 1, "n=" + pf2.length);
    check("load platform pos", pf2[0].position.x === 10 && pf2[0].position.y === 20);
}

console.log("L2 bilinmeyen tag atlanir (uyari):");
{
    const sc = new DE.Scene("s");
    const r = DE.place_object(sc, { tag: "YokBoyleBirTag", x: 0, y: 0 });
    check("null dondu", r === null);
    check("sahne bos", sc.game_objects.length === 0);
    DE.register_builder("Enemy2", (scene, data) => {
        scene.add_object(new DE.GameObject("e2", data.x, data.y, 20, 20, "Enemy"));
    });
    check("registered_tags icerir", DE.registered_tags().includes("Platform") && DE.registered_tags().includes("Enemy2"));
}

console.log("M9 save_level/load_level Python imzasi:");
{
    const os = require("os");
    const tmp = path.join(os.tmpdir(), "de_m9_test_level.json");
    DE._fs = fs;   // Node'da dosya yazma kancasi (engine levelfile.js DE._fs okur)
    const sc = new DE.Scene("M9Level", [10, 20, 30]);
    sc.add_object(new DE.GameObject("Player", 5, 6, 7, 8, "Player"));
    const pf = DE.place_object(sc, { tag: "Platform", name: "B", x: 1, y: 2, w: 3, h: 4, color: [9, 9, 9] });
    sc.start();
    const data = DE.save_level(sc, tmp, { author: "m9" });
    check("save_level(scene, path, extra_meta) veri dondu", !!data && Array.isArray(data.objects));
    check("extra_meta meta'ya girdi", data.meta.author === "m9", String(data.meta.author));
    check("path'e yazildi (fs)", fs.existsSync(tmp) && JSON.parse(fs.readFileSync(tmp, "utf8")).meta.name === "M9Level");
    const sc2 = DE.load_level(tmp);
    check("load_level(path) yuklendi", sc2 && sc2.name === "M9Level");
    const pfs = sc2.find_all_by_tag("Platform");
    check("yuklenen platform", pfs.length === 1 && pfs[0].position.x === 1, "n=" + pfs.length);
    const legacy = DE.save_level(sc, { old_style: 7 });
    check("eski imza save_level(scene, extra_meta) hala calisir", legacy.meta.old_style === 7 && legacy.meta.author === undefined);
    try { fs.unlinkSync(tmp); } catch (e) { /* temizlik */ }
    delete DE._fs;
}

console.log("\nSONUC: " + pass + " gecti, " + fail + " kaldi" + (fail === 0 ? " -> ALL OK" : ""));
process.exit(fail === 0 ? 0 : 1);