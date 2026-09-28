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

    engine.set_scene(DE_GAME.build_main_menu_scene());
    engine.run();
});