# DerinEngine — Merkez Oturum Rehberi (HUB)

Bu dosya tüm oturumların **ortak giriş noktasıdır**. Her oturumda ilk okunur; sonra
kendi oturum dosyan ve `sessions/_shared.md` okunur. (Eski adı: MiniEngine → DerinEngine.)

> **Yapı değişikliği:** Eski tek dev AGENTS.md (2028 satır) **4 oturum + paylaşılan
> bilgi** düzenine taşındı. Geçmiş "maddeler", bug checkup'ları ve planlar ilgili
> oturum dosyalarında duruyor; bu dosya sadece çalışma düzeni + bağlantılardır.

## OTURUM DÜZENİ (4 sohbet + paylaşılan)

| Oturum | Ne yapılır | Sahip dosya | Kod |
|---|---|---|---|
| **1. Strateji** | Yol haritası, tartışmalar, öneriler, kararlar, sıralama | `sessions/01_strategy.md` | — |
| **2. Motor** | `deep_engine_html/` — **BİRİNCİL** motor (JS/HTML) | `sessions/02_engine.md` | `deep_engine_html/**/*.js` |
| **3. Oyun** | Star Collector Hero — `deep_engine_html/game/` | `sessions/03_game.md` | `deep_engine_html/game/*.js`, `index.html` |
| **4. Araç** | deep-tool, paketleme, web build | `sessions/04_tools.md` | `tools/`, dist/build |
| **Paylaşılan** | Çapraz-oturum haberler + tuzaklar | `sessions/_shared.md` | — |

> ### ⚠️ MOTOR KARARI (03.10.2026 → 08.10.2026 TAMAMLANDI) — JS TEK KAYNAK
>
> **Geliştirme `deep_engine_html/` (JS/HTML) içinde yapılır. Python motoru
> 08.10.2026'da SİLİNDİ** (`deep_engine/*.py`, `game/*.py`, `main.py`,
> `tests/*.py`) — ORTA parite farkları (M1–M11) JS'te kapatıldıktan sonra:
>
> | | Tek kaynak | Silinen (git geçmişinde) |
> |---|---|---|
> | Motor | `deep_engine_html/engine/*.js` | eski `deep_engine/*.py` |
> | Oyun | `deep_engine_html/game/*.js` | eski `game/*.py`, `main.py` |
> | Test | `deep_engine_html/test_*.js` + `tools_html/test_*.js` | eski `tests/*.py` |
>
> **Kurallar:**
> 1. Yeni motor/oyun yeteneği **JS'e** yazılır; Python tarafına hiçbir şey eklenmez.
> 2. Eski Python kodu git geçmişinde. **Parite kapısı (deep-tool Modül 14 +
>    `tools/parity_check.py`) 08.10.2026'da kaldırıldı** — JS motoru artık
>    ölçülen hedef değil, KAYNAĞIN kendisi. "Python'da nasıldı?" sorusunun
>    cevabı: git geçmişi (`git log`, örn.
>    `git show e6bf3e8:deep_engine/components.py`) + session kayıtları
>    (özellikle `_shared.md`, `02_engine.md`).
> 3. Eski Python testleri silindi; **tüm regresyon JS** ile yapılır (aşağıda).
> 4. `tools/deep-tool.py` + `tools/webpanel.py` + `tools_html/*` **kaldı**
>    (aracılar JS/HTML motorunun hizmetinde).

## ÇALIŞMA KURALLARI (oturum bütünlüğü)

1. **Başlarken oku:** bu dosya → kendi oturum dosyan → `sessions/_shared.md`
   (özellikle **SON GELİŞMELER**).
2. **Kendi bölgende kal:** motor saflığı korunur — `deep_engine_html/engine/`
   (motor katmanı) içinde `game/`/`main` bağımlılığı YASAK (deep-tool Modül 8
   denetler, ERR = 0 olmalı).
3. **GÖREV DÖNGÜSÜ — her görevde üç kayıt:**
   - **Başlangıç:** kendi oturum dosyanda görevin `HEDEF`'ini yaz (neyi, hangi
     oturumda çözüyoruz, doğrulama komutu ne).
   - **Yarım kalırsa:** aynı yere `KALAN` olarak **nereye kadar gittiğini** yaz
     (adım, değişen dosya, son durum, sırada ne var). Başka oturum bu yarım işe
     DOKUNMAZ; gerekiyorsa kullanıcıya "KALAN listene bak" denir.
   - **Tamamlanınca:** kendi oturum dosyana kalıcı kayıt düş (ne yapıldı, sonuç)
     VE değişiklik diğer oturumları etkiliyorsa `_shared.md` → "SON GELİŞMELER"e
     kısa kayıt (ne değişti, kim etkilenir).
4. **Kullanıcı kod bilmiyor:** her açıklama eğitici ve Türkçe; karmaşık sembollerden
   kaçın; doğrulama komutları ver (aşağıda).

## MİSYON (kısa)

