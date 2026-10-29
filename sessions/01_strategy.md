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

## REHBER: "Sorunsuz Deneyim" planı (durum: 1–4 TAMAM)

İleriye dönük iyileştirme rehberi. Dört maddenin de dördü bitti:

1. **Görüş alanı + tepki süresi tabanlı güvenlik**: ilk tehdit, oyuncunun ilk görüş
   alanının (kamera/viewport 900px) hemen dışında başlar → "gördüğün her yer temiz" ✅
2. **Garantili ilerleme yolu**: güvenli bölge boş değil, tamamlanabilir (zemin düz
   başlar, ölümcül çukur yok) ✅
3. **Düşman 'tetikle' (awake) sistemi**: düşmanlar oyuncu yaklaşana dek uyur → pusu yok ✅
4. Ek "sorunsuzluk": düşman doğuş gecikmesi, kamera ilk kare temizliği, zıplama giriş
   tamponu, i-frames, düşme sonrası kurtarma — **TAMAMLANDI**:
   - düşme kurtarma: 24. madde,
   - zıplama giriş tamponu (jump buffer) + i-frames: 25. madde,
   - düşman doğuş gecikmesi: prosedürel + custom düşmanlarda `SpawnIn` telegrafı ve
     **spawn grace** (telegraf sürerken düşman hasar vermez — 30.09.2026),
   - kamera ilk kare temizliği: `set_camera_target` ilk karede **snap** yapar (kayma
     yok) + menü çıkışında `snap_camera_to_target()` (30.09.2026).

---

## İLERİYE DÖNÜK DİĞER ÖZELLİKLER (bekliyor)

- ~~Git reposu başlatma~~ **TAMAMLANDI:** repo kurulu, `main` dalında çalışıyor; sürüm
  modeli motor `1.0.0` / oyun `0.1.x` olarak ayrı iki satır (tek sürüm satırı fikri
  iptal edildi — AGENTS.md "SÜRÜM MODELİ").
- Müzik: seviye geçişinde temayı daha merkezi bağlama; gerçek stereo derinliği artırma.
- ~~Kamera menü/hit degrade cilası~~ **TAMAMLANDI (30.09.2026):** 31. madde + kamera/
  shake paritesi (JS'te sarsıntı artık gerçekten çizime giriyor ve `dt` tabanlı
  sönüyor) + menü çıkışı snap.

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

### 08.10.2026 — **PYTHON MOTOR SİLDİ + parite kapısı kaldırıldı (ORTA kapandı)**
Kullanıcı kararları (aynı gün, aşama aşama): *"Önce ORTA farkları kapat, sil"* +
*"Parite kapısı (Modül 14/parity_check.py) kaldırılsın"* + *"py motora veda edecez"*.
- **Ön koşul tamam:** ORTA parite farkları **M1–M11 tamamı** JS'te kapatıldı
  (M10 sürüm rozeti/konsol, M11 TextRenderer emoji segmentasyonu dahil);
  M7 MT19937 kapısı "6+6 BİREBİR" geçti; tam regresyon yeşil.
- **Silinen:** `deep_engine/` (21 py), `game/*.py` (9), `main.py`, `tests/*.py` (3),
  `tools/parity_check.py`, `deep_engine_html/PARITE_RAPORU.md`.
  Hepsi git track'li → `git checkout e6bf3e8 -- <yol>` ile geri getirilebilir.
- **Kaldırılan:** deep-tool **Modül 14** (parite denetimi) + py-motor bağımlı
  kontroller (Modül 1 `run_smoke`, Modül 9 `_reg_seed`) — `deep-tool.py --lang tr all`
  = **0 WARN/BUG/ERR**. `deep-tool.py`/`webpanel.py` **kaldı** (JS/HTML motorunun
  hizmetinde).
- **Yeni referans:** "Python'da nasıldı?" → git geçmişi (`git show e6bf3e8:...`)
  + session kayıtları (`_shared.md`, `02_engine.md`). **AGENTS.md** MOTOR KARARI
  kutusu "JS TEK KAYNAK" olarak yenilendi.

### 03.10.2026 — **MOTOR YOLU DEĞİŞTİ: JS birincil, Python donduruldu**
Kullanıcı kararı: *"tüm py motoru tamamen js motora transfer et, artık html motordan
devam edecez, py motor back geliştirme kalcsk"*.
- **Gerekçe:** tarayıcı motoru oyuncuya en yakın ve taşınabilir hedef; tek motor
  bakımı yapılacak. Python sürümü artık **referans** (API kataloğu + regresyon).
