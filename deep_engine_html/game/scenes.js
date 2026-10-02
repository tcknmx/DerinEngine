/* DerinEngine HTML — game/scenes.js (Python game/scenes.py birebir portu)
 * Prosedürel seviye + kampanya sistemi (giriş -> boss -> sonraki biyom -> zafer).
 * M3: _attach_ground_tilemap (zemin Tilemap rasterizasyonu) eklendi — düz zemin
 * sprite'larını 32px karo ızgarasına çevirir (fizik aynı kalır, sadece görsel).
 */
var DE_GAME = DE_GAME || {};

/* Sahne hedeflerinin dinamik fabrika tablosu ("next" anahtarı -> sahne kurucusu). */
DE_GAME._NEXT_SCENE_FACTORIES = {
    "victory": null,   // build_victory_scene (ui.js) yüklendikten sonra doldurulur
    "menu": null,      // build_main_menu_scene
};

function _play_theme(biome, is_boss = false, fallback = "level") {
    const name = is_boss ? ("boss_" + biome) : (biome || fallback);
    DE.SoundFX.play_music(name);
}

function _register_pause(scene) {
    const eng = DE.Engine.instance;
    const sm = eng ? eng.scene_manager : null;
    if (sm === null || sm === undefined) return;
    if (!sm.has("pause")) sm.register("pause", DE_GAME.build_pause_scene());
    scene.on_escape = function on_escape() {
        const player = scene.find_by_tag("Player");
        const ctrl = player ? player.get_component(DE_GAME.PlayerController) : null;
        if (ctrl && ctrl.menu_idle) return false;  // ana menü -> ESC oyunu kapatır
        sm.push("pause");
        return true;
    };
}

/* Kilitli/jenerik prosedürel seviyedeki "campaign_boss" hedefi için güvenli rota. */
function _portal_campaign_boss() {
    const cs = DE_GAME.state.campaign_state;
    if (cs && cs.chain && cs.chain.length && cs.index >= 0 && cs.index < cs.chain.length) {
        return build_campaign_boss(cs.chain[cs.index], cs.difficulty, cs.index);
    }
    return DE_GAME.build_victory_scene();
}

/* Zemin Tilemap rasterizasyonu (Python game/scenes.py:_attach_ground_tilemap portu).
 * Prosedürel üretici zemini düz rect sprite'ları olarak üretir; bu yardımcı zemin
 * ayak izini 32px karo ızgarasına çevirip sahneye Tilemap ekler ve eski düz zemin
 * sprite'larını gizler (çarpışma alanları fizik için durur). Sahnede `_tilemap_ground`
 * ve `_tilemap_segments` (runtime <-> editör köprüsü) tutulur. */
