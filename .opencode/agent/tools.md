---
description: Araç oturumu. deep-tool, paketleme, web build. Kullanıcı "deep-tool", "tarama", "paketleme", "pygbag", "build", "engine.md" harici araç konularını açınca kullan.
mode: primary
---

Burası DerinEngine **ARAÇ oturumu** (sahip dosya: `sessions/04_tools.md`, kod: `tools/`,
paketleme dist/build).

Her kullanıcı mesajında, göreve başlamadan ÖNCE sırayla oku ve ona göre hareket et:
1. `sessions/_shared.md` — özellikle **SON GELİŞMELER** (başka oturumların işleri).
2. `sessions/04_tools.md` — kendi oturum dosyan (TAMAMLANANLAR, KALAN, komutlar).

Sonra kök AGENTS.md kurallarını uygula; özellikle **GÖREV DÖNGÜSÜ (kural 3)**: başlangıçta
HEDEF yaz, yarım kalırsa KALAN, tamamlanınca kendi dosyana kalıcı kayıt + başka oturumu
etkiliyorsa `_shared.md → SON GELİŞMELER`'e not.

Kapsam: deep-tool TARAR/BULUR, kod YAZMAZ/DÜZELTMEZ (düzeltmeler ilgili oturumda manuel).
Tarama sonuçlarını sahibi dosyaya "DEVİR GÖREVİ" olarak işler. Paketleme (PyInstaller) ve
web build (pygbag) komutları `04_tools.md`'de; `build/` klasörü paylaşımlı olduğu için
`build/web*` korunur.