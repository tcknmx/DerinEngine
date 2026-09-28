# STRATEJİ OTURUMU — Yol Haritası, Kararlar, Öneriler

> Bu oturumun görevi: **yön çizmek**. Ajanla birlikte co-work yol haritası çizilir,
> tartışmalar/öneriler yapılır, kullanıcı kararları kaydedilir. Bu oturum **koda
> dokunmaz**; hangi oturumda hangi işin yapılacağını belirler (MASTER SIRADAKİ kuyruğu).

---

## Misyon & Vizyon

Kod yazmayı bilmeyen kullanıcıyla birlikte, sıfırdan **kendi oyun motorumuzu**
(DerinEngine) Python + pygame ile inşa ediyoruz. Ticari motorların (Unity, Unreal,
Godot) gerçekte ne yaptığını anlayıp **çalışan ürünler** çıkarmak.

**BÜYÜK DÖNÜM KARARI (28.09.2026):** Motor ailesi iki hatta bölünüyor —
1. **DerinEngine (Python)** = tamamlanmış/bakım hattı (1.0.0, git'te `33bfd85`).
2. **DerinEngine HTML** = YENİ ANA HAT — saf tarayıcı JS motor, **%0 ek kütüphane**
   (Canvas2D/WebGL/WebAudio/localStorage; Node yok, CDN yok, tek `index.html` demosu).
   Aynı motor API'si taşınır (Engine/Scene/GameObject/Component + tüm bileşenler +
   tilemap `.map` köprüsü + UI kiti). Gerekçe: 3D/voxel/`.map` WebGL'de kütüphanesiz
   yapılır (Python'da ek kütüphanesiz neredeyse imkânsız), JS JIT + GPU çizimi Python
   masaüstünden hızlı, WASM'den (pygbag) çok daha hızlı; kurulum/dağıtım tek klasör.
   **Çok ileride DerinEngine 3'e kadar evrilecek** (HTML v2.1 → 3D yolculuğu).

**KARAR (ana hedef sırası):** ÖNCE 2D motor, tam 2D v1 seviyesine olgunlaşır;
SONRA kademe kademe 3D'ye evrilir. Yol:
**(1)** STAR COLLECTOR HERO (mevcut 2D motor + demo) →
**(2)** STAR COLLECTOR 2 (2.5D platform shooter action-adventure) →
**(3)** STARCUBES (voxel küp editör/simülasyon — 3D motorun erken demosu) →
**(4)** nihayet TrenchBroom `.map` geometrik 3D seviyeleri oynatan motor.

Yaklaşım: **Adım adım** (her seferinde çalışan küçük parça), **eğitici** (nesneler
kullanıcıya Türkçe anlatılır), **modüler Entity-Component** (Engine → Scene →
GameObject → Component).

---

## ÜRÜN / MOTOR EVRİLİŞ ÇİZELGESİ (3 ikonlu yol)

Yol haritasında kapak ikonu olarak kullanılacak 3 ürün ikonu:

- **STAR COLLECTOR HERO** — 2D motor + StarCollector demosu (bugün buradayız).
  İkon: mevcut 2D oyun kapak görseli.
- **STAR COLLECTOR 2** — 2.5D motor: 3D görsel + 2D platform oynanışlı shooter
  action-adventure. İkon: derin uzay/gezegen kapak görseli.
- **STARCUBES** — 3D voxel motor: Minecraft-vari küp editör + blok simülasyonu.
  İkon: voxel küp bloğu.

Kademe: 2D v1 olgunlaşır (alttaki 2D v1 PLANI) → 2.5D'ye geçiş → voxel 3D erken demo
(STARCUBES) → TrenchBroom `.map` 3D seviyeleri (nihai hedef).

---

## 2D v1 PLANI — 5 ÖNCELİK ALANI (kullanıcı seçti; sıra kullanıcıyla netleşir)

1. **Fizik çekirdeği derinleşir** (ticari platformer fiziği):
   - Slopes/eğik zemin (dönen sprite çizimi + eğimli yüzeyde kayma).
   - Çokgen ve daire (disk) çarpışmaları: `BoxCollider` → `PolygonCollider`/
     `CircleCollider` katmanı; segment testleri (3D brush temasının 2D habercisi).
   - Celeste seviyesi hissiyat (coyote/jump buffer/jump-cut/fall boost üstüne
     wall-slide/wall-jump/pit düzeltmeleri inceltilir).
2. **Tilemap + katman sistemi** — gerçek tile haritalar:
   - `Tilemap` bileşeni (grid, tile set, render). Katmanlar ve render sırası:
     z-order, paralaks entegrasyonu. Prosedürel üretici/editör bütünleşmesi.
3. **Sahne ağacı + editor UI (mini-Godot)**:
   - `Scene` → hiyerarşi ağacı (parent/child), `SceneManager`/sahne geçişi.
   - Editör'e hiyerarşi paneli + gerçek inspector (özellik numaralarıyla düzenleme).
4. **Animasyon + keyframe**:
   - `SpriteRenderer.rect`/`position`/renk üzerinde keyframe animasyon (tween altyapısı
     hazır: `Tween`, `TweenComponent`, `EASING`). `Animator` gelişimi (state machine).
5. **UI sistemi olgunlaşır** — reusable UI kiti: Panel, Button, ScrollContainer,
   temalar; mouse/klavye/oyun kumandası etkileşimi. Mevcut menü/HUD/editör UI'ları
   bu kit'e taşınır.

---

## MOTOR KİMLİĞİ: runtime + editor (mini-Godot yolculuğu)

Motor, Godot/Unity gibi iki parçadan oluşur: **runtime** (oyun çalışırken çalışan
çekirdek) ve **editor** (seviye/asset hazırlama UI'ı).

- **Şimdi:** runtime (Python motoru) + oyun-içi mini editor (E tuşu,
  `deep_engine/editor.py`). Ayrı grafik editor uygulaması yok; seviyeler JSON ile
  üretilip oynatılıyor.
- **Uzun vade (mini-Godot hissi):** oyun-içi editorü güçlendir (scene tree paneli,
  inspector/özellik paneli) ve nihayet ayrı editor uygulamasına evrilebilir
  (pygame'de ikinci pencere). Runtime önce sağlamlaşmalı.
- **Kural:** motor çekirdeği (runtime) her zaman oyundan ve editor'den bağımsız, API ile çalışır (motor saflığı, deep-tool Modül 8).

---

## REHBER: "Sorunsuz Deneyim" planı (durum: 1–3 bitti, 4 bekliyor)

İleriye dönük iyileştirme rehberi. İlk 3 madde 16. maddede TAMAMLANDI, yalnızca
4. madde bekliyor:

1. **Görüş alanı + tepki süresi tabanlı güvenlik**: ilk tehdit, oyuncunun ilk görüş
   alanının (kamera/viewport 900px) hemen dışında başlar → "gördüğün her yer temiz" ✅
2. **Garantili ilerleme yolu**: güvenli bölge boş değil, tamamlanabilir (zemin düz
   başlar, ölümcül çukur yok) ✅
3. **Düşman 'tetikle' (awake) sistemi**: düşmanlar oyuncu yaklaşana dek uyur → pusu yok ✅
4. Ek "sorunsuzluk": düşman doğuş gecikmesi, kamera ilk kare temizliği, zıplama giriş
   tamponu, i-frames, düşme sonrası kurtarma (✅ düşme kurtarması 24. maddede yapıldı;
   kalan detaylar bekliyor).

---

## İLERİYE DÖNÜK DİĞER ÖZELLİKLER (bekliyor)

- Git reposu başlatma (git kurulursa `git init` + semantic versioning; kullanıcı kararı).
- Müzik: seviye geçişinde temayı daha merkezi bağlama; gerçek stereo derinliği artırma.
- Kamera menü/hit degrade cilası (❌ büyük kısmı 31. maddede yapıldı — kalan ince ayarlar).

---

## deep-beat — ByteBeat Piyano & Bestecilik Aracı (PLANDA, kodlanmadı)

**DerinEngine'den TAMAMEN BAĞIMSIZ** ayrı bir araç. `tools/deep_beat.py`, tek dosyalık
Python betiği; pygame mixer ile 8-bit ses üretir, `.wav` dışa aktarır. Uzun vadede
akustik piyano taklidine evrilecek "dijital doğal enstrüman" vizyonunun ilk adımı.

- **12 tuş = 12 nota** (bir oktav: C..B). Oktav: Q/W (alt/üst).
- **Dalga**: square/triangle/sine (F2/F3). **Süre**: tuşu basılı tutma süresi.
- **Beste notasyonu** (metin): `<nota>.<oktav>.<süre>[+<nota>.<oktav>.<süre>],...`
  ör. `"7.0.5,5.0.5,4.0.5,5.1.0"`, akorlar `+` ile, `w`=yüksek oktav, `q`=düşük.
- **Modlar**: Canlı Çalma, Beste Editörü (önizleme/kaydet/yükle), Oyun içi jingle.
- **Dosyalar**: `tools/deep_beat.py`, `tools/beat_songs/*.beat`, `tools/output/*.wav`.
- DerinEngine'e bağımlı değil; yalnızca pygame + stdlib.

---

## "Tek HTML5 Build, Çok Sürüm" planı (UYGULANMADI — plan aşaması)

itch.io HTML5 oyunları aynı sayfada "sürüm seçtiremez" (yalnızca indirilebilir
upload'larda var). Plan: tek html5 build'de oyun menüsü başlamadan önce bir **sürüm
seçme ekranı** gösterilsin; farklı sürümler/oyun çekirdekleri aynı tarayıcı paketinde
barındırılsın.

- **KARAR (2026):** v0.1.0 unutuldu (kaynağı yok, sadece derlenmiş EXE — geri çıkarılıp
  WASM'e çevrilemez). Dünya **v0.1.19 ile başlar** = EN ESKİ "legacy" sürüm; seçme
  ekranında "Legacy" olarak yer alır.
- Yapı henüz uygulanmadı; cok-sürüm (packed) tasarım ileride netlesecek.

---

## KARAR LOGU (kullanıcı kararları, kronolojik özet)

1. Önce 2D tam v1, sonra 2.5D → voxel → `.map` (üstteki çizelge).
2. Kampanya akışı: giriş → boss → sonraki biyom → zafer; **astro = final**.
3. "Simdilik standart zorluk eğrisi" — güvenli başlangıç + zorlukla artan tehdit korunur.
4. Marka: MiniEngine → **DerinEngine**; paket `mini_engine` → `deep_engine`.
5. Sürüm modeli iptali: tek sürüm satırı yerine motor 1.0.0 + oyun 0.1.19 ayrımı.
6. Yeni oyuncu deneyimi: savegame sıfır kurulum (`{"lang":"tr","high_score":0}`),
   Sonsuz Mod başlangıçta kilitli, eğitim ilk girişte.
7. HTML5 (pygbag) portu yenilenmeyecek denmez — canlı dır-yayın var; yerel web build
   gerekiyorsa ayrı yere kopyalanır (`build/web*` korunur).
8. Git: "siktir et" (atlandı, simdilik); kurulursa semver etiketleri.
9. İlk 3 ürün ikonu + kademe sırası netleştirildi (ÜRÜN ÇİZELGESİ).
10. deep-tool YAZMAZ/da DÜZELTMEZ — yalnızca tarar/bulur; düzeltme manuel (kullanıcı).
11. **28.09.2026 — DerinEngine HTML dönümü:** (a) Mevcut Python motorunun güncel hali
    git'e kaydedildi (`33bfd85`) ve resmi olarak **bakım hattı** ilan edildi. (b) Yeni
    ana hat **DerinEngine HTML**: saf tarayıcı JS, %0 ek kütüphane, aynı API. (c) Bu
    yol **DerinEngine 3'e** kadar evrilir (HTML 2D → 2.5D → voxel → `.map`). Oturum
    sahipliği bu dosyaya göre güncellenecek (HTML motor işleri).
12. **28.09.2026 — HTML motor eşitliği + oyun hedefleri sırası (kullanıcı isteği):**
    "İkisini de plana yaz; önce py motorun tüm bileşenlerinin tamamını HTML yapalım."
    Sıra: **(1) Py→HTML motor eşitliği** (21 py dosyasındaki tüm sınıflar HTML'e
    taşınır — aşağıda MASTER SIRADAKİ: HTML); **(2) Star Collector Hero'nun tam portu**
    (kampanya, boss'lar, UI kit, i18n, savegame, ses — haftalarca sürer); **(3) Sonsuz
    tırmanma oyunu** (demo'dan veya porttan bağımsız, **Icy Tower mekaniği**: kırılan
    platformlar + sürekli yukarı tırmanma). Görsellik Python'daki gibi **kodla çizilen
    şekiller** (resim dosyası yok) — birebir taşınır.

---

## MASTER SIRADAKİ Kuyruğu (hangi oturumda ne sırada)

Adaylar, sahibi olan oturumla birlikte. Sırayı kullanıcı belirler.

**HTML MOTOR (05 — yeni ana hat, `deep_engine_html/`): Envanter 21 py dosyası.**

**A1–A4 ✅ (28.09, commit `7606579`):** çekirdek (Vector2/Component/GameObject/Scene/
Engine), render (SpriteRenderer rect/circle/triangle/**spikes**/border_radius + TextRenderer
+ kamera), fizik (BoxCollider/Rigidbody2D min-nüfuz + one-way + max_fall), input, kutu
zıplama demosu. Doğrulama: `node deep_engine_html\test_core.js` = 12/12 `ALL OK`.

**[1] Motor eşitliği — kalan bileşen grupları (sırayla):**
- **G2 Çarpışma hat etleri:** ✅ (28.09) CircleCollider + PolygonCollider + `math2d.js`
  (SAT, point_in_polygon, circle_polygon, segment/çizgi, AABB) — `test_math2d.js` 38/38.
- **G3 Oynanış bileşenleri:** ✅ (28.09) components.js — Animator, KeyframeAnimator,
  BouncePad, Health, Projectile, PowerUp, BreakablePlatform, SpawnIn, _AutoRemove;
  Scene.update artık spatial grid + on_collision bildirimi + statik solid çözümü (Python
  `_handle_physics_and_collisions` mantığı). `test_components.js` 27/27.
- **G4 Tween + olay:** ✅ (28.09) tween.js — ease_* (9 fonksiyon), Tween (skaler/Vector2/
  renk, in-place referans stabilitesi), TweenComponent (to/to_vec/after zincir/do_after/
  delay/clear/running), _Chain, Tweener takma adı. `test_tween.js` 33/33.
- **G5 Partikül + görsel katman:** ✅ (28.09) particles.js + parallax.js (6 tema: forest/
  lava/cave/ice/desert/astro + kayan yıldızlar + astro kozmik) + lighting.js (LightSource
  pulse + LightingEngine mask önbelleği + destination-out carve). `test_visual.js` 16/16.
- **G6 Tilemap + seviye:** ✅ (28.09) tilemap.js (get/set/place_at_world/solid_at/
  to_data/from_data/to_segments edge-cull + culled draw) + levelfile.js (register_builder/
  place_object/save_level/load_level + extractor) + Scene'e kamera takibi & parallax_background
  bağlandı. `test_tilemap_levelfile.js` 32/32.
- **G6 Tilemap + seviye:** tilemap.js (katman/get-set/place_at_world/solid_at/
  to_data/from_data/to_segments), levelfile.js (builder/extractor/place_object/
  load_level/save_level).
- **G7 UI kiti:** ✅ (28.09) ui.js (UITheme, Panel, Button, ScrollContainer — Python
  kopyası; Button hover/press/focus/disabled + ENTER, ScrollContainer tekerlek + drag +
  on_pick, Scene.draw UI'ı kameradan bağımsız üstte çizer) + Input API eşitlendi
  (get_mouse_button/get_mouse_button_down/get_mouse_scroll/is_controller_active +
  wheel eventi). `test_ui.js` 31/31.
- **G8 Sistemler:** ✅ (28.09) scenemanager.js (SceneManager: register/switch_to/push/
  pop + overlay), log.js (MotorLogger: DEBUG/INFO/WARN/BUG/ERR eşiği + handler), i18n.js
  (TR/EN tablo birebir + set/toggle/localize), savegame.js (SaveGame → localStorage),
  console.js (DevConsole: typed text + geçmiş + register_command; help/clear/version
  yerleşik), audio.js (SoundFX: WebAudio synth — 21 preset ses + preset riff + algoritmik
  biyom müziği stereo), procedural.js (generate + generate_boss_arena — güvenli açılış
  bölgesi, zorluk ölçeği, boss tipi seçimi). `test_systems.js` 47/47, `test_audio.js`
  28/28, `test_procedural.js` 31/31. Input'a typed-text desteği eklendi.
- **G9 ARKA/ROOT:** ✅ (28.09) `DE.__version__ = "1.0.0"`, `DE.__engine_name__`
  core.js'e eklendi (Python `__init__.__version__` eşdeğeri — zaten namespace vardı).
  **G grupları tamamlandı: G1–G9 HTML motor eşitliği bitti.**
- **G10 INPUT DENKLİĞİ (28.09, kullanıcı isteği: "html motoru py motora denk, yarım
  yamalak değil"):** `input.js` artık Python `input.py` ile **birebir**. Daha önce
  "is_ui/axis yok (ilk sürüm)" yorumuyla yarım kalanlar kapatıldı: (a) **oyun
  kumandası (gamepad)** — Gamepad API (window.navigator.getGamepads), kare başında
  `begin_frame()` ile tarama (core.js `Engine._frame` başına eklendi), analog
  eksen (8, ölü bölge 0.2), D-Pad → hat üretimi (standart buton 12-15), buton
  kenar algılama (down/up), mantıksal eşleme **Python BUTTON_MAP ile aynı**
  (SPACE/ENTER→A, F→X, LSHIFT→LB, ESCAPE→Start; Python-numara→standart index
  çevirici). (b) **get_key_up** eklendi (klavye + kumanda, kare özel). (c) **fare 3
  buton** (sol/orta/sağ: get_mouse_button/get_mouse_button_down). (d) **klavye
  haritası** genişletildi: LSHIFT/RSHIFT (e.location 1/2), TAB, BACKSPACE,
  BACKQUOTE(`), QUOTEDBL("), KPENTER (numpad Enter), F1–F12. (e) **get_axis /
  get_hat / get_horizontal_axis** (Python ile aynı birleşim sırası: analog →
  D-Pad → klavye A/D/ok override). end_frame artık _joy_buttons_down/up'ı da
  temizler. **Yeni `test_input.js` 58/58 ALL OK** (klavye eşlemesi, one-shot,
  fare, scroll, typed, kumanda: ölü bölge/hat/kenar/BUTTON_MAP/horizontal).
  Doğrulama: `node deep_engine_html\test_input.js`.
  **Etkilenen:** `deep_engine_html/engine/input.js` (yeniden yazıldı), `core.js`
  (begin_frame çağrısı). Py motor değişmedi. Tüm 11 motor süiti ALL OK
  (353/353) + `test_browser.js` 23/23 + `test_tools.js` 24/24.

**Sonuç kriteri:** `node deep_engine_html\test_core.js` + her grup için eşlik eden
birim test dosyaları; port sonunda **Python mantık testleriyle aynı sonuçlar**.
Sütun da paralel: her grup commit'li ilerler (tek commit kalmayacak).

**[2] Star Collector Hero tam portu** (HTML'e): kampanya + Sonsuz Mod + boss'lar +
UI kit + i18n + savegame + ses + konsol. **Haftalarca sürer — büyük görev.**
Kaynaklar: `game/*.py`, `main.py` (pygbag dalı hariç).

**PORT PLANI ([2] alt aşamalar):**
- **M1 Oynanabilir çekirdek (✅ 28.09, bu oturum):** `game/*.js` portu son
  aşamasına girdi. `state/entities/ui/scenes/builders/main.js` yazıldı;
  prosedürel seviye (Player+PUD, coin/portal kilidi), kampanya zinciri bez
  (Fisher-Yates + astro final), boss **belgeli M1 kabuğu** (M2'de gerçek boss),
  Sonsuz Mod, ana menü (menu_idle + P/4), zafer/oyun sonu. **`test_game.js`
  51/51 ALL OK**; 11 motor suiti 353/353 + browser/tools yeşil.
  **KALAN:** `test_game.js` dışında görsel kontrol (tarayıcıda `index.html`).
- **M2 Boss'lar:** `builders.js`'e Boss builder/extractor + `scenes.js`
  `build_campaign_boss` gerçek arena (procedural boss_arena + boss verisi).
  Veri kaynağı `deep_engine/procedural.py` PR_BOSSES.
- **M3 UI derinliği:** `ui.js`'e kamera zoom menü yakınlaştırması + vinyet +
  FadeOverlay çapraz geçişi (bu oturumda belgeli ATLANDI — `Scene.draw`
  `camera_zoom` uygulamıyor), `_attach_ground_tilemap` zemin rasterizasyonu
  (fizikle ilgisiz), boss giriş duyurusu.
- **M4+ Davranış:** `game/commands.py` (konsol komutları) + pygbag onaylı
  `main.py` giriş dalı + son 1:1 davranış farkları düzeltmesi.
- **M5 İnce ayar:** menüde kampanya ilerleme rozetleri (yazıldı), deneyim
  iyileştirmeleri 5–8 portları (`03_game.md`), doğrulama: tüm JS süitleri.

**[3] Sonsuz tırmanma oyunu (Icy Tower mekaniği):** kırılan platformlar, sürekli
yukarı, yükseklik skoru. Bağımsız başlayabilir (1. maddedeki BreakablePlatform +
camera-follow ile). Demo kapak: "Star Climber".

**ÖNCELİK — HATA AVI (kullanıcı raporu 23.09.2026):** "Hissiyat + Hata Avı"
seferberliği start. İlk hedefler (03_game.md bug defterine işlendi):
spike etkisi, bloğa gömülme (kök neden büyük olasılıkla **motor fiziği** → 02'ye
gerekebilir), mor düşman yoğunluğu/saldırganlığı. Bunlar yeni özellikten önce.

**MOTOR (02):**
- ~~Çokgen çarpışma (motor özelliği 2)~~ **TAMAM (27.09.2026):** PolygonCollider/CircleCollider
  + SAT; genel çarpışma hattı. Detay: `02_engine.md`.
- ~~Sahne ağacı + SceneManager (3), Keyframe animasyon (4), Tilemap+katman+kamera fx (5),
  Slopes/eğik zemin~~ **TAMAM (27.09.2026):** hepsi uygulandı ve doğrulandı. Detay: `02_engine.md`.
- Sıradaki büyük motor özelliği: tilemap üzerine veri katmanı / motor-UI kiti (3D köprüsü).

**OYUN (03):**
- Biyoma özel fizik (UX paketi son madde) — her biyomun kendine has hissiyatı.
- deneyim_iyilestirmeleri 5–8 (dash after-image, boss slow-mo/enrage, uzun düşüş
  hız çizgileri, menüde kampanya ilerleme haritası) — tam metin `03_game.md`'de.
- Duşman doğuş gecikmesi ince ayarları, i-frame ince ayarları.

**ARAÇ (04):**
- deep-tool `new`/`find`/`run` alt-araçlarını gerçekleştirme (find = salt-okunur arama).
- Modül 7 kullanılmayan import WARN'larının `game/*.py` temizliği (kullanıcı kararı).
- pygbag tarayıcı interaktif playtest (kullanıcıya bırakıldı).

---

## TARTIŞMA / ÖNERİ GÜNLÜĞÜ (bu oturum)

- **[ACİL GELİR HEDEFİ — 1 ay, 23.09.2026]** Kullanıcı motoru gelirsiz sürdüremeyeceğini
  söyledi; 1 ay içinde gelir gerekiyor. DerinEngine tarafındaki adaylar: (a) **Star
  Collector Hero**'yu SATIŞA HAZIR yapıp itch.io'da fiyatlandırmak, (b) DerinEngine'i
  asset olarak satmak ($10–15, demo'lu), (c) Python oyun/tool hizmetleri (serbest iş).
  **KARAR BEKLİYOR:** (1) fiyat modeli, (2) oyun oturumu önceliği, (3) hedef tutar.
- Buraya gelecek öneriler: tartışılacak fikirler, "acaba şöyle yapsak" notları.
  Kullanıcı onaylarsa sahibi olan oturumun `KALAN`'ına taşınır.

---

## NOT (veri): Antigravity/opencode sohbet geçmişi

Oyun motoru geliştirme geçmişi (eski) Antigravity CLI'de:
`C:\Users\token\.gemini\antigravity-cli\conversations\232081c3-423b-4137-8c1a-9bbe2fe3d08b.db`
("oyun motoru yapımı" başlığı; protobuf bloblardan okunur). Yarım kalma nedeni: sunucu
yeniden başlatıldı. Son yarım kalan görev (8. madde) daha sonra tamamlandı.
İkinci oturum `antigravity\4b6c7137-...` (Editör Crash Düzeltme + Motor Kapasitesi),
`implementation_plan.md` planını içeriyordu: (1) circular import düzeltmesi, (2) kamera
sarsıntısı, (3) sprite animasyon, (4) TriggerZone/Event sistemi, (5) component
serializasyonu. **Hepsi DerinEngine'e taşındı/tamamlandı** (saflık kuralı, scene shake,
Animator, Event/Tween, builders JSON): kayıp bilgi yok. 2026-09-27'de `.gemini`
arşivlendi/temizlendi — bu sohbetler silinmiş olabilir; bu tarihçe notu referanstır.