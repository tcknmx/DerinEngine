# DerinEngine — Paylaşılan Bilgi (Çapraz-Oturum)

Bu dosya, oturumlar arası "diğer oturumların da haberi olsun" kayıtlarını ve ortak
bilgiyi tutar. Her oturuma başlarken **SON GELİŞMELER** bölümünü oku. Kendi oturumunun
yarım işi buraya YAZILMAZ (o, kendi oturum dosyanda `KALAN` olarak durur).

---

## SON GELİŞMELER (kronolojik, en üstte en yeni)

- **[OYUN-HTML] M5: deneyim iyileştirmeleri 5–8 doğrulandı (28.09.2026,
  `01_strategy.md` [2] M5).** Kod tarafı (after-image, boss enrage aurası +
  zafer slow-mo 0.9/0.28 + zoom_punch, düşüş hız çizgileri, menü kampanya
  rozetleri + `completed_biomes`) **zaten birebir port edilmişti**; iş
  doğrulamaydı: `test_game.js` **TEST15** 30 check → **116/116**. Tuzak: menü UI
  nesneleri `build_main_menu_scene()` sonrası `_objects_to_add`'te bekler —
  `scene.start()` çağrılmadan `scene.game_objects` içinde görünmezler (rozet
  testi bu yüzden önce boşaldı). İkinci tuzak: oyuncu uzun boşluktan düşerse
  `position.y > 900` kurtarması devreye girip `respawn` yapıyor; iniş testi
  zemine yakın bırakılmalı.

- **[OYUN-HTML] M4: konsol komutları + motor `_frame` davranışları port edildi
  (28.09.2026, `01_strategy.md` [2] M4).** `game/commands.py` portu:
  `deep_engine_html/game/commands.js` (yeni, `DE.register_command` ile 9 komut:
  hp, heal, god, coins, speed, jump, tp, respawn, list; `tp` hız sıfırlar;
  index.html'e builders.js sonrası eklendi). motor `deep_engine_html/engine/core.js`
  eksik davranışlar Python `core.py` ile birebir: konsol aç/kapa
  (`BACKQUOTE`/`QUOTEDBL`; açıkken sahne donar, konsol üstte çizilir), `T` dil
  değiştirir + savegame'e "lang" yazar, `F3` debug katmanı (`_draw_debug_overlay`),
  `run()` sahne yoksa throw. Testler: test_game **TEST14** → **91/91**,
  test_browser BÖLÜM 4'e 2 boot konsol check'i → **33/33**, test_systems **S6**
  (motor `_frame` için sahte canvas+Input) → motor **365/365**, tools 24/24.
  Etkilenen: HTML portu bakımını yapan oturum (browser konsolu artık oyun
  komutlarını da çalıştırır). Pygbag `main.py` dalına gerek yok — main.js rAF
  döngüsü zaten doğal karşılık.

- **[OYUN-HTML] M3.1 görsel kontrol + gerçek boot testi — gizli MenuFX bug'ı
  yakalandı (28.09.2026, `01_strategy.md` [2] M3 sonrası; M1 KALAN kapanışı).**
  M1 "tarayıcıda görsel kontrol" görevi **tamamlandı**: `test_game.js`'e **TEST13
  görsel çizim smoke** — her sahne türü (prosedürel+tilemap, boss arenası, menü
  zoom+vinyet, sonsuz, zafer, oyun sonu, pause, FadeOverlay) Proxy stub canvas'a
  çizilir (`makeDrawCtx`), 78/78. `tools_html/test_browser.js`'e **`bootGame()`**:
  index.html sırasıyla engine+oyun dosyaları vm'de yüklenir, DOMContentLoaded ile
  `main.js` gerçekten boot edilir, rAF pump + keydown/up dispatch → yeni **BÖLÜM 4**
  (8 check). Bu boot testi **iki gerçek bug** yakaladı: (1) `builders.js`
  top-level `const _rgb` ↔ `engine/ui.js` top-level `function _rgb` paylaşılan
  global scope'ta `SyntaxError: Identifier '_rgb' has already been declared`
  fırlatıyordu → builders.js `_rgb` → `_rgb_arr` (10 kullanım) çözüldü; (2)
  `build_main_menu_scene`'de `scene._hud_ui` hesaplanırken `...scene._objects_to_add`
  dağıtılması **MenuFX'i** `_hud_ui`'ye sokuyordu → `MenuController.start()`
  `active=false` yapınca menü klavye girişleri hiç çalışmıyordu (P/SPACE menüden
  çıkamıyordu!). Çözüm: Python `ui.py:529` ile birebir — `_hud_ui` yalnızca
  `scene.game_objects`'ten filtrelenir (MenuFX henüz `_objects_to_add`'tedir →
  hariç kalır; HUD objeleri `_build_player`'dan gelip `game_objects`'tedir →
  gizleme korunur). İzole repro ile doğrulandı: 2 pump sonrası menü kamerası
  yakınlaşır, `P` sonrası `camera_manual=false`+`zoom_to(1.0)`+`set_vignette(0.22)`,
  HUD 0/7 gizli, menü 12/12 gizli. **test_browser.js 31/31, test_game 78/78, motor
  353/353, tools 24/24.** Etkilenen: `ui.js`, `builders.js`, `test_game.js`,
  `test_browser.js`; **Py motor ve Py oyun DEĞİŞMEDİ**. M4 sıra: `game/commands.py`
  + pygbag onaylı `main.py` giriş dalı.
