# ARAÇ OTURUMU — deep-tool, paketleme, web (tools/)

> Bu oturumun görevi: **yardımcı geliştirici araçları**. deep-tool CLI, paketleme
> (PyInstaller), tarayıcı (pygbag) build ve yayın işleri. Kural: araç TARAR/BULUR,
> KOD YAZMAZ/DÜZELTMEZ (düzeltmeler manuel, ilgili oturumda).

---

## TAMAMLANAN ARAÇ ÇALIŞMALARI (madde N referanslı)

1. **Motor Konsol / Bug Detector** (madde 36): kök `motorconsole.py` — syntax/import/
   desen (sessiz except [WARN], TODO, yazım)/medya varlık/headless smoke; kısa ömürlü
   oldu, sonraki deep-tool'un **iç organı** oldu (dosya silindi).
2. **deep-tool.py** (madde 37): profesyonel tarama CLI, TR/EN.
   - 6 modül: (1) Motor Konsolu, (2) Import Grafi, (3) Builder/Extractor tutarlılığı,
     (4) i18n tr/en parity, (5) Asset varlık, (6) Performans uyarıları.
   - `deep-tool.bat` (cift tik, chcp 65001 + root'a iner).
   - Bulduğu bug'lar: fatih yanlış pozitif (döngü), Modül 3 gürültü (title-case vs
     lowercase), Modül 6 catastrophic backtracking → satır-tabanlı analiz, CLI anında
     kapanma → interactive bekleme.
3. **Proje Organizasyonu** (madde 39): main.py (3584 satır) → `game/` paketi; deep-tool
   `tools/`'a taşındı; `StarCollectorHero.spec` collect_submodules('game'); Modül 7/8/9
   gerçekleştirildi (yukarıdaki kuyruk):
   - Modül 7 (AST): erişilemeyen kod, tanımsız isim (scope-aware), kullanılmayan
     import, boş except; Python 3.14 ExceptHandler.name str fix.
   - Modül 8 (Motor saflığı): deep_engine → game/main sızıntısı [BUG], döngü tespiti.
   - Modül 9 (Regression): seed determinizm, savegame bütünlüğü, WARN trendi.