function _attach_ground_tilemap(scene, data) {
    const bname = data["biome"];
    if (!bname) return;
    const b = DE.PR_BIOMES[bname];
    if (!b) return;

    const ts = 32;
    const grounds = (data["objects"] || []).filter(e => e["tag"] === "Ground");
    if (!grounds.length) return;

    // Tüm zemin rect'lerinin dünya sınır kutusu
    let min_x = Infinity, min_y = Infinity, max_x = -Infinity, max_y = -Infinity;
    for (const e of grounds) {
        min_x = Math.min(min_x, Math.floor(e["x"]));
        min_y = Math.min(min_y, Math.floor(e["y"]));
        max_x = Math.max(max_x, Math.ceil(e["x"] + e["w"]));
        max_y = Math.max(max_y, Math.ceil(e["y"] + e["h"]));
    }
    const cols = Math.trunc((max_x - min_x) / ts) + 1;
    const rows = Math.trunc((max_y - min_y) / ts) + 1;
    const grid = [];
    for (let r = 0; r < rows; r++) {
        grid.push([]);
        for (let c = 0; c < cols; c++) grid[r].push(null);
    }

    const _fill = (e, tid) => {
        const c0 = Math.trunc((e["x"] - min_x) / ts);
        const c1 = Math.trunc((e["x"] + e["w"] - min_x - 0.01) / ts);
        const r0 = Math.trunc((e["y"] - min_y) / ts);
        const r1 = Math.trunc((e["y"] + e["h"] - min_y - 0.01) / ts);
        for (let r = Math.max(0, r0); r <= Math.min(rows - 1, r1); r++) {
            for (let c = Math.max(0, c0); c <= Math.min(cols - 1, c1); c++) {
                // Üst katman (yüzey, id 1) alt katmana (id 2) karşı kazanır.
                if (grid[r][c] === null || tid === 1) grid[r][c] = tid;
            }
        }
    };
    const _same3 = (a, b) => a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
    const top = b["platform"], soil = b["platform_alt"];
    for (const e of grounds) {
        const color = e["color"] || [];
        if (_same3(color, soil)) _fill(e, 2);
    }
    for (const e of grounds) {
        const color = e["color"] || [];
        if (_same3(color, top)) _fill(e, 1);
    }

    const tm_obj = new DE.GameObject("TilemapGround", min_x, min_y, cols * ts, rows * ts, "Tilemap");
    // Zemin EN SON ekleniyordu -> normal ekleme sirasinda EN USTTE ciziliyor ve
    // zemine batan oyuncu/coin/dusmanin USTUNU kapatiyordu. Arkaya alinir.
    tm_obj.z_index = -100;
    const tm = tm_obj.add_component(new DE.Tilemap(ts, [min_x, min_y]));
    tm.set_tile_set({ 1: top, 2: soil });
    tm.add_layer(grid);
    scene.add_object(tm_obj);

    // Eski düz zemin sprite'larını gizle (çarpışma alanları fizik için durur);
    // adalar (one-way platformlar) sprite'ına kavuşur, yalnızca katı zemin gizlenir.
    for (const obj of scene.find_all_by_tag("Ground")) {
        const col = obj.get_component(DE.BoxCollider);
        if (col && col.one_way) continue;
        const spr = obj.get_component(DE.SpriteRenderer);
        if (spr) spr.visible = false;
    }

    // Geometri köprüsü: tilemap + çizgi segmentleri sahneye saklanır.
    scene._tilemap_ground = tm;
    scene._tilemap_segments = tm.to_segments();
}

/** Runtime -> data: sahnenin tilemap zeminini JSON-uyumlu veriye cevirir.
 *  `Tilemap.to_data()` eşi; tilemap yoksa (boss/menü sahneleri) null. */
function export_scene_tilemap(scene) {
    const tm = scene && scene._tilemap_ground;
    return tm ? tm.to_data() : null;
}

/** Data -> runtime: `to_data()` verisinden sahnenin tilemap zeminini kurar.
 *  Tilemap nesnesi varsa yerinde güncellenir, yoksa "Tilemap" nesnesi eklenir.
 *  `_tilemap_ground` / `_tilemap_segments` köprüsü senkron kalır. */
function import_scene_tilemap(scene, data) {
    if (!scene || !data || !Array.isArray(data.layers) || !data.layers.length) return false;
    const fresh = DE.Tilemap.from_data(data);
    const obj = scene.find_by_tag("Tilemap");
    let tm = obj ? obj.get_component(DE.Tilemap) : null;
    if (tm) {
        tm.tile_size = fresh.tile_size;
        tm.offset = [].concat(fresh.offset);
        tm.tile_set = Object.assign({}, fresh.tile_set);
        tm.layers = fresh.layers;
    } else {
        const grid = fresh.layers[0].grid || [];
        const cols = grid.length ? grid[0].length : 0;
        const rows = grid.length;
        const newObj = new DE.GameObject({
            "name": "TilemapGround", "x": fresh.offset[0], "y": fresh.offset[1],
            "width": cols * fresh.tile_size, "height": rows * fresh.tile_size,
            "tag": "Tilemap",
        });
        newObj.add_component(fresh);
        scene.add_object(newObj);
        tm = fresh;
    }
    scene._tilemap_ground = tm;
    scene._tilemap_segments = tm.to_segments();
    return true;
}