- **[OYUN-HTML] M3 UI derinliği (28.09.2026, `01_strategy.md` [2] port planı
  M3).** `ui.js`: menü kamerası CLOSE-UP zoom (`MENU_ZOOM=1.8`,
  `camera_manual`, `_place_menu_camera`) + `set_vignette(0.5)`; kampanya
  başlayınca `camera_manual=false` + `zoom_to(1.0)` + `set_vignette(0.22)`.
  `FadeOverlay` bileşeni + MenuController çapraz geçiş alanları (`_fade`,
  `_fading_out`, `_pending_factory`) eklendi — **dormant, Python'la birebir**
  (Python'da `_pending_factory` hiç set edilmez). `engine/core.js`:
  `Scene.destroy` + `_objects_to_destroy` (Python `scene.py:117/381` eşi,
  FadeOverlay kendini siler). `scenes.js`: `_attach_ground_tilemap` (Python eşi)
  `build_procedural_level`'e bağlandı — zemin rect'leri 32px Tilemap'e rasterize
  (yüzey id1 + alt toprak id2), katı zemin sprite'ları gizlenir (one-way adalar
  kalır, çarpışmalar aynen), `_tilemap_ground`/`_tilemap_segments` köprüsü.
  **Boss giriş duyurusu İPTAL** (Python'da karşılığı yok — parite korunur).
  **`test_game.js` 75/75 ALL OK.** Süitler yeşil: motor 353/353 + browser 23/23
  + tools 24/24. Etkilenen: `core.js`, `ui.js`, `scenes.js`, `test_game.js`;
  **Py motor ve Py oyun DEĞİŞMEDİ**. M4 sıra: `game/commands.py` (konsol
  komutları) + pygbag onaylı `main.py` giriş dalı.
- **[OYUN-HTML] Boss M2 tamamlandı — gerçek boss arenası (28.09.2026,
  `01_strategy.md` [2] port planı M2).** `deep_engine_html/game/bosses.js` YENİ
  (Python `game/bosses.py` birebir portu): `BossController`/`FlyingBoss`/
  `SniperBoss`/`CosmicBoss`/`ShieldBoss` + paylaşılan boss bar/`_draw_enrage_aura`;
  canvas çizimleri (fillRect/arc/line). `builders.js`: `register_builder/extractor
  ("Boss", ...)` + `_build_boss` (Python `_build_boss` eşi: flying/sniper/cosmic
  trigger+rigidbody YOK, shield/archer Rigidbody+katı; `next`→`scene_key`;
  `on_boss_death` → slow-mo 0.28 + shake + `zoom_punch(1.18,0.35)` + patlama +
  portal unlock + `campaign_defeated` etiketi). `scenes.js`: `build_campaign_boss`
  M1 kabuğu → **gerçek arena** (`procedural_generate_boss_arena`; boss UI; ölümde
  aynı girişe dönüş; `_exit`: final→zafer, değilse sonraki biyom). **Motor
  `Scene`'e zoom katmanı eklendi** (Python `scene.py` eşi): `zoom_to`/
  `zoom_punch`/`set_vignette`/`flash` + `camera_zoom_target`/`_zoom_punch_timer`/
  `_vignette`/`hit_flash` + draw'da zoom ölçekleme + vinyet (gradyan feature-guard).
  `index.html`'e `game/bosses.js` (entities'ten sonra, ui'dan önce).
  **`test_game.js` 63/63 ALL OK** (TEST8b: arena kurulumu, boss tipi/hp, kilitli
  portal, ölüm→portal açılır+slow-mo+zoom punch, çıkış sonraki giriş, astro
  cosmic→zafer+endless_unlocked). Tüm süitler yeşil: motor 353/353 + browser 23/23
  + tools 24/24. Etkilenen: HTML oyun (3 dosya + index.html) + `core.js`;
  **Py motor ve Py oyun DEĞİŞMEDİ**. M3 sıra: menü zoom vinyetini kullanmak +
  FadeOverlay + tilemap + boss giriş duyurusu.
- **[OYUN-HTML] Star Collector Hero portu M1 oynanabilir çekirdek (28.09.2026,
  `01_strategy.md` [2] port planı).** `deep_engine_html/game/*.js` portu ilerledi:
  yeni `state` (paylaşımlı `DE_GAME.savegame()` tekil profili — Python tek
  `_save` karşılığı) · `entities` (PlayerController/HUD/GoalPortal/coin/streak/
  dash/ateş; `_spawn_float_score` dünya koordinat düzeltmesi) · `ui`
  (menü/pause/zafer/oyun sonu + MenuController, sonsuz kilidi) ·
  `scenes` (prosedürel seviye, kampanya zinciri Fisher-Yates + astro final,
  **boss M1 kabuğu** belgeli stub, Sonsuz Mod, restart/death wiring) ·
  `builders` (17 builder + extractor; **Boss builder M2'ye kadar yok**) ·
  `main`. **`test_game.js` 51/51 ALL OK**; tüm süitler yeşil: motor 353/353,
  browser 23/23, tools 24/24. Motor ekleri: `core.js` `_frame` ESC/`on_escape`
  (Python `_handle_escape` karşılığı), `input.js` statik `get_mouse_position`.
  Etkilenen: HTML oyun+2 motor dosyası; **Py motor ve Py oyun DEĞİŞMEDİ**.
  M1 KALAN: tarayıcıda görsel kontrol ✅ (M3.1'de TEST13 draw smoke + gerçek boot
  testiyle kapatıldı — üstteki kayıt; iki gizli bug bulundu); ayrıca `Scene.draw`
  kamera zoom uygulamıyor → M3'te menü yakınlaştırma/vinyet/FadeOverlay eklendi
  (M3.0).
- **[HTML MOTOR] G10 — input tam denkliği (28.09.2026, `01_strategy.md`).**
  kullanıcı isteği: "html motoru py motora denk istedim, yarım yamalak değil".
  `input.js` artık `input.py` ile birebir: **(a)** oyun kumandası (Gamepad API,
  `begin_frame()` kare başında tarama, analog eksen + ölü bölge 0.2, D-Pad→hat,
  buton kenar algılama, **Python BUTTON_MAP ile aynı** SPACE/ENTER→A·F→X·LSHIFT→LB·
  ESCAPE→Start), **(b)** `get_key_up`, **(c)** fare 3 buton, **(d)** klavye haritası
  (LSHIFT/RSHIFT·TAB·BACKQUOTE·QUOTEDBL·KPENTER·F1–F12), **(e)** `get_axis`/
  `get_hat`/`get_horizontal_axis`. **`test_input.js` 58/58 ALL OK**; 11 motor süiti
  353/353 + `test_browser.js` 23/23 + `test_tools.js` 24/24. Etkilenen:
  `deep_engine_html/engine/input.js` (yeniden yazıldı) + `core.js` (begin_frame);
  Py motor ve oyun değişmedi. **HTML motor artık bağımsız & py'ye denk** — [2] SCH
  tam portu sırada.
- **[ARAÇ] HTML motor denklik + gerçek tarayıcı davranışı testi (28.09.2026,
  `04_tools.md` madde 17).** kullanıcı raporu "web panelde diğer pencerelere
  tıklanmıyor, demo oyunda zıplanmıyor" → üç gerçek hata bulunup düzeltildi:
  (1) `end_frame()` hiç çağrılmıyordu (one-shot input durumları hiç temizlenmiyor);
  (2) `Scene.update` is_grounded'ı obje update'LERİNDEN ÖNCE sıfırlıyordu (py sırası
  kare-sonu çözüm); (3) `webpanel.html` file:// ile açılınca ham `%TEMPLATES%` →
  SyntaxError → tüm tıklamalar ölü. Çözüm: `core.js` `_frame` kare-sonu `end_frame`,
  is_grounded sırası py'ye eşitlendi; webpanel tipik `panel-data` JSON bloğu +
  güvenli varsayılanlar + `loadMods/loadLevel().catch` fallback. **Yeni
  `tools_html/test_browser.js`** (vm tabanlı, sıfır bağımlılık): demo zıplama/
  is_grounded/input edge + served sekme/modal/HTTP + raw file:// → **23/23 PASS**,
  `test_tools.js` 24/24 (degrade yok). **Etkilenen:** HTML motor `core.js` +
  `webpanel.html/js`; **oyun Py/JS koduna ve Py motoruna dokunulmadı.** ⏳ madde 17
  COMMIT sırada.
- **[ARAÇ] Oyun dışı araçlar JS/HTML'e port edildi — iki motor aynı güçte
  (28.09.2026, `04_tools.md` madde 16).** `tools_html/`: **deep-tool.js** (13 modül +
  find/new/run + `--api` + TR/EN; **hem `*.py` hem `*.js` tarar** — Modül 8 motor
  saflığı hem `deep_engine/` hem `deep_engine_html/engine/` için, Modül 4 i18n
  ikili, Modül 9 seed determinizm js `procedural.js`), **webpanel.js** (Node http,
  port **8766**; `webpanel.html`; route'lar birebir, `/api/scan|find|new|modules`
  aynı süreçte deep-tool.js çağrısı, `/api/script|run|launch` hâlâ python spawn),
  **test_tools.js** (24/24 PASS). Kısayollar: `deep-tool-js.bat`, `webpanel-js.bat`,
  `test-tools-js.bat`. Modül 1 syntax yalnız `.js` (py derlenemez), Modül 7 parity
  (AST-boş-except + unreachable multi-line skip; 314→13 WARN). **Etkilenen:** araç
  (py sürümleri 8765'te aynen durur), oyun/motor Py ve JS tarafı DEĞİŞMEDİ.
  ✅ COMMIT: `ef73b42` (push `88cfdcb..ef73b42`).

- **[HTML MOTOR] G8 (sistemler) + G9 (sürüm) tamam — G1–G9 bitti (28.09.2026,
  `01_strategy.md`).** scenemanager.js (SceneManager register/switch/push/pop +
  overlay), log.js (MotorLogger eşik + handler), i18n.js (TR/EN birebir tablo),
  savegame.js (localStorage), console.js (DevConsole + register_command +
  typed-text), audio.js (SoundFX → WebAudio: 21 preset ses + preset riff +
  algoritmik biyom stereo müziği), procedural.js (generate + generate_boss_arena:
  güvenli açılış bölgesi, zorluk ölçeği, boss tipi). Input'a typed-text eklendi.
  `test_systems.js` 47/47, `test_audio.js` 28/28, `test_procedural.js` 31/31.
  G9: `DE.__version__`/`__engine_name__` core.js. **10 test süiti ALL OK; 21 dosya
  tam tarayıcı yüklemesi OK.** Etkilenen: strateji (artık [1] bitti — [2] SCH portu
  sırada).

- **[HTML MOTOR] G7 UI kit tamam (28.09.2026, `01_strategy.md`).** ui.js: UITheme
  (varsayılan palet + override), Panel, Button (hover/press/focus/disabled + tıklama
  geçişi + ENTER aktivasyon), ScrollContainer (tekerlek + tutamaç sürükleme + on_pick +
  hovered_index + kırpma). Scene.draw artık UI nesnelerini (`_is_ui_object`) kameradan
  bağımsız, en üstte çizer (Python scene.py davranışı). Input.js Python ile eşitlendi:
  `get_mouse_button(b)` (basılı), `get_mouse_button_down(b)` (basılma anı),
  `get_mouse_scroll()`, `is_controller_active()`, `_gamepad_a_down()` + wheel eventi.
  `test_ui.js` 31/31. Tüm 7 test süiti ALL OK; 14 dosya tam tarayıcı yüklemesi OK.
  **Etkilenen:** strateji (G8/G9 kaldı).

- **[HTML MOTOR] G4+G5+G6 tamam (28.09.2026, `01_strategy.md`).** **G4:** tween.js
  (ease_* 9 fn + Tween + TweenComponent + _Chain zinciri) `test_tween.js` 33/33.
  **G5:** parallax.js (6 tema + kayan yıldız) + lighting.js (LightSource pulse +
  LightingEngine carve, mask önbelleği) `test_visual.js` 16/16. **G6:** tilemap.js
  (katman/get-set/place_at_world/solid_at/to_data/from_data/to_segments + culled draw)
  + levelfile.js (register_builder/place_object/save_level/load_level/extractor) +
  Scene'e kamera takibi + parallax_background bağlandı. `test_tilemap_levelfile.js`
  32/32. Tüm gerileme: test_core 12/12, test_math2d 38/38, test_components 27/27.
  13 dosya tam tarayıcı yüklemesi OK. **Etkilenen:** strateji (G7–G9 kaldı).

- **[HTML MOTOR] G2 + G3 tamam (28.09.2026, `01_strategy.md`).** **G2:** math2d.js
  (SAT/polygon/circle/segment) + physics.js'te CircleCollider + PolygonCollider —
  `test_math2d.js` 38/38 OK. **G3:** engine/components.js — Animator, KeyframeAnimator,
  BouncePad, Health (i-frame), Projectile, PowerUp, BreakablePlatform, SpawnIn,
  _AutoRemove; Scene.update artık **Python `_handle_physics_and_collisions` mantığı**:
  spatial grid (CELL=128) + `on_collision` bildirimi + statik solid çözümü (min_overlap/
  vy koşulları — BouncePad hayatta kaldı). `test_components.js` 27/27 ALL OK; gerileme:
  test_core 12/12, test_math2d 38/38. index.html'e particles.js + components.js eklendi.
  **Etkilenen:** strateji (HTML MOTOR planı G4–G9 kaldı) + araç (sıradaki motor işleri).

- **[STRATEJİ+HTML] Yeni plan: py motor eşitliği → SCH portu → tırmanma oyunu
  (28.09.2026, `01_strategy.md`).** Kullanıcı: "ikisini de plana yaz; önce py motorun
  tüm bileşenlerinin tamamını HTML yapalım." MASTER SIRADAKİ'ye **HTML MOTOR (05)**
  eklendi: G2–G9 grupları (çarpışma/SAT, oynanış bileşenleri, Tween, partikül+parallax+
  lighting, tilemap+levelfile, UI kit, SceneManager+consol+log+i18n+audio+savegame+
  procedural). Sonra: **SCH tam portu** (image dosyasız, kod-çizim şekiller birebir) ve
  **sonsuz tırmanma oyunu (Icy Tower mekaniği — kırılan platformlar)**. KARAR LOGU madde 12.
  **Etkilenen:** tüm oturumlar — yeni motor işleri HTML hattında.

- **[HTML MOTOR] DerinEngine HTML çekirdeği kuruldu (28.09.2026, `04_tools.md`).**
  İlk A1–A4 adımı: `deep_engine_html/` — saf tarayıcı JS, %0 kütüphane, Node(demo için
  gerekmez, geliştirmede var). Aynı Python API'si taşındı: `Vector2/Component/GameObject/
  Scene/Engine` (core.js), `SpriteRenderer/TextRenderer` (render.js), `BoxCollider/
  Rigidbody2D/Physics` (physics.js — min-nüfuz çözümü, one-way, max_fall), `Input` (input.js).
  Demo: `index.html` + `demo/main.js` — kutu (+çift zıplama) kutu zıplama sahnesi
  (yerçekimi 1400, jump 620 — Python SCH değerleri). Doğrulama: `node --check` 5 dosya OK,
  `node deep_engine_html\test_core.js` 12/12 `ALL OK` (düşme/zıplama/motor/çift zıplama/
  one-way/max_fall). commit `TBD`.
  **Fizik bug'ı yakalandı:** solve'de kendi collider'ı solids listesine dahil olunca oyuncu
  kendini taşıyordu → `s === rb.collider` atlaması; ayrıca Y-ekseni velocity sıfırlamıyor,
  X-ekseni dikey nüfuzu duvar sanıyordu → min-nüfuz (dxL/dxR/dyT/dyB) çözümü.
  **Etkilenen:** tüm oturumlar — yeni motor işleri HTML hattında planlanacak.

- **[STRATEJİ] Büyük dönüm kararı — DerinEngine HTML motoru başlıyor (28.09.2026,
  `01_strategy.md`).** Kullanıcı: mevcut Python motorunu git'e kaydet (git=`33bfd85`,
  temizdi), sonra **DerinEngine HTML**'i başlat; gelecekte DerinEngine 3'e kadar
  evrilecek. **Python motor (1.0.0) artık bakım hattı** (yeni özellikler o tarafa
  ağırlıklı yazılmayacak); **yeni ana hat = saf tarayıcı JS motor** (Canvas2D/WebGL/
  WebAudio/localStorage; %0 ek kütüphane; Node gerekmez; demolar tek index.html).
  Aynı motor API'si (Engine/Scene/GameObject/Component + fizik + tilemap `.map` +
  UI kiti) taşınacak. Gerekçe özeti: 3D/voxel/`.map` WebGL'de kütüphanesiz mümkün,
  JS JIT + GPU çizimi Python'dan hızlı, kurulum/dağıtım tek klasör.
  **Etkilenen:** tüm oturumlar — yeni işler önce HTML motorunda planlanacak.

- **[OYUN] Menü Sonsuz Mod satırı motor UI kitine taşındı (28.09.2026, `03_game.md`).**
  `build_main_menu_scene`'de M_RND satırı (`_menu_item` metin satırı) artık Kit `Button`
  ('deep_engine/ui.Button') ile kuruluyor: kilitliyken `enabled=False` gri buton +
  LockIcon + kilit uyarısı, açıkken hover/press durumları + tıkla endless. Tıklama yine
  aynı `_click_rect/_click_action` üzerinden MenuController `_dispatch_action` ile yürüyor
  (kit'in kendi on_click yok; davranış değişmedi). Yeni küçük bileşen `KitLabelSync`
  (Button metnini i18n key ile senkron tutar — T ile dil değişince buton metni güncellenir).
  Doğrulama: py_compile OK, task test MENU_BUTTON_OK + MENU_UNLOCKED_OK + KIT_SYNC_OK +
  menü 90 frame headless OK, deep-tool `--lang en all` **0 WARN / 0 BUG / 0 ERR**.
  commit `33bfd85`.

- **[MOTOR+OYUN] 4'lü grup işi tamamlandı (27.09.2026, `02_engine.md` + `03_game.md`).**
  Kullanıcı: "yap hepsini" (tilemap zeminleri + overlay pause + motor-UI kiti + Event/Tween
  test). **(A) Gerçek tilemap zeminler:** `build_procedural_level` artık Ground rect'lerini
  32px grid'e rasterliyor (`_attach_ground_tilemap`): üst yüzey = biome platform rengi,
  alt toprak = platform_alt; solid Ground sprite'ları gizleniyor (`SpriteRenderer.visible`
  — motor özellik, collider kalır), one-way adalar görünmüyor. **(B) Overlay pause:**
  `Scene.transparent` + motor ESC `on_escape` kancası + `SceneManager.push/pop` (tek-overlay).
  ESC oyunda pause açar (`Pause` sahnesi = Panel + UI Kit `Button`), menüde çıkış korunur;
  pause açıkken oyun sahnesi donuk alt katta çizilir, lighting pause'ta çizilmez. **İki ESC
  durumunu** her oyun sahnesi `scene.on_escape` ile yönetir (`menu_idle` ayrımı).
  **(C) Boss ölümü** `zoom_punch(1.18, 0.35)` (kamera çekmesi, slow-mo ile birlikte).
  **(D) Event+Tween test:** yeni `tests/test_engine_core.py` → `python tests\test_engine_core.py`
  = `ALL OK`. doğrulama: deep-tool **0 WARN / 0 BUG / 0 ERR** (tüm modüller). commit `30feff6`.
  Dokümantasyon: oyun KALAN maddesi (boss zoom_punch) tamamlandı; `02_engine.md` HEDEF kayıtları.

- **[MOTOR] Meh/Motor deep-tool DEVİR GÖREVİ tamamlandı (27.09.2026, `02_engine.md`).**
  Kullanıcı: Önceki motor işi commit sonrası MOTOR KALAN'ı bitir. **(1) Sessiz
  except'ler bilinçlendi (20 nokta):** `audio.py` (5), `components.py` (4), `core.py`
  (3), `savegame.py` (2) → `log` importu eklendi; hatalar `log.debug`/`log.warn` ile
  motor.log'a düşüyor (oyun davranışı değişmedi). `log.py` (6) — logger kendi içinde
  log çağıramaz (sonsuz döngü) → `pass` yerine akış ifadeleri (handle None/continue/
  return). Sonuç: `deep_engine/` tarafında Modül 7 "boş except" listesi **tamamen
  sıfırlandı**. **(2) Ölü import `_m`:** zaten yoktu. **(3) Modül 6 O(n²):** tüm satırlar
  incelendi → sabit-küçük/sabit-list/cull = yanlış pozitif, collision zaten uzaysal grid
  (CELL=128) → kod değişmedi; ARAÇ tarayıcı önerisi `04_tools.md` KALAN'a eklendi.
  Doğrulama: py_compile 32 dosya OK, deep-tool --lang tr all **0 WARN/0 BUG/0 ERR**,
  menü 180 frame + ses/log yolları headless OK. **Etkilenen:** oyun/araç oturumları —
  `game/main/webpanel` tarafı boş-except listesi onlara ait (kendi oturumlarında).
  ⏳ **COMMIT+PUŞ bekliyor.**

- **[MOTOR] İki bekleyen motor özelliği tamamlandı (27.09.2026, `02_engine.md`).**
  Kullanıcı: commit+push sonrası kalan KALAN'ları tamamla. **(6) Veri katmanı:**
  `Tilemap.to_data()/from_data()` (JSON-safe roundtrip) + `to_segments()` — dolu
  hücrelerin dış sınır segmentlerini üretir (iç kenarlar cull; boş = tile_set'te
  rengi olmayan ID, `draw()` ile tutarlı). `.map` köprüsünün veri/geometri adımı.
  **(7) Motor-UI kiti:** YENİ `deep_engine/ui.py` — `UITheme` (override edilebilir
  palet), `Panel` (yuvarlak panel), `Button` (hover/press/focus, mouse tık +
  ENTER/gamepad-A, `enabled`/`on_click`), `ScrollContainer` (madde listesi, clip
  + scrollbar: wheel + handle drag, `on_pick`). `Input.get_mouse_button()` (basılı
  tutma) eklendi. Yeni exportlar: `UITheme`, `Panel`, `Button`, `ScrollContainer`.
  Doğrulama: py_compile 32 dosya OK, `deep-tool --lang en all` → **0 WARN, 0 BUG,
  0 ERR**, testler TEST1/TEST2_OK + BUTTON_CLICK/SCROLL_PICK/SCROLL_DRAG/UI_DRAW/
  UI_KIT_OK, oyun menüsü 120 frame headless OK. **Etkilenen:** motor (dotcom) —
  oyun kodu gönüllü değişmedi; kiti oyunda kullanmak ayrı görev (`03_game.md`).
  ⏳ **COMMIT+PUŞ bekliyor** (kullanıcı onayı).

- **[OYUN] Rampa + keyframe + biyom fiziği + kampanya ilerleme haritası tamamlandı
  (27.09.2026, `03_game.md`).** Kullanıcı: son KALAN kolonu "continue" → sırayla:
  **(a)** Prosedürel seviyeye eğimli rampa bölümü: `builders._build_ramp` (`RampVisual`
  üçgen bileşeni + `PolygonCollider`), `procedural._maybe_ramp` (%30, safe-zone dışı,
  slope ±1, tepe coin) → RAMP_GEN_OK (40 seed/53 ramp) + RAMP_BUILD_OK. **(b)** Flyer
  bob'u `KeyframeAnimator`'a taşındı (`_build_flyer`) → FLYER_KF_OK. **(c)** Müzik tema
  bağlama merkezileşti: `scenes._play_theme(biome, is_boss, fallback)` (procedural/boss/
  endless tek yerden). **(d)** Biyoma özel fizik: `PlayerController.apply_biome()` —
  `biome_gravity/jump/grip/wind` çarpanları (ice kaygan, cave ağır, desert rüzgârlı,
  astro düşük-yerçekimli), oyun akışında `data["biome"]` ile bağlandı → BIOME_PHYS_OK.
  **(e)** Kampanya ilerleme haritası (deneyim 8): menüde 5 biyom rozeti
  (`ui.BiomeProgress`), boss yenilince savegame `completed_biomes` listesi kalıcı →
  COMMIT_SAVE_OK + MENU_BOOT_OK. Doğrulama: py_compile 31 dosya OK, `deep-tool
  --lang en all` → **0 WARN, 0 BUG, 0 ERR** (DEVİR temizliği de bitti). **Etkilenen:**
  oyun + i18n (`campaign_progress`, `biome_*` — TR/EN). COMMIT+PUŞ bekliyor
  (önceki motor 2–5 batch'i ile birlikte, webpanel dahil).

- **[MOTOR] Özellik 2–5 + slopes tamamlandı (27.09.2026, `02_engine.md`).** Kullanıcı: "hepsine
  başla, 1-1,5 saat dışarıdayken çal" → 5 yeni motor yeteneği eklendi + doğrulandı:
  **2) Çokgen/daire/segment çarpışma** (`PolygonCollider`/`CircleCollider`, SAT,
  `scene.py` generic çarpışma hattı), **3) Sahne ağacı + SceneManager** (parent/child
  hiyerarşisi, lokal konum + `world_position`, push/pop overlay sahne yığını, `Scene.active`),
  **4) Keyframe animasyon** (`KeyframeAnimator` — tween eğrileriyle sayı/renk/Vector2
  interpolasyonu, path alias `sprite.color`), **5) Tilemap + katman + kamera fx** (YENİ
  `deep_engine/tilemap.py`, ızgara katmanları + ekran kesme (culling), `zoom_punch`),
  **slopes/eğik zemin** (`_polygon_surface_y` rampa yüzeyi; karakter rampa boyunca smooth
  yürür). Yeni exportlar: `CircleCollider`, `PolygonCollider`, `SceneManager`,
  `KeyframeAnimator`, `Tilemap`. Doğrulama: py_compile OK, `deep-tool --lang en all`
  0 BUG/0 ERR, endless 64 obje 180-frame sim OK, headless Engine 30 frame OK, testler
  `COLLIDER_MATH_OK`/`SCENE_TREE_OK`/`KEYFRAME_OK`/`TILEMAP_OK`/`SLOPE_OK` geçti.
  **Etkilenen:** motor katmanı (deep_engine/) — oyun kodu DEĞİŞMEDİ (geriye uyumlu);
  yeni yetenekleri oyunda kullanmak ayrı görev → `03_game.md` KALAN'a eklenecek.

- **[SİSTEM] Gemini + Antigravity tamamen temizlendi (27.09.2026).** Kullanıcı: "gemini+agy ile
  başlamıştık ama artık opencode'dayız; onlardan kalan projeyle ilgili bi şey varsa incele,
  gereksizse sil — sadece opencode kalsın." Tarama sonucu: eski **MiniEngine** (DerinEngine'in
  önceki hayatı) kuruluş tarihçesi `.gemini` içindeydi; `implementation_plan.md` (Editör Crash +
  Motor Kapasitesi) değerli tek belgeydi ama tüm fikirleri DerinEngine'de **zaten mevcut**
  (saflık kuralı, `scene.py` shake, `components.py` Animator/Event/Tween, builders JSON) —
  kayıp bilgi yok. `01_strategy.md` "NOT (veri)" güncellendi. Silinen: `C:\Users\token\.gemini`
  (38,3 MB) + `AppData\Roaming\antigravity` (19,3 MB) + `AppData\Local\antigravity` (4,3 MB).
  Masaüstü `galeri\Gemini_Generated_Image_*` kullanıcının kişisel görselleri — DOKUNULMADI.
  **Etkilenen:** proje kodu/oyun yok; sadece dış ajan kalıntıları temizlendi.

- **[ARAÇ] webpanel editörü gerçek oyun motoru UI oldu (26.09.2026, `04_tools.md` madde 14).**
  Godot/Unity hissi: sol **Sahne hiyerarşisi** (tip noktası + ad + ↑/↓ çizim sırası,
  eski düz liste kaldırıldı), üst **toolbar** (Kaydet Ctrl+S / Farklı Kaydet / Geri al /
  Yinele / Çoğalt / Sil + zoom sığdır + ızgara seçici), sağ **Inspector** (hızlı butonlar),
  alt durum çubuğu (imleç coords + seçili). **Undo/redo** eklendi (60 snapshot; Ctrl+Z,
  Ctrl+Shift+Z/Ctrl+Y, Ctrl+D çoğalt, Delete sil, Esc seçim bırak). **Etkilenen:** sadece
  webpanel (araç) — oyun/motor yok. Doğrulama: py_compile + `node --check` JS_OK + 10 UI
  kimliği sayfada + API 200. 8765 yeni kodla çalışıyor (F5). COMMIT+PUŞ bekliyor.

- **[ARAÇ] webpanel UX paketi (26.09.2026, `04_tools.md` madde 13).** deep-tool'a
  **`--api modules`** eklendi (gerçek TR/EN modül adları) → webpanel çipleri artık
  canlı; tarama çıktısı renkli (W/B/E/i); tarayıcı otomatik açılıyor (çifte tık
  için `webpanel.bat` eklendi); 8765 doluysa yumuşak davran; log sekmesi "canlı
  izle". 17 test + `--lang en all` 0/0/0. **Etkilenen:** araç dışı kod yok; sunucu
  yeni kodla yeniden başlatıldı (sayfa F5 yeterli). ✅ Commit+push: `5fb747f` (+`3e7869c`).

- **[ARAÇ] deep-tool arayüzü web paneline geçti (26.09.2026, `04_tools.md` madde 12).**
  deep-tool'a **`--api` JSON modu** eklendi (`scan`/`find`/`new` → yapılandırılmış çıktı;
  CLI davranışı aynı). Web panelindeki deep-tool sekmesi artık tam arayüz: 13 modül
  çipi + "Tümünü tara", Bul (kelime→dosya:satır), Üret (script/dir, var olanı silmez),
  Başlat (oyun veya .py). Yeni API'ler: `/api/scan`, `/api/find`, `/api/new`, `/api/run`.
  **Etkilenen:** araç dışında kod/oyun YOK. Doğrulama: scan all 13 modül 0/0/0, tüm
  route'lar py test ile OK, `--lang en all` regresyonu temiz. Not: 8765'te eski
  webpanel süreci kalmıştı, kapatıldı — **sunucuyu kapatmak için Ctrl+C**.

- **[ARAÇ] deep-tool alt-araçları hayata geçti (26.09.2026, `04_tools.md`).** Menüdeki
  "[yakında]" `new`/`find`/`run` gerçek oldu: **`new`** script şablonu veya dizin üretir
  (var olana dokunmaz), **`find`** kelime → dosya:satır bulur (salt okunur), **`run`**
  bilinen script'leri başlatır (`game`/`webpanel`/`tool` veya .py yolu). CLI: `deep-tool
  find KW [klasor]`, `deep-tool new script yeni.py`, `deep-tool run game`. **Etkilenen:**
  kod ve oyun davranışı YOK — sadece araç yetenekleri eklendi. Web paneli aynı
  özellikleri alacak (kullanıcı söylediğinde).

- **[ARAÇ] dead-code modülü yanlış sinyalleri temizlendi (26.09.2026).** `[11] Olu kod`
  ilk sürümü "2 referans" olanları da şüpheli listeliyordu; çıktıda 18 giriş oldu ve
  HEPİSİ aslında kullanılıyordu: `tween.ease_*` → `_EASING` kayıt sözlüğü,
  `commands.cmd_*` → `_reg(...)` komut kaydı, `webpanel.Handler` → HTTP sunucusu.
  Kural netleştirildi: **yalnızca 1 referans (sadece tanım satırı) = kesin ölü aday**;
  2+ referans = kayıt/çağrı ile kullanılıyor → listelenmez. Module 11 artık "temiz"
  raporluyor. (Gerçek tek bulgu zaten silinmişti: `save_scene_to_path`.)

- **[ARAÇ] menü düzeltmesi (26.09.2026).** Check menüsü ekranında `[10]` iki kez
  çıkıyor, `[20] TÜMÜNÜ TARA` kayıptı: `_check_menu_loop`'ta sabit `print(t("menu_10"))`
  satırı eski "Scan ALL" için kalmış, modül eklerken güncellenmemişti →
  `menu_20`'ye çevrildi. Doğrulandı: `[10]` tek, `[20]` mevcut.

- **[ARAÇ] deep-tool'a +4 tarama modülü (10-13) eklendi (26.09.2026, `04_tools.md`).**
  Kullanıcı isteğiyle: **[10] Gizli bilgi taraması** (anahtar/token/şifre + `.env`),
  **[11] Ölü kod** (çağrılmayan üst-seviye def/class'lar), **[12] Karmaşıklık özeti**
  (en büyük dosya/yapılar), **[13] Çökme trendi** (motor.log tekrar eden traceback'ler).
  Menü **20 = TÜMÜNÜ TARA** oldu; eski/etkisiz `menu_7 "Scan ALL"` kopyaları silindi.
  İlk gerçek bulgu: `levelfile.save_scene_to_path` (2 satırlık geri-uyumluluk takma adı)
  hiç çağrılmıyordu → kullanıcı onayıyla **silindi** (`save_level` geçerli tek API).
  Doğrulama: `deep-tool --lang en all` → **13/13 modül 0 WARN, 0 BUG, 0 ERR**.
  **Etkilenen:** hiçbir oyun/motor davranışı; sadece araç + ölü motor fonksiyonu.

- **[ARAÇ] deep-tool olgunlaştırıldı: 93 WARN → 0 (26.09.2026, `04_tools.md`).** Kod
  tarafı DOKUNULMADAN sadece kural taraması gerçeğe oturtuldu: (a) `_SILENT_EXCEPT`
  (regex) kaldırıldı — AST "empty except" ile ÇİFTE sayıyordu; (b) "empty except" +
  "file open inside loop" kuralları artık `# noqa` işaretini tanıyor (bilinçli
  fallback'ler INFO); (c) nested-loop tespiti INFO (yanlış pozitif — spatial grid ve
  vinyet gibi yapısal kodlar); (d) `_BUILTINS`'e istisna hiyerarşisi eklendi
  (KeyboardInterrupt yanlış "tanımsız isim"dü); (e) builder/extractor'da Coin/Player/
  Spikes bilinçli-eksik → INFO. Sonuç: **0 WARN, 0 BUG, 0 ERR** her modülde.

- **[TÜM PROJE] Güvenli temizlik çalışması — TAMAMLANDI (26.09.2026).** Kullanıcı:
  "tüm proje dosyaları ve belgeleri kompakt olsun, spagetti varsa çöz." Yapılanlar:
  (a) `parallax.py` kullanılmayan `import math as _m` silindi; (b) 33 bilinçli
  `except...: pass` fallback'ine `# noqa: bilinçli` etiketi kondu (davranış değişmedi,
  ancak "bilinçli mi?" sorusu kodda cevaplı); (c) `audio.py` önbellek-yazma `# noqa`;
  (d) `repo_preview.png` kaldırıldı (private repo'da ölü dosya; lokal tepe durur);
  (e) deep-tool kural iyileştirmeleri (üst kayıt). Çift-döngü WARN'ları incelendi ve
  HEPİNİN yapısal/bilinçli olduğu doğrulandı (spatial grid, vinyet, raycast). Karar:
  entities.py'yi bölmek REDDEDİLDİ (risk/satır-fayda oranı kötü). Doğrulama: tüm proje
  py_compile OK, kampanya giriş sahnesi 90 kare headless hatasız, deep-tool 0 WARN.
  Sonraki oturumlar unuttursun: **fallback except'ler `# noqa` ile işaretli** bırakılır;
  session'ların (150-220 satır) ve AGENTS.md'nin (77) "kompakt" olduğu doğrulandı.

- **[MOTOR + OYUN] Hata Avı: yüzeye gömülme fix + turret yoğunluğu dengesi (26.09.2026 —_
   MOTOR 02 (madde 22) + OYUN (rapor 2/3 kapanışı).** Kullanıcının seçtiği dönem işi.
  Oyuncunun ince tek-yön platforma hızlı düşüşte altına gömülmesi MOTOR'da çözüldü:
  `Rigidbody2D.max_fall_velocity=1800` + tek-yön eşiği kalınlık-bilinçli
  (`<= max(4, h+6)`) + derin nüfuzda merkez kuralı. Turret yoğunluğu motor formülüyle
  seyreldi (`count=randint(1,1+difficulty)`) ve mor düşman girişi kademeli: 1. boss
  öncesi hiç yok, 1. boss sonrası (d2) seyrek (~%40 chunk), 2. boss sonrası (d3+)
  tam ağırlık. Etki: sarsıntı/tünel bug'ı giderildi; ilk seviyeler sakin, mor düşman
  yavaşça tanıtılıyor. Doğrulamalar `02_engine.md` madde 22'de; OYUN tarafı
  değişkenlik gerekmedi. Özellikle MOTOR oturumları bu fizik/üretici koduna
  dokunmadan önce o raporu okusun.

- **[OYUN + MOTOR + ARAÇ] Oyun içi "custom level" akışı TAMAMEN kaldırıldı (25.09.2026).**
  Kullanıcı: "oyun içi C'yi de kaldır, costum level istemiyorum; oyunda sadece P
  (kampanya) + 4 (Sonsuz) + T (dil) olacak; editör falan PANELDE kalacak." Yapılanlar:
  **(a)** `game/ui.py`: menüdeki `[C] Özel Seviye` satırı (MC), `_dispatch_action`
  "custom" dalı ve klavyedeki C kısayolu kaldırıldı; boşalan yere `[T] Dil` satırı
  taşınmıştı (zaten) — menü şimdi P + 4 + T. Kullanılmayan `_start_mode` (fade'li
  geçiş) silindi. **(b)** `game/builders.py` `build_custom_level` + portala spawn
  ışınlama + `ensure_custom_levels_dir` + `_finalize_custom_plain` + `_CUSTOM_GOAL_TEXT`
  silindi; `_finalize_custom_scene` → `_finalize_goal_ui` (prosedürel seviyelerin
  hedef yıldız UI'ı) adına kavuştu. `_build_player` restart-artık menüye düşüyor
  (gerçek senaryolar kendi factory'lerini override eder). **(c)** `game/state.py`:
  `LEVELS_DIR`/`DEFAULT_LEVEL_PATH` + "custom" mod tanımı kaldırıldı; `scenes.py`
  `restart_path=DEFAULT_LEVEL_PATH` geçişleri ve import temizlendi. **(d)**
  `game/commands.py`: `levels` + `load` komutları silindi (14→12 komut); `main.py`
  `ensure_custom_levels_dir` çağrısı kaldırıldı; i18n `menu_custom` (TR+EN, 62→61/61)
  ve `deep_engine/input.py` gamepad "C" map'i temizlendi. **(e)** `tools/webpanel.py`
  **işlevi aynen**; sadece "oyunda konsol: load X" ipuçları çıkarıldı (oyun artık
  yüklemiyor — web panel kendi başına seviye tasarım aracı). README + AGENTS.md
  kontrolleri güncellendi. Doğrulama: py_compile, headless boot (menü P→kampanya,
  T dil), `start_campaign`/`build_endless_level`, 12 konsol komutu, i18n parity,
  deep-tool 0 BUG, webpanel save/list/delete + `node --check` OK. **Oyun içi custom
  seviye oynatma yolu artık YOK** — webpanelde yapılanlar oyunda görünmez; istenirse
  yeni bir giriş (ör. menu seviye seçici) tartışılır.

- **[OYUN + MOTOR + ARAÇ] Oyun içi editör tamamen kaldırıldı; seviyeler klasöre taşındı (25.09.2026).**
  **(a)** `deep_engine/editor.py` (LevelEditor) SİLİNDİ; `core.py`'den editör oluşturma,
  E tuşu toggle ve editör üzerinden giden update/draw/debug dalları temizlendi;
  `__init__.py`'den `LevelEditor` çıkarıldı; `game/ui.py`'den menü öğesi ([3] Editör),
  `_dispatch_action` "editor" kolu ve fade sonundaki `editor.toggle()` kaldırıldı;
  `game/entities.py`'de fareyle ateş için `engine.editor.active` engeli silindi; i18n
  `menu_editor`/`editor_*` anahtarları iki dilden de temizlendi. **(b)** Seviyeler artık
  `custom_levels/` **klasöründe** birer dosya: `custom_levels/default.json` = hep sabit
  "sıfır şablon" (asla ezilmez), diğerleri `<isim>.json`. `game/state.py`'ye `LEVELS_DIR`,
  `builders.ensure_custom_levels_dir()` (klasör + default.json'u şablon kaynağından
  üretir), konsola `levels` + `load <isim>.json` komutları eklendi. **(c)** `tools/webpanel.py`
  sadece bu klasörde çalışıyor: seviye açma listesi + "Farklı Kaydet…" (isim verirsin,
  `default.json` korunur) + seviye silme; "Oyuna Aktar"/publish kaldırıldı, `web_level.json`
  silindi. Oynatma yolu: web'de kaydet → oyunda konsolu aç → `load benim_bolum.json`.
  Doğrulama: py_compile + headless boot + konsol komut testleri + webpanel HTTP round-trip
  (save/load/delete) OK. README + AGENTS.md kontrolleri güncellendi. **Etki:** motor 1.0.0'da
  E tuşu artık yok; paketleme `--add-data custom_level.json` şablon kaynağı olarak duruyor.

- **[OYUN] Boss ışın çökmesi düzeltildi (25.09.2026).** `game/bosses.py` içinde
  `PlayerController` iki yerde kullanılıyordu (SniperBoss/CosmicBoss `_fire_beam`,
  eski satır 467/599) ama hiç import edilmemişti → boss ışın saldırısı başlayınca
  `NameError` ile oyun çöküyordu. `from game.entities import PlayerController`
  eklendi (mutlak import). Doğrulama: her iki `_fire_beam` gerçek sahnede çağrıldı,
  çökme yok. **Oynanış etkisi:** pandun/desert/sniper boss'ları artık sahada da
  ışın atabilir.

- **[MOTOR] Konsol toggle düzeltmesi (25.09.2026).** Konsol " ("BACKQUOTE /
  QUOTEDBL) tuşuyla AÇILIYORDU ama aynı karede `console.update()` tuş basışını
  hâlâ "kapat" sanıp kapatıyordu → konsol göz açıp kapayıncaya kadar açık kalıyordu
  (kullanıcı "komut olmuyor" dedi). Çözüm: `console.update()`'te backquote/quote
  kapatma kaldırıldı — tuş artık SADECE motor çekirdeğinde toggle (core.py);
  konsol içinde kapatma yalnızca ESC ile. Açılış tuşunun yazı satırına girmemesi
  için `Input._typed_chars` toggle'da temizleniyor. Uçtan-uca test (aç→yaz→komut
  →kapat) OK.

- **[ARAÇ + MOTOR + OYUN] Web editörü kendi dosyasında çalışıyor + oyun içi konsol (25.09.2026).**
  **(a)** `tools/webpanel.py`: `custom_level.json` artık **dokunulmayan şablon**,
  editör `web_level.json`'da çalışıyor. Butonlar: "Şablona Sıfırla" (`/api/level/reset`:
  template → web_level kopyala) ve "Oyuna Aktar" (`/api/level/publish`: web_level →
  custom_level). `web_level.json` `.gitignore`'a eklendi. Oyun içi editör (E) YİNE
  `custom_level.json`'ı açar — web'de düzenlenen dosyayı GÖRMEZ (kullanıcı isteği).
  **(b)** " ("BACKQUOTE) tuşu oyun içi komut satırını açar: `deep_engine/console.py`
  (DevConsole + komut kayıt sistemi `register_command`), `input.py`'ye karakter
  toplama (`get_typed_text`) + BACKQUOTE/BACKSPACE/KPENTER tuşları, `core.py`'ye
  toggle+pause+draw (konsol açıkken oyun durur). `game/commands.py`: `help, clear,
  version, hp, heal, god, coins, speed, jump, tp, respawn, list`. Motor saflığı
  korundu (komutlar game tarafında kayıtlı). Doğrulama: py_compile OK, 12 komut
  kaydı doğrulandı, webpanel HTTP round-trip (reset/publish) OK.

- **[ARAÇ oturumu] Tarayıcı web paneli + mini editör (25.09.2026).** `tools/webpanel.py`
  — Python **sadece stdlib**, 0 yeni paket. `http://127.0.0.1:8765` sekme paneli:
  **Editor** (Godot/Unity-kıvamında basit seviye editörü: 14 nesnelik palet,
  sürükle/taşı/yeniden boyutlandır, özellik + meta paneli, kaydet = `custom_level.json`
  round-trip), deep-tool tarama, motor.log, Script, Oyun başlatıcı. **Kararlar:**
  sayfa **gerçek Türkçe UTF-8** karakterlerle (ü/ş/İ/ç, `<meta charset>` +
  `charset=utf-8`; WebClient bayt doğrulaması yapıldı). Önceki "yalnız ASCII" denemesi
  kullanıcıya kötü geldi, iptal edildi. `PAGE` Python raw string (`r"""..."""` — JS
  `\'` kaçışları aynen geçer), `setNum/setVal/setColor` inline handler'larla
  `node --check` + runtime mock testi doğrulandı, zoom/cam çarpımı doğru.
  Endpoint'ler: `/api/script` (cwd=ROOT — `deep_engine/` cwd'den `import deep_engine`
  ÇALIŞMAZ), `/api/scan` (`deep-tool.py --lang tr/en [args]`). **Dosya bozulma
  tuzağı:** bu dosyayı PowerShell `Get-Content -Raw`/`Set-Content` döngüsüyle
  DÜZENLEME (ANSI okur, UTF-8'i bozar → `â€”`); UTF-8 editörle. Git'e henüz
  eklenmedi (kullanıcı kararı bekliyor).

- **[MOTOR + ARAÇ] Yorum/docstring çevirisi tüm depoya tamamlandı (23.09.2026).**
  İzlenen TÜM `.py` dosyaları (motor core/servis/veri, game, tools) + `version.txt`
  + `.gitignore` yorumları akıcı İngilizce'ye çevrildi (commit `dfdc9e5`, 29 dosya,
  30. satırında tek commit). **Kritik koruma: i18n.py TRANSLATIONS TR/EN değerleri ve
  deep-tool.py TR/EN menü sözlük değerleri AYNEN duruyor** (yalnız yorumları değişti) —
  kod çıktıları ve oyun arayüzü (TR/EN) etkilenmedi. GitHub'a gidecek her şey artık
  İngilizce; `sessions/`, `AGENTS.md`, `opencode.json` yerelde Türkçe kalmaya devam.
  Not: depo 7 commit — GitHub push'u "gönder" deyince yapılır.