Kod bilmeyen kullanıcıyla **sıfırdan kendi oyun motorumuzu** JS/HTML (tarayıcıda
çalışan) ile inşa ediyoruz. **Önce 2D v1 olgunlaşır → sonra 2.5D → voxel → `.map` 3D.**
Ürün zinciri: STAR COLLECTOR HERO → STAR COLLECTOR 2 → STARCUBES → TrenchBroom `.map`.
Detaylı çizelge + 2D v1 5 alan planı: `01_strategy.md`.

> Not: Python + pygame referans uygulaması **08.10.2026'da silindi** (ORTA parite
> farkları M1–M11 JS'te kapatıldıktan sonra). Eski koda git geçmişinde ulaşılır.

## PROJE YERİ

- `deep_engine_html/` — **BİRİNCİL** motor + oyun (JS, tarayıcıda çalışır):
  - `index.html` — giriş sayfası / script yükleme sırası.
  - `engine/` — `core.js` (Engine, `run`/`run_async`/`stop`, Component event
    sistemi, GameObject sahne ağacı), `scene.js`, `game_object.js`,
    `components.js` (SpriteRenderer, BoxCollider, Rigidbody2D, Health, Projectile,
    PowerUp, Animator, BreakablePlatform, SpawnIn, Event/Tween, ParticleEmitter...),
    `tween.js`, `input.js`, `particles.js`, `audio.js`, `lighting.js`,
    `parallax.js`, `i18n.js`, `math2d.js`, `levelfile.js`, `savegame.js`, `log.js`,
    `procedural.js`, `console.js`, `render.js`, `physics.js`, `ui.js`, `tilemap.js`.
  - `game/` — `main.js` + `state.js`, `entities.js`, `bosses.js`, `ui.js`,
    `builders.js`, `scenes.js`, `climber.js`, `commands.js`.
  - `test_*.js` — **13 motor/oyun test dosyası** (node ile çalışır; hepsi yeşil).
- `tools/` — deep-tool.py + deep-tool.bat (kısayol), webpanel.py (tarayıcı editörü).
  (Eski `parity_check.py` + Modül 14 kaldırıldı; Python motoru silindi.)
- `sessions/` — oturum belgeleri (üstteki tablo).
- Veri: `custom_level.json` (web editörü şablon kaynağı), `custom_levels/` (web
  editörü seviyeleri: `default.json` sıfır şablon + adlı seviyeler — oyundan
  bağımsız tasarım alanı), `savegame.json`, `version.txt`.

## SÜRÜM MODELİ

Motor **1.0.0**, oyun **0.1.19** (ayrı sayılır — tek sürüm satırı fikri iptal edildi).
Kaynaklar: `deep_engine_html/engine/core.js → DE.__version__`,
`deep_engine_html/game/state.js → DE_GAME.__version__`, `version.txt`.
`custom_level.json` `meta.version` = seviye **biçim** sürümü (1) — ayrı kavram.
savegame sıfır kurulum: `{"lang":"tr","high_score":0}` (BOM'suz `{`).

## ÇALIŞTIRMA / DOĞRULAMA

```powershell
node C:\Users\token\Desktop\DerinEngine\deep_engine_html\index.html   # tarayıcıda oyun
python tools\deep-tool.py            # tarama aracı (TR/EN interaktif menü)
python tools\deep-tool.py --lang en all
```

Testler (pencere açmaz, hepsi yeşil olmalı):
```powershell
node deep_engine_html\test_core.js    # JS motor çekirdeği -> ALL OK
node deep_engine_html\test_game.js    # oyun (TEST17 dahil) -> SONUÇ: 182 geçti
node tools_html\test_tools.js         # deep-tool -> 36/36
node tools_html\test_browser.js       # tarayıcı testi (gerçek tuş yolu) -> 51/51
```
(13 test dosyasının tamamı: `deep_engine_html\test_*.js` — hepsi yeşil olmalı.)

Kontroller: A/D hareket, SPACE/W/↑ zıplama (+çift), LSHIFT dash, F/sol-tık ateş,
T dil, P kampanya, 4 Sonsuz Mod (kilitli olabilir), **C Star Climber (tırmanış)**,
F3 debug, ESC çıkış.
Konsol: ` veya " ile aç (dev komutları: help, version, hp, god, tp, respawn, list...).
Oyun kumandası: analòg/D-Pad + A zıpla, X ateş, LB dash, Start çıkış.
Tarayıcı editörü: `python tools\webpanel.py` → 127.0.0.1:8765 (custom_levels/ klasörü).

## TÜM GEÇMİŞ KAYITLAR (hızlı erişim)

- Yol haritası / kararlar / 2D v1 planı / ürün çizelgesi → `sessions/01_strategy.md`
- Tamamlanan motor işleri (madde 1–43 dağılımı) + motor KALAN → `sessions/02_engine.md`
- Tamamlanan oyun işleri + playtest bug defteri + oyun KALAN (deneyim 5–8 dahil) →
  `sessions/03_game.md`
- deep-tool tarihi + paketleme/web + araç KALAN → `sessions/04_tools.md`
- Çapraz tuzaklar, dosya sahipliği, SON GELİŞMELER → `sessions/_shared.md`