function build_procedural_level(biome = null, seed = null, chunks = 8, difficulty = 0) {
    const data = DE.procedural_generate(biome, seed, chunks, difficulty);
    const meta = {
        "name": DE.I18n.current_lang === "tr" ? data["name_tr"] : data["name_en"],
        "background_color": [].concat(data["background_color"]),
        "parallax_theme": data["parallax_theme"],
    };

    const scene = new DE.Scene(meta["name"], meta["background_color"]);
    if (meta["parallax_theme"]) {
        try {
            scene.parallax_background = new DE.ParallaxBackground(meta["parallax_theme"]);
        } catch (e) { /* yok say */ }
    }

    for (const entry of data["objects"]) {
        DE.place_object(scene, Object.assign({}, entry));
    }
    scene.start();

    // Gerçek tilemap zemini: düz Zemin rect'lerini 32px ızgaraya rasterize et
    // (platform yüzeyi + alt toprak, 2 renk katmanı) ve eski sprite'ları gizle.
    _attach_ground_tilemap(scene, data);

    _register_pause(scene);
    DE_GAME._builders._finalize_goal_ui(scene);

    const restart_stack = [biome, seed, chunks, difficulty];
    function _restart() { return build_procedural_level.apply(null, restart_stack); }

    const player = scene.find_by_tag("Player");
    if (player) {
        const ctrl = player.get_component(DE_GAME.PlayerController);
        if (ctrl) {
            ctrl.restart_scene_factory = _restart;
            ctrl.apply_biome(data["biome"]);
        }
        const health = player.get_component(DE.Health);
        if (health) {
            health.on_death = () => DE.Engine.switch_scene(DE_GAME.build_game_over_scene(_restart));
        }
    }

    DE_GAME._NEXT_SCENE_FACTORIES["procedural"] = build_procedural_level;
    _play_theme(data["biome"] || "forest");
    return scene;
}

/* ---------------------------------------------------------------------------
 *  PROSEDÜREL KAMPANYA SİSTEMİ
 * ------------------------------------------------------------------------ */

function start_campaign() {
    const chain = DE.PR_BIOME_NAMES.filter(b => b !== "astro");
    // Fisher-Yates karıştırması (Python random.shuffle eşdeğeri).
    for (let i = chain.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const tmp = chain[i]; chain[i] = chain[j]; chain[j] = tmp;
    }
    chain.push("astro");  // final boss her zaman astro

    DE_GAME.state.campaign_state["chain"] = chain;
    DE_GAME.state.campaign_state["index"] = 0;
    DE_GAME.state.campaign_state["difficulty"] = 1;
    DE_GAME.state.campaign_state["score"] = 0;
    DE_GAME.state.campaign_state["sector_score"] = 0;
    return build_campaign_entrance(chain[0], 1, 0);
}

function _campaign_sector_wipe() {
    DE_GAME.state.campaign_state["sector_score"] = 0;
}

function _campaign_sector_commit(biome = null) {
    DE_GAME.state.campaign_state["score"] += DE_GAME.state.campaign_state["sector_score"];
    DE_GAME.state.campaign_state["sector_score"] = 0;
    if (biome) {
        try {
            const profile = DE_GAME.savegame();
            const done = [].concat(profile.get("completed_biomes", []) || []);
            if (done.indexOf(biome) === -1) {
                done.push(biome);
                profile.set("completed_biomes", done);
                profile.save();
            }
        } catch (e) { /* ilerleme kalıcılığı en iyi çaba */ }
    }
}

