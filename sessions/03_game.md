# OYUN OTURUMU — Star Collector Hero (game/)

> Bu oturumun görevi: **oynanabilir oyunu** (Star Collector Hero) geliştirmek — oyuncu,
> düşmanlar, boss'lar, menüler, kampanya, UX, playtest düzeltmeleri. Oyun `game/` +
> `main.py` dosyalarında; motor API'lerine `deep_engine.*` (mutlak import) ile bağlanır.

> **KAYIT RUTİNİ:** Her iş bitince ÖNCE `sessions/03_game.md` (bu dosya; tamamlanan/
> KALAN/bug defteri), SONRA `sessions/_shared.md` (SON GELİŞMELER + karşı oturum
> etkisi) güncellenir. Ama iş bitmeden oturum dosyasını terk etme.

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

---

## OYUN KALAN (bekleyen oyun işleri, sıra kullanıcıyla)

- **Biyoma özel fizik** — her biyomun kendine has hissiyat/yörekdiligi (UX paketinin
  4. ve son maddesi).
- **deneyim_iyilestirmeleri 5–8** (aşağıda, bu dosyaya taşındı — orijinal dosya silindi):
  1. (1–4 zaten uygulandı; liste 5–8'de devam ediyor.)

### Deneyim iyileştirmeleri 5–8 (bekliyor)
- **5. Dash after-image**: dash süresince arkada yarı-saydam oyuncu kopyası izi
  (dash_timer'ın sonucu; her ~2 kaybolan kopya, `_AutoRemove`). Hız arttıkça iz daha
  geniş/sık. (dash ramp + kamera kick zaten var, görsel iz eksik.)
- **6. Boss ölümü + zafer anı slow-mo ve enrage görsel evresi**: boss yenilince kısa
  ağır çekim + büyük patlama; HP <%50 (enrage) iken görsel evre (renk/kıvılcım) — şu
  an yalnız fire_interval*0.75 ile daha hızlı ateş var, görsel fark yok.
- **7. Uzun düşüşlerde hız çizgileri**: vy eşik (~900+) + düşme süresiyle ekran üst/
  alt kenarına inen çizgiler; vy normale dönünce kaybol. (fall boost + dust zaten var.)
- **8. Menüde kampanya ilerleme haritası**: geçilen biyom rozetleri; her boss yenilince
  menüde "tamamlandı"; savegame'a tamamlanan biyom listesi (kalıcı).

- Diğer bekleyen adaylar: kamera menü/hit degrade ince ayarları (büyük kısmı A2'de
  bitti), düşman doğuş gecikmesi ince ayarı, i-frame ince ayarı.

---

## DEVİR GÖREVİ — DeepTool tarama WARN'ları (game/ + main.py)

> Kaynak: `python tools\deep-tool.py --lang tr all` (ARAÇ oturumu). BUG/ERR yok,
> yalnızca WARN. Tamamlanınca `sessions/03_game.md` ve `_shared.md` güncellenir.

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

Doğrulama: `python tools\deep-tool.py --lang tr all` → Modül 3 WARN kalmaz; Modül
1/7 oyun tarafı sessiz-except sıfır; playtest boot smoke hatasız.

---

## PLAYTEST / BUG DEFTERİ (kök nedenleriyle, geri referans)

Aşağıdakilar kullanıcı bildirimiyle teşhis edilip çözüldü; tekrar benzer sorun
görülürse önce buraya bak:

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