/* DerinEngine HTML — game/main.js (Python main.py birebir portu)
 * Giriş noktası: canvas + Engine, girdi köprüsü, SceneManager (duraklatma),
 * kayıtlı dil, ana menü (canlı kampanya giriş seviyesi) ile başlar.
 */
window.addEventListener("DOMContentLoaded", () => {
    const canvas = document.getElementById("game");
    const engine = new DE.Engine(canvas, "DerinEngine HTML", 900, 600, 60);
    DE.Input.instance = new DE.Input();
    engine.scene_manager = new DE.SceneManager(engine);

    // Kayıtlı dil ile başla ("T" ile oyun içinde değiştirilebilir).
    try {
        const profile = DE_GAME.savegame();
        const lang = profile.get("lang", null);
        if (lang) DE.I18n.current_lang = lang;
    } catch (e) { /* yok say */ }

    // main.py:78 — ses örnekleri açılışta üretilir (SFX üretimi oyun yolu buradan).
    DE.SoundFX.initialize();

    // Kayıtlı ses seviyelerini uygula (JS'e özel uzantı: Settings ekranı yönetir).
    try {
        const profile = DE_GAME.savegame();
        DE.SoundFX.set_sfx_volume(profile.get("sfx_volume", 1.0));
        DE.SoundFX.set_music_volume(profile.get("music_volume", 1.0));
    } catch (e) { /* yok say */ }

    // Tarayıcı autoplay kilidi: ilk kullanıcı etkileşiminde AudioContext uyandır
    // (Python'da karşılığı yok; tarayıcı gereği).
    const _wakeAudio = () => {
        const c = DE.SoundFX._ctx();
        if (c && c.state === "suspended" && c.resume) { try { c.resume(); } catch (e) { /* sessiz */ } }
    };
    window.addEventListener("pointerdown", _wakeAudio, { once: true });
    window.addEventListener("keydown", _wakeAudio, { once: true });

    engine.set_scene(DE_GAME.build_main_menu_scene());
    // main.py:86 — açılış menü müziği.
    DE.SoundFX.play_music("menu");
    engine.run();
});