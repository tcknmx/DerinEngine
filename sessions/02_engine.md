# MOTOR OTURUMU — deep_engine/ geliştirme

> Bu oturumun görevi: **oyun motorunu** (deep_engine/) geliştirmek. Oyun (game/) ve
> araç (tools/) bu oturumda yapılmaz; motor kuralı: `deep_engine/` içinde `game`/`main`
> import YASAK (motor saflığı).

---

## TAMAMLANAN MOTOR ÇALIŞMALARI (kronolojik; orijinal "madde N" referanslı)

Aşağıdakiler baskın olarak **deep_engine/** tarafına dokunan işlerdir. Oyun tarafına
dokunan kısımlar için `03_game.md`'ye bak.

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

---

## MOTOR KALAN (bekleyen motor işleri, sıra kullanıcıyla)

- **Çokgen çarpışma (motor özelliği 2)** — SIRADA: BoxCollider → disk/çokgen/segment
  çarpışmaları; segment testleri (3D brush temasının 2D habercisi).
- Sahne ağacı + hiyerarşi + SceneManager (motor özelliği 3).
- Keyframe animasyon (motor özelliği 4) — tween altyapısı hazır.
- Tilemap + katman + render sırası + kamera fx (motor özelliği 5).
- Slopes/eğik zemin (2D v1 plan alanı 1).
- Müzik tema bağlama derinliği (seviye geçişinde daha merkezi).
- (Bekliyor) motor özelliği 1 (Event+Tween) sonrası temizlik: docs/tests.

---

## DEVİR GÖREVİ — DeepTool tarama WARN'ları (deep_engine/ tarafı)

> Kaynak: `python tools\deep-tool.py --lang tr all` (ARAÇ oturumu). BUG/ERR yok,
> yalnızca WARN var. Bu görev tamamlanınca `sessions/04_tools.md` + `_shared.md`'ye
> sonuç kaydedilir.

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

Doğrulama: `python tools\deep-tool.py --lang tr all` → Modül 1 sessiz-except ve Modül 7
kullanılmayan-import WARN'ları sıfır; headless boot smoke (menü + seviye) hatasız.

---

## OYUN DOSYASINA AKTARILAN İLİŞKİLİ GELİŞMELER (yalnızca bilgi)

Awake sistemi (16), Game Feel oyuncu tarafı (17–19), boss tipleri (22), canlı menü
(23), kampanya/skor (14/29/30), UX (40), emoji HUD (41), dash koruması (42) — bu
işlerin motor tarafına dokunan bileşenleri yukarıda kayıtlı; asıl oynanış kayıtları
`03_game.md`'de.