- **Sonuç:** `deep_engine_html/` birincil; `deep_engine/`, `game/*.py`, `main.py`
  donmuş. Yeni testler JS'e yazılır; Python testleri donmuş motoru korur.
- **Denetim:** deep-tool Modül 14 (Python/JS parite) kalıcı kalite kapısı oldu.
- **Bugün:** API paritesi TAM (115 motor + 59 oyun sembolu). Sırada **oynanış
  paritesi** (modül/modül davranış + oynanış ölçümü) var → `02_engine.md` KALAN.

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

### MASTER SIRADAKİ (29.10.2026 — ÖNERİ, kullanıcı onayı bekliyor)

> Durum: 2D v1 motoru (20 motor + 8 oyun dosyası) tamam ve **tüm testler yeşil**
> (29.10 checkup). Aşağıdaki eski kuyruk (HTML portu G1–G10, SCH portu M1–M5,
> Star Climber) **tamamı bitmiştir**; arşiv olarak duruyor. Yeni sıra önerisi:

1. **[OYUN + ARAÇ] Commit temizliği — ✅ TAMAMLANDI (29.10.2026).** 09.10 paketi
   `db9726d` olarak `main`e yazıldı (PAKET 2 + Star Climber kaldırma, oyun 0.1.20);
   ardından physics + ShieldBoss + belge commit'leri geldi. `git status` temiz.
   Doğrulama: 13/13 JS test 0 FAIL + tools 36/0 + browser 37/0.
2. **[02 MOTOR] One-way yakınlık probu — ✅ TAMAMLANDI (29.10.2026).** `test_core.js`
   **TEST17** kapısı eklendi (hızlı düşüşte tünelleme yok + alttan geçiş serbest);
   test_core 50 → **53/53**. Mutasyon kanıtı: eski `physics.js` ile 2 FAIL. Kalıcı
   kayıt `02_engine.md` "ONE-WAY YAKINLIK PROBU — KİLİTLENDİ" bölümünde.
3. **[03 OYUN] ShieldBoss mekaniği — ✅ A UYGULANDI (29.10.2026).** Kullanıcı:
   "a, b, c özelliklerini yaz, sadece a'yı (katmanlı kalkan) oyuna geçir."
   → `game/bosses.js` A tasarımı (3 katman, savunmasızlık penceresi, regen, kalıcı
   düşüş) + `test_game.js` **TEST19** (149 → **163 OK**). B (döner) ve C (tek büyük
   kalkan) **yedek** olarak `03_game.md`'de yazılı, kodlanmadı.
4. **[01 STRATEJİ] Gelir modeli kararı** (23.09 notu): fiyat + hedef tutar + oyun
   önceliği. Karar gelmeden kod işi başlamaz; strateji oturumu seçenekleri netleştirir.
   (29.10.2026: kullanıcı bu konuya **kendi** bakacağını söyledi — oturum karışmıyor.)
5. **[STRATEJİ/02] 2D v1 → 2.5D köprüsü (yeni büyük hedef):** 2D v1 olgunlaştı;
   sıradaki ürün STAR COLLECTOR 2 (2.5D). İlk adım tartışması (motor tarafı):
   perspektif kamera + derinlik sıralaması (z_index) + 2.5D'de çarpışma modeli
   (2D fizik korunur mu?) — kullanıcıyla netleşip 02'ye KALAN olarak yazılır.
   **Bu, sıradaki açık büyük başlık.**