- **[ARAÇ oturumu] AI izi temizliği + tek kök commit (23.09.2026).** GitHub'da görünen
  tüm `.py` yorum/docstring'lerinden emojiler + ajan görev kodları (A1/B3/C5/D1) +
  "Bug Checkup" üslubu temizlendi; `version.txt` doğal değişiklik günlüğüne çevrildi;
  README AI üslubu (game juice/Mini-Godot/emoji) kaldırıldı. İz kalmadı (3 tur tarama).
  Eski 9 commit bir kök commit'e (`a4fe0a6`) sıkıştırılıp force-push yapıldı —
  GitHub geçmişi tek commit. Canlı oyun/i18n çevirileri (TR/EN menüler, HUD) AYNEN korundu.

- **[ARAÇ oturumu] GitHub'a gönderildi (23.09.2026).** https://github.com/tcknmx/DerinEngine
  (Public). `main` = 7 commit, 33 dosya. `sessions/`, `AGENTS.md`, `opencode.json` yerelde
  kalıyor, depoda yok. Sonraki değişiklikler `git add -A && git commit -m "..."` +
  `git push` ile güncellenir.

- **[OYUN oturumu] Tüm yorum/docstring'ler İngilizce'ye çevrildi (23.09.2026).**
  `game/*.py` + `main.py` (8 dosya, 328 yorum satırı) akıcı İngilizce'ye geçti.
  Kod/i18n string literal'leri değişmedi (UI/editor çevirileri yerinde). MOTOR ve
  ARAÇ kodu bu değişikliğe dahil değil; deep_engine/ ve tools/ kendi düzeninde.
  Doğrulama: `py_compile` OK, Türkçe karakter kalıntısı yok.

