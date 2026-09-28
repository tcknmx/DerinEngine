/* DerinEngine HTML — game/scenes.js (Python game/scenes.py birebir portu)
 * Prosedürel seviye + kampanya sistemi (giriş -> boss -> sonraki biyom -> zafer).
 * KALAN (belgeli):
 *  - _attach_ground_tilemap (Tilemap rasterizasyonu) ATLANDI: görsel iyileştirme,
 *    fizik/kolaylaştırıcılar aynı kalır. M3'te eklenir.
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
            scene.parallax_background = new DE.ParallaxBackground({ theme: meta["parallax_theme"] });
        } catch (e) { /* yok say */ }
    }

    for (const entry of data["objects"]) {
        DE.place_object(scene, Object.assign({}, entry));
    }
    scene.start();

    // M1 KALAN: _attach_ground_tilemap (zemin Tilemap rasterizasyonu) burada ATLANDI.
    // Görsel iyileştirme; fizik & kolaylaştırıcılar grid olmadan da aynı çalışır.

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
            scene.parallax_background = new DE.ParallaxBackground({ theme: meta["parallax_theme"] });
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