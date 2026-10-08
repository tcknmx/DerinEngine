# OYUN OTURUMU — Star Collector Hero (game/)

> Bu oturumun görevi: **oynanabilir oyunu** (Star Collector Hero) geliştirmek — oyuncu,
> düşmanlar, boss'lar, menüler, kampanya, UX, playtest düzeltmeleri. Oyun `game/` +
> `main.py` dosyalarında; motor API'lerine `deep_engine.*` (mutlak import) ile bağlanır.

> **KAYIT RUTİNİ:** Her iş bitince ÖNCE `sessions/03_game.md` (bu dosya; tamamlanan/
> KALAN/bug defteri), SONRA `sessions/_shared.md` (SON GELİŞMELER + karşı oturum
> etkisi) güncellenir. Ama iş bitmeden oturum dosyasını terk etme.

---

> **HEDEF (08.10.2026, Star Climber v3):** Kullanıcı Star Climber'ı hâlâ beğenmiyor;
> gerçek vizyonunu verdi: Star Climber, Star Collector Hero'nun **alternatif evreni**
> olacak — bu evrende portallar KAPANDI; koleksiyonerler Astro boyutuna uzanan bir
> **kule** diktiler; oyuncu o kuleye tırmanıyor. Oynanış, platformlar, assetler ve
> player modeli **ana oyunla birebir** olmalı; map tırmanışça üretilir (zaten böyle).
> v3 adımları: 1) Player = ana oyun karakterinin aynısı (gövde + gözler + dash +
> squash), 2) HUD hedefi "Astro Kulesi" + açılış banner'ı "Portallar kapandı",
> 3) testler (dash, görsel çizim, HUD) + 13 test + deep-tool 14. Not: v1'deki
> "GÖZLER çizilmez" isteği geri alındı — kullanıcı artık ana oyunla AYNI istiyor.
>
> **SONUÇ — TAMAMLANDI (08.10.2026):** yukarıdaki 3 adım bitti ve yeşiller:
> 13/13 JS test 0 FAIL (test_game v3 ile yeşil), tools 36/0,
> `deep-tool.py --lang tr 14` 0 WARN/0 BUG/0 ERR. Tek dokunulan motor dosyası
> `engine/i18n.js` (yeni key'ler: climber_goal, climber_banner1/2, hint'e dash).
> Ek (önceden var olan kırıcı): `tools_html/test_tools.js` api/script girdisi
> `print(1+1)` → `console.log(1+1)` — webpanel komutu node ile çalıştırır.

---

## TAMAMLANAN OYUN ÇALIŞMALARI (kronolojik; orijinal "madde N" referanslı)

40. **Oyun içi konsol komutları (25.09.2026):** `game/commands.py` — " (BACKQUOTE)
    ile açılan motor konsoluna oyun komutları kayıtlı: `help, clear, version, hp,
    heal, god, coins, speed, jump, tp, respawn, list`. `_player(ctx)` Player
    bileşenini `find_by_tag("Player")` ile bulur; koordin ekleme `_add_score`,
    can `Health`, ışınlanma `go.position + Rigidbody2D.velocity sıfırlama`,
    respawn `respawn(recover=True)`. `game/__init__.py`'ye `commands` import'u
    eklendi (kayıt giriş noktası).
