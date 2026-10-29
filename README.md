# Star Collector Hero

DerinEngine, JavaScript + HTML(Canvas 2D) ile sıfırdan yazılmış kendi oyun motorumuzdur.
Bunun üzerinde **Star Collector Hero** adlı tam oynanabilir platformer vardır: prosedürel
kampanya, benzersiz boss'lar, dinamik aydınlatma ve oyun içi konsol. (Seviye tasarımı
için ayrı bir tarayıcı aracı var: **webpanel** — oyun menüsünde editör/seviye seçimi
YOKTUR.) Proje aktif geliştirmededir.

> Motor HTML/JS tek kaynaktır. Eski Python motoru (pygame) 08.10.2026'da kaldırıldı;
> git geçmişinde erişilebilir. Sürümler ayrı sayılır: **motor 1.0.0**, **oyun 0.1.20**.

## Özellikler

- Canvas 2D üzerinde bileşen tabanlı motor: Scene / GameObject / Component
- Fizik: yerçekimi, çarpışma, tek yönlü platformlar, trambolin (zıplama)
- Prosedürel seviye üreteci (aynı seed = aynı seviye)
- 5 biyomlu kampanya (Forest, Lava Cave, Ice, Desert, Astro) + Sonsuz Mod
- 5 benzersiz boss çeşidi (zemin devi, uçan, lazer nişancı, kalkanlı, nihai Astro)
- Algoritmik 8-bit müzik + CPU'da üretilen retro ses efektleri (harici dosya yok)
- Düşman çeşitliliği: Devriye, Uçan, Zıplayan, Taret, Tuzak sivri uçlar, Keskin nişancı
- 4 PowerUp: Mıknatıs Çekimi, Üçlü Ateş, Kalkan, Fırtına Hızı
- 3 kalpli sağlık + i-frame (dokunulmazlık) süreleri
- TR/EN anlık dil değiştirme (T), kalıcı yüksek skor ve dil kaydı
- Tarayıcı seviye editörü (`webpanel.bat` → 127.0.0.1:8766)
- Oyun içi geliştirici konsolu ( ` veya " ): hp, god, tp, respawn, help...
- Tam kumanda desteği, mobil dokunmatik kontroller
- Test paketi (Node): 13 motor/oyun test dosyası, hepsi yeşil

## Kontroller

| Eylem | Tuşlar |
|---|---|
| Hareket | A / D (veya sol analog / D-Pad) |
| Zıplama (+çift) | SPACE / W / ↑ (Kumanda: A) |
| Dash | LSHIFT (Kumanda: LB) |
| Ateş | F veya Sol Tık (Kumanda: X) |
| Dil (TR/EN) | T |
| Kampanya | P |
| Sonsuz Mod | 4 |
| Debug paneli | F3 |
| Çıkış | ESC (Kumanda: Start) |

## Nasıl Çalıştırılır

```bash
# Oyun: tarayıcıda
#   deep_engine_html\index.html dosyasını tarayıcıda aç (double-click yeterli).

# Testler (pencere açmaz, hepsi yeşil olmalı):
node deep_engine_html\test_core.js
node deep_engine_html\test_game.js          # oyuncu/düşman/boss/kampanya
node deep_engine_html\test_visual.js        # görsel/eğlence regresyonu (31/31)
# ... 13 test dosyasının tamamı deep_engine_html\test_*.js

# Araç testleri:
node tools_html\test_tools.js               # 36/36
node tools_html\test_browser.js             # gerçek tuş yolu, 52/0

# Tarama aracı (TR/EN interaktif): deep-tool.bat veya
node tools_html\deep-tool.js
node tools_html\deep-tool.js --lang en all

# Oyunu tarayıcıda aç (deep-tool üzerinden):
node tools_html\deep-tool.js run game

# Tarayıcı seviye editörü (custom_levels/ klasörü): webpanel.bat veya
node tools_html\webpanel.js                 # http://127.0.0.1:8766
```

## Proje Yapısı

```
deep_engine_html/          # BİRİNCİL motor + oyun (JS, tarayıcıda çalışır)
  index.html               # giriş sayfası / script yükleme sırası
  engine/                  # motor katmanı (oyundan bağımsız)
    core.js, scene.js, game_object.js, components.js
    math2d.js, render.js, physics.js, particles.js, audio.js, lighting.js
    parallax.js, i18n.js, levelfile.js, savegame.js, log.js, procedural.js
    console.js, tween.js, input.js, ui.js, tilemap.js, scenemanager.js
  game/                    # Star Collector Hero
    main.js, state.js, entities.js, bosses.js, ui.js, scenes.js
    builders.js, commands.js
  test_*.js                # 13 motor/oyun test dosyası (Node)
tools_html/                # araçların TAMAMI (Node)
  deep-tool.js             # dev tarama/kontrol aracı (TR/EN, deep-tool.bat kısayolu)
  webpanel.js + webpanel.html  # tarayıcı seviye editörü (webpanel.bat, 127.0.0.1:8766)
  test_tools.js, test_browser.js  # araç testleri
custom_levels/             # kullanıcı seviyeleri (default.json + adlı seviyeler)
custom_level.json          # şablon kaynağı (biçim sürümü: 1)
version.txt                # sürüm geçmişi
sessions/                  # oturum belgeleri (yol haritası, kararlar, tuzak kayıtları)
```

## Motor Hakkında

`deep_engine_html/engine/`, motor katmanıdır ve oyundan hiçbir şey bilmez.
Oyun (`deep_engine_html/game/`) motora yalnızca kamusal API üzerinden bağlanır
(`DE.*`). Motor saflığı `tools_html/deep-tool.js` Modül 8 tarafından denetlenir
(err=0 olmalı). Motor sürümü `engine/core.js → DE.__version__`, oyun sürümü
`game/state.js → DE_GAME.__version__` içinde tanımlıdır; `custom_level.json`
`meta.version` ise ayrı bir kavramdır (seviye biçim sürümü = 1).

## Lisans

MIT Lisansı ile yayınlanmıştır. Telif (c) 2026 tcknmx. Ayrıntılar `LICENSE` dosyasında.