4. **Windows paketleme** (PyInstaller): `--onedir --windowed` (SmartScreen false
   positive'ten kaçınma; onedir anında açılır), `user_data_dir()` frozen-safe
   (savegame/editör/özel seviye exe yanına yazılır), `custom_level.json` pakete gömülür
   (`_ensure_custom_level` ilk çalıştırmada kopyalar). Ürün `dist\StarCollectorHero\`
   + `StarCollectorHero-win64.zip` (~15-16 MB). itch.io: `https://derindev.itch.io/star-collector-py`.
5. **pygbag tarayıcı build** (madde 34 C1): `PYTHONUTF8=1; python -m pygbag --build
   --app_name StarCollectorHero .` → `build/web/` (index.html + derinengine.apk).
   Bundle içeriği: assets/main.py + deep_engine/* + custom_level.json + savegame.json.
   **BOM bug** yakalandı (savegame.json BOM'luysa JSONDecodeError) → SaveGame
   `utf-8-sig`; dosya BOM'suz `{` ile.
6. **Kalıcılık (tarayıcı)**: pygbag localStorage kalıcılığı (IDBFS değil,
   `window.localStorage`, anahtar `derinengine_save_v1`); masaüstü etkilenmez.
7. **"pygame_static whl 404" tanısı**: yerel `localhost:8000` = pygbag dev mode
   (wheel'i localhost'tan arar → 404). Çözüm: `http://192.168.1.5:8000/` (yerel IP)
   kullan → CDN'den iner, oyun başlar. Prod (itch.io) etkilenmez.
8. **HTML5 yeniden-paketleme kararı**: lokal `build/web/` + `web-cache/` temizlendi;
   canlı itch.io HTML5 etkilenmedi. Tekrar üretilirse pygbag komutu üstte.
9. **deep-tool kural taraması gerçeğe oturtuldu (93→0 WARN)** (26.09.2026):
   (a) `_SILENT_EXCEPT` (regex) kaldırıldı — AST "empty except" ile aynı yeri ÇİFTE
   sayıyordu (93'ün ~71'i bu çifte/bilinçli şişkinlikti); (b) "empty except" +
   "file open inside loop" kuralları `# noqa` işaretini tanır (bilinçli fallback →
   INFO); (c) nested-loop tespiti INFO'ya indi (spatial grid/vinyet/raycast yapısal,
   WARN değil); (d) `_BUILTINS`'e istisna hiyerarşisi eklendi (KeyboardInterrupt
   "tanımsız isim" sanılıyordu); (e) builder/extractor: Coin/Player/Spikes bilinçli
   eksik → INFO (web panelinde tasarlanmıyorlar). Kullanım: kod tarafı değişmedi,
   `/api/scan` ve CLI aynı kaldı. Sonuç: **0 WARN, 0 BUG, 0 ERR**.
   Bilinçli-eksik eklemek için: `_EXTRACTORLESS_OK` seti (İngilizce içinde) + AST
   empty-except'e `# noqa` etiketi.
10. **deep-tool +4 tarama modülü (10-13) + ölü kod silindi** (26.09.2026, kullanıcı
   isteği): (a) **[10] Gizli bilgi** — anahtar/token/şifre literal'leri + gerçek
   token formatları (GitHub/Stripe/AWS/Google/PRIVATE KEY/JWT) + diskte `.env`
   varlığı; (b) **[11] Ölü kod** — üst-seviye def/class isimlerinin proje çapında
   referans sayımı (ilk sürüm "1 ref = aday, 2 ref = kontrol"du → ikinci sürüm
   **sadece 1 ref = kesin aday**; 2+ ref = kayıt/çağrı ile kullanılıyor, ör.
   `ease_*` → `_EASING`, `cmd_*` → `_reg`); (c) **[12] Karmaşıklık**
   — en büyük dosyalar + en uzun yapılar (temizlik pusulası); (d) **[13] Çökme
   trendi** — motor.log traceback fonksiyon sayıları. Menü **20 = TÜMÜNÜ TARA** oldu
   (eski "10") ve ölü `menu_7: "[7] Scan ALL"` / `"[7] HEPSINI TARA"` kopya satırları
   temizlendi. İlk gerçek bulgu: `levelfile.save_scene_to_path` hiç çağrılmıyordu
   (`save_level`'in geri-uyumluluk takma adı) — kullanıcı onayıyla **silindi**.
   Doğrulama: `deep-tool --lang en all` → 13/13 modül **0 WARN, 0 BUG, 0 ERR**.
11. **deep-tool alt-araçları gerçekleştirildi: `find` / `new` / `run`** (26.09.2026):
    artık "[yakında]" değil. (a) **`find`** — anahtar kelime dosya/satır arar
    (salt okunur; .py/.md/.json/.txt/.html/.js; build/dist/.git hariç; tepe giriş
    + isteğe bağlı klasör filtresi; CLI: `deep-tool find KW [klasor]`); (b) **`new`** —
    `script` (standart docstring + main girişli şablon) veya `dir` üretir; var olan
    yola DOKUNMAZ; CLI: `deep-tool new script tools/x.py`; (c) **`run`** — bilinen
    script'leri başlatır (`game`=main.py, `webpanel`=127.0.0.1:8765, `tool`=deep-tool)
    veya keyfi `.py` yolu; CLI: `deep-tool run game`. TR/EN çevirileri eklendi,
    ölü `main_soon` çeviri anahtarları silindi. Doğrulama: find 25 eşleşme, new
    şablon+koruma, run subprocess — hepsi OK; `--lang en all` 13/13 modül
    **0 WARN, 0 BUG, 0 ERR**. Web paneli için SIRADA (kullanıcı söyleyince).
12. **deep-tool tek programa bağlandı + tam arayüz web paneline taşındı** (26.09.2026):
    (a) **`--api` JSON modu** — `scan` / `find` / `new` için yapılandırılmış çıktı
    (`_api_dispatch` + `_api_scan`; `_do_find`/`_do_new` "hesapla/yazdır" diye
    ayrıştırıldı: `_collect_find` + `_perform_new`); CLI davranışı değişmedi.
    pygame sürüm satırı hem CLI hem JSON'u kirletiyordu → süreç başında
    `PYGAME_HIDE_SUPPORT_PROMPT=1` (temiz çıktı). (b) **webpanel deep-tool sekmesi**
    yenilendi: (1) Tarama — dil seçici + 13 modül çipi (tıkla=çalıştır) + "Tümünü
    tara", yapılandırılmış bulgu raporu + TOPLAM özeti; (2) Bul — kelime+klasör →
    dosya:satır; (3) Üret — script/dir seçici + koruma mesajı (var olan silinmez);
    (4) Başlat — `main.py` veya keyfi `.py`. Yeni route'lar: `/api/scan`
    (--api scan, JSON parse), `/api/find`, `/api/new`, `/api/run` (.py kısıtı).
    Doğrulama (python urllib): scan11 0/0/0, scan-all 13 modül 0/0/0, find 16
    eşleşme, new üret+exists koruması (içerik değişmiyor), run stdout OK,
    `.pyx` reddi 400, sayfa yeni kimlikler içeriyor. Eski 8765 sürecinin eski kodla
    ayakta olduğu fark edildi → kapatıldı, test güncel süreçle tekrarlandı.
    `--lang en all` regresyonu: 0/0/0.
13. **webpanel UX paketi (26.09.2026, kullanıcı çaydayken bağımsız yapıldı):**
    (a) **`--api modules`** (deep-tool): gerçek TR/EN modül adlarını döndürür
    (`t("menu_%d")` üzerinden, `[N]` ön eki atılır) → webpanel çipleri artık sabit
    kaba listeden değil, deep-tool'dan canlı çekiliyor (`/api/modules?lang=` GET +
    `loadMods()`; dil değişince onchange yeniler; `buildScanMods` artık num+gerçek
    ad basar). (b) **Tarama çıktısı renklendi** (`runScan` → innerHTML + `esc()`;
    W/B/E/i satır renkleri, modül başlığı, "(temiz)" yeşili; mesajlar escape = XSS
    koruması). (c) **Tarayıcı otomatik açılıyor** (`webbrowser` + `threading.Timer
    (0.4)`; `--no-open` bayrağı testler için); 8765 doluysa ikinci açış hata yerine
    "zaten çalışıyor + tarayıcıyı açar" deyip kapanır (bunu test sırasında
    gerçekten yaşamıştık). (d) **Log sekmesine "canlı izle" kutusu** (2 sn
    `setInterval` → `loadLog`, toggle iptal ediyor). (e) `webpanel.bat` köke
    eklendi (deep-tool.bat kalıbı: chcp 65001 + köke in + çalıştır) — çifte tık
    = panel + otomatik tarayıcı. Doğrulama: py_compile + 17 uçtan uca test PASS
    (modules tr/en 13, scan11/all 0/0/0, find 16, run probe, log, `.pyx` 400,
new üret+koruma), `--lang en all` 0/0/0. Eski 8765 süreçleri kapatılıp sunucu
     yeni kodla yeniden başlatıldı. ✅ Commit+Pus: `5fb747f` (26.09.2026).
14. **Editör → gerçek oyun motoru UI (Godot/Unity hissi)** (26.09.2026, kullanıcı
    isteği "level editörünü hâlâ beğenmedim; düz liste istemiyorum"):
    (a) **Sahne hiyerarşisi** — sol panel ağaç görünümü: tip rengi nokta + ad + @x,y
    + seçim vurgusu + ↑/↓ çizim sırası butonları (`updateTree` → `#hier`; eski
    `objlist` paneli kaldırıldı). (b) **Toolbar** — Seviye seçici, Kaydet (Ctrl+S,
    açık dosyaya yazar; default.json seçiliyse "Farklı Kaydet"e yönlendirir),
    Farklı Kaydet…, Yeniden Yükle | Geri al, Yinele, Çoğalt, Sil | Sıfırla, Sil +
    durum mesajı. (c) **Inspector** — özellikler + hızlı butonlar (Çoğalt/↑/↓/Sil);
    "Seviye Ayarları" (ad, arka plan, tema) Sağ panelde ayrı kart. (d) **Görünüm
    çubuğu** — ‒/+/Sığdır + ızgara seçici (`sceneGrid`, eski metaGrid taşındı) +
    zoom % etiketi. (e) **Undo/redo** — JSON snapshot yığını (60 adım; taşma
    shift); her mutasyon öncesi `record()` (yerleştir/taşı/boyutlandır/sil/çoğalt/
    özellik/meta/sırala); Ctrl+Z geri al, Ctrl+Shift+Z / Ctrl+Y yinele, Ctrl+D
    çoğalt, Delete sil, Escape seçimi bırak; açılış/seviye değişimi yığını temizler.
    (f) **Durum çubuğu** — imleç dünya koordinatları + seçili nesne adı ve boyutu
    (canlı). Doğrulama: py_compile + 8765 (node v24 ile) sayfadan JS ayıklanıp
    `node --check` **JS_SYNTAX_OK** + 10 yeni UI kimliği sayfada + `/api/level` 200.
    Sunucu yeni kodla yeniden başlatıldı (tarayıcı açıldı). ✅ **Gizle/kilit +
    sürükle-bırak sıralama TAMAMLANDI (27.09.2026, madde 15)** — aşağıya bak.
    ⏳ **COMMIT BEKLİYOR** (kullanıcı onayı).

- **Madde 15 — Webpanel gizle/kilit + sürükle-bırak sıralama (27.09.2026, OZ).**
  (a) **Gizle**: ağaç/kanvastaki göz butonu → nesne `hidden` (çizimde %22 soluk +
  "gizli" etiketi, tıklama/taşıma atlanır, düzenlemeler korunur). (b) **Kilit**:
  kilit butonu → `locked` (seçiliyken 🔒 gösterilir; taşıma/resize/düzenleme/silme
  engellenir; props panelinde uyarı satırı). (c) **Sürükle-bırak**: ağaç satırları
  `ondragstart/ondragover/ondrop` ile yeniden sıralanır (çizim sırası değişir).
  Görsel: `.locked`/`.dragging` CSS sınıfları. Doğrulama: JS dokuz placeholder
  (`%GRID%` vb.) temizlenince `node --check` **JS_SYNTAX_OK**; `wp_logic_test.js`
  node testi — hidden tıklanamaz, locked algılanır, drag sıralaması çalışır.
  **Etkilenen:** araç dışı kod yok. ⏳ **COMMIT BEKLİYOR.**

---

## GÖREV HEDEFLERİ (açık görevler)

- **HEDEF — Tarayıcı web paneli (25.09.2026):** ✅ **Tamamlandı (2 aşama).**
  `tools/webpanel.py` — stdlib `http.server` + gömülü HTML/JS, **0 yeni bağımlılık**.
  1. **Panel (v1):** sekmeler — deep-tool (TR/EN + modül), motor.log (son 200 satır),
     Script (`python -c`), Oyun (`main.py` baslat).
  2. **Mini editör (v2):** Godot/Unity kıvamında ama basit seviye editörü —
     palet (14 nesne şablonu, builders.py builder/extractor alanlarından),
     canvas üzerinde sürükle-taşı/yeniden boyutlandır (köşeler), ızgara (4/8/16/32),
     teker ile zoom, ok tuşları pan, özellik paneli (x/y/w/h + tipe özel alanlar,
     renk seçici, select/num/bool), meta paneli (ad, arka plan rengi, parallax teması),
     nesne listesi, kaydet/yükle (JSON round-trip doğrulandı).
  Testler: GET / + /api/level OK, POST /api/level/save OK (veri yapısı bozulmadı,
  arka plan testi geri alındı), py_compile OK. Palet/şema bilgisi:
  TEMPLATES (14 nesne), FIELD_SCHEMAS (12 tip), THEMES (7 tema).
  Doğrulama: `python tools\webpanel.py` → `http://127.0.0.1:8765` (Ctrl+C kapatır).
  KALAN: (1) Oyun sekmesini canlı iframe (pygbag web build'i gömmek) — Seçenek 2;
  (2) editör kısayol tuşları (Z geri al); (3) webpanel.py git'e eklenmedi.
- **HEDEF — Yerel git deposu (23.09.2026):** ✅ **Tamamlandı.** Git kurulumu
  (winget, v2.55.0) + kimlik (`tcknmx` / noreply) + `.gitignore` + `git init` +
  ilk commit. **GitHub'a push istemedi** (sadece yerel).
- **HEDEF — Public repo temizliği (23.09.2026):** ✅ **Tamamlandı.**
  - **AI notları hariç:** `AGENTS.md`, `opencode.json`, `sessions/` git kaydından
    çıkarıldı (yerelde durur); `savegame.json`, `motor.log`, `dist/`, `build/`,
    `__pycache__/`, `_e.txt` `.gitignore`'da. `.py` yorumları AI izi taşımıyor —
    silinmedi (kullanıcı onayıyla korundu).
  - **Marka:** pencere başlığı + i18n `game_title` + TR/EN `menu_title` →
    "Star Collector Hero"; eski "Lav Devi/Magma Golem/Yıldız Toplayıcı" i18n
    kalıntıları tarandı, aktif olanlar (`victory_title`, `boss_cave_fallback`,
    `boss_name/objective/defeated`, `l2_info`) güncellendi.
  - **README:** güncel itch.io açıklamasıyla yeniden yazıldı (features, kontroller,
    editor, v0.1.19 günlüğü, çalıştırma/paketleme).
  - Doğrulama: `py_compile` OK, i18n değerleri selam, AI taraması temiz
    (sadece `.gitignore` constants). Commit: `git log`.
- **HEDEF — Yorum/docstring çevirisi (23.09.2026):** ✅ **Tamamlandı.**
  İzlenen (GitHub'a gidecek) tüm `.py` dosyalarındaki `#` yorumlar, docstring'ler,
  `version.txt` ve `.gitignore` yorumları akıcı İngilizce'ye çevrildi (9 dosya hariç
  hepsi; 29 dosya, ~1590 satır). **i18n.py TRANSLATIONS ve deep-tool.py TR/EN menü
  sözlük değerleri AYNEN kaldı** (yalnızca yorumları değişti) — kullanıcı kuralı.
  5 paralel subagent ile yapıldı; 2 kalıntı Türkçe yorum (`entities.py` "takip
  edilen", `scenes.py` "her zaman astro") elle düzeltildi. Doğrulama: tüm dosyalarda
  `py_compile` OK + tokenize-bazlı Türkçe karakter/kelime taraması temiz
  (ASCII Türkçe kelimeler de yakalandı). Commit: `dfdc9e5`.
- **HEDEF — GitHub'a gönderim (23.09.2026):** ✅ **Tamamlandı.** `git remote add
  origin https://github.com/tcknmx/DerinEngine.git` + `git branch -M main` +
  `git push -u origin main` → https://github.com/tcknmx/DerinEngine (Public, 7 commit,
  33 dosya). AI notları (`sessions/`, `AGENTS.md`, `opencode.json`) depoda yok.
- **HEDEF — AI izi temizliği (23.09.2026):** ✅ **Tamamlandı.** Bağımsız denetim
  (Google/LLM incelemesi) sonrası: `version.txt` ajan görev kodları (A1/B3/C5/D1) +
  "Bug Checkup" raporu + sürüm karmaşası temizlenip doğal değişiklik günlüğüne
  çevrildi; README'den emoji + "game juice"/"Mini-Godot"/"premium platformer feel"
  gibi AI üslubu kaldırıldı; `.py` yorum/docstring'lerinden emojiler ve görev
  kodları temizlendi (canlı i18n/UI ve müzik notaları korundu). 3. tarama turu:
  0 kalıntı. Commit `a4fe0a6` (tek kök commit) + `8f6c213` (iz temizliği).

- **HEDEF — tarayıcı panel + mini seviye editörü (25.09.2026):** ✅ **Tamamlandı.**
  `tools/webpanel.py` — Python sadece stdlib, 0 yeni paket, `http://127.0.0.1:8765`.
  Sekmeler: **Editör** (14 nesnelik palet, sürükle/taşı/köşeden boyutlandır, ızgara
  4/8/16/32 + tekerlek zoom, ok tuşları pan, özellik paneli, meta paneli, nesne
  listesi, kaydet → `custom_level.json` round-trip — test geri alındı, veri bozulmadı),
  **deep-tool** tarama (`/api/scan`), **motor.log** (son 200 satır), **Kod**
  (kısa Python çalıştır, cwd=ROOT), **Oyun** (main.py alt süreç). Doğrulama:
  `py_compile` OK, endpoint'ler GET/POST gerçek HTTP testli (script çıktısı "merhaba
  0.1.19", scan EN all kod 0), `node --check` + runtime mock (tırnak kaçışı:
  `setNum(0,'x',this.value)` DOĞRU üretiliyor), servis edilen sayfa bayt düzeyinde
  UTF-8 Türkçe içeriyor (`Content-Type: text/html; charset=utf-8` + `<meta charset>`,
  WebClient ile doğrulandı). **Bilinen dersler:** (1) PowerShell `Get-Content -Raw`/
  `Set-Content` döngüsü UTF-8 dosyayı ANSI okuyup bozar (başlıkta `â€”` görünür) —
  çözüm: dosyayı **gerçek UTF-8** tut (Write/edit aracı) ve `PAGE = r"""..."""`
  raw string kullan (JS imleçlerine `\'` aynen geçer); sayfa **gerçek Türkçe**
  karakterlerle (ü/ş/İ/ç) — ASCII kırpmak kullanıcı deneyimini bozuyordu, geri alındı.
  (2) `deep_engine/` cwd'den `import deep_engine` ÇALIŞMAZ (paket üst klasörde) →
  `/api/script` cwd=ROOT. Başlatma: `python tools\webpanel.py` → tarayıcı.
  Otomatik değil, isteyince açılır; git'e eklenme kararı kullanıcıda.
- **HEDEF — web editörü kendi dosyasında, şablon korunur + oyun içi konsol (25.09.2026):** ✅ **Tamamlandı.**
  **(a)** `custom_level.json` artık **sabit şablon**, web editörü `web_level.json`'da
  çalışır. Butonlar: "Şablona Sıfırla" (`POST /api/level/reset`: template→web kopyala,
  `{"ok","level"}`), "Oyuna Aktar" (`POST /api/level/publish`: web→custom kopyala).
  `web_level.json` `.gitignore`'da. Oyun içi editör (E) hâlâ `custom_level.json`'u
  açar — web'de düzenlenen dosyayı GÖRMEZ (istek). HTTP round-trip doğrulandı:
  ilk GET /api/level'de web_level.json template'ten türedi, save/reset/publish ok,
  custom_level.json şablon olarak AYNI kaldı.
  **(b)** " (BACKQUOTE) tuşu oyun içi komut satırı: `deep_engine/console.py` →
  `DevConsole` (metin girişi, geçmiş, komut kayıt sistemi `register_command`),
  console.py:56 font init guard, `input.py` karakter toplama (`get_typed_text`) +
  BACKQUOTE/BACKSPACE/KPENTER tuşları, `core.py` toggle+scene pause+console draw
  (aktifken T/E/F3/ESC devre dışı) , `game/commands.py` 12 komut: `help, clear,
  version, hp, heal, god, coins, speed, jump, tp, respawn, list`. Motor saflığı
korundu (komutlar game katmanında kayıtlı). Doğrulama: py_compile OK, `import game`
   altında 12 komut kaydı listelendi. KALAN: `webpanel.py` git kararı hâlâ bekliyor.
- **HEDEF — oyun içi editör kaldırıldı, web editörü custom_levels klasörüne geçti (25.09.2026):**
   ✅ **Tamamlandı.** Kullanıcı: "oyun içi editörü tamamen çıkar, kostüm seviyeler
   isimlendirme ve klasör". `deep_engine/editor.py` silindi; web paneli artık
   **`custom_levels/` klasöründe** çalışıyor (publish/web_level modeli tamamen kalktı,
   `web_level.json` silindi, `.gitignore` → `custom_levels/`):
   - Seviye açma listesi (`GET /api/level?name=<x>.json`, `GET /api/levels`).
   - **"Farklı Kaydet…"** modalı: kullanıcı ismi yazar, `custom_levels/<isim>.json`'a
     kaydeder; `default.json` adı **korunur** (engelli).
   - "Seviyeyi Sil" (`POST /api/level/delete`, default.json silinemez).
   - `_safe_name` yol gezinme engeli (`/` `\` `.` `..` reddedilir).
   - `LEVELS_DIR` = `user_data_dir()/custom_levels` (deep_engine import'u; oyunla
     aynı klasör). Doğrulama: modül düzeyi save/load/delete + gerçek HTTP round-trip
     (8799 numaralı test portu; 8765'te eski sunucu PID 23544 duruyor) — kaydet,
     listele, adlı aç, sil OK; sayfada `publishLevel` yok, `Farklı Kaydet` var.
   KALAN: oyun tarafında `levels`+`load` komutları ve konsol akışı `03_game.md` 42'de.

- **HEDEF — oyun içi custom akışı kalktı, web editörü bağımsız kaldı (25.09.2026):**
   ✅ **Kısmen.** Kullanıcı oyun içi C/custom modu istemedi (bkz. `03_game.md` 43).
   `tools/webpanel.py` **işlevi değişmedi** (custom_levels/ klasöründe çalışır;
   `_ensure_levels_dir`, `_save_level`/`_safe_name` default.json koruması, delete).
   Değişenler: docstring/hint/status metinlerindeki "oyunda konsol: load X" ipuçları
   çıkarıldı (oyun artık custom yüklemiyor). Sayfada `publishLevel`/`load` komut
   referansı yok. Doğrulama: `_load_level`/`_save_level`/`_list_levels`/`_safe_name`
   (+ default koruması) OK, `node --check` (placeholder dolgusu `%GRID%` vs. `8`) OK.
   KALAN: webpanel üretimi oyuna nasıl bağlanacak — karar kullanıcıda (şimdilik
   bağımsız tasarım alanı).

---

## ARAÇ KALAN (bekleyen araç işleri)

- **HTML MOTOR SIRADAKİ (DerinEngine HTML) — bakınız `01_strategy.md` MASTER SIRADAKİ
  (28.09.2026).** Yeni ana hat: saf tarayıcı JS. A1–A4 bitti (çekirdek + render + fizik +
  input + kutu demosu; commit `7606579`). **SIRADA G2–G9 motor eşitliği:** çarpışma hat
  etleri + math2d (SAT), oynanış bileşenleri (Animator/KeyframeAnimator/BouncePad/Health/
  Projectile/PowerUp/BreakablePlatform/SpawnIn), Tween, partikül+parallax+lighting,
  tilemap+levelfile, UI kit, SceneManager+console+log+i18n+audio+savegame+procedural.
  Sonra: SCH tam portu + tırmanma oyunu (Icy Tower mekaniği).
  Doğrulama komutu: `node deep_engine_html\test_core.js` → `ALL OK`.
- **Modül 7 kullanılmayan import WARN temizliği** (`game/*.py`) — manuel, kullanıcı.
- **tarayıcı interaktif playtest** (kullanıcıya bırakıldı).
- **web paneli: katıştırılmış oyun sekmesi** (pygbag iframe) — aday, ertelendi.
- **editör: gizle/kilit + sürükle-bırak sıralama** — madde 14 sonrası KALAN.
- **Modül 6 (Performans) yanlış-pozitif yumuşatması** (27.09, MOTOR devri — `02_engine.md`):
  O(n²) satırlarının tamamı incelendi; hepsi ya sabit-küçük liste ya cull'lanmış çizim
  ya da zaten uzaysal grid. Tarayıcı, küçük-sabit iç döngüleri (ör. `< 32` eleman/tampon)
  yanlış-pozitif olarak işaretlemeyebilir → temiz tarama.

## GÖREV HEDEFİ — editörü gerçek motor UI'ye çevir (26.09.2026)

Kullanıcı: "level editörü Godot/Unity editörleri gibi modern oyun motoru UI olsun;
düz JSON listesi isteğini beğenmiyorum". Dönüşüm:
hierarchy (Sahne ağacı) + toolbar (Kaydet/Farklı/geri al/yinele/çoğalt/sil/zoom) +
Inspector (hızlı butonlar) + durum çubuğu + klavye kısayolları (Ctrl+Z/Y/D/S,
Delete, Esc) + **undo/redo (60 snapshot)** + kaydet (açık dosyaya, default korunur) +
çoğalt/↑↓ çizim sırası. ✔ **KOD YAZILDI + DOĞRULANDI** (madde 14; sig-HEDEF-14;
sunucu canlı, sayfa F5 ile görülür). ⏳ commit için kullanıcı onayı bekleniyor.
KALAN: gizle/kilit, sürükle-bırak sıralama.

---

## ARAÇ — SIK KULLANILAN KOMUTLAR

```powershell
# tarama (etkileşimli menü / doğrudan modül)
python tools\deep-tool.py
python tools\deep-tool.py --lang tr 3
python tools\deep-tool.py --lang en all

# oyun
python C:\Users\token\Desktop\DerinEngine\main.py

# Windows paketleme
python -m PyInstaller --noconfirm --clean --onedir --windowed --name "StarCollectorHero" --add-data "custom_level.json;." --collect-submodules deep_engine main.py

# tarayıcı build (ilk defa template CDN'den iner; sonra cached)
$env:PYTHONUTF8=1; python -m pygbag --build --app_name StarCollectorHero .
```

Uyarı: `build/` klasörü PyInstaller (`build/StarCollectorHero/`) ile pygbag
(`build/web/`) tarafından paylaşılır; web çıktısını korumak istiyorsan temizlikte
`build/web*` dışında tut ya da `dist/web/`'e kopyala.