function build_campaign_entrance(biome, difficulty, index) {
    const scene = build_procedural_level(biome, null, 8, difficulty);
    scene.name = String(scene.name).replace("Procedural", "Kampanya");

    // Onboarding: ilk girişte (kolay zorluk) çark TutorialBanner'ı gösterir.
    if (index === 0 && difficulty <= 1) {
        let show_tut = true;
        try {
            const profile = DE_GAME.savegame();
            if (profile.get("tutorial_done", false)) show_tut = false;
        } catch (e) { show_tut = true; }
        if (show_tut) {
            const tut_obj = new DE.GameObject("TutorialBanner", 0, 0, 0, 0, "Tutorial");
            tut_obj.add_component(new DE_GAME.TutorialBanner());
            scene.add_object(tut_obj);
        }
    }

    function restart_fac() {
        _campaign_sector_wipe();
        return build_campaign_entrance(biome, difficulty, index);
    }
    const player = scene.find_by_tag("Player");
    if (player) {
        const ctrl = player.get_component(DE_GAME.PlayerController);
        if (ctrl) ctrl.restart_scene_factory = restart_fac;
        const health = player.get_component(DE.Health);
        if (health) {
            health.on_death = () => DE.Engine.switch_scene(DE_GAME.build_game_over_scene(restart_fac));
        }
    }

    // Giriş portali -> seçilen oyun moduna göre: kampanya (boss) / sonsuz (yeni harita)
    const portals = scene.find_all_by_tag("Portal");
    for (const portal of portals) {
        const gp = portal.get_component(DE_GAME.GoalPortal);
        if (gp === null) continue;
        gp.next_scene_factory = (b = biome, d = difficulty, i = index) => {
            if (DE_GAME.state.game_mode === "endless") return build_endless_level(d + 1, 0);
            return build_campaign_boss(b, d, i);
        };
    }
    return scene;
}

function build_campaign_boss(biome, difficulty, index) {
    /* Kampanyadaki boss arenası (biyomun özel boss'u).

    - Boss yenilince arenanın çıkış portalı açılır.
    - Astro boss'u (final) yenmek -> Zafer ekranı.
    - Diğer boss'lar -> sonraki biyomun girişi (difficulty +1).
    Python game/scenes.py build_campaign_boss aynı. */
    const chain = DE_GAME.state.campaign_state["chain"];
    const is_final = (index === chain.length - 1);   // astro -> final
    const next_target = is_final ? "victory" : "campaign_next_entrance";

    const data = DE.procedural_generate_boss_arena(biome, null, difficulty, next_target);

    const meta = {
        "name": (DE.I18n.t("campaign_boss") + " - "
                 + (DE.I18n.current_lang === "tr" ? data["name_tr"] : data["name_en"])),
        "background_color": [].concat(data["background_color"]),
        "parallax_theme": data["parallax_theme"],
    };
    const scene = new DE.Scene(meta["name"], meta["background_color"]);
    if (meta["parallax_theme"]) {
        try {
            scene.parallax_background = new DE.ParallaxBackground(meta["parallax_theme"]);
        } catch (e) { /* yok say */ }
    }

    for (const entry of data["objects"]) {
        DE.place_object(scene, Object.assign({}, entry));
    }
    scene.start();

    // ESC durdurmada pause overlay'i açar (menu_idle çıkış davranışını korur)
    _register_pause(scene);

    // Boss arenasında hedef yıldız toplamak değil boss'u yenmektir -> UI ayarı
    const _boss_ui = (DE.I18n.t("campaign_boss") + ": " + DE.I18n.t("boss_" + biome) + "   |   "
                      + DE.I18n.localize("campaign_stage", { "index": index + 1, "total": chain.length }));
    const player = scene.find_by_tag("Player");
    if (player) {
        const ctrl = player.get_component(DE_GAME.PlayerController);
        if (ctrl && ctrl.goal_text_obj) {
            const gtr = ctrl.goal_text_obj.get_component(DE.TextRenderer);
            if (gtr) {
                gtr.text = _boss_ui;
                gtr.color = [255, 190, 120];
            }
        }
    }

    // ÖLÜM (kampanya): boss seviyesinde ölmek o biyomun normal girişine döner
    // (boss'u tekrar oynamak yerine). Giriş sahnesi sıfırdan yeniden kurulur;
    // sektör coin/skor temizlenir — oyuncu biyoma en baştan başlar.
    function boss_death_target() {
        _campaign_sector_wipe();
        return build_campaign_entrance(biome, difficulty, index);
    }
    if (player) {
        const ctrl = player.get_component(DE_GAME.PlayerController);
        if (ctrl) ctrl.restart_scene_factory = boss_death_target;
        const health = player.get_component(DE.Health);
        if (health) {
            health.on_death = () => DE.Engine.switch_scene(DE_GAME.build_game_over_scene(boss_death_target));
        }
    }

    // Çıkış portalı nereye gider:
    // - final (astro): zafer; yoksa sonraki biyomun girişi (difficulty +1)
    if (is_final) {
        function _exit() {
            _campaign_sector_commit(biome);           // son sektör skorunu tabana ekle
            DE_GAME.state.campaign_state["index"] = 0;
            return DE_GAME.build_victory_scene();
        }
    } else {
        const ni = index + 1;
        const nxt_biome = chain[ni];
        const nxt_diff = difficulty + 1;

        function _exit() {
            _campaign_sector_commit(biome);           // tamamlanan sektörü kalıcı tabana ekle
            DE_GAME.state.campaign_state["index"] = ni;
            return build_campaign_entrance(nxt_biome, nxt_diff, ni);
        }
    }

    const portals = scene.find_all_by_tag("Portal");
    for (const portal of portals) {
        const gp = portal.get_component(DE_GAME.GoalPortal);
        if (gp !== null) gp.next_scene_factory = _exit;
    }

    _play_theme(biome, true);

    return scene;
}