> **06.10.2026 YOL NOTU (kullanıcı kararı):** Öncelik = **HTML motoru standalone
> yapmak** ve artık **yalnız JS/HTML hattından devam etmek.** Python **silinmiyor**
> ama geri planda donmuş referans olarak kalıyor; bundan sonra yeni geliştirme JS
> tarafındadır. Sıra: (1) HTML standalone tamam → (2) motif/parite raporu fix'leri
> → (3) game feel'in usulüne uygun yapılandırılması. *Aynı görüşmede A1-A5
> (5 OYUNU BOZAR parite fix'leri) + smoke stabilizasyonu tamamlandı (06.10).*
> **⚠️ 08.10.2026 GÜNCELLEME:** "Python silinmiyor" kararı **değişti** — ORTA
> farkları (M1-M11) kapatıldıktan sonra py motor **silindi** (yukarıda 08.10
> kararına bak).

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
  (Aşağıdaki tek satırlık mükerrer G6 kaydı 30.09'da silindi; geçerli kayıt yukarıdadır.)
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
- **M1 Oynanabilir çekirdek (✅ 28.09):** `game/*.js` portu; prosedürel seviye,
  kampanya, boss kabuğu, Sonsuz Mod, ana menü, zafer/oyun sonu. **`test_game.js`
  51/51 ALL OK**; 11 motor suiti 353/353 + browser/tools yeşil.
- **M2 Boss'lar (✅ 28.09):** `game/bosses.js` (BossController/FlyingBoss/SniperBoss/
  CosmicBoss/ShieldBoss portu) + `builders.js` Boss builder/extractor +
  `scenes.js` `build_campaign_boss` gerçek arena (procedural boss_arena + boss
  verisi) + motor `Scene` zoom katmanı (zoom_to/zoom_punch/vinyet/hit_flash;
  Python scene.py eşi). `index.html`'e `game/bosses.js` eklendi. **`test_game.js`
  63/63 ALL OK** (TEST8b boss ölümü -> portal açılır + çıkış + astro zafer).
- **M3 UI derinliği (✅ 28.09):** `ui.js`'e menü CLOSE-UP zoomu
  (`MENU_ZOOM=1.8`, `camera_manual`, `_place_menu_camera`) + güçlü menü vinyeti
  (0.5; kampanya başlayınca `camera_manual=false` + `zoom_to(1.0)` +
  `set_vignette(0.22)`) + `FadeOverlay` bileşeni ve MenuController çapraz geçiş
  alanları (**dormant — Python'da `_pending_factory` hiç set edilmez; birebir
  taşındı**). Motor `Scene.destroy`/`_objects_to_destroy` eklendi (Python
  `scene.py:117/381` eşi; FadeOverlay kendini böyle siler). `scenes.js`
  `_attach_ground_tilemap` (Python eşi): zemin rect'lerini 32px ızgaraya
  rasterize (platform yüzeyi=1 + alt toprak=2, 2 renk katmanı), katı zemin
  sprite'ları gizlenir (one-way adalar kalır, çarpışmalar durur),
  `_tilemap_ground`/`_tilemap_segments` köprüsü sahneye yazılır. **Boss giriş
  duyurusu İPTAL — Python'da karşılığı yok (grep: intro/duyuru/announce yok);
  parite korunur.** **`test_game.js` 75/75 ALL OK** (tilemap rasterize + gizleme,
  menü zoom/vinyet dönüşü, FadeOverlay kendini siler).
- **M3.1 Görsel kontrol + gerçek boot testi (✅ 28.09):** M1 KALAN "tarayıcıda
  görsel kontrol" kapatıldı — `test_game.js` **TEST13** görsel çizim smoke (7 sahne
  türü + menü zoom yolu + FadeOverlay; Proxy stub canvas `makeDrawCtx`) ve
  `tools_html/test_browser.js` **`bootGame()`** + **BÖLÜM 4** (8 check: index.html
  sırasıyla tüm dosyalar vm'de, DOMContentLoaded → gerçek `main.js` boot, rAF pump
  + keydown/up). Boot testi **iki gizli bug** yakaladı: (1) `builders.js` `const
  _rgb` ↔ `engine/ui.js` `function _rgb` global çakışması → `_rgb_arr` (10
  kullanım); (2) `_hud_ui` hesabına `..._objects_to_add` dağıtılınca **MenuFX**
  `_hud_ui`'ye girip `MenuController.start()`'ta `active=false` oluyor → **menü
  klavye girişleri (P/SPACE) hiç çalışmıyordu**; Python `ui.py:529` ile birebir
  (`_hud_ui` yalnız `game_objects`) düzeltildi. **test_browser 31/31, test_game
  78/78, motor 353/353, tools 24/24.** M4 sıra: `game/commands.py` + pygbag
  onaylı `main.py` giriş dalı + son 1:1 davranış farkları düzeltmesi.
