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
| **2. Motor** | `deep_engine/` — motor çekirdeği | `sessions/02_engine.md` | `deep_engine/*.py` |
| **3. Oyun** | Star Collector Hero — `game/` | `sessions/03_game.md` | `game/*.py`, `main.py` |
| **4. Araç** | deep-tool, paketleme, web build | `sessions/04_tools.md` | `tools/`, dist/build |
| **Paylaşılan** | Çapraz-oturum haberler + tuzaklar | `sessions/_shared.md` | — |

## ÇALIŞMA KURALLARI (oturum bütünlüğü)

1. **Başlarken oku:** bu dosya → kendi oturum dosyan → `sessions/_shared.md`
   (özellikle **SON GELİŞMELER**).
2. **Kendi bölgende kal:** motor saflığı korunur (`deep_engine/` içinde `game`/`main`
   import YASAK — deep-tool Modül 8 denetler). `game/*.py` motora `deep_engine.*`
   mutlak import ile bağlanır (göreli import çalışmaz).
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

Kod bilmeyen kullanıcıyla **sıfırdan kendi oyun motorumuzu** Python + pygame ile
inşa ediyoruz. **Önce 2D v1 olgunlaşır → sonra 2.5D → voxel → `.map` 3D.**
Ürün zinciri: STAR COLLECTOR HERO → STAR COLLECTOR 2 → STARCUBES → TrenchBroom `.map`.
Detaylı çizelge + 2D v1 5 alan planı: `01_strategy.md`.

## PROJE YERİ

- `main.py` — ince giriş noktası: game/'den import, motor log + excepthook,
  emscripten/asyncio dalı, dil yükleme.
- `game/` — oyun katmanı: `state.py` (kampanya/sonsuz/küresel durum), `entities.py`
  (PlayerController, GoalPortal, düşmanlar), `bosses.py`, `ui.py`, `builders.py`
  (JSON builder/extractor + `_register_level_builders`), `scenes.py`
  (prosedürel/kampanya/sonsuz + `start_campaign`).
- `deep_engine/` — motor: `core.py` (Engine, `run`/`run_async`,`_frame`), `scene.py`,
  `game_object.py`, `components.py` (SpriteRenderer, BoxCollider, Rigidbody2D, Health,
  Projectile, PowerUp, Animator, BreakablePlatform, SpawnIn, Event/Tween,
  ParticleEmitter...), `tween.py`, `input.py`, `particles.py`, `audio.py`, `lighting.py`,
  `parallax.py`, `i18n.py`, `math2d.py`, `levelfile.py`, `savegame.py`,
  `log.py`, `procedural.py`, `console.py`.
- `tools/` — deep-tool.py + deep-tool.bat (kısayol), webpanel.py (tarayıcı editörü).
- `sessions/` — oturum belgeleri (üstteki tablo).
- Veri: `custom_level.json` (web editörü şablon kaynağı), `custom_levels/` (web
  editörü seviyeleri: `default.json` sıfır şablon + adlı seviyeler — oyundan
  bağımsız tasarım alanı), `savegame.json`, `version.txt`.

## SÜRÜM MODELİ

Motor **1.0.0**, oyun **0.1.19** (ayrı sayılır — tek sürüm satırı fikri iptal edildi).
Kaynaklar: `deep_engine/__init__.py → __version__`, `version.txt`.
`custom_level.json` `meta.version` = seviye **biçim** sürümü (1) — ayrı kavram.
savegame sıfır kurulum: `{"lang":"tr","high_score":0}` (BOM'suz `{`).

## ÇALIŞTIRMA / DOĞRULAMA

```powershell
python C:\Users\token\Desktop\DerinEngine\main.py
python tools\deep-tool.py            # tarama aracı (TR/EN interaktif menü)
python tools\deep-tool.py --lang en all
```

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