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
   - 
ender.js — TextRenderer.start() + _font_css (font onbellegi).
   - particles.js — Particle.draw() (bagimsiz cizim).
   - log.js — set_file()/close_file()/file_buffer() (web'de dosya yazma yok,
     bellek tamponu; Python ile ayni arayuz).
   - procedural.js — Python isimli API: DE.generate, DE.pick_biome,
     DE.generate_boss_arena, DE.BIOMES/BIOME_NAMES/BOSSES/BOSS_TYPES.
   - game/climber.js — DE_GAME.floor_gap/floor_y/reset_floor_cache.
   - game/commands.js — DE_GAME.cmd_* takma adlari.
2. **tools/parity_check.py yazildi (yeni kalici arac).**
   - Python tarafi st ile sinif/metot/fonksiyon envanteri.
   - JS motor tarafi **gercek Node yuklemesi** + DE.* introspection.
   - JS oyun tarafi DE_GAME.* atamalari + sinif/fonksiyon exportlari.
   - Cikti: --json (deep-tool Modul 14 icin) ve insan-okunur rapor.
   - game/commands.py::ensure_dir() yalnizca Python disk yardimcisi -> KNOWN_EXCEPTIONS
     (JS'te karsiligi yok; oyun davranisi degil).
3. **deep-tool Modul 14 eklendi:** [14] Python/JS parity.
   Bosluk = BUG; denetim calistirilamazsa acik ERR (sessiz gecis yok).
   python tools\deep-tool.py --lang tr 14 -> 0 WARN, 0 BUG, 0 ERR.
4. **Parite araci mutasyonla dogrulandi:** GameObject.world_position yeniden
   adlandirildi -> METOT_YOK; DE_GAME.cmd_hp kaldirildi -> FONKSIYON_YOK.
   Denetim gercekten bosluk yakaliyor.
5. **Yeni testler (test_core.js):** Component event sistemi (8 kontrol),
   GameObject sahne agaci (3), 
un_async/stop (4). Sonuc: **35 kontrol, ALL OK**.
   > Tuzak: JS Engine yapicisi canvas.getContext("2d") ister ve DE.DevConsole
   > kurar -> headless testte sahte canvas + console.js yuklemesi sart
   > (ui.js, log.js, i18n.js, savegame.js bagimlilik zinciri).
   > Ayrica Engine imzasi (canvas, title, w, h, fps) — ilk arguman **canvas**.

### Durum
- Parite: **TAM** (SONUC: PARITE TAM — 115 motor + 59 oyun sembolu).
- Regresyon: JS 12 dosya **584 kontrol** (402 motor + 182 oyun) yesil;
  Python test_engine_core.py + test_climber.py ALL OK;
  test_tools.js 36/36; test_browser.js 44/44; deep-tool TR/EN **0/0/0**.

### Motor KALAN (JS tarafi, sirayla)
1. **Oynanis paritesi** — > **TAMAMLANDI (03.10.2026):** 5 paralel ajanla 20
   dosya çifti davranışsal olarak karşılaştırıldı; sonuçlar "DAVRANIŞSAL PARİTE
   ANALİZİ" bölümünde. **Sırada olan: bulunan 5 OYUNU BOZAR + ORTA farkların
   JS tarafında düzeltilmesi** (bkz. aynı bölümün KALAN özeti).
2. Engine.run_async() tarayicida smoke testi (Promise + requestAnimationFrame
   yasam dongusu, tools_html/test_browser.js icine eklenmeli).
3. Oyun tarafi: state/entities/bosses/ui/scenes/builders icin public API +
   oynanis testleri genisletme (182 kontrol su an yalnizca oyun regresyonu).
4. Python'da kalan **ozel durumlar** (or. pygame'e ozel kisitlar) icin
   "JS kariligi nedir" notlari.
---

## TAMAMLANDI (02.10.2026) — FIZIK MOTORU PYTHON REFERANSIYLA BIREBIR ESITLESTIRILDI

**Kullanıcı bildirimi:** "fizik motoru py motorda ki kadar iyi değil. py motorda ki tüm kodu
olduğu gibi html'de baştan yaz demiştim."

İki ayrı kök neden bulundu ve **ölçümle** kanıtlandı (tahmin yok):

### 1. Ana döngü ekran hızına bağımlıydı (core.js)
- **Eski:** dt = Math.min(1/30, (now - last)/1000) → 144/240 Hz ekranda oyun **daha hızlı**
  işliyordu; fizik adım sayısı ekrana bağlıydı.