41. **Boss ışın çökmesi düzeltmesi (25.09.2026):** `game/bosses.py` — SniperBoss/
    CosmicBoss `_fire_beam` (eski satır 467/599) `PlayerController` kullanıyordu
    ama import eksikti → boss ışını atınca NameError ile oyun çöküyordu (kullanıcı
    playtest'inde yakalandı). `from game.entities import PlayerController` eklendi.
    Doğrulama: iki `_fire_beam` de gerçek sahnede çağrılıp test edildi.

42. **Oyun içi editör tamamen kaldırıldı + seviyeler klasöre taşındı (25.09.2026):**
    Kullanıcı isteği: "(E) oyun içi editör gereksiz, tamamen çıkar; kostüm seviyeler
    isimli dosyalarda dursun ki sıfır şablon kaybolmasın." Sonuç: seviyeler artık
    **`custom_levels/` klasöründe** birer dosya (`default.json` = hep sabit sıfır
    şablon + `<isim>.json`). `game/state.py`: `LEVELS_DIR` eklendi (eski
    `custom_level.json` yolu DEFAULT_LEVEL_PATH artık `custom_levels/default.json`).
    `game/builders.py`: `_ensure_custom_level` → `ensure_custom_levels_dir()` oldu
    (klasör + default.json'u şablon kaynağından üretir; varsa dokunmaz). `game/ui.py`:
    menüden "[3] Editör" öğesi + key "3" + `_dispatch_action` "editor" kolu + fade
    sonu `editor.toggle()` silindi (C tuşu custom mod kalıyor). `game/entities.py`:
    fare ile ateşte `engine.editor` engeli kaldırıldı. Konsol komutları: `levels`
    (listele) + `load <isim>.json` (sahneye yükle; yol gezinmesi engelli). Doğrulama:
    py_compile, headless boot, konsol komut testleri OK. — **(43 ile C modu da geri
    alındı: levels/load ve oyun içi custom akışı çıktı.)**
43. **Oyun içi "custom level" akışı tamamen kaldırıldı — oyunda P + Sonsuz + T (25.09.2026):**
    Kullanıcı: "oyun içi C'yi de kaldır; costum level istemiyorum; sadece P ve sonsuz
    mod + dil olacak; editör panelde." Sonuç: oyun içi custom mod YOK.
    - `ui.py`: `[C] Özel Seviye` yok, C tuşu yok, "custom" aksiyonu yok; menü =
      Kampanya (P) + Sonsuz (4) + Dil (T). `_start_mode` (fade'li geçiş) sadece C
      için kullanılıyordu → silindi.
    - `builders.py`: `build_custom_level`, `ensure_custom_levels_dir`,
      `_finalize_custom_plain`, `_CUSTOM_GOAL_TEXT` silindi; `_finalize_custom_scene`
      → `_finalize_goal_ui` (prosedürel hedef yıldız UI'ı, scenes.py 68'de kullanılıyor).
      `_build_player` artık `restart_path` okumuyor; varsayılan restart menüye döner
      (kampanya/boss/endless her biri kendi restart/`on_death` factory'sini override
      eder — davranış değişmedi).
    - `state.py`: `LEVELS_DIR`/`DEFAULT_LEVEL_PATH` silindi; `game_mode` yalnız
      campaign/endless. `scenes.py`: `restart_path=DEFAULT_LEVEL_PATH` (2 yer) ve
      import temizlendi. `commands.py`: `levels`/`load`+`_level_names` silindi
      (14→12 komut). `main.py`: `ensure_custom_levels_dir` gitti.
    - Motor temizliği: i18n `menu_custom` TR+EN (62→61/61), `input.py` gamepad "C"
      map'i, `levelfile.py` `restart_path` örnek docstring.
    - `tools/webpanel.py` işlevi AYNI (kendi `custom_levels/`'inde çalışıyor); yalnız
      "oyunda konsol: load X" ipucu metinleri çıktı. `web_level.json` silindi.
        **Not (ürün):** webpanel seviyeleri artık oyunda YÜKLENEMEZ (custom girişi
      yok). Panel bağımsız tasarım alanı; oyuna bağlamak istenirse konuşulur.
    Doğrulama: py_compile, headless (P→kampanya, T→dil, C etkisiz), campaign/endless
    build, 12 komut, i18n 61/61, deep-tool 0 BUG, webpanel save/list/delete +
    `node --check` (placeholder dolgusuyla) OK.

1. **Seviye akışı** (madde 3): bitiş portalı, yıldız şartı, Level 2 (Lav Mağarası),
   Zafer ekranı.
2. **Savaş** (madde 6): `Projectile`, `Health` (3 can / i-frames), Boss: LAV DEVİ.
3. **Menü + dil** (madde 7): ana menü + seviye seçimi, `LocalizedLabel` + T tuşu
   (Türkçe/İngilizce canlı geçiş).
4. **PowerUp** (madde 8): magnet/triple/shield/speed → `apply_powerup`, aktif geri
   bildirim yazısı; forest/lava paralaks entegrasyonu.
5. **Kampanya sistemi** (madde 14): prosedürel kampanya — `campaign_state`
   `{chain, index, difficulty}`; `start_campaign()` (rastgele zincir, **astro final**),
   `build_campaign_entrance`/`build_campaign_boss`; portal factory'leri closure ile
   bağlanır; zorluk artışı (düşman/hız/atış HP), `boss_<biyom>` müziği. Akış:
   Giriş → Boss → sonraki biyom → ... → astro → Zafer.
6. **Vuruş hissi** (madde 15): `Health.take_damage` → screen-shake (boss 0.18 / normal
   0.12 / ölüm 0.7) + `boss_hit` sesi; stereo müzik bağlama.
7. **Awake sistemi** (madde 16, oyun tarafı): `_wake_up` + `wake_radius` — Patrol ~380,
   Flyer ~400, Hopper ~380, Turret ~420; uyur → oyuncu yaklaşınca uyanır (pusu yok);
   `SpawnIn.done` değilse tetiklemez.
8. **Game Feel 1** (madde 17): Coyote Time 0.10s, Jump Buffer 0.10s, jump cut (-400),
   fall boost +550 → tok iniş.
9. **Game Feel 2** (madde 18): dash hız-ramp (2.3x→3.2x, +8*dt) + `dash_momentum`
   sönümlü devam; hit-stop (0.06/0.09s); güçlendirilmiş geri tepme.
10. **Game Feel 3** (madde 19): düşman ölüm parçalanma (engine `_death_burst`), coin
    `FloatingScore`, `kick_camera` dash'te, **wall-slide/wall-jump** (`_detect_wall`,
    slide 160, wall_jump -210x/-330y + partikül), zıplama telegraph
    (`jump_squash_timer` squash→pop), menü havai fişeği (`FireworksController`).
11. **Game Feel 4** (madde 20): iniş dust + koşu tozu (`run_puff_timer`), Turret telegraf
    (fire_interval-0.35 kala kırmızı yanıp sönme), boss 3 desen (fan→ring→aimed,
    `_pattern_index`, enrage yarı-can altında 0.75), powerup türüne özel ses.
12. **Düşmanlar + güçler** (madde 13, 21): `FlyerEnemy`, `HopperEnemy`, `TurretEnemy`,
    `Spikes`(Hazard), **SniperEnemy** (aim→lock→fire hitscan beam; kapı: difficulty≥3
    üst platform/ada), stun dash (`stun_timer=1.2`, boss'ta yok), `powerup_slow`
    (zaman yavaşlatma — motor `_slow_dt` sadece düşmana uygular).
13. **Boss tipleri** (madde 22, 27): `BOSS_TYPES` seed'e bağlı rastgele
    (archer/flying/sniper/shield) + **astro = cosmic (final, üç saldırı: hedefli
    fireball + rüzgür + sniper beam)**; `FlyingBoss` (sinüs süzülüş, hedefli `fan`
    atış, rüzgür `wind_force`), `SniperBoss` (aim/lock/fire beam), `ShieldBoss`
    (`shield_intact()` = tüm parçalar sağlam → hasar yok; tek parça kırılınca yeterli;
    kalkan sağken de hedefli ateş; kalkan barı görseleli), ortak `_draw_boss_bar()`.
14. **Kusursuz Mod + geçiş + kilit** (madde 25): `game_mode` campaign|endless;
    `build_endless_level(d)` (boss'suz, zorluk +1); `endless_unlocked` kilit
    (`build_victory_scene` açar); menüde kilitli satır + `LockIcon` + alt yazı.
15. **Kampanya skoru** (madde 29, 30): `score` (kalıcı taban) + `sector_score` (aktif
    biyom); `_add_score` (coin +10 / ezme +30); görünüren skor = toplam; boss yenilince
    `_campaign_sector_commit()`, ölünce `_campaign_sector_wipe()` + biyom girişine
    dönüş (30) — sektör skoru sıfırlanır, önceki sektörlerin tabanı kalır.
16. **UX paketi** (madde 40): Coin Streak Kombo (STREAK_WINDOW=2.5, MAX x4, +10*çarpan,
    `StreakUI`), **Portal Yon Oku** (`PortalArrowUI`, ekran dışındaysa kenara sabit
    + UI çizim sırası fix), **Onboarding Tutorial** (`TutorialBanner` 7 adım
    move→jump→double→dash→shoot→coin→goal; MIN 1.2s / MAX 8s; `tutorial_done`
    savegame; sadece kampanya girişinde, menüde gizli).
17. **Emoji HUD** (madde 41): `❤️/🖤`, güç ikonları (🧲🔱🛡️⏳) — Segoe UI Emoji +
    Arial fallback; oyun içi obje görselleri değişmedi.
18. **Dash bug fix** (madde 42): koruma penceresi `dash_timer>0` **veya**
    `|dash_momentum|>40` (enemy/boss/hazard dallarında) → dash momentumuyla düşmana
    takılınca hasar alınmaz (stun/sekme verilir).
19. **Menü/pazar düzeltmeleri** (madde 23, 26): `MENU_ZOOM` 0.60→**1.8** (yakın çekim,
    `_start_campaign`→zoom 1.0), çerçeve (0.30,0.55), kare karakter + sadece parlayan
    gözler (`_draw_idle_stargazer`), yazılar ekrandan taşmaz (i18n kısaltma +
    center_x), kilitli metin alt satır soluk.
20. **Tüm yorum/docstring'ler İngilizce'ye çevrildi (23.09.2026):** `game/__init__.py`,
    `game/state.py`, `game/entities.py`, `game/bosses.py`, `game/builders.py`,
    `game/scenes.py`, `game/ui.py`, `main.py` — 8 dosyada 328 `#` yorumu + docstring
    gövdeleri akıcı İngilizce. Kod/i18n string literal'leri DEĞİŞMEDİ. Doğrulama:
    `python -m py_compile` OK (her dosyada `ÇĞİÖŞÜ` kalıntısı = 0).
21. **Tilemap veri katmanı + konsol kaydet/yükle (01.10.2026):** prosedürel zemin
    rasterize edildikten sonra artık **JSON'a dökülüp geri yüklenebiliyor** —
    `game/scenes.py` → `export_scene_tilemap(scene)` (`Tilemap.to_data()`; tilemap
    yoksa `None`) ve `import_scene_tilemap(scene, data)` (`Tilemap.from_data()`;
    mevcut "Tilemap" nesnesinin bileşenini **yerinde** günceller, yoksa yeni nesne
    ekler; `_tilemap_ground` + `_tilemap_segments` köprüsü senkron kalır,
    bozuk/katmansız veri `False` döner). Konsola iki komut: `tilemap_save [isim]`
    → `<user_data>/<isim>.tilemap.json`, `tilemap_load [isim]` → geri yükleme;
    isimler dosya-adı güvenli sanitize edilir (`../../kötü ad*` → `k_t__ad`),
    eksik dosya okunabilir hata mesajı verir. JS eşi birebir
    (`deep_engine_html/game/{scenes,commands}.js`): tarayıcıda dosya yazılamadığı için
    **ayrı** localStorage deposu `derinengine_tilemaps_v1` (oyuncu profilini
    kirletmez; localStorage yoksa belleğe düşer). Doğrulama: Python headless probe
    (2x2 ve 57x12 ızgara → 8/142 kenar, nesne yeniden kullanıldı, dosya temizlendi)
    + `test_game.js` TEST14 9→11 komut ve 8 yeni check → **125/125**; iki araç
    14 modülde 0 WARN/0 BUG/0 ERR; `test_engine_core.py` ALL OK.

46. **SpawnIn telegrafında hasar (oyun, 03.10.2026):** `SpawnIn.done == False` iken
    beliren düşman oyuncuya hasar veriyordu (blink animasyonu sırasında ölmek
    sinir bozucuydu). Çözüm: `game/entities.py::_is_spawning_in()` yardımcısı +
    `PlayerController.on_collision()` başında erken dönüş — SpawnIn'u hâlâ
    tamamlanmamış düşman dokunulmaz sayılır. JS eşi birebir
    (`deep_engine_html/game/entities.js`, `_wake_up()` de aynı guard'ı kullanır).
    Doğrulama: `test_game.js` TEST16 → **132/132**.

47. **Star Climber — Icy Tower tarzı sonsuz tırmanış (oyun, 03.10.2026):**
    Python `game/climber.py` + JS `deep_engine_html/game/climber.js` (birebir ayna),
    menüden `[C]` ile açılır (fade geçiş, `game_mode="climber"`).
    - **Mekanik:** tek yönlü seken platformlar (`ClimbPlatform`), kırılabilir
      katmanlar (motor `BreakablePlatform` eşi), Icy Tower hız kombisi (seviye 0–5,
      her sekiş +1 seviye, zamanla söner), her 10. katmanda geniş/kırılmaz
      kontrol noktası, düşünce kontrol noktasına dönüş (**skor korunur**).
    - **Kule üretimi:** 16 katman önden, dikey boşluk yukarı doğru artar,
      deterministik tohum (Python `random.Random` / JS `mulberry32`).
    - **Oynanışta bulunan 5 gerçek hata (hepsi headless oynanış testiyle bulundu):**
      1. **0. katman oyuncunun altında değildi** → oyuncu hiçbir yere inemiyordu.
         0. katman artık ekranı boydan boya kaplar.
      2. **Sekiş hiç tetiklenmiyordu** (motor stable-ground bulgusu, `02_engine.md`
         madde 19) → `is_grounded` tabanlı `_pump_bounce()` eklendi.
      3. **Kamera zıplama tepesine takılıyordu** → oyuncu kendi katmanının ekran
         dışına düşüp her sekişte aynı yerde ölüyordu. Kamera artık yalnız **yeni
         katmana inildiğinde** yükselir (`_camera_anchor_y()`), Icy Tower gibi.
      4. **Zeminde duran oyuncu ölüyordu** (kamera yukarıda kaldığı için) → sonsuz
         ölüm döngüsü. `_standing_on_floor()` guard'ı; zemindeki oyuncu ölmez.
      5. **Respawn'da `max_floor` sıfırlanmıyordu** → kamera eski katmana çekilip
         oyuncuyu anında öldürüyordu. Artık düşünce yükseklik ilerlemesi sıfırlanır,
         **rekor ayrı tutulur** (`best_floor` → skor, `max_floor` → kamera).
    - **Ulaşılabilirlik kuralı (`_place_floor_x`):** ardışık katmanlar en az
      `REACH_OVERLAP=70px` örtüşür; ilk 8 katman (`FREE_CLIMB`) ayrıca oyuncunun
      sütununu kapsar → oyuncu yatay girdi vermeden de tırmanabilir (kule
      sürüklenip oyuncudan uzaklaşamaz).
    - **Doğrulama:** Python headless 4 seed × 30 sn **girişsiz** tırmanış (12–33
      katman) + yönlendirmeli 60 sn (**189 katman, 0 düşüş**); JS aynı senaryolar
      (10–30 katman / 188–189 katman). Geçici betikler silindi; **kalıcı testlere
      çevrildi:** `deep_engine_html/test_game.js` TEST17 165→**174/174** (yeni:
      0. katman ekranı kaplar, ilk 8 katman oyuncunun sütununda, ardışık katmanlar
      ≥70px örtüşür, **gerçek** `is_grounded`→`_pump_bounce` sekişi, havadayken sekiş
      yok, 3 seed × 30 sn girişsiz tırmanış) + **yeni** `tests/test_climber.py`
      **9/9** (Python'da aynı kural seti — iki tarafın ayrışmasını yakalar).
      Toplam: **JS motor+oyun 553 kontrol / 0 hata**, tools 36/36, browser 33/33,
      `test_engine_core.py` ALL OK; üç araç 0 WARN/0 BUG/0 ERR.
*Mutasyon kanıtı:* `FREE_CLIMB = 0` yapılınca 2 test kırmızıya düştü (tırmanış
       30→7 katman) — testler boş değil, gerçekten yakalıyor.

48. **Star Climber v2 — manuel zıplamalı Icy Tower oynanış revizyonu (06.10.2026):**
    Kullanıcı kararları uygulandı: otomatik sekiş KALDIRILDI → **manuel zıplama**
    (SPACE/W/↑, `COYOTE_TIME=0.10` + `JUMP_BUFFER=0.10`); kamera artık **sürekli
    sabit `CAM_SPEED=52 px/sn` yükselir** (asla inmez; oyuncu çok hızlı çıkarsa üst
    kelepçe `PLAYER_TOP_MARGIN=96` kamerayı yukarı iter ama geri indirmez);
    **checkpoint kaldırıldı** → her düşüş 0. katmana (kamera `RESPAWN_CAM_RATE=0.72`);
    **high score/best_floor korunur** (`max_floor` düşünce sıfırlanır); çift zıplama
    artık **`DOUBLE_JUMP_FLOOR=8` katmanında pop-up ile açılır** (`climber_skill`
    metni) ve `DOUBLE_GAP_PER=8` aralığında geniş boşluklar çıkar; kırılabilir katman
    artık `BREAK_WAIT=0.45sn` bekleme gerektirir (`_check_break_under`).
    - **JS birincil, Python donmuş:** oynanış artık bilinçli olarak `climber.py`'den
      ayrışıyor. Parity sıhhatı korunur: `add_level()`, `on_platform_bounce()`,
      `_camera_anchor_y()` JS'te mevcut (parity kapısı `python tools\parity_check.py`
      → **PARITE TAM**). Python tarafına özellik eklenmedi.
    - **Düzeltilen gerçek hatalar:** `GameObject.scene` geri referansı motor tarafında
      yok → esc kancası `active_scene.find_by_tag("ClimbGame")` kullanır; `build_climber_scene`
      içindeki `scene.start()` testlerde tekrar `start()`'a zararsızdır (`_started`).
    - **Doğrulama:** `test_game.js` TEST17 yeniden yazıldı → **190 geçti / 0 kaldı**;
      `tools_html/test_browser.js` 4b DOM yolu: girişsiz zıplama YOK, SPACE bot her
      kare keydown+keyup (gerçek `_down` doldurur) → tırmanış ilerledi, ekran dışı
      kare yok → **50/50**. İzole bot senaryosu: 1sn'de kamera 88→36 (~52px) sabit.
      Core 50/50, smoke 50/50, tools 36/36, parity PARITE TAM.
    - *Test yazma dersi (06.10.2026):* başka testlerin `_buffer`'ı dolu kalabilir →
      ölçümlerden önce `ctrl._buffer=0; _coyote=0` temizlenmeli (yoksa oyuncu kendiliğinden
      zıplar, kamera kelepçesi gerçek ~52px'i bozar). Tarayıcıda `press` sadece `keydown`
      üretir; `_keys` doluysa sonraki press `_down` doldurmaz → bot her kare
      press+release yapmalı.

---

> **HEDEF (06.10.2026, kullanıcı isteği — Star Climber v2 oynanış revizyonu):**
> Kullanıcı şikayetleri (index.html): (1) düşmanlar gözükmüyor, ekranda sarı coinler
> kalıyor, oyun penceresi tarayıcıya sığmıyor — GÖRSEL; (2) climber: zıplayınca platform
> görselleri duruyor, platformlar aşırı yakın, otomatik sekme var — OYNANIŞ.
> Görsel kök nedenler BULUNDU + DÜZELTİLDİ (SpriteRenderer kamera offset eksikti; CoinVisual
> active kontrolü yoktu; index.html CSS sığma formülü) — tüm testler yeşil (core 50/50,
> game 185, smoke 50/50, browser 47).
> Climber v2 (kullanıcı kararları): **manuel SPACE zıplama** (otomatik sekiş kalksın),
> **sürekli sabit hızla yükselen kamera** (oyuncu yetişmek zorunda), **kademeli zorluk +
> yükseklikte double-jump skill etkinleşir (pop-up bilgi)** + double-jump gerektiren
> aralıklar, **checkpoint kaldırılsın, high score kalsın**. Doğrulama: `test_game.js`
> TEST17 güncellenmiş geçer + smoke 50/50 + browser.
>
> **✅ TAMAMLANDI (06.10.2026) — etkileşimli görüşme sonrası. Aşağıya kalıcı kayıt 48 düşüldü.**

## OYUN KALAN (bekleyen oyun işleri, sıra kullanıcıyla)

> **HEDEF (28.09.2026, grup görevi — "yap hepsini"):** (1) prosedürel seviyede gerçek
> tilemap zeminleri (ızgara + katman), (2) overlay pause katmanı (`SceneManager` ile
> menü üstünde duraklatma), (3) zoom_punch burst bağlaması, (4) motor-UI kitini oyuna
> taşıma (menü/pause en az bir ekranda `deep_engine/ui.Button`). Doğrulama: py_compile
> + deep-tool 0 WARN/0 BUG/0 ERR + headless boot (pause + menü).
> **TAMAMLANDI (27.09.2026) — aşağıya kalıcı kayıt düşüldü.**

- **Yeni motor yeteneklerini oyuna bağlamak (27.09.2026 eklendi, motor özellikleri 2–5
  `02_engine.md`'de hazır):** seviye/builder tarafında `Tilemap` (gerçek ızgara zeminleri
  + katman) ve `PolygonCollider` ile **eğimli rampalar / çokgen platformlar** kullanılabilir;
  `SceneManager` overlay sahne (menü üstünde pause katmanı), `KeyframeAnimator` (UI/boss
  animasyonları, tween tabanlı), `Camera.zoom_punch` (boss vuruş anı). > RAMPA + düşman
  keyframe animasyonu + biyom fiziği TAMAMLANDI (aşağıya kayıt düşüldü). Kalan: tilemap
  zeminleri, overlay pause sahnesi, zoom_punch burst bağlaması (oyun oturumunda sırada).
  **> BU BLOK TAMAMLANDI (27.09.2026) — `_attach_ground_tilemap` + Pause overlay +
  zoom_punch aşağıya kaydedildi (grup görevi).**
- **Yeni motor 6+7 yeteneklerini oyuna bağlamak (28.09.2026 eklendi, `02_engine.md`'de
  hazır):** `Tilemap.to_segments()`/`to_data()` (veri katmanı — prosedürel zeminleri
  segment geometrisine dökmek / kaydedip yüklemek) ve motor-UI kiti (`Panel`/`Button`/
  `ScrollContainer`) — menü/pause/options ekranlarını kurarken kullanılabilir.
  (İlk somut aday: menüdeki Sonsuz Mod kilit satırını veya pause katmanını kit ile
  yeniden kurmak; oyun oturumunda sıraya alınır.)
**TAMAMLANDI (01.10.2026):** UI kiti → menüdeki Sonsuz Mod düğmesi + pause katmanı
   kit ile kuruldu (önceki oturum); **veri katmanı → aşağıdaki kayda bak.**
   **> BU BLOK TAMAMLANDI (01.10.2026) — oyun tarafı kalmadı.**
- **FİKİR (07.10.2026, strateji adayı — henüz talep edilmedi): prosedürel map
  biyom/seviye arttıkça BÜYÜSÜN/UZASIN.** Kullanıcı: "yok prosedürel mapi biom/seviye
  artdıkça büyütmeyi veya uzatmayı düşünebiliriz." Şu an `build_procedural_level`
  sabit `chunks=8`; kampanya biyomlar zincirleme ayrı seviyeler (Sonsuz Mod ayrı).
  Fikir: biyom ilerlemesi/seviye zorluk indeksi arttıkça chunk sayısı veya seviye
  uzunluğu artırılsın (ör. zorluk 0→8 chunk, zorluk 2→10-12 chunk) — Sonsuz Mod'da
  doğal "uzun turlar" hissi. Kullanıcı onaylarsa bu madde aktif göreve döner.
- **deneyim_iyilestirmeleri 5–8** (aşağıda, bu dosyaya taşındı — orijinal dosya silindi):
  1. (1–4 zaten uygulandı; 5 TAMAMLANDI, 6–7 uygulandı; 8 TAMAMLANDI — aşağıya bak.)
- **JS motoru ↔ Python parite denetimi (03.10.2026 eklendi, kullanıcı isteği):**
  Kullanıcı netleştirdi: istenen şey "oyun katmanını JS'e taşımak" değil, **JS
  motorunun Python ile aynı denklikte yazılması** — tarayıcı sürümü oynanabilir
  ve davranış olarak birebir aynı olmalı. Bulunan ilk gerçek parite boşluğu
  düzeltildi: `DE.Engine.set_scene()` sahneye `screen_width/height` atamıyordu
  (bkz. AÇIK RAPOR 4, yan bulgu). **Kalan:** modül modül API/karşılaştırması
  (`core/scene/game_object/components/input/render/physics` ↔ Python eşleri) ve
  bunu kilitleyen otomatik test. Not: aynı seed'te `random.Random` ile
  `mulberry32` **aynı kule düzenini üretmez** — denklik oynanış/API düzeyindedir.
  **> OYUN KATMANI TAMAMLANDI (05.10.2026):** 10 betiğin tamamı denetlendi
  (`main.py`↔`main.js`, `__init__.py`↔`DE_GAME` dahil) — sonuç ve **3 gerçek hata
  + 1 gerçek fark** için bkz. aşağıdaki "PYTHON ↔ JS OYUN KATMANI PARİTE DENETİMİ".
  Düzeltilmedi (kullanıcı kararı bekliyor). **Kalan:** motor modül modül
  (`core/scene/game_object/components/input/render/physics` ↔ Python eşleri) denetimi.

### Deneyim iyileştirmeleri 5–8
- **5. Dash after-image**: dash süresince arkada yarı-saydam oyuncu kopyası izi
  (dash_timer'ın sonucu; her ~2 kaybolan kopya, `_AutoRemove`). Hız arttıkça iz daha
  geniş/sık. (TAMAMLANDI — `entities.py` PlayerController dash after-image.)
- **6. Boss ölümü + zafer anı slow-mo ve enrage görsel evresi**: boss yenilince kısa
  ağır çekim + büyük patlama; HP <%50 (enrage) iken görsel evre — artık `_draw_enrage_aura`
  (tüm boss'lara `_draw_boss_bar` içinden otomatik) + ölüm slow-mo. (TAMAMLANDI —
  BOSSFX_OK testi.)
- **7. Uzun düşüşlerde hız çizgileri**: vy eşik (~900+) + düşme süresiyle ekran üst/
  alt kenarına inen çizgiler; vy normale dönünce kaybol. (TAMAMLANDI — `entities.py`
  PlayerController.draw hız çizgileri.)
- **8. Menüde kampanya ilerleme haritası**: geçilen biyom rozetleri; her boss yenilince
  menüde "tamamlandı"; savegame'a tamamlanan biyom listesi (kalıcı). (TAMAMLANDI —
  `ui.py` `BiomeProgress` rozet bileşeni, `scenes._campaign_sector_commit(biome)` ile
  savegame `completed_biomes` listesi; `i18n.py` `campaign_progress` + `biome_*` adları;
  testler: COMMIT_SAVE_OK + MENU_BOOT_OK.)

### OYUN TAMAMLANANLAR (27.09.2026 — motor özellikleri 2–5 + kemik oturumu)

- **Gerçek tilemap zeminler (grup görevi, TAMAMLANDI)**: `scenes.py`'de
  `_attach_ground_tilemap(scene, data)` — `build_procedural_level` sonrası Ground
  rect'lerini 32px grid'e rasterler (2 katman: üst = biyom `platform` rengi, alt =
  `platform_alt` toprak rengi); `TilemapGround` GameObject (tag="Tilemap") +
  `Tilemap(tile_size=32, offset=(min_x,min_y))`; solid Ground sprite'ları
  `SpriteRenderer.visible=False` ile gizlenir (collider fonksiyonu aynen durur, one-way
  adalar görünür kalır); `scene._tilemap_ground` + `_tilemap_segments = tm.to_segments()`
  köprüsü. build_endless_level + boss hariç tüm prosedürel seviyeler otomatik kapsanır.
- **Overlay pause katmanı (grup görevi, TAMAMLANDI)**: `deep_engine/scenemanager.py`
  `push/pop` (tek-overlay, alt sahne donuk kalır — `start()` yeniden çağrılmaz) +
  `Scene.transparent` + motor `on_escape` kancası; `ui.py` `build_pause_scene()` +
  `PauseController` (Panel + UI Kit `Button`, ESC devam / M menü / "Devam Et" pop /
  "Ana Menü" switch); `scenes._register_pause(scene)` tüm oyun sahnelerine bağlandı
  (menüde `menu_idle` → ESC çıkış korunur, oyunda ESC → pause). doğrulama headless:
  PUSH/POP_OK, MENU_ESC_OK, BOSS_ESC_PAUSE_OK.
- **Boss ölümü zoom_punch (grup görevi, TAMAMLANDI)**: `builders.on_boss_death` →
  `eng.active_scene.zoom_punch(1.18, 0.35)` (vuruş anı kamera çekmesi, slow-mo ile
  birleşir). Motor `Camera.zoom_punch` önceden hazırdı; artık bağlı.
- **Motor-UI kiti oyuna taşındı (grup görevi, TAMAMLANDI)**: pause ekranı
  `deep_engine/ui.Button` + `Panel` + `UITheme` ile kuruldu (ilk somut kullanım);
  i18n `pause_title/pause_hint/pause_resume_btn/pause_menu_btn` tr+en.
- **Menü Sonsuz Mod satırı UI kitine taşındı (28.09.2026, TAMAMLANDI)**: `build_main_menu_scene`
  M_RND artık metin satırı değil, Kit `Button`'ı (`game/ui.py` + yeni `KitLabelSync` bileşeni):
  kilitliyse `enabled=False` gri buton + LockIcon + kilit uyarısı; açıkken hover/press
  görünümü + tıkla endless başlar (tıklama yolları değişmedi: `_click_rect/_click_action` →
  MenuController `_dispatch_action`; durum değişmedi). `KitLabelSync` Button metnini i18n
  key ile her frame senkron tutar (dil değişiminde buton metni de güncellenir). Doğrulama:
  MENU_BUTTON_OK + MENU_UNLOCKED_OK + KIT_SYNC_OK + menü 90 frame headless OK + deep-tool
  `--lang en all` 0 WARN/0 BUG/0 ERR.
- **Müzik tema bağlama derinliği**: `scenes.py`'de merkezi `_play_theme(biome, is_boss=False,
  fallback="level")`; procedural, boss (`is_boss=True`) ve endless (`fallback="level"`)
  artık tek yerden tema seçiyor; ui.py victory yerinde. py_compile OK.
- **Sessiz-except / kullanılmayan import temizliği (DEVİR)**: deep-tool 3 WARN → **0 WARN,
  0 BUG, 0 ERR.** `builders.on_boss_death` boş `except AttributeError` kaldırıldı (doğrudan
  set), `_extract_ramp` eklendi, `_extract_platform` kazara bozulup düzeltildi,
  `tilemap.py` unused `Vector2` silindi.
- **Biyoma özel fizik (deneyim 4”üncü maddesi, TAMAMLANDI)**: `PlayerController`’ye
  `biome`/`biome_gravity`/`biome_jump`/`biome_grip`/`biome_wind` + `apply_biome(biome)`;
  gravity 1400×çarpan, zıplama `jump_force×biome_jump`, kayganlık `biome_grip` (velo
  blend) ve `biome_wind` (sürekli itiş) uygulanıyor; `build_procedural_level` oyuncuya
  `data["biome"]` ile bağlıyor. Değerler: ice(1.0/1.12/0.55/0), cave(1.25/0.9/0.85/0),
  desert(1.0/1.0/0.8/1.15), astro(0.6/1.15/0.9/0). Test: BIOME_PHYS_OK.

---

## DEVİR GÖREVİ — DeepTool tarama WARN'ları (game/ + main.py) — KAPANDI

> Kaynak: `python tools\deep-tool.py --lang tr all` (ARAÇ oturumu). BUG/ERR yok,
> yalnızca WARN. Tamamlanınca `sessions/03_game.md` ve `_shared.md` güncellenir.
>
> **SONUÇ (27.09.2026):** Madde 1 (sessiz `except` → `log.debug`/`log.warn`) ve
> Madde 2 (eksik extractor) tamamlandı; Madde 3 de 01.10.2026'da kapandı
> (aşağıya yazılı). Oyun tarafı tarama artık **0 WARN / 0 BUG / 0 ERR**.
> Aşağıdaki liste tarihsel deneme listesidir; açık iş DEĞİLDİR.

1. **Sessiz `except Exception: pass` → bilinçli hale getir** (yaklaşık 14 satır):
   - `game/entities.py`: L1354, L1550, L1563, L1612
   - `game/scenes.py`: L58, L219
   - `game/ui.py`: L324, L494
   - `game/builders.py`: L603
   - `main.py`: L36, L46, L53, L59, L74
   - Yön: best-effort olanlara `MotorLogger` debug/uyarı düş ya da except'i daralt;
     oynanışı değiştirme.
2. **Extractorsız tag (Modül 3 WARN)**: `game/builders.py` — `Coin`, `Player`,
   `Spikes` için `register_builder` VAR ama `register_extractor` YOK → editörden
   kaydedilen seviyede bu nesneler doğru seri hale gelmeyebilir. Kontrol et; eksikse
   extractor ekle (örn. `_register_level_builders` yanına).
3. **Modül 6 O(n²) incelemesi**: `game/entities.py` L143, L882 — düşman liste
   taramaları. Sabit küçük listeyse yanlış pozitif (kod değiştirme); her-frame büyüyen
   listeyse grid/bot taramaya çek.
   **KAPANDI (01.10.2026):** incelenen döngüler sabit literal (`range(4)`,
   `for side in (-1, 1)`) → yanlış pozitif; **kod değişmedi**. Bunun yerine araç
   tarafında Modül 6'ya kanıtlanabilir küçük-sabit tanımı geldi (`perf_small_loop`,
   ≤32) ve bu iki döngü INFO'ya indi; dinamik döngülerde uyarı duruyor.

Doğrulama: `python tools\deep-tool.py --lang tr all` → Modül 3 WARN kalmaz; Modül
1/7 oyun tarafı sessiz-except sıfır; playtest boot smoke hatasız.

---

## PLAYTEST / BUG DEFTERİ (kök nedenleriyle, geri referans)

Aşağıdakilar kullanıcı bildirimiyle teşhis edilip çözüldü; tekrar benzer sorun
görülürse önce buraya bak:

- **HTML'de paralaks hiç çizilmiyordu (03.10.2026, kullanıcı bildirimi
  "paralaks/coin yok, platformlar keskin")** — KÖK: `game/scenes.js` iki yerde
  `new DE.ParallaxBackground({ theme: meta["parallax_theme"] })` yazıyordu, oysa
  constructor **tek metin** alıyor (`ParallaxBackground(theme="forest")`). Tema bir
  nesneyle eşleşmediği için `layers.length === 0` kalıyor, arka plan hiç çizilmiyordu.
  DÜZELTME (çift savunma): (1) çağrı yerleri Python ile aynı biçime getirildi
  (`new DE.ParallaxBackground(meta["parallax_theme"])`), (2) constructor artık
  `"ice"` ve `{theme:"ice"}` ikisini de kabul ediyor.
  *Ölçüm:* Edge headless ekran görüntüsünde dağ/orman katmanı renkleri
  `rgb(25,32,50)` %6.5 + `rgb(30,48,70)` %5.5; gökyüzü çeşitliliği 33 → 285 renk.
- **Zemin (TilemapGround) en son ekleniyordu → en üstte çiziliyordu (03.10.2026)**:
  `_attach_ground_tilemap` nesneyi sahne sonuna ekliyor, sıralama ekleme sırasına
  göre olduğu için zemin zemine batan **oyuncu/coin/düşmanın üstünü kapatıyordu**
  (ölçüm: 80 nesnenin 64'ünde, zeminden sonra 16 nesne çiziliyordu).
  DÜZELTME: `tm_obj.z_index = -100` (tüm nesnelerin arkasında).
- **Coinler görünmüyordu (03.10.2026)**: kök neden zemin kapatmasına karışıyordu;
  ayrıca 18px altın daire her zeminde kontrast vermiyordu. DÜZELTME:
  `DE_GAME.CoinVisual` (koyu altın kontur + nabızlı üst-sol parlaması),
  `SpriteRenderer`'dan **önce** eklenir. *Ölçüm:* sarı piksel 232 → 942.
- **Platformlar "çok büyük ve keskin" blok gibi (03.10.2026)**: tek düz `fillRect`
  yüzeyi. DÜZELTME (`engine/tilemap.js`, `tilemap.textured=true`): yüzey karonun
  üstüne 2px açık şerit + 3px koyu kontur ("durulabilir zemin" okuması), açık
  sol/sağ kenarlarda 2px koyu şerit, derinlik gradyanı (yüzeyden aşağı koyulaşır,
  en derin %62) ve karo başına deterministik ±2 doku. `textured=false` eski düz
  davranışı verir (Python parity'si bozulmaz).
- **Bu 3 hata artık kalıcı kapıda (03.10.2026)**: `test_smoke.js` içine
  **40 görsel kapı** eklendi (her biyom için paralaks teması metin + katman > 0,
  zemin `z_index < 0` + doku + karo dolu, coin üretimi + `CoinVisual` + ekranda
  coin). *Mutasyon kanıtı:* paralaks çözümü bozulunca 35/40, `CoinVisual` ve
  `z_index` satırları silinince 30/40 — kapılar boş değil, gerçekten yakalıyor.
  Smoke artık **34 tur / 9382 kare / ~5.1M canvas çağrısı, 0 hata**.

- **Spawn spring süzülme + sonsuz jump**: spring player doğum noktası (x=60) →
  güvenlik bölgesine spring konmaz artık; ayrıca oyunun yavaş hissi yerinden.
- **"Dünya yavaş" 2. tur**: yerçekimi 1400, jump 620, fall boost 550, wall_slide 160,
  jump_cut -400 (tap 64px / hold 132px) — floaty zıplama sertleştirildi; ayrıca
  `powerup_slow` güvenli bölge dışına alındı, zaman katmanı motor seviyesinde erir.
- **Kırmızı devriye donma**: uçurum sondası spawn boşluğunda takılıyordu → derinlik
  18px + `_turn_cooldown=0.4`.
- **Düşman gömülü iddiası**: ölçüm hatası (üstepppki adalar zemin sayıldı); 21/21
  düşman ana zeminin 6px üstünde, gömülü değil.
- **Kampanya boss portalı açılmıyordu**: `on_boss_death` portalı dinamik arar
  (`tag=="Portal"` + `scene_key`); boss portaldan önce kurulurdu.
- **Giriş sahnesinde ölümde portal kopması**: restart `build_campaign_entrance`'e
  döner (portal boss'a bağlı kalır).
- **Editör çift yerleştirme**: `_place_object` iki kez çağrılıyordu → tek yerleştirme.
- **Sniper güvenlik bölgesi ihlali**: `_maybe_island` safe_max_x bilmiyordu → x<960
  tehdit yok artık.
- **Dash "işlemiyor can alıyor"**: koruma momentum penceresine genişletildi (madde 42).
- **Diken vuruş hissi (23.09.2026 rapor 1)**: dikenler SOLİD kaldıkça oyuncu üstüne
  "basıp" dikiliyordu (grounded), i-frame boyunca da üstünden yürüyebiliyordu ve
  temas anında sadece teleport-respawn vardı (bounce yok). Çözüm:
  `_build_spikes` → `BoxCollider(is_trigger=True)` (artık katı blok değil) +
  Hazard dalında `hitstop 0.05 + geri tepme (vx=-220, vy=-330) + shake 0.35 +
  parçacık`; `respawn` kaldırıldı (bounce artık konumsal sonuç). Doğrulama: repro —
  düşen oyuncu dikende durmuyor, bounce alıyor (bkz. rapor bölümü).
- **Diken görsel/cvp eşleşmesi**: üçgen uçları kutu üstüne yalnızca 2px taşıyor;
  trigger eşleşmesi ihmal edilebilir tutuldu (cosmetic, motor `SpriteRenderer`'da).

Doğrulama alışkanlığı: headless dummy SDL + gerçek Engine; boot smoke (menü +
kampanya giriş/boss 60–90 kare `_frame` hatasız); savegame test sonrası temizlenir.

---

### AÇIK RAPORLAR

**4. Tarayıcıda "C" çalışmıyor, oyuna giremiyorum — ÇÖZÜLDÜ (03.10.2026, iki ayrı hata).**
Kullanıcı tarayıcı sürümünü oynuyor ve menüden hiçbir şeye giremiyordu.
*Teşhis yöntemi:* Node içinde gerçek DOM olay zinciri kuruldu
(`tools_html/test_browser.js` bölüm 4b kalıcı test) — `keydown` → `Input` →
`main.js` → `_start_climber()` → karartma → `Engine.switch_scene`.

- **Hata A (asıl blocker): karartma hiç başlamıyordu.** `MainMenu._start_climber()`
  `_pending_factory`'ı ve `game_mode`'u ayarlıyor ama `_fade_dir` `__init__`'te
  **0** olduğu için `update()` şartı (`_fade_dir == 1`) hiç sağlanmıyor, `_fade`
  0'da kalıyor ve sahne **asla değişmiyordu**. `C` tuşu ve fare tıklaması
  sessizce hiçbir şey yapıyordu. Çözüm: `_start_climber()` içinde
  `_fade = 0` + `_fade_dir = 1` + `_fading_out = True` atanıyor
  (`game/ui.py` + `deep_engine_html/game/ui.js`).
- **Hata B (kafa karışıklığı): yatay tuşlar sanıldı.** A/D ve ← → çalışıyordu;
  oyuncu yalnızca sahneye hiç girilemediği için "tuşlar çalışmıyor" izlenimi
  doğuyordu. Doğrulama: sahneye girildikten sonra D 1 sn'de x 435→765,
  ArrowRight/ArrowLeft de oyuncuyu taşıyor.
- **Yarım kalan iş (aynı oturumda kapandı):** ESC tırmanış sahnesinde motoru
  kapatıyordu. `scene.on_escape` kancası eklendi (Python + JS) → ana menüye döner,
  oyun kapanmaz.
- **Yan bulgu (motor paritesi):** `DE.Engine.set_scene()` sahneye
  `screen_width/height` **atamıyordu** (Python `Engine.set_scene` atıyor). 900x600
  özel sahne kurulduğunda UI/kamera yanlış boyut kullanırdı. Düzeltildi.

**5. Tırmanışta oyuncu ekran dışına çıkıyordu — ÇÖZÜLDÜ (03.10.2026).**
Kullanıcı "oyun ekrana sığmıyor" dedi. Ölçüm (30 sn, girişsiz, 3 seed):
**1800 karenin 133'ünde (%7) oyuncu ekran üstünden çıkıyordu**, en kötü −46 px.
Kök neden: kamera yalnız yeni katmana inildiğinde `anchor − 600*0.62 = anchor − 372`
hedefine gidiyordu; ama sekiş tepesi (~390 px) bu çizgiyi **aşıyor**, yani
oyuncu 60 px'lik yüksekliğin tepesinde kamera hâlâ 372 px'deyken ekran dışında
kalıyordu. Çözüm (`FLOOR_LINE = 0.72` + `PLAYER_TOP_MARGIN = 96`):
`want = min(anchor − 600*0.72, player.y − 96)` → kamera hem katmanı aşağıda
tutar hem oyuncunun başını ekranda tutar. Doğrulama: Python 1800 kare **0 dışarıda**,
JS 1200 kare **0 dışarıda** (kalıcı test: "oyuncu hiç ekran dışına çıkmıyor").

**6. Platformlar "kaba" görünüyordu — ÇÖZÜLDÜ (03.10.2026).** Düz renkli tek kutu
yerine `ClimbPlatform.draw()` (Python + JS): alt gölge şeridi, sol/sağ pah, parlak
üst yüzey (basılan yer) + ikincil şerit, isabetle birlikte koyulaşan çatlaklar,
kontrol noktalarında bant + flama direği/flama. Ayrıca `ClimbBackdrop` (bina
cephesi): yan duvarlar, iç kenarlar, kat ayraçları (derinlik hissi). Piksel
sayımıyla doğrulandı: bir platformda **20 farklı renk** (eskisi düz kutuydü).

**7. Tarayıcıda oyun pencereye sığmıyordu — ÇÖZÜLDÜ (03.10.2026).** Canvas
sabit `900x600` piksel idi; küçük pencerede taşyordu. `index.html` CSS'ine
`max-width/max-height: 100vh; aspect-ratio: 900/600` eklendi — **dahili çizim
koordinatları değişmedi** (900x600 çizilir, sadece görüntü ölçeklenir).
`object-fit: contain` + `height: 100vh` gerekiyor, yoksa küçük pencerede dikey
taşma olur.

**8. Elle zıplama — BEKLEMEDE (kullanıcı cevabı yok).** Kullanıcı soruldu: tırmanışta
elle zıplama eklensin mi? Cevap gelene kadar mevcut otomatik sekiş korundu;
`climber_hint` ipucu ("A/D veya ← → yatay hareket") alt satırda gösteriliyor.

**1. Spike etkisi yetersiz — ÇÖZÜLDÜ (oyun 23.09.2026).** Kök nedenler incelendi:
- *bounce/knockback yok* → doğruydu: temasta sadece teleport-respawn vardı. Artık
  trigger + sert bounce + hitstop + parçacık + shake (bkz. bug defteri).
- *görsel vs çarpışma alanı* → diken çizimi kutu içinde; fark yalnız 2px uç.
- *diken üstünde durma* → trigger olduğu için fiziksel "basıp durma" kalktı.
Doğrulama: `_spike_repro` senaryo B → eskiden oyuncu spike topunda grounded
kalıyordu; şimdi `grounded=False, vy=-283` (bounce).

**2. Yüzeye gömülme — ÇÖZÜLDÜ (MOTOR 02, 26.09.2026).** Motor tarafında kapatıldı
   (bkz. `02_engine.md` madde 22): tek-yön eşiği kalınlığa bilinçli
   (`<= max(4, rect2.height+6)`), derin nüfuzda merkez kuralı (dinamik merkez platform
   üst yarısındaysa üste çek), `Rigidbody2D.max_fall_velocity=1800` (tünel açan tek
   kare adımını engeller; fall boost hissi korunur). Doğrulama: repro A (vy 2600,
   1px üstten) → oyuncu platform üstü 156.0, grounded, gömülme 0; B (vy 1500) ve
   C (vy 300) de üste oturdu. Kampanya giriş sahnesi 90 kare headless hatasız.

**3. Mor düşman (Turret) yoğunluğu + ilk seviye saldırganlığı — ÇÖZÜLDÜ (motor+oyun,
26.09.2026).** Oyun tarafı (range 460, wake 330, min fire_interval 1.4s/2.0s) +
MOTOR (`02_engine.md` madde 22): `_place_chunk_enemies` `count = randint(1, 1+difficulty)`
(eski `1..2+difficulty`) ve mor düşman girişi KADEMELİ (kullanıcı isteği, 26.09):
difficulty<=1 (1. boss öncesi) → hiç yok; difficulty=2 (1. boss sonrası) → chunk'ın
~%40'ı turret çekebilir (seyrek, yığılmaz); difficulty>=3 (2. boss sonrası) → tam
ağırlık. Ölçüm (25 seed, 8 chunk): d1 → 0.71 düşman/chunk, turret **0**; d2 → 0.95,
turret 17; d3 → 1.18, turret 60; d4 → 1.49, turret 70.

**14. Güvenli temizlik — oyun tarafı** (26.09.2026): `entities.py` (4), `scenes.py` (2),
`ui.py` (2) içindeki bilinçli `except...: pass` fallback'lerine `# noqa: bilinçli`
etiketi kondu (davranış değişmedi; sadece "bilinçli" koddan okunur oldu). entities.py
(1457 satır) bölünmedi — kullanıcı kararı (risk yüksek, satır-fayda oturum değeri
düşük). Diğer ayrıntı: TAMAMLANAN 14'e ek; ayrıca `_shared.md` SON GELİŞMELER.

---

## PYTHON ↔ JS OYUN KATMANI PARİTE DENETİMİ (05.10.2026) — TAMAMLANDI

**Kapsam:** yalnız oyun dosyaları — `game/*.py` (referans) ↔ `deep_engine_html/game/*.js`
(+ `main.py` ↔ `game/main.js` + `game/__init__.py` ↔ `DE_GAME`). Motor tarafı
(`deep_engine/`, `deep_engine_html/engine/`) yalnız farkı açıklamak için **okundu**,
parite farkı sayılmadı, **hiçbir kod değiştirilmedi**.

**Yöntem:** 5 paralel dosya denetimi (entities / bosses / builders+scenes / ui+state /
climber+commands) + `main.py`↔`main.js` + `__init__.py`↔`DE_GAME` yüzey denetimi +
3 Node probe (bulgular çalıştırılarak kanıtlandı). Yapısal tarayıcı yalnız aday
çıkardı; kararlar dosya okumasıyla verildi.

> **RAPOR DOSYASI:** `deep_engine_html/PARITE_RAPORU.md` → **§7. OYUN KATMANI PARİTE
> RAPORU (05.10.2026)**. (Aynı dosya motor raporunu da taşıyor: §1-6.)
> **Temizlik de yapıldı:** dosyada §1-6'nın **ikinci bir kopyası** (§6 "DAVRANIŞSAL
> PARİTE ANALİZİ" bloğu, 128 satır) hem **çift yapıştırılmış** hem **bozuktu** —
> 21 harf CR/TAB karakterine dönüşmüştü (`udio.js`, `ender.js`, `est_audio.js`,
> `ween.py`, `ind_by_tag`, `cene.flash`, `andom.Random`, `.1.19`…). İçeriği §1-6 ile
> birebir aynı olduğu için o bozuk çift kopya **silindi**; dosya 0 CR / 0 TAB'a temizlendi.

### BETİK BAZLI SONUÇ

| Betik | Sonuç |
|---|---|
| `state.py` ↔ `state.js` | **Birebir** |
| `entities.py` ↔ `entities.js` | **Birebir** (JS'te oynanışsız `CoinVisual` fazladan) |
| `bosses.py` ↔ `bosses.js` | **Birebir** |
| `builders.py` ↔ `builders.js` | **Birebir** (16 builder + 13 extractor tag kümesi aynı) |
| `scenes.py` ↔ `scenes.js` | 2 gerçek fark (aşağıda #3, #4) |
| `ui.py` ↔ `ui.js` | **Birebir** |
| `climber.py` ↔ `climber.js` | Oynanış birebir; RNG algoritması farklı (aşağıda #5) |
| `commands.py` ↔ `commands.js` | 11 komut birebir; depolama arka ucu farklı (aşağıda #6) |
| `main.py` ↔ `main.js` | 2 gerçek fark (aşağıda #1, #2) + 2 kozmetik |
| `__init__.py` ↔ `DE_GAME` | İşlevsel eksik **yok** (yüzey farkı aşağıda) |

### GERÇEK FARKLAR (oyun dosyalarında)

**1. TÜM SFX SESİZ — kritik.** `deep_engine_html/game/main.js` **`DE.SoundFX.initialize()`
hiç çağırmıyor**; `main.py:78` çağırıyor. `audio.js` içinde `_generate_preset_sounds()`
yalnız `initialize()` içinden (`audio.js:76`) çağrılıyor ve `_sounds` sözlüğü başka hiçbir
yerden doldurulmuyor → `_sounds` boş kalıyor → `SoundFX.play(...)` **21 sesin hiçbirini**
çalmıyor. Etkilenen oyun çağrıları: `ui.js:234,260` `play("win")`; `ui.js:282,287,330,588,
594,611,614` `play("click")`; ayrıca `play_jump/play_powerup/play("shoot"|"coin"|"hit"|
"hurt")`. `play_music` kendi buffer'ını kendisi kurduğu için **müzik çalıyor**, SFX çalmıyor.
Kanıt (Node probe): `initialize()` öncesi `_sounds` = 0 anahtar (hepsi "SES YOK"),
sonrası 21 anahtar. Not: `audio.js:28-30` yorumu "üretim anında hazırlanır" diyor —
lazy yol hiç uygulanmamış. **`test_audio.js:89` çağırıyor, oyun yolu çağırmıyor** (bu
yüzden testler yeşil). **Kök neden 03.10.2026 motor denetiminde de görüldü**
(`_shared.md` "initialize() hiç çağrılmıyor → oyunda SFX yok"); burada **çağrı yerinin
oyun dosyası olduğu** (`game/main.js`) kesinleşti — motor `audio.js`'te değil.

**2. Açılışta menü müziği yok.** `main.py:86` `SoundFX.play_music("menu")` çağırıyor;
`main.js` hiç `play_music` çağırmıyor (yalnız `scenes.js:16` `_play_theme`,
`scenes.js:408` `"level"`, `ui.js:567` `"victory"` var; menü kurucusu hiçbirini çağırmıyor).
İlk açılışta menüde müzik çalmaz. Kanıt (probe): `build_main_menu_scene()` sırasında
`play_music` çağrısı **0**.

**3. `next: "campaign_boss"` portal yönlendirmesi farklı.** `scenes.js:416`
`_NEXT_SCENE_FACTORIES["campaign_boss"] = _portal_campaign_boss` kaydeder; Python
`scenes.py:32-35` yalnız `victory`/`menu` kaydettiği için `builders.py:154`
`campaign_boss` anahtarını bulamaz ve `build_victory_scene`'e düşer
(`builders.js:111` aynı fallback'i kullanır). Etki: **düz prosedürel seviyelerde** ve
web panelinden yüklenen özel seviyelerde `next:"campaign_boss"` taşıyan portal
Python'da doğrudan Zafer'e, HTML'de boss arenasına gider (aktif kampanya zinciri varsa
`cs.chain[cs.index], cs.difficulty, cs.index`). Kampanya giriş ve sonsuz yolları
**etkilenmez** — ikisi de `next_scene_factory`'yi sonradan açıkça override eder
(`scenes.py:377-386` ↔ `scenes.js:279-287`).

**4. `import_scene_tilemap` "yeni nesne" yolu bozuk.** `scenes.js:143-147`
`new DE.GameObject({...})` **object literal** ile çağırıyor; JS constructor **konumsaldır**
(`core.js:103 constructor(name, x, y, width, height, tag)`). Sonuç: `name` bir nesne olur,
**`tag = "Default"`** (Python `scenes.py:152-154` → `tag="Tilemap"`), konum `(0,0)`,
boyut `32x32`. Köprü (`_tilemap_ground` / `_tilemap_segments`) `fresh`'ten doğru kurulduğu
için **fizik doğru kalır → hata sessizdir**; ancak `find_by_tag("Tilemap")` bulamaz, yani
**her tekrar import mükerrer nesne ekler**. Kanıt (probe): boş sahneye import sonrası
`find_all_by_tag("Tilemap")` = 0. `_attach_ground_tilemap` (`scenes.js:96`) **doğru**
konumsal formu kullanıyor → hata yalıtılmış, tek dal. Mevcut test bu yolu kapsamıyor:
`test_game.js:501` yalnızca zaten tilemap'i olan sahneyi kontrol ediyor.

### PLATFORM / KOZMETİK FARKLAR (bilinçli veya zararsız)

**5. RNG algoritması farklı.** `climber.py:321` `random.Random(seed)`;
`climber.js:77-84` `mulberry32` (`climber.js:272`). Aynı seed aynı kule düzenini üretmiyor
→ **denklik oynanış düzeyindedir, birebir tekrarlanabilirlik değildir** (bilinen,
kabul edilmiş platform farkı).

**6. Tilemap kayıt arka ucu farklı.** `commands.py:156-187` `<user_data>/<ad>.tilemap.json`
dosyası; `commands.js:135-195` `localStorage["derinengine_tilemaps_v1"]` içinde
`"tilemap_data." + ad` anahtarı (Node'da bellek deposu). `commands.js:136-138` bunu bilinçli
belgeliyor. Komut davranışı ve mesajları birebir; yalnız web paneliyle paylaşım yok.

**7. `entities.js` yalnız-ekstra `CoinVisual`.** Python karşılığı yok. **Hata DEĞİL:**
03.10.2026'da "coin görünmüyordu" hatası için bilinçli eklenmiş bir görsel düzeltme
(`_shared.md` 3. görsel hata kaydı) — motor render farkını oyun tarafında kapatıyor.
Oynanışa katkısı yok, `DE_GAME` dışına da aktarılmıyor.

**8. Pencere başlığı.** `main.py:80` `"Star Collector Hero"` ↔ `main.js:7`
`"DerinEngine HTML"`. Kozmetik.

**9. Boot logu yok.** `main.py:33-63` `motor.log` + `excepthook` + `[BOOT]` izleri;
`main.js` bunları yapmıyor (tarayıcı konsoluna düşüyor). Gözlemlenebilirlik farkı, oynanış farkı değil.

### BİREBİR DOĞRULANANLAR

- **entities:** 12 sınıf, tüm metotlar ve sayısal değerler aynı. Şüphelenilen
  jump/coyote farkı **YANLIŞ çıktı**: Python sınıf varsayılanı da `560.0` / `0.06`;
  builder'daki `jump_force=620.0` iki tarafta da aynı (`builders.py:350` ↔
  `builders.js:297`). `TutorialBanner._advance` JS'te `update` içine gömülmüş.
- **bosses:** BossController / Flying / Sniper / Cosmic / Shield — faz, enrage, kalkan,
  rüzgâr, lazer ve tüm sayısal değerler birebir.
- **builders:** tag kümeleri birebir (`builders.py:619-634` ↔ `builders.js:539-554`;
  extractor `636-648` ↔ `556-568`, yalnız kayıt sırası farklı = işlevsel değil). Ramp,
  Turret clamp, trigger Spikes ve Player UI aynı.
- **ui + state:** tüm bileşenler, menü / zafer / oyun sonu / pause, sabitler aynı.
  `_hide_menu_ui` / `_restore_hud` yokluğu **yanlış pozitifti** — JS `ui.js:247-249`'da
  aynı davranışı inline yapıyor. `state.js` içindeki `DE_GAME` yapısal artifaktı
  işlevsel değil.
- **climber:** tüm sabitler (FLOOR_LINE 0.72, PLAYER_TOP_MARGIN 96 …) ve 15 metot birebir;
  10 seed × 30 sn ölçümü her iki sürümde **0 ölüm**, aynı katman aralığı.
  **commands:** 11 komut birebir.
- **`__init__.py` ↔ `DE_GAME`:** 48 dışa aktarımın 36'sı `DE_GAME`'de birebir. Kalan 12
  işlevsel **eksik değil**, sadece erişim yolu farklı: 7 Python modül nesnesi
  (`game.entities`, `game.builders` …) → JS düz namespace (`DE_GAME.PlayerController`);
  `DE_GAME._builders` (`builders.js:574`) zaten mevcut. 3'ü
  (`campaign_state`/`game_mode`/`endless_state`) → `DE_GAME.state.*`. `_wake_up`
  (`entities.js:890`) ve `_register_level_builders` (`builders.js:538`, yükleme anında
  çağrılıyor) dosya-içi kalıyor — dışa aktarılmamış olmaları işlevsel boşluk değil.

### KAPSAM DIŞI GÖZLEMLER (motor — parite farkı sayılmadı, düzeltilmedi)

Alt raporlarda motor katmanında görüldü, oyun dosyaları dışı: SpriteRenderer kamera
offset, hit-flash, particle runtime. Kullanıcı "sadece oyun dosyaları" dediği için
**dokunulmadı**; 02 oturumuna devredilmedi.

### BU DENETİMİN KALANI

- **1, 2, 4** gerçek hata → düzeltme kararı kullanıcıya (kod değiştirilmedi).
- **3** gerçek fark → Python'a mı JS'e mi hizalayacağımıza kullanıcı karar verir.
- **5, 6, 8, 9** platform/kozmetik → kabul edilebilir; istenirse ayrı iş kalemi.
- Düzeltilirse kilitlemek için: `deep_engine_html/test_game.js` içine
  (a) SFX üretim kontrolü, (b) menü müziği kontrolü, (c) **boş sahneye
  `import_scene_tilemap` → `find_all_by_tag("Tilemap") === 1`** testi.

## SMOKE TESTİ STABİLİZASYONU (06.10.2026) — flaky ölüm giderildi

`test_smoke.js` 1-5 (2016) OYUNU BOZAR fix'leri + ESC/pause parite düzeltmeleri
sonrası ~%50 hata veriyordu. Araştırma (bisection): **yalnız `game/ui.js`'in ESC
kaldırması** smoke sonucunu değiştiriyor (tek başına 5/8), diğer dosyalar (scenes/
audio/input/main) 8/8 temiz. Kök neden:

- Python paritesi doğru davranış kazandık: HEAD'de ESC pause'u "kapatıp aynı karede
  yeniden açıyordu" (çift işleme); fix sonrası pause **gerçekten kapanıyor** → oyun
  kaldığı yerden sürüyor ve `campaign/play` turunda 40 kare "a" (sol) ile prosedürel
  seviyenin sol kenarından (x<0) boşluğa düşen oyuncu hasar alıp **ölüyor** → Game
  Over → sonraki turlar "dongu durdu" ile kaskat bozuluyor.
- HEAD'de bu ölüm yaşanmıyordu çünkü pause hiç kapanmadığı için oyun donuyordu
  (maskeli bug) — smoke aslında o bug'a güveniyordu.

**Çözüm:** `campaign/play` turundaki `a 40 kare` sürüklenmesi kaldırıldı; yerine
`a 12 + d 12` denge adımı (hareket yeteneği korunur, oyuncu güvenli bölgede kalır).
Doğrulama: **8/8 → 10/10 arka arkaya temiz**, ışık açıkken de 10/10.

**Durum:** smoke 0 HATA (34 tur, ~10.3k kare), 50/50 görsel kapı + 8 giriş turu.

## DASH İZİ + BİYOM FİZİĞİ MİNİMUM + PENCERE TAŞMASI (07.10.2026)

**HEDEF (kullanıcı isteği):** (1) dash izi kalıcı olmasın, (2) tarayıcıda oyun ekranı
pencerenin içine sığsın (taşmasın), (3) biyoma özel fizikler minimum tutulsun —
çift zıplama her biyomda AYNI; kum/buz hissi yalnız yüzey mini-efektleriyle verilsin.

**Yapılan (hepsi `deep_engine_html` = birincil):**
1. **Dash izi kalıcılığı bug'ı (entities.js ~248-253):** afterimage yaşlandırma
   (`g[4] += dt`) yalnız `if (this.dash_timer > 0)` bloğu içindeydi → dash bitince izler
   donup kalıcı oluyordu. Yaşlandırma **her update'e** taşındı; `age >= 0.18` olanlar
   havuzdan düşürülüyor. Dash sonrası `dash_momentum` + `return` korundu.
2. **Biyom fiziği minimum (entities.js `apply_biome` ~700):** `biome_gravity=1.0`,
   `biome_jump=1.0`, `biome_wind=0.0` **tüm biyomlarda AYNI** (normal + çift zıplama
   tutarlı). Yalnız `biome_grip`: ice → 0.55 (kaygan), diğerleri 1.0. Çöl squash
   (`squash_home_x=1.05 / y=0.93` grounded'ken) + **dash'te kum sıçrama partikülü**
   (desert: 4 adet `[220,180,110]`, ayak hizası offset `[0, size.y-4]`, şans 0.9 —
   diğer biyomda su efekti 2 adet `[100,220,255]`, şans 0.5).
3. **Pencere taşması (index.html CSS) — İKİ AŞAMALI:** İlk deneme
   `calc((100vh-26px)*1.5)` içindeki calc çarpması (`*`) CSS Values 4 — eski
   tarayıcılarda (Chrome <111, Firefox <108, Safari <15.4) geçersizdi → `width`
   iptal olup canvas 900px'e dönüyordu; çarpmasız eşdeğere çevrildi. **Ancak
   kullanıcı "hâlâ taşıyor" dedi ve asıl isteğini açıkladı:** canvas pencereye
   ölçeklenerek BÜYÜTÜLMESİN; tarayıcıda ayrılan çerçeve oyunun **ham çözünürlüğüyle
   birebir eşit** olsun. **KESİN ÇÖZÜM:** canvas `width:900px; height:600px` sabit
   tutuldu (ölçekleme/min() yok) → çerçeve taşması kökten biter.
4. **Yazı taşması (engine/render.js TextRenderer.draw) — PARİTE HATASI:** Python
   `blit` ile SOL-ÜST köşe tabanlı çizer; JS `fillText` BASELINE tabanlıydı → metin
   `y`'nin ÜSTÜNE doğru yükselir, `y=18` 42px başlık yarısı ekran dışına taşıyordu
   ("Star Collector Hero" üstte kesik). Fix: top-left semantiği + `ascent` ekleme;
   `center_y` yüzey yüksekliğine göre. Tüm menü/HUD yazıları artık Python ile aynı
   hizada. Doğrulama: game 194, core 50, smoke 50, browser 50, parity TAM.
5. **Pause menüsü sola kayma (game/ui.js):** Pause öğeleri 900x600 canvas'ta
   MERKEZLENDİ. Önceden Python'dan taşınan değerler canvas genişliği 900 iken
   sol-yaslıydı (panel 800 genişlik + başlık x=400 + butonlar x=300 → ortası 400,
   canvas ortası 450). Tarayıcıda açıkça sola kayık görünüyordu. Yeni konumlar:
   PauseDim 0,0,900,600 · başlık/ipucu x=450 · butonlar x=350 (200px → 350..550).
   **BİLİNÇLİ PYTHON SAPMASI:** Python `ui.py`'de aynı sol-yaslı değerler var but
   donmuş referansa dokunulmadı (JS birincil).

**Python tarafı (donmuş referans):** BİLİNÇLİ davranış sapması — Python afterimage
bug'ı ve agresif biyom fiziği DÜZELTİLMEDİ (Python'a yeni davranış eklenmez kuralı;
JS birincil). API adları (`apply_biome`, `biome_*`) aynı kaldığı için parity kapısı
TAM geçti.

**Doğrulama:**
- `node deep_engine_html/test_game.js` → **194 geçti** (TEST18 yeni: tüm biyomlarda
  jump/gravity/wind nötr, buz grip<1, çöl grip=1, dash sonrası izleri yaşlanıp silinir).
- `node deep_engine_html/test_core.js` → 50/50 • `node deep_engine_html/test_smoke.js` → 0 HATA
- `node tools_html/test_tools.js` → 36/36 • `node tools_html/test_browser.js` → 50/50
- `python tools/parity_check.py` → PARITE TAM • Python testleri → ALL OK
- Mağaza sayaçları Artık: **test_game.js 194 kontrol** (önceki 190).

**KALAN:** yok — üç istek de kapandı, tüm kapılar yeşil. Tarayıcıda elle doğrulama:
küçük pencere + buz biyoma girince kaygan, çölde dash'te kum.

---

## GAME OVER: BUTONLU MENÜ (07.10.2026)

**Kullanıcı:** "game over menüyü de butonlu yapalım."

**Önceki durum:** `build_game_over_scene` sadece 4 `TextRenderer` satırı (başlık,
alt başlık, "[R] veya [SPACE]'e Bas", "[M]'ye Bas") — fareyle tıklanamıyordu;
`GameOverController` yalnız R/SPACE/ENTER/M dinliyordu. Başlıklar sola kayıktı
(x=280/310/240/270, ekran merkezi 450).

**Yeni durum (`game/ui.js`):**
- Başlıklar **x=450** merkeze alındı (başlık + alt başlık `LocalizedLabel` ile
  dil değişiminde de güncellenir).
- **İki buton** (pause sahnesiyle aynı düzen/tema — kırmızı tonlu `UITheme`):
  `GO_RETRY` (350,290,200,46) **"Yeniden Dene"**, `GO_MENU` (350,350,200,46)
  **"Ana Menü"**; ikisi de `KitLabelSync` (dil değişince metin güncellenir,
  boyut sabit — `auto_size=false` düzeltmesi devrede). `on_click` → `_retry` /
  `_to_menu` (click sesi + `switch_scene`).
- Altta kısayol ipucu satırı `game_over_hint` (yeni i18n anahtarı, tr+en).
- **`GameOverController` genişletildi:** `_gameover_buttons` (scene üzerinde)
  + odak indeksi; ↑/↓ (S/W) gezinme, **ENTER/SPACE odaklı butonu çalıştırır**;
  klasik kısayollar **R yeniden dener, M ana menü** (korundu); **T** dil değiştirir
  (`set_text(..., null, false)` — buton geometrisi bozulmaz); `start()` sahnedeki
  butonları okur ve ilkini odaklar.
- Eski `game_over_restart` / `game_over_menu` i18n anahtarları kullanımdan
  çıktı (kalabilir; `game_over_retry`, `game_over_menu_btn`, `game_over_hint`
  eklendi).

**Test (`test_game.js`, TEST13c — 5 yeni kontrol):** 2 buton var; metinler
i18n ile eşit; butonlar simetrik 350..550; `_retry` on_click → restart fabrikası
1× çağrılır; `set_text(..., false)` ile boyut sabit. Sonuç: **0 FAIL**.

**Doğrulama:** game 0 FAIL, smoke 0 HATA, core 50, input 72, ui 33, audio 33,
tools 36, browser 50, parity 0 WARN/0 BUG.

---

## DİL DEĞİŞİMİNDE BUTON BOYUTU SABİT (07.10.2026)

**Kullanıcı:** "ana menüde veya oyun içinde (T) ile dil değiştirmeyi kapatmamız
gerekmesin ama ana menüde T basınca butonlar sadece metnin sığacağı kadar küçülüyor.
bu ayarlar menüsünde de oluyor (geri butonu). butonlar sabit dursun."

**Kök neden:** `DE.Button.set_text` (engine/ui.js) metni yazarken
`game_object.size`'i de metne göre yeniden hesaplıyordu. `KitLabelSync.update`
her karede yeni dildeki metni alıp `set_text` çağırınca dil değişiminde butonlar
(ana menü Play 280x54 / Settings 280x46, ayarlar Geri, pause Resume/Menu 200x46)
kendi GO ölçüsünden küçülüyordu. `Button.draw` metni bu `size`'e göre çizer →
hem görünür alan hem `_rect()` (tıklama) daralırdı.

**Çözüm (T tuşu KAPALI DEĞİL):**
1. **Motor — `engine/ui.js`:** `set_text(text, ctx, auto_size = true)`.
   `auto_size=false` → yalnız `this.text` güncellenir, boyut yazılmaz. Varsayılan
   `true` → Python davranışı birebir aynı (davranış paritesi bozulmadı; parite
   isim tabanlı, ek opsiyonel parametre Python'ı etkilemez).
2. **Oyun — `game/ui.js`:**
   - `KitLabelSync.update` → `set_text(text, null, false)` (ana menü + ayarlar geri
     butonu; LocalizedLabel'lar zaten TextRenderer, boyut dokunulmuyor).
   - `PauseController.update` T bloğu → `set_text(..., null, false)` (pause butonları).
3. **T tuşu yerinde:** global `engine/core.js` toggle + pause içindeki T bloğu —
   ikisi de çalışıyor; sadece buton geometrisi artık değişmiyor.

**Test:** `test_ui.js` yeni 2 kontrol: "set_text auto_size=false metin günceller" +
"boyut sabit" (31→33). Doğrulama: ui 33, game 0 HATA, smoke 34/34, core 50,
input 72, systems 73, audio 33, browser 50, tools 36, parity 0 WARN/0 BUG.

---

## AYAR SİMETRİSİ + ROZET TAŞMASI + MOBİL (DOKUNMATİK) KONTROLLER (07.10.2026)

**Kullanıcı:** "ayarlar menüsünde butonlar ve bazı yüzdeler kaymış onları simetrik
yap. bir de kampanya ilerlemesinin altında ki ikonlar çerçeveye sığmıyor altından
taşıyor gene. bir de mobil kontroller eklememiz gerek itchio tarayıcıda telefon
tabletlerde oynayabilsin nasıl yapcaz onu?"

**(a) Ayarlar simetrisi (`game/ui.js` build_settings_scene):**
- Kök neden: metin objeleri `TextRenderer(centered=true)` → obje x'i metin MERKEZİ;
  tıklama alanı da köşeden başlıyordu.
- Dil butonları: merkez 300/460 → **360/540** (ekran merkezi 450'ye göre simetrik);
  `_lang_button` içinde `click_rect = {x: cx-75, ...}` ile metne merkezli.
- Efekt/müzik satırları: 360/420/492 (ortası 426'ydı) → **378 / 450 / 478**
  (±72, ortası 450) — sayı metni tam merkezde.
- Geri butonu: x=450 iken merkez 560'dı → **x=340** (220 genişlik, 340..560, orta 450).

**(b) Kampanya rozetleri taşması (`game/ui.js`):**
- Neden: `BiomeProgress(x=300, y=556, badge=24, gap=62)` → etiket satırı
  `y + badge + 22 = 602` > ekran 600.
- Düzeltme: **x=245, y=524, badge=22, gap=52** → etiketler 568'de, ekranın altında
  32px pay (Version satırıyla çakışmaz); 5 rozet 245..477 aralığında merkez 360.
- Üst blok yukarı çekildi: cinfo 462→442, highscore 496→474, prog_title 532→504.

**(c) Mobil kontroller (nasıl yaptık — iki katman):**
1. **Sanal tuş API — `engine/input.js` (MOTOR):** `set_virtual_key_down/up`,
   `clear_virtual_keys`; `_virtual_held/_virtual_down/_virtual_up` setleri. Mevcut
   `get_key/get_key_down/get_key_up` bu setleri okur (klavye/gamedan ÖNCE):
   oyun kodu (`entities.js` `get_horizontal_axis` / `get_key_down("SPACE")` /
   `"F"` / `"LSHIFT"`) DEĞİŞMEDEN çalışır. `end_frame` sanal down/up'ı da sıfırlar
   (tek dokunuş = tek zıplama); `clear_virtual_keys` held'leri bırakıp up üretir
   (takılan tuş temizliği). Statik passthrough `DE.Input.set_virtual_key_down` vs.
2. **TouchControls bileşeni — `game/ui.js` (OYUN):** `is_ui` (kameradan bağımsız
   HUD). Aktivasyon: `navigator.maxTouchPoints > 0 || 'ontouchstart' in window`;
   masaüstünde `_active=false` → hiçbir çizim/dinleme yok.
   - **Sol alt analog joystick** (merkez 140,430, r=150, ölü bölge 18px): sola/sağa
     itiş → sanal **A/D**; **yukarı itiş → sanal SPACE** (zıplama butonuna alternatif).
   - **Sağ alt 3 daire buton**: Zıpla (780,490 r62 label "A"), Ateş (640,490 r56
     label "X"), Dash (860,535 r50 label "B"). Multi-touch: `touch.identifier` →
     buton map; zıpla+ateş aynı anda basılabilir.
   - Canvas `getBoundingClientRect` + `clientLeft/Top` + `width/cw` ölçeğiyle
     oyun koordinatına çevirir (CSS ölçekli mobil canvas'ta dokunma yanlış kaymasın).
   - `touch-action:none` + `preventDefault()` → sayfa kaydırma/zoom oyunu bozmaz.
   - `touchend/cancel` her parmağı kendi tuşundan bırakır; sahne yıkımında
     `_release_all` + `clear_virtual_keys`.
3. **Sahnelere bağlama:** `scenes.js::_register_pause(scene)` → `_attach_touch(scene)`
   (tüm kampanya/boss/endless sahneleri), `climber.js` build_climber_scene →
   `_attach_touch(scene)` çağırıyor. Tek obje "TouchUI" (etiket ile çift eklenmeden korunur).
4. **index.html:** `viewport` `viewport-fit=cover,user-scalable=no` + `touch-action:none`
   + `@media (pointer: coarse), (max-width:920px)` → `width:min(100vw, 100dvh*1.5);
   height:auto` (900x600 oranı korunur, ekrana sığar). **itchio iframe'inde de çalışır**
   (iframe'in touch olayları canvas'a düşer).

**BİLİNÇLİ SAPMA #6 (JS birincil):** sanal tuş API + TouchControls'ın Python'da
karşılığı yok (pygame'de dokunmatik hedef yok); Python donmuş referansı korunur.
Parite bozulmadı: denetim Python→JS yönünde eksik arar, JS'in fazlalığı serbest.

**Kullanıcıya cevap (nasıl yapcaz?):** itchio'nun HTML5 build'ü telefonda aynı
tarayıcıda açılır; dokunmatik olaylar canvas'a gelir → TouchControls sanal tuşlara
çevirir → oyun mevcut klavye okuma koduyla bilinmez. Dosya yükseltmesi gerekmez;
`index.html` tek dosya itchio'ya yüklenir (gerekirse tüm klasör/zip).

**Test kapsamı:**
- `test_input.js` **62→72 kontrol**: sanal tuş down/held/end_frame/up kenarı/clear
  + iki tuş tutuşu + get_horizontal_axis.
- `test_game.js` 0 FAIL, `test_smoke.js` 34/34 (touch cihaz mock olmadığı için
  TouchControls `_active=false` → smoke devredışı; mevcut turlar değişmedi).

**Doğrulama:** core 50, game 0 FAIL, smoke 34/34, input **72/72**, audio 33, ui 31,
systems 73, procedural 31, components 27, tween 33, math2d 38, tilemap 32, visual 16,
browser 50, tools 36, parity **0 WARN/0 BUG**, Python core+climber ALL OK.

**Tarayıcıda elle doğrulama (gerekirse):** Chrome DevTools → Toggle device toolbar
(iPhone) → sanal joystick + butonlar görünür, zıpla/ateş/shift çalışır; sağa/sola
itiş yürüyüş; Esc/ESC kapanış çalışır.

Kayıt: `_shared.md` (OYUN+MOTOR, bilinçli sapma #6).

---

## MENÜ: PLAY/SETTINGS + SAĞ ALTA İKİ KUTUCUK + AYARLAR EKRANI (07.10.2026)

**Kullanıcı:** "sonsuz modu kilitli gösteren tam gri botun hoşuma gitmedi. sağ alta
iki kutucuk ekle biri climber öbürü sonsuz mod olsun. üst kısımda sadece play,
settings dursun." Devamında: dili **butonlu** yapalım, ayrıca **ses düzeyi** ayarı
ekleyelim — **efekt ve müzik ayrı** olmak üzere. Alt bilgiler "orta altta dursun,
kutucuklarla çakışmasın" (onaylandı).

**Yeni ana menü düzeni (900×600):**
- Üst-orta: başlık (T1/T2) korunur. Alt bilgiler (M5 kontroller / HighScore /
  ProgTitle / Progress rozetleri) **sol-alt** (x=300-360), kutucuk bölgesi dışında.
- Üst-sağ: **M_PLAY** (yeşil kit Button, "Oyna/Play") + **M_SETTINGS** (lacivert,
  "Ayarlar/Settings"). Dil satırı **menüden kalktı** (Settings'e taşındı).
- Sağ-alt **kutucuklar** (`_menu_box` helper — `DE.Panel` + merkez TextRenderer +
  click zonu):
  - **M_RND Sonsuz Mod** (610,428,280×70): kilitliyken **gri DEĞİL**, canlı mor
    panel `[64,58,140]` + altın `LockIcon` + "(Kampanyayı bitirince açılır)" hâlâ
    tıklanabilir (`endless` action → kilit uyarısı). Kilitli değilse turkuaz.
  - **M_CLIMB Star Climber** (610,508,280×70): mavi panel, `menu_climber` metni
    ("Climber" içerir → TEST17 kuralı korunur), action `climber`.

**Ayarlar ekranı (`build_settings_scene` + `SettingsController`):**
- Butonlu dil: **Türkçe / English** tıklanabilir; aktif dil sarı renkle vurgulanır
  (`_refresh_lang_markers`); SaveGame `lang`'e yazılır.
- Ses seviyeleri: **Efekt** ve **Müzik** ayrı satırlar `[−] %NN [+]` (adım 0.1,
  `SFXVal`/`MusicVal` metni "…parse edilir"). Değerler SaveGame'e
  `sfx_volume`/`music_volume` olarak yazılır; `main.js` açılışta `SoundFX.set_*`
  ile uygular.
- ESC **veya** "← Ana Menü" butonu ana menüye döner (`DE.Engine.switch_scene`).

**Motor uzantısı (`deep_engine_html/engine/audio.js`):** `SoundFX.set_sfx_volume`
`set_music_volume` `set_volume(kind,v)` `get_sfx_volume` `get_music_volume`
`get_volume(kind)`; efekt sesleri `_sfx_gain` (ortak gain node) üzerinden akar,
müzik kullanıcı seviyeleri `_music_gain.gain.value`'ya bağlanır. Tümü 0..1 clamp.

**BİLİNÇLİ SAPMA #5 (JS birincil):** ses seviyesi API'sinin Python `audio.py`'de
karşılığı yok (donmuş referansa eklenmedi). Parite etkilenmez: denetim Python API'sini
JS'te arar; JS'in fazladan metodu serbest. Doğrulama: `python tools/deep-tool.py --lang tr 14`
→ **0 WARN / 0 BUG**.

**Test kapsamı:** `test_game.js` TEST10 (menü is_ui/zoom/vinyet) ve TEST17
(M_CLIMB isimli kutu + "Climber" metni + klik zonları + fade) değişmeden geçti;
`test_smoke.js` mouse/menu-clicks turu yeni klik zonlarını (Play/Settings/iki kutu)
34 tur boyunca sorunsuz gezdi. Yeni motif eklenmedi (mevcut testler yeni menüyü
zaten kapsıyor); ses volume için ayrı test_game kontrolü yazılmadı — audio.js
mevcut `test_audio.js` 33 pasif tetikleme ile ALL OK.

**Doğrulama:** test_game **0 FAIL (tüm kontroller OK)** — TEST10/TEST17 menü kuralları
(M_CLIMB kutu + "Climber" metni + klik zonları) değişmeden geçti; core 50/50,
audio 33/33, ui 31/31, smoke **34/34 (0 HATA)**, browser 50/50, tools 36/36,
tilemap+levelfile 32/32, parity **PARITE TAM**, Python `test_engine_core` +
`test_climber` ALL OK.
Tarayıcıda elle: menüde üstte Play/Settings, sağ altta iki kutu; Settings'ten dil
+ efekt/müzik seviyesi değişip ESC ile dönün.

**KALAN:** yok.

Kayıt: `_shared.md` (OYUN+MOTOR, bilinçli sapma #5).

---

## STAR CLIMBER: ZORLUK + GÖRSEL YENİLEME (07.10.2026)

**Kullanıcı:** "climber minigame'i hala istediğimiz gibi değil. Play store
minigameleri gibi zorlayıcı ve challenger olsun istiyoruz. Sadece space basarak
yükseliyorum bu zor değil. Minigame'deki player bizim ana player olsun sadece gözleri
olmasın. Arka planda mario/minecraft yeşili bir çevre olsun ve yükseldikçe arka plan
astro temasına dönsün."

**Zorluk mekaniği seçimi (kullanıcı):** HAREKETLİ / ENGELLİ PLATFORMLAR.

**Tasarım (JS birincil — Python'a eklenmedi, bilinçli sapma):**

1. **Zorluk katmanları (sadece 9. kattan itibaren, `HARD_FROM = 9`):**
   - **Hareketli** (%30): katman yatayda sinüs sarkaç (`MOVE_RANGE_MIN/MAX 30-70px`,
     `MOVE_SPEED 0.9-1.7 rad/sn`); üstündeki oyuncuyu sürükler (altından kayma).
     Genlik katmanla büyür (1.5px/kat). Çizimde ok işareti salınım yönünü gösterir.
   - **Dar** (%22): `NARROW_W_MIN/MAX 56-78px`; daha hassas ayak isteği.
   - **Dikenli** (%16): üst yüzeyde kırmızı üçgenler (`COL_SPIKE`); ayak basınca
     `_check_spike_under` → anında `respawn`. Çizim `COL_SPIKED` (yeşilimsi) + üçgenler.
   - Kırılabilir oranı %28→%18 (zorluk yükü dikenlere ve harekete kaydı).
2. **Hızlanan kamera (`_camera_speed`):** taban `CAM_SPEED 52→66`, her ulaşılan
   `max_floor` için +%1.2 (tavan ×1.8). Düşünce 0. katman hızına döner.
3. **Ulaşılabilirlik dinamikleştirildi (`_placement_overlap`):** dar katmanda
   örtüşme isteği `REACH_OVERLAP 70 → max(36, 70*w/96)` — dar katman yapılamaz
   olmaktan çıktı.

**Görsel (kullanıcı istekleri):**
- **Player = ana oyundaki gibi**: mavi (60,200,245) yuvarlak köşeli (r=6) gövde,
  `_climber_make_player` `SpriteRenderer` (düz kutu) yerine yeni
  `DE_GAME.ClimbPlayerVisual` kullanıyor. **GÖZLER ÇİZİLMİYOR** (kullanıcı isteği).
- **Arka plan (`ClimbBackdrop.draw` yeniden yazıldı):** `t = (START_Y - camY)/2400`
  (0 = karasal, 1 = astro):
  - Gökyüzü: gündüz mavisi → derin uzay moru (dikey gradient).
  - Alt alan: Minecraft tarzı yeşil çimen + toprak blokları (48px blok çizgileri),
    `t` ile koyulaşır/solar.
  - `t>0.05` iken yıldızlar belirir (30×t adet, hash konumlu), `t=1`de tam astro.
  - Yan duvar gölgeleri korunur (koyu mora döner).

**Test kapsamı (test_game.js TEST17 genişletildi, 5 yeni kontrol):**
- Kamera beklentisi 52→66 (base hız) güncellendi.
- Ardışık örtüşme testi `>=70px sabit` → dinamik `need = max(30, _placement_overlap(min width))`.
- Yeni: "yeşil çevre -> astro arka planı var", "climber player ana player görünümünde
  (mavi gövde)" (ClimbPlayerVisual var, SpriteRenderer yok), "zorluk: hareketli/dikenli/
  dar katman üretiliyor (9+)" (5 seed × incelendi).

**Doğrulama:** test_game (yeni dinamik örtüşme FAIL'i düzeltildi; tüm kontroller OK),
core 50/50, smoke 50/50, browser 50, tools 36, parity **TAM**. Python donmuş referans
değişmedi.

Kayıt: `_shared.md` (OYUN).

---

## ÜÇGEN RAMPALAR KALDIRILDI (07.10.2026)

**Kullanıcı:** "bu üçgen platformları kaldır demiştim? hala varlar."

Önceki analizde "çıkıntı platformlar = adalar + rampalar" denmişti; zemin görünümü
düzeltildi ama üçgen rampalar üretimde kalmıştı. Bu göreve netleşti.

**Yapılan:** `deep_engine_html/engine/procedural.js` üretim döngüsündeki
`DE._pr_maybe_ramp(...)` çağrısı kaldırıldı (fonksiyon tanımlı kaldı).

**BİLİNÇLİ SAPMA (#4):** Python donmuş referans `procedural.py::_maybe_ramp` hálá üretir;
JS üretmez. (Zemin grid'i gibi görsel/oynanış sapması.)

**DOKUNULMADI (dizayn gereği):**
- `builders.js` → `RampVisual` / `_build_ramp` / `_extract_ramp` + `register_builder("Ramp")`
  DURUYOR: web editörü / özel seviyelerde (`custom_levels/`) poligon eğimler hálá
  kullanılabilir.
- Motor eğim fiziği (`PolygonCollider`, `_polygon_surface_y`, physics.js eğim dalı)
  DURUYOR: test_core 50/50 (TEST14/15 ramp fizik).
- Boss arenası / kampanya rampa içermiyordu; üretim kaldırılınca etki sıfır.

**Doğrulama:** test_game 194 (0 HATA), core 50/50, smoke 50/50, parity TAM.

Kayıt: `_shared.md`.

---

## BOSS KÖŞELERİ: YUMUŞATILDI (07.10.2026)

**Kullanıcı:** "bazı bosslar gene düz kare, onlar da diğer her şey gibi köşeleri
yontulmuş dursun ya."

**Kök tespit:** Python `game/bosses.py` TÜM boss görsellerini `pygame.draw.rect(..., 
border_radius=...)` ile çiziyor:
- FlyingBoss: gövde `8`, gözler `4`, kanatlar `2`
- SniperBoss: gövde `8`, göz şeridi `2`
- ShieldBoss: gövde `10`, göz/ağız `2`
- BossController (archer) + paylaşılan `_draw_boss_bar`: sağlık barı `3`

JS portu `deep_engine_html/game/bosses.js` bunu `_fill_rect(ctx, color, sx, sy, w, h)`
→ düz `ctx.fillRect` ile çizmiş → **port sırasında yumuşak köşeler kaybolmuş**.

**Düzeltme (`bosses.js`):**
- `_round_rect_path(ctx, x, y, w, h, r)` yardımcısı (`ctx.roundRect` varsa kullan, yoksa
  `arcTo` fallback) + `_fill_rect`/`_stroke_rect`'e `radius` parametresi (0 = keskin, mevcut davranış).
- Beş boss sınıfı sırayla Python değerleriyle eşleştirildi:
  BossController gövde 8, gözler 2, ağız 2, bar 3 · FlyingBoss kanatlar 2, gövde 8,
  gözler 4 · SniperBoss gövde 8, göz 2 · ShieldBoss gövde 10, gözler 2, ağız 2, bar 3 ·
  CosmicBoss FlyingBoss'dan miras alır (aynı çizim).

**Doğrulama:** test_game (0 HATA), core 50/50, smoke 50/50, browser 50/50, tools 36/36,
tilemap 32/32, parity PARITE TAM. Python donmuş referans değişmedi (JS zaten Python
görünümüne çekildi).

Kayıt: `_shared.md` (OYUN).

---

## ZEMİN GÖRÜNÜMÜ: "KARE BLOK" DOKUSU KAPATILDI (07.10.2026)

**Kullanıcı:** "keskin köşeli kare geometri öncekine göre kötüydü; çıkıntı
platformlar da sinirimi bozdu. Proje bir yerden sonra sapıttı, nereden?"

**Kök analiz (git + Python karşılaştırması):**
- **23.09 (ilk sürüm `679fd56`):** zeminler `border_radius=4` ile **düz, yumuşak
  köşeli** rect'lerdi — ızgara yok.
- **27.09 (`30feff6` "Tilemap zeminler", Python):** zemin **32px ızgaraya**
  rasterize edildi (amaç: `Tilemap.to_segments()` → `.map`/editör geometri
  köprüsü). Bu, "kare bloklu" görünümün başlangıcı. JS'e 28.09 (`94706a2`) aktarıldı;
  02.10 (`3ed2cb7`) JS'e özgü `textured` dokusu (karo içi ton/çizgi) eklendi →
  kareleşme daha belirgin. Python'da `textured` YOK (düz `pygame.draw.rect`).
- "Çıkıntı platformlar": prosedürel adalar (tek yönlü, ta 23.09'dan beri) + rampalar
  (27.09). Python'da da var — parite, dokunulmadı.

**Karar (kullanıcı, ilk tur):** zemin kare ızgaradan **düz görünüme dönsün** →
`tilemap.js` `textured` default **false** yapıldı (Python gibi düz dolgu).
**Karar (kullanıcı, ikinci tur):** "kare grid değil, eski köşeleri yontulmuş yumuşak
tasarımı istiyorum; platformlar ince ama kareli görünüyor" → `textured=false`
yetersizdi. **Gerçek çözüm:** tilemap sahnede **yalnız veri köprüsü** olarak durur,
ÇİZİLMEZ (`scenes.js` `_attach_ground_tilemap` + `import_scene_tilemap`:
`tm_obj.active = false`); eski düz zemin sprite'ları **gizlenmez** → `border_radius=4`
yumuşak köşeli görünüm geri döndü (collider'lar fizik için durur). `_tilemap_segments`/
`to_data` editör köprüsü (webpanel) AYNEN çalışır, sadece görsel katman kapalı.
Kapılar: `test_game.js` "katı zemin sprite'ları gizlendi" → "görünür (düz tasarım)",
`test_smoke.js` → "tilemap gorsel kapali + veri yine dolu + zemin sprite'lari gorunur".

Doğrulama: game 194, core 50, smoke 50/50, browser 50, tools 36, tilemap 32, parity TAM.
Kayıt: `02_engine.md` + `_shared.md` (MOTOR).

## TÜM EKRAN METİNLERİ MERKEZLENDİ (07.10.2026)

**Kullanıcı:** "yaptığın her şeyde yazılar kayıyor, bunu bir kez daha tekrarlama;
game over arayüzünde de yazılar kaymış; hepsini direkt ortala."

**KÖK NEDEN (bir daha yaşanmamalı):**
`DE.TextRenderer(text, font_size, color, is_ui, shadow, center_x, center_y)` —
**4. parametre `is_ui`'dir, `center_x` 6., `center_y` 7. parametre.** `center_x`
verilmezse metin `position.x`'ten SAĞA akar (oyun sonu başlıkları 450'den sağa
kaymıştı), `center_y` verilmezse `position.y` ÜST kenar sayılır (başlıklar 23px
aşarıda durur). `draw` mantığı: `tx = x - w/2` (center_x), `ty = y - (asc+desc)/2`
(center_y), sonra `ty += ascent`.

**KURAL (bundan sonra tüm ekran sahneleri için):**
1. Tam ekran sahne metninde `center_x=true, center_y=true` **zorunlu**.
2. Yer değiştirirken `yeni_y = eski_y + font_size/2` (görsel konum aynı kalır).

**Düzeltilenler (game/ui.js):**
- **Game over:** t1/t2/hint — center hiç yoktu → true + görsel merkez (173/227/448).
- **Victory:** t1–t4 x = 180/240/290/250 → **450** (ekran ortası) + center true,
  gölge `[0,0,0]` eklendi; y = 148/222/303/420.
- **Pause:** title/hint center_y false → true, y 120→142, 182→190.
- **Settings:** title (40→61), dil/efekt/müzik etiketleri (130/250/360 → 140/260/370);
  `%NN` değerleri buton merkezine: SFXVal 292→**308**, MusicVal 402→**418** (butonlar
  288/398, h=40 → merkez 308/418); dil butonu metni 168→**180** (click rect y=160,
  h=40 → merkez 180).
- **Ana menü:** version satırı (15,575) sol-kenardan (450,582) alt-ortaya.
- **Climber (game/climber.js):** HUD/hint/popup 4 satır center_y false → true,
  y'ler fs/2 çekildi (22→35, 54→63, H-16→H-8, 0.42H→0.42H+15); center_x zaten true.

**Bilinçli hariç tutulanlar:** `builders.js` sol-üst HUD (ScoreUI/HealthUI/GoalUI/
InfoUI/PowerUpLabelUI/StreakUI) — `center_x=false, center_y=false` korunur, köşeye
hizalıdır (menü sahnesinin canlı arka planı olarak da görünür); oyun içi çizim
metinleri (boss bar, portal oku vs.) TextRenderer değil veya HUD kuralına tabi.

**DENETİM TESTİ (tekrarı engeller):** `test_game.js` **TEST13d** — 6 ekran sahnesi
(ana menü, ayarlar, game over, victory, pause, climber) dolaşılır; her
`TextRenderer` için `center_x === true && center_y === true` aranır; canlı-arka-plan
HUD'ı `LIVE_BG_HUD` istisna setiyle atlanır. Yeni metin ekleyen (merkezlemeden)
bu testi geçemez.

**Doğrulama:** 13/13 JS testi **0 FAIL** (game 182+, smoke 34/34, core 50, input 72,
ui 33, systems 73, audio 33, procedural, components, tween, math2d, tilemap, visual),
tools 36 + browser 0 FAIL, Python core+climber ALL OK, parity `--lang tr 14`
**0 WARN / 0 BUG / 0 ERR**. Kayıt: `_shared.md` SON GELİŞMELER.

**Dikkat (PowerShell):** `ui.js`'e `Get-Content`/`Set-Content` ile Türkçe dosya
işlemi YAPILMAZ - ANSI okuyup UTF-8 yazınca yorumlar bozulur; dosya `edit` tool ile
değiştirilir (karşılaştırma: `Select-String` konsol encoding'i yüzünden bozuk
gösterebilir, `Read` tool UTF-8 doğrular).

---

## KONSOL + KAMPANYA ROZETLERİ DÜZELTMELERİ (08.10.2026) — TAMAMLANDI

**HEDEF:** Kullanıcının bildirdiği 3 görsel/UX sorunu düzeltilecek:
(1) konsol açılınca ipucu yazısı çıktının üstüne biniyor; (2) konsol panelinde
fare tekerleğiyle kaydırma yok; (3) kampanya ilerleme rozetlerinin altındaki
biyom adları iç içe geçiyor. Doğrulama: mevcut testler + Node probe.

**Yapılanlar:**

1. **Konsol çakışması (`deep_engine_html/engine/console.js`):** En yeni çıktı
   satırı `panel_h-54`'e çiziliyordu; ipucu yazısı (`panel_h-54`) da aynı yere
   çiziliyordu → konsol açılır açılmaz ipucu, "Konsol acik..." çıktısının üstüne
   biniyordu. Çıktı alanı yeniden yerleştirildi (üstten 36px başlar, en yeni
   altta), ipucu `panel_h-54`, girdi `panel_h-28`. Artık hiçbir satır diğerinin
   alanına taşmıyor.
2. **Fare tekerleği kaydırma — GERÇEK KÖK NEDEN `input.js`'te bulundu
   (08.10.2026 güncellemesi):** Konsol `DE.Input.get_mouse_scroll()` istiyordu;
   o metod **ÖRNEK** metoduydu, oyun kodunun kullandığı **statik köprü tanımsızdı**
   (`input.js`'te `get_mouse_position/button/button_down` var, `get_mouse_scroll`
   yoktu) → tarayıcıda `DE.Input.get_mouse_scroll` = `undefined` → konsol hiç
   kaydırmıyordu (ilk Node probe bunu örnek-stub ile maskelediği için yakalanmadı).
   **Düzeltme:** `input.js`'e statik köprü eklendi
   `DE.Input.get_mouse_scroll = () => instance?._mouse_scroll` (JS uzantısı;
   Python `input.py`'de karşılığı yok — tarayıcı tekerleği `window wheel` →
   `_mouse_scroll` biriktirir, `end_frame()` sıfırlar; ScrollContainer da artık
   tarayıcıda gerçekten çalışır). Konsol tarafı: `scroll_offset` (gizli en-yeni
   satır sayısı) `_visible_lines` ile sınırlanır (yukarı=eski, aşağı=yeni, en
   altta clamp), yeni çıktı en alta döner, kaydırılmışken panel üstüne yeşil
   "(mouse tekerlegi: eskiyi gor - N satir yukarida)" gösterir, ipucu satırı
   tekerleği anlatır. Gerçek tarayıcı yolunu kanıtlayan probe: fake window +
   `wheel({deltaY})` → statik okuma → konsol update → `end_frame` sıfırlama.
3. **Rozet adı taşması — YAPICI ÇÖZÜM (font küçültme YOK)
   (`deep_engine_html/game/ui.js`, `BiomeProgress.draw`):** Kampanya menüsü
   `gap=52` (badge 22, kompakt düzen) iken 18px monospace "Mağara"/"Desert"
   ≈65px komşu yazıya biniyordu. Kullanıcı: "font küçültmekle çözmüşsün, daha
   yapıcı bir çözüm olabilir." → Artık etiketler **hep 18px okunur**; taşmayı
   **boşluk içeriğe göre genişler** çözer: en geniş etiket ölçülür,
   `dyn_gap = max(kurulu gap, geniş_en + 8)`; satır merkezi korunur
   (`start_x = merkez - (4·dyn_gap + s)/2`) yani göz ortalı kalır; her dilde
   otomatik uyum. Python referansı (`gap=86, badge=26`) hiç değişmez.

**Doğrulama:**
- `node deep_engine_html\test_core.js` → **50 OK**; `test_game.js` → **TEST17
  dahil 0 FAIL** (rozet testi `adlar=Orman,Mağara,Buz,Çöl,Uzay`); `test_input.js`
  → **72 OK**; `test_ui.js` → **33 OK**.
- Node probe (sahte ctx): çıktı/ipucu/girdi çakışması YOK; kaydırılmış çizim
  36..156, hedef alana taşmıyor. Tarayıcı-yolu probe (fake `window` + gerçek
  `wheel` eventi + statik köprü + `end_frame`): wheel -240 → scroll 4; +240 →
  0; end_frame sonrası birikim 0; instance yokken statik güvenli (0). Rozet
  geometrisi: gap 52'de `dyn_gap=73` → komşu etiketler arası boşluk ≥ 8px, font 18.

**Not (otorite):** `console.js` motor dosyasıdır ama kullanıcı doğrudan istediği
için bu oturumda düzeltildi; kayıt `_shared.md`'de. Sonraki motor işlerinde
konsol bu iki özelliği içerir.

---

## KONSOL METİNLERİ İNGİLİZCE + GİZLİ (inactive) KÖPRÜ KUSURLARI (08.10.2026) — TAMAMLANDI

**HEDEF:** Konsol metinleri ve komut açıklamaları düz İngilizce olacak; `T` dil
değişiminden etkilenmeyecek (literal dize, i18n değil). Doğrulama: mevcut testler.

**Yapılanlar:**
1. `engine/console.js`: "Commands:", "engine version: ...", "Console open. ...",
   "Unknown command: ...", "ERROR: ...", tekerlek ipucu satırları → İngilizce.
2. `game/commands.js`: tüm komut mesajları + help metinleri → İngilizce
   (hp/heal/god/coins/speed/jump/tp/respawn/tilemap_save/tilemap_load/list).
3. Eski Türkçe karşılaştırmalar testlerden temizlendi (`test_game.js` TEST14,
   `test_systems.js` açılış mesajı/version/Unknown/Komutlar:).
4. Doğrulama sırasında **3 gerçek kusur** daha bulundu ve düzeltildi:
   - `game/scenes.js` `import_scene_tilemap`: köprü `active=false` olduğundan
     `scene.find_by_tag("Tilemap")` (active filtreli) bulamıyor → her
     `tilemap_load` **mükerrer Tilemap köprüsü** yığıyordu. `find_all_by_tag` ile
     aranır oldu (Python köprüyü active tutar; JS görsel çift çizimden kaçınmak
     için inactive — import araması aktiflikten bağımsız olmalı).
   - `game/climber.js` `ClimbGame.start`: çift zıplama pop-up'ı `active=false`
     oluşturuluyor → `find_by_tag` bulamıyor → `game.popup` hep null →
     **oyunda pop-up HİÇ görünmüyordu.** `find_all_by_tag` ile çözüldü.
   - `test_game.js` TEST17 pop-up testi: önceki tırmanış testleri `best_floor=25`'e
     ulaştığından skill zaten açık ve pop-up kaybolmuştu → kilitli duruma dönüp
     mekanizmayı izole test ediyor (skill kilidi yeni tetiklenir).
   - `test_game.js` G3 testi: köprü bilinçli inactive olduğundan `find_by_tag`
     yerine `find_all_by_tag[0]` ile ad/konum/tag doğrulanıyor.

**Doğrulama:**
- `test_core` 50 OK; `test_game` **209 OK / 0 FAIL**; `test_systems` **73 OK**
  (İngilizce kontroller); `test_input` 72 OK; `test_ui` 33 OK; `test_audio` 33 OK;
  `test_smoke` 0 HATA.

**Not:** Konsol çıktıları literal İngilizcedir — `T` dil değişimi özlük yazılarını
değiştirmez. Python `game/commands.py` çıktıları Türkçe kalır; parite mesaj akışında
değil davranışta aranır.

---

## STAR CLIMBER: BİYOM YÜZEYİ + ÖLÜMDE YENİ HARİTA + YENİ PLATFORM ALGORİTMASI (08.10.2026)

**HEDEF:** Kullanıcı Gemini'ye Star Climber üretim promptu yazdırdı; Gemini Star
Collector evrenini bilmediği için atladı. Uygulanacak EVREN KURALLARI:
  1. Yüzey (zemin) ana oyundaki biyomlardan biri (astro hariç), rastgele/seeda göre;
     yükseldikçe astro'ya geçiş var ve astro'da OYUN BİTMEZ (devam eder).
  2. Her minigame açılışında ve her ölümde YENİ HARİTA üretilir (seed değişir) —
     aynı map iki kez oynanmaz.
  3. Savepoint YOK; rekor (high score) ölümde ve açılış boyunca kalıcı
     (`DE_GAME.state.climber_high`).
KULLANICI NOTU: "Platformlar çok üst üste biniyor, aşırı kolay oluyor; daha farklı
ve spesifik algoritmalar deneyelim." → Yeni platform yerleştirme algoritması:
NO-STACK (ardışık katman merkezleri en az NO_STACK_SHIFT kayar) + IN-BOUND TREND
(katman kenara yaklaşırsa merkeze çekilir) + yükseldikçe daralan platformlar +
hafif zorluk artışı. Birincil geliştirme JS tarafı (`deep_engine_html/game/climber.js`);
Python 08.10.2026'da silindi (eski kod git geçmişinde). Doğrulama: `test_game.js` (TEST17 + yeni TEST17b) +
mevcut testler + deep-tool. Kök kurallar korunur: tek yönlü, çift zıplama skilli,
kamera hep yukarı, örtüşme ("golden path"), kenar kelepçesi (void-death YOK —
kullanıcı "evren kuralları + hafif mekanik" kapsamını seçti).

**KALAN:** (bu görev TAMAMLANDI — 08.10.2026, aşağıdaki "TAMAMLANDI" bölümü)

---

## STAR CLIMBER OYNANABİLİRLİK DÜZELTİMİ (v2) — TAMAMLANDI (08.10.2026)

Kullanıcı şikayetleri: "(1) hâlâ spike trap var, hiç hoş değil; (2) dümdüz sağa sola
gitmeden zıplayabiliyorum; (3) daha yükseğe zıplayamayınca direkt ölüyorum (kısır
döngü); (4) arka plan hâlâ grid tabanlı." Kullanıcı ayrıca "hep hata yapıyorsunuz"
diyordu → bu tur KÜÇÜK, hedefli, doğrulanabilir değişiklikler yapıldı. Python
dondurulmuş; tümü `deep_engine_html/game/climber.js` + `test_game.js`.

**Yapılanlar (4 şikayet → 4 çözüm):**
1. **DİKENLER KALDIRILDI:** `SPIKE_CHANCE = 0.0`, dikenli dal `_build_floor`'dan
   çıkarıldı (spiked her katmanda `false`). Test "zorluk: diken YOK" oldu.
2. **YATAY HAREKET ZORUNLU:** kule artık dümdüz zıplamaya aldırış etmez:
   - `FREE_CLIMB` 8 → **3** (ilk 3 katman oyuncunun sütununda; sonrası özgür).
   - **Orta-sütun yasağı**: FREE_CLIMB sonrası katman MERKEZİ ekran ortasından
     (yaklaşık `CLEAR=72px`) geçemez → "sadece SPACE" botu artık 3-18 kat ile
     SINIRLI tırmanır (ölçülen: 7,9,10) ve ölüm döngüsüne girmez.
   - `NO_STACK_SHIFT` 44 → **110**, `REACH_OVERLAP` 70 → **46** (pencere genişler,
     zig-zag belirginleşir). Far-edge dalı AYNA kuralına çevrildi: `side===1`
     sağ uca, `side===-1` sol uca (`reachR>=reachL` simetrisinde hep sağa giden
     eski far-edge hatası düzeltildi — kule artık gerçekten zig yapar).
   - Doğru oynanış (örüşme şeridini hedefleyen bot) artık 30-60 kata çıkıyor →
     "yatay oynarsan kule yükselir" kanıtı teste eklendi.
3. **ÖLÜM DÖNGÜSÜ YUMUŞATILDI:** `DEATH_MARGIN` 80 → **140** (alt çizgi geç
   yükselir), `CAM_BOOST_CAP` 1.8 → **1.5**, `CAM_BOOST_PER` 0.012 → **0.008**,
   `DOUBLE_GAP_CAP` 60 → **52** (çift zıplama boşlukları adil). Dikenler zaten
   en büyük "ölüm tuzağı"ydı — kaldırıldı.
4. **GRID'SIZ ARKA PLAN:** `ClimbBackdrop.draw` — blok `strokeRect` ızgarası
   yerine **pürüzsüz tepelik arazi**: biyom toprak dikey gradyanı + iki sinüsün
   harmanlandığı yuvarlanışlı çim/kar/kum üst kenarı + ince parlak vurgu. Astro
   geçişinde yükseklikte azalma + renk karışımı korunur.

**Ayar yolu:** `NO_STACK_SHIFT`, `CLEAR`, `REACH_OVERLAP`, `FREE_CLIMB`, `ZIG_WINDOW`,
`SPIKE_CHANCE`, kamera ve ölüm sabitleri — hepsi `climber.js` üstündeki landa yorumlu.

**Doğrulama (hepsi yeşil):**
- `test_game.js`: **244 satır, 0 FAIL**. Yeni/güncellenen testler:
  - "ilk 3 katman oyuncunun sütununda" (FREE_CLIMB 3),
  - "orta sütunda katman yok (dümdüz zıplama engellenir)" — seed7'de en yakın 72px,
  - "dümdüz SPACE bot SINIRLI tırmanır" (3..18; ölçülen 7,9,10) + ölüm döngüsü yok,
  - "örüşme şeridi botu 20+ kata çıkar" (yatay oynanış kazanır; ölçülen 59,32,60),
  - "zorluk: diken YOK", NO-STACK eşikleri (bigOrt>=35, %50 >=30, maxDev<=170).
- 13 test dosyası: **0 FAIL** (test_game 244 OK dilimi).
- `python tools\deep-tool.py --lang tr 14`: **0 WARN, 0 BUG, 0 ERR.**
- `node --check` climber.js/test_game.js temiz.

> Bot metrikleri deterministik (mulberry32 seed'li): NO-STEER seed7/99/2024 = 10/7/9;
> STEER (örüşme şeridi) = 59/32/60. "SPACE-only" ölçümü ve "örekli bot" g/1 kayıt.

---

## STAR CLIMBER YÜKSELTME — TAMAMLANDI (08.10.2026)

Kullanıcı: "platformlar çok üst üste biniyor ve aşırı kolay oluyor; daha farklı
ve spesifik algoritmalar deneyelim" → evren kuralları + hafif mekanik kapsamıyla
`deep_engine_html/game/climber.js` geliştirildi (Python dondurulmuş, değişmedi).

**Yapılanlar:**
1. **Biyom yüzeyi:** `CLIMB_BIOMES` paleti (forest/cave/ice/desert — astro hariç,
   adlar `DE.PR_BIOME_NAMES` ile birebir). `ClimbGame._pick_biome()` seed'a göre
   deterministik seçer; `ClimbBackdrop.set_biome()` ile arka plan/gökyüzü/çimen-toprak
   o biyomun renginde çizilir, yükseldikçe astro'ya geçiş korunur (astro'da oyun bitmez).
   Platform rengi de biyom paletinden.
2. **Ölümde YENİ HARİTA:** `_regen_map()` — yeni seed (eskisiyle asla aynı olmaz),
   yeni yüzey biyomu, tüm katmanlar sıfırdan; skill (çift zıplama) REKOR GİBİ kalıcı
   (sıfırlanmaz; `_check_skill` best_floor'a bağlı olduğu için yeniden popup açmasın
   diye). `respawn()` bu haritayı üretir, 0. katmana döner.
3. **Rekor kalıcılığı:** `DE_GAME.state.climber_high` — ölümde ve minigame açılışında
   kalır (savepoint yok). Yeni `ClimbRecord` HUD'u (y=88, "Rekor {floor}"/"Record
   {floor}" i18n) açılışta kalıcı rekoru gösterir; `_update_progress` rekoru yazar.
4. **Yeni yerleştirme algoritması (`_place_floor_x`):** mevcut 3 sert kural (ilk kule,
   örtüşme golden-path, FREE_CLIMB) aynen korundu; üstüne:
   - `NO_STACK_SHIFT` (44px): ardışık katman merkezleri en az bu kadar kayar.
   - `IN-BOUND TREND` (`TREND_PULL` 0.30): önceki merkez ekran ortasma ne kadar
     uzaksa yeni katman o kadar merkeze çekilir; kule kenara takılıp sürüklenmez.
   - Dengede `ZIG_WINDOW` (3) katmanda yön değiştiren zig-zag.
   - Tam shift sığmazsa (dar-dar komşu) EN UZAK UCA itilir (0.02px iç pay — fp
     1e-4 sapması örtüşme>=need garantisini bozmasın).
5. **Altitude shrink + zorluk:** `_platform_w(index)` — genişlik eğrisel daralır
   (SWEEP 1..30, 100-158 → 56-100). MOVE_RANGE_MIN 36, MOVE_SPEED_MAX 1.9,
   NARROW_CHANCE 0.24, SPIKE_CHANCE 0.18.

**Doğrulama:** `test_game.js` → **222 OK / 0 FAIL** (mevcut 209 + yeni 13 TEST17b:
üst-üste binme/trend/shrink metrikleri, biyom determinizmi+astro-hariç, regen'de seed
değişimi+rekor korunumu, rekor HUD+state). Tüm 13 test dosyası yeşil; deep-tool
`--lang tr 14` → **0 WARN, 0 BUG, 0 ERR**. İzlenen metrikler: seed7 dar-dar dahil
all-pairs ortShift=37 (≥30:%64), geniş komşular ortShift=51 (%100 ≥30), maxDev=101
(sınırlar içinde), low=122/high=97 (daralma).

---

## PY OYUN KODU SİLİNDİ — OTURUM NOTU (08.10.2026)

Kullanıcı kararı: ORTA parite farkları (M1–M11) JS'te kapatıldıktan sonra Python
tarafı **tamamen silindi** — `game/*.py` (9 dosya: builders, bosses, climber,
commands, entities, scenes, state, ui, __init__), `main.py`, `tests/`
(`test_engine_core.py`, `test_climber.py` — "madde 47" kapısı), `deep_engine/`.
- **Oyun KALAN listelerindeki py referansları geçersiz:** py test kapıları (climber
  headless oynanış vb.) artık `test_game.js` + `test_smoke.js` ile JS tarafında
  kapatılır; "py'de nasıldı?" → `git show e6bf3e8:game/...`.
- **Dikkat:** `deep_engine_html/game/*` (JS) etkilenmedi — tüm oyun testleri yeşil
  (13 dosya, 0 FAIL; browser 51/51). Eski py playtest kayıtları bu dosyada
  **tarihsel** olarak kalır; yeni bulgular JS playtest defterine yazılır.
- py webpanel/pydeep-tool çalıştırmaya devam eder ama py oyunu başlatamaz
  (bilinçli — webpanel'in "main.py başlat" butonu hata verir, 04_tools.md'de not).

---

## DENETİM + SADELEŞTİRME — OYUN KATMANI (08.10.2026)

Kullanıcı görevi kapsamında (`_shared.md` SON GELİŞMELER → TAMAMLANDI kaydı)
oyun katmanına yapılanlar (spagetti temizliği — davranış değişmedi):

- **D1 — bosses aim/beam 3-kopya birleştirme:** SniperEnemy (entities.js),
  SniperBoss ve CosmicBoss (bosses.js) havadan aşağı nişan alma +
  lazer ateşleme/çizim bloklarını aynı yazmıyordu. Ortaklar:
  `DE_GAME._beam_aim_phase(boss, phase, player)` (entities.js üstü),
  `_boss_fire_beam(...)` + `_boss_draw_beam(...)` (bosses.js dosya-içi).
  SniperEnemy `__aim_state` → `_aim_state` (6 yer). iframe farkı korundu:
  Sniper 0.14s, Cosmic 1.15s.
- **D2 — düşman prelude helper:** `_enemy_prelude(e, dt, stop_x)` (entities.js
  satır 50) — PatrolEnemy/FlyerEnemy/TurretEnemy (standart) + HopperEnemy
  (`stop_x=true`: rb hızı sıfırlama dahil). SniperEnemy kendi özel uyanış
  bloğunu korudu (nişan sıfırlama).
- **D3 — scenes.js helper'ları:** `_scene_from_data(data, name)` +
  `_wire_player_restart(scene, restart_fac)` — build_procedural_level ve
  build_campaign_boss sahne kurulumu ile entrance/boss/endless restart
  bağlantısı tekliliği.
- **D4 — PlayerController.update 325 → 30 satır:** iç bloklar 8 metoduna
  bölündü (`_update_ground_effects/_powerups/_squash_effects/_dash/_movement/
  _jump/_actions/_ui`); `_update_dash` true döndürünce gerisi atlanır. **Not:**
  bölme sırasında kopya-hatasıyla Dash tetikleyici bloğu (`get_key_down("LSHIFT")`
  + kick_camera + burst) silinmiş, testler kırmızı verince fark edilip geri kondu.
- **Doğrulama:** `test_game.js` **224 OK / 0 FAIL** — Star Climber v2 ile birlikte
  yeşil (klimber testleri artık FAIL vermiyor; önceki 3 FAIL diğer oturumun canlı
  düzenlemesindendi ve o oturum bitirdi). Diğer 12 test de 0/0.