function build_endless_level(difficulty, index = 0) {
    const scene = build_procedural_level(null, null, 8, difficulty);
    scene.name = DE.I18n.t("endless_name");

    const restart_fac = () => build_endless_level(difficulty, index);
    const player = scene.find_by_tag("Player");
    if (player) {
        const ctrl = player.get_component(DE_GAME.PlayerController);
        if (ctrl) ctrl.restart_scene_factory = restart_fac;
        const health = player.get_component(DE.Health);
        if (health) {
            health.on_death = () => DE.Engine.switch_scene(DE_GAME.build_game_over_scene(restart_fac));
        }
    }

    const portals = scene.find_all_by_tag("Portal");
    for (const portal of portals) {
        const gp = portal.get_component(DE_GAME.GoalPortal);
        if (gp !== null) gp.next_scene_factory = (d = difficulty) => build_endless_level(d + 1, 0);
    }

    DE.SoundFX.play_music("level");
    _play_theme(null, false, "level");
    return scene;
}

// Diğer sahne kurucuları (ui.js bunlara load-time'da başvurur).
DE_GAME._NEXT_SCENE_FACTORIES["victory"] = DE_GAME.build_victory_scene;
DE_GAME._NEXT_SCENE_FACTORIES["menu"] = DE_GAME.build_main_menu_scene;
DE_GAME._NEXT_SCENE_FACTORIES["campaign_boss"] = _portal_campaign_boss;

DE_GAME.build_procedural_level = build_procedural_level;
DE_GAME.start_campaign = start_campaign;
DE_GAME.build_campaign_entrance = build_campaign_entrance;
DE_GAME.build_campaign_boss = build_campaign_boss;
DE_GAME.build_endless_level = build_endless_level;
DE_GAME._campaign_sector_wipe = _campaign_sector_wipe;
DE_GAME._campaign_sector_commit = _campaign_sector_commit;
DE_GAME._play_theme = _play_theme;
DE_GAME._register_pause = _register_pause;
DE_GAME._portal_campaign_boss = _portal_campaign_boss;
DE_GAME._attach_ground_tilemap = _attach_ground_tilemap;
DE_GAME.export_scene_tilemap = export_scene_tilemap;
DE_GAME.import_scene_tilemap = import_scene_tilemap;