- **M4+ Davranış (✅ 28.09):** `game/commands.py`'ın JS portu yapıldı —
  `deep_engine_html/game/commands.js` (yeni): 9 komut `DE.register_command` ile
  kayıtlı (hp, heal, god, coins, speed, jump, tp, respawn, list) + `tp`
  hız sıfırlar. motor `_frame` eksik davranışları Python `core.py` ile birebir
  port edildi: konsol aç/kapa (`BACKQUOTE`/`QUOTEDBL`, açıkken sahne donar +
  konsol sahne üstüne çizilir), `T` dil değiştirir + savegame'e "lang" yazar,
  `F3` debug katmanı (`_draw_debug_overlay`: FPS, nesne sayısı, kamera, oyuncu
  bilgisi, yeşil metin), `run()` aktif sahne yoksa throw. test_game **TEST14**
  konsol komutları (12 check) → 91/91; test_browser BÖLÜM 4'e 2 boot konsol
  check'i → **33/33**; test_systems **S6** motor `_frame` testi (12 check) →
  motor **365/365**, tools 24/24. Pygbag `main.py` giriş dalı HTML'de karşılık
  olarak zaten rAF döngüsü (main.js) — ayrı dal gerekmedi, kapatıldı.
- **M5 İnce ayar (✅ 28.09):** deneyim iyileştirmeleri 5–8'in HTML portu **zaten
  birebir yapılmışmış** (5 `entities.js` after-image, 6 `bosses.js`
  `_draw_enrage_aura` + `builders.js` slow-mo 0.9/0.28 + `zoom_punch`, 7 hız
  çizgileri `fall_streak_time`, 8 `ui.js` `BiomeProgress` + `scenes.js`
  `_campaign_sector_commit` + i18n `campaign_progress`/`biome_*`) — bu görev
  **doğrulama** ile kapandı: `test_game.js` **TEST15** (25 check) eklendi: iz
  birikmesi/yaşlanması/aralık `0.03/dash_speed`/havuz ≤6 + hayalet çizimi
  (alpha 0 = çizilmez), düşüş süresi birikme-sönümleme-inişte sıfırlanma +
  yoğunluğa bağlı çizgi sayısı, enrage aurası çizim farkı + `_slow_dt` + zafer
  slow-mo değerleri, biyom kaydı/idempotency/menü rozetleri (5 yerelleştirilmiş
  ad, `_menu_ui` vs `_hud_ui`). **test_game 116/116**, diğer süitler yeşil.