- **[ARAÇ oturumu] Yerel git deposu kuruldu (23.09.2026).** Git 2.55.0 kuruldu
  (winget), kimlik `tcknmx` / `tcknmx@users.noreply.github.com` (global), kök dizinde
  `main` dalında 2 commit (`5ddd5c2` ilk kayıt, `99722ff` gitignore). Hariç tutulanlar:
  `__pycache__/`, `dist/`, `build/`, `web-cache/`, `savegame.json`, `motor.log`,
  `.opencode/`, `*.lnk`, `_e.txt`. **GitHub'a push YAPILMADI** — sadece yerel.
  Değişiklikler `git status` ile takip edilip commit'lenebilir; kayıt düzenimizde
  "değişiklik diğer oturumu etkiliyorsa" notu artık commit mesajına yazılır.

- **[STRATEJİ oturumu] GÖREV DÖNGÜSÜ kuralı getirildi (AGENTS.md kural 3):** her
  görevde üç kayıt zorunlu — başlangıçta kendi oturum dosyasına `HEDEF` (neyi çözüyoruz,
  doğrulama ne), yarım kalırsa `KALAN` (nereye kadar gidildiği: adım, dosya, sırada ne),
  tamamlanınca kendi dosyasına kalıcı kayıt + diğer oturumları etkiliyor ise buraya
  "SON GELİŞMELER" notu. **Tüm oturumlar uygular.**

