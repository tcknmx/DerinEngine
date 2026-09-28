/* DerinEngine HTML — game/state.js (Python game/state.py birebir portu)
 * Oyunun küresel durumu (kampanya, sonsuz mod) tek yerde tutulur. Hiçbir game.*
 * modülüne bağlanmaz (döngüsel import yok). Astro her zaman listede SONDADIR ->
 * final boss.
 */
var DE_GAME = DE_GAME || {};

// Global kampanya durumu: chain (biyom listesi) + başlangıç bilgisi.
DE_GAME.state = {
    campaign_state: {
        "chain": [],           // biyom zinciri (son eleman her zaman "astro")
        "index": 0,            // aktif sektör indeksi
        "difficulty": 1,       // aktif zorluk (her sektörde artar)
        "score": 0,            // kalıcı taban: önceki tamamlanan sektörlerin puanı
        "sector_score": 0,     // aktif sektörün (giriş + boss) kümülatif toplamı
    },
    // Aktif oyun modu: "campaign" (P) veya "endless" (4).
    // Aynı giriş haritası paylaşılır; portal davranışı bu moda göre değişir:
    //   campaign -> boss arenası, endless -> zorluğu artan yeni prosedürel harita.
    game_mode: "campaign",
    // Sonsuz Mod (4) için sürekli biriken puan. Kampanyadaki sektör puanından
    // farklı olarak sonsuz puanı sahne geçişlerinde TAŞINIR (yeni zorluk haritasına)
    // — oyuncu sıfırlanmadan yüksek skor biriktirebilir.
    endless_state: { score: 0 },
};

// Paylaşımlı kalıcı profil (Python game/state.py'deki tek _save örneğinin karşılığı).
// Tarayıcıda localStorage üzerinden kalıcı; Node/test'te oturum içi tekil örnek.
// game.* modülleri savegame erişimi için her zaman DE_GAME.savegame() kullanır.
DE_GAME._sg = null;
DE_GAME.savegame = function savegame() {
    if (DE_GAME._sg === null) DE_GAME._sg = new DE.SaveGame();
    return DE_GAME._sg;
};