/* DerinEngine HTML — i18n (TR/EN çoklu dil)
 * Python deep_engine/i18n.py portu (çeviri tablosunun birebir aynısı).
 */
var DE = DE || {};

DE.I18n = class I18n {
    static get TRANSLATIONS() {
        if (DE.I18n._translations) return DE.I18n._translations;
        DE.I18n._translations = {
            "tr": {
                "game_title": "Star Collector Hero",
                "menu_title": "STAR COLLECTOR HERO",
                "menu_subtitle": "DerinEngine ile Yapılmış 2D Aksiyon-Platform Oyunu",
                "menu_highscore": "🏆 En Yüksek Skor: {score}",
                "menu_endless_locked": "(Kampanyayı bitirince açılır)",
                "endless_name": "SONSUZ MOD",
                "menu_coming_soon": "Yakında",
                "endless_locked_warn": "Sonsuz Mod kilitli! Önce Kampanyayı (P) bitir.",
                "controls_info": "[A/D] Hareket  [SPACE] Zıpla  [F] Ateş",
                "menu_play": "Oyna",
                "menu_settings": "Ayarlar",
                "settings_title": "AYARLAR",
                "settings_back": "← Ana Menü",
                "settings_lang": "Dil",
                "settings_lang_tr": "Türkçe",
                "settings_lang_en": "English",
                "settings_sfx": "Efekt Sesi",
                "settings_music": "Müzik",
                "settings_vol": "%{v}",

                "campaign_entrance": "BİYOM GİRİŞ",
                "campaign_boss": "BÖLÜM SONU CANAVARI",
                "campaign_defeated": "CANAVAR DEVİRİLDİ! ÇIKIŞ PORTALINA GİR!",
                "campaign_boss_name": "CANAVAR",
                "campaign_stage": "Bölüm {index}/{total}",
                "campaign_progress": "Kampanya İlerlemesi",

                "biome_forest": "Orman",
                "biome_cave": "Mağara",
                "biome_ice": "Buz",
                "biome_desert": "Çöl",
                "biome_astro": "Uzay",

                "boss_forest": "ORMAN DEVİ",
                "boss_cave": "KARANLIK KOLÜSSÜS",
                "boss_ice": "BUZ DEVİ",
                "boss_desert": "KUM DEVRİYESİ",
                "boss_astro": "YILDIZ YOK EDİCİ",
                "boss_cave_fallback": "CANAVAR",

                "score": "Puan",
                "health": "Can",
                "remaining_stars": "Kalan Yıldız",
                "stars_goal_desc": "Portalı açmak için topla!",
                "portal_unlocked": "PORTAL AÇILDI! Bitiş kapısına git!",
                "streak_x": "⚡ x{n} (Zincir!)",
                "tut_banner": "EĞİTİM {index}/{total}",
                "tut_move": "A/D ile hareket et — sağa ya da sola yürü",
                "tut_jump": "SPACE ile zıpla (düşmanlardan kaç!)",
                "tut_double": "Havadayken tekrar SPACE → çift zıplama!",
                "tut_dash": "LSHIFT ile Dash — düşmanları sersemlet",
                "tut_shoot": "F ile ateş et (taretler ve boss'lara karşı)",
                "tut_coin": "Coin'leri kesintisiz topla → zincir çarpanı kazan",
                "tut_goal": "Sarı portala gir — Bölüm Sonu Canavarı seni bekliyor",
                "level_loop_goal": "Portal seni başlangıç noktasına geri gönderir.",

                "l1_info": "[F/Sol Tık]: Ateş | [LSHIFT]: Dash | [Space]: Çift Zıplama | [T]: Dil",
                "l2_info": "[F/Sol Tık]: Ateş Et | Düşman mermilerine dikkat!",

                "boss_name": "BÖLÜM SONU CANAVARI",
                "boss_objective": "HEDEF: Yıldızları topla ve bölüm sonu canavarını yok et!",
                "boss_defeated": "CANAVAR YIKILDI! ZAFER PORTALINA GİR!",

                "pause_title": "DURAKLATMA",
                "pause_resume": "[ESC] Devam Et",
                "pause_menu": "[M] Ana Menü",
                "pause_hint": "Dinlenme molası — oyun donduruldu",
                "pause_resume_btn": "Devam Et",
                "pause_menu_btn": "Ana Menü",

                "game_over_title": "OYUN BİTTİ!",
                "game_over_subtitle": "Tüm Canların Tükendi...",
                "game_over_restart": "Yeniden Denemek İçin [R] veya [SPACE]'e Bas",
                "game_over_menu": "Ana Menüye Dönmek İçin [M]'ye Bas",
                "game_over_retry": "Yeniden Dene",
                "game_over_menu_btn": "Ana Menü",
                "game_over_hint": "Kısayollar: [R]/[SPACE] yeniden dener, [M] ana menü",

                "victory_title": "KAZANDIN!",
                "victory_subtitle": "Tüm Seviyeleri Başarıyla Tamamladın!",
                "victory_praise": "Mükemmel Bir Zafer!",
                "victory_restart": "Yeniden Oynamak İçin [R] veya [SPACE]'e Bas",

                "pu_magnet": "🧲 MANYETİK ÇEKİM AKTİF!",
                "pu_triple": "🔱 ÜÇLÜ LAZER AKTİF!",
                "pu_shield": "🛡️ ENERJİ KALKANI AKTİF!",
                "pu_speed": "⚡ YILDIRIM HIZI AKTİF!",
                "pu_slow": "⏳ ZAMAN YAVAŞLADI!"
            },
            "en": {
                "game_title": "Star Collector Hero",
                "menu_title": "STAR COLLECTOR HERO",
                "menu_subtitle": "A 2D Action-Platformer Built with DerinEngine",
                "menu_highscore": "🏆 High Score: {score}",
                "menu_endless_locked": "(Unlocks after beating Campaign)",
                "endless_name": "ENDLESS MODE",
                "menu_coming_soon": "Coming Soon",
                "endless_locked_warn": "Endless Mode is locked! Beat the Campaign (P) first.",
                "controls_info": "[A/D] Move  [SPACE] Jump  [F] Shoot",
                "menu_play": "Play",
                "menu_settings": "Settings",
                "settings_title": "SETTINGS",
                "settings_back": "← Main Menu",
                "settings_lang": "Language",
                "settings_lang_tr": "Turkish",
                "settings_lang_en": "English",
                "settings_sfx": "Sound FX",
                "settings_music": "Music",
                "settings_vol": "%{v}",

                "campaign_entrance": "BIOME ENTRANCE",
                "campaign_boss": "CHAPTER BOSS",
                "campaign_defeated": "BOSS DEFEATED! ENTER THE EXIT PORTAL!",
                "campaign_boss_name": "BOSS",
                "campaign_stage": "Stage {index}/{total}",
                "campaign_progress": "Campaign Progress",

                "biome_forest": "Forest",
                "biome_cave": "Cave",
                "biome_ice": "Ice",
                "biome_desert": "Desert",
                "biome_astro": "Space",

                "boss_forest": "FOREST TITAN",
                "boss_cave": "DARK COLOSSUS",
                "boss_ice": "FROST TITAN",
                "boss_desert": "SAND WARDEN",
                "boss_astro": "STAR ANNIHILATOR",
                "boss_cave_fallback": "BOSS",

                "score": "Score",
                "health": "Health",
                "remaining_stars": "Stars Left",
                "stars_goal_desc": "Collect all to unlock Portal!",
                "portal_unlocked": "PORTAL UNLOCKED! Reach the exit gate!",
                "streak_x": "⚡ x{n} (Streak!)",
                "tut_banner": "TUTORIAL {index}/{total}",
                "tut_move": "Move with A/D — walk left or right",
                "tut_jump": "Jump with SPACE (dodge enemies!)",
                "tut_double": "Press SPACE again in mid-air — double jump!",
                "tut_dash": "LSHIFT to dash — stun enemies",
                "tut_shoot": "Shoot with F (for turrets & bosses)",
                "tut_coin": "Collect coins in a row → chain multiplier",
                "tut_goal": "Enter the yellow portal — a Boss awaits",
                "level_loop_goal": "The portal sends you back to the start.",

                "l1_info": "[F/LClick]: Shoot | [LSHIFT]: Dash | [Space]: Double Jump | [T]: Lang",
                "l2_info": "[F/LClick]: Shoot | Watch out for enemy projectiles!",

                "boss_name": "CHAPTER BOSS",
                "boss_objective": "MISSION: Collect stars & defeat the chapter boss!",
                "boss_defeated": "BOSS DEFEATED! ENTER THE VICTORY PORTAL!",

                "game_over_title": "GAME OVER!",
                "game_over_subtitle": "You Ran Out of Lives...",
                "game_over_retry": "Retry",
                "game_over_menu_btn": "Main Menu",
                "game_over_hint": "Shortcuts: [R]/[SPACE] retry, [M] main menu",
                "pause_title": "PAUSED",
                "pause_resume": "[ESC] Resume",
                "pause_menu": "[M] Main Menu",
                "pause_hint": "Break time — the game is frozen",
                "pause_resume_btn": "Resume",
                "pause_menu_btn": "Main Menu",
                "game_over_restart": "Press [R] or [SPACE] to Retry",
                "game_over_menu": "Press [M] to Return to Main Menu",

                "victory_title": "YOU WIN!",
                "victory_subtitle": "You Have Successfully Cleared All Levels!",
                "victory_praise": "An Epic Victory!",
                "victory_restart": "Press [R] or [SPACE] to Play Again",

                "pu_magnet": "🧲 COIN MAGNET ACTIVE!",
                "pu_triple": "🔱 TRIPLE LASER ACTIVE!",
                "pu_shield": "🛡️ ENERGY SHIELD ACTIVE!",
                "pu_speed": "⚡ LIGHTNING SPEED ACTIVE!",
                "pu_slow": "⏳ TIME SLOWED!"
            }
        };
        return DE.I18n._translations;
    }
    static _set(translations, lang) {
        DE.I18n._translations = translations;
        DE.I18n.current_lang = lang;
    }
    static set_language(lang) {
        if (DE.I18n.TRANSLATIONS[lang]) {
            DE.I18n.current_lang = lang;
        }
    }
    static toggle_language() {
        DE.I18n.current_lang = DE.I18n.current_lang === "tr" ? "en" : "tr";
        return DE.I18n.current_lang;
    }
    static t(key) {
        const dictLang = DE.I18n.TRANSLATIONS[DE.I18n.current_lang] || DE.I18n.TRANSLATIONS["tr"];
        return dictLang[key] !== undefined ? dictLang[key] : key;
    }
    static localize(key, kwargs = {}) {
        let text = DE.I18n.t(key);
        try {
            if (Object.keys(kwargs).length) {
                text = String(text).replace(/\{(\w+)\}/g, (m, k) =>
                    kwargs[k] !== undefined ? String(kwargs[k]) : m);
            }
        } catch (e) { /* yer tutucu hatası: orijinal metni dondur */ }
        return text;
    }
}

DE.I18n.current_lang = "tr";