- **[ARAÇ oturumu] deep-tool tarama sonuçları devredildi.** `--lang tr all` → 95 WARN,
  0 BUG/ERR. Sessiz `except` (Modül 1/7), kullanılmayan import (parallax `_m`), Modül 3
  extractorsız tag (Coin/Player/Spikes) ve Modül 6 O(n²) incelemeleri bekliyor.
  Dağıtım: deep_engine/ tarafı → `02_engine.md` "DEVİR GÖREVİ"; game/+main.py tarafı →
  `03_game.md` "DEVİR GÖREVİ". Koda dokunulmadı.

- **[OYUN oturumu] Spikes trigger+zıplama, Turret agresifliği, gömülme yönlendirmesi
  (23.09.2026).** `_build_spikes` artık `BoxCollider(is_trigger=True)`; oyuncu dikene
  "basıp duramaz", temasta bounce (vx=-220, vy=-330) + hitstop + shake alır,
  `respawn` kaldırıldı. `TurretEnemy` range 600→460, wake_radius 420→330; turret ateş
  aralığı kampanya difficulty<=1'de min 2.0s (altyapıda 1.75s idi), genel min 1.4s.
  MOTOR etkilenmez (tüm değişiklikler `game/`). **02 oturumuna devir:** yüzeye gömülme
  kök nedeni motor `deep_engine/scene.py` tek-yön çarpışma eşiği `<=4` + 2px ayak
  sensörü + `Rigidbody2D` hız tavanı yokluğu — ayrıntı `03_game.md` → AÇIK RAPORLAR
  #2. Bir sonraki motor çalışmasına kadar oyuncu hızlı düşüşlerde ince tek-yön
  platformlardan geçebilir.