- **M5 sonrası kalan backlog KAPANDI (✅ 01.10.2026, "devam et, sıradaki tüm işi
  bitir"):** HTML portu bitti; kalan iki kalem birlikte kapatıldı.
  - **Araç (Modül 6 + 7, iki araçta birebir):** Modül 6 artık kanıtlanabilir sabit
    küçük döngüleri (`range(4)`, `for (let i=0;i<4;i++)`, `for…of [1,2]`,
    `for…in (-1,1)` — dış veya iç döngüden biri `<=32`) INFO "no O(n^2) risk" olarak
    sınıflandırıyor (`perf_small_loop`), dinamik döngüde uyarı duruyor; 8 döngü yeniden
    sınıflandı. Modül 7'nin JS eşi **ifade-bilincinde import** topluyor: `from X
    import (a, b)` çok satırlı bloklar ve `import x as y` alias'ı artık yanlış
    "unused" üretmiyordu (13 yanlış pozitif silindi) → **iki araç da 14 modülde
    0 WARN/0 BUG/0 ERR**. Ayrıca `deep-tool.py find` Windows konsolunda (cp1254)
    `UnicodeEncodeError` ile çöküyordu → stdout/stderr UTF-8'e alındı; Node
    sarmalayıcılarındaki gerçekten kullanılmayan `os` import'u silindi.
  - **Oyun (Tilemap veri katmanı):** `export_scene_tilemap()` / `import_scene_tilemap()`
    (`game/scenes.py` ↔ `deep_engine_html/game/scenes.js`) `Tilemap.to_data()`'yı
    oyun katmanına bağlıyor (JSON-uyumlu veri → aynı geometri, nesne yeniden
    kullanılarak yerinde güncelleme). Konsola iki komut geldi: `tilemap_save` /
    `tilemap_load` (Python: `<user_data>/<isim>.tilemap.json`; tarayıcı: ayrı
    localStorage deposu `derinengine_tilemaps_v1`, oyuncu profilini kirletmez;
    isimler dosya-adı güvenli sanitize edilir). TEST14 9→11 komut + 8 tilemap
    check'i → **test_game 125/125**, tools **36/36**, browser 33/33, motor 365/365.
  - Kapanan bayat kayıtlar: webpanel hide/lock + sürükle-bırak zaten `48163a5`
    içinde vardı; Modül 7 oyun dosyalarında zaten temizdi; pygbag iframe adayı
    standalone HTML build'i `main.js` ile karşılandığı için **iptal**.

**[3] Sonsuz tırmanma oyunu (Icy Tower mekaniği):** kırılan platformlar, sürekli
yukarı, yükseklik skoru. Bağımsız başlayabilir (1. maddedeki BreakablePlatform +
camera-follow ile). Demo kapak: "Star Climber".
> ✅ **TAMAMLANDI (03.10.2026):** "Star Climber" oyunu yazıldı — Python
> `game/climber.py` + JS `deep_engine_html/game/climber.js` (birebir ayna), menüde
> `[C]` ile açılıyor. Kırılabilir platformlar, sonsuz yukarı tırmanma, katman skoru,
> hız kombisi, kontrol noktaları ve düşünce kurtarma **tamamı** çalışıyor.
> Headless oynanış testleri 5 gerçek hata buldu ve hepsi düzeltildi (detay:
> `03_game.md` madde 47). Motor tarafına yeni bağımlılık yok — mevcut
> `BreakablePlatform` + `BoxCollider(one_way=True)` + `ParticleEmitter` kullanıldı.

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

> **HEDEF (29.10.2026 — kullanıcı: "önerdiklerini ve yarım kalanların hepsini yap"):**
> Checkup'ta çıkan 4 iş birlikte bitecek: **(1)** 09.10 paketini (PAKET 2 + Star
> Climber kaldırma) commit'le, **(2)** `physics.js` one-way probunu `test_core.js`'e
> tünelleme kapısıyla kilitle, **(3)** ShieldBoss **A (katmanlı kalkan)** oyuna geçir +
> B/C tasarımlarını belgeye yaz (yedekte), **(4)** bayat kayıtları temizle.
> Gelir/fiyat modeline dokunulmaz (kullanıcıda). Doğrulama: 13/13 JS test + test_tools
> 36/36 + test_browser 37/37 + `deep-tool.js --lang tr all` 0/0/0.
>
> **SONUÇ — TAMAMLANDI (29.10.2026), 3 commit.**
> (1) `db9726d` — 09.10 paketi (PAKET 2 + Star Climber kaldırma, oyun 0.1.20).
> (2) Motor commit'i — `engine/physics.js` one-way yakınlık probu + `test_core.js`
> **TEST17** (tünelleme kapısı; test_core **53/53**, eski kodla 2 FAIL → kapı gerçek).
> (3) Oyun commit'i — `game/bosses.js` **ShieldBoss A** (katmanlı kalkan) +
> `test_game.js` **TEST19** (oyun testi **163 OK, 0 FAIL**); B/C tasarımları
> `03_game.md`'de **yedek** (kodlanmadı, kullanıcı kararı).
> Bayat kayıtlar temizlendi: `03_game.md` parite maddesi kapandı, `04_tools.md`
> ARAÇ KALAN sadeleşti, MASTER SIRADAKİ 1–3 ✅ işaretlendi.
> **Doğrulama (tümü yeşil):** 13/13 JS test 0 FAIL (core 53, game 163, smoke 0 HATA) +
> test_tools 36/0 + test_browser 37/0 + `deep-tool.js --lang tr all` 0 WARN/0 BUG/0 ERR.
> Yeni açık başlık: **2D v1 → 2.5D köprüsü** (MASTER 5). Gelir modeli kullanıcıda.


- **[CHECKUP — 29.10.2026, okuma + test + mutasyon probu ile] Kullanıcı: "motoru kontrol et
  neler var, neler kaldı, yarım kalan iş kalmış mı?"**
  **HEDEF:** Kod DEĞİŞTİRMEDEN motorun envanterini, test durumunu ve açık işlerini
  doğrulamak; yarım kalan iş varsa sahibi oturuma yönlendirmek. (Kod dosyasına
  dokunulmadı; yalnız okuma + test + geçici `%TEMP%` kopyasında deney.)
  **SONUÇ — hepsi yeşil:** 13/13 motor+oyun testi 0 FAIL (core 50, game **149**,
  components 27, input 72, math2d 38, procedural 34, systems 73, tilemap+levelfile 38,
  tween 33, ui 33, audio 33, visual 32; smoke 0 HATA + görsel kapılar),
  `test_tools` **36/36**, `test_browser` **37/37**, `deep-tool.js --lang tr all`
  **0 WARN / 0 BUG / 0 ERR**.
  **Envanter:** 20 motor dosyası (`engine/*.js`) + 8 oyun dosyası (`game/*.js`;
  `climber.js` yok), `index.html` 28 dosyanın **tamamını** doğru sırada yüklüyor,
  sürüm üç yerde tutarlı (motor **1.0.0**, oyun **0.1.20**). 2D v1'in 5 alanı da
  koda girmiş: fizik (eğim/çokgen/daire + coyote/jump-buffer/jump-cut/wall-slide/
  wall-jump), tilemap, sahne ağacı + SceneManager, Animator/Keyframe/Tween, UI kiti.
  **YARIM KALAN TEK GERÇEK İŞ — `engine/physics.js` one-way yakınlık probu:** çalışma
  ağacında commit edilmemiş ve **hiçbir test onu kilitlemiyor**. Kanıt (geçici kopyada
  HEAD `physics.js` ile mutasyon): tüm süitler eski kodla da yeşil; davranış probu ise
  farkı gösteriyor — `vy=1500, dt=1/30` hızlı düşüşte eski kod platformu **delip
  geçiyor** (y=602.67), yeni kod yüzeyde durduruyor (y=260.00); yüzeyin 4px üstünde
  `vy=0` iken eski kod düşmeye devam, yeni kod yüzeye oturuyor. → **02 MOTOR**
  sahiplenmeli: `test_core.js`'e "hızlı düşüşte one-way tünellemesi yok" kapısı +
  kalıcı kayıt (`_shared.md` MOTOR NOTU hâlâ açık).
  → **✅ ÇÖZÜLDÜ (29.10.2026):** TEST17 + commit ade29b5; `_shared.md` MOTOR NOTU
  kapatıldı.
  **Açık 2 — 20 dosya commit bekliyor** (09.10 PAKET 2 + Star Climber kaldırma 0.1.20
  + physics probu + belgeler); HEAD `6f44cde` (08.10) → sahibi OYUN/ARAÇ.
  → **✅ ÇÖZÜLDÜ (29.10.2026):** 4 commit (db9726d + ade29b5 + 2bc6829 + 845edfb),
  `git status` temiz.
  **Açık 3 — ShieldBoss mekaniği** (A/B/C) kullanıcı seçimi (`03_game.md`).
  → **✅ A ÇÖZÜLDÜ (29.10.2026):** A oyuna geçti (2bc6829, TEST19 → 163 OK);
  B/C yedek (kullanıcı kararı).
  **Açık 4 — ACİL GELİR fiyat modeli** (aşağıdaki 23.09 notu, karar yok).
  → **KULLANICIDA (29.10.2026):** kullanıcı bu konuya kendi bakacağını söyledi;
  oturum karışmıyor.
  **Bayat kayıtlar — ✅ TEMİZLENDİ (29.10.2026):** `03_game.md` OYUN KALAN'daki "motor
  modül modül parite denetimi" maddesi kapandı (Python silindi), `04_tools.md` ARAÇ
  KALAN bölümü sadeleşti (parite aracı/pygbag/Star Climber/webpanel.py "KAPANAN"
  altına), bu dosyadaki eski MASTER kuyruğu arşiv notuyla işaretlendi.

- **[CHECKUP — 10.10.2026, okuma + test ile]** Kullanıcı: "köklü değişiklikler yaptık,
  checkup yap, neler değişti neler kaldı." **Sonuç:** (1) 15 test dosyası koşuldu —
  hepsi yeşil (13 motor/oyun + test_tools 36/36 + test_browser 37/37; smoke 33 tur +
  50/50 görsel kapı). (2) **Commit edilmemiş 19 dosya duruyor** (09.10.2026 paketi:
  PAKET 2 = i18n ölü anahtar temizliği + parallax flicker fix + `forced_boss_type`/
  benzersiz boss sırası; STAR CLIMBER kaldırma = 0.1.20, `climber.js` silindi,
  test_game −596 satır; `engine/physics.js` one-way proximity probu) — son commit
  `6f44cde` (08.10). **Karar/onay bekliyor: bu paketi kim commit'liyor (OYUN/ARAC).**
  (3) Açık kararlar: ShieldBoss mekaniği (A/B/C seçeneği kullanıcıda, `03_game.md`),
  fizik probunu motor oturumunun sahiplenmesi (`_shared` MOTOR NOTU), ACİL GELİR
  fiyat modeli. Doğrulama: alttaki test komutları. (Kod değişmedi — varsayılan sürüm:
  motor 1.0.0 / oyun 0.1.20.)

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