- **Python:** clock.tick(60) + if dt > 0.05: dt = 0.05.
- **Yeni:** _frame(now) birikimçi (accumulator) ile **sabit 1/60 s** fizik adımı,
  dt cap 0.05, kare başına en fazla 5 adım (ölü kısır döngü koruması).
  İlk karede de bir adım atılır (Python'da ilk clock.tick() sıfır değildir).
- _step(dt) ve _render_frame() olarak ayrıldı; **çizim yine kare başına 1 kez**.

### 2. Python'ın stabil zemin probu JS'te eksikti (physics.js)
- Python deep_engine/scene.py çarpışma sonrası **2px ayak probu** ile is_grounded
  sabitler. JS'te is_grounded yalnız çakışma anında set ediliyordu → oyuncu
  zeminde dururken is_grounded = false kalıyordu.
- **Sonucu:** oyuncu **gitmesi gereken yerden geçiyordu** (düşman eski JS'te 268'de
  durması gerekirken 571'e kadar koşuyordu) — kullanıcının "fizik daha kötü"
  hissinin kaynağı buydu.
- **Eklendi:** DE.Physics._detect_ground(scene, solids) +
  DE.Physics._polygon_surface_y(poly, x) (polygon için yüzey yüksekliği),
  DE.Physics.resolve() sonunda çağrılır.

### 3. YANLIŞ YAPILAN İŞ (kayda geçirildi — tekrar yapılmasın)
test_browser.js 43/1 verdi: **ESC çalışmıyordu.** Sebep: ESC kontrolünü
_render_frame() içine almıştım, ama get_key_down bir **kenar (edge)** sorgusudur ve
_step() sonundaki Input.end_frame() hepsini sıfırlar. Çözüm: ESC bloğu
_step() içinde, end_frame() **öncesine** taşındı (Python Engine._frame sırası).

### 4. Ölçüm (Python referansı tests/probe_physics_ref.py)
| Ölçüm | Python | JS (yeni) |
|---|---|---|
| Zıplama tepesi | 132.2 px | **132.2 px** |
| Dururken is_grounded | True | **True** |
| Dikey hız (durable) | 0.0 | **0.0** |
| Fizik adımı/saniye | 60 | **60.0 / 59.5 / 59.2** (60/144/240 Hz) |

> NOT: "yürüme mesafesi" dil arası **kıyaslanamaz** — JS (DE._rng) ve Python
> (random) farklı RNG kullanır, aynı çağrı farklı seviye üretir. Bu yüzden
> kapılar yalnızca **yerleşimden bağımsız** fizik ölçümlerini karşılaştırır.

### 5. Yeni kalıcı kapılar (+10, toplam 50 görsel/fizik kapısı)
test_smoke.js: 60/144/240 Hz zıplama tepesi eşitliği, adım/saniye ≈ 60,
**Python 132.2 px referansı**, grounded=true, dururken vy=0, D ile koşma.

### 6. Kapılar gerçekten yakalıyor (mutasyon kanıtı)
| Bozulan yer | Yakalanan kapı | Sonuç |
|---|---|---|
| physics.js ayak probu silindi | "JS yururken grounded=true" | 49/50 (grounded=false) |
| core.js FPS kaldırıldı | test_core.js kare ilerlemesi | 33/35 |

### 7. Regresyon
JS 13 dosya tamamı yeşil (test_game.js 182/182, test_core.js 35/35,
test_smoke.js 50/50 kapı + 0 hata, 34 tur ~10.4k kare); test_browser.js 44/44;
test_tools.js 36/36; Python testleri ALL OK; DeepTool 14: 0 WARN, 0 BUG, 0 ERR.
---

## DAVRANIŞSAL PARİTE ANALİZİ (03.10.2026) — dosya dosya Python <-> JS motor

**İstek:** "Python motorla HTML motorun denkliklerini analiz et, her betiğe bak,
her scriptin birebir aynı işleve yaradığını tespit et — sadece motor dosyaları."
**Yöntem:** `parity_check.py` yalnız API envanteri verdiği için 5 paralel ajan
**davranışsal** (sabit/formül/sıra/kenar durumu) karşılaştırma yaptı; tüm çiftler
okundu. Python = referans (çalışan ürün), JS = port.

### Dosya bazlı sonuç tablosu

| Python | JS karşılığı | VERDICT |
|---|---|---|
| core.py | core.js | **CİDDİ FARK** (ESC sırası, lighting çağırmıyor, transparent yok) |
| game_object.py | core.js (GameObject) | KÜÇÜK FARK |
| scene.py | core.js (Scene) + physics.js + render.js | **CİDDİ FARK** (eğim dalı + AABB kapısı yok, find_by_tag active filtresi yok, vinyet formülü 3.3x) |
| components.py | components.js + render.js + physics.js + core.js parçaları | **CİDDİ FARK** (hasar flaşı yok, ölüm sarsıntısı yok) |
| particles.py | particles.js | KÜÇÜK FARK (yarıçap yuvarlama/clip) |
| lighting.py | lighting.js | KÜÇÜK FARK (ama render_lights hiç çağrılmıyor -> ORTA) |
| procedural.py | procedural.js | KÜÇÜK FARK (RNG algoritması farklı -> ORTA) |
| audio.py | audio.js | **CİDDİ FARK** (initialize() hiç çağrılmıyor -> SES YOK) |
| ui.py | ui.js | KÜÇÜK FARK (scroll köprüsü yok, set_text ölçümü tahmin) |
| tween.py | tween.js | **BİREBİR** |
| parallax.py | parallax.js | KÜÇÜK FARK (negatif modulo -> yıldız seyrelmesi ORTA) |
| i18n.py | i18n.js | **BİREBİR** (77/77 anahtar, değer farkı 0) |
| input.py | input.js | **CİDDİ FARK** (fare clientX/Y, gamepad-A statik yok) |
| tilemap.py | tilemap.js | KÜÇÜK FARK (textured=true bilinçli görsel ek) |
| levelfile.py | levelfile.js | KÜÇÜK FARK (save_level imzası değişmiş ORTA) |
| math2d.py | math2d.js | **BİREBİR** (tüm formüller) |
| console.py | console.js | KÜÇÜK FARK |
| log.py | log.js | KÜÇÜK FARK (set_file -> bellek tamponu, saat damgası yok) |
| savegame.py | savegame.js | KÜÇÜK FARK (dosya yok; tarayıcıda beklenen) |
| scenemanager.py | scenemanager.js | **BİREBİR** |
| __init__.py | core.js:8 | KÜÇÜK FARK (0.1.19 -> 1.0.0) |

### OYUNU BOZAR (5 kritik — "oyun eskisinden beter" çıkışının kaynakları)

1. **SES YOK:** `audio.js` `initialize()` üretim yolunda hiç çağrılmıyor; `play/
   play_jump/play_powerup` tembel başlatma yapmıyor -> 21 SFX'in tamamı sessiz.
   `test_audio.js:89` önce initialize çağırdığı için test maskeliyor. Menü müziği de
   yok (`main.py:85` -> `game/main.js` karşılığı eksik).
2. **FARE KAYMIŞ:** `input.js:58` `clientX/Y` (pencere koordinatı) saklanıyor;
   canvas ortalanmış + CSS ölçeklenmiş + 2px border -> `getBoundingClientRect`
   düzeltmesi yok. Menü hover/tıklama, fare ile atış, seviye seçimi yanlış yerde.
3. **ESC ÇİFT İŞLEME:** `core.js` ESC kontrolü `scene.update()` SONRASI -> pause
   menüsü kapanıp aynı karede yeniden açılıyor (Python: core.py:113 update ÖNCESİ).
4. **EĞİM FİZİĞİ:** (a) `physics.js:277-288` zemin probunda AABB kapısı yok ->
   havadayken rampanın yüzeyine ışınlanma (`fy <= surf+3` tek başına yetiyor;
   py:293 `colliderect` şartı eliyor). (b) `_resolve_solid_collision` eğim dalı
   (py:334-348, 16px tolerans bandı) JS'te hiç yok -> `physics.js:213` sadece
   BoxCollider kabul ediyor, dik rampa inişinde kopma.
5. **LIGHTING ÖLÜ:** `Engine.lighting` + `render_lights` çağrısı JS'te yok
   (`lighting.js:61` yalnız testten çağrılıyor); oyun 18+ ışık kaynağı kuruyor
   -> ekran düz/ışıksız.

### ORTA (görünür fark, düzeltme kolay)

- `Scene.transparent` yok -> pause donmuş oyunu örtemiyor (tamamen opak dolgu).
- `find_by_tag` `active` filtresini kaybetti -> ölü oyuncu hâlâ bulunuyor.
- `Health.take_damage` -> `scene.flash(0.55)` yok (Scene.flash var ama ölü kod);
  `_death_burst` -> `_shake(0.2)` yok; oyuncuya gereksiz 0.12 sarsıntı ekleniyor.
- Vinyet/flaş: JS doğrusal alfa ~3.3x daha koyu (py piksel-maske `strength=0.30`).
- `TextRenderer`: baseline farkı (~fs px yukarı), emoji segmentasyonu yok.
- Parallax negatif modulo (`% 2400`) -> uzun seviyelerde yıldızlar kayboluyor,
  siluet 2400px kaymış (py pozitif modül).
- `_lcg` JS'te float64 -> melodi Python'dan farklı (`Math.imul` ile birebir olur);
  stereo loop max/py min -> parçalar 1-2.3s uzuyor, sol kanal kuyrukta sessiz;
  müzik kazancı 0.4 (py 1.0).
- Prosedürel RNG: Mulberry32 vs random.Random -> aynı seed FARKLI seviye
  (dağılımlar eşdeğer, kalite regresyonu yok — ama tekrarlanabilirlik kaybı).
- `input.js` `DE.Input._gamepad_a_down` statik değil -> gamepad A ile menü onayı ölü.
- `save_level(scene, path, extra_meta)` -> JS `save_level(scene, extra_meta)`:
  Python çağrısı taşınırsa meta'ya string sağlanır.
- Sürüm: JS 1.0.0 / Python 0.1.19 (menü rozeti + konsol `version` yanlış).

### NEDEN TESTLER YAKALAMADI

- `test_audio.js` initialize'i kendisi çağırıyor; `test_input.js` sahte olaylara
  canvas-uzayı koordinat veriyor (getBoundingClientRect=0,0 stub) ve `_gamepad_a_down`
  instance üzerinden test ediyor; `parity_check.py` `_` önekli metodları atlıyor
  (özel fonksiyon sapmaları kapıdan geçiyor); davranış testi yok — yalnız API adı.

### 5 OYUNU BOZAR DÜZELTİLDİ (06.10.2026 — A1-A5 tamamlandı)

1. **SES YOK (A1):** `audio.js` tembel `_ensure_initialized()` eklendi — `play`/
   `play_jump`/`play_powerup`/`play_music` artık gerekince kendisi kurar; `main.js`
   açılışta `SoundFX.initialize()` + `play_music("menu")` çağırıyor (Python
   `main.py:78/86` paritesi). 21 SFX + menü müziği artık duyulur.
2. **FARE KAYMIŞ (A2):** `input.js:58` `clientX/Y` → `getBoundingClientRect` ile
   canvas uzayına çevriliyor; tıklama/hover artık CSS-ölçekli canvas'ta doğru.
3. **ESC ÇİFT İŞLEME (A3):** `core.js` ESC işleme `scene.update()` ÖNCESİNE taşındı
   (Python core.py:113-123 paritesi); `game/ui.js` `PauseController.update`'teki
   ESC kolu KALDIRILDI (Python ui.py:698-718'de ESC yok — ESC yalnız `on_escape`).
   Artık pause tuşuyla kapanıp aynı karede yeniden açılmıyor.
4. **EĞİM FİZİĞİ (A4):** `physics.js:277-288` zemin probuna AABB kapısı eklendi
   (py:293 `colliderect` şartı) + `_resolve_solid_collision` eğim dalı port edildi
   (py:334-348, 16px tolerans bandı) — havadayken rampaya ışınlanma durdu.
5. **LIGHTING ÖLÜ (A5):** `core.js` `_ensure_lighting()` (tembel) + `_render_frame`'da
   `render_lights` çağrısı eklendi; menü/pause/zafer/game-over muaf (Python core.py:134
   + `LIGHTING_EXEMPT` listesi). Oyun ışıkları artık canlı.

**KALAN (sıra):** ORTA listesinin JS tarafında düzeltilmesi (Python'a dokunulmaz).
Düzeltirken her madde için mutasyon kapısı (mevcut test neden yakalamadı bilgisiyle)
düşünülmeli. — Not 06.10: `test_smoke.js`'in flaky'liği (pause fix sonrası oyuncunun
prosedürel sol kenarda ölmesi) giderildi: `campaign/play` turunda 40 karelik "a"
sürüklenmesi kenar çukuruna düşürüyordu; 12+12 kare denge adımı + 8/8..10/10 koşu
doğrulaması (aşağıda smoke kaydı).
— Not 07.10: **ORTA'dan çözüldü → `TextRenderer` baseline farkı.** Python `blit`
sol-üst köşe, JS `fillText` baseline tabanlıydı → üstteki yazılar ekran dışına
taşıyordu (kullanıcı: "Star Collector Hero yarısı kesik"). `render.js` top-left
semantiği + `ascent` eklendi; `center_y` yüzey yüksekliğine göre. Kaynak: 03 oturumu
(görünüm suçlaması), kayıt `_shared.md`'de. Emoji segmentasyonu HÂLÂ eksik (ayrı Orta
madde).
— Not 07.10: **ORTA'dan çözüldü → zemin kare grid TAMAMEN kalktı, eski yumuşak
köşeli sprite tasarımı geri.** Kullanıcı: "ben eski köşeleri yontulmuş yumuşak
tasarımı istiyorum, bu kare grid değil; platformlar ince ama kareli görünüyor."
Dünkü `textured=false` (ızgara içi doku) **yetersiz kaldı** → tilemap artık sahnede
**SADECE veri köprüsü** olarak durur, çizilmez (`game/scenes.js` `tm_obj.active =
false`; `import_scene_tilemap` yeni-nesne dalında da). Zemin sprite'ları
**gizlenmez** (`border_radius=4` yumuşak köşe görünümü geri; collider'lar durur).
`_tilemap_segments`/`to_data` editör köprüsü AYNEN çalışır. Bilinçli JS sapması
(Python donmuş referansı tilemap çizimini korur). `test_smoke.js` kapısı →
"tilemap gorsel kapali + veri dolu + zemin sprite'lari gorunur". Testler: game 194,
core 50, smoke 50/50, browser 50, tools 36, tilemap 32, parity TAM.

### ORTA M5-M9 KAPANDI (08.10.2026) + M7 PARİTE KAPISI GECTİ

- **M5 parallax modül:** `parallax.js` `DE._pmod` (JS `%` negatif kalıyor) —
  satır19 scroll_x, satır111 bx, satır126 stx, satır136 px. Doğrulama: pmod(-5,7)=2,
  negatif kamerada yıldızlar 0'da kalmıyor.
- **M6 audio/stereo:** `_lcg` → `(Math.imul(state,1103515245)+12345)&0x7fffffff`
  (node↔py 13 değer birebir, big-state dahil); stereo loop `Math.max` → `Math.min`
  (py `_create_stereo_sound` min); müzik kazancı zaten 1.0.
  **Test düzeltmesi:** `test_audio.js` stereo eski `length===3` (max çağının
  kalıntısı) → py min = `length===2` beklentisine çekildi → 33/33.
- **M8 gamepad-A:** `input.js` `_gamepad_a_down()` instance metodu (py:
  `_joy_buttons_down.size > 0`) + `DE.Input._gamepad_a_down` statik köprü
  (`ui.js` guard'ı `undefined` ölüyordu).
- **M9 save_level:** `DE.save_level(scene, path=null, extra_meta=null)` — non-string
  2. arg → extra_meta (geri uyum); `_fs`/Node `require("fs")` ile
  `JSON.stringify(data,null,2)`; `DE.load_level` string JSON başarısızsa fs'den okur.
  Kapı: `test_tilemap_levelfile.js` M9 bloğu → 38/38.
- **M7 RNG (tam MT19937 — CPython 3.14 birebir):** `procedural.js` `DE._pr_rng`
  Mulberry32 → MT19937. C kaynak (`_randommodule.c` v3.14) okunarak port:
  `init_by_array` **iki geçiş** (1664525 + 1566083941) + `if (i>=N){mt[0]=mt[N-1];i=1;}`
  taşıma hilesi + `mt[0]=0x80000000` (klasik tek-geçiş portu 6 seed'te FARKLI çıktı —
  kök neden bu); seed → abs → küçük-sondan 32-bit kelimeler (0 → [0]);
  `random()` = ((genrand>>5)*2^26+(genrand>>6))/2^53; `getrandbits(k<=32)` =
  `genrand>>(32-k)`; `_randbelow` = `bit_length` + ret ederek çekme;
  `randint`/`choice` py ile aynı. Tüm 32-bit karma `Math.imul` + `>>>0`.
  Kapı (geçici, temp\m7gate\): py `generate`/`generate_boss_arena` — py tarafında
  `_maybe_ramp` no-op (BİLİNÇLİ SAPMA #4: JS rampa üretmiyor, iki taraf da RNG
  harcamıyor) — **6 seviye + 6 arena nesne listesi BİREBİR** (biyom-seed seti:
  forest0/cave42/None77777/ice1234/desert99999999/astro2147483647 + shield boss seed 9).
  `seed=None` zaman tohumu py'de farklı (bilinçli, parity gerekmez).
  **Test düzeltmesi:** `test_game.js` TEST7 — parite seviyesinde (cave, seed 7)
  spawn düşüş yolunda 1 coin + teleportsa komşu-küme coin'leri birlikte toplanıyordu;
  sayaç hedef-coin bazlıydı (26/31). "Başlangıçta aktif" build anına alındı,
  sayaç aktif-coin azalmasından sayacak şekilde düzeltildi → tümü 31/31.
- **Regresyon (M7 sonrası):** 13/13 JS dosya 0 FAIL (audio 33, game, core 50,
  input 72, procedural 31, systems 73, tilemap 38, smoke 0 hata...); browser 51/51;
  tools 36/36; `tests/test_engine_core.py` ALL OK; `tests/test_climber.py` ALL OK;
  `parity_check.py` BİLİNEN fark 1 (ensure_dir); **M7 kapası GECTİ.**

**ORTA KALAN (08.10):** M10 sürüm (py `__version__`=0.1.19 / JS'te oyun sürümü hiç
yok — menü rozeti `ui.js:614`, konsol `version` `console.js`, debug overlay
`core.js:834`) + M11 TextRenderer emoji segmentasyonu. Sonra: tam regresyon →
silme aşaması (`deep_engine/`, `game/*.py`, `main.py`, `tests/*.py`,
`tools/parity_check.py` + deep-tool Modül 14) → commit onayı.

### ORTA M10+M11 DE KAPANDI — ORTA LİSTESİ TAMAMI (08.10.2026)

- **M10 sürüm:** `game/state.js` → `DE_GAME.__version__ = "0.1.19"` (AGENTS:
  motor `DE.__version__`=1.0.0 ile AYRI sayılır; py'nin tek satırı JS'te oyun
  sürümü oldu). Menü rozeti `ui.js` "DerinEngine v" + `DE_GAME.__version__`
  (py-parite değer 0.1.19); konsol `version` → "DerinEngine engine version: 1.0.0,
  game version: 0.1.19" (motor katmanı `typeof DE_GAME` koruması — motor-only testte
  oyun bilgisi yok). Debug overlay motor sürümü (motor katmanı, ORA'da işaretli
  değildi). Kapı: `test_systems` version komutu ("engine version" içerir) ✓.
- **M11 emoji segmentasyonu:** `render.js` TextRenderer — py `_is_emoji_char`
  aralıkları birebir (1F000-1FAFF/2600-27BF/2300-23FF/2B00-2BFF/FE0F/200D);
  emoji VARS segmentli yol (py `_render_complex`): bitişik aynı tür tek segment,
  emoji segmenti `` `${fs}px "Segoe UI Emoji", "Apple Color Emoji", ...` `` (py
  gibi kalın değil), normal `bold Arial`; her segment kendi fontuyla ölçülür,
  x bitişik akar; center_x toplam genişlikten; center_y max ascent/descent;
  gölge ikinci geçiş +2,+2. **Emoji YOKSA eski tek-parça yol aynen** (ölçüm/
  TEST13d regresyonu sıfır). Neden gerekli: HUD'da ❤️🖤🛡️⚡🔱⏳ ve i18n
  metinleri var; py renkli Segoe UI Emoji ile çiziyor, JS'te Arial tek fonttu.
  Kapı: `test_visual.js` T1 —15 yeni kontrol (segment sayıları: "⚡ x3" =2,
  "❤️ ❤️ ❤️"=5 py parite, font zincirleri, center_x toplamı, gölge ofseti,
  emoji-yok tek parça) → **31/31**.
- **Nihai regresyon (ORTA bitti):** 13/13 JS 0 FAIL (visual 31, audio 33,
  game, systems 73, input 72, procedural 31, tilemap 38, ui 33, core 50...);
  browser 51/51; tools 36/36; py core+climber ALL OK; parity TAM (1 bilinçli);
  **M7 kapası GECTİ.** ORTA listesi (M1-M11) TAMAMEN KAPANDI → sıra silme
  aşamasında: `deep_engine/`, `game/*.py`, `main.py`, `tests/*.py`,
  `tools/parity_check.py` + deep-tool Modül 14 (`deep-tool.py`/`webpanel.py`
  KALIR) → session kayıtları → **commit onayı (32+ dosya)**.

### PYTHON MOTOR SİLDİ — ORTA SONRASI SİLME AŞAMASI TAMAMLANDI (08.10.2026)

- **Silinen dosyalar (33, hepsi git track'li → `git checkout e6bf3e8 -- <yol>`):**
  `deep_engine/` (21 py + `__pycache__`), `game/*.py` (9 + `__pycache__`),
  `main.py`, `tests/*.py` (test_engine_core, test_climber, probe_physics_ref),
  `tools/parity_check.py`, `deep_engine_html/PARITE_RAPORU.md`.
- **deep-tool.py py-motor bağımlı kontrolleri kaldırıldı/güncellendi:** Modül 14
  (parite: `run_parity`, `elif num==14`, `MODULES[14]`, `menu_14` + `parity_*`
  i18n en/tr), Modül 1 `run_smoke` (py pygame smoke) + `mc_smoke_*`,
  Modül 9 `_reg_seed` (py `procedural.generate`) + `reg_seed_*`,
  `_SCRIPT_RUN["game"]`, `run_which` "game" girdisi, başlık/menü "smoke" sözleri.
  Kök göstergesi: `deep_engine/`+`game/` klasörleri → **`deep_engine_html/`**;
  py modül 4 (`deep_engine/i18n.py` yok) artık **INFO** atlar (JS tarayıcı:
  `tools_html/deep-tool.js` Modül 4 zaten `i18n.js`'e düşüyor).
  `check_import`/`_engine_purity_*` dosya-yok dalları zaten güvenli.
  **Doğrulama:** `python tools\deep-tool.py --lang tr all` → **0 WARN, 0 BUG, 0 ERR**;
  `py_compile` OK.
- **tools_html tarafı:** `deep-tool.js` kök göstergesi düzeltildi (eski
  `deep_engine`+`game` koşulu artık anlamsız — `path.resolve(__dirname,"..")`);
  `test_tools.js` find testi klasörü `deep_engine` → **`deep_engine_html`**.
  **36/36** ✓.
- **AGENTS.md yenilendi:** MOTOR KARARI kutusu → "JS TEK KAYNAK / py silindi /
  parite kapısı kaldırıldı / git geçmişi referans"; `main.py`+py test komutları +
  "Motor paritesi kapısı" notu çıkarıldı; PROJE YERİ py girdileri silindi; sürüm
  kaynakları `core.js DE.__version__` + `state.js DE_GAME.__version__`; test
  sayıları (13 dosya, browser 51/51, tools 36/36).
- **Nihai regresyon (silme sonrası):** 13/13 JS 0 FAIL; browser **51/51**;
  tools **36/36**; `deep-tool.py all` 0/0/0. py testleri (silindi — çalıştırılamaz,
  bilinçli). **Motor KALAN listesi bu kayıtla kapandı; kalan tek iş: session
  `_shared`/`01`/`03`/`04` kayıtları + COMMIT ONAYI (40+ dosya).**

---

## DENETİM + SADELEŞTİRME — MOTOR KATMANI (08.10.2026)

Kullanıcı görevi kapsamında (`_shared.md` SON GELİŞMELER → TAMAMLANDI kaydı)
motor katmanına yapılanlar:

- **Ölü kod silindi (3):** `DE._apply_camera` (render.js — Hiçbir çağıranı yoktu),
  `DE._pr_maybe_ramp` (procedural.js — 07.10 kararı rampa üretimini kaldırmıştı;
  "tanım kalır — parite" gerekçesi py motoru silinince geçersiz oldu),
  `DE.get_builder` (levelfile.js — erişilemeyen dormant yol).
- **Etki:** yalnızca motor kamu yüzeyi küçüldü; `test_*.js` (13/13) + tools
  (36/36) + browser (**52/0**) + `deep-tool.py --lang tr all` (**0/0/0**) yeşil.
- **`DE.Input.*` API'si dokunulmadı** (oyun tarafı `_update_dash`'e taşınan
  tetikleyici `DE.Input.get_keys()` → `get_key_down` ile uyumlu tutuldu).