- **[STRATEJİ oturumu] AGENTS.md standart tek dev dosyadan 4 oturum yapısına taşındı.**
  Tüm geçmiş "maddeler", bug checkup'ları ve planlar ilgili oturum dosyalarına dağıtıldı:
  `01_strategy.md` (yol haritası/kararlar), `02_engine.md` (deep_engine/),
  `03_game.md` (game/), `04_tools.md` (deep-tool/paketleme/web). Bu dosya yeni ortak
  bilgi merkezi. KODA DOKUNULMADI — oyun hâlâ aynı çalışıyor.

- (Bir sonraki çapraz-etkili değişiklik buraya eklenir: ör. "MOTOR: scene.py çizim
  sırası değişti — OYUN etkilenebilir", "OYUN: entity ekledi — ARAÇ extractor
  kontrolü gerekebilir".)

---

## DÜNYA DURUMU (kim neyin sahibi)

| Oturum | Sahip olduğu dosyalar | Kimi etkiler |
|---|---|---|
| STRATEJİ | `sessions/01_strategy.md` | Yön/kararlar; koda dokunmaz |
| MOTOR | `deep_engine/*.py` | Tüm oturumlar (motor üstüne kurulu) |
| OYUN | `game/*.py` , `main.py` | Oynanış; motor API'lerine bağımlı |
| ARAÇ | `tools/deep-tool.py`, `deep-tool.bat`, paketleme (dist/build) | Denetim/bakım; kodu düzeltmez |

Motor saflık kuralı: `deep_engine/` İÇİNDE `game`/`main` import YASAK (deep-tool Modül 8
denetler). `game/*.py` ise motora `deep_engine.*` mutlak import ile bağlanır (göreli
import `game/*` içinde ÇALIŞMAZ — paket dışındadırlar).

---

## SÜRÜM & VERİ DURUMU (herkese açık)

- Motor sürümü **1.0.0**, oyun sürümü **0.1.19** (tek sürüm satırı fikri iptal edildi;
  ikisi ayrı sayılır: motor 1.0.0, oyun 0.1.19). Kaynaklar:
  `deep_engine/__init__.py → __version__`, `version.txt`.
- `custom_level.json` içindeki `meta.version` AYRI bir şey: seviye **dosya biçimi**
  sürümü (şu an 1).
- `savegame.json` (normalde) temiz durumda: `{"lang":"tr","high_score":0}` — BOM'suz
  (ilk bayt `{`). Yeni oyuncu deneyimi kararı gereği sıfır kurulum korunur.
  - `endless_unlocked` yoksa Sonsuz Mod kilitlidir (kampanya bitince açılır).
  - `tutorial_done` yoksa girişte eğitim gösterilir.
- `user_data_dir()` frozen-safe + emscripten-safe: savegame/özel seviye her platformda
  doğru yere yazılır.

---

## BİLİNEN TUZAKLAR (oturumdan bağımsız, hepsini ilgilendirir)

1. **`game/*.py`'de göreli import yok**: `from .core import ...` ÇALIŞMAZ. Doğrusu
   `from deep_engine.core import ...` (mutlak).
2. **savegame JSON'u UTF-8 BOM ile yazarsan bozulur**: `SaveGame.load` `utf-8-sig`
   kullanır (BOM'lu da okur) ama dosya BOM'suz `{` ile başlamalı. PowerShell
   `Set-Content -Encoding UTF8` BOM ekler — dikkat.
3. **`build/` paylaşılıyor**: PyInstaller (`build/StarCollectorHero/`) ile pygbag
   (`build/web/`) AYNI klasörü kullanır. Temizlikte `build/web*` dışında bırak ya da
   web çıktısını ayrı yere kopyala.
4. **Yerel web testinde oyun başlamıyorsa**: `http://localhost:8000` kullanma —
   pygbag dev mode'a girip wheel'i localhost'tan arar (404). `http://192.168.1.5:8000/`
   (yerel IP) kullan, CDN'den iner ve çalışır. (Prod/itch.io etkilenmez.)
5. **`Scene.draw` UI sırası**: normal yol = dünya (özellikle zoom'lu) → UI → vinyet en
   son. Zoom'lu çizimde `world_surf` `background_color` ile doldurulmalı (yoksa parallax
   üstü siyah kalır).
6. **Asenkron tarayıcı**: web, `engine.run_async()` (`asyncio.run`), masaüstü
   `engine.run()`. `_frame(dt)` tek karelik ortak gövdelerdir.
7. **indirme/import taramasında sesler**: sentezlenen sesler için dosya-varlık kontrolü
   istemli olarak yapılmaz (deep-tool Modül 5 bunları bilerek atlar).
8. **Editör 9 aracı**: 1–9 = araçlar; Z geri al, C kopyala, V yapıştır; seçili nesnede
   ok tuşları kaydırır, `[`/`]` boyut, R renk, DEL sil.

---

## ÇAPRAZ REFERANS (geçmiş maddelerin dağıtımı)

Orijinal tek AGENTS.md'deki "madde N" kayıtları ilgili oturum dosyalarına dağıtıldı.
Bir madde hem motoru hem oyunu etkilediyse ana kayıt baskın tarafta, ilgili tarafa kısa
bir "ilişkili gelişme" satırı düşüldü:

- Ağırlıklı MOTOR: 1,2,4,9,11,16,21(zaman),22(bileşen),23(zoom),26,31,32,33,34,35,36(log),38,43
- Ağırlıklı OYUN: 3,6,7,8,14,15,17,18,19,20,21(karakter),22(boss),23(menü),25,27,29,30,40,41,42
- Ağırlıklı ARAÇ: 36(konsol),37,39 + paketleme + web build + 404 tanısı
- STRATEJİ (karar notları): marka taşıma (10), oturum yapısı, öncelik kararları