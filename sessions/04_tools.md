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

- **Modül 7 kullanılmayan import WARN temizliği** (`game/*.py`) — manuel, kullanıcı.
- **tarayıcı interaktif playtest** (kullanıcıya bırakıldı).
- **web paneli: katıştırılmış oyun sekmesi** (pygbag iframe) — aday.
- **editör: Z geri al (undo)** — aday.
- **`webpanel.py` git'e eklensin mi?** kullanıcı kararı (henüz commit yok).

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