# MOTOR OTURUMU — deep_engine/ geliştirme

> Bu oturumun görevi: **oyun motorunu** (deep_engine/) geliştirmek. Oyun (game/) ve
> araç (tools/) bu oturumda yapılmaz; motor kuralı: `deep_engine/` içinde `game`/`main`
> import YASAK (motor saflığı).

---

## GÖREV HEDEFİ (27.09.2026 — motor özellikleri 2–5 + slopes)

Kullanıcı: "hepsine başla, 1-1,5 saat dışarıdayken çal." Sıra:
**2) Çokgen çarpışma** (PolygonCollider/CircleCollider + SAT + segment testleri),
**3) Sahne ağacı + SceneManager** (parent/child hiyerarşisi),
**4) Keyframe animasyon** (tween tabanlı, SpriteRenderer/property üstünde),
**5) Tilemap + katman + render sırası + kamera fx**,
**2D v1 alan 1: Slopes/eğik zemin.**
Doğrulama: py_compile + headless boot smoke + çarpışma testleri + `deep-tool --lang en all`.
KALAN kalırsa aşağıya yazılır.
**TAMAMLANDI (27.09.2026):** özellik 2–5 + slopes uygulandı ve doğrulandı
(bkz. TAMAMLANAN bölümü başındaki 5 yeni kayıt). Oyun tarafına bağlama (oyuncunun
bu yeni motor yeteneklerini kullanması) ayrı görevdir → `03_game.md` KALAN'a eklendi.

---

## TAMAMLANAN MOTOR ÇALIŞMALARI (kronolojik; orijinal "madde N" referanslı)

