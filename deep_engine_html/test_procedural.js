/* DerinEngine HTML — G8b testleri: procedural.js (Procedural Level Generator) */
"use strict";
const fs = require("fs");
const path = require("path");
global.DE = {};
function load(name) {
    new Function("DE", "window", "document",
        fs.readFileSync(path.join(__dirname, "engine", name), "utf8"))(global.DE, {}, {});
}
["procedural.js"].forEach(load);

let pass = 0, fail = 0;
function check(name, cond, detail = "") {
    if (cond) { pass++; console.log("  OK " + name); }
    else { fail++; console.log("  FAIL " + name + (detail ? "   [" + detail + "]" : "")); }
}
function done() {
    console.log("\nSONUC: " + pass + " gecti, " + fail + " kaldi -> " + (fail === 0 ? "ALL OK" : "HATA VAR"));
    process.exit(fail === 0 ? 0 : 1);
}

// ================= P1 pick_biome =================
{
    check("verilen biyom", DE.procedural_pick_biome("ice", null) === "ice");
    check("gecersiz biyom rastgele", DE.PR_BIOME_NAMES.includes(DE.procedural_pick_biome("yok", null)));
    const rng = DE._pr_rng(42);
    const b1 = DE.procedural_pick_biome(null, rng);
    const rng2 = DE._pr_rng(42);
    const b2 = DE.procedural_pick_biome(null, rng2);
    check("seeded rastgele deterministik", b1 === b2);
}

// ================= P2 generate deterministik + yapı =================
{
    const d1 = DE.procedural_generate("ice", 1234, 8, 0);
    const d2 = DE.procedural_generate("ice", 1234, 8, 0);
    check("aynı tohum aynı seviye", JSON.stringify(d1) === JSON.stringify(d2));
    check("biome dogru", d1["biome"] === "ice");
    check("parallax islendi", d1["parallax_theme"] === "ice");
    check("bg array", Array.isArray(d1["background_color"]) && d1["background_color"].length === 3);
    check("seed kayit", d1["seed"] === 1234);
    const obj = d1["objects"];
    check("Player var", obj.some(o => o["tag"] === "Player"));
    check("Portal var", obj.some(o => o["tag"] === "Portal" && o["next"] === "campaign_boss"));
    const grounds = obj.filter(o => o["tag"] === "Ground");
    check("Ground segmentleri >= chunk*2", grounds.length >= 16, "n=" + grounds.length);
    // Portal uc sonda
    const portal = obj.find(o => o["tag"] === "Portal");
    check("Portal uc sonda", portal["x"] > 8 * DE.CHUNK_W - 300);
}

// ================= P3 güvenli açılış bölgesi =================
{
    // difficulty=0, chunks=4: ilk görünüm alanındaki (safe zone) tehdit sayısı
    const d = DE.procedural_generate("forest", 7, 4, 0, 900);
    const safe_max = 60 + Math.max(260, 900);
    const threats = d["objects"].filter(o =>
        ["Enemy", "Hopper", "Flyer", "Spikes", "Turret", "SniperEnemy"].includes(o["tag"]) && o["x"] < safe_max);
    check("safe zone tehditsiz", threats.length === 0, "n=" + threats.length);
    const springs = d["objects"].filter(o => o["tag"] === "Spring" && o["x"] < safe_max);
    check("safe zone yay yok", springs.length === 0);
}

// ================= P4 zorluk seviyesi etkisi =================
{
    const d0 = DE.procedural_generate("cave", 99, 8, 0);
    const d4 = DE.procedural_generate("cave", 99, 8, 4);
    const c0 = d0["objects"].filter(o => ["Enemy", "Hopper", "Flyer", "Turret"].includes(o["tag"])).length;
    const c4 = d4["objects"].filter(o => ["Enemy", "Hopper", "Flyer", "Turret"].includes(o["tag"])).length;
    check("difficulty arttikca dusman artar", c4 >= c0, "0=" + c0 + " 4=" + c4);
    // difficulty<=1 => Turret yok
    const turrets = d0["objects"].filter(o => o["tag"] === "Turret");
    check("difficulty 0 turret yok", turrets.length === 0);
}

// ================= P5 rastgele biyom (seedsiz) =================
{
    const d = DE.procedural_generate();
    check("biome gecerli", DE.PR_BIOME_NAMES.includes(d["biome"]));
    const d2 = DE.procedural_generate();
    check("iki rastgele farkli olabilir", d["seed"] !== d2["seed"]);
}

// ================= P6 boss arenası =================
{
    const b1 = DE.procedural_generate_boss_arena("ice", 555, 1);
    const b2 = DE.procedural_generate_boss_arena("ice", 555, 1);
    check("arena deterministik", JSON.stringify(b1) === JSON.stringify(b2));
    check("arena is_boss_arena", b1["is_boss_arena"] === true);
    const boss = b1["objects"].find(o => o["tag"] === "Boss");
    check("Boss var", !!boss);
    check("boss_key islendi", boss["boss_key"] === "ice");
    check("boss_type gecerli", ["archer", "flying", "sniper", "shield", "cosmic"].includes(boss["boss_type"]));
    check("boss hp>0", boss["hp"] > 0 && boss["bullet_speed"] > 200);
    check("boss portal", b1["objects"].some(o => o["tag"] === "Portal" && o["boss_arena"] === true && o["next"] === "victory"));
    const astro = DE.procedural_generate_boss_arena("astro", 1, 0);
    const ab = astro["objects"].find(o => o["tag"] === "Boss");
    check("astro her zaman cosmic", ab["boss_type"] === "cosmic");
}

// ================= P6b zorunlu boss tipi (kampanya benzersizliği) =================
{
    const forced = DE.procedural_generate_boss_arena("forest", 7, 2, "victory", "sniper");
    const fb = forced["objects"].find(o => o["tag"] === "Boss");
    check("zorunlu tip uygulanir", fb["boss_type"] === "sniper");

    const af = DE.procedural_generate_boss_arena("astro", 7, 2, "victory", "sniper");
    const afb = af["objects"].find(o => o["tag"] === "Boss");
    check("astro zorunlu tipi yok sayar", afb["boss_type"] === "cosmic");

    // Kampanyada 4 farkli tip 4 biyoma permütasyonla dagitilir -> hepsi benzersiz
    // (eski rng.choice ust uste ayni tipi secebiliyordu).
    const types = DE.PR_BOSS_TYPES.slice();
    const seen = types.map(t => {
        const d = DE.procedural_generate_boss_arena("forest", 3, 1, "victory", t);
        return d["objects"].find(o => o["tag"] === "Boss")["boss_type"];
    });
    check("4 boss tipi benzersiz", new Set(seen).size === types.length, seen.join(","));
}

// ================= P7 tüm biyomlar üretilebilir =================
{
    for (const b of DE.PR_BIOME_NAMES) {
        const d = DE.procedural_generate(b, 2024, 6, 2);
        check("biyom " + b + " uretir", d["biome"] === b && d["objects"].length > 10);
    }
}

done();