Aşağıdakiler baskın olarak **deep_engine/** tarafına dokunan işlerdir. Oyun tarafına
dokunan kısımlar için `03_game.md`'ye bak.

6. **Slopes/eğik zemin — motor (27.09.2026):** `scene.py`'ye `_polygon_surface_y(poly, x)`
   (bir poligonun dünya-x hizasındaki en üst yüzey y değeri; rampaların zemin
   seviyesi buradan okunur). `_resolve_solid_collision` poligon statik çarpışmada
   kutu-itiş yerine yüzey çözümü kullanır: karakter merkezindeki yüzeye uysa (dikey
   bant toleransı) yukarı oturur + `is_grounded`. Foot-rect zemin taraması da poligon
   için AABB tepesi yerine `_polygon_surface_y` kullanır (üçgen tepe noktasına sıçrama
   yok). Doğrulama: rampa (0,128)-(128,0) üzerinde oyuncu x=32→(40,72.0) grounded;
   sağa yürüyüş x=100 y=4.0 grounded kalarak yokuş çıkma; rampa kenarından düşünce
   grounded kaybı. Oyun tarafı kullanımı ayrı görev (03_game.md).

5. **Tilemap + katman + render sırası + kamera fx — motor (27.09.2026):**
   - YENİ `deep_engine/tilemap.py`: `Tilemap(Component)` — ızgara tabanlı gerçek tile
     haritası: `tile_size`, `set_tile_set` (id→renk, None=hava), `add_layer` (üst üste
     katmanlar, z_index sıralar), `get/set_tile`, `place_at_world` (dünya koordinatıyla
     hücre koyma), `solid_at`; çizim **ekran kesme (culling)** ile sadece görünür
     hücreleri çizer (büyük haritalar hızlı). Tilemap collider DEĞİL — solid istiyorsa
     oyun katmanı ayrı BoxCollider/PerTile usağı kurar.
   - `scene.py`: `zoom_to` (yumuşak zoom) + YENİ `zoom_punch(amount, duration)` — anlık
     "şut vuruşu" zoom (0.5sn'de taban hedefe geri döner; `_zoom_punch_timer/base`).
   - Doğrulama: 2 katmanlı harita (yeşil zemin, içi boş, gri, altın üst katman) doğru
     piksellerde; zoom punch 1.4→0.5sn sonra hedef 1.0'a.

4. **Keyframe animasyon — motor (27.09.2026):** `components.py`'ye YENİ
   `KeyframeAnimator(Component)` (tween tabanlı, `tween.EASING` eğrilerini kullanır):
   `animate("position.x", [(0,0.0),(300,1.0)], ease="linear")`; `play/pause/stop`,
   `loop`. Hedef bir sayı, renk tuple'ı ya da Vector2 olabilir. Path çözümünde alias:
   `sprite.color`, `sprite.scale`, `animator.*` (GameObject'lerde component doğrudan
   node olarak aranır). `_mix_value` arayüz fonksiyonu eklenip Satır-araya karışım
   yapıldı. Doğrulama: 0.5s → x≈150/300, renk ortası ~128; loop=False bitince
   `playing` False. `__init__.py` export edildi.

3. **Sahne ağacı + parent/child hiyerarşisi + SceneManager — motor (27.09.2026):**
   - `game_object.py`: `parent`/`children` listesi, `z_index`; `add_child(local_offset)`
     (çocuk konumu **lokal** saklanır, `world_position` zinciri toplar — parent
     taşınınca çocuk dünyada kayar), `remove_child`, `find_child`, `_subtree_active`
     (parent aktifse çocuklar da çalışır). `update`/`draw` çocukları işler; `draw`
     `origin` parametresiyle parent zincirini kamera offsetinden düşer (root objeler
     için davranış birebir aynı — mevcut oyun kırılmadı). `z_index` kardeş sıralaması.
   - YENİ `scenemanager.py`: `SceneManager` — `register`, `switch_to`, `push` (üst üste
     overlay, alttaki `scene.active=False`), `pop` (alttaki tekrar aktif), `attach`,
     `scene`, `has`, `names`, `current_name`. `core.py` → `Engine.scene_manager`.
   - `scene.py`: `Scene.active` eklendi (pasif sahne `update` atlar); top-level draw
     z-sıralaması. `__init__.py` export edildi.
   - Doğrulama: `SCENE_TREE_OK` — SceneManager push/pop active döngüsü; parent
     (100,100)+child lokali (5,10)→dünya (105,110); parent taşıyınca 205,110; çizimde
     child doğru ekran yerinde; parent inactive → çocuk da inactive.

2. **Çokgen/daire/segment çarpışma — motor (27.09.2026):**
   - `math2d.py`: `point_in_polygon`, `point_segment_dist`, `segments_intersect`,
     `polygons_overlap` (SAT — eksen izdüşümü), `polygon_intersection` (genişletilmiş
     çakışım), `circle_circle_overlap`, `circle_polygon_overlap`, `circle_aabb_overlap`;
     `Vector2.derivative()`, `Vector2.dot()` eklendi.
   - `components.py`: `BoxCollider.overlap_check` her türle kesin çakışma (genel
     arayüz), YENİ `CircleCollider` (get_center/get_radius/overlap_check), YENİ
     `PolygonCollider` (dünya noktaları, SAT). `scene.py` çarpışma hattı **generic**
     hale getirildi: `_get_collider()` her üç türü toplar, `get_aabb` (broad phase) +
     `overlap_check` (kesin) üzerinden; spatial grid aynı kaldı (hor tekdüze).
   - Doğrulama: `COLLIDER_MATH_OK` (SAT çokgen-çokgen, daire-çokgen, daire-AABB,
     segment kesişimi, GameObject sarmalayıcıları); endless level 58 obje 60-frame sim
     hatasız. `__init__.py` export edildi.

2. **Oyun içi custom akışının motor yankısı temizlendi (25.09.2026):** oyun tarafında
   C modu kaldırılınca (bkz. `03_game.md` 43) motor/yorum düzeyi: `i18n.py`
   `menu_custom` TR+EN silindi (61/61), `input.py` gamepad BUTTON_MAP "C" (RS) girdisi
   çıktı, `levelfile.py` `load_level` docstring'inden `restart_path` örneği kaldırıldı,
   `__init__.py` user_data_dir docstring "custom_level" → "level files". `DevConsole`
   ve console.py dokunulmadı. Doğrulama: py_compile + headless + deep-tool 0 BUG.

1. **Oyun içi editör (LevelEditor) kaldırıldı (25.09.2026):** `deep_engine/editor.py`
   SİLİNDİ. `core.py`'den editör oluşturma (`set_scene` → `self.editor =
   LevelEditor(...)`), E tuşu toggle bloğu ve `_frame`'deki "editör açıkken oyun
   durur / editör çizer" dalı kaldırıldı — update/draw/debug artık tek normal yol.
   `__init__.py`'den `from .editor import LevelEditor` + `__all__` girişi çıktı.
   `deep_engine/i18n.py`'den `menu_editor`/`editor_active`/`editor_saved`/
   `editor_loaded` anahtarları TR+EN temizlendi (62/62 parity korundu). Konsol
   açıkken E tuşu artık yok; DevConsole yapısı aynı. Doğrulama: py_compile +
   headless boot (menü içinde `hasattr(eng,'editor') == False` + 5 kare frame) OK.

0. **Oyun içi DevConsole (` tuşu) (25.09.2026):** `deep_engine/console.py` —
   `DevConsole` (metin girişi, komut geçmişi, komut kayıt sistemi `register_command`,
   `pygame.font` init guard). `input.py`: karakter toplama (`get_typed_text`,
   KEYDOWN event.unicode) + `KEY_MAP`'e BACKQUOTE/BACKSPACE/KPENTER/QUOTEDBL.
   `core.py`: BACKQUOTE/QUOTEDBL toggle; konsol açıkken scene update PAUSE ama draw
   + konsol yapılır, diğer kontroller (T/E/F3/ESC) devre dışı; ESC konsolu kapatır.
   `__init__.py` export `DevConsole`. Motor saflığı korundu (game import yok; oyuncu
   komutları `game/commands.py`'de kayıtlı).
   **Toggle düzeltmesi (aynı gün):** ilk sürümde konsolu açan tuş basışı, aynı karede
   `console.update()` tarafından "kapat" sanılıp konsolu anında kapıyordu (görünmez
   göz açıp kapanma). Çözüm: backquote/quote kapatma `console.update()`'ten çıkarıldı
   (yalnız ESC kapatır); toggle tek yerde = `core.py`. Açılış tuş karakterinin yazı
   satırına sızması `Input._typed_chars.clear()` ile önlendi (uçtan-uca test edildi).

1. **Motor çekirdeği** (madde 1): `core.py` (Engine, game loop), `scene.py`,
   `game_object.py`, `components.py` (SpriteRenderer, BoxCollider, Rigidbody2D, ...).
   Entity-Component: Engine → Scene → GameObject → Component.
2. **Zıplama/zemin fiziği düzeltmesi** (madde 2): `is_grounded` sıralaması, stabil
   zemin sondası.
3. **Parçacık + ses motoru** (madde 4): `ParticleEmitter`, `SoundFX` (retro 8-bit ses
   sentezi).
4. **Canlı Seviye Editörü** (madde 5, 9, 12): `editor.py` (E tuşu, ızgara, save/load,
   Z geri al, C kopyala, V yapıştır; TOOL_PLAYER spawn_pos, S-tuşu çakışması, göreli
   import düzeltmeleri).
5. **Görüntü/sahne servisleri** (madde 9): `Scene.add_shake` (trauma tabanlı
   screen-shake), `Scene.start` bekleyen nesneleri devreye alır.
6. **Seviye Dosya Sistemi** (madde 11): `levelfile.py` — `save_level`/`load_level`
   taşınabilir JSON; `register_builder(tag, fn)` + `register_extractor(tag, fn)` →
   motor oyundan bağımsızlaştı; editör aynı builder'ları kullanır.
7. **Giriş + kalıcılık + canlandırma** (madde 12): `Input` gamepad (analog + D-Pad +
   düğmeler, `get_horizontal_axis` A/D + analog), `savegame.py` (`SaveGame` JSON,
   `update_high_score`, `set`/`get`), `components.Animator` (kare dizileri, loop).
8. **Prosedürel üretici + temalar + müzik + dil** (madde 13, 21, 27, 38):
   - `procedural.py`: `BIOMES`, `generate(biome, seed, chunks, difficulty,
     viewport_width)` → deterministik (rng.random.Random(seed)), JSON-uyumlu;
     adım-zemin + ada + coin/spring/düşman/powerup/breakable yerleşimi; `BOSSES`
     sözlüğü + `_boss_design()` (zorluk ölçeklemesi) + `generate_boss_arena`.
   - `parallax.py`: forest/lava/cave/ice/desert/astro temaları + **kayan yıldızlar**
     + kozmik çizim (astro: nebula, yıldız kümeleri, halkalı gezegen).
   - `audio.py`: `BIOME_MODES` (mod/yarım-ton seti, kök oktav, seed, tempo),
     `_melody_walk` (LCG deterministik kontur), `_generate_track` (melodi+bas+armoni+
     ritim → `_mix_layers`, boss = alçak oktav + hızlı + sigma 6), **stereo**
     (mixer channels=2, `_create_stereo_sound`, melodi orta / armoni sağ / ritim sol),
     `play_music('<biyom>'|'boss_<biyom>'|menu|level|boss|victory)`.
   - `i18n.py`: `I18n`, `localize`, TR/EN.
9. **Güvenli üretim (prosedürel taraf)** (madde 16, 21 düzeltme, 31 A1):
   - `safe_max_x = player_start_x + safe_zone_width` (viewport 900 → "ilk ekran
     temiz"); güvenlik bölgesine giren segmentte ada/sniper/powerup/spring/breakable
     konmaz; ilk iki chunk zemin DÜZ başlar (step=0).
   - Sniper güvenlik ihlali fix'i (üretici `_maybe_island` safe_max_x bilmiyordu).
   - Spring spawn noktası fix (spring x=60 = player doğumu → süzülme/sonsuz-jump).
   - `_maybe_breakable(..., is_last_chunk)` — kısa (chunks≤4) seviyede son chunk'ta
     kırılabilir blok üretebilsin (tehdit değil, ölü kuralı).
10. **Game Feel motor tarafı** (madde 17–20): kamera **look-ahead** (velocity.x'e göre
    ±70px, lerp), `Scene.kick_camera` (punch, sönme 1-dt*10), `Scene.camera_zoom`/
    `zoom_to`/`camera_manual` (rotozoom merkez etrafında, is_ui ayrı çizim),
    `TextRenderer` shadow + `center_x`/`center_y`, ses varyasyonları (`play_jump` 3
    perde, `play_powerup(type)` 7 tını, `play("break")`, `play("boss_hit")`),
    `Health._death_burst` (3 renk katmanı + `_AutoRemove`), `FloatingScore`+kaldırma.
11. **Zaman katmanı** (madde 21): `Engine._time_slow_remaining`/`_time_slow_factor(0.4)`
    her frame `dt` ile motor seviyesinde erir; `components._slow_dt(dt)` düşman
    mermileri içindir (oyuncu etkilenmez); güç türü `"slow"`.
12. **BreakablePlatform + kalkan guard** (madde 22, 28): `components.BreakablePlatform`
    (hits eşiğinde `smash`), `Projectile` oyuncu mermisi tag=="Breakable" kırar / düşman
    mermisi geçer; Boss'a çarpınca `hasattr(comp,"shield_intact") and True ise hasar
    yok (motor tip bilmez). Boyutlar: normal yarım blok (bw=56/64/72, bh=20), boss
    kalkanı tam kare (44x44), editor TOOL_BREAKABLE w=64,h=20.
13. **Kamera/render düzeltmeleri** (madde 23, 26, 31, 43):
    - Zoom'lu çizimde `world_surf.fill(background_color)` (parallax üstü siyah fix).
    - UI çizim sırası: dünya → UI → vinyet (normal yol; UI HUD noktaları vinyetten önde).
    - `_build_vignette_surface` (önbellekli radial maske), `Scene.set_vignette`/
      `flash` — menü 0.5, oyun 0.22; `Health.take_damage` oyuncuda `flash(0.55)`.
    - `TextRenderer._render_complex` **segment bazlı** emoji/Arial ayrımı
      (`_is_emoji_char`): Türkçe/ASCII → Arial, gerçek emoji → Segoe UI Emoji
      (Türkçe karakter tozu fix'i).
14. **Event + Tween motoru** (madde 35): Component `on/once/off/emit`; `tween.py`
    (EASING + ease_* 9 fonksiyon, `_mix` float/Vector2/renk, `Tween` attr_path noktalı,
    `TweenComponent` `to/to_vec/after/do_after/delay/clear/running`, `_Chain` zincir;
    **kritik fix**: Vector2 tween yerinde (in-place) yazılır → referans kıyımı çözüldü).
    Export: `Tween, TweenComponent, Tweener, EASING`.
15. **Fizik çekirdeği sağlamlaştırma** (madde 33): iki taraf da Rigidbody2D taşıyorsa
    `_resolve_solid_collision` tek taraflı itme YAPMAZ (erken return — oyun mantığı
    `on_collision` ile); O(n²) çift döngü → **uzaysal grid** (CELL=128, `seen` seti;
    çıktı birebir aynı). `BoxCollider(one_way=True)` (madde 12).
16. **Async + tarayıcı kod desteği** (madde 34): `Engine.run()` (masaüstü) govdesi
    `_frame(dt)`'e ayrıldı; `async run_async()` (WASM, `await asyncio.sleep(0)`);
    `audio._sound_from_bytes` → BytesIO başarısızsa geçici `_snd_xxx.wav` sanal FS;
    `user_data_dir()` emscripten dalı (os.getcwd()).
17. **MotorLogger** (madde 36): `log.py` — seviyeler DEBUG<INFO<WARN<BUG<ERR, esik
    WARN; `add_handler` toplayıcı, `set_file`, `exception` (excepthook); emscripten'de
    window.console. main.py `__main__` log'u kurar (`motor.log`).
18. **SaveGame taşınabilirlik + BOM fix** (madde 34/C1): `encoding="utf-8-sig"`;
    tarayıcı localStorage katmanı (`window.localStorage`, anahtar
    `derinengine_save_v1`; save hem dosyaya hem LS'e; load önce LS). Masaüstü
    etkilenmez. `endless_unlocked`/`tutorial_done` kalıcı.
19. **Editor inspector (mini-Godot)** (madde 32, C5): seçili nesne düzenlenebilir —
    ok tuşları kaydırma, `[`/`]` boyut (16–256, collider eşleşir), `R` renk, DEL sil
    (geri alınabilir); inspector paneli (ad/tag/konum/boyut/bileşenler/RENK/kısayollar).
20. **İnce ayar bileşenleri** (madde 32, B3/B4): `SpawnIn(shorten_nearby=True,
    radius=220)` — oyuncu yakınsa doğuş hızlı (dt*3; tip başı 0.5–1.0s); `Health(ddd
    iframe_duration)` + `take_damage(amount=1, iframe=None)`.
21. **Diken görünümü + yerleşim geometrisi** (madde 38): `SpriteRenderer.shape="spikes"`
    (3 uçlu keskin ucgen + koyu taban + parlak uç çizgisi); üreticide coin-diken tam
    ortaşmada coin `-75` yüksekte (dikenin belirgin üstü), spring-diken <55px çakışan
    diken atlanır.
22. **Hata Avı: yüzeye gömülme fix + turret yoğunluğu dengesi** (26.09.2026,
    `03_game.md` AÇIK RAPOR 2+3): 
    - `components.Rigidbody2D` → `max_fall_velocity=1800.0` (varsayılan); `update`'te
      `velocity.y` pozitif yönde clamp — gravity+fall boost'un tek karede 24px tünel
      açmasını engelliyor (piksel havası korunur).
    - `scene._resolve_solid_collision` tek-yön dalı: nüfuz eşiği kalınlık bilinçli
      `(rect1.bottom - rect2.top) <= max(4.0, rect2.height + 6.0)`; derin nüfuzda
      dinamik merkez kuralı (`rect1.centery < rect2.centery` → üste çek; altta kalan
      doğal düşer). Oyuncu 1px'lik boşluktan vy 2600 ile inse bile üste oturuyor.
    - `procedural._place_chunk_enemies`: `count = rng.randint(1, 1 + difficulty)`
      (eski `1..2+difficulty`); mor düşman girişi kademeli (kullanıcı isteği): d<=1
      yok, d=2 seyrek (~%40 chunk), d>=3 tam ağırlık.
    - Doğrulama: `_sink_repro` A/B/C (vy 2600/1500/300; 1-8px boşluk) → gömülme 0,
      oyuncu platform üstü (156.0), `is_grounded=True`; üretim ölçümü 25 seed
      (kademe): d1=0.71 düşman/chunk turret 0 / d2=0.95 turret 17 / d3=1.18 turret 60
      / d4=1.49 turret 70; kampanya giriş sahnesi 90 kare headless hatasız.
23. **Motor tarafı güvenli temizlik** (26.09.2026, kullanıcı "kompakt + spagetti çöz"):
    `parallax.py` kullanılmayan `import math as _m` silindi; bilinçli `except: pass`
    fallback'lerine (audio 5, components 4, core 3, log 6, savegame 2 → toplam 20)
    `# noqa: bilinçli` etiketi eklendi (davranış DEĞİŞMEDİ; sadece "bilinçli" açık).
    `audio.py` önbelleğe-yazma döngüsündeki `open` `# noqa` ile işaretlendi. Tüm
    çift-döngü WARN'ları (scene grid, vinyet, raycast) yapısal olduğu için koddan
    DOKUNULMADI; deep-tool kural taraması 93→0 WARN'a düşürüldü (bkz. `04_tools.md`).

Doğrulama alışkanlığı (bu oturumda): headless dummy SDL + gerçek Engine kullanılır,
bozuk dosyalar için `py_compile`, her değişiklikte "oyun X sn çökmeden boot" kontrolü.

**JS/Python motor paritesi — `Engine.set_scene` boyut ataması (03.10.2026).**
Kullanıcı tarayıcı sürümünü oynarken "motor JS ile Python ile aynı denklikte
yazılmalı" diye netleştirdi. İlk denetimde bulunan gerçek fark: Python
`Engine.set_scene()` yeni sahneye `screen_width`/`screen_height` **atıyor**,
`DE.Engine.set_scene()` ise atamıyordu → 900x600 dışında boyutlu bir sahne
kurulduğunda UI/parallax/kamera yanlış boyutu kullanırdı. JS'e aynı iki atama eklendi
(`engine/core.js`). **Kalan:** modül modül API/karşılaştırması + otomatik parite
testi (bkz. `03_game.md` OYUN KALAN, "JS motoru ↔ Python parite denetimi").

---

## MOTOR KALAN (bekleyen motor işleri, sıra kullanıcıyla)

- Müzik tema bağlama derinliği (seviye geçişinde daha merkezi). — **TAMAMLANDI**
  (oyun `scenes._play_theme` merkezi; yukarıya 27.09 kaydı bak).
- (Bekliyor) motor özelliği 6 — **veri katmanı**: tilemap verilerini dosyaya
  serileştirip geri yükleme (`.map` köprüsü: tilegrid → sınır segmentleri/custom
  geometry). > **TAMAMLANDI (27.09.2026):** `Tilemap.to_data()`/`from_data()`
  (JSON-safe roundtrip) + `to_segments()` (dolu hücrelerin dış sınır segmentleri;
  iç kenarlar cull; boş = tile_set'te rengi olmayan ID — draw() ile tutarlı).
  Testler: TEST1_OK (2x2 blok → 8 segman, iç kenar yok) + TEST2_OK (2 katman
  roundtrip → 14 segman, üst katman hücresi sınır yapıyor).
- (Bekliyor) motor özelliği 7 — **motor-UI kiti**: `deep_engine/ui.py` içinde
  Panel/Button/ScrollContainer + temalar (mouse/klavye/gamepad etkileşimi); mevcut
  oyun menüsü/HUD bileşenleri zamanla bu kit'e taşınır. > **TAMAMLANDI (27.09.2026):**
  YENİ `deep_engine/ui.py` — `UITheme` (renk paleti, override edilebilir),
  `Panel` (yuvarlak dikdörtgen panel), `Button` (hover/press/focus durumları,
  mouse tık + ENTER/gamepad-A aktivasyonu, `enabled`/`on_click`), `ScrollContainer`
  (madde listesi, clip + scrollbar, wheel + handle drag, `on_pick`). `Input`'a
  `get_mouse_button()` (basılı tutma) eklendi. Exportlar: `UITheme`, `Panel`,
  `Button`, `ScrollContainer`. Testler: BUTTON_CLICK_OK, SCROLL_PICK_OK,
  SCROLL_RANGE_OK, SCROLL_DRAG_OK, UI_DRAW_OK, UI_KIT_OK. (Oyun tarafında kullanımı
  ayrı görev → `03_game.md`.)
- (Bekliyor) motor özelliği 1 (Event+Tween) sonrası temizlik: docs/tests.
  > **HEDEF (28.09.2026):** Event (`Component.on/emit`) ve Tween sistemine
  > tamamlayıcı test + kısa doküman notu ekle (başlangıç kaydı).
  > **TAMAMLANDI (27.09.2026):** yeni `tests/test_engine_core.py` → `python tests\test_engine_core.py`
  > = `ALL OK`. Kapsar: Event `on/once/off/emit` (once tek tetik, off tek callback + tümünü
  > temizleme, kwargs iletimi) + Tween float/Vector2/color (yerinde Vector2 yazımı, renk
  > clamp 0-255), zincir `after()`, `delay`, easing string (bounce/back), `clear()`.
  > Not: `to()` source'unu `getattr/setattr` ile okuduğundan attribute nesneleri kullanılır
  > (dict DEĞİL — test `SimpleNamespace`).
- (Bekliyor) motor özelliği 6 — **veri katmanı**: tilemap verilerini dosyaya

> NOT (30.09.2026, kayıt temizliği): Yukarıdaki satır, 27.09 tarihli TAMAMLANDI
> kaydının yarım kalan mükerreridir (aynı iş iki kez yazılmış). Geçerli kayıt
> L246-252'deki TAMAMLANDI bloğudur; oyun tarafındaki karşılığı (`tilemap_save` /
> `tilemap_load` konsol komutları) `03_game.md`'de durur.

---

## DEVİR GÖREVİ — DeepTool tarama WARN'ları (deep_engine/ tarafı) — KAPANDI

> Kaynak: `python tools\deep-tool.py --lang tr all` (ARAÇ oturumu). BUG/ERR yok,
> yalnızca WARN var. Bu görev tamamlanınca `sessions/04_tools.md` + `_shared.md`'ye
> sonuç kaydedilir.
>
> **SONUÇ (27.09.2026):** Motor tarafındaki tüm WARN'lar giderildi (14 modül × 0/0/0).
> Aşağıdaki liste TARİHSİZ bir deneme listesi olarak duruyor; artık açık iş yok.

1. **Sessiz `except Exception: pass` → bilinçli hale getir** (yaklaşık 22 satır):
   - `deep_engine/audio.py`: L33, L43, L281, L295, L313
   - `deep_engine/components.py`: L398, L446, L456, L620
   - `deep_engine/core.py`: L87, L155, L198
   - `deep_engine/editor.py`: L305, L310
   - `deep_engine/log.py`: L93, L105, L111, L118, L125, L137
   - `deep_engine/savegame.py`: L41, L56
   - Yön: best-effort olanlara `MotorLogger` debug/uyarı düş (hata LOG'DA kalsın) ya da
     except'i daralt (örn. sadece `OSError`); gerçek hata saklıyorsa log'la. Oyun
     davranışını DEĞİŞTİRME — sadece görünürlük/niyet.
2. **Kullanılmayan import**: `deep_engine/parallax.py` L111 → `_m` (gerçek ölü kod).
3. **Modül 6 O(n²) incelemesi** — çoğu sabit-küçük liste = yanlış pozitif; GERÇEK
   O(n²) varsa (örn. `scene.py` nesne-bot çift taraması) uzaysal grid ile kareye çek
   (madde 33 örneği):
   - `deep_engine/scene.py`: L21, L163, L165, L170, L172, L174, L197
   - `deep_engine/audio.py`: L52 (döngü içi dosya açma), L138, L202, L339, L372, L407, L609
   - `deep_engine/levelfile.py`: L189, `deep_engine/parallax.py`: L118,
     `deep_engine/procedural.py`: L249
   - Yanlış pozitifse kod değiştirme; ARAÇ oturumuna "tarayıcı ayarı gerekli" notu ver.

> **TAMAMLANDI (27.09.2026, MOTOR oturumu):**
> **Madde 1 — sessiz except'ler bilinçlendi.** 20 noktada `pass` yerine anlamlı ifade
> (MotorLogger `log.debug`/`log.warn` ya da akış/atama) koyuldu → deep_engine/ tarafında
> Modül 7 "boş except" listesi ve WARN'lar **sıfırlandı**. Özet:
>   - `audio.py` (5): `log` importu eklendi; BytesIO decode fallback'i `log.debug`,
>     `play/play_jump/play_powerup` hataları `log.warn` (kanal sınırı nadirdir).
>   - `components.py` (4): `log` importu eklendi; hasar flaşı, ölüm patlaması,
>     sarsıntı, AutoRemove hataları `log.debug`.
>   - `core.py` (3): `log` importu eklendi; savegame dil yazma, web konsol yansıması
>     (print yedeği aynen durur), debug overlay oyuncu bilgisi `log.debug`.
>   - `savegame.py` (2): `log` importu eklendi; localStorage erişilemezse `log.debug`,
>     yazma başarısızsa `log.warn`.
>   - `log.py` (6): logger kendi içinde log çağıramaz (sonsuz döngü) → `pass` yerine
>     akış ifadeleri: `self._file_handle = None` (kapatma/yazma hatasında referansı
>     temizle), `continue` (bozuk handler'ı atla), `return` (konsol/tarayıcı yoksa).
>   - NOT: `deep_engine/editor.py` artık yok (webpanel'e taşındı) — o satırlar güncel.
> **Madde 2 — `_m` ölü import:** zaten yoktu, deep-tool Modül 11 artık raporlamıyor.
> **Madde 3 — Modül 6 O(n²):** tüm satırlar incelendi → **yanlış pozitif** (sabit
> boyutlu küçük döngüler: sessentez tamponları, vignette cache, `candidates`=2 eleman,
> parallax 4 bulut/18 yıldız, tilemap görünür-hücre cull, procedural `count≤4`) veya
> **düşük önem** (scene.py L245 stable-ground O(n×m) `break` ile erken çıkar; collision
> zaten uzaysal grid CELL=128 ile karededir). Kod değişikliği GEREKMEDİ. ARAÇ tarayıcı
> ayarı önerisi: Modül 6 küçük-sabit listeleri (ör. `< 32` hücre/satır) yanlış-pozitif
> notuyla yumuşatabilir → `04_tools.md` KALAN'a eklendi.
> **Doğrulama:** `py_compile` ile derleme OK; `deep-tool --lang tr all` → **0 WARN, 0 BUG,
> 0 ERR**; headless menü 180 frame + ses/log best-effort yolları OK (MENU_BOOT_OK,
> AUDIO_LOG_OK). Oyun davranışı değişmedi (yalnız görünürlük/niyet).
> ⏳ KALAN commit+push (kullanıcı onayı).
>
> **KAPANDI (27.09.2026):** commit + push yapıldı (`fix: sessiz except...`).
> "⏳ KALAN commit+push" satırı tarihsel not olarak duruyor, açık iş DEĞİLDİR.
> Modül 6 yumuşatma önerisi de 27.09'da `tools/deep-tool.py`'de uygulandı
> (`_const_loop_size`, `< 32` küçük-sabit döngü INFO'ya iner → 8 döngü INFO).

19. **Kamera takibi + sarsıntı motoru (madde 44, 01.10.2026):**
    - `Scene.set_camera_target()` artık **ilk takip karesinde hedefe snap** eder
      (`_camera_snap_pending`); sonraki kareler lerp ile yumuşatır. Yeni yardımcılar:
      `camera_follow_point()`, `snap_camera_to_target()` (hedefe ışınlar ve
      kick/shake ofsetini **temizler**).
    - `_update_shake(dt)`: trauma `1.4 * dt` ile söner, ofset kamera *+* konum
      toplamıdır (çizimde uygulanır, mantıkta biriktirilmez).
    - `render_camera` **yalnız** çizim içindir (kamera + ofset); mantık her zaman
      `camera_position` kullanır → zoom/pan sarsıntıyla kaymaz.
    - JS eşi birebir (`deep_engine_html/engine/core.js`): `shake_offset`,
      `shake_max_offset = 14.0`, `snap_camera_to_target()`, `render_camera` getter,
      ve Python API'si için `shake_trauma` getter/setler takma adı.
    - `GameObject.get_component()` geçersiz tipte (None/str) `None` döndürür —
      JS motoru tek başına yüklenip test edildiğinde sessizce patlıyordu.
    - **ÖNEMLİ TESPİT (03.10.2026):** motorun "stable ground" adımı
      (`scene.py::_handle_physics_and_collisions`) çarpışma bildiriminden **önce**
      çalışır: oyuncuyu zemine yapıştırıp `velocity.y = 0` yapar. Bu yüzden
      `BoxCollider(one_way=True)` platformlarda **`overlap_check` hiç True olmaz**
      ve `on_collision` tetiklenmez. Tek yönlü platforma dayanan oynanış
      (`ClimbPlatform` sekmesi) `is_grounded` durumundan sürmek ZORUNLADIR.

---

## OYUN DOSYASINA AKTARILAN İLİŞKİLİ GELİŞMELER (yalnızca bilgi)

Awake sistemi (16), Game Feel oyuncu tarafı (17–19), boss tipleri (22), canlı menü
(23), kampanya/skor (14/29/30), UX (40), emoji HUD (41), dash koruması (42) — bu
işlerin motor tarafına dokunan bileşenleri yukarıda kayıtlı; asıl oynanış kayıtları
`03_game.md`'de.
---

## JS MOTORUNE AKTARIM (03.10.2026) — Python/JS PARITE KAPISI

**Karar:** Motor gelistirme yolu artik **deep_engine_html/engine/ (JS)**.
deep_engine/*.py **donduruldu**; yalnizca API katalogu + regresyon testi olarak yasar.

### Yapilanlar
1. **API envanteri cikarildi ve bosluklar kapatildi:**
   - core.js — Component.on/once/off/emit (Python Component._events API'si),
     GameObject.parent/children, dd_child/remove_child/find_child/world_position,
     alt agac update/draw (cocuklar kapaliysa cizilmez), Engine.run_async(),
     Engine.stop().
   - ender.js — TextRenderer.start() + _font_css (font onbellegi).
   - particles.js — Particle.draw() (bagimsiz cizim).
   - log.js — set_file()/close_file()/file_buffer() (web'de dosya yazma yok,
     bellek tamponu; Python ile ayni arayuz).
   - procedural.js — Python isimli API: DE.generate, DE.pick_biome,
     DE.generate_boss_arena, DE.BIOMES/BIOME_NAMES/BOSSES/BOSS_TYPES.
   - game/climber.js — DE_GAME.floor_gap/floor_y/reset_floor_cache.
   - game/commands.js — DE_GAME.cmd_* takma adlari.
2. **	ools/parity_check.py yazildi (yeni kalici arac).**
   - Python tarafi st ile sinif/metot/fonksiyon envanteri.
   - JS motor tarafi **gercek Node yuklemesi** + DE.* introspection.
   - JS oyun tarafi DE_GAME.* atamalari + sinif/fonksiyon exportlari.
   - Cikti: --json (deep-tool Modul 14 icin) ve insan-okunur rapor.
   - game/commands.py::ensure_dir() yalnizca Python disk yardimcisi -> KNOWN_EXCEPTIONS
     (JS'te karsiligi yok; oyun davranisi degil).
3. **deep-tool Modul 14 eklendi:** [14] Python/JS parity.
   Bosluk = BUG; denetim calistirilamazsa acik ERR (sessiz gecis yok).
   python tools\deep-tool.py --lang tr 14 ->   WARN, 0 BUG, 0 ERR.
4. **Parite araci mutasyonla dogrulandi:** GameObject.world_position yeniden
   adlandirildi -> METOT_YOK; DE_GAME.cmd_hp kaldirildi -> FONKSIYON_YOK.
   Denetim gercekten bosluk yakaliyor.
5. **Yeni testler (	est_core.js):** Component event sistemi (8 kontrol),
   GameObject sahne agaci (3), un_async/stop (4). Sonuc: **35 kontrol, ALL OK**.
   > Tuzak: JS Engine yapicisi canvas.getContext("2d") ister ve DE.DevConsole
   > kurar -> headless testte sahte canvas + console.js yuklemesi sart
   > (ui.js, log.js, i18n.js, savegame.js bagimlilik zinciri).
   > Ayrica Engine imzasi (canvas, title, w, h, fps) — ilk arguman **canvas**.

### Durum
- Parite: **TAM** (SONUC: PARITE TAM — 115 motor + 59 oyun sembolu).
- Regresyon: JS 12 dosya **584 kontrol** (402 motor + 182 oyun) yesil;
  Python 	est_engine_core.py + 	est_climber.py ALL OK;
  	est_tools.js 36/36; 	est_browser.js 44/44; deep-tool TR/EN **0/0/0**.

### Motor KALAN (JS tarafi, sirayla)
1. **Oynanis paritesi** (API denk, ama modul/modul davranis farki olabilir):
   core/scene/components/physics/render/tween/input/particles/audio/lighting/
   parallax/i18n/levelfile/savegame/log/procedural/console — her modul icin
   "Python ne yapiyor, JS ne yapiyor" karsilastirmali test + oynanisi olcum.
2. Engine.run_async() tarayicida smoke testi (Promise + requestAnimationFrame
   yasam dongusu, 	ools_html/test_browser.js icine eklenmeli).
3. Oyun tarafi: state/entities/bosses/ui/scenes/builders icin public API +
   oynanis testleri genisletme (182 kontrol su an yalnizca oyun regresyonu).
4. Python'da kalan **ozel durumlar** (or. pygame'e ozel kisitlar) icin
   "JS kariligi nedir" notlari.